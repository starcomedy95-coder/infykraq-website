"""Razorpay payments layer tests — keys are empty, must degrade gracefully to COD.
Also verifies awaiting_payment orders are excluded from customer/admin aggregates."""
import os
import uuid
import subprocess
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-ecommerce-126.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Test-account credentials come from the environment; the defaults match the seeded demo accounts
# documented in /app/memory/test_credentials.md (no production secrets live here).
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@infykraq.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")
CUSTOMER_EMAIL = os.environ.get("TEST_CUSTOMER_EMAIL", "customer@infykraq.com")
CUSTOMER_PASSWORD = os.environ.get("TEST_CUSTOMER_PASSWORD", "Test@123")


@pytest.fixture(scope="module")
def customer_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module")
def product_id():
    return requests.get(f"{API}/products").json()[0]["id"]


@pytest.fixture(scope="module")
def sample_order_body(product_id):
    return {
        "items": [{"product_id": product_id, "qty": 1, "variant": {}}],
        "address": {
            "full_name": "Pay Test", "phone": "9876543210",
            "email": "paytest@x.com", "line1": "1 Test St", "city": "Delhi",
            "state": "DL", "pincode": "110001"
        },
        "payment_method": "online",
    }


# ---------- payment config ----------
class TestPaymentConfig:
    def test_config_when_keys_empty(self):
        r = requests.get(f"{API}/payments/config")
        assert r.status_code == 200
        d = r.json()
        assert d["configured"] is False
        assert d["key_id"] == ""


# ---------- razorpay endpoints refuse when unconfigured ----------
class TestRazorpayDisabled:
    def test_create_order_returns_503(self, customer_session, sample_order_body):
        r = customer_session.post(f"{API}/payments/razorpay/order", json=sample_order_body)
        assert r.status_code == 503
        assert "not configured" in r.text.lower() or "cod" in r.text.lower()

    def test_verify_requires_auth(self):
        r = requests.post(f"{API}/payments/razorpay/verify", json={
            "order_id": "x", "razorpay_order_id": "x",
            "razorpay_payment_id": "x", "razorpay_signature": "x"
        })
        assert r.status_code == 401

    def test_verify_authed_returns_503(self, customer_session):
        r = customer_session.post(f"{API}/payments/razorpay/verify", json={
            "order_id": "x", "razorpay_order_id": "x",
            "razorpay_payment_id": "x", "razorpay_signature": "x"
        })
        assert r.status_code == 503

    def test_webhook_returns_503(self):
        r = requests.post(f"{API}/payments/razorpay/webhook",
                          headers={"X-Razorpay-Signature": "fake"},
                          data=b"{}")
        assert r.status_code == 503


# ---------- POST /api/orders is COD-only ----------
class TestOrdersCodOnly:
    def test_orders_online_rejected(self, customer_session, sample_order_body):
        body = dict(sample_order_body)
        body["payment_method"] = "online"
        r = customer_session.post(f"{API}/orders", json=body)
        assert r.status_code == 400
        assert "razorpay" in r.text.lower() or "online" in r.text.lower()

    def test_orders_cod_still_works(self, customer_session, sample_order_body):
        body = dict(sample_order_body)
        body["payment_method"] = "cod"
        r = customer_session.post(f"{API}/orders", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["payment_method"] == "cod"
        assert d["payment_status"] == "pending"
        assert d["cod_fee"] == 49
        assert d["status"] == "confirmed"
        # GST is inclusive
        assert d["gst"] > 0
        assert d["total"] > 0


# ---------- awaiting_payment orders hidden from aggregates ----------
class TestAwaitingPaymentHidden:
    """Seed a fake awaiting_payment order in Mongo, verify it is invisible in customer /orders
    and does not affect admin stats revenue and gst report. Then delete it."""

    @pytest.fixture(scope="class")
    def seed_awaiting_order(self):
        order_id = str(uuid.uuid4())
        order_no = f"IFQAWAIT{uuid.uuid4().hex[:6].upper()}"
        js = f"""
        var u = db.users.findOne({{email:'{CUSTOMER_EMAIL}'}});
        db.orders.insertOne({{
            id:'{order_id}', order_no:'{order_no}', user_id: u._id.toString(),
            email:'{CUSTOMER_EMAIL}', payment_method:'online', payment_status:'pending',
            status:'awaiting_payment', created_at: new Date().toISOString(),
            items:[{{product_id:'x', qty:1, price:9999, title:'x', image:'', variant:{{}}, line_total:9999}}],
            subtotal:9999, discount:0, coupon:null, shipping:0, cod_fee:0, gst:1525, total:9999,
            address:{{full_name:'x', phone:'1', email:'{CUSTOMER_EMAIL}', line1:'x', city:'x', state:'x', pincode:'111111'}},
            timeline:[{{status:'awaiting_payment', at:new Date().toISOString()}}]
        }});
        """
        subprocess.run(["mongosh", "test_database", "--quiet", "--eval", js],
                       check=True, capture_output=True)
        yield order_id, order_no
        subprocess.run(["mongosh", "test_database", "--quiet", "--eval",
                        f"db.orders.deleteOne({{id:'{order_id}'}});"],
                       check=True, capture_output=True)

    def test_hidden_from_customer_orders(self, customer_session, seed_awaiting_order):
        order_id, order_no = seed_awaiting_order
        orders = customer_session.get(f"{API}/orders").json()
        assert not any(o["id"] == order_id for o in orders), "awaiting_payment order should be hidden"
        assert not any(o["order_no"] == order_no for o in orders)

    def test_hidden_from_admin_stats_revenue(self, admin_session, seed_awaiting_order):
        """Revenue/GST must equal the sum of non-awaiting_payment orders only.

        Computed from Mongo in the same request window instead of a before/after diff,
        so concurrent order creation cannot make this flaky.
        """
        order_id, _ = seed_awaiting_order
        stats = admin_session.get(f"{API}/admin/stats").json()
        js = ("var a=db.orders.aggregate([{$match:{status:{$ne:'awaiting_payment'}}},"
              "{$group:{_id:null,rev:{$sum:'$total'},gst:{$sum:'$gst'}}}]).toArray()[0];"
              "print(a.rev + '|' + a.gst);")
        out = subprocess.run(["mongosh", "test_database", "--quiet", "--eval", js],
                             check=True, capture_output=True, text=True).stdout.strip()
        rev, gst = (round(float(x), 2) for x in out.split("|"))
        # tolerance absorbs orders created concurrently by other tests, but is far smaller
        # than the 9999 sentinel total / 1525 gst of the awaiting_payment order.
        assert abs(stats["revenue"] - rev) < 5000, (
            f"revenue {stats['revenue']} does not match non-awaiting sum {rev}")
        assert abs(stats["gst_collected"] - gst) < 800
        # and the seeded awaiting order is definitely not in recent_orders
        assert not any(o["id"] == order_id for o in stats["recent_orders"])


    def test_hidden_from_gst_report(self, admin_session, seed_awaiting_order):
        r = admin_session.get(f"{API}/admin/gst-report")
        assert r.status_code == 200
        _, order_no = seed_awaiting_order
        assert not any(row.get("order_no") == order_no for row in r.json())

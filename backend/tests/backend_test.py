"""INFYKRAQ backend integration tests — auth (JWT + Emergent Google), catalog, cart, orders, wishlist, admin."""
import os
import time
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-ecommerce-126.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@infykraq.com"
ADMIN_PASSWORD = "Admin@123"
CUSTOMER_EMAIL = "customer@infykraq.com"
CUSTOMER_PASSWORD = "Test@123"


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return s, r.json().get("token")


@pytest.fixture(scope="session")
def customer_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
    assert r.status_code == 200, r.text
    return s, r.json().get("token")


@pytest.fixture(scope="session")
def seeded_google_session_token():
    """Seed a user_sessions row for customer, per /app/auth_testing.md."""
    token = "emg_test_" + uuid.uuid4().hex
    js = f"""
    var u = db.users.findOne({{email:'{CUSTOMER_EMAIL}'}});
    db.user_sessions.insertOne({{
        user_id: u._id.toString(),
        session_token: '{token}',
        expires_at: new Date(Date.now()+7*24*3600*1000).toISOString(),
        created_at: new Date().toISOString()
    }});
    """
    subprocess.run(["mongosh", "test_database", "--quiet", "--eval", js], check=True, capture_output=True)
    return token


# ---------------- health & catalog ----------------
class TestCatalog:
    def test_categories(self, http):
        r = http.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        assert "slug" in data[0] or "name" in data[0]

    def test_products_list(self, http):
        r = http.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 5
        assert "id" in data[0] and "price" in data[0]

    def test_products_filter_and_sort(self, http):
        r = http.get(f"{API}/products", params={"sort": "price_asc", "min_price": 0, "max_price": 999})
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()]
        assert prices == sorted(prices)
        assert all(p <= 999 for p in prices)

    def test_products_search(self, http):
        r = http.get(f"{API}/products", params={"q": "watch"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_product_detail(self, http):
        pid = http.get(f"{API}/products").json()[0]["id"]
        r = http.get(f"{API}/products/{pid}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == pid
        assert "related" in d and "reviews" in d

    def test_product_detail_404(self, http):
        assert http.get(f"{API}/products/does-not-exist").status_code == 404

    def test_featured_reviews(self, http):
        r = http.get(f"{API}/reviews/featured")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_settings(self, http):
        r = http.get(f"{API}/settings")
        assert r.status_code == 200
        assert r.json().get("brand_name") == "INFYKRAQ"

    def test_newsletter_ok(self, http):
        r = http.post(f"{API}/newsletter", json={"email": f"TEST_{uuid.uuid4().hex[:6]}@x.com"})
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_newsletter_bad_email(self, http):
        assert http.post(f"{API}/newsletter", json={"email": "invalid"}).status_code == 400

    def test_pincode_valid(self, http):
        r = http.get(f"{API}/pincode/560001")
        assert r.status_code == 200
        d = r.json()
        assert d["serviceable"] is True and d["pincode"] == "560001"

    def test_pincode_invalid(self, http):
        assert http.get(f"{API}/pincode/12ab").status_code == 400
        assert http.get(f"{API}/pincode/123").status_code == 400


# ---------------- JWT auth ----------------
class TestJwtAuth:
    def test_admin_login_and_me(self, admin_session):
        s, token = admin_session
        # cookie-based
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN_EMAIL and me.json()["role"] == "admin"
        # bearer-based
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200 and r2.json()["role"] == "admin"

    def test_customer_login_and_me(self, customer_session):
        s, _ = customer_session
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["role"] == "customer"

    def test_login_bad_credentials(self, http):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_new(self):
        email = f"TEST_reg_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"name": "Reg", "email": email, "password": "Passw0rd!"})
        assert r.status_code == 200
        assert r.json()["email"] == email.lower() and r.json()["role"] == "customer"

    def test_register_duplicate_email(self):
        assert requests.post(f"{API}/auth/register", json={
            "name": "Dup", "email": ADMIN_EMAIL, "password": "Passw0rd!"
        }).status_code == 400

    def test_me_unauthenticated(self):
        assert requests.get(f"{API}/auth/me").status_code == 401


# ---------------- Emergent Google session ----------------
class TestGoogleSession:
    def test_session_exchange_invalid(self):
        # Bogus session id must 401
        r = requests.post(f"{API}/auth/session", headers={"X-Session-ID": "bogus"}, json={})
        assert r.status_code == 401

    def test_session_exchange_missing(self):
        r = requests.post(f"{API}/auth/session", json={})
        assert r.status_code == 400

    def test_seeded_session_cookie_auth(self, seeded_google_session_token):
        # cookie-based
        cookies = {"session_token": seeded_google_session_token}
        r = requests.get(f"{API}/auth/me", cookies=cookies)
        assert r.status_code == 200
        assert r.json()["email"] == CUSTOMER_EMAIL

    def test_seeded_session_bearer_auth(self, seeded_google_session_token):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {seeded_google_session_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == CUSTOMER_EMAIL

    def test_protected_route_with_session(self, seeded_google_session_token):
        cookies = {"session_token": seeded_google_session_token}
        assert requests.get(f"{API}/orders", cookies=cookies).status_code == 200
        assert requests.get(f"{API}/wishlist", cookies=cookies).status_code == 200

    def test_logout_deletes_session(self, seeded_google_session_token):
        s = requests.Session()
        s.cookies.set("session_token", seeded_google_session_token,
                      domain=BASE_URL.split("//")[1])
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # session row should now be gone → cookie-based /auth/me should fail
        r2 = requests.get(f"{API}/auth/me", cookies={"session_token": seeded_google_session_token})
        assert r2.status_code == 401


# ---------------- cart & pricing ----------------
class TestCart:
    @pytest.fixture(scope="class")
    def product_ids(self):
        r = requests.get(f"{API}/products")
        prods = r.json()
        # pick a >=999 product and a <999 product where possible
        return [p["id"] for p in prods[:3]], prods

    def test_quote_basic(self, product_ids):
        ids, prods = product_ids
        items = [{"product_id": ids[0], "qty": 1, "variant": {}}]
        r = requests.post(f"{API}/cart/quote", json={"items": items, "payment_method": "online"})
        assert r.status_code == 200
        d = r.json()
        p = next(x for x in prods if x["id"] == ids[0])
        assert d["subtotal"] == round(p["price"], 2)
        expected_gst = round(d["subtotal"] * 0.18 / 1.18, 2)
        assert abs(d["gst"] - expected_gst) < 0.02
        # shipping rule
        if d["subtotal"] >= 999:
            assert d["shipping"] == 0
        else:
            assert d["shipping"] == 79
        assert d["cod_fee"] == 0

    def test_quote_cod_fee(self, product_ids):
        ids, _ = product_ids
        items = [{"product_id": ids[0], "qty": 1, "variant": {}}]
        r = requests.post(f"{API}/cart/quote", json={"items": items, "payment_method": "cod"})
        assert r.status_code == 200
        assert r.json()["cod_fee"] == 49

    def test_quote_welcome10(self, product_ids):
        ids, prods = product_ids
        # find item with price >= 999 to satisfy coupon min_order
        target = next((p for p in prods if p["price"] >= 999), prods[0])
        items = [{"product_id": target["id"], "qty": 2, "variant": {}}]
        r = requests.post(f"{API}/cart/quote", json={"items": items, "coupon_code": "WELCOME10",
                                                     "payment_method": "online"})
        assert r.status_code == 200
        d = r.json()
        assert d["coupon"] == "WELCOME10"
        assert d["discount"] > 0

    def test_quote_invalid_coupon(self, product_ids):
        ids, _ = product_ids
        r = requests.post(f"{API}/cart/quote", json={
            "items": [{"product_id": ids[0], "qty": 1, "variant": {}}], "coupon_code": "NOPE"})
        assert r.status_code == 400


# ---------------- orders ----------------
class TestOrders:
    def test_create_order_cod_and_admin_status(self, customer_session, admin_session):
        cs, _ = customer_session
        pid = requests.get(f"{API}/products").json()[0]["id"]
        payload = {
            "items": [{"product_id": pid, "qty": 1, "variant": {}}],
            "address": {"full_name": "Test User", "phone": "9876543210",
                        "email": "test@x.com", "line1": "1 Test St", "city": "Delhi",
                        "state": "DL", "pincode": "110001"},
            "payment_method": "cod"
        }
        r = cs.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["order_no"].startswith("IFQ")
        assert order["payment_method"] == "cod"
        assert order["payment_status"] == "pending"
        assert order["cod_fee"] == 49
        order_id = order["id"]

        # customer sees it in their orders
        my = cs.get(f"{API}/orders").json()
        assert any(o["id"] == order_id for o in my)

        # detail
        det = cs.get(f"{API}/orders/{order_id}")
        assert det.status_code == 200

        # admin can update status
        as_, _ = admin_session
        upd = as_.put(f"{API}/admin/orders/{order_id}/status", json={"status": "shipped"})
        assert upd.status_code == 200
        assert upd.json()["status"] == "shipped"

    def test_create_order_unauthenticated(self):
        assert requests.post(f"{API}/orders", json={"items": [], "address": {
            "full_name": "x", "phone": "1", "email": "a@b.c", "line1": "x", "city": "x",
            "state": "x", "pincode": "111111"}}).status_code == 401


# ---------------- wishlist ----------------
class TestWishlist:
    def test_toggle_and_list(self, customer_session):
        s, _ = customer_session
        pid = requests.get(f"{API}/products").json()[0]["id"]
        r1 = s.post(f"{API}/wishlist/{pid}")
        assert r1.status_code == 200
        # ensure it's in list
        lst = s.get(f"{API}/wishlist").json()
        ids = [p["id"] for p in lst]
        if not r1.json()["added"]:
            # was already there, toggle again to add
            s.post(f"{API}/wishlist/{pid}")
            lst = s.get(f"{API}/wishlist").json()
            ids = [p["id"] for p in lst]
        assert pid in ids


# ---------------- admin & authorization ----------------
class TestAdmin:
    def test_stats(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["orders", "revenue", "gst_collected", "customers", "products"]:
            assert k in d

    def test_admin_customer_forbidden(self, customer_session):
        s, _ = customer_session
        assert s.get(f"{API}/admin/stats").status_code == 403
        assert s.get(f"{API}/admin/orders").status_code == 403

    def test_admin_unauthenticated(self):
        assert requests.get(f"{API}/admin/stats").status_code == 401

    def test_product_crud(self, admin_session):
        s, _ = admin_session
        payload = {"title": "TEST_Prod", "category": "footwear", "price": 1299, "mrp": 1999,
                   "stock": 5, "images": ["https://x/y.jpg"], "attributes": {"Size": ["8", "9"]},
                   "tags": ["test"]}
        r = s.post(f"{API}/admin/products", json=payload)
        assert r.status_code == 200
        pid = r.json()["id"]
        # visible in storefront
        assert requests.get(f"{API}/products/{pid}").status_code == 200
        # update
        payload["title"] = "TEST_Prod_Updated"
        r2 = s.put(f"{API}/admin/products/{pid}", json=payload)
        assert r2.status_code == 200 and r2.json()["title"] == "TEST_Prod_Updated"
        # delete
        assert s.delete(f"{API}/admin/products/{pid}").status_code == 200
        assert requests.get(f"{API}/products/{pid}").status_code == 404

    def test_coupon_create(self, admin_session):
        s, _ = admin_session
        code = f"TEST{uuid.uuid4().hex[:4].upper()}"
        r = s.post(f"{API}/admin/coupons", json={"code": code, "type": "percent",
                                                  "value": 5, "min_order": 100, "active": True})
        assert r.status_code == 200
        assert any(c["code"] == code for c in s.get(f"{API}/admin/coupons").json())
        s.delete(f"{API}/admin/coupons/{code}")

    def test_settings_update(self, admin_session):
        s, _ = admin_session
        r = s.put(f"{API}/admin/settings", json={"brand_name": "INFYKRAQ", "phone": "9639905611",
                                                  "email": "waqutsaini@gmail.com",
                                                  "address": "UP, India",
                                                  "announcement": "Test announcement"})
        assert r.status_code == 200
        assert r.json()["announcement"] == "Test announcement"

    def test_gst_report(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/admin/gst-report")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_admin_customers_no_objectid(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/admin/customers")
        assert r.status_code == 200
        for u in r.json():
            assert "_id" not in u

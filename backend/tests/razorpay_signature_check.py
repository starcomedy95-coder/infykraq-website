"""Validates the Razorpay signature-verification + webhook code paths using dummy keys.
No network calls to Razorpay are made: we seed an order and sign it locally exactly the way
Razorpay does (HMAC-SHA256), so a real key pair will behave identically.
"""
import hashlib
import hmac
import json
import os
import subprocess
import uuid

import requests

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
CUSTOMER = os.environ.get("TEST_CUSTOMER_EMAIL", "customer@infykraq.com")
SECRET = os.environ["RAZORPAY_KEY_SECRET"]
WEBHOOK_SECRET = os.environ["RAZORPAY_WEBHOOK_SECRET"]


def sign(payload: str, secret: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def mongo(js: str) -> str:
    return subprocess.run(["mongosh", "test_database", "--quiet", "--eval", js],
                          capture_output=True, text=True, check=True).stdout.strip()


def seed_order(order_id: str, rz_order_id: str) -> None:
    mongo(f"""
    var u = db.users.findOne({{email:'{CUSTOMER}'}});
    var p = db.products.findOne({{}});
    db.orders.insertOne({{
        id:'{order_id}', order_no:'RZTEST{order_id[:6]}', user_id:u._id.toString(),
        email:'{CUSTOMER}', payment_method:'online', payment_status:'pending',
        status:'awaiting_payment', created_at:new Date().toISOString(),
        razorpay_order_id:'{rz_order_id}',
        items:[{{product_id:p.id, title:p.title, price:100, mrp:100, image:'', qty:1, variant:{{}}, amount:100}}],
        subtotal:100, discount:0, coupon:null, shipping:79, cod_fee:0, gst:15, total:179,
        address:{{full_name:'T',phone:'9',email:'{CUSTOMER}',line1:'x',city:'x',state:'x',pincode:'110001'}},
        timeline:[]
    }});""")


def cleanup(order_id: str) -> None:
    mongo(f"db.orders.deleteOne({{id:'{order_id}'}});")


def status_of(order_id: str) -> tuple:
    out = mongo(f"var o=db.orders.findOne({{id:'{order_id}'}}); print(o.payment_status + '|' + o.status);")
    return tuple(out.split("|"))


session = requests.Session()
session.post(f"{API}/auth/login", json={
    "email": os.environ.get("TEST_CUSTOMER_EMAIL", "customer@infykraq.com"),
    "password": os.environ.get("TEST_CUSTOMER_PASSWORD", "Test@123")}).raise_for_status()

results = []

# 1. valid signature -> order becomes paid + confirmed
oid, rz_oid, pay_id = str(uuid.uuid4()), "order_DUMMY1", "pay_DUMMY1"
seed_order(oid, rz_oid)
r = session.post(f"{API}/payments/razorpay/verify", json={
    "order_id": oid, "razorpay_order_id": rz_oid, "razorpay_payment_id": pay_id,
    "razorpay_signature": sign(f"{rz_oid}|{pay_id}", SECRET)})
results.append(("valid signature accepted", r.status_code == 200, r.status_code, status_of(oid)))
cleanup(oid)

# 2. tampered signature -> rejected and marked failed
oid, rz_oid = str(uuid.uuid4()), "order_DUMMY2"
seed_order(oid, rz_oid)
r = session.post(f"{API}/payments/razorpay/verify", json={
    "order_id": oid, "razorpay_order_id": rz_oid, "razorpay_payment_id": "pay_X",
    "razorpay_signature": "deadbeef"})
results.append(("bad signature rejected", r.status_code == 400, r.status_code, status_of(oid)))
cleanup(oid)

# 3. signature valid but for a different razorpay order -> rejected (order mismatch)
oid, rz_oid = str(uuid.uuid4()), "order_DUMMY3"
seed_order(oid, rz_oid)
r = session.post(f"{API}/payments/razorpay/verify", json={
    "order_id": oid, "razorpay_order_id": "order_SOMEONE_ELSE", "razorpay_payment_id": "pay_Y",
    "razorpay_signature": sign("order_SOMEONE_ELSE|pay_Y", SECRET)})
results.append(("cross-order payment rejected", r.status_code == 400, r.status_code, status_of(oid)))
cleanup(oid)

# 4. webhook payment.captured with valid signature -> order paid
oid, rz_oid = str(uuid.uuid4()), "order_DUMMY4"
seed_order(oid, rz_oid)
body = json.dumps({"event": "payment.captured",
                   "payload": {"payment": {"entity": {"id": "pay_HOOK", "order_id": rz_oid}}}})
r = requests.post(f"{API}/payments/razorpay/webhook", data=body,
                  headers={"Content-Type": "application/json",
                           "X-Razorpay-Signature": sign(body, WEBHOOK_SECRET)})
results.append(("webhook captured -> paid", r.status_code == 200 and status_of(oid)[0] == "paid", r.status_code, status_of(oid)))
cleanup(oid)

# 5. webhook with a bad signature -> rejected, order untouched
oid, rz_oid = str(uuid.uuid4()), "order_DUMMY5"
seed_order(oid, rz_oid)
r = requests.post(f"{API}/payments/razorpay/webhook", data=body,
                  headers={"Content-Type": "application/json", "X-Razorpay-Signature": "nope"})
results.append(("webhook bad signature rejected", r.status_code == 400 and status_of(oid)[0] == "pending", r.status_code, status_of(oid)))
cleanup(oid)

# 6. webhook payment.failed -> payment_status failed
oid, rz_oid = str(uuid.uuid4()), "order_DUMMY6"
seed_order(oid, rz_oid)
body6 = json.dumps({"event": "payment.failed",
                    "payload": {"payment": {"entity": {"id": "pay_FAIL", "order_id": rz_oid}}}})
r = requests.post(f"{API}/payments/razorpay/webhook", data=body6,
                  headers={"Content-Type": "application/json",
                           "X-Razorpay-Signature": sign(body6, WEBHOOK_SECRET)})
results.append(("webhook failed -> failed", status_of(oid)[0] == "failed", r.status_code, status_of(oid)))
cleanup(oid)

ok = True
for name, passed, code, st in results:
    ok = ok and passed
    print(f"{'PASS' if passed else 'FAIL'}  {name}  (http={code}, order={st})")
print("\nALL PASS" if ok else "\nSOME FAILED")

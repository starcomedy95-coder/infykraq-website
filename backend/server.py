from dotenv import load_dotenv
from pathlib import Path
import os
import uvicorn

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import time
import os
import uuid
import random
import logging
import cloudinary
import cloudinary.uploader
print("Cloud Name:", os.getenv("CLOUDINARY_CLOUD_NAME")) 
print("API Key:",os.getenv("CLOUDINARY_API_KEY")) 
print("API Secret:",
os.getenv("CLOUDINARY_API_SECRET"))                                                                                                                                      
cloudinary.config(cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"), api_key=os.getenv("CLOUDINARY_API_KEY"), api_secret=os.getenv("CLOUDINARY_API_SECRET"), secure=True)
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import razorpay
import requests
import secrets as pysecrets
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from seed_data import SEED_CATEGORIES, SEED_PRODUCTS, SEED_COUPONS, SEED_REVIEWS

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI(title="INFYKRAQ API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
GST_RATE = 0.18
CANCELLABLE = ["confirmed", "packed"]  # customer can cancel until the order is dispatched
FREE_SHIP_ABOVE = 999
SHIP_CHARGE = 79
COD_FEE = 49

logger = logging.getLogger(__name__)


# ---------------- auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def public_user(user: dict) -> dict:
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", ""),
            "role": user.get("role", "customer"), "phone": user.get("phone", ""),
            "picture": user.get("picture", "")}


async def user_from_session_token(token: str) -> Optional[dict]:
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        return None
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    return await db.users.find_one({"_id": ObjectId(session["user_id"])})


async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer ") and header[7:].startswith("emg_"):
            session_token = header[7:]
    if session_token:
        user = await user_from_session_token(session_token)
        if user:
            return user
        raise HTTPException(status_code=401, detail="Invalid session")

    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


# ---------------- models ----------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CartItemIn(BaseModel):
    product_id: str
    qty: int = 1
    variant: Dict[str, Any] = {}


class QuoteIn(BaseModel):
    items: List[CartItemIn]
    coupon_code: Optional[str] = None
    payment_method: str = "online"


class AddressIn(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    line1: str
    line2: str = ""
    city: str
    state: str
    pincode: str


class OrderIn(BaseModel):
    items: List[CartItemIn]
    address: AddressIn
    coupon_code: Optional[str] = None
    payment_method: str = "cod"


class ProductIn(BaseModel):
    title: str
    category: str
    brand: str = "INFYKRAQ"
    price: float
    mrp: float
    stock: int = 10
    images: List[str] = []
    video: Optional[str] = None
    description: str = ""
    attributes: Dict[str, List[str]] = {}
    specs: Dict[str, str] = {}
    tags: List[str] = []
    rating: float = 4.5
    reviews_count: int = 0
    active: bool = True


class CouponIn(BaseModel):
    code: str
    type: str = "percent"  # percent | flat
    value: float = 10
    min_order: float = 0
    active: bool = True
    description: str = ""


class SettingsIn(BaseModel):
    brand_name: str
    phone: str
    email: str
    address: str = ""
    flash_sale_ends: Optional[str] = None
    announcement: str = ""


# ---------------- auth routes ----------------
@api.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    start = time.time()
    result = cloudinary.uploader.upload(file.file)
    elapsed = time.time() - start
    print(f"Image upload took {elapsed:.2f} seconds")
    print(f"Image URL: {result['secure_url']}")
    return {"url": result["secure_url"]}
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"email": email, "name": body.name, "phone": body.phone,
           "password_hash": hash_password(body.password), "role": "customer",
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    set_auth_cookie(response, create_access_token(str(res.inserted_id), email))
    return public_user(doc)


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_auth_cookie(response, create_access_token(str(user["_id"]), email))
    out = public_user(user)
    out["token"] = create_access_token(str(user["_id"]), email)
    return out


@api.post("/auth/session")
async def google_session(request: Request, response: Response):
    """Exchange an Emergent Auth session_id for our own httpOnly session cookie."""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        try:
            session_id = (await request.json()).get("session_id")
        except Exception:
            session_id = None
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=15,
        )
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Auth service unreachable")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    user = await db.users.find_one({"email": email})
    if not user:
        doc = {"email": email, "name": data.get("name") or email.split("@")[0], "phone": "",
               "picture": data.get("picture", ""), "role": "customer", "auth_provider": "google",
               # Google users never sign in with a password; store an unusable random one.
               "password_hash": hash_password(pysecrets.token_urlsafe(32)),
               "created_at": datetime.now(timezone.utc).isoformat()}
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        user = doc
    elif data.get("picture") and not user.get("picture"):
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"picture": data["picture"]}})

    session_token = "emg_" + pysecrets.token_hex(32)
    await db.user_sessions.insert_one({
        "user_id": str(user["_id"]), "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")
    return public_user(user)


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if not session_token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer ") and header[7:].startswith("emg_"):
            session_token = header[7:]
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ---------------- catalog ----------------
@api.get("/categories")
async def categories():
    return await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)


@api.get("/products")
async def products(category: Optional[str] = None, q: Optional[str] = None,
                   tag: Optional[str] = None, sort: str = "featured",
                   min_price: Optional[float] = None, max_price: Optional[float] = None,
                   limit: int = 60):
    query: Dict[str, Any] = {"active": True}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}},
                        {"description": {"$regex": q, "$options": "i"}},
                        {"category": {"$regex": q, "$options": "i"}}]
    if min_price is not None or max_price is not None:
        price_q = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        query["price"] = price_q
    sort_map = {"price_asc": ("price", 1), "price_desc": ("price", -1),
                "rating": ("rating", -1), "featured": ("created_at", -1)}
    field, direction = sort_map.get(sort, ("created_at", -1))
    return await db.products.find(query, {"_id": 0}).sort(field, direction).to_list(limit)


@api.get("/products/{product_id}")
async def product_detail(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p["reviews"] = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(20)
    p["related"] = await db.products.find(
        {"category": p["category"], "id": {"$ne": product_id}, "active": True}, {"_id": 0}
    ).to_list(4)
    return p


@api.get("/reviews/featured")
async def featured_reviews():
    return await db.reviews.find({"featured": True}, {"_id": 0}).to_list(10)


@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"key": "site"}, {"_id": 0})
    return s or {}


@api.post("/newsletter")
async def newsletter(body: Dict[str, str]):
    email = (body.get("email") or "").lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    await db.newsletter.update_one({"email": email},
                                   {"$set": {"email": email, "at": datetime.now(timezone.utc).isoformat()}},
                                   upsert=True)
    return {"ok": True, "message": "Subscribed successfully"}


@api.get("/pincode/{pincode}")
async def pincode_check(pincode: str):
    if not (pincode.isdigit() and len(pincode) == 6):
        raise HTTPException(status_code=400, detail="Enter a valid 6-digit pincode")
    days = 2 + (int(pincode[-1]) % 5)
    eta = datetime.now(timezone.utc) + timedelta(days=days)
    return {"pincode": pincode, "serviceable": True, "cod_available": int(pincode[-1]) % 4 != 0,
            "days": days, "eta": eta.strftime("%d %b, %Y")}


# ---------------- pricing ----------------
async def compute_totals(items: List[CartItemIn], coupon_code: Optional[str], payment_method: str):
    lines = []
    subtotal = 0.0
    for it in items:
        p = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not p:
            continue
        qty = max(1, it.qty)
        amount = round(p["price"] * qty, 2)
        subtotal += amount
        lines.append({"product_id": p["id"], "title": p["title"], "price": p["price"],
                      "mrp": p["mrp"], "image": (p.get("images") or [None])[0],
                      "qty": qty, "variant": it.variant, "amount": amount})
    discount = 0.0
    coupon = None
    if coupon_code:
        c = await db.coupons.find_one({"code": coupon_code.upper(), "active": True}, {"_id": 0})
        if not c:
            raise HTTPException(status_code=400, detail="Invalid coupon code")
        if subtotal < c.get("min_order", 0):
            raise HTTPException(status_code=400, detail=f"Coupon needs min order of Rs.{int(c['min_order'])}")
        discount = round(subtotal * c["value"] / 100, 2) if c["type"] == "percent" else float(c["value"])
        discount = min(discount, subtotal)
        coupon = c["code"]
    taxable = max(0.0, subtotal - discount)
    shipping = 0.0 if taxable >= FREE_SHIP_ABOVE or taxable == 0 else float(SHIP_CHARGE)
    cod_fee = float(COD_FEE) if payment_method == "cod" and taxable > 0 else 0.0
    gst = round(taxable * GST_RATE / (1 + GST_RATE), 2)  # price is GST-inclusive
    total = round(taxable + shipping + cod_fee, 2)
    return {"items": lines, "subtotal": round(subtotal, 2), "discount": discount, "coupon": coupon,
            "shipping": shipping, "cod_fee": cod_fee, "gst": gst, "total": total,
            "free_ship_above": FREE_SHIP_ABOVE}


@api.post("/cart/quote")
async def cart_quote(body: QuoteIn):
    return await compute_totals(body.items, body.coupon_code, body.payment_method)


@api.get("/coupons")
async def public_coupons():
    return await db.coupons.find({"active": True}, {"_id": 0}).to_list(20)


# ---------------- orders ----------------
def order_number() -> str:
    return "IFQ" + datetime.now(timezone.utc).strftime("%y%m%d") + str(random.randint(1000, 9999))


def razorpay_configured() -> bool:
    return bool(os.environ.get("RAZORPAY_KEY_ID") and os.environ.get("RAZORPAY_KEY_SECRET"))


def razorpay_client():
    if not razorpay_configured():
        raise HTTPException(status_code=503, detail="Online payment is not configured yet. Please use COD.")
    return razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))


async def adjust_stock(product_id: str, delta: int):
    await db.products.update_one({"id": product_id}, [
        {"$set": {"stock": {"$max": [0, {"$add": ["$stock", delta]}]}}}
    ])


async def build_order(user: dict, body: OrderIn, payment_status: str, status: str) -> dict:
    totals = await compute_totals(body.items, body.coupon_code, body.payment_method)
    if not totals["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), "order_no": order_number(), "user_id": str(user["_id"]),
           "email": body.address.email, "address": body.address.model_dump(),
           "payment_method": body.payment_method, "payment_status": payment_status,
           "status": status, "created_at": now,
           "timeline": [{"status": status, "at": now}], **totals}
    await db.orders.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


async def mark_order_paid(order: dict, payment_id: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one({"id": order["id"]}, {
        "$set": {"payment_status": "paid", "status": "pending", "razorpay_payment_id": payment_id},
        "$push": {"timeline": {"status": "pending", "at": now}},
    })
    for line in order["items"]:
        await adjust_stock(line["product_id"], -line["qty"])
    logger.info(f"NOTIFICATION (mocked): order {order['order_no']} paid, email->{order['email']}")
    return await db.orders.find_one({"id": order["id"]}, {"_id": 0})


@api.post("/orders")
async def create_order(body: OrderIn, user: dict = Depends(get_current_user)):
    if body.payment_method != "cod":
        raise HTTPException(status_code=400, detail="Use the Razorpay flow for online payments")
    doc = await build_order(user, body, payment_status="pending", status="pending")
    for line in doc["items"]:
        await adjust_stock(line["product_id"], -line["qty"])
    logger.info(f"NOTIFICATION (mocked): COD order {doc['order_no']} email->{doc['email']}")
    return doc


# ---------------- razorpay ----------------
@api.get("/payments/config")
async def payment_config():
    return {"configured": razorpay_configured(), "key_id": os.environ.get("RAZORPAY_KEY_ID", "")}


@api.post("/payments/razorpay/order")
async def razorpay_create_order(body: OrderIn, user: dict = Depends(get_current_user)):
    client_rz = razorpay_client()
    body.payment_method = "online"
    doc = await build_order(user, body, payment_status="pending", status="awaiting_payment")
    try:
        rz_order = client_rz.order.create({
            "amount": int(round(doc["total"] * 100)),
            "currency": "INR",
            "receipt": doc["order_no"][:40],
            "payment_capture": 1,
            "notes": {"order_id": doc["id"], "email": doc["email"]},
        })
    except Exception as e:
        logger.error(f"Razorpay order create failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start payment. Please try again.")
    await db.orders.update_one({"id": doc["id"]}, {"$set": {"razorpay_order_id": rz_order["id"]}})
    return {"order_id": doc["id"], "order_no": doc["order_no"], "amount": rz_order["amount"],
            "currency": "INR", "razorpay_order_id": rz_order["id"],
            "key_id": os.environ["RAZORPAY_KEY_ID"],
            "prefill": {"name": doc["address"]["full_name"], "email": doc["email"],
                        "contact": doc["address"]["phone"]}}


class VerifyIn(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@api.post("/payments/razorpay/verify")
async def razorpay_verify(body: VerifyIn, user: dict = Depends(get_current_user)):
    client_rz = razorpay_client()
    order = await db.orders.find_one({"id": body.order_id, "user_id": str(user["_id"])}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("razorpay_order_id") != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not match this order")
    try:
        client_rz.utility.verify_payment_signature({
            "razorpay_order_id": body.razorpay_order_id,
            "razorpay_payment_id": body.razorpay_payment_id,
            "razorpay_signature": body.razorpay_signature,
        })
    except Exception:
        await db.orders.update_one({"id": order["id"]}, {"$set": {"payment_status": "failed"}})
        raise HTTPException(status_code=400, detail="Payment verification failed")
    if order["payment_status"] == "paid":
        return order
    return await mark_order_paid(order, body.razorpay_payment_id)


@api.post("/payments/razorpay/cancel/{order_id}")
async def razorpay_cancel(order_id: str, user: dict = Depends(get_current_user)):
    await db.orders.update_one(
        {"id": order_id, "user_id": str(user["_id"]), "payment_status": "pending"},
        {"$set": {"payment_status": "cancelled", "status": "cancelled"}})
    return {"ok": True}


@api.post("/payments/razorpay/webhook")
async def razorpay_webhook(request: Request):
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    try:
        razorpay_client().utility.verify_webhook_signature(payload.decode(), signature, secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    event = await request.json()
    entity = (event.get("payload", {}).get("payment", {}) or {}).get("entity", {})
    rz_order_id = entity.get("order_id")
    if not rz_order_id:
        return {"ignored": True}
    order = await db.orders.find_one({"razorpay_order_id": rz_order_id}, {"_id": 0})
    if not order:
        return {"ignored": True}
    if event.get("event") == "payment.captured" and order["payment_status"] != "paid":
        await mark_order_paid(order, entity.get("id", ""))
    elif event.get("event") == "payment.failed" and order["payment_status"] == "pending":
        await db.orders.update_one({"id": order["id"]}, {"$set": {"payment_status": "failed"}})
    return {"ok": True}


@api.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    return await db.orders.find(
        {"user_id": str(user["_id"]), "status": {"$ne": "awaiting_payment"}}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)


@api.get("/orders/{order_id}")
async def order_detail(order_id: str, user: dict = Depends(get_current_user)):
    q = {"id": order_id}
    if user.get("role") != "admin":
        q["user_id"] = str(user["_id"])
    o = await db.orders.find_one(q, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o


@api.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, user: dict = Depends(get_current_user)):
    q = {"id": order_id}
    if user.get("role") != "admin":
        q["user_id"] = str(user["_id"])
    order = await db.orders.find_one(q, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="This order is already cancelled")
    if order["status"] not in CANCELLABLE:
        raise HTTPException(
            status_code=400,
            detail="This order has already been dispatched and can no longer be cancelled. Please refuse delivery or request a return.")
    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one({"id": order_id}, {
        "$set": {"status": "cancelled", "cancelled_at": now,
                 "cancelled_by": "admin" if user.get("role") == "admin" else "customer",
                 "payment_status": "refund_pending" if order["payment_status"] == "paid" else order["payment_status"]},
        "$push": {"timeline": {"status": "cancelled", "at": now}},
    })
    for line in order["items"]:
        await adjust_stock(line["product_id"], line["qty"])
    logger.info(f"NOTIFICATION (mocked): order {order['order_no']} cancelled, email->{order['email']}")
    return await db.orders.find_one({"id": order_id}, {"_id": 0})


# ---------------- wishlist ----------------
@api.get("/wishlist")
async def get_wishlist(user: dict = Depends(get_current_user)):
    ids = (await db.wishlists.find_one({"user_id": str(user["_id"])}, {"_id": 0}) or {}).get("product_ids", [])
    return await db.products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(100)


@api.post("/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    doc = await db.wishlists.find_one({"user_id": str(user["_id"])}) or {"product_ids": []}
    ids = doc.get("product_ids", [])
    added = product_id not in ids
    ids = ids + [product_id] if added else [i for i in ids if i != product_id]
    await db.wishlists.update_one({"user_id": str(user["_id"])},
                                  {"$set": {"product_ids": ids}}, upsert=True)
    return {"added": added, "product_ids": ids}


# ---------------- admin ----------------
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_admin)):
    orders = await db.orders.find({"status": {"$ne": "awaiting_payment"}}, {"_id": 0}).to_list(1000)
    revenue = sum(o["total"] for o in orders)
    gst = sum(o.get("gst", 0) for o in orders)
    return {"orders": len(orders), "revenue": round(revenue, 2), "gst_collected": round(gst, 2),
            "customers": await db.users.count_documents({"role": "customer"}),
            "products": await db.products.count_documents({}),
            "low_stock": await db.products.find({"stock": {"$lt": 5}}, {"_id": 0}).to_list(20),
            "recent_orders": sorted(orders, key=lambda o: o["created_at"], reverse=True)[:8]}


@api.get("/admin/orders")
async def admin_orders(admin: dict = Depends(get_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, body: Dict[str, str], admin: dict = Depends(get_admin)):
    status = body.get("status", "")
    if status not in ["pending", "accepted", "packed", "shipped", "delivered", "cancelled", "awaiting_payment"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    now = datetime.now(timezone.utc).isoformat()
    res = await db.orders.update_one({"id": order_id}, {
        "$set": {"status": status}, "$push": {"timeline": {"status": status, "at": now}}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Order not found")
    return await db.orders.find_one({"id": order_id}, {"_id": 0})


@api.get("/admin/products")
async def admin_products(admin: dict = Depends(get_admin)):
    return await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/admin/products")
async def create_product(body: ProductIn, admin: dict = Depends(get_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/admin/products/{product_id}")
async def update_product(product_id: str, body: ProductIn, admin: dict = Depends(get_admin)):
    res = await db.products.update_one({"id": product_id}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_admin)):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}


@api.get("/admin/coupons")
async def admin_coupons(admin: dict = Depends(get_admin)):
    return await db.coupons.find({}, {"_id": 0}).to_list(100)


@api.post("/admin/coupons")
async def create_coupon(body: CouponIn, admin: dict = Depends(get_admin)):
    doc = body.model_dump()
    doc["code"] = doc["code"].upper()
    await db.coupons.update_one({"code": doc["code"]}, {"$set": doc}, upsert=True)
    return doc


@api.delete("/admin/coupons/{code}")
async def delete_coupon(code: str, admin: dict = Depends(get_admin)):
    await db.coupons.delete_one({"code": code.upper()})
    return {"ok": True}


@api.get("/admin/customers")
async def admin_customers(admin: dict = Depends(get_admin)):
    users = await db.users.find({"role": "customer"}).to_list(500)
    out = []
    for u in users:
        orders = await db.orders.count_documents({"user_id": str(u["_id"])})
        out.append({**public_user(u), "orders": orders, "created_at": u.get("created_at")})
    return out


@api.put("/admin/settings")
async def update_settings(body: SettingsIn, admin: dict = Depends(get_admin)):
    doc = {"key": "site", **body.model_dump()}
    await db.settings.update_one({"key": "site"}, {"$set": doc}, upsert=True)
    doc.pop("_id", None)
    return doc


@api.get("/admin/gst-report")
async def gst_report(admin: dict = Depends(get_admin)):
    orders = await db.orders.find({"status": {"$ne": "awaiting_payment"}}, {"_id": 0}).to_list(1000)
    buckets: Dict[str, Dict[str, float]] = {}
    for o in orders:
        month = o["created_at"][:7]
        b = buckets.setdefault(month, {"taxable": 0.0, "gst": 0.0, "orders": 0, "total": 0.0})
        b["gst"] += o.get("gst", 0)
        b["taxable"] += round(o["total"] - o.get("gst", 0), 2)
        b["total"] += o["total"]
        b["orders"] += 1
    return [{"month": k, **{kk: round(vv, 2) for kk, vv in v.items()}} for k, v in sorted(buckets.items(), reverse=True)]


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
        "https://infykraq-website.vercel.app",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id")
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"email": admin_email, "name": "INFYKRAQ Admin", "role": "admin",
                                   "phone": "963990561", "password_hash": hash_password(admin_password),
                                   "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
    if not await db.users.find_one({"email": "customer@infykraq.com"}):
        await db.users.insert_one({"email": "customer@infykraq.com", "name": "Test Customer",
                                   "role": "customer", "phone": "9876543210",
                                   "password_hash": hash_password("Test@123"),
                                   "created_at": datetime.now(timezone.utc).isoformat()})
    if not await db.categories.count_documents({}):
        await db.categories.insert_many([dict(c) for c in SEED_CATEGORIES])
    if not await db.products.count_documents({}):
        await db.products.insert_many([dict(p) for p in SEED_PRODUCTS])
    if not await db.coupons.count_documents({}):
        await db.coupons.insert_many([dict(c) for c in SEED_COUPONS])
    if not await db.reviews.count_documents({}):
        await db.reviews.insert_many([dict(r) for r in SEED_REVIEWS])
    if not await db.settings.find_one({"key": "site"}):
        await db.settings.insert_one({
            "key": "site", "brand_name": "INFYKRAQ", "phone": "9639905611",
            "email": "waqutsaini@gmail.com", "address": "Uttar Pradesh, India",
            "flash_sale_ends": (datetime.now(timezone.utc) + timedelta(hours=36)).isoformat(),
            "announcement": "Free shipping on orders above Rs.999 | COD available across India"})


@app.on_event("shutdown")
async def shutdown():
    client.close()
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000)

import uuid
from datetime import datetime, timezone, timedelta

SANDALS = [
    "https://images.unsplash.com/photo-1618615098938-84fc29796e76?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBzYW5kYWxzfGVufDB8fHx8MTc4NjU1MTQ3Nnww&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1628375385879-1af64230c2e1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzYW5kYWxzfGVufDB8fHx8MTc4NjU1MTQ3Nnww&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1619510331283-a46c425e48bb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBzYW5kYWxzfGVufDB8fHx8MTc4NjU1MTQ3Nnww&ixlib=rb-4.1.0&q=85",
]
WATCHES = [
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHxwcmVtaXVtJTIwc21hcnQlMjB3YXRjaHxlbnwwfHx8fDE3ODY1NTE0NzZ8MA&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwzfHxwcmVtaXVtJTIwc21hcnQlMjB3YXRjaHxlbnwwfHx8fDE3ODY1NTE0NzZ8MA&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwc21hcnQlMjB3YXRjaHxlbnwwfHx8fDE3ODY1NTE0NzZ8MA&ixlib=rb-4.1.0&q=85",
]
ELECTRONICS = [
    "https://images.unsplash.com/photo-1615655406736-b37c4fabf923?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwZ2FkZ2V0cyUyMGFlc3RoZXRpY3xlbnwwfHx8fDE3ODY1NTE0NzZ8MA&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1620783770629-122b7f187703?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwzfHxlbGVjdHJvbmljJTIwZ2FkZ2V0cyUyMGFlc3RoZXRpY3xlbnwwfHx8fDE3ODY1NTE0NzZ8MA&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1515940175183-6798529cb860?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwyfHxlbGVjdHJvbmljJTIwZ2FkZ2V0cyUyMGFlc3RoZXRpY3xlbnwwfHx8fDE3ODY1NTE0NzZ8MA&ixlib=rb-4.1.0&q=85",
]
BAGS = [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxsZWF0aGVyJTIwYmFnc3xlbnwwfHx8fDE3ODY1NTE4MTF8MA&ixlib=rb-4.1.0&q=85",
]

SEED_CATEGORIES = [
    {"slug": "footwear", "name": "Footwear", "order": 1, "image": SANDALS[0],
     "fields": ["Size", "Color", "Material"], "tagline": "Handcrafted sandals & slides"},
    {"slug": "watches", "name": "Watches", "order": 2, "image": WATCHES[0],
     "fields": ["Strap", "Dial Color", "Warranty"], "tagline": "Smart & classic timepieces"},
    {"slug": "electronics", "name": "Electronics", "order": 3, "image": ELECTRONICS[0],
     "fields": ["Color", "Warranty", "Power"], "tagline": "Audio, gadgets & more"},
    {"slug": "accessories", "name": "Accessories", "order": 4, "image": BAGS[0],
     "fields": ["Color", "Material"], "tagline": "Leather bags & essentials"},
]


def _p(title, category, price, mrp, images, attributes, specs, tags, rating, reviews, stock=24, desc=""):
    return {
        "id": str(uuid.uuid4()), "title": title, "category": category, "brand": "INFYKRAQ",
        "price": price, "mrp": mrp, "stock": stock, "images": images, "video": None,
        "description": desc or f"{title} - crafted for everyday premium comfort. Quality checked, GST invoice included, 7-day easy returns.",
        "attributes": attributes, "specs": specs, "tags": tags, "rating": rating,
        "reviews_count": reviews, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


SEED_PRODUCTS = [
    _p("Kairo Leather Slide Sandals", "footwear", 1299, 2499, SANDALS,
       {"Size": ["6", "7", "8", "9", "10"], "Color": ["Tan", "Black", "Olive"], "Material": ["Genuine Leather"]},
       {"Sole": "Anti-skid EVA", "Care": "Wipe with dry cloth", "Country": "India"},
       ["new", "bestseller", "flash"], 4.6, 182),
    _p("Rovo Everyday Comfort Sandals", "footwear", 899, 1799, [SANDALS[1], SANDALS[2], SANDALS[0]],
       {"Size": ["6", "7", "8", "9"], "Color": ["Brown", "Grey"], "Material": ["Vegan Leather"]},
       {"Sole": "Cushioned PU", "Warranty": "3 months"}, ["bestseller"], 4.3, 96),
    _p("Meridian Strap Sandals", "footwear", 1599, 2999, [SANDALS[2], SANDALS[0]],
       {"Size": ["7", "8", "9", "10"], "Color": ["Black", "Beige"], "Material": ["Suede"]},
       {"Sole": "Rubber", "Care": "Avoid water"}, ["new"], 4.5, 41),
    _p("Chrono Steel Automatic Watch", "watches", 4499, 8999, WATCHES,
       {"Strap": ["Steel", "Leather"], "Dial Color": ["Midnight", "Champagne"], "Warranty": ["1 Year"]},
       {"Movement": "Automatic", "Water Resistance": "5 ATM", "Warranty": "1 Year Brand"},
       ["bestseller", "flash"], 4.8, 311),
    _p("Aeon Smartwatch Pro", "watches", 2999, 5999, [WATCHES[1], WATCHES[2], WATCHES[0]],
       {"Strap": ["Silicone", "Magnetic Steel"], "Dial Color": ["Black", "Rose Gold"], "Warranty": ["1 Year"]},
       {"Display": "1.83in AMOLED", "Battery": "7 days", "Calling": "Bluetooth"}, ["new", "bestseller"], 4.4, 245),
    _p("Lumen Minimal Analog Watch", "watches", 1799, 3499, [WATCHES[2], WATCHES[0]],
       {"Strap": ["Leather"], "Dial Color": ["White", "Navy"], "Warranty": ["6 Months"]},
       {"Movement": "Quartz", "Glass": "Mineral"}, ["new"], 4.2, 63),
    _p("Pulse ANC Wireless Headphones", "electronics", 2499, 4999, ELECTRONICS,
       {"Color": ["Matte Black", "Ivory"], "Warranty": ["1 Year"], "Power": ["40h Playtime"]},
       {"Driver": "40mm", "ANC": "Hybrid -32dB", "Charging": "USB-C fast"},
       ["bestseller", "flash"], 4.7, 428),
    _p("Nova True Wireless Earbuds", "electronics", 1499, 2999, [ELECTRONICS[1], ELECTRONICS[2]],
       {"Color": ["White", "Black"], "Warranty": ["1 Year"], "Power": ["30h Case"]},
       {"Latency": "45ms Game Mode", "IP Rating": "IPX5"}, ["new", "bestseller"], 4.5, 289),
    _p("Volt 65W GaN Charger", "electronics", 1199, 2199, [ELECTRONICS[2], ELECTRONICS[0]],
       {"Color": ["Black"], "Warranty": ["18 Months"], "Power": ["65W"]},
       {"Ports": "2C + 1A", "Safety": "GaN III"}, ["new"], 4.6, 74),
    _p("Atlas Full-Grain Leather Backpack", "accessories", 3299, 6499, BAGS + [SANDALS[0]],
       {"Color": ["Cognac", "Espresso"], "Material": ["Full-grain Leather"]},
       {"Capacity": "22L", "Laptop": "Fits 15.6in"}, ["bestseller", "flash"], 4.7, 133, 12),
    _p("Trace Leather Card Wallet", "accessories", 699, 1499, [BAGS[0]],
       {"Color": ["Tan", "Black"], "Material": ["Leather"]},
       {"Slots": "6 cards", "Dimensions": "10 x 7 cm"}, ["new"], 4.3, 58),
    _p("Vault Travel Duffle", "accessories", 2599, 4999, [BAGS[0], ELECTRONICS[0]],
       {"Color": ["Charcoal"], "Material": ["Canvas + Leather"]},
       {"Capacity": "35L", "Cabin": "Cabin friendly"}, ["bestseller"], 4.4, 87, 4),
]

SEED_COUPONS = [
    {"code": "WELCOME10", "type": "percent", "value": 10, "min_order": 999, "active": True,
     "description": "10% off on first order above Rs.999"},
    {"code": "FLAT200", "type": "flat", "value": 200, "min_order": 1499, "active": True,
     "description": "Flat Rs.200 off above Rs.1499"},
    {"code": "INFY15", "type": "percent", "value": 15, "min_order": 2999, "active": True,
     "description": "15% off above Rs.2999"},
]

_pid = [p["id"] for p in SEED_PRODUCTS]
SEED_REVIEWS = [
    {"id": str(uuid.uuid4()), "product_id": _pid[0], "name": "Anjali M.", "city": "Lucknow", "rating": 5,
     "title": "Premium feel", "body": "Leather quality is genuinely premium and delivery was in 2 days.",
     "featured": True, "at": datetime.now(timezone.utc).isoformat()},
    {"id": str(uuid.uuid4()), "product_id": _pid[3], "name": "Rohit S.", "city": "Pune", "rating": 5,
     "title": "Looks expensive", "body": "The automatic watch feels far above its price. Invoice with GST received.",
     "featured": True, "at": datetime.now(timezone.utc).isoformat()},
    {"id": str(uuid.uuid4()), "product_id": _pid[6], "name": "Sneha K.", "city": "Bengaluru", "rating": 4,
     "title": "ANC is solid", "body": "Noise cancellation works great in metro. Battery easily lasts a week.",
     "featured": True, "at": datetime.now(timezone.utc).isoformat()},
    {"id": str(uuid.uuid4()), "product_id": _pid[9], "name": "Imran A.", "city": "Delhi", "rating": 5,
     "title": "Worth every rupee", "body": "Backpack stitching is neat, carried it on a 10-day trip.",
     "featured": True, "at": datetime.now(timezone.utc).isoformat()},
    {"id": str(uuid.uuid4()), "product_id": _pid[4], "name": "Divya R.", "city": "Jaipur", "rating": 4,
     "title": "Good smartwatch", "body": "Calling works well, display is bright outdoors.",
     "featured": False, "at": datetime.now(timezone.utc).isoformat()},
]

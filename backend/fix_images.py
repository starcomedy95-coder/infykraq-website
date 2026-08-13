import asyncio, os
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

S = ["https://images.unsplash.com/photo-1625318880107-49baad6765fd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1585120824848-8a5cd41493d2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1625318880248-a7cc6bcf0c0f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]
W = ["https://images.unsplash.com/photo-1629581678313-36cf745a9af9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1582150264904-e0bea5ef0ad1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1539874754764-5a96559165b0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]
H = ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]
E = ["https://images.unsplash.com/photo-1606741965326-cb990ae01bb2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]
C = ["https://images.unsplash.com/photo-1725304382197-663ae3864750?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1731616103600-3fe7ccdc5a59?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]
B = ["https://images.unsplash.com/photo-1647540945262-7da3bd1a3d96?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1637868796504-32f45a96d5a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]
WA = ["https://images.unsplash.com/photo-1628483212179-49f29440423e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
      "https://images.unsplash.com/photo-1637868796504-32f45a96d5a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]
D = ["https://images.unsplash.com/photo-1525103504173-8dc1582c7430?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
     "https://images.unsplash.com/photo-1647540945262-7da3bd1a3d96?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"]

MAP = {
    "Kairo Leather Slide Sandals": S,
    "Rovo Everyday Comfort Sandals": [S[1], S[2], S[0]],
    "Meridian Strap Sandals": [S[2], S[0]],
    "Chrono Steel Automatic Watch": [W[0], W[1], W[2]],
    "Aeon Smartwatch Pro": [W[1], W[3], W[2]],
    "Lumen Minimal Analog Watch": [W[3], W[2]],
    "Pulse ANC Wireless Headphones": H + [E[1]],
    "Nova True Wireless Earbuds": E,
    "Volt 65W GaN Charger": C,
    "Atlas Full-Grain Leather Backpack": B,
    "Trace Leather Card Wallet": WA,
    "Vault Travel Duffle": D,
}
CATS = {"footwear": S[0], "watches": W[0], "electronics": H[0], "accessories": B[0]}


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    for title, imgs in MAP.items():
        await db.products.update_one({"title": title}, {"$set": {"images": imgs}})
    for slug, img in CATS.items():
        await db.categories.update_one({"slug": slug}, {"$set": {"image": img}})
    print("images updated")

asyncio.run(main())

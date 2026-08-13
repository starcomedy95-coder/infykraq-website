import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get("/wishlist").then((r) => setItems(r.data)).catch(() => setErr(true));
  }, []);

  if (err)
    return (
      <div className="max-w-3xl mx-auto px-4 py-28 text-center" data-testid="wishlist-login-prompt">
        <h1 className="font-display text-3xl tracking-tighter">Sign in to view your wishlist</h1>
        <Link to="/login?next=/wishlist" className="inline-block mt-6 text-xs uppercase tracking-widest border-b border-primary pb-1">Login</Link>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-12" data-testid="wishlist-page">
      <p className="overline">Saved</p>
      <h1 className="font-display text-4xl tracking-tighter mt-2">Wishlist ({items.length})</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground py-16 text-center" data-testid="empty-wishlist">Nothing saved yet.</p>}
    </div>
  );
}

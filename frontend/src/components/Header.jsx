import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, User, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const { count } = useCart();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/categories")
  .then((r) => {
    console.log(r.data);
    setCats(Array.isArray(r.data) ? r.data : []);
  })
  .catch(() => setCats([]));
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50" data-testid="site-header">
      <div className="bg-primary text-primary-foreground text-center text-xs py-2 px-4 tracking-wide" data-testid="announcement-bar">
        {settings.announcement || "Free shipping above ₹999"}
      </div>
      <div className="backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center gap-4">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setOpen(!open)} data-testid="mobile-menu-btn">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="font-display text-xl sm:text-2xl font-black tracking-tighter" data-testid="brand-logo">
            INFYKRAQ<span className="text-accent">.</span>
          </Link>

          <form onSubmit={submit} className="hidden md:flex flex-1 max-w-md ml-6 items-center gap-2 border-b-2 border-black/10 focus-within:border-primary">
            <Search size={16} className="text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sandals, watches, gadgets..."
              className="field-line h-10 text-sm"
              data-testid="search-input"
            />
          </form>

          <nav className="hidden lg:flex items-center gap-6 ml-auto text-sm">
            {cats.map((c) => (
              <Link key={c.slug} to={`/c/${c.slug}`} className="hover:text-accent transition-colors" data-testid={`nav-cat-${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 ml-auto lg:ml-4">
            <Link to="/wishlist" className="p-2.5 hover:text-accent transition-colors" data-testid="wishlist-link">
              <Heart size={18} />
            </Link>
            <Link to="/cart" className="p-2.5 relative hover:text-accent transition-colors" data-testid="cart-link">
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full grid place-items-center font-mono-num" data-testid="cart-count">
                  {count}
                </span>
              )}
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" className="p-2.5 hover:text-accent transition-colors" data-testid="admin-link">
                <LayoutDashboard size={18} />
              </Link>
            )}
            {user ? (
              <>
                <Link to="/account" className="p-2.5 hover:text-accent transition-colors" data-testid="account-link">
                  <User size={18} />
                </Link>
                <button onClick={() => logout()} className="p-2.5 hover:text-destructive transition-colors" data-testid="logout-btn">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Button asChild size="sm" className="btn-emerald ml-1 h-9 px-4 text-xs tracking-wide" data-testid="login-btn">
                <Link to="/login">LOGIN</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="lg:hidden border-t border-border overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-4 py-2.5">
            {cats.map((c) => (
              <Link
                key={c.slug}
                to={`/c/${c.slug}`}
                className="shrink-0 text-xs uppercase tracking-wider px-3 py-1.5 border border-border rounded-full bg-card hover:border-primary transition-colors"
                data-testid={`chip-cat-${c.slug}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-border bg-background p-4" data-testid="mobile-menu">
            <form onSubmit={submit} className="flex items-center gap-2 border-b-2 border-black/10">
              <Search size={16} />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="field-line h-10" data-testid="mobile-search-input" />
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

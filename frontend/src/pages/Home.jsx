import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Zap, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { api, inr } from "@/lib/api";
import { ProductCard, CardSkeleton } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";

const useCountdown = (endIso) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!endIso) return null;
    const diff = new Date(endIso).getTime() - now;
    if (diff <= 0) return { h: "00", m: "00", s: "00" };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0"), s: String(s).padStart(2, "0") };
  }, [endIso, now]);
};

export default function Home() {
  const [cats, setCats] = useState([]);
  const [newest, setNewest] = useState([]);
  const [best, setBest] = useState([]);
  const [flash, setFlash] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const cd = useCountdown(settings.flash_sale_ends);

  useEffect(() => {
    Promise.all([
      api.get("/categories"),
      api.get("/products?tag=new&limit=8"),
      api.get("/products?tag=bestseller&limit=8"),
      api.get("/products?tag=flash&limit=4"),
      api.get("/reviews/featured"),
      api.get("/settings"),
    ])
      .then(([c, n, b, f, r, s]) => {
        setCats(Array.isArray(c.data) ? c.data : []);
        setNewest(Array.isArray(n.data) ? n.data : []);
        setBest(Array.isArray(b.data) ? b.data : []);
        setFlash(Array.isArray(f.data) ? f.data : []);
        setReviews(Array.isArray(r.data) ? r.data : []);
        setSettings(s.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const hero = cats[1]?.image;

  return (
    <div data-testid="home-page">
      {/* HERO — asymmetric bento */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 relative rounded-md overflow-hidden min-h-[420px] lg:min-h-[540px] reveal" data-testid="hero-banner">
          <img src={hero} alt="INFYKRAQ premium collection" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="relative h-full flex flex-col justify-end p-7 sm:p-12 text-white">
            <p className="overline text-white/70">New Season · 2026</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter mt-4 max-w-xl leading-[1.03]">
              Premium picks, everyday prices.
            </h1>
            <p className="text-sm sm:text-base text-white/80 mt-5 max-w-md">
              Sandals, timepieces, audio and leather — curated in India, delivered in days.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button asChild className="btn-emerald h-12 px-7 text-xs tracking-widest" data-testid="hero-shop-btn">
                <Link to="/c/footwear">SHOP THE EDIT <ArrowRight size={15} className="ml-2" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-12 px-7 text-xs tracking-widest bg-white/10 border-white/40 text-white hover:bg-white hover:text-primary rounded-sm">
                <Link to="/c/watches">VIEW WATCHES</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {cats.slice(0, 2).map((c, i) => (
            <Link
              key={c.slug}
              to={`/c/${c.slug}`}
              className="relative rounded-md overflow-hidden zoom-wrap min-h-[180px] lg:min-h-[262px] reveal"
              style={{ animationDelay: `${100 + i * 90}ms` }}
              data-testid={`hero-cat-${c.slug}`}
            >
              <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-5 text-white">
                <h3 className="font-display text-2xl tracking-tight">{c.name}</h3>
                <p className="text-[11px] text-white/70 mt-1">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* trust strip */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          [Truck, "Free ship ₹999+"],
          [RotateCcw, "7-day returns"],
          [ShieldCheck, "GST invoice"],
        ].map(([Icon, label]) => (
          <div key={label} className="bg-card border border-border rounded-md py-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
            <Icon size={16} className="text-accent" /> {label}
          </div>
        ))}
      </section>

      {/* categories */}
      <Section title="Shop by category" overline="Categories" testid="categories-section">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cats.map((c) => (
            <Link key={c.slug} to={`/c/${c.slug}`} className="group bg-card border border-border rounded-md overflow-hidden card-lift" data-testid={`cat-tile-${c.slug}`}>
              <div className="aspect-square zoom-wrap bg-secondary">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg">{c.name}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* flash sale */}
      {flash.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 lg:px-8 mt-24" data-testid="flash-sale-section">
          <div className="bg-accent text-accent-foreground rounded-md p-6 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="overline !text-accent-foreground/70 flex items-center gap-2"><Zap size={13} /> Flash Sale</p>
                <h2 className="font-display text-3xl sm:text-4xl tracking-tighter mt-2">Up to 55% off, today only</h2>
              </div>
              {cd && (
                <div className="flex gap-2 font-mono-num" data-testid="flash-countdown">
                  {[["HRS", cd.h], ["MIN", cd.m], ["SEC", cd.s]].map(([l, v]) => (
                    <div key={l} className="bg-primary text-primary-foreground rounded-sm px-3 py-2 text-center min-w-[58px]">
                      <div className="text-lg leading-none">{v}</div>
                      <div className="text-[9px] tracking-widest opacity-70 mt-1">{l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {flash.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* new arrivals — horizontal scroll */}
      <Section title="New arrivals" overline="Just landed" testid="new-arrivals-section" link="/c/watches">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-[240px] shrink-0"><CardSkeleton /></div>)
            : newest.map((p) => <ProductCard key={p.id} p={p} wide />)}
        </div>
      </Section>

      {/* bestsellers */}
      <Section title="Bestsellers" overline="Most loved" testid="bestsellers-section">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />) : best.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </Section>

      {/* reviews */}
      <Section title="What customers say" overline="Reviews" testid="reviews-section">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-md p-6" data-testid={`review-${r.id}`}>
              <div className="flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={13} className="fill-accent text-accent" />)}
              </div>
              <p className="font-display text-lg mt-4">{r.title}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.body}</p>
              <p className="overline mt-5 text-[10px]">{r.name} · {r.city}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const Section = ({ title, overline, children, testid, link }) => (
  <section className="max-w-7xl mx-auto px-4 lg:px-8 mt-24" data-testid={testid}>
    <div className="flex items-end justify-between gap-4 mb-8">
      <div>
        <p className="overline">{overline}</p>
        <h2 className="font-display text-3xl sm:text-4xl tracking-tighter mt-2">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-xs uppercase tracking-widest border-b border-primary pb-1 hover:text-accent hover:border-accent transition-colors">
          View all
        </Link>
      )}
    </div>
    {children}
  </section>
);

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Star, Heart, Share2, Truck, RotateCcw, ShieldCheck, Check } from "lucide-react";
import { api, inr, apiError } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Pagination } from "swiper/modules";
import "swiper/css/pagination";

export default function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add } = useCart();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [active, setActive] = useState(0);
  const [variant, setVariant] = useState({});
  const [pin, setPin] = useState("");
  const [pinRes, setPinRes] = useState(null);
  const [pinErr, setPinErr] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/products/${id}`).then((r) => {
      setP(r.data);
      const v = {};
      Object.entries(r.data.attributes || {}).forEach(([k, vals]) => { v[k] = vals[0]; });
      setVariant(v);
      setActive(0);
    }).catch(() => toast.error("Product not found"));
  }, [id]);

  const checkPin = async () => {
    setPinErr(""); setPinRes(null);
    try {
      const { data } = await api.get(`/pincode/${pin}`);
      setPinRes(data);
    } catch (e) {
      setPinErr(apiError(e));
    }
  };

  const wish = async () => {
    if (!user) return nav("/login");
    try {
      const { data } = await api.post(`/wishlist/${id}`);
      toast.success(data.added ? "Added to wishlist" : "Removed from wishlist");
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const shareProduct = async () => {
  const shareData = {
    title: p.title,
    text: `Check out this product on INFYKRAQ: ${p.title}`,
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied!");
    }
  } catch (e) {
    if (e?.name !== "AbortError") {
      toast.error("Unable to share product");
    }
  }
};

  if (!p) return <div className="max-w-7xl mx-auto px-4 py-24 animate-pulse grid lg:grid-cols-2 gap-10"><div className="aspect-square bg-secondary rounded-md" /><div className="space-y-4"><div className="h-8 bg-secondary w-2/3" /><div className="h-4 bg-secondary w-1/3" /></div></div>;

  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-28 lg:pb-10" data-testid="product-page">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        {/* gallery */}
<div className="lg:sticky lg:top-32 lg:self-start">
  <div className="relative">
    <Swiper
      spaceBetween={10}
      slidesPerView={1}
      pagination={{ clickable: true }}
      modules={[Pagination]}
      onSlideChange={(swiper) => setActive(swiper.activeIndex)}
      className="w-full aspect-square rounded-md overflow-hidden border border-border bg-card"
    >
      {(p.images || []).map((src, i) => (
        <SwiperSlide key={src}>
          <img
            src={src}
            alt={`${p.title} ${i + 1}`}
            className="w-full h-full object-cover"
          />
        </SwiperSlide>
      ))}
    </Swiper>

    {/* Share button */}
    <button
      type="button"
      onClick={shareProduct}
      aria-label="Share product"
      className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition"
    >
      <Share2 size={18} />
    </button>
  </div>

  <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
    {(p.images || []).map((src, i) => (
      <button
        key={src}
        onClick={() => setActive(i)}
        className={`w-20 h-20 shrink-0 rounded-sm overflow-hidden border-2 transition-colors ${
          active === i
            ? "border-primary"
            : "border-transparent opacity-70 hover:opacity-100"
        }`}
        data-testid={`thumb-${i}`}
      >
        <img src={src} alt="" className="w-full h-full object-cover" />
      </button>
    ))}
  </div>
  </div>

{/* info */}
        <div>
          <p className="overline">{p.brand} · {p.category}</p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tighter mt-3" data-testid="product-title">{p.title}</h1>
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Star size={14} className="fill-accent text-accent" /> {p.rating} · {p.reviews_count} reviews
          </div>

          <div className="flex items-end gap-3 mt-6" data-testid="price-section">
            <span className="font-mono-num text-3xl font-semibold">{inr(p.price)}</span>
            {off > 0 && <span className="text-muted-foreground line-through font-mono-num">{inr(p.mrp)}</span>}
            {off > 0 && <span className="text-accent-foreground bg-accent text-xs px-2 py-1 rounded-sm">{off}% OFF</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Inclusive of all taxes (GST invoice provided)</p>

          {/* dynamic attributes */}
          <div className="mt-8 space-y-6">
            {Object.entries(p.attributes || {}).map(([key, vals]) => (
              <div key={key} data-testid={`attr-${key}`}>
                <p className="overline mb-3">{key}</p>
                <div className="flex flex-wrap gap-2">
                  {vals.map((v) => (
                    <button
                      key={v}
                      onClick={() => setVariant((s) => ({ ...s, [key]: v }))}
                      className={`min-w-[44px] h-11 px-4 text-sm border rounded-sm transition-colors ${variant[key] === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}
                      data-testid={`attr-opt-${key}-${v}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* pincode */}
          <div className="mt-8 border border-border rounded-md p-4 bg-card">
            <p className="overline mb-3">Delivery & availability</p>
            <div className="flex gap-2">
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit pincode"
                className="field-line h-11"
                data-testid="pincode-input"
              />
              <Button onClick={checkPin} variant="outline" className="h-11 rounded-sm text-xs tracking-widest" data-testid="pincode-check-btn">
                CHECK
              </Button>
            </div>
            {pinRes && (
              <p className="text-sm text-emerald-700 mt-3 flex items-center gap-2" data-testid="pincode-success">
                <Check size={15} /> Delivery by {pinRes.eta} · {pinRes.cod_available ? "COD available" : "Prepaid only"}
              </p>
            )}
            {pinErr && <p className="text-sm text-destructive mt-3" data-testid="pincode-error">{pinErr}</p>}
          </div>

          {/* actions */}
          <div className="hidden lg:flex gap-3 mt-8">
            <Button onClick={() => add(p, 1, variant)} variant="outline" className="h-12 flex-1 rounded-sm text-xs tracking-widest" data-testid="add-to-cart-btn">
              ADD TO BAG
            </Button>
            <Button onClick={() => { add(p, 1, variant); nav("/cart"); }} className="btn-emerald h-12 flex-1 text-xs tracking-widest" data-testid="buy-now-btn">
              BUY NOW
            </Button>
            <Button onClick={wish} variant="outline" className="h-12 w-12 rounded-sm p-0" data-testid="wishlist-btn">
              <Heart size={17} />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8 text-center text-xs">
            {[[Truck, "Fast delivery"], [RotateCcw, "7-day return"], [ShieldCheck, "1:1 support"]].map(([Icon, l]) => (
              <div key={l} className="border border-border rounded-md py-3 bg-card flex flex-col items-center gap-1.5">
                <Icon size={15} className="text-accent" /> {l}
              </div>
            ))}
          </div>

          <Accordion type="single" collapsible className="mt-8" defaultValue="desc">
            <AccordionItem value="desc">
              <AccordionTrigger className="text-sm">Product description</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{p.description}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="specs">
              <AccordionTrigger className="text-sm">Specifications</AccordionTrigger>
              <AccordionContent>
                <dl className="text-sm space-y-2">
                  {Object.entries(p.specs || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">{k}</dt><dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ret">
              <AccordionTrigger className="text-sm">Return & refund policy</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                7-day easy return from delivery date for unused products with original packaging.
                Refunds are processed to the original payment method within 5-7 business days.
                COD orders are refunded to your bank account after pickup verification.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {p.reviews?.length > 0 && (
        <section className="mt-20" data-testid="pdp-reviews">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tighter">Customer reviews</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {p.reviews.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-md p-5">
                <div className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} className="fill-accent text-accent" />)}</div>
                <p className="font-display text-lg mt-3">{r.title}</p>
                <p className="text-sm text-muted-foreground mt-1.5">{r.body}</p>
                <p className="overline text-[10px] mt-4">{r.name} · {r.city}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.related?.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tighter">You may also like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {p.related.map((rp) => <ProductCard key={rp.id} p={rp} />)}
          </div>
        </section>
      )}

      {/* mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border p-3 flex gap-2">
        <Button onClick={wish} variant="outline" className="h-12 w-12 rounded-sm p-0 shrink-0" data-testid="wishlist-btn-mobile">
          <Heart size={17} />
        </Button>
        <Button onClick={() => add(p, 1, variant)} variant="outline" className="h-12 flex-1 rounded-sm text-xs tracking-widest" data-testid="add-to-cart-btn-mobile">
          ADD TO BAG
        </Button>
        <Button onClick={() => { add(p, 1, variant); nav("/cart"); }} className="btn-emerald h-12 flex-1 text-xs tracking-widest" data-testid="buy-now-btn-mobile">
          BUY NOW
        </Button>
      </div>
    </div>
  );
}

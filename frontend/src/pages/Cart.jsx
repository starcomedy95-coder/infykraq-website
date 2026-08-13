import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Minus, Plus, Trash2, Tag } from "lucide-react";
import { api, inr, apiError } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Totals = ({ t, payment }) => (
  <div className="space-y-3 text-sm" data-testid="order-summary">
    <Row label="Subtotal" value={inr(t.subtotal)} />
    {t.discount > 0 && <Row label={`Coupon (${t.coupon})`} value={`- ${inr(t.discount)}`} accent />}
    <Row label="Shipping" value={t.shipping === 0 ? "FREE" : inr(t.shipping)} />
    {t.cod_fee > 0 && <Row label="COD handling" value={inr(t.cod_fee)} />}
    <Row label="GST included (18%)" value={inr(t.gst)} muted />
    <div className="border-t border-border pt-3 flex justify-between font-semibold text-base">
      <span>Total {payment === "cod" ? "payable on delivery" : "payable"}</span>
      <span className="font-mono-num" data-testid="cart-total">{inr(t.total)}</span>
    </div>
  </div>
);

const Row = ({ label, value, accent, muted }) => (
  <div className={`flex justify-between ${muted ? "text-muted-foreground text-xs" : ""}`}>
    <span>{label}</span>
    <span className={`font-mono-num ${accent ? "text-emerald-700" : ""}`}>{value}</span>
  </div>
);

export default function Cart() {
  const { items, setQty, remove, payload } = useCart();
  const [coupon, setCoupon] = useState(localStorage.getItem("infykraq_coupon") || "");
  const [applied, setApplied] = useState(localStorage.getItem("infykraq_coupon") || "");
  const [t, setT] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const nav = useNavigate();

  const quote = useCallback(async (code) => {
    if (!items.length) return setT(null);
    try {
      const { data } = await api.post("/cart/quote", { items: payload, coupon_code: code || null, payment_method: "online" });
      setT(data);
      setApplied(code || "");
      localStorage.setItem("infykraq_coupon", code || "");
    } catch (e) {
      toast.error(apiError(e));
      const { data } = await api.post("/cart/quote", { items: payload, coupon_code: null, payment_method: "online" });
      setT(data);
      setApplied("");
      localStorage.setItem("infykraq_coupon", "");
    }
  }, [items, payload]);

  useEffect(() => { quote(applied); /* eslint-disable-next-line */ }, [items.length, JSON.stringify(items)]);
  useEffect(() => { api.get("/coupons").then((r) => setCoupons(r.data)).catch(() => {}); }, []);

  if (!items.length)
    return (
      <div className="max-w-3xl mx-auto px-4 py-28 text-center" data-testid="empty-cart">
        <h1 className="font-display text-4xl tracking-tighter">Your bag is empty</h1>
        <p className="text-muted-foreground mt-3 text-sm">Discover premium picks across footwear, watches and electronics.</p>
        <Button asChild className="btn-emerald h-12 px-8 mt-8 text-xs tracking-widest"><Link to="/">START SHOPPING</Link></Button>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10" data-testid="cart-page">
      <p className="overline">Bag</p>
      <h1 className="font-display text-4xl tracking-tighter mt-2">Shopping bag ({items.length})</h1>

      <div className="grid lg:grid-cols-3 gap-8 mt-10">
        <div className="lg:col-span-2 space-y-4">
          {items.map((it, i) => (
            <div key={i} className="flex gap-4 bg-card border border-border rounded-md p-4" data-testid={`cart-item-${it.product_id}`}>
              <Link to={`/p/${it.product_id}`} className="w-24 h-28 shrink-0 rounded-sm overflow-hidden bg-secondary">
                <img src={it.image} alt={it.title} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg leading-snug">{it.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.entries(it.variant || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "Standard"}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-border rounded-sm">
                    <button onClick={() => setQty(i, it.qty - 1)} className="w-9 h-9 grid place-items-center hover:bg-secondary" data-testid={`qty-dec-${it.product_id}`}><Minus size={14} /></button>
                    <span className="w-9 text-center font-mono-num text-sm" data-testid={`qty-${it.product_id}`}>{it.qty}</span>
                    <button onClick={() => setQty(i, it.qty + 1)} className="w-9 h-9 grid place-items-center hover:bg-secondary" data-testid={`qty-inc-${it.product_id}`}><Plus size={14} /></button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono-num font-semibold">{inr(it.price * it.qty)}</span>
                    <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive transition-colors" data-testid={`remove-${it.product_id}`}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start space-y-4">
          <div className="bg-card border border-border rounded-md p-5">
            <p className="overline mb-4">Coupon</p>
            <div className="flex gap-2">
              <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Enter code" className="field-line h-11" data-testid="coupon-input" />
              <Button onClick={() => quote(coupon)} variant="outline" className="h-11 rounded-sm text-xs tracking-widest" data-testid="apply-coupon-btn">APPLY</Button>
            </div>
            {applied && <p className="text-xs text-emerald-700 mt-3" data-testid="coupon-applied">{applied} applied successfully</p>}
            <div className="mt-4 space-y-2">
              {coupons.map((c) => (
                <button key={c.code} onClick={() => { setCoupon(c.code); quote(c.code); }} className="w-full text-left text-xs flex items-start gap-2 p-2.5 border border-dashed border-border rounded-sm hover:border-primary transition-colors" data-testid={`coupon-suggest-${c.code}`}>
                  <Tag size={13} className="mt-0.5 text-accent" />
                  <span><b className="font-mono-num">{c.code}</b> — {c.description}</span>
                </button>
              ))}
            </div>
          </div>

          {t && (
            <div className="bg-card border border-border rounded-md p-5">
              <p className="overline mb-4">Summary</p>
              <Totals t={t} payment="online" />
              <Button onClick={() => nav("/checkout")} className="btn-emerald w-full h-12 mt-6 text-xs tracking-widest" data-testid="checkout-btn">
                PROCEED TO CHECKOUT
              </Button>
              {t.shipping > 0 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Add {inr(t.free_ship_above - (t.subtotal - t.discount))} more for free shipping
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

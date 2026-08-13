import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Package, Truck, Home as HomeIcon, Download } from "lucide-react";
import { api, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";

const STEPS = [["confirmed", CheckCircle2], ["packed", Package], ["shipped", Truck], ["delivered", HomeIcon]];

export default function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setO(r.data)).catch(() => {});
  }, [id]);

  if (!o) return <div className="max-w-3xl mx-auto px-4 py-24 text-center text-muted-foreground">Loading order…</div>;

  const idx = STEPS.findIndex(([s]) => s === o.status);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-12" data-testid="order-page">
      <div className="text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-700" />
        <h1 className="font-display text-4xl tracking-tighter mt-5">Order confirmed</h1>
        <p className="text-sm text-muted-foreground mt-3">
          Order ID <b className="font-mono-num text-foreground" data-testid="order-no">{o.order_no}</b> ·{" "}
          {o.payment_method === "cod" ? "Cash on Delivery" : "Paid online (DEMO)"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Confirmation sent to {o.email} (email/WhatsApp notifications are MOCKED)</p>
      </div>

      <div className="flex items-center justify-between mt-12" data-testid="order-timeline">
        {STEPS.map(([s, Icon], i) => (
          <div key={s} className="flex-1 flex flex-col items-center relative">
            {i > 0 && <div className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= idx ? "bg-primary" : "bg-border"}`} />}
            <div className={`relative w-8 h-8 rounded-full grid place-items-center ${i <= idx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <Icon size={15} />
            </div>
            <span className="text-[10px] uppercase tracking-widest mt-2">{s}</span>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-md p-6 mt-12">
        <p className="overline mb-5">Items</p>
        {o.items.map((it) => (
          <div key={it.product_id + JSON.stringify(it.variant)} className="flex gap-3 items-center py-3 border-b border-border/60 last:border-0">
            <img src={it.image} alt="" className="w-12 h-14 object-cover rounded-sm bg-secondary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{it.title}</p>
              <p className="text-xs text-muted-foreground">Qty {it.qty} · {Object.values(it.variant || {}).join(", ")}</p>
            </div>
            <span className="text-sm font-mono-num">{inr(it.amount)}</span>
          </div>
        ))}
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="font-mono-num">{inr(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount ({o.coupon})</span><span className="font-mono-num">- {inr(o.discount)}</span></div>}
          <div className="flex justify-between"><span>Shipping</span><span className="font-mono-num">{o.shipping === 0 ? "FREE" : inr(o.shipping)}</span></div>
          {o.cod_fee > 0 && <div className="flex justify-between"><span>COD fee</span><span className="font-mono-num">{inr(o.cod_fee)}</span></div>}
          <div className="flex justify-between text-xs text-muted-foreground"><span>GST included</span><span className="font-mono-num">{inr(o.gst)}</span></div>
          <div className="flex justify-between font-semibold text-base border-t border-border pt-3"><span>Total</span><span className="font-mono-num">{inr(o.total)}</span></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md p-6 mt-4 text-sm">
        <p className="overline mb-4">Shipping to</p>
        <p>{o.address.full_name} · {o.address.phone}</p>
        <p className="text-muted-foreground mt-1">
          {o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}, {o.address.city}, {o.address.state} - {o.address.pincode}
        </p>
      </div>

      <div className="flex gap-3 mt-6 mb-4">
        <Button onClick={() => window.print()} variant="outline" className="h-11 rounded-sm text-xs tracking-widest flex-1" data-testid="invoice-btn">
          <Download size={14} className="mr-2" /> INVOICE PDF
        </Button>
        <Button asChild className="btn-emerald h-11 text-xs tracking-widest flex-1"><Link to="/account">MY ORDERS</Link></Button>
      </div>
    </div>
  );
}

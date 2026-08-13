import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Package, Truck, Home as HomeIcon, Download, XCircle } from "lucide-react";
import { api, inr, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STEPS = [["confirmed", CheckCircle2], ["packed", Package], ["shipped", Truck], ["delivered", HomeIcon]];
const CANCELLABLE = ["confirmed", "packed"];

export default function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setO(r.data)).catch(() => {});
  }, [id]);

  const cancel = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${id}/cancel`);
      setO(data);
      toast.success("Order cancelled. Any paid amount will be refunded in 5-7 days.");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!o) return <div className="max-w-3xl mx-auto px-4 py-24 text-center text-muted-foreground">Loading order…</div>;

  const cancelled = o.status === "cancelled";
  const canCancel = CANCELLABLE.includes(o.status);
  const idx = STEPS.findIndex(([s]) => s === o.status);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-12" data-testid="order-page">
      <div className="text-center">
        {cancelled ? <XCircle size={40} className="mx-auto text-destructive" /> : <CheckCircle2 size={40} className="mx-auto text-emerald-700" />}
        <h1 className="font-display text-4xl tracking-tighter mt-5" data-testid="order-heading">
          {cancelled ? "Order cancelled" : "Order confirmed"}
        </h1>
        <p className="text-sm text-muted-foreground mt-3">
          Order ID <b className="font-mono-num text-foreground" data-testid="order-no">{o.order_no}</b> ·{" "}
          {o.payment_method === "cod" ? "Cash on Delivery" : "Paid online"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {cancelled
            ? o.payment_status === "refund_pending"
              ? "Refund initiated — it reaches your account in 5-7 business days."
              : "No amount was charged for this order."
            : `Confirmation sent to ${o.email} (email/WhatsApp notifications are MOCKED)`}
        </p>
      </div>

      {cancelled ? (
        <div className="mt-10 border border-destructive/30 bg-destructive/5 rounded-md p-5 text-center text-sm" data-testid="cancelled-banner">
          This order was cancelled{o.cancelled_by === "admin" ? " by the store" : " by you"} and will not be delivered.
        </div>
      ) : (
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
      )}

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

      <div className="flex flex-wrap gap-3 mt-6 mb-4">
        <Button onClick={() => window.print()} variant="outline" className="h-11 rounded-sm text-xs tracking-widest flex-1" data-testid="invoice-btn">
          <Download size={14} className="mr-2" /> INVOICE PDF
        </Button>
        <Button asChild className="btn-emerald h-11 text-xs tracking-widest flex-1"><Link to="/account">MY ORDERS</Link></Button>
      </div>

      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={busy} className="w-full h-11 rounded-sm text-xs tracking-widest text-destructive border-destructive/40 hover:bg-destructive/5 mb-4" data-testid="cancel-order-btn">
              <XCircle size={14} className="mr-2" /> CANCEL THIS ORDER
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="cancel-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl tracking-tight">Cancel order {o.order_no}?</AlertDialogTitle>
              <AlertDialogDescription>
                You can cancel until the order is dispatched. Once shipped, cancellation is not possible — you can
                refuse delivery or request a return instead.
                {o.payment_status === "paid" && " Your payment will be refunded within 5-7 business days."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-dialog-close">KEEP ORDER</AlertDialogCancel>
              <AlertDialogAction onClick={cancel} className="bg-destructive hover:bg-destructive/90" data-testid="cancel-dialog-confirm">
                YES, CANCEL ORDER
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {!cancelled && !canCancel && (
        <p className="text-xs text-muted-foreground text-center mb-6" data-testid="cancel-not-allowed-note">
          This order has been dispatched, so it can no longer be cancelled. You may refuse delivery or request a return within 7 days.
        </p>
      )}
    </div>
  );
}

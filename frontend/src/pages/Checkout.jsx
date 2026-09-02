import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreditCard, Banknote, Lock } from "lucide-react";
import { api, inr, apiError } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Totals } from "@/pages/Cart";
import { loadRazorpay } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Checkout() {
  const { items, payload, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [method, setMethod] = useState("online");
  const [t, setT] = useState(null);
  const [busy, setBusy] = useState(false);
  const coupon = localStorage.getItem("infykraq_coupon") || "";
  const [payCfg, setPayCfg] = useState({ configured: true });
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", line1: "", line2: "", city: "", state: "", pincode: "",
  });

  useEffect(() => {
    api.get("/payments/config").then((r) => {
      setPayCfg(r.data);
      if (!r.data.configured) setMethod("cod");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, full_name: f.full_name || user.name, email: f.email || user.email, phone: f.phone || user.phone }));
  }, [user]);

  const quote = useCallback(async () => {
    if (!items.length) return;
    try {
      const { data } = await api.post("/cart/quote", { items: payload, coupon_code: coupon || null, payment_method: method });
      setT(data);
    } catch {
      const { data } = await api.post("/cart/quote", { items: payload, coupon_code: null, payment_method: method });
      setT(data);
    }
  }, [items, payload, method, coupon]);

  useEffect(() => { quote(); }, [quote]);

  useEffect(() => {
  if (!items.length && window.location.pathname === "/checkout") {
    nav("/cart");
  }
}, [items.length, nav]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("Please login to place your order"); return nav("/login?next=/checkout"); }
    setBusy(true);
    const body = { items: payload, address: form, coupon_code: coupon || null, payment_method: method };
    try {
      if (method === "cod") {
        const { data } = await api.post("/orders", body);
        finishOrder(data);
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection.");
      const { data: rz } = await api.post("/payments/razorpay/order", body);
      const rzp = new window.Razorpay({
        key: rz.key_id,
        amount: rz.amount,
        currency: rz.currency,
        order_id: rz.razorpay_order_id,
        name: "INFYKRAQ",
        description: `Order ${rz.order_no}`,
        prefill: rz.prefill,
        theme: { color: "#022C22" },
        handler: async (res) => {
          try {
            const { data } = await api.post("/payments/razorpay/verify", {
              order_id: rz.order_id,
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            finishOrder(data);
          } catch (err) {
            toast.error(apiError(err));
            setBusy(false);
          }
        },
        modal: {
          ondismiss: async () => {
            await api.post(`/payments/razorpay/cancel/${rz.order_id}`).catch(() => {});
            toast.error("Payment cancelled");
            setBusy(false);
          },
        },
      });
      rzp.on("payment.failed", () => { toast.error("Payment failed. Please try again."); setBusy(false); });
      rzp.open();
    } catch (err) {
      toast.error(apiError(err));
      setBusy(false);
    }
  };

const finishOrder = (order) => {
  clear();
  localStorage.setItem("infykraq_coupon", "");
  toast.success(`Order ${order.order_no} placed!`);
  nav("/thank-you");
};

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10" data-testid="checkout-page">
      <p className="overline">Secure checkout</p>
      <h1 className="font-display text-4xl tracking-tighter mt-2">Checkout</h1>

      <form onSubmit={placeOrder} className="grid lg:grid-cols-3 gap-8 mt-10">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card border border-border rounded-md p-6">
            <p className="overline mb-6">1 · Contact details</p>
            <div className="grid sm:grid-cols-2 gap-6">
              <Field label="Full name" value={form.full_name} onChange={set("full_name")} testid="input-name" required />
              <Field label="Phone" value={form.phone} onChange={set("phone")} testid="input-phone" required />
              <Field label="Email" type="email" value={form.email} onChange={set("email")} testid="input-email" required />
            </div>
          </section>

          <section className="bg-card border border-border rounded-md p-6">
            <p className="overline mb-6">2 · Shipping address</p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2"><Field label="Address line 1" value={form.line1} onChange={set("line1")} testid="input-line1" required /></div>
              <div className="sm:col-span-2"><Field label="Landmark (optional)" value={form.line2} onChange={set("line2")} testid="input-line2" /></div>
              <Field label="City" value={form.city} onChange={set("city")} testid="input-city" required />
              <Field label="State" value={form.state} onChange={set("state")} testid="input-state" required />
              <Field label="Pincode" value={form.pincode} onChange={set("pincode")} testid="input-pincode" required />
            </div>
          </section>

          <section className="bg-card border border-border rounded-md p-6">
            <p className="overline mb-6">3 · Payment method</p>
            <div className="space-y-3">
              <PayOption
                active={method === "online"} onClick={() => payCfg.configured && setMethod("online")} icon={CreditCard}
                title="Pay online — UPI / Card / Netbanking / Wallet"
                desc={payCfg.configured
                  ? "Secure payment via Razorpay. You'll pay before the order is confirmed."
                  : "Unavailable — Razorpay keys are not configured yet. Please use COD."}
                disabled={!payCfg.configured}
                testid="pay-online"
              />
              <PayOption
                active={method === "cod"} onClick={() => setMethod("cod")} icon={Banknote}
                title="Cash on Delivery"
               desc="No extra COD charges. Pay at your doorstep."
                testid="pay-cod"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-6 flex items-center gap-2"><Lock size={13} /> SSL secured · your data is encrypted</p>
          </section>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start space-y-4">
          <div className="bg-card border border-border rounded-md p-5">
            <p className="overline mb-4">Order summary</p>
            <div className="space-y-3 mb-5">
              {items.map((it, i) => (
                <div key={`${it.product_id}-${JSON.stringify(it.variant)}`} className="flex gap-3 items-center">
                  <img src={it.image} alt="" className="w-12 h-14 object-cover rounded-sm bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{it.title}</p>
                    <p className="text-xs text-muted-foreground">Qty {it.qty}</p>
                  </div>
                  <span className="text-sm font-mono-num">{inr(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
            {t && <Totals t={t} payment={method} />}
            <Button type="submit" disabled={busy} className="btn-emerald w-full h-12 mt-6 text-xs tracking-widest" data-testid="place-order-btn">
              {busy ? "PROCESSING..." : method === "cod" ? "PLACE COD ORDER" : `PAY ${t ? inr(t.total) : ""} SECURELY`}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

const Field = ({ label, testid, ...rest }) => (
  <div>
    <Label className="overline">{label}</Label>
    <Input {...rest} className="field-line h-11 mt-2" data-testid={testid} />
  </div>
);

const PayOption = ({ active, onClick, icon: Icon, title, desc, testid, disabled }) => (
  <button
    type="button" onClick={onClick} data-testid={testid} disabled={disabled}
    className={`w-full text-left flex gap-4 p-4 border rounded-sm transition-colors ${disabled ? "border-border opacity-50 cursor-not-allowed" : active ? "border-primary bg-secondary" : "border-border hover:border-primary"}`}
  >
    <Icon size={18} className="mt-0.5 text-accent shrink-0" />
    <span>
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-xs text-muted-foreground mt-1">{desc}</span>
    </span>
  </button>
);

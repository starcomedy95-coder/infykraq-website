import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Account() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders").then((r) => setOrders(r.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-12" data-testid="account-page">
      <p className="overline">My account</p>
      <h1 className="font-display text-4xl tracking-tighter mt-2">{user?.name}</h1>
      <p className="text-sm text-muted-foreground mt-2">{user?.email} · {user?.phone || "no phone"}</p>

      <h2 className="font-display text-2xl tracking-tighter mt-14">Orders ({orders.length})</h2>
      <div className="space-y-3 mt-6">
        {orders.map((o) => (
          <Link key={o.id} to={`/order/${o.id}`} className="block bg-card border border-border rounded-md p-5 card-lift" data-testid={`order-row-${o.order_no}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono-num text-sm">{o.order_no}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(o.created_at).toLocaleDateString("en-IN")} · {o.items.length} item(s) · {o.payment_method.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono-num font-semibold">{inr(o.total)}</p>
                <span className="text-[10px] uppercase tracking-widest bg-secondary px-2 py-1 rounded-sm inline-block mt-1">{o.status}</span>
              </div>
            </div>
          </Link>
        ))}
        {orders.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center" data-testid="no-orders">No orders yet.</p>}
      </div>
    </div>
  );
}

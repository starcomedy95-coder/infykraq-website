import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, inr, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES = ["confirmed", "packed", "shipped", "delivered", "cancelled"];
const EMPTY = {
  title: "", category: "footwear", brand: "INFYKRAQ", price: 999, mrp: 1999, stock: 10,
  images: "", description: "", attributes: "Size: 7, 8, 9\nColor: Black, Tan", specs: "Warranty: 1 Year", tags: "new",
};

export default function Admin() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [gst, setGst] = useState([]);
  const [settings, setSettings] = useState({ brand_name: "", phone: "", email: "", address: "", announcement: "" });
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [coupon, setCoupon] = useState({ code: "", type: "percent", value: 10, min_order: 0, description: "" });

  const loadAll = () => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/orders").then((r) => setOrders(r.data)).catch(() => {});
    api.get("/admin/products").then((r) => setProducts(r.data)).catch(() => {});
    api.get("/admin/coupons").then((r) => setCoupons(r.data)).catch(() => {});
    api.get("/admin/customers").then((r) => setCustomers(r.data)).catch(() => {});
    api.get("/admin/gst-report").then((r) => setGst(r.data)).catch(() => {});
    api.get("/settings").then((r) => setSettings((s) => ({ ...s, ...r.data }))).catch(() => {});
  };

  useEffect(() => { if (user?.role === "admin") loadAll(); }, [user]);

  if (loading) return <div className="p-24 text-center text-muted-foreground">Loading…</div>;
  if (user?.role !== "admin")
    return <div className="p-24 text-center" data-testid="admin-denied"><h1 className="font-display text-3xl">Admin access required</h1></div>;

  const parseKV = (txt, list) =>
    Object.fromEntries(
      txt.split("\n").map((l) => l.split(":")).filter((a) => a.length >= 2)
        .map(([k, v]) => [k.trim(), list ? v.split(",").map((x) => x.trim()).filter(Boolean) : v.trim()])
    );

  const submitProduct = async (e) => {
    e.preventDefault();
    const body = {
      title: form.title, category: form.category, brand: form.brand,
      price: Number(form.price), mrp: Number(form.mrp), stock: Number(form.stock),
      images: form.images.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
      description: form.description,
      attributes: parseKV(form.attributes, true),
      specs: parseKV(form.specs, false),
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editId) await api.put(`/admin/products/${editId}`, body);
      else await api.post("/admin/products", body);
      toast.success(editId ? "Product updated" : "Product created");
      setForm(EMPTY); setEditId(null); loadAll();
    } catch (err) { toast.error(apiError(err)); }
  };

  const editProduct = (p) => {
    setEditId(p.id);
    setForm({
      ...p, images: (p.images || []).join("\n"), tags: (p.tags || []).join(", "),
      attributes: Object.entries(p.attributes || {}).map(([k, v]) => `${k}: ${v.join(", ")}`).join("\n"),
      specs: Object.entries(p.specs || {}).map(([k, v]) => `${k}: ${v}`).join("\n"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id) => {
    await api.delete(`/admin/products/${id}`);
    toast.success("Product deleted"); loadAll();
  };

  const setStatus = async (id, status) => {
    try { await api.put(`/admin/orders/${id}/status`, { status }); toast.success(`Marked ${status}`); loadAll(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const saveCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/coupons", { ...coupon, value: Number(coupon.value), min_order: Number(coupon.min_order), active: true });
      toast.success("Coupon saved"); setCoupon({ code: "", type: "percent", value: 10, min_order: 0, description: "" }); loadAll();
    } catch (err) { toast.error(apiError(err)); }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put("/admin/settings", {
        brand_name: settings.brand_name, phone: settings.phone, email: settings.email,
        address: settings.address, announcement: settings.announcement, flash_sale_ends: settings.flash_sale_ends,
      });
      toast.success("Settings saved");
    } catch (err) { toast.error(apiError(err)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10" data-testid="admin-page">
      <p className="overline">Admin</p>
      <h1 className="font-display text-4xl tracking-tighter mt-2">Control room</h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-8" data-testid="admin-stats">
          <Stat label="Revenue" value={inr(stats.revenue)} />
          <Stat label="Orders" value={stats.orders} />
          <Stat label="GST collected" value={inr(stats.gst_collected)} />
          <Stat label="Customers" value={stats.customers} />
          <Stat label="Products" value={stats.products} />
        </div>
      )}

      <Tabs defaultValue="orders" className="mt-10">
        <TabsList className="flex flex-wrap h-auto">
          {["orders", "products", "inventory", "coupons", "customers", "gst", "settings"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize text-xs" data-testid={`tab-${t}`}>{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="orders" className="mt-6 space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-md p-4" data-testid={`admin-order-${o.order_no}`}>
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div>
                  <p className="font-mono-num text-sm">{o.order_no}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {o.address.full_name} · {o.address.city} · {o.payment_method.toUpperCase()} · {inr(o.total)}
                  </p>
                </div>
                <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                  <SelectTrigger className="w-40 h-9 text-xs" data-testid={`order-status-${o.order_no}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center">No orders yet.</p>}
        </TabsContent>

        <TabsContent value="products" className="mt-6 grid lg:grid-cols-2 gap-8">
          <form onSubmit={submitProduct} className="bg-card border border-border rounded-md p-6 space-y-5" data-testid="product-form">
            <p className="overline">{editId ? "Edit product" : "Add product"}</p>
            <F label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} testid="pf-title" required />
            <div>
              <Label className="overline">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-2 h-11" data-testid="pf-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["footwear", "watches", "electronics", "accessories"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <F label="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} testid="pf-price" />
              <F label="MRP" type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} testid="pf-mrp" />
              <F label="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} testid="pf-stock" />
            </div>
            <TA label="Image URLs (one per line)" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} testid="pf-images" />
            <TA label="Dynamic attributes (Key: v1, v2)" value={form.attributes} onChange={(e) => setForm({ ...form, attributes: e.target.value })} testid="pf-attributes" />
            <TA label="Specs (Key: value)" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} testid="pf-specs" />
            <F label="Tags (new, bestseller, flash)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} testid="pf-tags" />
            <TA label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} testid="pf-description" />
            <div className="flex gap-3">
              <Button type="submit" className="btn-emerald h-11 flex-1 text-xs tracking-widest" data-testid="pf-submit">
                {editId ? "UPDATE PRODUCT" : "CREATE PRODUCT"}
              </Button>
              {editId && <Button type="button" variant="outline" className="h-11 rounded-sm text-xs" onClick={() => { setEditId(null); setForm(EMPTY); }}>CANCEL</Button>}
            </div>
          </form>

          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-md p-3 flex gap-3 items-center" data-testid={`admin-product-${p.id}`}>
                <img src={p.images?.[0]} alt="" className="w-12 h-14 object-cover rounded-sm bg-secondary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.category} · {inr(p.price)} · stock {p.stock}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-8 rounded-sm" onClick={() => editProduct(p)} data-testid={`edit-${p.id}`}>EDIT</Button>
                <Button size="sm" variant="outline" className="text-xs h-8 rounded-sm text-destructive" onClick={() => del(p.id)} data-testid={`delete-${p.id}`}>DEL</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <div className="bg-card border border-border rounded-md p-6" data-testid="inventory-panel">
            <p className="overline mb-4">Low stock alerts (&lt; 5 units)</p>
            {(stats?.low_stock || []).map((p) => (
              <div key={p.id} className="flex justify-between text-sm py-2 border-b border-border/60 last:border-0">
                <span>{p.title}</span><span className="font-mono-num text-destructive">{p.stock} left</span>
              </div>
            ))}
            {!stats?.low_stock?.length && <p className="text-sm text-muted-foreground">All products are well stocked.</p>}
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="mt-6 grid lg:grid-cols-2 gap-8">
          <form onSubmit={saveCoupon} className="bg-card border border-border rounded-md p-6 space-y-5" data-testid="coupon-form">
            <p className="overline">Create / update coupon</p>
            <F label="Code" value={coupon.code} onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })} testid="cf-code" required />
            <div>
              <Label className="overline">Type</Label>
              <Select value={coupon.type} onValueChange={(v) => setCoupon({ ...coupon, type: v })}>
                <SelectTrigger className="mt-2 h-11" data-testid="cf-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percent">Percent</SelectItem><SelectItem value="flat">Flat</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <F label="Value" type="number" value={coupon.value} onChange={(e) => setCoupon({ ...coupon, value: e.target.value })} testid="cf-value" />
              <F label="Min order" type="number" value={coupon.min_order} onChange={(e) => setCoupon({ ...coupon, min_order: e.target.value })} testid="cf-min" />
            </div>
            <F label="Description" value={coupon.description} onChange={(e) => setCoupon({ ...coupon, description: e.target.value })} testid="cf-desc" />
            <Button type="submit" className="btn-emerald h-11 w-full text-xs tracking-widest" data-testid="cf-submit">SAVE COUPON</Button>
          </form>
          <div className="space-y-3">
            {coupons.map((c) => (
              <div key={c.code} className="bg-card border border-border rounded-md p-4 flex items-center justify-between" data-testid={`admin-coupon-${c.code}`}>
                <div>
                  <p className="font-mono-num text-sm">{c.code}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.description || `${c.value}${c.type === "percent" ? "%" : "₹"} off`}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-8 rounded-sm text-destructive" onClick={async () => { await api.delete(`/admin/coupons/${c.code}`); loadAll(); }} data-testid={`del-coupon-${c.code}`}>DEL</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="customers" className="mt-6 space-y-3">
          {customers.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-md p-4 flex justify-between text-sm" data-testid={`customer-${c.email}`}>
              <div><p>{c.name}</p><p className="text-xs text-muted-foreground mt-1">{c.email} · {c.phone || "—"}</p></div>
              <span className="text-xs text-muted-foreground">{c.orders} order(s)</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="gst" className="mt-6">
          <div className="bg-card border border-border rounded-md p-6" data-testid="gst-report">
            <p className="overline mb-5">Monthly GST report</p>
            <div className="grid grid-cols-4 text-xs overline pb-2 border-b border-border"><span>Month</span><span>Orders</span><span>Taxable</span><span>GST</span></div>
            {gst.map((g) => (
              <div key={g.month} className="grid grid-cols-4 text-sm py-3 border-b border-border/60 last:border-0 font-mono-num">
                <span>{g.month}</span><span>{g.orders}</span><span>{inr(g.taxable)}</span><span>{inr(g.gst)}</span>
              </div>
            ))}
            {gst.length === 0 && <p className="text-sm text-muted-foreground pt-4">No GST data yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <form onSubmit={saveSettings} className="bg-card border border-border rounded-md p-6 space-y-5 max-w-xl" data-testid="settings-form">
            <p className="overline">Website settings</p>
            <F label="Brand name" value={settings.brand_name || ""} onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })} testid="sf-brand" />
            <F label="Contact phone" value={settings.phone || ""} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} testid="sf-phone" />
            <F label="Contact email" value={settings.email || ""} onChange={(e) => setSettings({ ...settings, email: e.target.value })} testid="sf-email" />
            <F label="Address" value={settings.address || ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} testid="sf-address" />
            <F label="Announcement bar" value={settings.announcement || ""} onChange={(e) => setSettings({ ...settings, announcement: e.target.value })} testid="sf-announcement" />
            <Button type="submit" className="btn-emerald h-11 w-full text-xs tracking-widest" data-testid="sf-submit">SAVE SETTINGS</Button>
          </form>
        </TabsContent>
      </Tabs>
      <div className="h-20" />
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="bg-card border border-border rounded-md p-4">
    <p className="overline text-[10px]">{label}</p>
    <p className="font-mono-num text-xl mt-2">{value}</p>
  </div>
);

const F = ({ label, testid, ...rest }) => (
  <div>
    <Label className="overline">{label}</Label>
    <Input {...rest} className="field-line h-11 mt-2" data-testid={testid} />
  </div>
);

const TA = ({ label, testid, ...rest }) => (
  <div>
    <Label className="overline">{label}</Label>
    <Textarea {...rest} rows={3} className="mt-2 text-sm" data-testid={testid} />
  </div>
);

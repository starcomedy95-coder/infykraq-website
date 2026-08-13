import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Phone, Mail, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const subscribe = async (e) => {
    e.preventDefault();
    try {
      await api.post("/newsletter", { email });
      toast.success("Subscribed! Watch out for early sale access.");
      setEmail("");
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <footer className="mt-24" data-testid="site-footer">
      <div className="bg-secondary border-y border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14 grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="overline">Newsletter</p>
            <h3 className="font-display text-3xl sm:text-4xl tracking-tighter mt-3">
              First access to flash sales.
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Drops, restocks and members-only coupons. No spam, ever.
            </p>
          </div>
          <form onSubmit={subscribe} className="flex gap-3 items-end" data-testid="newsletter-form">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="field-line h-11"
              data-testid="newsletter-input"
            />
            <Button type="submit" className="btn-emerald h-11 px-6 text-xs tracking-widest" data-testid="newsletter-submit">
              SUBSCRIBE
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <p className="font-display text-2xl font-black tracking-tighter">
            INFYKRAQ<span className="text-accent">.</span>
          </p>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Multi-category premium commerce — footwear, watches, electronics and accessories.
            GST invoice on every order.
          </p>
        </div>
        <div>
          <p className="overline mb-4">Shop</p>
          <ul className="space-y-2.5 text-muted-foreground">
            <li><Link to="/c/footwear" className="hover:text-foreground transition-colors">Footwear</Link></li>
            <li><Link to="/c/watches" className="hover:text-foreground transition-colors">Watches</Link></li>
            <li><Link to="/c/electronics" className="hover:text-foreground transition-colors">Electronics</Link></li>
            <li><Link to="/c/accessories" className="hover:text-foreground transition-colors">Accessories</Link></li>
          </ul>
        </div>
        <div>
          <p className="overline mb-4">Help</p>
          <ul className="space-y-2.5 text-muted-foreground">
            <li className="flex items-center gap-2"><Truck size={14} /> Free ship above ₹999</li>
            <li className="flex items-center gap-2"><RotateCcw size={14} /> 7-day easy returns</li>
            <li className="flex items-center gap-2"><ShieldCheck size={14} /> Secure SSL checkout</li>
            <li><Link to="/account" className="hover:text-foreground transition-colors">Track order</Link></li>
          </ul>
        </div>
        <div>
          <p className="overline mb-4">Contact</p>
          <ul className="space-y-2.5 text-muted-foreground">
            <li className="flex items-center gap-2" data-testid="footer-phone"><Phone size={14} /> {settings.phone || "9639905611"}</li>
            <li className="flex items-center gap-2 break-all" data-testid="footer-email"><Mail size={14} /> {settings.email || "waqutsaini@gmail.com"}</li>
            <li>{settings.address || "Uttar Pradesh, India"}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} INFYKRAQ. All rights reserved.
      </div>
    </footer>
  );
};

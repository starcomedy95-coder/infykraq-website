import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const KEY = "infykraq_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add = (product, qty = 1, variant = {}) => {
    setItems((prev) => {
      const key = JSON.stringify(variant);
      const i = prev.findIndex(
        (x) => x.product_id === product.id && JSON.stringify(x.variant) === key
      );
      if (i > -1) {
        const copy = [...prev];
        copy[i] = { ...copy[i], qty: copy[i].qty + qty };
        return copy;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          qty,
          variant,
          title: product.title,
          price: product.price,
          image: product.images?.[0],
        },
      ];
    });
    toast.success(`${product.title} added to bag`);
  };

  const setQty = (idx, qty) =>
    setItems((prev) =>
      qty <= 0 ? prev.filter((_, i) => i !== idx) : prev.map((x, i) => (i === idx ? { ...x, qty } : x))
    );
  const remove = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const clear = () => setItems([]);
  const count = items.reduce((s, x) => s + x.qty, 0);
  const payload = items.map(({ product_id, qty, variant }) => ({ product_id, qty, variant }));

  return (
    <CartCtx.Provider value={{ items, add, setQty, remove, clear, count, payload }}>
      {children}
    </CartCtx.Provider>
  );
}

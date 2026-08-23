import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { ProductCard, CardSkeleton } from "@/components/ProductCard";

const SORTS = [
  ["featured", "Featured"],
  ["price_asc", "Price: Low to High"],
  ["price_desc", "Price: High to Low"],
  ["rating", "Top Rated"],
];
const RANGES = [
  ["", "All prices"],
  ["0-999", "Under ₹999"],
  ["1000-2499", "₹1,000 - ₹2,499"],
  ["2500-99999", "₹2,500 & above"],
];

export default function Category() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [sort, setSort] = useState("featured");
  const [range, setRange] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories").then((r) => {
  console.log("Categories API:", r.data);
  setCats(r.data);
}).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (slug) params.set("category", slug);
    if (q) params.set("q", q);
    if (range) {
      const [a, b] = range.split("-");
      params.set("min_price", a);
      params.set("max_price", b);
    }
    api.get(`/products?${params}`).then((r) => {
  console.log("Products API:", r.data);
  setProducts(Array.isArray(r.data) ? r.data : []);
}).catch(() => {}).finally(() => setLoading(false));
  }, [slug, q, sort, range]);

  const cat = Array.isArray(cats) ? cats.find((c) => c.slug === slug) : null;
  const title = q ? `Results for “${q}”` : cat?.name || "All products";

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10" data-testid="category-page">
      <p className="overline">{q ? "Search" : "Collection"}</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tighter mt-2" data-testid="category-title">{title}</h1>
      <p className="text-sm text-muted-foreground mt-3">{cat?.tagline || `${products.length} products`}</p>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-8 pb-1">
        {RANGES.map(([v, l]) => (
          <button
            key={l}
            onClick={() => setRange(v)}
            className={`shrink-0 text-xs px-4 py-2 rounded-full border transition-colors ${range === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
            data-testid={`filter-price-${v || "all"}`}
          >
            {l}
          </button>
        ))}
        <div className="shrink-0 w-px bg-border mx-1" />
        {SORTS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setSort(v)}
            className={`shrink-0 text-xs px-4 py-2 rounded-full border transition-colors ${sort === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
            data-testid={`sort-${v}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
          : products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {!loading && products.length === 0 && (
        <p className="py-20 text-center text-muted-foreground" data-testid="no-products">No products found.</p>
      )}
    </div>
  );
}

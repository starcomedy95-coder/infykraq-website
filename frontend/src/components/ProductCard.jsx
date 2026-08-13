import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { inr } from "@/lib/api";

export const ProductCard = ({ p, wide = false }) => {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <Link
      to={`/p/${p.id}`}
      className={`group block bg-card border border-border rounded-md overflow-hidden card-lift ${wide ? "w-[240px] shrink-0" : ""}`}
      data-testid={`product-card-${p.id}`}
    >
      <div className="relative aspect-[4/5] zoom-wrap bg-secondary">
        <img src={p.images?.[0]} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
        {off > 0 && (
          <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-1 tracking-widest rounded-sm">
            {off}% OFF
          </span>
        )}
        {p.stock < 5 && (
          <span className="absolute bottom-3 left-3 bg-background/90 text-[10px] px-2 py-1 tracking-wider rounded-sm">
            ONLY {p.stock} LEFT
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="overline text-[10px]">{p.category}</p>
        <h3 className="font-display text-base leading-snug mt-1.5 line-clamp-2">{p.title}</h3>
        <div className="flex items-center gap-2 mt-3">
          <span className="font-mono-num font-semibold">{inr(p.price)}</span>
          {off > 0 && <span className="text-xs text-muted-foreground line-through font-mono-num">{inr(p.mrp)}</span>}
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Star size={12} className="fill-accent text-accent" />
          {p.rating} <span className="opacity-60">({p.reviews_count})</span>
        </div>
      </div>
    </Link>
  );
};

export const CardSkeleton = () => (
  <div className="bg-card border border-border rounded-md overflow-hidden animate-pulse">
    <div className="aspect-[4/5] bg-secondary" />
    <div className="p-4 space-y-2">
      <div className="h-2 w-16 bg-secondary" />
      <div className="h-4 w-full bg-secondary" />
      <div className="h-4 w-20 bg-secondary" />
    </div>
  </div>
);

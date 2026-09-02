import { useEffect, useState } from "react";

export default function ThankYou() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const newStars = Array.from({ length: 45 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
      size: 2 + Math.random() * 3,
    }));

    setStars(newStars);
  }, []);

  return (
    <div className="relative min-h-[70vh] overflow-hidden flex items-center justify-center px-4 bg-slate-950">
      {/* Animated stars */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Soft background glow */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Thank You Card */}
      <div className="relative z-10 text-center max-w-lg">
        <div className="text-7xl mb-6 animate-bounce">🎉</div>

        <p className="text-emerald-400 text-sm tracking-[0.3em] uppercase mb-3">
          Order Confirmed
        </p>

        <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
          Thank You!
        </h1>

        <p className="text-xl text-white/80 mt-5">
          Thank you for shopping with INFYKRAQ.
        </p>

        <p className="text-sm text-white/60 mt-3">
          Your order has been successfully placed.
          <br />
          We truly appreciate your trust and support.
        </p>

        <a
          href="/"
          className="inline-block mt-8 px-8 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-all duration-300"
        >
          CONTINUE SHOPPING
        </a>
      </div>
    </div>
  );
}
export default function ThankYou() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>

        <h1 className="text-3xl font-bold mb-3">
          Thank You!
        </h1>

        <p className="text-gray-600 mb-6">
          Your order has been successfully placed.
        </p>

        <a
          href="/"
          className="inline-block px-6 py-3 rounded-lg bg-black text-white font-medium"
        >
          Continue Shopping
        </a>
      </div>
    </div>
  );
}
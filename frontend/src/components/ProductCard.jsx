import { formatEGP } from "../lib/format";

export default function ProductCard({ product, onOpen }) {
  return (
    <button
      onClick={() => onOpen(product)}
      className="group text-right bg-white rounded-2xl overflow-hidden border border-[var(--line)] hover:shadow-[0_8px_30px_rgba(28,21,18,0.10)] hover:-translate-y-0.5 transition-all duration-200 focus-ring"
    >
      <div className="aspect-[4/3] bg-[var(--cream-dim)] relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-4xl opacity-30">🍽️</div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 grid place-items-center">
            <span className="text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-full">غير متاح حالياً</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[15px] leading-snug">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-[var(--ink-soft)] mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-lg font-semibold" style={{ color: "var(--red)" }}>
            {product.price_large ? `${formatEGP(product.price)} - ${formatEGP(product.price_large)}` : formatEGP(product.price)}
          </span>
          <span className="w-8 h-8 rounded-full grid place-items-center bg-[var(--charcoal)] text-white group-hover:bg-[var(--red)] transition-colors text-lg leading-none">
            +
          </span>
        </div>
      </div>
    </button>
  );
}

import { useState } from "react";
import { useCartStore } from "../store/cartStore";
import { useToastStore } from "../store/toastStore";
import { formatEGP } from "../lib/format";

export default function ProductModal({ product, onClose }) {
  const [size, setSize] = useState("medium");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const addItem = useCartStore((s) => s.addItem);
  const push = useToastStore((s) => s.push);

  if (!product) return null;

  const unitPrice = size === "large" && product.price_large ? product.price_large : product.price;

  const handleAdd = () => {
    addItem({
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      unit_price: unitPrice,
      size,
      quantity: qty,
      special_instructions: notes || undefined,
    });
    push(`تمت إضافة ${product.name} للسلة`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto animate-[slideup_0.25s_ease]">
        <div className="aspect-[16/9] bg-[var(--cream-dim)] relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-6xl opacity-30">🍽️</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 grid place-items-center shadow focus-ring"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <h2 className="font-display text-2xl font-semibold">{product.name}</h2>
          {product.description && <p className="text-sm text-[var(--ink-soft)] mt-2">{product.description}</p>}

          {product.price_large && (
            <div className="mt-5">
              <div className="text-sm font-semibold mb-2">الحجم</div>
              <div className="flex gap-2">
                <SizeButton active={size === "medium"} onClick={() => setSize("medium")} label="وسط" price={product.price} />
                <SizeButton active={size === "large"} onClick={() => setSize("large")} label="كبير" price={product.price_large} />
              </div>
            </div>
          )}

          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">الكمية</div>
            <div className="inline-flex items-center border border-[var(--line)] rounded-full">
              <button
                className="w-10 h-10 grid place-items-center text-lg focus-ring rounded-full"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
              <button
                className="w-10 h-10 grid place-items-center text-lg focus-ring rounded-full"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold mb-2 block">ملاحظات خاصة (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: زودلي جبنة..."
              rows={2}
              className="w-full border border-[var(--line)] rounded-xl px-3 py-2 text-sm focus-ring resize-none"
            />
          </div>

          <button
            disabled={!product.is_available}
            onClick={handleAdd}
            className="mt-6 w-full py-3.5 rounded-full font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--red)" }}
          >
            {product.is_available ? `أضف للسلة — ${formatEGP(unitPrice * qty)}` : "غير متاح حالياً"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SizeButton({ active, onClick, label, price }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
        active ? "border-[var(--red)] bg-red-50 text-[var(--red)]" : "border-[var(--line)]"
      }`}
    >
      {label} · {formatEGP(price)}
    </button>
  );
}

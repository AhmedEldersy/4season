import { Link, useNavigate } from "react-router-dom";
import { useCartStore, lineKey } from "../store/cartStore";
import { formatEGP } from "../lib/format";
import EmptyState from "../components/EmptyState";

const DELIVERY_FEE = 25;

export default function Cart() {
  const { items, updateQuantity, removeItem, clear, subtotal } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          icon="🛒"
          title="السلة فاضية"
          subtitle="لسه ما ضفتش أي أكلة. يلا نتصفح المنيو."
          action={
            <Link to="/menu" className="px-6 py-3 rounded-full font-bold text-white" style={{ background: "var(--red)" }}>
              تصفح المنيو
            </Link>
          }
        />
      </div>
    );
  }

  const total = subtotal() + DELIVERY_FEE;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-semibold">السلة</h1>
        <button onClick={clear} className="text-sm text-[var(--ink-soft)] hover:text-[var(--red)]">
          إفراغ السلة
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const key = lineKey(item);
          return (
            <div key={key} className="flex gap-3 bg-white border border-[var(--line)] rounded-2xl p-3 sm:p-4">
              <div className="w-20 h-20 rounded-xl bg-[var(--cream-dim)] shrink-0 overflow-hidden grid place-items-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-30">🍽️</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    {item.size && <span className="text-xs text-[var(--ink-soft)]">حجم: {item.size === "large" ? "كبير" : "وسط"}</span>}
                    {item.special_instructions && (
                      <p className="text-xs text-[var(--ink-soft)] mt-0.5">ملاحظة: {item.special_instructions}</p>
                    )}
                  </div>
                  <button onClick={() => removeItem(key)} className="text-[var(--ink-soft)] hover:text-[var(--red)] text-sm">
                    ✕
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center border border-[var(--line)] rounded-full">
                    <button
                      className="w-8 h-8 grid place-items-center focus-ring rounded-full"
                      onClick={() => updateQuantity(key, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                    <button
                      className="w-8 h-8 grid place-items-center focus-ring rounded-full"
                      onClick={() => updateQuantity(key, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="font-display font-semibold" style={{ color: "var(--red)" }}>
                    {formatEGP(item.unit_price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white border border-[var(--line)] rounded-2xl p-5 space-y-2.5">
        <Row label="الإجمالي الفرعي" value={formatEGP(subtotal())} />
        <Row label="رسوم التوصيل" value={formatEGP(DELIVERY_FEE)} />
        <div className="h-px bg-[var(--line)] my-1" />
        <Row label="الإجمالي" value={formatEGP(total)} bold />
      </div>

      <button
        onClick={() => navigate("/checkout")}
        className="mt-5 w-full py-4 rounded-full font-bold text-white text-lg"
        style={{ background: "var(--red)" }}
      >
        إتمام الطلب
      </button>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-bold" : "text-sm text-[var(--ink-soft)]"}`}>
      <span>{label}</span>
      <span className={bold ? "font-display" : "font-semibold text-[var(--ink)]"}>{value}</span>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCartStore } from "../store/cartStore";
import { useToastStore } from "../store/toastStore";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { formatEGP, formatDate } from "../lib/format";

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);

  const reorder = async (order) => {
    let addedAny = false;
    let skipped = 0;
    for (const item of order.items) {
      if (!item.product_id) { skipped++; continue; }
      try {
        const res = await api.get(`/products/${item.product_id}`);
        if (!res.data.is_available) { skipped++; continue; }
        addItem({
          product_id: res.data.id,
          name: res.data.name,
          image_url: res.data.image_url,
          unit_price: item.size === "large" && res.data.price_large ? res.data.price_large : res.data.price,
          size: item.size,
          quantity: item.quantity,
        });
        addedAny = true;
      } catch {
        skipped++;
      }
    }
    if (addedAny) {
      push(skipped > 0 ? `تمت إضافة الأصناف المتاحة (${skipped} صنف غير متاح حالياً)` : "تمت إضافة الطلب للسلة", "success");
      navigate("/cart");
    } else {
      push("للأسف كل أصناف هذا الطلب غير متاحة حالياً", "error");
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-[var(--ink-soft)]">جاري التحميل...</div>;

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          icon="🧾"
          title="لسه معملتش أي طلب"
          subtitle="أول طلب ليك من 4Season مستنيك."
          action={
            <Link to="/menu" className="px-6 py-3 rounded-full font-bold text-white" style={{ background: "var(--red)" }}>
              تصفح المنيو
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold mb-8">طلباتي</h1>
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="bg-white border border-[var(--line)] rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold">طلب #{o.order_number}</p>
                <p className="text-xs text-[var(--ink-soft)]">{formatDate(o.created_at)}</p>
              </div>
              <StatusBadge status={o.status} orderType={o.order_type} />
            </div>
            <p className="text-sm text-[var(--ink-soft)] mb-3 line-clamp-1">
              {o.items.map((i) => `${i.quantity}× ${i.product_name_snapshot}`).join("، ")}
            </p>
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold" style={{ color: "var(--red)" }}>{formatEGP(o.total)}</span>
              <div className="flex gap-2">
                <button onClick={() => reorder(o)} className="text-sm font-semibold px-3 py-1.5 rounded-full border border-[var(--line)] hover:border-[var(--red)]">
                  إعادة الطلب
                </button>
                <Link to={`/orders/${o.id}`} className="text-sm font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--charcoal)" }}>
                  تفاصيل
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

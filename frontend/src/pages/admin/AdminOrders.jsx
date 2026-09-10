import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api/client";
import { useAdminRealtimeStore } from "../../store/adminRealtimeStore";
import { useToastStore } from "../../store/toastStore";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import { formatEGP, formatDate, statusLabelFor } from "../../lib/format";

// Admin action buttons per current status. Pickup orders skip the
// "out for delivery" leg entirely -- READY leads straight to picked-up/DELIVERED.
function nextActions(order) {
  const isPickup = order.order_type === "PICKUP";
  const table = {
    PENDING: [{ status: "ACCEPTED", label: "قبول", tone: "primary" }, { status: "CANCELLED", label: "رفض", tone: "danger" }],
    ACCEPTED: [{ status: "PREPARING", label: "بدء التحضير", tone: "primary" }],
    PREPARING: [{ status: "READY", label: "جاهز", tone: "primary" }],
    READY: isPickup
      ? [{ status: "DELIVERED", label: "تم الاستلام", tone: "primary" }]
      : [{ status: "OUT_FOR_DELIVERY", label: "خرج للتوصيل", tone: "primary" }],
    OUT_FOR_DELIVERY: [{ status: "DELIVERED", label: "تم التوصيل", tone: "primary" }],
    DELIVERED: [],
    CANCELLED: [],
  };
  return table[order.status] || [];
}

const FILTERS = [
  { value: "", label: "الكل" },
  { value: "PENDING", label: "قيد الانتظار" },
  { value: "ACCEPTED", label: "مقبول" },
  { value: "PREPARING", label: "تحضير" },
  { value: "READY", label: "جاهز" },
  { value: "OUT_FOR_DELIVERY", label: "توصيل" },
  { value: "DELIVERED", label: "تم التوصيل" },
  { value: "CANCELLED", label: "ملغي" },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState(""); // "" | "PICKUP" | "DELIVERY"
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(new Set());
  const lastEvent = useAdminRealtimeStore((s) => s.lastEvent);
  const push = useToastStore((s) => s.push);

  const load = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.order_type = typeFilter;
    if (search) params.customer = search;
    api.get("/admin/orders", { params }).then((res) => setOrders(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to realtime events by refreshing + highlighting the affected order.
  useEffect(() => {
    if (!lastEvent) return;
    load();
    if (lastEvent.data?.id) {
      setHighlighted((prev) => new Set(prev).add(lastEvent.data.id));
      setTimeout(() => {
        setHighlighted((prev) => {
          const next = new Set(prev);
          next.delete(lastEvent.data.id);
          return next;
        });
      }, 4000);
    }
  }, [lastEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (orderId, status) => {
    try {
      const res = await api.patch(`/admin/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
      push(`تم تحديث الطلب إلى: ${statusLabelFor(status, res.data.order_type)}`, "success");
    } catch (err) {
      push(getErrorMessage(err, "تعذر تحديث حالة الطلب"), "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">الطلبات</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="دور باسم العميل أو الهاتف..."
          className="border border-[var(--line)] rounded-full px-4 py-2 text-sm focus-ring bg-white w-64"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { value: "", label: "الكل" },
          { value: "PICKUP", label: "📦 استلام" },
          { value: "DELIVERY", label: "🚗 توصيل" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              typeFilter === f.value ? "text-white border-transparent" : "bg-white border-[var(--line)]"
            }`}
            style={typeFilter === f.value ? { background: "var(--charcoal)" } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              statusFilter === f.value ? "text-white border-transparent" : "bg-white border-[var(--line)]"
            }`}
            style={statusFilter === f.value ? { background: "var(--red)" } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--ink-soft)]">جاري التحميل...</p>
      ) : orders.length === 0 ? (
        <EmptyState icon="🧾" title="لا يوجد طلبات" subtitle="لا توجد طلبات مطابقة لهذا الفلتر." />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className={`bg-white border rounded-2xl p-4 sm:p-5 transition-colors ${
                highlighted.has(o.id) ? "border-[var(--gold)] bg-amber-50" : "border-[var(--line)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold">#{o.order_number} — {o.customer_name}</p>
                  <p className="text-xs text-[var(--ink-soft)]">{o.phone} · {formatDate(o.created_at)}</p>
                </div>
                <StatusBadge status={o.status} orderType={o.order_type} />
              </div>

              <p className="text-sm text-[var(--ink-soft)] mb-1">
                {o.items.map((i) => `${i.quantity}× ${i.product_name_snapshot}`).join("، ")}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--ink-soft)] mb-3">
                <span className="font-semibold">
                  {o.order_type === "PICKUP" ? "📦 استلام من الفرع" : `🚗 توصيل — ${o.delivery_area_name_snapshot || "—"}`}
                </span>
                {o.order_type === "DELIVERY" && o.address && (
                  <span>
                    العنوان: {o.address}
                    {(o.building || o.apartment) &&
                      ` (${[o.building && `عمارة ${o.building}`, o.apartment && `شقة ${o.apartment}`].filter(Boolean).join(" - ")})`}
                  </span>
                )}
                <span>الفرعي: {formatEGP(o.subtotal)}</span>
                {o.delivery_fee > 0 && <span>التوصيل: {formatEGP(o.delivery_fee)}</span>}
                <span>الدفع: كاش عند الاستلام</span>
              </div>
              {o.notes && <p className="text-xs text-[var(--ink-soft)] mb-2">ملاحظات: {o.notes}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-display font-semibold" style={{ color: "var(--red)" }}>{formatEGP(o.total)}</span>
                <div className="flex gap-2">
                  {nextActions(o).map((action) => (
                    <button
                      key={action.status}
                      onClick={() => updateStatus(o.id, action.status)}
                      className={`text-xs font-semibold px-3.5 py-2 rounded-full transition-colors ${
                        action.tone === "danger" ? "border border-red-300 text-red-700 hover:bg-red-50" : "text-white"
                      }`}
                      style={action.tone === "primary" ? { background: "var(--charcoal)" } : {}}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

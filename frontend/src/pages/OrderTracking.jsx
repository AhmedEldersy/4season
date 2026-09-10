import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { API_URL, getErrorMessage } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import StatusBadge from "../components/StatusBadge";
import CountdownTimer from "../components/CountdownTimer";
import { formatEGP, formatDate, statusFlowFor, statusLabelFor } from "../lib/format";

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const token = useAuthStore((s) => s.token);
  const push = useToastStore((s) => s.push);
  const wsRef = useRef(null);

  const load = () => api.get(`/orders/${id}`).then((res) => setOrder(res.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  // Realtime updates via WebSocket, with the page reload above as a reliable fallback.
  useEffect(() => {
    if (!token) return;
    const wsUrl = `${API_URL.replace("http", "ws")}/ws/orders?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.data?.id === id) {
        setOrder(msg.data);
        if (msg.event === "order_status_changed") {
          push(`الطلب الآن: ${statusLabelFor(msg.data.status, msg.data.order_type)}`, "info");
        }
      }
    };
    return () => ws.close();
  }, [token, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancellable =
    order && order.status === "PENDING" && new Date(order.cancellation_deadline + "Z").getTime() > Date.now();

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await api.post(`/orders/${id}/cancel`);
      setOrder(res.data);
      push("تم إلغاء الطلب", "success");
    } catch (err) {
      push(getErrorMessage(err, "تعذر إلغاء الطلب"), "error");
      load();
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-[var(--ink-soft)]">جاري التحميل...</div>;
  if (!order) return <div className="max-w-2xl mx-auto px-4 py-16 text-center">الطلب غير موجود</div>;

  const statusFlow = statusFlowFor(order.order_type);
  const currentIdx = statusFlow.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">طلب #{order.order_number}</h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">{formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} orderType={order.order_type} />
      </div>

      {/* Timeline */}
      {order.status !== "CANCELLED" && (
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5 mb-5">
          <div className="flex items-center">
            {statusFlow.map((s, i) => (
              <div key={s} className="flex-1 flex items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold transition-colors ${
                      i <= currentIdx ? "text-white" : "bg-[var(--cream-dim)] text-[var(--ink-soft)]"
                    }`}
                    style={i <= currentIdx ? { background: "var(--red)" } : {}}
                  >
                    {i < currentIdx ? "✓" : i + 1}
                  </div>
                  <span className="text-[10px] text-center text-[var(--ink-soft)] max-w-[60px] leading-tight">
                    {statusLabelFor(s, order.order_type)}
                  </span>
                </div>
                {i < statusFlow.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 transition-colors ${i < currentIdx ? "" : "bg-[var(--line)]"}`}
                       style={i < currentIdx ? { background: "var(--red)" } : {}} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancellation panel */}
      {order.status === "CANCELLED" ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5 text-center">
          <p className="font-bold text-[var(--red)]">تم إلغاء الطلب</p>
          <p className="text-sm text-[var(--ink-soft)] mt-1">وقت الإلغاء: {formatDate(order.cancelled_at)}</p>
        </div>
      ) : cancellable ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">تقدر تلغي الطلب خلال</p>
            <CountdownTimer deadline={order.cancellation_deadline} onExpire={load} />
          </div>
          <button
            onClick={cancel}
            disabled={cancelling}
            className="w-full py-3 rounded-full font-bold border-2 border-[var(--red)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}
          </button>
        </div>
      ) : order.status === "PENDING" ? (
        <div className="bg-[var(--cream-dim)] rounded-2xl p-4 mb-5 text-center text-sm text-[var(--ink-soft)]">
          انتهت فترة الإلغاء
        </div>
      ) : (
        <div className="bg-[var(--cream-dim)] rounded-2xl p-4 mb-5 text-center text-sm text-[var(--ink-soft)]">
          تم قبول طلبك ولم يعد بإمكانك إلغاءه
        </div>
      )}

      {/* Items */}
      <div className="bg-white border border-[var(--line)] rounded-2xl p-5 space-y-2.5 mb-5">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm">
            <span>
              {i.quantity}× {i.product_name_snapshot} {i.size === "large" ? "(كبير)" : ""}
            </span>
            <span className="font-semibold">{formatEGP(i.subtotal)}</span>
          </div>
        ))}
        <div className="h-px bg-[var(--line)]" />
        <div className="flex justify-between text-sm text-[var(--ink-soft)]">
          <span>الإجمالي الفرعي</span>
          <span>{formatEGP(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-[var(--ink-soft)]">
          <span>رسوم التوصيل{order.delivery_area_name_snapshot ? ` (${order.delivery_area_name_snapshot})` : ""}</span>
          <span>{formatEGP(order.delivery_fee)}</span>
        </div>
        <div className="h-px bg-[var(--line)]" />
        <div className="flex justify-between font-bold">
          <span>الإجمالي</span>
          <span className="font-display" style={{ color: "var(--red)" }}>{formatEGP(order.total)}</span>
        </div>
      </div>

      <div className="bg-white border border-[var(--line)] rounded-2xl p-5 text-sm space-y-1">
        <p>
          <span className="text-[var(--ink-soft)]">طريقة الاستلام: </span>
          {order.order_type === "PICKUP" ? "استلام من الفرع" : "توصيل للمنزل"}
        </p>
        {order.order_type === "DELIVERY" ? (
          <>
            <p><span className="text-[var(--ink-soft)]">العنوان: </span>{order.address}</p>
            {(order.building || order.apartment) && (
              <p>
                <span className="text-[var(--ink-soft)]">تفاصيل: </span>
                {[order.building && `عمارة ${order.building}`, order.apartment && `شقة ${order.apartment}`]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
            )}
          </>
        ) : (
          <p><span className="text-[var(--ink-soft)]">مكان الاستلام: </span>فرع 4Seasons، شارع الجمهورية</p>
        )}
        <p><span className="text-[var(--ink-soft)]">الهاتف: </span>{order.phone}</p>
        <p><span className="text-[var(--ink-soft)]">طريقة الدفع: </span>الدفع عند الاستلام</p>
      </div>

      <Link to="/orders" className="block text-center mt-6 text-sm font-semibold" style={{ color: "var(--red)" }}>
        ← كل طلباتي
      </Link>
    </div>
  );
}

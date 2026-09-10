import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { Field } from "./Login";
import { formatEGP } from "../lib/format";

export default function Checkout() {
  const { items, subtotal, clear } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [orderType, setOrderType] = useState("DELIVERY"); // "DELIVERY" | "PICKUP"
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areaId, setAreaId] = useState("");

  const [form, setForm] = useState({
    customer_name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    building: "",
    apartment: "",
    notes: "",
  });

  // One idempotency key per checkout *session* -- regenerated only after a
  // successful submit, so a double-click on "place order" (or a retried
  // request after a flaky network blip) can never create two orders.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  // Guards the empty-cart redirect below: without this, clear()-ing the
  // cart on a successful order races with navigate("/orders/:id") --
  // clearing the cart re-renders Checkout with items.length===0 *before*
  // the router has actually left the page, so the empty-cart redirect below
  // can override the intended navigation and dump the customer back on
  // /menu right after they placed an order. Caught live via a Playwright
  // smoke test, not just by reading the code.
  const [justPlacedOrder, setJustPlacedOrder] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get("/delivery-areas")
      .then((res) => {
        if (!mounted) return;
        setAreas(res.data);
        if (res.data.length > 0) setAreaId(res.data[0].id);
      })
      .catch(() => push("تعذر تحميل مناطق التوصيل، حاول تاني", "error"))
      .finally(() => mounted && setAreasLoading(false));
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const selectedArea = areas.find((a) => a.id === areaId);
  const deliveryFee = orderType === "DELIVERY" ? selectedArea?.fee ?? 0 : 0;
  const total = useMemo(() => subtotal() + deliveryFee, [items, deliveryFee, subtotal]);

  // The old version of this guard called navigate("/menu") directly in the
  // render body when the cart was empty. That's exactly what fires right
  // after a successful order: submit() clears the cart, which re-renders
  // Checkout with items.length===0 *before* the router has actually left
  // for /orders/:id, so this guard would silently override the intended
  // navigation and dump the customer back on /menu instead of their order.
  // Caught live with a Playwright smoke test, not just by reading the code.
  // Fixed by moving the redirect into an effect and skipping it once an
  // order has just been placed (see justPlacedOrder + submit() below).
  useEffect(() => {
    if (items.length === 0 && !justPlacedOrder) {
      navigate("/menu");
    }
  }, [items.length, justPlacedOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) {
    return null;
  }

  const canSubmit =
    orderType === "PICKUP" ||
    (orderType === "DELIVERY" && areaId && form.address.trim().length > 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      push(
        orderType === "DELIVERY" ? "من فضلك اختار منطقة التوصيل واكتب العنوان" : "من فضلك راجع البيانات",
        "error"
      );
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/orders", {
        customer_name: form.customer_name,
        phone: form.phone,
        order_type: orderType,
        delivery_area_id: orderType === "DELIVERY" ? areaId : undefined,
        address: orderType === "DELIVERY" ? form.address : undefined,
        building: orderType === "DELIVERY" ? form.building || undefined : undefined,
        apartment: orderType === "DELIVERY" ? form.apartment || undefined : undefined,
        notes: form.notes || undefined,
        idempotency_key: idempotencyKey,
        items: items.map((i) => ({
          product_id: i.product_id,
          size: i.size,
          quantity: i.quantity,
          special_instructions: i.special_instructions,
        })),
      });
      setJustPlacedOrder(true);
      clear();
      setIdempotencyKey(crypto.randomUUID());
      push("تم استلام طلبك بنجاح!", "success");
      navigate(`/orders/${res.data.id}`, { state: { justPlaced: true } });
    } catch (err) {
      push(err.response?.data?.detail || "حصل خطأ أثناء إرسال الطلب", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold mb-8">إتمام الطلب</h1>

      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wide text-[var(--ink-soft)]">طريقة الاستلام</h2>
          <div className="grid grid-cols-2 gap-3">
            <OrderTypeCard
              label="استلام من المطعم"
              sublabel="جاهز في 45 دقيقة"
              active={orderType === "PICKUP"}
              onClick={() => setOrderType("PICKUP")}
            />
            <OrderTypeCard
              label="توصيل للمنزل"
              sublabel="حسب المنطقة"
              active={orderType === "DELIVERY"}
              onClick={() => setOrderType("DELIVERY")}
            />
          </div>

          {orderType === "PICKUP" ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--cream-dim)] px-4 py-3.5 text-sm space-y-1">
              <p className="font-semibold">استلام من فرع 4Seasons</p>
              <p className="text-[var(--ink-soft)]">العنوان: سمنود - الشحاتية - برج المختار، شارع المدارس، بجوار مدرسة الاعدادية بنات</p>
              <p className="text-[var(--ink-soft)]">مواعيد الاستلام: يوميًا 3م - 3ص</p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-sm font-semibold block">اختار منطقتك</span>
              {areasLoading ? (
                <div className="h-12 rounded-xl skeleton" />
              ) : areas.length === 0 ? (
                <p className="text-sm text-[var(--red)]">لا توجد مناطق توصيل متاحة حاليًا، جرّب الاستلام من الفرع.</p>
              ) : (
                <div className="grid gap-2">
                  {areas.map((a) => (
                    <label
                      key={a.id}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                        areaId === a.id
                          ? "border-[var(--red)] bg-red-50"
                          : "border-[var(--line)] hover:border-[var(--ink-soft)]"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery-area"
                          className="accent-[var(--red)]"
                          checked={areaId === a.id}
                          onChange={() => setAreaId(a.id)}
                        />
                        <span className="font-medium text-sm">{a.name}</span>
                      </span>
                      <span className="text-sm font-semibold text-[var(--ink-soft)]">{formatEGP(a.fee)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 className="font-bold text-sm uppercase tracking-wide text-[var(--ink-soft)] pt-2">بيانات التواصل</h2>
          <Field label="الاسم الكامل" value={form.customer_name} onChange={set("customer_name")} required />
          <Field label="رقم الموبايل" type="tel" value={form.phone} onChange={set("phone")} required />

          {orderType === "DELIVERY" && (
            <>
              <Field label="العنوان بالتفصيل" value={form.address} onChange={set("address")} required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="العمارة" value={form.building} onChange={set("building")} />
                <Field label="الشقة" value={form.apartment} onChange={set("apartment")} />
              </div>
            </>
          )}

          <label className="block">
            <span className="text-sm font-semibold block mb-1.5">ملاحظات (اختياري)</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              className="w-full border border-[var(--line)] rounded-xl px-4 py-3 text-sm focus-ring resize-none"
            />
          </label>

          <h2 className="font-bold text-sm uppercase tracking-wide text-[var(--ink-soft)] pt-2">طريقة الدفع</h2>
          <div className="flex items-center gap-3 border border-[var(--red)] bg-red-50 rounded-xl px-4 py-3.5">
            <span className="w-4 h-4 rounded-full border-2 border-[var(--red)] grid place-items-center">
              <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
            </span>
            <span className="font-semibold text-sm">الدفع عند الاستلام</span>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-sm uppercase tracking-wide text-[var(--ink-soft)] mb-4">ملخص الطلب</h2>
          <div className="bg-white border border-[var(--line)] rounded-2xl p-4 space-y-3">
            {items.map((i) => (
              <div key={`${i.product_id}-${i.size}`} className="flex justify-between text-sm">
                <span>
                  {i.quantity}× {i.name} {i.size === "large" ? "(كبير)" : ""}
                </span>
                <span className="font-semibold">{formatEGP(i.unit_price * i.quantity)}</span>
              </div>
            ))}
            <div className="h-px bg-[var(--line)]" />
            <div className="flex justify-between text-sm text-[var(--ink-soft)]">
              <span>الإجمالي الفرعي</span>
              <span>{formatEGP(subtotal())}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--ink-soft)]">
              <span>رسوم التوصيل{orderType === "DELIVERY" && selectedArea ? ` (${selectedArea.name})` : ""}</span>
              <span>{formatEGP(deliveryFee)}</span>
            </div>
            <div className="h-px bg-[var(--line)]" />
            <div className="flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="font-display" style={{ color: "var(--red)" }}>{formatEGP(total)}</span>
            </div>
          </div>

          <button
            disabled={loading || !canSubmit}
            className="mt-5 w-full py-4 rounded-full font-bold text-white text-lg disabled:opacity-60"
            style={{ background: "var(--red)" }}
          >
            {loading ? "جاري الإرسال..." : "تأكيد الطلب"}
          </button>
          <p className="text-xs text-center text-[var(--ink-soft)] mt-3">
            هتقدر تلغي الطلب خلال 10 دقايق من إرساله طالما لسه ما اتقبلش
          </p>
        </div>
      </form>
    </div>
  );
}

function OrderTypeCard({ label, sublabel, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-right rounded-xl border px-4 py-3.5 transition-colors ${
        active ? "border-[var(--red)] bg-red-50" : "border-[var(--line)] hover:border-[var(--ink-soft)]"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded-full border-2 grid place-items-center shrink-0"
          style={{ borderColor: active ? "var(--red)" : "var(--line)" }}
        >
          {active && <span className="w-2 h-2 rounded-full bg-[var(--red)]" />}
        </span>
        <span className="font-semibold text-sm">{label}</span>
      </span>
      <span className="block text-xs text-[var(--ink-soft)] mt-1">{sublabel}</span>
    </button>
  );
}

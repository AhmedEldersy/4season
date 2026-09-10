import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";
import EmptyState from "../../components/EmptyState";
import { formatEGP } from "../../lib/format";

export default function DeliveryAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [editingId, setEditingId] = useState(null);
  const push = useToastStore((s) => s.push);

  const load = () => {
    setLoading(true);
    api.get("/admin/delivery-areas").then((res) => setAreas(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resetForm = () => {
    setName("");
    setFee("");
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    const feeNum = Number(fee);
    if (!trimmed) return push("اسم المنطقة مطلوب", "error");
    if (Number.isNaN(feeNum) || feeNum < 0) return push("رسوم التوصيل لازم تكون رقم موجب", "error");

    try {
      if (editingId) {
        const existing = areas.find((a) => a.id === editingId);
        await api.put(`/admin/delivery-areas/${editingId}`, {
          name: trimmed,
          fee: feeNum,
          is_active: existing?.is_active ?? true,
          sort_order: existing?.sort_order ?? 0,
        });
        push("تم تحديث المنطقة", "success");
      } else {
        await api.post("/admin/delivery-areas", { name: trimmed, fee: feeNum, is_active: true, sort_order: areas.length });
        push("تمت إضافة المنطقة", "success");
      }
      resetForm();
      load();
    } catch (err) {
      push(getErrorMessage(err, "حصل خطأ"), "error");
    }
  };

  const edit = (area) => {
    setEditingId(area.id);
    setName(area.name);
    setFee(String(area.fee));
  };

  const toggleActive = async (area) => {
    try {
      await api.put(`/admin/delivery-areas/${area.id}`, {
        name: area.name,
        fee: area.fee,
        is_active: !area.is_active,
        sort_order: area.sort_order,
      });
      load();
    } catch (err) {
      push(getErrorMessage(err, "تعذر تحديث المنطقة"), "error");
    }
  };

  const remove = async (area) => {
    if (!confirm(`حذف "${area.name}"؟`)) return;
    try {
      await api.delete(`/admin/delivery-areas/${area.id}`);
      push("تم الحذف", "success");
      load();
    } catch (err) {
      // Areas with existing orders can't be deleted (preserves order history) -- deactivate instead.
      push(getErrorMessage(err, "تعذر الحذف"), "error");
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">مناطق التوصيل</h1>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          الرسوم هنا هي مصدر الحقيقة الوحيد — أي تغيير ما يأثرش على الطلبات القديمة.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2 bg-white border border-[var(--line)] rounded-2xl p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم المنطقة (مثال: مدينة نصر)"
          className="flex-1 min-w-[160px] border border-[var(--line)] rounded-full px-4 py-2.5 text-sm"
        />
        <input
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          type="number"
          min="0"
          step="0.5"
          placeholder="رسوم التوصيل"
          className="w-36 border border-[var(--line)] rounded-full px-4 py-2.5 text-sm"
        />
        <button className="px-5 py-2.5 rounded-full font-bold text-white text-sm" style={{ background: "var(--red)" }}>
          {editingId ? "حفظ التعديل" : "إضافة منطقة"}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-full text-sm font-semibold text-[var(--ink-soft)]">
            إلغاء
          </button>
        )}
      </form>

      {loading ? (
        <p className="text-[var(--ink-soft)]">جاري التحميل...</p>
      ) : areas.length === 0 ? (
        <EmptyState icon="🚗" title="لا توجد مناطق توصيل" subtitle="ضيف أول منطقة توصيل من الفورم فوق." />
      ) : (
        <div className="bg-white border border-[var(--line)] rounded-2xl divide-y divide-[var(--line)] overflow-x-auto">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 text-xs font-bold text-[var(--ink-soft)] uppercase min-w-[560px]">
            <span>المنطقة</span>
            <span>الرسوم</span>
            <span>الحالة</span>
            <span>الطلبات</span>
            <span>الإجراءات</span>
          </div>
          {areas.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3.5 min-w-[560px]">
              <span className="font-semibold text-sm">{a.name}</span>
              <span className="text-sm font-semibold">{formatEGP(a.fee)}</span>
              <button
                onClick={() => toggleActive(a)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                  a.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                }`}
              >
                {a.is_active ? "مفعلة" : "معطلة"}
              </button>
              <span className="text-sm text-[var(--ink-soft)] text-center">{a.orders_count}</span>
              <div className="flex gap-3">
                <button onClick={() => edit(a)} className="text-xs font-semibold" style={{ color: "var(--red)" }}>
                  تعديل
                </button>
                <button onClick={() => remove(a)} className="text-xs font-semibold text-gray-500">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

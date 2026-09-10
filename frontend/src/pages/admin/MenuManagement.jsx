import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToastStore } from "../../store/toastStore";
import { formatEGP } from "../../lib/format";

const emptyForm = { id: null, category_id: "", name: "", description: "", price: "", price_large: "", image_url: "", is_available: true };

export default function MenuManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCat, setFilterCat] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const push = useToastStore((s) => s.push);

  const load = () => {
    api.get("/admin/products").then((res) => setProducts(res.data));
    api.get("/admin/categories").then((res) => setCategories(res.data));
  };
  useEffect(load, []);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const openNew = () => {
    setForm({ ...emptyForm, category_id: categories[0]?.id || "" });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({ ...p, price: String(p.price), price_large: p.price_large ? String(p.price_large) : "" });
    setShowForm(true);
  };

  const uploadImage = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/admin/uploads/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("image_url")(`${api.defaults.baseURL}${res.data.url}`);
    } catch {
      push("فشل رفع الصورة", "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      category_id: form.category_id,
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      price_large: form.price_large ? parseFloat(form.price_large) : null,
      image_url: form.image_url || null,
      is_available: form.is_available,
    };
    try {
      if (form.id) {
        await api.patch(`/admin/products/${form.id}`, payload);
        push("تم تحديث الصنف", "success");
      } else {
        await api.post("/admin/products", payload);
        push("تمت إضافة الصنف", "success");
      }
      setShowForm(false);
      load();
    } catch {
      push("حصل خطأ أثناء الحفظ", "error");
    }
  };

  const remove = async (id) => {
    if (!confirm("متأكد من حذف هذا الصنف؟")) return;
    await api.delete(`/admin/products/${id}`);
    push("تم حذف الصنف", "success");
    load();
  };

  const toggleAvailable = async (p) => {
    await api.patch(`/admin/products/${p.id}`, { ...p, is_available: !p.is_available });
    load();
  };

  const filtered = filterCat ? products.filter((p) => p.category_id === filterCat) : products;
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">إدارة المنيو</h1>
        <button onClick={openNew} className="px-4 py-2.5 rounded-full font-bold text-white text-sm" style={{ background: "var(--red)" }}>
          + إضافة صنف
        </button>
      </div>

      <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="border border-[var(--line)] rounded-full px-4 py-2 text-sm bg-white">
        <option value="">كل الأصناف</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--cream-dim)] text-[var(--ink-soft)] text-xs uppercase">
            <tr>
              <th className="text-right p-3">المنتج</th>
              <th className="text-right p-3">الصنف</th>
              <th className="text-right p-3">السعر</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-[var(--line)]">
                <td className="p-3 font-semibold">
                  {p.name}
                  {p.needs_review && (
                    <span className="ms-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">راجع السعر</span>
                  )}
                </td>
                <td className="p-3 text-[var(--ink-soft)]">{catName(p.category_id)}</td>
                <td className="p-3">{formatEGP(p.price)}{p.price_large ? ` / ${formatEGP(p.price_large)}` : ""}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleAvailable(p)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.is_available ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}
                  >
                    {p.is_available ? "متاح" : "غير متاح"}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => openEdit(p)} className="text-xs font-semibold me-3" style={{ color: "var(--red)" }}>تعديل</button>
                  <button onClick={() => remove(p.id)} className="text-xs font-semibold text-gray-500">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <form onSubmit={save} className="relative bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
            <h2 className="font-display text-xl font-semibold mb-2">{form.id ? "تعديل صنف" : "إضافة صنف جديد"}</h2>

            <FormField label="الصنف (تصنيف)">
              <select value={form.category_id} onChange={(e) => set("category_id")(e.target.value)} required className="w-full border border-[var(--line)] rounded-xl px-3 py-2 text-sm">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="اسم المنتج">
              <input value={form.name} onChange={(e) => set("name")(e.target.value)} required className="w-full border border-[var(--line)] rounded-xl px-3 py-2 text-sm" />
            </FormField>
            <FormField label="الوصف">
              <textarea value={form.description} onChange={(e) => set("description")(e.target.value)} rows={2} className="w-full border border-[var(--line)] rounded-xl px-3 py-2 text-sm resize-none" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="السعر (وسط)">
                <input type="number" step="0.01" value={form.price} onChange={(e) => set("price")(e.target.value)} required className="w-full border border-[var(--line)] rounded-xl px-3 py-2 text-sm" />
              </FormField>
              <FormField label="السعر (كبير) - اختياري">
                <input type="number" step="0.01" value={form.price_large} onChange={(e) => set("price_large")(e.target.value)} className="w-full border border-[var(--line)] rounded-xl px-3 py-2 text-sm" />
              </FormField>
            </div>
            <FormField label="صورة المنتج">
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} className="text-xs" />
              {uploading && <p className="text-xs text-[var(--ink-soft)] mt-1">جاري الرفع...</p>}
              {form.image_url && <img src={form.image_url} alt="" className="w-20 h-20 object-cover rounded-lg mt-2" />}
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_available} onChange={(e) => set("is_available")(e.target.checked)} />
              متاح للطلب
            </label>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-full font-semibold border border-[var(--line)]">إلغاء</button>
              <button className="flex-1 py-2.5 rounded-full font-bold text-white" style={{ background: "var(--red)" }}>حفظ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold block mb-1">{label}</span>
      {children}
    </label>
  );
}

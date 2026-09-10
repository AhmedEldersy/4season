import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const push = useToastStore((s) => s.push);

  const load = () => {
    api.get("/admin/categories").then((res) => setCategories(res.data));
  };
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/admin/categories", { name, sort_order: categories.length });
    setName("");
    push("تمت إضافة الصنف", "success");
    load();
  };

  const rename = async (cat, newName) => {
    if (!newName || newName === cat.name) return;
    await api.patch(`/admin/categories/${cat.id}`, { ...cat, name: newName });
    load();
  };

  const toggleActive = async (cat) => {
    await api.patch(`/admin/categories/${cat.id}`, { ...cat, is_active: !cat.is_active });
    load();
  };

  const remove = async (id) => {
    if (!confirm("حذف هذا الصنف؟ (لازم متبقاش فيه منتجات)")) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      push("تم الحذف", "success");
      load();
    } catch (err) {
      push(getErrorMessage(err, "تعذر الحذف — تأكد إن الصنف فاضي من المنتجات"), "error");
    }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold">إدارة الأصناف</h1>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم صنف جديد..."
          className="flex-1 border border-[var(--line)] rounded-full px-4 py-2.5 text-sm bg-white"
        />
        <button className="px-5 py-2.5 rounded-full font-bold text-white text-sm" style={{ background: "var(--red)" }}>إضافة</button>
      </form>

      <div className="bg-white border border-[var(--line)] rounded-2xl divide-y divide-[var(--line)]">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 p-4">
            <input
              defaultValue={cat.name}
              onBlur={(e) => rename(cat, e.target.value)}
              className="flex-1 font-semibold bg-transparent focus-ring rounded px-1"
            />
            <button
              onClick={() => toggleActive(cat)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}
            >
              {cat.is_active ? "مفعل" : "مخفي"}
            </button>
            <button onClick={() => remove(cat.id)} className="text-xs font-semibold text-gray-500">حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}

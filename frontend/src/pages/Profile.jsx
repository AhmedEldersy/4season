import { useState } from "react";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { Field } from "./Login";

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "", address: user.address || "" });
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch("/auth/me", form);
      setUser(res.data);
      push("تم تحديث بياناتك", "success");
    } catch {
      push("حصل خطأ أثناء الحفظ", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-semibold mb-1">الملف الشخصي</h1>
      <p className="text-[var(--ink-soft)] mb-8">{user.email}</p>

      <form onSubmit={save} className="space-y-4">
        <Field label="الاسم الكامل" value={form.name} onChange={set("name")} required />
        <Field label="رقم الموبايل" type="tel" value={form.phone} onChange={set("phone")} />
        <Field label="العنوان المفضل" value={form.address} onChange={set("address")} />

        <button
          disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-60"
          style={{ background: "var(--red)" }}
        >
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}

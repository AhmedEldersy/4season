import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { API_URL } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { Field } from "./Login";
import logoIcon from "../assets/brand/logo-icon-transparent.png";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      push("كلمة المرور غير متطابقة", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setAuth(res.data.access_token, res.data.user);
      push(`أهلاً بيك في 4Season، ${form.name.split(" ")[0]}!`, "success");
      navigate("/");
    } catch (err) {
      push(err.response?.data?.detail || "حصل خطأ، جرب تاني", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <img src={logoIcon} alt="4Seasons" className="h-16 w-auto mx-auto mb-4" />
      <h1 className="font-display text-3xl font-semibold mb-1 text-center">إنشاء حساب</h1>
      <p className="text-[var(--ink-soft)] mb-8 text-center">هيستغرق دقيقة بس</p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="الاسم الكامل" value={form.name} onChange={set("name")} required />
        <Field label="البريد الإلكتروني" type="email" value={form.email} onChange={set("email")} required />
        <Field label="رقم الموبايل" type="tel" value={form.phone} onChange={set("phone")} required />
        <Field label="كلمة المرور" type="password" value={form.password} onChange={set("password")} required />
        <Field label="تأكيد كلمة المرور" type="password" value={form.confirm} onChange={set("confirm")} required />

        <button
          disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-60"
          style={{ background: "var(--red)" }}
        >
          {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-[var(--line)] flex-1" />
        <span className="text-xs text-[var(--ink-soft)]">أو</span>
        <div className="h-px bg-[var(--line)] flex-1" />
      </div>

      <a
        href={`${API_URL}/auth/google/login`}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold border border-[var(--line)] hover:bg-[var(--cream-dim)] transition-colors"
      >
        المتابعة باستخدام جوجل
      </a>

      <p className="text-center text-sm text-[var(--ink-soft)] mt-8">
        عندك حساب بالفعل؟ <Link to="/login" className="font-semibold" style={{ color: "var(--red)" }}>سجل دخولك</Link>
      </p>
    </div>
  );
}

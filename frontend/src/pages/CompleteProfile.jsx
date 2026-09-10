import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { Field } from "./Login";
import logoIcon from "../assets/brand/logo-icon-transparent.png";

// Google sign-in only ever hands us a name + email. RequireAuth sends any
// signed-in user with no phone on file here -- there's no way to reach
// checkout, the menu actions, or /orders until this is submitted. Once
// saved, /auth/me's profile_complete flips to true permanently for that
// account (this isn't a one-time checkout-only question).
export default function CompleteProfile() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      push("رقم الموبايل مطلوب عشان نقدر نكمّل طلباتك", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.patch("/auth/me", { name, phone });
      setAuth(token, res.data);
      push("تم حفظ بياناتك، أهلاً بيك!", "success");
      navigate(location.state?.from?.pathname || "/");
    } catch (err) {
      push(err.response?.data?.detail || "حصل خطأ، جرب تاني", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <img src={logoIcon} alt="4Seasons" className="h-16 w-auto mx-auto mb-4" />
      <h1 className="font-display text-3xl font-semibold mb-1 text-center">كمّل بياناتك</h1>
      <p className="text-[var(--ink-soft)] mb-8 text-center">
        قبل ما تكمل، محتاجين رقم موبايلك عشان نقدر نوصلك ونتابع طلباتك.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="الاسم الكامل" value={name} onChange={setName} required />
        <Field label="البريد الإلكتروني" value={user?.email || ""} onChange={() => {}} disabled />
        <Field label="رقم الموبايل" type="tel" value={phone} onChange={setPhone} required placeholder="01xxxxxxxxx" />

        <button
          disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-60"
          style={{ background: "var(--red)" }}
        >
          {loading ? "جاري الحفظ..." : "حفظ ومتابعة"}
        </button>
      </form>
    </div>
  );
}

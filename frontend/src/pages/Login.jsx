import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { API_URL } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import logoIcon from "../assets/brand/logo-icon-transparent.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data.access_token, res.data.user);
      push(`أهلاً بيك تاني، ${res.data.user.name.split(" ")[0]}!`, "success");
      // Admin/owner accounts logging in from the customer page land straight
      // in the admin panel instead of the customer homepage -- otherwise it
      // looks like "nothing happened" even though login succeeded.
      const role = res.data.user.role;
      if (role === "ADMIN" || role === "OWNER") {
        navigate("/admin");
      } else {
        navigate(location.state?.from?.pathname || "/");
      }
    } catch (err) {
      push(err.response?.data?.detail || "الإيميل أو الباسورد غلط", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <img src={logoIcon} alt="4Seasons" className="h-16 w-auto mx-auto mb-4" />
      <h1 className="font-display text-3xl font-semibold mb-1 text-center">تسجيل الدخول</h1>
      <p className="text-[var(--ink-soft)] mb-8 text-center">اتصل بحسابك عشان تكمل طلبك</p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} required />
        <Field label="كلمة المرور" type="password" value={password} onChange={setPassword} required />

        <button
          disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-60"
          style={{ background: "var(--red)" }}
        >
          {loading ? "جاري الدخول..." : "دخول"}
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
        <GoogleIcon /> المتابعة باستخدام جوجل
      </a>

      <p className="text-center text-sm text-[var(--ink-soft)] mt-8">
        مالكش حساب؟ <Link to="/register" className="font-semibold" style={{ color: "var(--red)" }}>سجل دلوقتي</Link>
      </p>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, required, placeholder, disabled }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold block mb-1.5">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={type === "tel" ? 11 : undefined}
        inputMode={type === "tel" ? "numeric" : undefined}
        onChange={(e) => {
          // Egyptian mobile numbers are digits only, 11 chars -- strip
          // anything else as the user types instead of only rejecting on
          // submit, so it's obvious immediately why a keystroke did nothing.
          const next = type === "tel" ? e.target.value.replace(/\D/g, "").slice(0, 11) : e.target.value;
          onChange(next);
        }}
        className="w-full border border-[var(--line)] rounded-xl px-4 py-3 text-sm focus-ring bg-white disabled:bg-[var(--cream-dim)] disabled:text-[var(--ink-soft)]"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.2 3 9.5 7.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.4 26.7 37 24 37c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.4 40.6 16.1 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36.3 44 30.7 44 24c0-1.4-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

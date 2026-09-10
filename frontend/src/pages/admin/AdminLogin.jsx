import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import logoIcon from "../../assets/brand/logo-icon-transparent.png";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      if (!["ADMIN", "OWNER"].includes(res.data.user.role)) {
        push("هذا الحساب ليس لديه صلاحيات الإدارة", "error");
        return;
      }
      setAuth(res.data.access_token, res.data.user);
      navigate("/admin");
    } catch (err) {
      push(err.response?.data?.detail || "بيانات الدخول غير صحيحة", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center" style={{ background: "var(--charcoal)" }}>
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl p-8">
        <img src={logoIcon} alt="4Seasons" className="h-14 w-auto mx-auto mb-3" />
        <h1 className="font-display text-2xl font-semibold mb-1 text-center">
          4<span style={{ color: "var(--red)" }}>SEASON</span>
        </h1>
        <p className="text-center text-sm text-[var(--ink-soft)] mb-6">لوحة تحكم المطعم</p>

        <label className="block mb-4">
          <span className="text-sm font-semibold block mb-1.5">البريد الإلكتروني</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[var(--line)] rounded-xl px-4 py-3 text-sm focus-ring"
          />
        </label>
        <label className="block mb-6">
          <span className="text-sm font-semibold block mb-1.5">كلمة المرور</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[var(--line)] rounded-xl px-4 py-3 text-sm focus-ring"
          />
        </label>

        <button
          disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-60"
          style={{ background: "var(--red)" }}
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}

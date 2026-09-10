import { useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ErrorBoundary from "../../components/ErrorBoundary";
import { API_URL } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { useAdminRealtimeStore } from "../../store/adminRealtimeStore";
import { useToastStore } from "../../store/toastStore";
import { playNewOrderChime } from "../../lib/sound";
import ToastContainer from "../../components/ToastContainer";
import logoIcon from "../../assets/brand/logo-icon-transparent.png";

const NAV = [
  { to: "/admin", label: "نظرة عامة", icon: "📊", end: true },
  { to: "/admin/orders", label: "الطلبات", icon: "🧾" },
  { to: "/admin/menu", label: "المنيو", icon: "🍕" },
  { to: "/admin/categories", label: "الأصناف", icon: "🗂️" },
  { to: "/admin/delivery-areas", label: "مناطق التوصيل", icon: "🚗" },
  { to: "/admin/customers", label: "العملاء", icon: "👥" },
  { to: "/admin/analytics", label: "التحليلات", icon: "📈" },
];

export default function AdminLayout() {
  const { user, token, logout } = useAuthStore();
  const { pushEvent, setConnected } = useAdminRealtimeStore();
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const wsRef = useRef(null);

  useEffect(() => {
    // Ask for browser notification permission once, non-blocking.
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const wsUrl = `${API_URL.replace("http", "ws")}/ws/admin?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      pushEvent(msg.event, msg.data);

      if (msg.event === "new_order") {
        playNewOrderChime();
        push(`طلب جديد #${msg.data.order_number} — ${msg.data.total} ج.م`, "success");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("طلب جديد على 4Season", { body: `#${msg.data.order_number} — ${msg.data.total} ج.م` });
        }
      } else if (msg.event === "order_cancelled") {
        push(`تم إلغاء الطلب #${msg.data.order_number}`, "info");
      }
    };

    return () => ws.close();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex" style={{ background: "#F5F3EF" }}>
      <aside className="w-64 shrink-0 hidden lg:flex flex-col text-white" style={{ background: "var(--charcoal)" }}>
        <div className="px-6 py-6 border-b border-white/10">
          <img src={logoIcon} alt="4Seasons" className="h-9 w-auto mb-2 brightness-0 invert opacity-90" />
          <span className="font-display text-xl font-semibold">
            4<span style={{ color: "var(--red)" }}>SEASON</span>
          </span>
          <p className="text-xs text-white/50 mt-0.5">لوحة تحكم المطعم</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-sm font-semibold">{user?.name}</p>
          <button onClick={() => { logout(); navigate("/admin/login"); }} className="text-xs text-white/50 hover:text-white mt-1">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[var(--charcoal)] text-white">
          <span className="font-display font-semibold">4SEASON Admin</span>
          <button onClick={() => { logout(); navigate("/admin/login"); }} className="text-xs text-white/60">خروج</button>
        </div>
        <div className="lg:hidden flex overflow-x-auto gap-2 px-4 py-2 bg-white border-b border-[var(--line)]">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${isActive ? "text-white" : "bg-[var(--cream-dim)]"}`
              }
              style={({ isActive }) => (isActive ? { background: "var(--red)" } : {})}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </div>
        <main className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

import { useToastStore } from "../store/toastStore";

const STYLES = {
  info: "bg-charcoal text-cream",
  success: "bg-emerald-700 text-white",
  error: "bg-red text-white",
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed bottom-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-md w-full sm:w-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[fadein_0.2s_ease] ${
            STYLES[t.type] || STYLES.info
          }`}
          style={{ background: t.type === "error" ? "var(--red)" : t.type === "success" ? "#0f7a4a" : "var(--charcoal)" }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

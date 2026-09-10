export default function EmptyState({ icon = "🍽️", title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="text-5xl mb-4 opacity-60">{icon}</div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-[var(--ink-soft)] mt-1.5 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

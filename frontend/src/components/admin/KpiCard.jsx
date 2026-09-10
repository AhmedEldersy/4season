export default function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
      <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">{label}</p>
      <p className="font-display text-3xl font-semibold mt-2" style={accent ? { color: "var(--red)" } : {}}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--ink-soft)] mt-1">{sub}</p>}
    </div>
  );
}

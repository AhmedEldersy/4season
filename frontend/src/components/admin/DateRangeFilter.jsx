const PRESETS = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "٧ أيام" },
  { value: "30d", label: "٣٠ يوم" },
  { value: "90d", label: "٩٠ يوم" },
  { value: "year", label: "السنة" },
  { value: "all", label: "الكل" },
];

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="inline-flex bg-white border border-[var(--line)] rounded-full p-1 gap-1">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            value === p.value ? "text-white" : "text-[var(--ink-soft)] hover:bg-[var(--cream-dim)]"
          }`}
          style={value === p.value ? { background: "var(--red)" } : {}}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

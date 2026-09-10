import { statusLabelFor, STATUS_COLORS } from "../lib/format";

export default function StatusBadge({ status, orderType, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || ""} ${className}`}
    >
      {statusLabelFor(status, orderType)}
    </span>
  );
}

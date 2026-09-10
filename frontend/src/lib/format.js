export function formatEGP(amount) {
  const n = Number(amount || 0);
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ج.م`;
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return d.toLocaleString("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function secondsUntil(iso) {
  const target = new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime();
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

export function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const STATUS_LABELS = {
  PENDING: "قيد الانتظار",
  ACCEPTED: "تم القبول",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "خارج للتوصيل",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
};

export const STATUS_COLORS = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  ACCEPTED: "bg-blue-100 text-blue-800 border-blue-300",
  PREPARING: "bg-orange-100 text-orange-800 border-orange-300",
  READY: "bg-teal-100 text-teal-800 border-teal-300",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-300",
  DELIVERED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

export const STATUS_FLOW = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

// Pickup orders never go "out for delivery" -- there's no courier leg.
export function statusFlowFor(orderType) {
  return orderType === "PICKUP" ? STATUS_FLOW.filter((s) => s !== "OUT_FOR_DELIVERY") : STATUS_FLOW;
}

// "Delivered" doesn't make sense for a pickup order -- show "picked up" instead.
export function statusLabelFor(status, orderType) {
  if (status === "DELIVERED" && orderType === "PICKUP") return "تم الاستلام";
  return STATUS_LABELS[status] || status;
}

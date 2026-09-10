import { useEffect, useState } from "react";
import api from "../../api/client";
import { formatEGP, formatDate } from "../../lib/format";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.get("/admin/customers", { params: search ? { q: search } : {} })
        .then((res) => setCustomers(res.data))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">العملاء</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="دور بالاسم أو الإيميل..."
          className="border border-[var(--line)] rounded-full px-4 py-2 text-sm bg-white w-64"
        />
      </div>

      <div className="bg-white border border-[var(--line)] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-[var(--cream-dim)] text-[var(--ink-soft)] text-xs uppercase">
            <tr>
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">الهاتف</th>
              <th className="text-right p-3">عدد الطلبات</th>
              <th className="text-right p-3">إجمالي الإنفاق</th>
              <th className="text-right p-3">آخر طلب</th>
              <th className="text-right p-3">تاريخ التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {!loading && customers.map((c) => (
              <tr key={c.id} className="border-t border-[var(--line)]">
                <td className="p-3">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-[var(--ink-soft)]">{c.email}</p>
                </td>
                <td className="p-3">{c.phone || "—"}</td>
                <td className="p-3">{c.orders_count}</td>
                <td className="p-3 font-semibold" style={{ color: "var(--red)" }}>{formatEGP(c.total_spent)}</td>
                <td className="p-3 text-[var(--ink-soft)]">{c.last_order_at ? formatDate(c.last_order_at) : "—"}</td>
                <td className="p-3 text-[var(--ink-soft)]">{formatDate(c.registered_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-4 text-sm text-[var(--ink-soft)]">جاري التحميل...</p>}
        {!loading && customers.length === 0 && <p className="p-4 text-sm text-[var(--ink-soft)]">لا يوجد عملاء</p>}
      </div>
    </div>
  );
}

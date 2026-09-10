import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import api from "../../api/client";
import KpiCard from "../../components/admin/KpiCard";
import StatusBadge from "../../components/StatusBadge";
import { formatEGP, formatDate } from "../../lib/format";

const COLORS = ["#B3222A", "#C99A44", "#1C1512", "#8f1b22", "#4A4038", "#6b5a3f"];

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState({ series: [], orders_by_status: [] });
  const [topProducts, setTopProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const preset = "30d";
    Promise.all([
      api.get("/admin/analytics/overview", { params: { preset } }),
      api.get("/admin/analytics/revenue", { params: { preset } }),
      api.get("/admin/analytics/products", { params: { preset, limit: 5 } }),
      api.get("/admin/analytics/categories", { params: { preset } }),
      api.get("/admin/analytics/peak-hours", { params: { preset } }),
      api.get("/admin/orders"),
    ]).then(([ov, rev, prod, cat, peak, orders]) => {
      setOverview(ov.data);
      setRevenue(rev.data);
      setTopProducts(prod.data);
      setCategories(cat.data);
      setPeakHours(peak.data.hours);
      setRecentOrders(orders.data.slice(0, 6));
    });
  }, []);

  if (!overview) return <p className="text-[var(--ink-soft)]">جاري تحميل البيانات...</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold">نظرة عامة</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الإيرادات" value={formatEGP(overview.total_revenue)} accent />
        <KpiCard label="إجمالي الطلبات" value={overview.total_orders} />
        <KpiCard label="متوسط قيمة الطلب" value={formatEGP(overview.average_order_value)} />
        <KpiCard label="إجمالي العملاء" value={overview.total_customers} />
        <KpiCard label="إيرادات اليوم" value={formatEGP(overview.today_revenue)} accent />
        <KpiCard label="طلبات اليوم" value={overview.today_orders} />
        <KpiCard label="طلبات معلقة" value={overview.pending_orders} />
        <KpiCard label="طلبات مكتملة" value={overview.completed_orders} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="font-bold mb-4">الإيرادات (آخر 30 يوم)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue.series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B3222A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#B3222A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatEGP(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#B3222A" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="font-bold mb-4">الإيرادات حسب الصنف</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categories} dataKey="revenue" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {categories.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatEGP(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="font-bold mb-4">الأكثر مبيعاً</h2>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold text-white" style={{ background: "var(--charcoal)" }}>
                    {i + 1}
                  </span>
                  {p.name}
                </span>
                <span className="text-[var(--ink-soft)]">{p.units_sold} قطعة</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="font-bold mb-4">أوقات الذروة</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}:00`} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(h) => `الساعة ${h}:00`} />
              <Bar dataKey="orders" fill="#C99A44" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="font-bold mb-4">حالة الطلبات</h2>
          <div className="space-y-2">
            {revenue.orders_by_status.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <StatusBadge status={s.status} orderType={s.order_type} />
                <span className="text-sm font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">أحدث الطلبات</h2>
          <Link to="/admin/orders" className="text-sm font-semibold" style={{ color: "var(--red)" }}>عرض الكل ←</Link>
        </div>
        <div className="space-y-2">
          {recentOrders.map((o) => (
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-[var(--line)] last:border-0 text-sm">
              <span className="font-semibold">#{o.order_number}</span>
              <span className="text-[var(--ink-soft)]">{o.customer_name}</span>
              <span className="text-[var(--ink-soft)] hidden sm:inline">{formatDate(o.created_at)}</span>
              <span className="font-semibold">{formatEGP(o.total)}</span>
              <StatusBadge status={o.status} orderType={o.order_type} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

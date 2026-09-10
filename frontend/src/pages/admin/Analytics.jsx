import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../../api/client";
import DateRangeFilter from "../../components/admin/DateRangeFilter";
import KpiCard from "../../components/admin/KpiCard";
import { formatEGP } from "../../lib/format";

const COLORS = ["#B3222A", "#C99A44", "#1C1512", "#8f1b22", "#4A4038", "#6b5a3f", "#a8825a"];

export default function Analytics() {
  const [preset, setPreset] = useState("30d");
  const [revenue, setRevenue] = useState({ series: [], orders_by_status: [] });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState(null);
  const [peak, setPeak] = useState({ hours: [], days: [] });
  const [cancellations, setCancellations] = useState(null);
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    const params = { preset };
    api.get("/admin/analytics/revenue", { params }).then((r) => setRevenue(r.data));
    api.get("/admin/analytics/products", { params: { ...params, limit: 10 } }).then((r) => setProducts(r.data));
    api.get("/admin/analytics/categories", { params }).then((r) => setCategories(r.data));
    api.get("/admin/analytics/customers", { params }).then((r) => setCustomers(r.data));
    api.get("/admin/analytics/peak-hours", { params }).then((r) => setPeak(r.data));
    api.get("/admin/analytics/cancellations", { params }).then((r) => setCancellations(r.data));
    api.get("/admin/analytics/delivery", { params }).then((r) => setDelivery(r.data));
  }, [preset]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">التحليلات</h1>
        <DateRangeFilter value={preset} onChange={setPreset} />
      </div>

      {/* Revenue + orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="الإيرادات عبر الوقت">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenue.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatEGP(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#B3222A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="عدد الطلبات عبر الوقت">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenue.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#1C1512" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Products + categories */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="أفضل المنتجات مبيعاً">
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {products.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--line)] last:border-0">
                <span>{i + 1}. {p.name}</span>
                <span className="text-[var(--ink-soft)]">{p.units_sold} قطعة</span>
                <span className="font-semibold" style={{ color: "var(--red)" }}>{formatEGP(p.revenue)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="الإيرادات حسب الصنف">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categories} dataKey="revenue" nameKey="category" outerRadius={90} label={(e) => e.category}>
                {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatEGP(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Peak hours/days */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="أوقات الذروة (بالساعة)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={peak.hours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}:00`} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(h) => `الساعة ${h}:00`} />
              <Bar dataKey="orders" fill="#C99A44" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="أكثر أيام الأسبوع نشاطاً">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={peak.days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, n) => (n === "revenue" ? formatEGP(v) : v)} />
              <Bar dataKey="orders" fill="#1C1512" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Customers + cancellations */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="إحصائيات العملاء">
          {customers && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <KpiCard label="عملاء جدد" value={customers.new_customers} />
              <KpiCard label="عملاء متكررين" value={customers.returning_customers} />
              <KpiCard label="إجمالي" value={customers.total_customers} />
            </div>
          )}
          <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase mb-2">أفضل العملاء إنفاقاً</p>
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
            {customers?.top_customers.map((c) => (
              <div key={c.email} className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="font-semibold" style={{ color: "var(--red)" }}>{formatEGP(c.spent)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="تحليل الإلغاءات">
          {cancellations && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <KpiCard label="عدد الإلغاءات" value={cancellations.cancelled_count} />
                <KpiCard label="نسبة الإلغاء" value={`${cancellations.cancellation_rate_pct}%`} accent />
                <KpiCard label="إيرادات مفقودة" value={formatEGP(cancellations.revenue_lost)} />
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={cancellations.trend}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#B3222A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </ChartCard>
      </div>

      {/* Delivery vs pickup + areas + payment methods */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ChartCard title="استلام مقابل توصيل">
          {delivery && delivery.order_type_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={delivery.order_type_distribution}
                  dataKey="orders"
                  nameKey="order_type"
                  outerRadius={85}
                  label={(e) => (e.order_type === "PICKUP" ? "استلام" : "توصيل")}
                >
                  {delivery.order_type_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v} طلب`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="الطلبات والإيرادات حسب منطقة التوصيل">
          {delivery && delivery.by_area.length > 0 ? (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {delivery.by_area.map((a) => (
                <div key={a.area} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--line)] last:border-0">
                  <span>{a.area}</span>
                  <span className="text-[var(--ink-soft)]">{a.orders} طلب</span>
                  <span className="font-semibold" style={{ color: "var(--red)" }}>{formatEGP(a.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart hint="مفيش طلبات توصيل في المدة دي، أو لسه مفيش مناطق مضافة." />
          )}
        </ChartCard>

        <ChartCard title="طرق الدفع">
          {delivery && delivery.payment_methods.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={delivery.payment_methods} dataKey="orders" nameKey="payment_method" outerRadius={85} label={(e) => e.payment_method}>
                  {delivery.payment_methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v} طلب`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyChart({ hint = "لا توجد بيانات كافية في هذه الفترة." }) {
  return <p className="text-sm text-[var(--ink-soft)] text-center py-10">{hint}</p>;
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
      <h2 className="font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import logoIcon from "../assets/brand/logo-icon-transparent.png";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api.get("/products").then((res) => setFeatured(res.data.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--charcoal)" }}>
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative grid md:grid-cols-2 gap-10 items-center">
          <div className="text-cream">
            <p className="text-[var(--gold)] font-semibold text-sm tracking-wide mb-4">مطعم 4SEASON — سمنود</p>
            <h1 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.1] text-white">
              طعم كل موسم،<br /> في طلب واحد.
            </h1>
            <p className="mt-5 text-white/70 text-base sm:text-lg max-w-md leading-relaxed">
              بيتزا، كريب، برجر وباستا من مطبخنا لباب بيتك. اطلب أونلاين وتابع طلبك لحظة بلحظة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="px-7 py-3.5 rounded-full font-bold text-white transition-transform hover:scale-[1.03]"
                style={{ background: "var(--red)" }}
              >
                اطلب دلوقتي
              </Link>
              <a
                href="#about"
                className="px-7 py-3.5 rounded-full font-semibold text-white border border-white/25 hover:bg-white/10 transition-colors"
              >
                تعرف علينا
              </a>
            </div>
          </div>

          <div className="relative hidden md:flex flex-col items-center justify-center">
            <img
              src={logoIcon}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain opacity-[0.08] brightness-0 invert select-none pointer-events-none"
            />
            <div className="relative w-64 h-64 rounded-full border border-[var(--gold)]/30 grid place-items-center">
              <div className="w-48 h-48 rounded-full border border-[var(--gold)]/50 bg-white grid place-items-center p-6">
                <img src={logoIcon} alt="4Seasons" className="w-full h-full object-contain" />
              </div>
            </div>
            <p className="relative mt-6 font-display text-white text-xl text-center leading-snug">
              مش بنشبعك<br />بنبسطك
            </p>
          </div>
        </div>
      </section>

      <p className="md:hidden text-center text-white/70 text-sm -mt-2 pb-6" style={{ background: "var(--charcoal)" }}>
        مش بنشبعك بنبسطك
      </p>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid sm:grid-cols-3 gap-6">
        {[
          { icon: "🚴", title: "توصيل سريع", text: "طلبك يوصلك سخن في أسرع وقت." },
          { icon: "⏱️", title: "10 دقايق للإلغاء", text: "غيّرت رأيك؟ تقدر تلغي الطلب خلال 10 دقايق." },
          { icon: "🧾", title: "الدفع عند الاستلام", text: "ادفع كاش لما يوصلك الطلب، بكل بساطة." },
        ].map((f) => (
          <div key={f.title} className="text-center p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold">{f.title}</h3>
            <p className="text-sm text-[var(--ink-soft)] mt-1.5">{f.text}</p>
          </div>
        ))}
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold">الأكتر طلباً</h2>
            <Link to="/menu" className="text-sm font-semibold hover:text-[var(--red)]">
              كل المنيو ←
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={setActive} />
            ))}
          </div>
        </section>
      )}

      <section id="about" className="border-t border-[var(--line)] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid sm:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-2xl font-semibold mb-3">عنّا</h2>
            <p className="text-[var(--ink-soft)] leading-relaxed">
              4Season مطعم في سمنود - الشحاتية، برج المختار، بنقدملكم بيتزا وكريب وسندوتشات وباستا طازة كل يوم.
              حابين نبسطكم مش بس نشبعكم.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold mb-3">تواصل معانا</h2>
            <ul className="text-[var(--ink-soft)] space-y-1.5">
              <li>📍 سمنود - الشحاتية - برج المختار، شارع المدارس، بجوار مدرسة الاعدادية بنات</li>
              <li>📞 010 3001 5028 — 012 7656 5357</li>
            </ul>
          </div>
        </div>
      </section>

      <ProductModal product={active} onClose={() => setActive(null)} />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import ProductModal from "../components/ProductModal";
import EmptyState from "../components/EmptyState";

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/categories"), api.get("/products")])
      .then(([catsRes, prodRes]) => {
        setCategories(catsRes.data);
        setProducts(prodRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeCategory !== "all") params.category_id = activeCategory;
    if (debounced) params.q = debounced;
    api
      .get("/products", { params })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [activeCategory, debounced]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all" || debounced) return { all: products };
    const map = {};
    for (const cat of categories) map[cat.id] = [];
    for (const p of products) {
      if (!map[p.category_id]) map[p.category_id] = [];
      map[p.category_id].push(p);
    }
    return map;
  }, [products, categories, activeCategory, debounced]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">المنيو</h1>
        <p className="text-[var(--ink-soft)] mt-1">اختار من تشكيلتنا واطلب دلوقتي</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="دور على أكلة، صنف..."
          className="w-full border border-[var(--line)] rounded-full py-3 px-5 pr-11 text-sm focus-ring bg-white"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50">🔍</span>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <Chip active={activeCategory === "all"} onClick={() => setActiveCategory("all")} label="الكل" />
        {categories.map((c) => (
          <Chip key={c.id} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)} label={c.name} />
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon="🍽️" title="محدش لقيناله نتيجة" subtitle="جرب كلمة تانية أو اختار صنف مختلف." />
      ) : activeCategory !== "all" || debounced ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={setActive} />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((cat) =>
            grouped[cat.id]?.length ? (
              <div key={cat.id} id={`cat-${cat.id}`}>
                <h2 className="font-display text-xl font-semibold mb-4">{cat.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  {grouped[cat.id].map((p) => (
                    <ProductCard key={p.id} product={p} onOpen={setActive} />
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <ProductModal product={active} onClose={() => setActive(null)} />
    </div>
  );
}

function Chip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
        active ? "text-white border-transparent" : "border-[var(--line)] bg-white hover:border-[var(--red)]"
      }`}
      style={active ? { background: "var(--red)" } : {}}
    >
      {label}
    </button>
  );
}

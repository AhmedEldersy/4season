import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import logoIcon from "../assets/brand/logo-icon-transparent.png";

const links = [
  { to: "/", label: "الرئيسية" },
  { to: "/menu", label: "المنيو" },
  { to: "/orders", label: "طلباتي" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const count = useCartStore((s) => s.count());
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[var(--cream)]/95 backdrop-blur border-b border-[var(--line)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoIcon} alt="4Seasons" className="h-10 w-auto" />
          <span className="font-display text-2xl font-semibold tracking-tight">
            4<span style={{ color: "var(--red)" }}>SEASON</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `transition-colors hover:text-[var(--red)] ${isActive ? "text-[var(--red)]" : "text-[var(--ink)]"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            className="relative w-10 h-10 grid place-items-center rounded-full hover:bg-[var(--cream-dim)] transition-colors focus-ring"
            aria-label="السلة"
          >
            <CartIcon />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[var(--red)] text-white text-[11px] font-bold rounded-full w-5 h-5 grid place-items-center">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/profile" className="text-sm font-medium hover:text-[var(--red)]">
                {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="text-sm text-[var(--ink-soft)] hover:text-[var(--red)]"
              >
                خروج
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm font-semibold px-4 py-2 rounded-full bg-[var(--charcoal)] text-white hover:bg-[var(--red)] transition-colors"
            >
              تسجيل الدخول
            </Link>
          )}

          <button
            className="md:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-[var(--cream-dim)]"
            onClick={() => setOpen((o) => !o)}
            aria-label="القائمة"
            aria-expanded={open}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--line)] bg-[var(--cream)] px-4 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="py-2.5 text-[15px] font-medium border-b border-[var(--line)] last:border-0"
            >
              {l.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <NavLink to="/profile" onClick={() => setOpen(false)} className="py-2.5 text-[15px] font-medium border-b border-[var(--line)]">
                الملف الشخصي
              </NavLink>
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                  navigate("/");
                }}
                className="py-2.5 text-[15px] font-medium text-right text-[var(--red)]"
              >
                تسجيل الخروج
              </button>
            </>
          ) : (
            <NavLink to="/login" onClick={() => setOpen(false)} className="py-2.5 text-[15px] font-semibold text-[var(--red)]">
              تسجيل الدخول
            </NavLink>
          )}
        </div>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" />
      <path d="M2.5 3h2l2.2 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

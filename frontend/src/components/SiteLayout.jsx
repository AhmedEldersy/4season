import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import ToastContainer from "./ToastContainer";
import logoIcon from "../assets/brand/logo-icon-transparent.png";

export default function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--ink-soft)]">
        <img src={logoIcon} alt="4Seasons" className="h-14 w-auto mx-auto mb-2" />
        <p className="font-display text-lg font-semibold mb-1">
          4<span style={{ color: "var(--red)" }}>SEASON</span>
        </p>
        <p>© {new Date().getFullYear()} 4Season Restaurant — سمنود</p>
      </footer>
      <ToastContainer />
    </div>
  );
}

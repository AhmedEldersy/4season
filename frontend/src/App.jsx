import { BrowserRouter, Routes, Route } from "react-router-dom";

import SiteLayout from "./components/SiteLayout";
import { RequireAuth, RequireAdmin } from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import OrderTracking from "./pages/OrderTracking";
import OrderHistory from "./pages/OrderHistory";
import OAuthCallback from "./pages/OAuthCallback";
import CompleteProfile from "./pages/CompleteProfile";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import AdminOrders from "./pages/admin/AdminOrders";
import MenuManagement from "./pages/admin/MenuManagement";
import Categories from "./pages/admin/Categories";
import Customers from "./pages/admin/Customers";
import Analytics from "./pages/admin/Analytics";
import DeliveryAreas from "./pages/admin/DeliveryAreas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/complete-profile" element={<RequireAuth><CompleteProfile /></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><OrderHistory /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderTracking /></RequireAuth>} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Overview />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="categories" element={<Categories />} />
          <Route path="delivery-areas" element={<DeliveryAreas />} />
          <Route path="customers" element={<Customers />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center text-center px-4">
      <div>
        <p className="font-display text-6xl font-semibold mb-3">404</p>
        <p className="text-[var(--ink-soft)]">الصفحة غير موجودة</p>
      </div>
    </div>
  );
}

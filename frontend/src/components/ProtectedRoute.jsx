import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function RequireAuth({ children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  // Google sign-ins can land here with a name+email and nothing else --
  // profile_complete (computed server-side from the phone on file) gates
  // every customer-facing action, not just checkout, until it's filled in.
  if (!user.profile_complete && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }
  return children;
}

export function RequireAdmin({ children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  if (!["ADMIN", "OWNER"].includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

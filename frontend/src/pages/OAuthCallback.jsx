import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token");
    if (!token) {
      navigate("/login");
      return;
    }
    useAuthStore.setState({ token });
    api
      .get("/auth/me")
      .then((res) => {
        setAuth(token, res.data);
        // Google only ever hands us name+email -- send anyone without a
        // phone on file straight to the mandatory profile step instead of
        // home, rather than waiting for them to hit a RequireAuth page.
        if (!res.data.profile_complete) {
          navigate("/complete-profile");
          return;
        }
        push(`أهلاً بيك، ${res.data.name.split(" ")[0]}!`, "success");
        navigate("/");
      })
      .catch(() => navigate("/login"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[50vh] grid place-items-center">
      <p className="text-[var(--ink-soft)]">جاري تسجيل الدخول...</p>
    </div>
  );
}

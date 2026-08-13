import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export const startGoogleLogin = () => {
  const redirectUrl = window.location.origin + "/account";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

export default function AuthCallback() {
  const location = useLocation();
  const nav = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sessionId = new URLSearchParams(location.hash.replace(/^#/, "")).get("session_id");
    const target = location.pathname || "/account";
    (async () => {
      try {
        await api.post("/auth/session", {}, { headers: { "X-Session-ID": sessionId } });
        window.history.replaceState({}, "", target);
        window.location.replace(target);
      } catch (e) {
        toast.error(apiError(e));
        window.history.replaceState({}, "", "/login");
        nav("/login", { replace: true });
      }
    })();
  }, [location, nav]);

  return (
    <div className="min-h-[60vh] grid place-items-center" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="overline mt-6">Signing you in</p>
      </div>
    </div>
  );
}

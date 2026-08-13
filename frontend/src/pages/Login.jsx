import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { startGoogleLogin } from "@/pages/AuthCallback";
import { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const { login, register, user } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/";

  useEffect(() => { if (user) nav(next); }, [user, next, nav]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      toast.success("Welcome to INFYKRAQ");
      nav(next);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-16 pb-24" data-testid="login-page">
      <p className="overline">{mode === "login" ? "Welcome back" : "Create account"}</p>
      <h1 className="font-display text-4xl tracking-tighter mt-2">
        {mode === "login" ? "Sign in" : "Join INFYKRAQ"}
      </h1>

      <form onSubmit={submit} className="mt-10 space-y-6">
        {mode === "register" && (
          <>
            <div>
              <Label className="overline">Full name</Label>
              <Input required value={form.name} onChange={set("name")} className="field-line h-11 mt-2" data-testid="register-name" />
            </div>
            <div>
              <Label className="overline">Phone</Label>
              <Input value={form.phone} onChange={set("phone")} className="field-line h-11 mt-2" data-testid="register-phone" />
            </div>
          </>
        )}
        <div>
          <Label className="overline">Email</Label>
          <Input required type="email" value={form.email} onChange={set("email")} className="field-line h-11 mt-2" data-testid="login-email" />
        </div>
        <div>
          <Label className="overline">Password</Label>
          <Input required type="password" minLength={6} value={form.password} onChange={set("password")} className="field-line h-11 mt-2" data-testid="login-password" />
        </div>
        <Button type="submit" disabled={busy} className="btn-emerald w-full h-12 text-xs tracking-widest" data-testid="login-submit">
          {busy ? "PLEASE WAIT..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </Button>
      </form>

      <div className="flex items-center gap-4 my-8">
        <span className="h-px flex-1 bg-border" />
        <span className="overline text-[10px]">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={startGoogleLogin}
        className="w-full h-12 rounded-sm text-xs tracking-widest gap-3"
        data-testid="google-login-btn"
      >
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.5c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.7-10.3 6.7-17.4z" />
          <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2 1.4-4.8 2.4-7.8 2.4-6.4 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        CONTINUE WITH GOOGLE
      </Button>

      <button
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-sm text-muted-foreground mt-8 hover:text-foreground transition-colors"
        data-testid="toggle-auth-mode"
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
      <p className="text-xs text-muted-foreground mt-8">
        By continuing you agree to INFYKRAQ's terms. Need help? <Link to="/" className="underline">Contact us</Link>
      </p>
    </div>
  );
}

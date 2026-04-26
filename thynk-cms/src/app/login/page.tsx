"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [logo,     setLogo]     = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("theme_config").select("key,value").eq("key", "logo_url").single()
      .then(({ data }) => { if (data?.value) setLogo(data.value); });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      window.location.href = profile?.role === "admin" ? "/admin/dashboard" : "/portal/dashboard";
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0F0C0A 0%, #1C1410 40%, #2C1E10 100%)",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Background decoration */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,97,26,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,96,53,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "30%", left: "15%", width: 2, height: 120, background: "linear-gradient(to bottom, transparent, rgba(232,97,26,0.2), transparent)", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: "60%", right: "20%", width: 2, height: 80, background: "linear-gradient(to bottom, transparent, rgba(168,96,53,0.15), transparent)", borderRadius: 2 }} />
      </div>

      {/* Card */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 460,
        margin: "0 20px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "48px 44px 40px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {logo ? (
            <img
              src={logo}
              alt="Thynk Success"
              style={{ height: 52, objectFit: "contain", maxWidth: 200, margin: "0 auto", display: "block" }}
            />
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg, #E8611A, #C4501A)", boxShadow: "0 8px 24px rgba(232,97,26,0.35)" }}>
              <span style={{ color: "white", fontWeight: 800, fontSize: 26, fontFamily: "Georgia, serif" }}>T</span>
            </div>
          )}

          {/* Title */}
          <div style={{ marginTop: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF", margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Thynk Success
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 }}>
              Client Information System
            </p>
          </div>

          {/* Divider */}
          <div style={{ margin: "24px auto 0", width: 40, height: 2, background: "linear-gradient(to right, transparent, #E8611A, transparent)", borderRadius: 2 }} />
        </div>

        {/* Welcome text */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.9)", margin: "0 0 6px" }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.5 }}>
            Sign in to access your dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                fontSize: 14,
                color: "#FFFFFF",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(232,97,26,0.6)"; e.target.style.background = "rgba(255,255,255,0.09)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "13px 44px 13px 16px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 14,
                  color: "#FFFFFF",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(232,97,26,0.6)"; e.target.style.background = "rgba(255,255,255,0.09)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "inherit", padding: 0 }}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "11px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10 }}>
              <p style={{ fontSize: 13, color: "#FCA5A5", margin: 0 }}>⚠ {error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: 4,
              background: loading ? "rgba(232,97,26,0.5)" : "linear-gradient(135deg, #E8611A, #D4501A)",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              color: "#FFFFFF",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
              boxShadow: loading ? "none" : "0 4px 20px rgba(232,97,26,0.35)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = "translateY(0)"; }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Signing in...
              </span>
            ) : "Sign In →"}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
          Access is by invitation only.<br />Contact your administrator for access.
        </p>
      </div>

      {/* Bottom brand */}
      <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center" }}>
        <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.15)", margin: 0 }}>
          © {new Date().getFullYear()} Thynk Success · Client Information System
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(44,28,16,0.95) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
      `}</style>
    </div>
  );
}

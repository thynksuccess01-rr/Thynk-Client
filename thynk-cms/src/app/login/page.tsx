"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      // Hard redirect — bypass Next.js router entirely
      if (profile?.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/portal/dashboard";
      }
    }

    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #2C1A0F 0%, #3D2314 40%, #1A0F08 100%)" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", marginBottom: 16 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#D4A843", fontFamily: "Georgia, serif" }}>T</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#FAF4E8", fontFamily: "Georgia, serif", margin: "0 0 8px" }}>Thynk CMS</h1>
          <p style={{ fontSize: 14, color: "#C27B4A", margin: 0 }}>Client Management Platform</p>
        </div>

        <div style={{ background: "rgba(253,250,245,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(237,217,176,0.15)", borderRadius: 20, padding: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#FAF4E8", margin: "0 0 24px" }}>Sign in to your account</h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#C27B4A", marginBottom: 6 }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{ width: "100%", padding: "12px 16px", background: "rgba(253,250,245,0.07)", border: "1px solid rgba(237,217,176,0.2)", borderRadius: 12, color: "#FAF4E8", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#C27B4A", marginBottom: 6 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: "100%", padding: "12px 16px", background: "rgba(253,250,245,0.07)", border: "1px solid rgba(237,217,176,0.2)", borderRadius: 12, color: "#FAF4E8", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, marginBottom: 16 }}>
                <p style={{ color: "#FCA5A5", fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "13px", background: "#A86035", border: "none", borderRadius: 12, color: "#FAF4E8", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={{ fontSize: 12, textAlign: "center", marginTop: 20, color: "rgba(250,244,232,0.4)" }}>
            Access is invitation-only. Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

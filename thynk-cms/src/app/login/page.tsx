"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [logo,     setLogo]     = useState("");
  const [brand,    setBrand]    = useState("Thynk CMS");
  const [tagline,  setTagline]  = useState("Client Management Platform");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("theme_config").select("key,value").in("key", ["logo_url","brand_name","brand_tagline"]).then(({ data }) => {
      if (!data) return;
      data.forEach((r: any) => {
        if (r.key === "logo_url"      && r.value) setLogo(r.value);
        if (r.key === "brand_name"    && r.value) setBrand(r.value);
        if (r.key === "brand_tagline" && r.value) setTagline(r.value);
      });
    });
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
    <div style={{ minHeight: "100vh", display: "flex", background: "#F5F4F0" }}>
      {/* Left panel */}
      <div style={{ width: 420, background: "#1C1917", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? (
            <img src={logo} alt={brand} style={{ height: 36, objectFit: "contain", maxWidth: 160 }} />
          ) : (
            <>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "#E8611A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: 16, fontFamily: "Georgia, serif" }}>T</span>
              </div>
              <span style={{ color: "#F5F4F0", fontWeight: 600, fontSize: 15 }}>{brand}</span>
            </>
          )}
        </div>
        <div>
          <p style={{ fontSize: 28, fontWeight: 500, color: "#F5F4F0", fontFamily: "Fraunces, Georgia, serif", lineHeight: 1.3, marginBottom: 14 }}>Your agency.<br />Organised.</p>
          <p style={{ fontSize: 13.5, color: "#78716C", lineHeight: 1.7 }}>{tagline}</p>
        </div>
        <p style={{ fontSize: 12, color: "#4E4945" }}>© {new Date().getFullYear()} Thynk Success</p>
      </div>
      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1C1917", marginBottom: 6, fontFamily: "Fraunces, Georgia, serif" }}>Sign in</h2>
          <p style={{ fontSize: 13.5, color: "#78716C", marginBottom: 28 }}>Enter your credentials to access the platform.</p>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "#57534E", marginBottom: 5 }}>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "#57534E", marginBottom: 5 }}>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && (
              <div style={{ padding: "9px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7 }}>
                <p style={{ fontSize: 13, color: "#B91C1C" }}>{error}</p>
              </div>
            )}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "10px", marginTop: 4, fontSize: 14 }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p style={{ fontSize: 12, color: "#A8A29E", textAlign: "center", marginTop: 20 }}>Access is invitation-only. Contact your administrator.</p>
        </div>
      </div>
    </div>
  );
}

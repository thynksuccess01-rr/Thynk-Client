export const fmtINR = (n: number | null | undefined) => {
  const v = n ?? 0;
  return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`;
};
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—";
export const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
export const today = () => new Date().toISOString().split("T")[0];

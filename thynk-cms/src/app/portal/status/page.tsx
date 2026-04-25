"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, MessageCircle, Phone, Calendar, ChevronDown, ChevronUp } from "lucide-react";

export default function PortalStatusPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
      if (!profile?.client_id) return;
      const { data } = await supabase.from("data_entries").select("*").eq("client_id", profile.client_id).order("period_start", { ascending: false });
      setEntries(data ?? []);
      if (data && data.length > 0) setExpanded(data[0].id);
      setLoading(false);
    }
    load();
  }, []);

  const accent = "var(--portal-accent, #A86035)";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold" style={{ color: "#1A0F08" }}>Working Status</h1>
        <p className="text-sm mt-1" style={{ color: accent }}>Campaign reports and activity summaries by period</p>
      </div>

      {loading ? (
        <div className="card p-16 text-center text-sm" style={{ color: "#A86035" }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div className="card p-16 text-center text-sm" style={{ color: "#A86035" }}>No reports available yet. Check back soon.</div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const isOpen = expanded === entry.id;
            const activities = entry.email_sent + entry.whatsapp_sent + entry.calls_made;
            return (
              <div key={entry.id} className="card overflow-hidden transition-all duration-200">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-amber-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--portal-accent, #A86035)22" }}>
                      <Calendar size={18} style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "#1A0F08" }}>
                        {new Date(entry.period_start).toLocaleDateString("en-IN", { month: "long", day: "numeric" })} — {new Date(entry.period_end).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      <p className="text-xs" style={{ color: accent }}>{activities.toLocaleString()} total activities</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-3">
                      <span className="text-xs flex items-center gap-1" style={{ color: "#3B82F6" }}>
                        <Mail size={12} /> {entry.email_sent}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: "#10B981" }}>
                        <MessageCircle size={12} /> {entry.whatsapp_sent}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: "#EF4444" }}>
                        <Phone size={12} /> {entry.calls_made}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp size={16} style={{ color: accent }} /> : <ChevronDown size={16} style={{ color: accent }} />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t px-5 pb-5 pt-4 space-y-5" style={{ borderColor: "#EDD9B0" }}>
                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Email */}
                      <div className="rounded-xl p-4" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Mail size={14} style={{ color: "#1E40AF" }} />
                          <p className="text-xs font-semibold" style={{ color: "#1E40AF" }}>Email Campaign</p>
                        </div>
                        <div className="space-y-2">
                          {[["Sent", entry.email_sent],["Opened", entry.email_opened],["Clicked", entry.email_clicked]].map(([l,v]) => (
                            <div key={l as string} className="flex justify-between text-xs">
                              <span style={{ color: "#1E40AF" }}>{l}</span>
                              <span className="font-semibold" style={{ color: "#1E3A8A" }}>{(v as number).toLocaleString()}</span>
                            </div>
                          ))}
                          {entry.email_sent > 0 && (
                            <div className="mt-2 pt-2 border-t" style={{ borderColor: "#BFDBFE" }}>
                              <div className="h-1.5 rounded-full bg-blue-100">
                                <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.round(entry.email_opened/entry.email_sent*100)}%` }} />
                              </div>
                              <p className="text-xs mt-1" style={{ color: "#3B82F6" }}>{Math.round(entry.email_opened/entry.email_sent*100)}% open rate</p>
                            </div>
                          )}
                        </div>
                        {entry.email_summary && <p className="text-xs mt-3 pt-3 border-t leading-relaxed" style={{ color: "#1E40AF", borderColor: "#BFDBFE" }}>{entry.email_summary}</p>}
                      </div>

                      {/* WhatsApp */}
                      <div className="rounded-xl p-4" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <MessageCircle size={14} style={{ color: "#065F46" }} />
                          <p className="text-xs font-semibold" style={{ color: "#065F46" }}>WhatsApp Campaign</p>
                        </div>
                        <div className="space-y-2">
                          {[["Sent", entry.whatsapp_sent],["Delivered", entry.whatsapp_delivered],["Replied", entry.whatsapp_replied]].map(([l,v]) => (
                            <div key={l as string} className="flex justify-between text-xs">
                              <span style={{ color: "#065F46" }}>{l}</span>
                              <span className="font-semibold" style={{ color: "#064E3B" }}>{(v as number).toLocaleString()}</span>
                            </div>
                          ))}
                          {entry.whatsapp_sent > 0 && (
                            <div className="mt-2 pt-2 border-t" style={{ borderColor: "#A7F3D0" }}>
                              <div className="h-1.5 rounded-full bg-green-100">
                                <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${Math.round(entry.whatsapp_replied/entry.whatsapp_sent*100)}%` }} />
                              </div>
                              <p className="text-xs mt-1" style={{ color: "#10B981" }}>{Math.round(entry.whatsapp_replied/entry.whatsapp_sent*100)}% reply rate</p>
                            </div>
                          )}
                        </div>
                        {entry.whatsapp_summary && <p className="text-xs mt-3 pt-3 border-t leading-relaxed" style={{ color: "#065F46", borderColor: "#A7F3D0" }}>{entry.whatsapp_summary}</p>}
                      </div>

                      {/* Calls */}
                      <div className="rounded-xl p-4" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Phone size={14} style={{ color: "#9A3412" }} />
                          <p className="text-xs font-semibold" style={{ color: "#9A3412" }}>Calls</p>
                        </div>
                        <div className="space-y-2">
                          {[["Made", entry.calls_made],["Connected", entry.calls_connected],["Converted", entry.calls_converted]].map(([l,v]) => (
                            <div key={l as string} className="flex justify-between text-xs">
                              <span style={{ color: "#9A3412" }}>{l}</span>
                              <span className="font-semibold" style={{ color: "#7C2D12" }}>{(v as number).toLocaleString()}</span>
                            </div>
                          ))}
                          {entry.calls_made > 0 && (
                            <div className="mt-2 pt-2 border-t" style={{ borderColor: "#FED7AA" }}>
                              <div className="h-1.5 rounded-full bg-orange-100">
                                <div className="h-1.5 rounded-full bg-orange-500 transition-all" style={{ width: `${Math.round(entry.calls_connected/entry.calls_made*100)}%` }} />
                              </div>
                              <p className="text-xs mt-1" style={{ color: "#F97316" }}>{Math.round(entry.calls_connected/entry.calls_made*100)}% connect rate</p>
                            </div>
                          )}
                        </div>
                        {entry.calls_summary && <p className="text-xs mt-3 pt-3 border-t leading-relaxed" style={{ color: "#9A3412", borderColor: "#FED7AA" }}>{entry.calls_summary}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Download, TrendingUp, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const LEAD_STATUSES = ["all","new","contacted","qualified","proposal","negotiation","won","lost"];
const STATUS_COLORS: Record<string,{bg:string,text:string}> = {
  new:         { bg:"#EEF2FF", text:"#4338CA" },
  contacted:   { bg:"#FFFBEB", text:"#B45309" },
  qualified:   { bg:"#FFF7ED", text:"#C2410C" },
  proposal:    { bg:"#F5F3FF", text:"#6D28D9" },
  negotiation: { bg:"#FEF3C7", text:"#92400E" },
  won:         { bg:"#DCFCE7", text:"#15803D" },
  lost:        { bg:"#FEE2E2", text:"#B91C1C" },
};

const fmtINR = (n: number) => `\u20b9${n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:n}`;
const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

function AgingBadge({ days }: { days: number }) {
  const [bg, color, label] = days > 60 ? ["#FEE2E2","#B91C1C","Critical"] : days > 30 ? ["#FEF3C7","#92400E","High"] : days > 14 ? ["#FFF7ED","#C2410C","Medium"] : ["#DCFCE7","#15803D","Fresh"];
  return <span style={{ background:bg, color, fontSize:10.5, fontWeight:700, padding:"2px 7px", borderRadius:8 }}>{label} {days}d</span>;
}

export default function LeadAgingReport({ isAdmin = false }: { isAdmin?: boolean }) {
  const [leads, setLeads]         = useState<any[]>([]);
  const [entries, setEntries]     = useState<any[]>([]);
  const [clients, setClients]     = useState<any[]>([]);
  const [selClient, setSelClient] = useState("all");
  const [selStatus, setSelStatus] = useState("all");
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"aging"|"history">("aging");
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isAdmin) {
      // Admin: load all clients
      const { data: cl } = await supabase.from("clients").select("id,name").eq("is_active",true).order("name");
      setClients(cl ?? []);
      let q = supabase.from("leads").select(`
        *, clients(name), data_entries(period_start, period_end, entry_label)
      `).order("created_at",{ascending:false});
      if (selClient !== "all") q = q.eq("client_id", selClient);
      const { data: ld } = await q;
      setLeads(ld ?? []);

      let eq = supabase.from("data_entries").select("id,period_start,period_end,entry_label,client_id").order("period_start",{ascending:false});
      if (selClient !== "all") eq = eq.eq("client_id", selClient);
      const { data: ed } = await eq;
      setEntries(ed ?? []);
    } else {
      // Client portal: scoped to own client
      const { data: p } = await supabase.from("profiles").select("client_id").eq("id",user.id).single();
      if (!p?.client_id) { setLoading(false); return; }
      const [{ data: ld }, { data: ed }] = await Promise.all([
        supabase.from("leads").select("*, data_entries(period_start,period_end,entry_label)").eq("client_id",p.client_id).order("created_at",{ascending:false}),
        supabase.from("data_entries").select("id,period_start,period_end,entry_label").eq("client_id",p.client_id).order("period_start",{ascending:false}),
      ]);
      setLeads(ld ?? []); setEntries(ed ?? []);
    }
    setLoading(false);
  }, [selClient, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    if (selStatus !== "all" && l.status !== selStatus) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.location??"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group leads by period for history view
  const periodMap = new Map<string, any[]>();
  filtered.forEach(l => {
    const key = l.data_entry_id ?? "__no_period__";
    if (!periodMap.has(key)) periodMap.set(key, []);
    periodMap.get(key)!.push(l);
  });

  const stats = {
    total: leads.length,
    won: leads.filter(l=>l.status==="won").length,
    active: leads.filter(l=>!["won","lost"].includes(l.status)).length,
    lost: leads.filter(l=>l.status==="lost").length,
    critical: leads.filter(l=>!["won","lost"].includes(l.status)&&daysSince(l.status_updated_at||l.created_at)>60).length,
    pipeline: leads.filter(l=>!["won","lost"].includes(l.status)).reduce((s,l)=>s+(l.expected_revenue??0),0),
    won_rev: leads.filter(l=>l.status==="won").reduce((s,l)=>s+(l.expected_revenue??0),0),
    collected: leads.reduce((s,l)=>s+(l.revenue_collected??0),0),
  };

  function exportCSV() {
    const rows = [
      ["Lead","Status","Client","Location","Country","State","Expected Revenue","Revenue Collected","Period","Cycle","Days Since Update","Previous Status","Created"],
      ...filtered.map(l => [
        l.name, l.status, l.clients?.name||"", l.location||"", l.country||"", l.state||"",
        l.expected_revenue||0, l.revenue_collected||0,
        l.data_entries?.entry_label || l.data_entries?.period_start || "",
        l.cycle_label||"",
        daysSince(l.status_updated_at||l.created_at),
        l.previous_status||"",
        new Date(l.created_at).toLocaleDateString("en-IN"),
      ])
    ];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download = `lead-aging-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1C1917"}}>
            Lead <span style={{color:"#E8611A"}}>Aging Report</span>
          </h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Track lead lifecycle, status history and aging across all periods</p>
        </div>
        <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:10,border:"1px solid #E7E5E4",background:"#fff",color:"#1C1917",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          <Download size={15}/> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10,marginBottom:20}}>
        {[
          {icon:<TrendingUp size={16}/>,label:"Total Leads",value:stats.total,color:"#6366F1"},
          {icon:"\ud83d\udd35",label:"Active",value:stats.active,color:"#F59E0B"},
          {icon:<CheckCircle2 size={16}/>,label:"Won",value:stats.won,color:"#16A34A"},
          {icon:<XCircle size={16}/>,label:"Lost",value:stats.lost,color:"#EF4444"},
          {icon:<AlertTriangle size={16}/>,label:"Critical (>60d)",value:stats.critical,color:"#B91C1C"},
          {icon:"\u20b9",label:"Pipeline",value:fmtINR(stats.pipeline),color:"#7C3AED"},
          {icon:"\u20b9",label:"Won Revenue",value:fmtINR(stats.won_rev),color:"#16A34A"},
          {icon:"\u20b9",label:"Collected",value:fmtINR(stats.collected),color:"#059669"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:"14px 12px",textAlign:"center"}}>
            <div style={{color:s.color,marginBottom:6,display:"flex",justifyContent:"center"}}>{typeof s.icon === "string" ? <span style={{fontSize:18}}>{s.icon}</span> : s.icon}</div>
            <p style={{fontSize:22,fontWeight:800,color:s.color,lineHeight:1}}>{typeof s.value === "number" ? s.value : s.value}</p>
            <p style={{fontSize:10.5,color:"#78716C",marginTop:5,fontWeight:600}}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:"1 1 200px",minWidth:160}}>
          <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#A8A29E"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads..."
            style={{width:"100%",paddingLeft:32,padding:"8px 12px 8px 32px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </div>
        {isAdmin && (
          <select value={selClient} onChange={e=>setSelClient(e.target.value)}
            style={{padding:"8px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#1C1917",cursor:"pointer"}}>
            <option value="all">All Clients</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select value={selStatus} onChange={e=>setSelStatus(e.target.value)}
          style={{padding:"8px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#1C1917",cursor:"pointer"}}>
          {LEAD_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <div style={{display:"flex",gap:4,background:"#fff",border:"1px solid #E7E5E4",borderRadius:8,padding:3}}>
          {(["aging","history"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{padding:"6px 14px",fontSize:12.5,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,borderRadius:6,background:view===v?"#1C1917":"transparent",color:view===v?"#fff":"#78716C",transition:"all 0.15s"}}>
              {v === "aging" ? "Aging View" : "Period History"}
            </button>
          ))}
        </div>
        <p style={{fontSize:12.5,color:"#A8A29E",marginLeft:"auto"}}>{filtered.length} leads</p>
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#A8A29E",fontSize:13}}>Loading...</div>
      ) : view === "aging" ? (
        /* ─── AGING VIEW ─── */
        <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
                {[
                  "Lead",
                  ...(isAdmin?["Client"]:[]),
                  "Status","Period","Location","Expected Rev","Collected","Aging","Cycle","History","Notes"
                ].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:11.5,fontWeight:600,color:"#A8A29E",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin?10:9} style={{textAlign:"center",padding:"48px 0",color:"#A8A29E",fontSize:13}}>No leads found</td></tr>
              ) : filtered.map(l=>{
                const age = daysSince(l.status_updated_at || l.created_at);
                const entry = l.data_entries;
                const isStale = !["won","lost"].includes(l.status) && age > 30;
                return (
                  <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:isStale?"#FFFBEB":l.is_updated_this_cycle?"#F0FDF4":"transparent"}}>
                    <td style={{padding:"11px 12px"}}>
                      <p style={{fontWeight:600,color:"#1C1917"}}>{l.name}</p>
                      {l.is_updated_this_cycle && <span style={{fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 5px",borderRadius:6,fontWeight:700}}>UPDATED</span>}
                    </td>
                    {isAdmin && <td style={{padding:"11px 12px",color:"#78716C",fontSize:12}}>{l.clients?.name||"\u2014"}</td>}
                    <td style={{padding:"11px 12px"}}>
                      <span style={{fontSize:11.5,padding:"3px 9px",borderRadius:10,fontWeight:600,background:STATUS_COLORS[l.status]?.bg,color:STATUS_COLORS[l.status]?.text}}>
                        {l.status.charAt(0).toUpperCase()+l.status.slice(1)}
                      </span>
                    </td>
                    <td style={{padding:"11px 12px",fontSize:12}}>
                      {entry ? <span style={{background:"#EEF2FF",color:"#4338CA",padding:"2px 7px",borderRadius:6,fontSize:11.5,fontWeight:500}}>{entry.entry_label || new Date(entry.period_start).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}</span> : <span style={{color:"#D6D3D1"}}>No period</span>}
                    </td>
                    <td style={{padding:"11px 12px",color:"#78716C",fontSize:12}}>
                      <div>{l.country&&<span style={{display:"block",fontSize:11,color:"#A8A29E"}}>{l.country}</span>}</div>
                      <div>{l.state&&<span style={{display:"block",fontSize:11,color:"#A8A29E"}}>{l.state}</span>}</div>
                      {l.location||"\u2014"}
                    </td>
                    <td style={{padding:"11px 12px",fontWeight:600,color:"#16A34A"}}>{l.expected_revenue?fmtINR(l.expected_revenue):"\u2014"}</td>
                    <td style={{padding:"11px 12px"}}><AgingBadge days={age}/></td>
                    <td style={{padding:"11px 12px",color:"#A8A29E",fontSize:12}}>{l.cycle_label||"\u2014"}</td>
                    <td style={{padding:"11px 12px",fontSize:12}}>
                      {l.previous_status && l.previous_status !== l.status ? (
                        <span>
                          <span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>
                          {" \u2192 "}
                          <span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span>
                        </span>
                      ) : <span style={{color:"#D6D3D1"}}>\u2014</span>}
                    </td>
                    <td style={{padding:"11px 12px",color:"#78716C",fontSize:11.5,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.notes||"\u2014"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── PERIOD HISTORY VIEW ─── */
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {entries.length === 0 && filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"60px 0",color:"#A8A29E",fontSize:13}}>No data found</div>
          ) : (
            <>
              {/* Leads with no period */}
              {periodMap.has("__no_period__") && (
                <div style={{background:"#fff",border:"1px solid #F5F4F0",borderRadius:12,overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",background:"#FAFAF9",borderBottom:"1px solid #F0EEEC",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#A8A29E"}}>No Period Assigned</span>
                    <span style={{fontSize:11.5,background:"#F0EEEC",color:"#78716C",padding:"2px 8px",borderRadius:8}}>{periodMap.get("__no_period__")!.length} leads</span>
                  </div>
                  <LeadMiniTable leads={periodMap.get("__no_period__")!} isAdmin={isAdmin}/>
                </div>
              )}
              {/* Leads grouped by period */}
              {entries.map(entry => {
                const periodLeads = periodMap.get(entry.id);
                if (!periodLeads?.length) return null;
                const wonInPeriod = periodLeads.filter(l=>l.status==="won").length;
                const activeInPeriod = periodLeads.filter(l=>!["won","lost"].includes(l.status)).length;
                const revInPeriod = periodLeads.filter(l=>l.status==="won").reduce((s,l)=>s+(l.expected_revenue??0),0);
                return (
                  <div key={entry.id} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
                    <div style={{padding:"12px 16px",background:"#F5F4F0",borderBottom:"1px solid #E7E5E4",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#1C1917"}}>{entry.entry_label || `${entry.period_start} \u2013 ${entry.period_end}`}</span>
                      <span style={{fontSize:11.5,color:"#78716C"}}>{entry.period_start} \u2013 {entry.period_end}</span>
                      <span style={{fontSize:11.5,background:"#EEF2FF",color:"#4338CA",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{periodLeads.length} leads</span>
                      {wonInPeriod > 0 && <span style={{fontSize:11.5,background:"#DCFCE7",color:"#15803D",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{wonInPeriod} won</span>}
                      {activeInPeriod > 0 && <span style={{fontSize:11.5,background:"#FEF3C7",color:"#92400E",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{activeInPeriod} active</span>}
                      {revInPeriod > 0 && <span style={{fontSize:11.5,background:"#F0FDF4",color:"#15803D",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{fmtINR(revInPeriod)} won</span>}
                      {isAdmin && <span style={{fontSize:11,color:"#A8A29E",marginLeft:"auto"}}>Period ID: {entry.id.slice(-8)}</span>}
                    </div>
                    <LeadMiniTable leads={periodLeads} isAdmin={isAdmin}/>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LeadMiniTable({ leads, isAdmin }: { leads: any[]; isAdmin: boolean }) {
  return (
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead>
        <tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
          {["Lead",...(isAdmin?["Client"]:[]),"Status","Location","Expected","Collected","Aging","Cycle","Change"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:11,fontWeight:600,color:"#A8A29E"}}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leads.map(l=>{
          const age = daysSince(l.status_updated_at || l.created_at);
          return (
            <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#1C1917"}}>{l.name}</td>
              {isAdmin && <td style={{padding:"9px 12px",color:"#78716C",fontSize:12}}>{l.clients?.name||"\u2014"}</td>}
              <td style={{padding:"9px 12px"}}>
                <span style={{fontSize:11.5,padding:"2px 8px",borderRadius:8,fontWeight:600,background:STATUS_COLORS[l.status]?.bg,color:STATUS_COLORS[l.status]?.text}}>
                  {l.status.charAt(0).toUpperCase()+l.status.slice(1)}
                </span>
              </td>
              <td style={{padding:"9px 12px",color:"#78716C",fontSize:12}}>{[l.country,l.state,l.location].filter(Boolean).join(", ")||"\u2014"}</td>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#16A34A",fontSize:12}}>{l.expected_revenue?fmtINR(l.expected_revenue):"\u2014"}</td>
              <td style={{padding:"9px 12px"}}><AgingBadge days={age}/></td>
              <td style={{padding:"9px 12px",color:"#A8A29E",fontSize:12}}>{l.cycle_label||"\u2014"}</td>
              <td style={{padding:"9px 12px",fontSize:12}}>
                {l.previous_status&&l.previous_status!==l.status ? (
                  <span><span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>{" \u2192 "}<span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span></span>
                ) : <span style={{color:"#D6D3D1"}}>\u2014</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Download, AlertTriangle, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

const STATUS_COLOR: Record<string,{bg:string,text:string}> = {
  new:         { bg:"#EEF2FF", text:"#4338CA" },
  contacted:   { bg:"#FFFBEB", text:"#B45309" },
  qualified:   { bg:"#FFF7ED", text:"#C2410C" },
  proposal:    { bg:"#F5F3FF", text:"#6D28D9" },
  negotiation: { bg:"#FEF3C7", text:"#92400E" },
  won:         { bg:"#DCFCE7", text:"#15803D" },
  lost:        { bg:"#FEE2E2", text:"#B91C1C" },
};
const fmtINR = (n: number) => `₹${n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:n}`;
const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

function AgingBadge({ days }: { days: number }) {
  const [bg,color,label] = days>60?["#FEE2E2","#B91C1C","Critical"]:days>30?["#FEF3C7","#92400E","High"]:days>14?["#FFF7ED","#C2410C","Medium"]:["#DCFCE7","#15803D","Fresh"];
  return <span style={{background:bg,color,fontSize:10.5,fontWeight:700,padding:"2px 8px",borderRadius:8,whiteSpace:"nowrap"}}>{label} · {days}d</span>;
}

export default function LeadAgingReport({ isAdmin=false }: { isAdmin?: boolean }) {
  const [leads,     setLeads]     = useState<any[]>([]);
  const [entries,   setEntries]   = useState<any[]>([]);
  const [clients,   setClients]   = useState<any[]>([]);
  const [selClient, setSelClient] = useState("all");
  const [selStatus, setSelStatus] = useState("all");
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState<"aging"|"history">("aging");
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isAdmin) {
      const { data: cl } = await supabase.from("clients").select("id,name").eq("is_active",true).order("name");
      setClients(cl ?? []);
      let q = supabase.from("leads").select("*, clients(name), data_entries(period_start,period_end,entry_label)").order("created_at",{ascending:false});
      if (selClient !== "all") q = q.eq("client_id", selClient);
      const { data: ld } = await q;
      setLeads(ld ?? []);
      let eq = supabase.from("data_entries").select("id,period_start,period_end,entry_label,client_id").order("period_start",{ascending:false});
      if (selClient !== "all") eq = eq.eq("client_id", selClient);
      const { data: ed } = await eq;
      setEntries(ed ?? []);
    } else {
      const { data: p } = await supabase.from("profiles").select("client_id").eq("id",user.id).single();
      if (!p?.client_id) { setLoading(false); return; }
      const [{ data: ld },{ data: ed }] = await Promise.all([
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
    if (search) {
      const q = search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !(l.location??"").toLowerCase().includes(q) && !(l.country??"").toLowerCase().includes(q) && !(l.state??"").toLowerCase().includes(q) && !(l.contact_person??"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total:     leads.length,
    active:    leads.filter(l=>!["won","lost"].includes(l.status)).length,
    won:       leads.filter(l=>l.status==="won").length,
    lost:      leads.filter(l=>l.status==="lost").length,
    critical:  leads.filter(l=>!["won","lost"].includes(l.status)&&daysSince(l.status_updated_at||l.created_at)>60).length,
    pipeline:  leads.filter(l=>!["won","lost"].includes(l.status)).reduce((s,l)=>s+(l.expected_revenue??0),0),
    won_rev:   leads.filter(l=>l.status==="won").reduce((s,l)=>s+(l.expected_revenue??0),0),
    collected: leads.reduce((s,l)=>s+(l.revenue_collected??0),0),
  };

  function exportCSV() {
    const rows = [
      ["Lead","Status",isAdmin?"Client":"","Country","State","Location","Contact Person","Contact Email","Contact Phone","Expected Revenue","Revenue Collected","Period","Cycle","Days Since Update","Previous Status"],
      ...filtered.map(l=>[
        l.name,l.status,isAdmin?(l as any).clients?.name||"":"",
        l.country||"",l.state||"",l.location||"",
        l.contact_person||"",l.contact_email||"",l.contact_phone||"",
        l.expected_revenue||0,l.revenue_collected||0,
        l.data_entries?.entry_label||l.data_entries?.period_start||"",
        l.cycle_label||"",daysSince(l.status_updated_at||l.created_at),
        l.previous_status||"",
      ])
    ].map(r=>r.filter((_,i)=>isAdmin||i!==2).join(",")).join("\n");
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows);
    a.download=`lead-aging-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  // Group by period for history view
  const periodMap = new Map<string,any[]>();
  filtered.forEach(l=>{
    const k = l.data_entry_id ?? "__none__";
    if(!periodMap.has(k)) periodMap.set(k,[]);
    periodMap.get(k)!.push(l);
  });

  const STATUSES = ["all","new","contacted","qualified","proposal","negotiation","won","lost"];

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1C1917",fontFamily:"Fraunces,Georgia,serif"}}>
            Lead <span style={{color:"#E8611A"}}>Aging Report</span>
          </h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Track lead lifecycle, status history and aging across all periods</p>
        </div>
        <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:10,border:"1px solid #E7E5E4",background:"#fff",color:"#1C1917",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          <Download size={15}/> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${isAdmin?8:7},1fr)`,gap:10,marginBottom:20}}>
        {[
          {icon:"📋",label:"Total",     value:stats.total,           color:"#6366F1"},
          {icon:"🔵",label:"Active",    value:stats.active,          color:"#F59E0B"},
          {icon:"✅",label:"Won",       value:stats.won,             color:"#16A34A"},
          {icon:"❌",label:"Lost",      value:stats.lost,            color:"#EF4444"},
          {icon:"⚠️",label:"Critical",  value:stats.critical,        color:"#B91C1C"},
          {icon:"₹", label:"Pipeline",  value:fmtINR(stats.pipeline),color:"#7C3AED"},
          {icon:"₹", label:"Won Rev",   value:fmtINR(stats.won_rev), color:"#16A34A"},
          ...(isAdmin?[{icon:"💰",label:"Collected",value:fmtINR(stats.collected),color:"#059669"}]:[]),
        ].map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <p style={{fontSize:18,fontWeight:800,color:s.color,lineHeight:1}}>{typeof s.value==="number"?s.value:s.value}</p>
            <p style={{fontSize:10,color:"#78716C",marginTop:4,fontWeight:600}}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:"1 1 200px",minWidth:160}}>
          <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#A8A29E"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads..."
            style={{width:"100%",paddingLeft:32,padding:"8px 12px 8px 32px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        {isAdmin&&(
          <select value={selClient} onChange={e=>setSelClient(e.target.value)}
            style={{padding:"8px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#1C1917",cursor:"pointer"}}>
            <option value="all">All Clients</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select value={selStatus} onChange={e=>setSelStatus(e.target.value)}
          style={{padding:"8px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#1C1917",cursor:"pointer"}}>
          {STATUSES.map(s=><option key={s} value={s}>{s==="all"?"All Statuses":s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <div style={{display:"flex",gap:4,background:"#fff",border:"1px solid #E7E5E4",borderRadius:8,padding:3}}>
          {(["aging","history"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{padding:"6px 14px",fontSize:12.5,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,borderRadius:6,background:view===v?"#1C1917":"transparent",color:view===v?"#fff":"#78716C",transition:"all 0.15s"}}>
              {v==="aging"?"Aging View":"Period History"}
            </button>
          ))}
        </div>
        <p style={{fontSize:12.5,color:"#A8A29E",marginLeft:"auto"}}>{filtered.length} leads</p>
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#A8A29E",fontSize:13}}>Loading...</div>
      ) : view==="aging" ? (
        /* Aging Table */
        <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
                  {["Lead",...(isAdmin?["Client"]:[]),"Status","Period","Location","Contact","Exp. Revenue","Collected","Aging","Change"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:11.5,fontWeight:600,color:"#A8A29E",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0?(
                  <tr><td colSpan={isAdmin?10:9} style={{textAlign:"center",padding:"48px 0",color:"#A8A29E",fontSize:13}}>No leads found</td></tr>
                ):filtered.map(l=>{
                  const age = daysSince(l.status_updated_at||l.created_at);
                  const entry = l.data_entries;
                  const isStale = !["won","lost"].includes(l.status)&&age>30;
                  const sc = STATUS_COLOR[l.status]??{bg:"#F5F4F0",text:"#78716C"};
                  return (
                    <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:isStale?"#FFFBEB":l.is_updated_this_cycle?"#F0FDF4":"transparent"}}>
                      <td style={{padding:"11px 12px"}}>
                        <p style={{fontWeight:600,color:"#1C1917"}}>{l.name}</p>
                        {(l.country||l.state)&&<p style={{fontSize:11,color:"#A8A29E",marginTop:1}}>{[l.country,l.state].filter(Boolean).join(", ")}</p>}
                        {l.is_updated_this_cycle&&<span style={{fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 5px",borderRadius:6,fontWeight:700}}>UPDATED</span>}
                      </td>
                      {isAdmin&&<td style={{padding:"11px 12px",color:"#78716C",fontSize:12}}>{(l as any).clients?.name||"—"}</td>}
                      <td style={{padding:"11px 12px"}}>
                        <span style={{fontSize:11.5,padding:"3px 9px",borderRadius:10,fontWeight:600,background:sc.bg,color:sc.text}}>{l.status.charAt(0).toUpperCase()+l.status.slice(1)}</span>
                      </td>
                      <td style={{padding:"11px 12px",fontSize:12}}>
                        {entry?<span style={{background:"#EEF2FF",color:"#4338CA",padding:"2px 7px",borderRadius:6,fontSize:11.5,fontWeight:500}}>{entry.entry_label||new Date(entry.period_start).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}</span>:<span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                      <td style={{padding:"11px 12px",color:"#78716C",fontSize:12}}>{l.location||"—"}</td>
                      <td style={{padding:"11px 12px",fontSize:12}}>
                        {l.contact_person&&<p style={{fontWeight:500,color:"#1C1917"}}>{l.contact_person}</p>}
                        {l.contact_email&&<p style={{color:"#78716C"}}>{l.contact_email}</p>}
                        {l.contact_phone&&<p style={{color:"#78716C"}}>{l.contact_phone}</p>}
                        {!l.contact_person&&!l.contact_email&&!l.contact_phone&&<span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                      <td style={{padding:"11px 12px",fontWeight:600,color:"#D97706"}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                      <td style={{padding:"11px 12px",fontWeight:700,color:"#16A34A"}}>{l.revenue_collected&&l.revenue_collected>0?fmtINR(l.revenue_collected):<span style={{color:"#D6D3D1"}}>—</span>}</td>
                      <td style={{padding:"11px 12px"}}><AgingBadge days={age}/></td>
                      <td style={{padding:"11px 12px",fontSize:12}}>
                        {l.previous_status&&l.previous_status!==l.status
                          ?<span><span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>{" → "}<span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span></span>
                          :<span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Period History */
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {periodMap.has("__none__")&&(
            <PeriodGroup title="No Period Assigned" leads={periodMap.get("__none__")!} isAdmin={isAdmin}/>
          )}
          {entries.map(e=>{
            const pl = periodMap.get(e.id);
            if(!pl?.length) return null;
            return <PeriodGroup key={e.id} title={e.entry_label||`${e.period_start} – ${e.period_end}`} subtitle={`${e.period_start} – ${e.period_end}`} leads={pl} isAdmin={isAdmin}/>;
          })}
          {filtered.length===0&&<div style={{textAlign:"center",padding:"60px 0",color:"#A8A29E",fontSize:13}}>No data found</div>}
        </div>
      )}
    </div>
  );
}

function PeriodGroup({title,subtitle,leads,isAdmin}:{title:string,subtitle?:string,leads:any[],isAdmin:boolean}) {
  const won = leads.filter(l=>l.status==="won").length;
  const active = leads.filter(l=>!["won","lost"].includes(l.status)).length;
  const fmtINR=(n:number)=>`₹${n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:n}`;
  const daysSince=(d:string)=>Math.floor((Date.now()-new Date(d).getTime())/86400000);
  const STATUS_COLOR2:Record<string,{bg:string,text:string}>={new:{bg:"#EEF2FF",text:"#4338CA"},contacted:{bg:"#FFFBEB",text:"#B45309"},qualified:{bg:"#FFF7ED",text:"#C2410C"},proposal:{bg:"#F5F3FF",text:"#6D28D9"},negotiation:{bg:"#FEF3C7",text:"#92400E"},won:{bg:"#DCFCE7",text:"#15803D"},lost:{bg:"#FEE2E2",text:"#B91C1C"}};
  return (
    <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"12px 16px",background:"#F5F4F0",borderBottom:"1px solid #E7E5E4",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:13,fontWeight:700,color:"#1C1917"}}>{title}</span>
        {subtitle&&subtitle!==title&&<span style={{fontSize:11.5,color:"#78716C"}}>{subtitle}</span>}
        <span style={{fontSize:11.5,background:"#EEF2FF",color:"#4338CA",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{leads.length} leads</span>
        {won>0&&<span style={{fontSize:11.5,background:"#DCFCE7",color:"#15803D",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{won} won</span>}
        {active>0&&<span style={{fontSize:11.5,background:"#FEF3C7",color:"#92400E",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{active} active</span>}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
            {["Lead",...(isAdmin?["Client"]:[]),"Status","Location","Contact","Exp. Revenue","Collected","Aging","Change"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:11,fontWeight:600,color:"#A8A29E"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {leads.map(l=>{
              const age=daysSince(l.status_updated_at||l.created_at);
              const sc=STATUS_COLOR2[l.status]??{bg:"#F5F4F0",text:"#78716C"};
              return (
                <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
                  <td style={{padding:"9px 12px",fontWeight:600,color:"#1C1917"}}>
                    {l.name}
                    {(l.country||l.state)&&<span style={{fontSize:11,color:"#A8A29E",fontWeight:400,marginLeft:5}}>{[l.country,l.state].filter(Boolean).join(", ")}</span>}
                  </td>
                  {isAdmin&&<td style={{padding:"9px 12px",color:"#78716C",fontSize:12}}>{(l as any).clients?.name||"—"}</td>}
                  <td style={{padding:"9px 12px"}}><span style={{fontSize:11.5,padding:"2px 8px",borderRadius:8,fontWeight:600,background:sc.bg,color:sc.text}}>{l.status.charAt(0).toUpperCase()+l.status.slice(1)}</span></td>
                  <td style={{padding:"9px 12px",color:"#78716C",fontSize:12}}>{[l.country,l.state,l.location].filter(Boolean).join(", ")||"—"}</td>
                  <td style={{padding:"9px 12px",fontSize:12}}>
                    {l.contact_person?<span style={{fontWeight:500}}>{l.contact_person}</span>:<span style={{color:"#D6D3D1"}}>—</span>}
                    {l.contact_phone&&<span style={{color:"#78716C",fontSize:11,marginLeft:5}}>· {l.contact_phone}</span>}
                  </td>
                  <td style={{padding:"9px 12px",fontWeight:600,color:"#D97706",fontSize:12}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                  <td style={{padding:"9px 12px",fontWeight:700,color:"#16A34A",fontSize:12}}>{l.revenue_collected&&l.revenue_collected>0?fmtINR(l.revenue_collected):<span style={{color:"#D6D3D1"}}>—</span>}</td>
                  <td style={{padding:"9px 12px"}}><span style={{fontSize:10.5,fontWeight:700,padding:"2px 7px",borderRadius:8,background:age>60?"#FEE2E2":age>30?"#FEF3C7":"#DCFCE7",color:age>60?"#B91C1C":age>30?"#92400E":"#15803D"}}>{age}d</span></td>
                  <td style={{padding:"9px 12px",fontSize:12}}>
                    {l.previous_status&&l.previous_status!==l.status?<span><span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>{" → "}<span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span></span>:<span style={{color:"#D6D3D1"}}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

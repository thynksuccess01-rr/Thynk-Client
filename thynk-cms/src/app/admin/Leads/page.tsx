"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Filter, Trash2, TrendingUp, CheckCircle2, XCircle, Clock, Users, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

const LEAD_STATUSES = ["all","new","contacted","qualified","proposal","negotiation","won","lost"];
const STATUS_COLOR: Record<string,{bg:string,text:string}> = {
  new:        { bg:"#EEF2FF", text:"#4338CA" },
  contacted:  { bg:"#FFFBEB", text:"#B45309" },
  qualified:  { bg:"#FFF7ED", text:"#C2410C" },
  proposal:   { bg:"#F5F3FF", text:"#6D28D9" },
  negotiation:{ bg:"#FEF3C7", text:"#92400E" },
  won:        { bg:"#DCFCE7", text:"#15803D" },
  lost:       { bg:"#FEE2E2", text:"#B91C1C" },
};
const fmtINR = (n: number) => `₹${n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:n}`;

export default function AdminLeadsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selClient, setSelClient] = useState("all");
  const [selStatus, setSelStatus] = useState("all");
  const [selPeriod, setSelPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("clients").select("id,name").eq("is_active",true).order("name").then(r=>setClients(r.data??[]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("leads").select("*, clients(name), data_entries(period_start,period_end,entry_label)").order("created_at",{ascending:false});
    if (selClient !== "all") q = q.eq("client_id", selClient);
    const { data } = await q;
    setLeads(data ?? []);

    // Load entries for period filter
    let eq = supabase.from("data_entries").select("id,period_start,period_end,entry_label,client_id").order("period_start",{ascending:false});
    if (selClient !== "all") eq = eq.eq("client_id", selClient);
    const { data: ed } = await eq;
    setEntries(ed ?? []);
    setLoading(false);
  }, [selClient]);

  useEffect(() => { load(); }, [load]);

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead permanently?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Lead deleted"); load(); }
  }

  async function updateStatus(id: string, status: string, prev: string) {
    await supabase.from("leads").update({ status, previous_status: prev, status_updated_at: new Date().toISOString(), is_updated_this_cycle: true, updated_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  const filtered = leads.filter(l => {
    if (selStatus !== "all" && l.status !== selStatus) return false;
    if (selPeriod !== "all" && l.data_entry_id !== selPeriod) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.location??"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: leads.length,
    won: leads.filter(l=>l.status==="won").length,
    active: leads.filter(l=>!["won","lost"].includes(l.status)).length,
    lost: leads.filter(l=>l.status==="lost").length,
    revenue: leads.filter(l=>l.status==="won").reduce((s,l)=>s+(l.expected_revenue??0),0),
    pipeline: leads.filter(l=>!["won","lost"].includes(l.status)).reduce((s,l)=>s+(l.expected_revenue??0),0),
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1C1917",fontFamily:"Fraunces,Georgia,serif"}}>
            Leads <span style={{color:"#E8611A"}}>Management</span>
          </h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Complete view of all leads across clients and periods</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:20}}>
        {[
          {icon:"📋",label:"Total Leads",value:stats.total,color:"#6366F1"},
          {icon:"🔵",label:"Active",value:stats.active,color:"#F59E0B"},
          {icon:"✅",label:"Won",value:stats.won,color:"#16A34A"},
          {icon:"❌",label:"Lost",value:stats.lost,color:"#EF4444"},
          {icon:"₹",label:"Won Revenue",value:fmtINR(stats.revenue),color:"#16A34A"},
          {icon:"🔮",label:"Pipeline",value:fmtINR(stats.pipeline),color:"#7C3AED"},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:"14px 12px"}}>
            <div style={{fontSize:18,marginBottom:5}}>{s.icon}</div>
            <p style={{fontSize:10,fontWeight:700,color:"#A8A29E",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{s.label}</p>
            <p style={{fontSize:20,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#A8A29E"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads by name or location..."
            style={{width:"100%",padding:"7px 12px 7px 28px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <div style={{position:"relative"}}>
          <select value={selClient} onChange={e=>{setSelClient(e.target.value);setSelPeriod("all");}}
            style={{appearance:"none",padding:"7px 28px 7px 10px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",background:"#fff",cursor:"pointer",minWidth:140}}>
            <option value="all">All Clients</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={12} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#78716C"}}/>
        </div>
        <div style={{position:"relative"}}>
          <select value={selStatus} onChange={e=>setSelStatus(e.target.value)}
            style={{appearance:"none",padding:"7px 28px 7px 10px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",background:"#fff",cursor:"pointer",minWidth:130}}>
            {LEAD_STATUSES.map(s=><option key={s} value={s}>{s==="all"?"All Statuses":s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <ChevronDown size={12} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#78716C"}}/>
        </div>
        <div style={{position:"relative"}}>
          <select value={selPeriod} onChange={e=>setSelPeriod(e.target.value)}
            style={{appearance:"none",padding:"7px 28px 7px 10px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",background:"#fff",cursor:"pointer",minWidth:160}}>
            <option value="all">All Periods</option>
            <option value="null">No Period</option>
            {entries.map(e=>(
              <option key={e.id} value={e.id}>
                {e.entry_label || `${new Date(e.period_start).toLocaleDateString("en-IN",{month:"short",day:"numeric"})} – ${new Date(e.period_end).toLocaleDateString("en-IN",{month:"short",day:"numeric","year":"2-digit"})}`}
                {selClient==="all" ? ` (${clients.find(c=>c.id===e.client_id)?.name??"?"})` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={12} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#78716C"}}/>
        </div>
        <span style={{fontSize:12.5,color:"#A8A29E",fontWeight:500}}>{filtered.length} leads</span>
      </div>

      {/* Table */}
      <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,overflow:"hidden"}}>
        {loading ? (
          <div style={{padding:"60px 0",textAlign:"center",color:"#A8A29E",fontSize:13}}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:"60px 0",textAlign:"center",color:"#A8A29E",fontSize:13}}>No leads found</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
                {["Lead","Client","Period Generated","Current Period","Status","Location","Revenue","Notes","Change",""].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:11.5,fontWeight:600,color:"#A8A29E",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const entry = l.data_entries;
                return (
                  <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#1C1917",whiteSpace:"nowrap"}}>
                      {l.name}
                      {l.is_updated_this_cycle&&<span style={{marginLeft:5,fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 6px",borderRadius:8,fontWeight:700}}>↑</span>}
                    </td>
                    <td style={{padding:"10px 12px",color:"#57534E",fontSize:12.5}}>
                      {l.clients?.name ?? "—"}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#78716C",whiteSpace:"nowrap"}}>
                      {entry ? (
                        <span style={{background:"#EEF2FF",color:"#4338CA",padding:"2px 7px",borderRadius:6,fontSize:11.5,fontWeight:500}}>
                          {entry.entry_label || `${new Date(entry.period_start).toLocaleDateString("en-IN",{month:"short",day:"numeric"})}–${new Date(entry.period_end).toLocaleDateString("en-IN",{month:"short",day:"numeric","year":"2-digit"})}`}
                        </span>
                      ) : <span style={{color:"#D6D3D1"}}>—</span>}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#78716C"}}>
                      {l.cycle_label ? <span style={{background:"#F0FDF4",color:"#15803D",padding:"2px 7px",borderRadius:6,fontSize:11.5,fontWeight:500}}>{l.cycle_label}</span> : <span style={{color:"#D6D3D1"}}>—</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <select value={l.status} onChange={e=>updateStatus(l.id,e.target.value,l.status)}
                        style={{appearance:"none",padding:"3px 8px",borderRadius:8,fontSize:11.5,fontWeight:600,background:STATUS_COLOR[l.status]?.bg,color:STATUS_COLOR[l.status]?.text,border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                        {["new","contacted","qualified","proposal","negotiation","won","lost"].map(s=>(
                          <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{padding:"10px 12px",color:"#78716C",fontSize:12.5}}>{l.location??"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#16A34A",fontSize:12.5}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#A8A29E",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.notes||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:12,whiteSpace:"nowrap"}}>
                      {l.previous_status&&l.previous_status!==l.status?(
                        <span>
                          <span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>
                          {" → "}
                          <span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span>
                        </span>
                      ):<span style={{color:"#D6D3D1"}}>—</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <button onClick={()=>deleteLead(l.id)}
                        style={{background:"transparent",border:"none",cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}
                        onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <Trash2 size={13} color="#EF4444"/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

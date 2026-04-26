"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Trash2, ChevronDown, Edit2, X, Save, Clock } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const LEAD_STATUSES = ["all","new","contacted","qualified","proposal","negotiation","won","lost"];
const EDIT_STATUSES = ["new","contacted","qualified","proposal","negotiation","won","lost"];
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

const EMPTY_EDIT = {
  name: "", country: "", state: "", location: "",
  contact_person: "", contact_email: "", contact_phone: "",
  expected_volume: "", expected_revenue: "", status: "new",
  notes: "", cycle_label: "",
};

export default function AdminLeadsPage() {
  const [clients,   setClients]   = useState<any[]>([]);
  const [entries,   setEntries]   = useState<any[]>([]);
  const [leads,     setLeads]     = useState<any[]>([]);
  const [selClient, setSelClient] = useState("all");
  const [selStatus, setSelStatus] = useState("all");
  const [selPeriod, setSelPeriod] = useState("all");
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [editLead,  setEditLead]  = useState<any>(null);
  const [editForm,  setEditForm]  = useState<typeof EMPTY_EDIT>(EMPTY_EDIT);
  const [saving,    setSaving]    = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("clients").select("id,name").eq("is_active",true).order("name").then(r=>setClients(r.data??[]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("leads")
      .select("*, clients(name), data_entries(period_start,period_end,entry_label)")
      .order("created_at",{ascending:false});
    if (selClient !== "all") q = q.eq("client_id", selClient);
    const { data } = await q;
    setLeads(data ?? []);

    let eq = supabase.from("data_entries")
      .select("id,period_start,period_end,entry_label,client_id")
      .order("period_start",{ascending:false});
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
    await supabase.from("leads").update({
      status, previous_status: prev,
      status_updated_at: new Date().toISOString(),
      is_updated_this_cycle: true,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    load();
  }

  function openEdit(lead: any) {
    setEditLead(lead);
    setEditForm({
      name:           lead.name ?? "",
      country:        lead.country ?? "",
      state:          lead.state ?? "",
      location:       lead.location ?? "",
      contact_person: lead.contact_person ?? "",
      contact_email:  lead.contact_email ?? "",
      contact_phone:  lead.contact_phone ?? "",
      expected_volume:  lead.expected_volume != null ? String(lead.expected_volume) : "",
      expected_revenue: lead.expected_revenue != null ? String(lead.expected_revenue) : "",
      status:    lead.status ?? "new",
      notes:     lead.notes ?? "",
      cycle_label: lead.cycle_label ?? "",
    });
  }

  async function saveEdit() {
    if (!editForm.name.trim()) { toast.error("Lead name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("leads").update({
      name:           editForm.name.trim(),
      country:        editForm.country.trim() || null,
      state:          editForm.state.trim() || null,
      location:       editForm.location.trim() || null,
      contact_person: editForm.contact_person.trim() || null,
      contact_email:  editForm.contact_email.trim() || null,
      contact_phone:  editForm.contact_phone.trim() || null,
      expected_volume:  editForm.expected_volume  ? Number(editForm.expected_volume)  : null,
      expected_revenue: editForm.expected_revenue ? Number(editForm.expected_revenue) : null,
      status:      editForm.status,
      notes:       editForm.notes.trim() || null,
      cycle_label: editForm.cycle_label.trim() || null,
      previous_status: editLead.status !== editForm.status ? editLead.status : editLead.previous_status,
      is_updated_this_cycle: editLead.status !== editForm.status ? true : editLead.is_updated_this_cycle,
      updated_at: new Date().toISOString(),
    }).eq("id", editLead.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Lead updated"); setEditLead(null); load(); }
  }

  const filtered = leads.filter(l => {
    if (selStatus !== "all" && l.status !== selStatus) return false;
    if (selPeriod !== "all" && l.data_entry_id !== selPeriod) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) &&
          !(l.location??"").toLowerCase().includes(q) &&
          !(l.contact_person??"").toLowerCase().includes(q) &&
          !((l as any).clients?.name??"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total:    leads.length,
    won:      leads.filter(l=>l.status==="won").length,
    active:   leads.filter(l=>!["won","lost"].includes(l.status)).length,
    lost:     leads.filter(l=>l.status==="lost").length,
    revenue:  leads.filter(l=>l.status==="won").reduce((s,l)=>s+(l.expected_revenue??0),0),
    pipeline: leads.filter(l=>!["won","lost"].includes(l.status)).reduce((s,l)=>s+(l.expected_revenue??0),0),
  };

  const field = (label: string, key: keyof typeof EMPTY_EDIT, type = "text", ph = "") => (
    <div key={key}>
      <label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>{label}</label>
      <input className="input" type={type} placeholder={ph}
        value={editForm[key]} onChange={e=>setEditForm(p=>({...p,[key]:e.target.value}))}
        style={{fontSize:13}}/>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1C1917",fontFamily:"Fraunces,Georgia,serif"}}>
            Leads <span style={{color:"#E8611A"}}>Management</span>
          </h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Complete view of all leads across clients and periods</p>
        </div>
        <Link href="/admin/lead-aging" style={{display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:10,border:"1px solid #E7E5E4",background:"#fff",color:"#E8611A",fontWeight:600,fontSize:13,textDecoration:"none"}}>
          <Clock size={15}/> Lead Aging Report
        </Link>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:20}}>
        {[
          {icon:"📋",label:"Total Leads",  value:stats.total,           color:"#6366F1"},
          {icon:"🔵",label:"Active",       value:stats.active,          color:"#F59E0B"},
          {icon:"✅",label:"Won",          value:stats.won,             color:"#16A34A"},
          {icon:"❌",label:"Lost",         value:stats.lost,            color:"#EF4444"},
          {icon:"₹", label:"Won Revenue",  value:fmtINR(stats.revenue), color:"#16A34A"},
          {icon:"🔮",label:"Pipeline",     value:fmtINR(stats.pipeline),color:"#7C3AED"},
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, location, contact..."
            style={{width:"100%",padding:"7px 12px 7px 28px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </div>
        {[
          { value:selClient, set:(v:string)=>{setSelClient(v);setSelPeriod("all");}, opts:[{v:"all",l:"All Clients"},...clients.map(c=>({v:c.id,l:c.name}))], w:140 },
          { value:selStatus, set:(v:string)=>setSelStatus(v), opts:LEAD_STATUSES.map(s=>({v:s,l:s==="all"?"All Statuses":s.charAt(0).toUpperCase()+s.slice(1)})), w:130 },
        ].map((sel,i)=>(
          <div key={i} style={{position:"relative"}}>
            <select value={sel.value} onChange={e=>sel.set(e.target.value)}
              style={{appearance:"none",padding:"7px 28px 7px 10px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",background:"#fff",cursor:"pointer",minWidth:sel.w}}>
              {sel.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <ChevronDown size={12} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#78716C"}}/>
          </div>
        ))}
        <span style={{fontSize:12.5,color:"#A8A29E",fontWeight:500}}>{filtered.length} leads</span>
      </div>

      {/* Table */}
      <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,overflow:"hidden"}}>
        {loading ? (
          <div style={{padding:"60px 0",textAlign:"center",color:"#A8A29E",fontSize:13}}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:"60px 0",textAlign:"center",color:"#A8A29E",fontSize:13}}>No leads found</div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
                  {["Lead","Client","Contact","Period","Status","Location","Exp. Revenue","Collected","Change",""].map(h=>(
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
                        {(l.country||l.state)&&<p style={{fontSize:11,color:"#A8A29E",fontWeight:400,marginTop:1}}>{[l.country,l.state].filter(Boolean).join(", ")}</p>}
                      </td>
                      <td style={{padding:"10px 12px",color:"#57534E",fontSize:12.5}}>{(l as any).clients?.name??"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#78716C"}}>
                        {l.contact_person && <p style={{fontWeight:500,color:"#1C1917"}}>{l.contact_person}</p>}
                        {l.contact_email  && <p style={{fontSize:11}}>{l.contact_email}</p>}
                        {l.contact_phone  && <p style={{fontSize:11}}>{l.contact_phone}</p>}
                        {!l.contact_person && !l.contact_email && !l.contact_phone && <span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#78716C",whiteSpace:"nowrap"}}>
                        {entry
                          ? <span style={{background:"#EEF2FF",color:"#4338CA",padding:"2px 7px",borderRadius:6,fontSize:11.5,fontWeight:500}}>
                              {entry.entry_label || `${new Date(entry.period_start).toLocaleDateString("en-IN",{month:"short",day:"numeric"})}–${new Date(entry.period_end).toLocaleDateString("en-IN",{month:"short",day:"numeric",year:"2-digit"})}`}
                            </span>
                          : <span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <select value={l.status} onChange={e=>updateStatus(l.id,e.target.value,l.status)}
                          style={{appearance:"none",padding:"3px 8px",borderRadius:8,fontSize:11.5,fontWeight:600,background:STATUS_COLOR[l.status]?.bg,color:STATUS_COLOR[l.status]?.text,border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                          {EDIT_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                        </select>
                      </td>
                      <td style={{padding:"10px 12px",color:"#78716C",fontSize:12.5}}>{l.location??"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#D97706",fontSize:12.5}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"#16A34A",fontSize:12.5}}>{l.revenue_collected&&l.revenue_collected>0?fmtINR(l.revenue_collected):"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,whiteSpace:"nowrap"}}>
                        {l.previous_status&&l.previous_status!==l.status
                          ? <span><span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>{" → "}<span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span></span>
                          : <span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>openEdit(l)}
                            style={{background:"transparent",border:"none",cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}
                            onMouseEnter={e=>(e.currentTarget.style.background="#EEF2FF")}
                            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                            <Edit2 size={13} color="#6366F1"/>
                          </button>
                          <button onClick={()=>deleteLead(l.id)}
                            style={{background:"transparent",border:"none",cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}
                            onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")}
                            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                            <Trash2 size={13} color="#EF4444"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editLead && (
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setEditLead(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(2px)"}}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,width:"min(680px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",overflow:"hidden"}}>
            {/* Modal header */}
            <div style={{padding:"18px 24px",borderBottom:"1px solid #F0EEEC",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <h2 style={{fontSize:16,fontWeight:700,color:"#1C1917",margin:0}}>✏️ Edit Lead — {editLead.name}</h2>
              <button onClick={()=>setEditLead(null)} style={{background:"transparent",border:"none",cursor:"pointer",padding:6,borderRadius:8,display:"flex"}}>
                <X size={18} color="#78716C"/>
              </button>
            </div>

            {/* Modal body */}
            <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
              {/* Basic */}
              <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:10}}>LEAD DETAILS</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {field("Lead Name *","name")}
                {field("Cycle Label","cycle_label","text","e.g. Q1 2025")}
              </div>

              {/* Location */}
              <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:10}}>LOCATION</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                {field("Country","country","text","e.g. India")}
                {field("State","state","text","e.g. Maharashtra")}
                {field("City / Location","location")}
              </div>

              {/* Contact */}
              <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:10}}>CONTACT PERSON</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                {field("Contact Person","contact_person","text","Full name")}
                {field("Email","contact_email","email","email@school.com")}
                {field("Phone Number","contact_phone","text","+91 98765 43210")}
              </div>

              {/* Revenue */}
              <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:10}}>REVENUE & VOLUME</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {field("Expected Volume","expected_volume","number")}
                {field("Expected Revenue (₹)","expected_revenue","number")}
              </div>

              {/* Status */}
              <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:10}}>STATUS</p>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Status</label>
                <select className="input" value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value}))} style={{fontSize:13,maxWidth:200}}>
                  {EDIT_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>

              {/* Notes */}
              <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:10}}>NOTES</p>
              <textarea className="input" rows={3} placeholder="Internal notes..." value={editForm.notes}
                onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))}
                style={{resize:"none",fontSize:13}}/>
            </div>

            {/* Modal footer */}
            <div style={{padding:"14px 24px",borderTop:"1px solid #F0EEEC",display:"flex",gap:8,justifyContent:"flex-end",flexShrink:0}}>
              <button onClick={()=>setEditLead(null)}
                style={{padding:"8px 18px",border:"1px solid #E7E5E4",borderRadius:8,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:"#78716C"}}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 22px",background:"#E8611A",border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",opacity:saving?0.7:1}}>
                <Save size={14}/> {saving?"Saving...":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

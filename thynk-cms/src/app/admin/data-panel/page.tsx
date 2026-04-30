
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Save, Trash2, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import toast from "react-hot-toast";

// ─── Constants ───────────────────────────────────────────────────────────────
const LEAD_STATUSES = ["new","contacted","qualified","proposal","negotiation","won","lost"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

const STATUS_COLOR: Record<LeadStatus, string> = {
  new:"#3B82F6", contacted:"#F59E0B", qualified:"#F97316",
  proposal:"#8B5CF6", negotiation:"#F97316", won:"#16A34A", lost:"#EF4444",
};

const CALL_METRICS = [
  { key:"calls_made",             label:"New Calls Made",         icon:"📞", color:"#7C3AED", bg:"#F5F3FF" },
  { key:"follow_up_calls_made",   label:"Follow Up Call Made",    icon:"🔁", color:"#2563EB", bg:"#EFF6FF" },
  { key:"demo_scheduled",         label:"Demo Scheduled",         icon:"📅", color:"#0891B2", bg:"#ECFEFF" },
  { key:"demo_completed",         label:"Demo Completed",         icon:"✅", color:"#16A34A", bg:"#F0FDF4" },
  { key:"demo_rescheduled",       label:"Demo Rescheduled",       icon:"🔄", color:"#D97706", bg:"#FFFBEB" },
  { key:"follow_up_meeting_done", label:"Follow Up Meeting Done", icon:"🤝", color:"#E8611A", bg:"#FFF7ED" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client { id:string; name:string; }
interface DataEntry {
  id:string; client_id:string; period_start:string; period_end:string;
  entry_label?:string; total_licences?:number; total_revenue_collected?:number;
  expected_collection?:number; email_summary?:string; whatsapp_summary?:string; calls_summary?:string;
}
interface Lead {
  id:string; client_id:string; data_entry_id?:string|null; name:string;
  country?:string; state?:string; location?:string; expected_volume?:number|null;
  expected_revenue?:number|null; revenue_collected?:number|null;
  total_licences_allocated?:number|null; status:LeadStatus; notes?:string;
  cycle_label?:string; previous_status?:string; is_updated_this_cycle?:boolean;
}
interface CampaignUpdate {
  id:string; data_entry_id:string; client_id:string; channel:"email"|"whatsapp"|"calls";
  update_date:string; email_sent:number; email_opened:number; email_clicked:number;
  whatsapp_sent:number; whatsapp_delivered:number; whatsapp_replied:number;
  calls_made:number; calls_connected:number; calls_converted:number;
  follow_up_calls_made:number; demo_scheduled:number; demo_completed:number;
  demo_rescheduled:number; follow_up_meeting_done:number; notes?:string;
}
interface EntryForm {
  period_start:string; period_end:string; entry_label:string; total_licences:number;
  total_revenue_collected:number; expected_collection:number;
  email_summary:string; whatsapp_summary:string; calls_summary:string;
}
interface LeadForm {
  name:string; country:string; state:string; location:string;
  expected_volume:string; expected_revenue:string; status:LeadStatus; notes:string; cycle_label:string;
}
interface UpdateForm {
  channel:"email"|"whatsapp"|"calls"; update_date:string;
  email_sent:number; email_opened:number; email_clicked:number;
  whatsapp_sent:number; whatsapp_delivered:number; whatsapp_replied:number;
  calls_made:number; calls_connected:number; calls_converted:number;
  follow_up_calls_made:number; demo_scheduled:number; demo_completed:number;
  demo_rescheduled:number; follow_up_meeting_done:number; notes:string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const EMPTY_ENTRY:EntryForm = {
  period_start:"", period_end:"", entry_label:"", total_licences:0,
  total_revenue_collected:0, expected_collection:0, email_summary:"", whatsapp_summary:"", calls_summary:"",
};
const EMPTY_LEAD:LeadForm = {
  name:"", country:"", state:"", location:"", expected_volume:"", expected_revenue:"",
  status:"new", notes:"", cycle_label:"",
};
const mkUpdate = ():UpdateForm => ({
  channel:"email", update_date:new Date().toISOString().split("T")[0],
  email_sent:0, email_opened:0, email_clicked:0,
  whatsapp_sent:0, whatsapp_delivered:0, whatsapp_replied:0,
  calls_made:0, calls_connected:0, calls_converted:0,
  follow_up_calls_made:0, demo_scheduled:0, demo_completed:0,
  demo_rescheduled:0, follow_up_meeting_done:0, notes:"",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n:number) =>
  n>=100000 ? `₹${(n/100000).toFixed(1)}L` : n>=1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`;

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function DataPanelPage() {
  const [clients,       setClients]       = useState<Client[]>([]);
  const [selClient,     setSelClient]     = useState("");
  const [entries,       setEntries]       = useState<DataEntry[]>([]);
  const [leads,         setLeads]         = useState<Lead[]>([]);
  const [updates,       setUpdates]       = useState<CampaignUpdate[]>([]);
  const [activeEntry,   setActiveEntry]   = useState<string|null>(null);
  const [form,          setForm]          = useState<EntryForm>(EMPTY_ENTRY);
  const [newLead,       setNewLead]       = useState<LeadForm>(EMPTY_LEAD);
  const [showLeadForm,  setShowLeadForm]  = useState(false);
  const [newUpdate,     setNewUpdate]     = useState<UpdateForm>(mkUpdate());
  const [showUpdateForm,setShowUpdateForm]= useState(false);
  const [saving,        setSaving]        = useState(false);
  const [openSection,   setOpenSection]   = useState<string>("period");

  const supabase = createClient();

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("clients").select("id,name").order("name").then(r => setClients(r.data??[]));
  }, []);

  useEffect(() => {
    if (!selClient) return;
    loadEntries(); loadLeads();
  }, [selClient]);

  useEffect(() => {
    if (activeEntry && activeEntry !== "new") loadUpdates();
    else setUpdates([]);
  }, [activeEntry]);

  async function loadEntries() {
    const {data} = await supabase.from("data_entries").select("*")
      .eq("client_id", selClient).order("period_start", {ascending:false});
    setEntries(data??[]);
  }
  async function loadLeads() {
    const {data} = await supabase.from("leads").select("*")
      .eq("client_id", selClient).order("created_at", {ascending:false});
    setLeads(data??[]);
  }
  async function loadUpdates() {
    if (!activeEntry || activeEntry==="new") return;
    const {data} = await supabase.from("campaign_updates").select("*")
      .eq("data_entry_id", activeEntry).order("update_date").order("created_at");
    setUpdates(data??[]);
  }

  // ── Resync period totals from all updates ────────────────────────────────────
  async function resync(entryId:string, allUpds:any[]) {
    const eu = allUpds.filter((u:any)=>u.channel==="email");
    const wu = allUpds.filter((u:any)=>u.channel==="whatsapp");
    const cu = allUpds.filter((u:any)=>u.channel==="calls");
    const sc = (k:string) => cu.reduce((s:number,u:any)=>s+(u[k]??0),0);
    await supabase.from("data_entries").update({
      email_sent:       eu.reduce((s:number,u:any)=>s+(u.email_sent??0),0),
      email_opened:     eu.reduce((s:number,u:any)=>s+(u.email_opened??0),0),
      email_clicked:    eu.reduce((s:number,u:any)=>s+(u.email_clicked??0),0),
      whatsapp_sent:    wu.reduce((s:number,u:any)=>s+(u.whatsapp_sent??0),0),
      whatsapp_delivered:wu.reduce((s:number,u:any)=>s+(u.whatsapp_delivered??0),0),
      whatsapp_replied: wu.reduce((s:number,u:any)=>s+(u.whatsapp_replied??0),0),
      calls_made:           sc("calls_made"),
      calls_connected:      sc("calls_connected"),
      calls_converted:      sc("calls_converted"),
      follow_up_calls_made: sc("follow_up_calls_made"),
      demo_scheduled:       sc("demo_scheduled"),
      demo_completed:       sc("demo_completed"),
      demo_rescheduled:     sc("demo_rescheduled"),
      follow_up_meeting_done: sc("follow_up_meeting_done"),
      updated_at: new Date().toISOString(),
    }).eq("id", entryId);
  }

  // ── Save period ───────────────────────────────────────────────────────────────
  async function savePeriod() {
    if (!form.period_start || !form.period_end) { toast.error("Set period dates"); return; }
    setSaving(true);
    const payload = { ...form, client_id:selClient, updated_at:new Date().toISOString() };
    if (activeEntry && activeEntry!=="new") {
      const {error} = await supabase.from("data_entries").update(payload).eq("id", activeEntry);
      if (error) toast.error(error.message); else { toast.success("Period saved"); loadEntries(); }
    } else {
      const {data,error} = await supabase.from("data_entries")
        .insert({...payload, created_at:new Date().toISOString()}).select().single();
      if (error) toast.error(error.message);
      else { setActiveEntry(data.id); toast.success("Period created"); loadEntries(); }
    }
    setSaving(false);
  }

  async function deletePeriod(id:string) {
    if (!confirm("Delete this period and all its campaign data?")) return;
    await supabase.from("campaign_updates").delete().eq("data_entry_id",id);
    await supabase.from("leads").update({data_entry_id:null}).eq("data_entry_id",id);
    await supabase.from("data_entries").delete().eq("id",id);
    toast.success("Period deleted");
    setActiveEntry(null); setForm(EMPTY_ENTRY); loadEntries(); loadLeads();
  }

  function selectEntry(e:DataEntry) {
    setActiveEntry(e.id);
    setForm({
      period_start:e.period_start, period_end:e.period_end, entry_label:e.entry_label??"",
      total_licences:e.total_licences??0, total_revenue_collected:e.total_revenue_collected??0,
      expected_collection:e.expected_collection??0,
      email_summary:e.email_summary??"", whatsapp_summary:e.whatsapp_summary??"", calls_summary:e.calls_summary??"",
    });
    setOpenSection("period");
  }

  // ── Campaign update CRUD ──────────────────────────────────────────────────────
  async function saveUpdate() {
    if (!activeEntry||activeEntry==="new") { toast.error("Save the period first"); return; }
    const {error} = await supabase.from("campaign_updates")
      .insert({...newUpdate, data_entry_id:activeEntry, client_id:selClient, created_at:new Date().toISOString()});
    if (error) { toast.error(error.message); return; }
    const {data:all} = await supabase.from("campaign_updates").select("*").eq("data_entry_id",activeEntry);
    await resync(activeEntry, all??[]);
    toast.success("Entry added"); setNewUpdate(mkUpdate()); setShowUpdateForm(false);
    loadUpdates(); loadEntries();
  }
  async function deleteUpdate(id:string) {
    await supabase.from("campaign_updates").delete().eq("id",id);
    if (activeEntry&&activeEntry!=="new") {
      const {data:all} = await supabase.from("campaign_updates").select("*").eq("data_entry_id",activeEntry);
      await resync(activeEntry, all??[]); loadEntries();
    }
    toast.success("Deleted"); loadUpdates();
  }

  // ── Lead CRUD ────────────────────────────────────────────────────────────────
  async function saveLead() {
    if (!newLead.name) { toast.error("Lead name required"); return; }
    if (!activeEntry||activeEntry==="new") { toast.error("Save the period first"); return; }
    const {error} = await supabase.from("leads").insert({
      ...newLead, client_id:selClient, data_entry_id:activeEntry,
      expected_volume:newLead.expected_volume?Number(newLead.expected_volume):null,
      expected_revenue:newLead.expected_revenue?Number(newLead.expected_revenue):null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Lead added"); setNewLead(EMPTY_LEAD); setShowLeadForm(false); loadLeads(); }
  }
  async function deleteLead(id:string) {
    if (!confirm("Delete this lead?")) return;
    await supabase.from("leads").delete().eq("id",id);
    toast.success("Deleted"); loadLeads();
  }
  async function updateLeadStatus(id:string, ns:string, os:string) {
    await supabase.from("leads").update({
      status:ns, previous_status:os, status_updated_at:new Date().toISOString(),
      is_updated_this_cycle:true, updated_at:new Date().toISOString(),
    }).eq("id",id);
    loadLeads();
  }

  // ── Revenue save from inline table ───────────────────────────────────────────
  async function saveLeadRevenue(edits:Record<string,{licences:string;revenue:string;expected:string}>) {
    if (!activeEntry||activeEntry==="new") { toast.error("Save the period first"); return; }
    for (const [id,v] of Object.entries(edits)) {
      await supabase.from("leads").update({
        total_licences_allocated: v.licences?Number(v.licences):null,
        revenue_collected:        v.revenue ?Number(v.revenue) :0,
        expected_revenue:         v.expected?Number(v.expected):null,
        updated_at:new Date().toISOString(),
      }).eq("id",id);
    }
    const {data:all} = await supabase.from("leads")
      .select("revenue_collected,expected_revenue,status").eq("client_id",selClient);
    const totalRev = (all??[]).reduce((s:number,l:any)=>s+(l.revenue_collected??0),0);
    const totalExp = (all??[]).filter((l:any)=>l.status!=="lost").reduce((s:number,l:any)=>s+(l.expected_revenue??0),0);
    const totalLic = Object.values(edits).reduce((s,v)=>s+(Number(v.licences)||0),0);
    await supabase.from("data_entries").update({
      total_revenue_collected:totalRev,
      expected_collection:totalExp,
      total_licences:totalLic||form.total_licences,
      updated_at:new Date().toISOString(),
    }).eq("id",activeEntry);
    setForm(p=>({...p,total_revenue_collected:totalRev,expected_collection:totalExp}));
    toast.success("Revenue & licences saved"); loadLeads(); loadEntries();
  }

  // ── Accumulated call totals ───────────────────────────────────────────────────
  const callUpds = updates.filter(u=>u.channel==="calls");
  const emailUpds = updates.filter(u=>u.channel==="email");
  const waUpds   = updates.filter(u=>u.channel==="whatsapp");
  const sc = (k:keyof CampaignUpdate) => callUpds.reduce((s,u)=>s+((u[k] as number)??0),0);
  const acc = {
    emailSent:    emailUpds.reduce((s,u)=>s+u.email_sent,0),
    emailOpened:  emailUpds.reduce((s,u)=>s+u.email_opened,0),
    emailClicked: emailUpds.reduce((s,u)=>s+u.email_clicked,0),
    waSent:       waUpds.reduce((s,u)=>s+u.whatsapp_sent,0),
    waDelivered:  waUpds.reduce((s,u)=>s+u.whatsapp_delivered,0),
    waReplied:    waUpds.reduce((s,u)=>s+u.whatsapp_replied,0),
    callsMade:            sc("calls_made"),
    callsConnected:       sc("calls_connected"),
    callsConverted:       sc("calls_converted"),
    followUpCallsMade:    sc("follow_up_calls_made"),
    demoScheduled:        sc("demo_scheduled"),
    demoCompleted:        sc("demo_completed"),
    demoRescheduled:      sc("demo_rescheduled"),
    followUpMeetingDone:  sc("follow_up_meeting_done"),
  };

  const periodLabel = (e:DataEntry) =>
    e.entry_label ||
    `${new Date(e.period_start).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"})}`;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:"#1C1917",fontFamily:"Fraunces,Georgia,serif"}}>Data Panel</h1>
        <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Select a client, pick or create a period, then log campaign data and leads.</p>
      </div>

      {/* ── Client selector ── */}
      <div style={{maxWidth:300,marginBottom:24}}>
        <label style={{display:"block",fontSize:12,fontWeight:600,color:"#57534E",marginBottom:5}}>Select Client</label>
        <select className="input" value={selClient} onChange={e=>{setSelClient(e.target.value);setActiveEntry(null);setForm(EMPTY_ENTRY);}}>
          <option value="">Choose a client...</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selClient && (
        <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:16}}>

          {/* ══ LEFT: Period Sidebar ══ */}
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden",height:"fit-content",position:"sticky",top:16}}>
            <div style={{padding:"12px 14px",background:"#FAFAF9",borderBottom:"1px solid #F0EEEC",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#1C1917"}}>Periods</span>
              <button onClick={()=>{setActiveEntry("new");setForm(EMPTY_ENTRY);setUpdates([]);setOpenSection("period");}}
                style={{width:28,height:28,borderRadius:8,background:"#E8611A",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Plus size={14} color="#fff"/>
              </button>
            </div>

            {entries.length===0 && activeEntry!=="new" && (
              <p style={{fontSize:12.5,textAlign:"center",padding:"24px 0",color:"#A8A29E"}}>No periods yet.<br/>Click + to create one.</p>
            )}

            {activeEntry==="new" && (
              <div style={{padding:"10px 14px",borderLeft:"3px solid #E8611A",background:"#FFF7ED"}}>
                <p style={{fontSize:12.5,fontWeight:700,color:"#E8611A"}}>+ New Period</p>
                <p style={{fontSize:11,color:"#A8A29E",marginTop:2}}>Fill dates on the right & Save</p>
              </div>
            )}

            {entries.map(entry=>{
              const isActive = activeEntry===entry.id;
              return (
                <div key={entry.id} style={{position:"relative",borderBottom:"1px solid #F5F4F0"}}>
                  <button onClick={()=>selectEntry(entry)}
                    style={{width:"100%",textAlign:"left",padding:"10px 36px 10px 14px",
                      borderLeft:`3px solid ${isActive?"#E8611A":"transparent"}`,
                      background:isActive?"#FFF7ED":"transparent",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    <p style={{fontSize:12.5,fontWeight:600,color:"#1C1917"}}>{periodLabel(entry)}</p>
                    <p style={{fontSize:11,color:"#A8A29E",marginTop:2}}>
                      {entry.period_start} → {entry.period_end}
                    </p>
                    <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                      {(entry.total_revenue_collected??0)>0 &&
                        <span style={{fontSize:10,background:"#DCFCE7",color:"#15803D",padding:"1px 6px",borderRadius:4,fontWeight:600}}>
                          {fmtINR(entry.total_revenue_collected!)}
                        </span>}
                      {(entry.total_licences??0)>0 &&
                        <span style={{fontSize:10,background:"#DBEAFE",color:"#1D4ED8",padding:"1px 6px",borderRadius:4,fontWeight:600}}>
                          {entry.total_licences} lic
                        </span>}
                    </div>
                  </button>
                  <button onClick={()=>deletePeriod(entry.id)}
                    style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                      background:"transparent",border:"none",cursor:"pointer",padding:"4px 5px",borderRadius:5,display:"flex"}}
                    onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <Trash2 size={12} color="#EF4444"/>
                  </button>
                </div>
              );
            })}
          </div>

          {/* ══ RIGHT: Detail ══ */}
          {activeEntry ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>

              {/* ── Section 1: Period dates ── */}
              <CollapsibleSection id="period" label="Period Details" color="#6366F1" open={openSection} onToggle={s=>setOpenSection(openSection===s?"":s)}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:8}}>
                  <div>
                    <label style={lbl}>Start Date *</label>
                    <input type="date" className="input" value={form.period_start}
                      onChange={e=>setForm(p=>({...p,period_start:e.target.value}))} style={{fontSize:13}}/>
                  </div>
                  <div>
                    <label style={lbl}>End Date *</label>
                    <input type="date" className="input" value={form.period_end}
                      onChange={e=>setForm(p=>({...p,period_end:e.target.value}))} style={{fontSize:13}}/>
                  </div>
                  <div>
                    <label style={lbl}>Period Label</label>
                    <input className="input" value={form.entry_label}
                      onChange={e=>setForm(p=>({...p,entry_label:e.target.value}))}
                      placeholder="e.g. April 2026" style={{fontSize:13}}/>
                  </div>
                </div>
                <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}>
                  <button onClick={savePeriod} disabled={saving} className="btn-primary">
                    <Save size={13}/> {saving?"Saving...":activeEntry==="new"?"Create Period":"Save Period"}
                  </button>
                </div>
              </CollapsibleSection>

              {/* ── Section 2: Revenue & Licences (only after period saved) ── */}
              {activeEntry!=="new" && (
                <CollapsibleSection id="revenue" label="Revenue & Licences" color="#16A34A" open={openSection} onToggle={s=>setOpenSection(openSection===s?"":s)}>
                  {/* Summary bar */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,margin:"12px 0 16px"}}>
                    <div style={{background:"#F0FDF4",border:"1px solid #A7F3D0",borderRadius:10,padding:"12px 16px",textAlign:"center"}}>
                      <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",marginBottom:4}}>REVENUE COLLECTED</p>
                      <p style={{fontSize:22,fontWeight:800,color:"#16A34A",lineHeight:1}}>
                        {fmtINR(form.total_revenue_collected??0)}
                      </p>
                    </div>
                    <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:10,padding:"12px 16px",textAlign:"center"}}>
                      <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",marginBottom:4}}>EXPECTED COLLECTION</p>
                      <p style={{fontSize:22,fontWeight:800,color:"#D97706",lineHeight:1}}>
                        {fmtINR(form.expected_collection??0)}
                      </p>
                    </div>
                    <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,padding:"12px 16px",textAlign:"center"}}>
                      <p style={{fontSize:11,fontWeight:700,color:"#A8A29E",marginBottom:4}}>TOTAL LICENCES</p>
                      <p style={{fontSize:22,fontWeight:800,color:"#2563EB",lineHeight:1}}>
                        {(form.total_licences??0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <p style={{fontSize:12,color:"#78716C",marginBottom:10}}>
                    Enter revenue, expected, and licences per lead below. Totals above update automatically.
                  </p>
                  <LeadRevenueTable leads={leads} activeEntry={activeEntry} onSave={saveLeadRevenue}/>
                </CollapsibleSection>
              )}

              {/* ── Section 3: Campaign Data (only after period saved) ── */}
              {activeEntry!=="new" && (
                <CollapsibleSection id="campaign" label={`Campaign Data Entries (${updates.length})`} color="#7C3AED" open={openSection} onToggle={s=>setOpenSection(openSection===s?"":s)}>
                  
                  {/* Add Entry button */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,marginTop:4}}>
                    <p style={{fontSize:12.5,color:"#78716C"}}>{updates.length} entries — all rows accumulate into period totals</p>
                    {!showUpdateForm && (
                      <button onClick={()=>setShowUpdateForm(true)} className="btn-primary" style={{padding:"6px 14px",fontSize:12}}>
                        <Plus size={12}/> Add Entry
                      </button>
                    )}
                  </div>

                  {/* ── INLINE Add Entry Form ── */}
                  {showUpdateForm && (
                    <div style={{background:"#F9F8F7",border:"1px solid #DDD6FE",borderRadius:12,padding:16,marginBottom:16}}>
                      
                      {/* Channel + Date */}
                      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
                        <div>
                          <label style={lbl}>Channel</label>
                          <select className="input" value={newUpdate.channel}
                            onChange={e=>{
                              const ch = e.target.value as "email"|"whatsapp"|"calls";
                              setNewUpdate(p=>({...p, channel:ch}));
                            }}
                            style={{fontSize:13,minWidth:160}}>
                            <option value="email">📧 Email</option>
                            <option value="whatsapp">💬 WhatsApp</option>
                            <option value="calls">📞 Calls</option>
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>Date</label>
                          <input type="date" className="input" value={newUpdate.update_date}
                            onChange={e=>setNewUpdate(p=>({...p,update_date:e.target.value}))} style={{fontSize:13}}/>
                        </div>
                        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                          <button onClick={()=>setShowUpdateForm(false)} className="btn-secondary" style={{fontSize:12}}>Cancel</button>
                          <button onClick={saveUpdate} className="btn-primary" style={{fontSize:12}}>Add Row</button>
                        </div>
                      </div>

                      {/* ── CALLS fields ── */}
                      {newUpdate.channel==="calls" && (
                        <div>
                          <p style={{fontSize:12.5,fontWeight:700,color:"#6D28D9",marginBottom:12,padding:"8px 12px",background:"#EDE9FE",borderRadius:8}}>
                            📞 Enter count for each call activity below
                          </p>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
                            {[
                              {key:"calls_made",           label:"New Calls Made",        icon:"📞",color:"#7C3AED",bg:"#F5F3FF"},
                              {key:"follow_up_calls_made", label:"Follow Up Call Made",   icon:"🔁",color:"#2563EB",bg:"#EFF6FF"},
                              {key:"demo_scheduled",       label:"Demo Scheduled",        icon:"📅",color:"#0891B2",bg:"#ECFEFF"},
                              {key:"demo_completed",       label:"Demo Completed",        icon:"✅",color:"#16A34A",bg:"#F0FDF4"},
                              {key:"demo_rescheduled",     label:"Demo Rescheduled",      icon:"🔄",color:"#D97706",bg:"#FFFBEB"},
                              {key:"follow_up_meeting_done",label:"Follow Up Meeting Done",icon:"🤝",color:"#E8611A",bg:"#FFF7ED"},
                            ].map(({key,label,icon,color,bg})=>(
                              <div key={key} style={{background:bg,border:`1.5px solid ${color}40`,borderRadius:10,padding:"14px"}}>
                                <label style={{display:"block",fontSize:12,fontWeight:700,color,marginBottom:10}}>{icon} {label}</label>
                                <input
                                  type="number" min={0}
                                  value={(newUpdate as any)[key]}
                                  onChange={e=>setNewUpdate(p=>({...p,[key]:Number(e.target.value)}))}
                                  style={{width:"100%",padding:"10px",border:`1px solid ${color}50`,borderRadius:8,fontSize:18,fontWeight:800,textAlign:"center",fontFamily:"inherit",outline:"none",background:"#fff",color}}
                                />
                              </div>
                            ))}
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                            {([
                              {key:"calls_connected",label:"Connected (funnel)",color:"#2563EB",bg:"#EFF6FF"},
                              {key:"calls_converted",label:"Converted (funnel)",color:"#16A34A",bg:"#F0FDF4"},
                            ]).map(({key,label,color,bg})=>(
                              <div key={key} style={{background:bg,border:`1px solid ${color}30`,borderRadius:10,padding:"12px"}}>
                                <label style={{display:"block",fontSize:12,fontWeight:700,color,marginBottom:8}}>{label}</label>
                                <input type="number" min={0}
                                  value={(newUpdate as any)[key]}
                                  onChange={e=>setNewUpdate(p=>({...p,[key]:Number(e.target.value)}))}
                                  style={{width:"100%",padding:"8px",border:`1px solid ${color}40`,borderRadius:8,fontSize:16,fontWeight:700,textAlign:"center",fontFamily:"inherit",outline:"none",background:"#fff",color}}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── EMAIL fields ── */}
                      {newUpdate.channel==="email" && (
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                          {([
                            {key:"email_sent",   label:"Sent",    color:"#1D4ED8",bg:"#EFF6FF"},
                            {key:"email_opened", label:"Opened",  color:"#0891B2",bg:"#ECFEFF"},
                            {key:"email_clicked",label:"Clicked", color:"#7C3AED",bg:"#F5F3FF"},
                          ]).map(({key,label,color,bg})=>(
                            <div key={key} style={{background:bg,border:`1px solid ${color}30`,borderRadius:10,padding:"14px"}}>
                              <label style={{display:"block",fontSize:12,fontWeight:700,color,marginBottom:10}}>{label}</label>
                              <input type="number" min={0}
                                value={(newUpdate as any)[key]}
                                onChange={e=>setNewUpdate(p=>({...p,[key]:Number(e.target.value)}))}
                                style={{width:"100%",padding:"10px",border:`1px solid ${color}40`,borderRadius:8,fontSize:18,fontWeight:800,textAlign:"center",fontFamily:"inherit",outline:"none",background:"#fff",color}}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── WHATSAPP fields ── */}
                      {newUpdate.channel==="whatsapp" && (
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                          {([
                            {key:"whatsapp_sent",      label:"Sent",      color:"#15803D",bg:"#F0FDF4"},
                            {key:"whatsapp_delivered", label:"Delivered", color:"#0891B2",bg:"#ECFEFF"},
                            {key:"whatsapp_replied",   label:"Replied",   color:"#7C3AED",bg:"#F5F3FF"},
                          ]).map(({key,label,color,bg})=>(
                            <div key={key} style={{background:bg,border:`1px solid ${color}30`,borderRadius:10,padding:"14px"}}>
                              <label style={{display:"block",fontSize:12,fontWeight:700,color,marginBottom:10}}>{label}</label>
                              <input type="number" min={0}
                                value={(newUpdate as any)[key]}
                                onChange={e=>setNewUpdate(p=>({...p,[key]:Number(e.target.value)}))}
                                style={{width:"100%",padding:"10px",border:`1px solid ${color}40`,borderRadius:8,fontSize:18,fontWeight:800,textAlign:"center",fontFamily:"inherit",outline:"none",background:"#fff",color}}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      <div style={{marginTop:12}}>
                        <label style={lbl}>Notes (optional)</label>
                        <textarea className="input" rows={2}
                          value={newUpdate.notes}
                          onChange={e=>setNewUpdate(p=>({...p,notes:e.target.value}))}
                          style={{resize:"none",fontSize:13}}/>
                      </div>
                    </div>
                  )}

                  {/* ── Rows table ── */}
                  {updates.length>0 && (
                    <div style={{overflowX:"auto",marginBottom:14}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
                        <thead><tr style={{background:"#F9F8F7",borderBottom:"1px solid #F0EEEC"}}>
                          {["Date","Channel","Metric 1","Metric 2","Metric 3","Notes",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:11,fontWeight:600,color:"#A8A29E"}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {updates.map(u=>(
                            <tr key={u.id} style={{borderBottom:"1px solid #F5F4F0"}}>
                              <td style={{padding:"8px 10px",color:"#78716C"}}>{u.update_date}</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600,
                                  background:u.channel==="email"?"#DBEAFE":u.channel==="whatsapp"?"#DCFCE7":"#EDE9FE",
                                  color:u.channel==="email"?"#1D4ED8":u.channel==="whatsapp"?"#15803D":"#6D28D9"}}>
                                  {u.channel}
                                </span>
                              </td>
                              <td style={{padding:"8px 10px",fontWeight:700,color:"#1C1917"}}>
                                {u.channel==="email"?`${u.email_sent} sent`:u.channel==="whatsapp"?`${u.whatsapp_sent} sent`:`${u.calls_made} new calls`}
                              </td>
                              <td style={{padding:"8px 10px",color:"#57534E"}}>
                                {u.channel==="email"?`${u.email_opened} opened`:u.channel==="whatsapp"?`${u.whatsapp_delivered} delivered`:`${u.follow_up_calls_made} follow-up`}
                              </td>
                              <td style={{padding:"8px 10px",color:"#57534E"}}>
                                {u.channel==="email"?`${u.email_clicked} clicked`:u.channel==="whatsapp"?`${u.whatsapp_replied} replied`:`${u.demo_scheduled} demo sched.`}
                              </td>
                              <td style={{padding:"8px 10px",color:"#A8A29E",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.notes||"—"}</td>
                              <td style={{padding:"8px 10px"}}>
                                <button onClick={()=>deleteUpdate(u.id)}
                                  style={{background:"transparent",border:"none",cursor:"pointer",padding:4,borderRadius:5,display:"flex"}}
                                  onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")}
                                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                                  <Trash2 size={12} color="#EF4444"/>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ── Accumulated totals ── */}
                  {updates.length>0 && (
                    <div>
                      <div style={{background:"#F0FDF4",border:"1px solid #A7F3D0",borderRadius:10,padding:14,marginBottom:12}}>
                        <p style={{fontSize:12,fontWeight:700,color:"#15803D",marginBottom:10}}>✅ Accumulated Totals ({updates.length} entries)</p>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                          {[
                            {title:"📧 EMAIL",color:"#1D4ED8",bd:"#BFDBFE",items:[["Sent",acc.emailSent,0],["Opened",acc.emailOpened,acc.emailSent],["Clicked",acc.emailClicked,acc.emailSent]] as [string,number,number][]},
                            {title:"💬 WHATSAPP",color:"#15803D",bd:"#A7F3D0",items:[["Sent",acc.waSent,0],["Delivered",acc.waDelivered,acc.waSent],["Replied",acc.waReplied,acc.waSent]] as [string,number,number][]},
                            {title:"📞 CALLS",color:"#6D28D9",bd:"#DDD6FE",items:[
                              ["New Calls Made",acc.callsMade,0],
                              ["Follow Up Call Made",acc.followUpCallsMade,0],
                              ["Demo Scheduled",acc.demoScheduled,acc.callsMade],
                              ["Demo Completed",acc.demoCompleted,acc.demoScheduled],
                              ["Demo Rescheduled",acc.demoRescheduled,acc.demoScheduled],
                              ["Follow Up Meeting Done",acc.followUpMeetingDone,0],
                              ["Connected",acc.callsConnected,acc.callsMade],
                              ["Converted",acc.callsConverted,acc.callsMade],
                            ] as [string,number,number][]},
                          ].map(({title,color,bd,items})=>(
                            <div key={title} style={{background:"#fff",borderRadius:8,padding:12,border:`1px solid ${bd}`}}>
                              <p style={{fontSize:11,fontWeight:700,color,marginBottom:8}}>{title}</p>
                              {items.map(([label,value,total])=>(
                                <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"1px solid #F5F4F0"}}>
                                  <span style={{color:"#78716C"}}>{label}</span>
                                  <span>
                                    <span style={{fontWeight:700,color}}>{value}</span>
                                    {total>0&&<span style={{fontSize:10.5,color:"#A8A29E",marginLeft:4}}>({Math.round((value/total)*100)}%)</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Call activity visual cards */}
                      {(acc.callsMade+acc.followUpCallsMade+acc.demoScheduled+acc.demoCompleted+acc.demoRescheduled+acc.followUpMeetingDone)>0 && (
                        <div>
                          <p style={{fontSize:12,fontWeight:700,color:"#6D28D9",marginBottom:8}}>📞 Call Activity Breakdown</p>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
                            {[
                              {key:"callsMade",           label:"New Calls Made",        icon:"📞",color:"#7C3AED",bg:"#F5F3FF"},
                              {key:"followUpCallsMade",   label:"Follow Up Call Made",   icon:"🔁",color:"#2563EB",bg:"#EFF6FF"},
                              {key:"demoScheduled",       label:"Demo Scheduled",        icon:"📅",color:"#0891B2",bg:"#ECFEFF"},
                              {key:"demoCompleted",       label:"Demo Completed",        icon:"✅",color:"#16A34A",bg:"#F0FDF4"},
                              {key:"demoRescheduled",     label:"Demo Rescheduled",      icon:"🔄",color:"#D97706",bg:"#FFFBEB"},
                              {key:"followUpMeetingDone", label:"Follow Up Meeting Done",icon:"🤝",color:"#E8611A",bg:"#FFF7ED"},
                            ].map(({key,label,icon,color,bg})=>(
                              <div key={key} style={{background:bg,border:`1px solid ${color}25`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                                <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                                <p style={{fontSize:26,fontWeight:800,color,lineHeight:1}}>{(acc as any)[key]??0}</p>
                                <p style={{fontSize:10.5,fontWeight:600,color:"#57534E",marginTop:5,lineHeight:1.3}}>{label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {updates.length===0 && !showUpdateForm && (
                    <div style={{textAlign:"center",padding:"24px 0",color:"#A8A29E",fontSize:13}}>
                      No entries yet. Click "Add Entry" to log email, WhatsApp or call data.
                    </div>
                  )}

                </CollapsibleSection>
              )}

              {/* ── Section 4: Campaign Notes ── */}
              {activeEntry!=="new" && (
                <CollapsibleSection id="notes" label="Campaign Notes (optional)" color="#78716C" open={openSection} onToggle={s=>setOpenSection(openSection===s?"":s)}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:8}}>
                    {([["Email Notes","email_summary"],["WhatsApp Notes","whatsapp_summary"],["Calls Notes","calls_summary"]] as [string,keyof EntryForm][]).map(([label,key])=>(
                      <div key={key}>
                        <label style={lbl}>{label}</label>
                        <textarea className="input" rows={3} value={form[key] as string}
                          onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                          style={{resize:"none",fontSize:13}}/>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={savePeriod} disabled={saving} className="btn-primary">
                      <Save size={13}/> Save Notes
                    </button>
                  </div>
                </CollapsibleSection>
              )}

              {/* ── Section 5: Leads ── */}
              {activeEntry!=="new" && (
                <CollapsibleSection id="leads" label={`Lead Details (${leads.length})`} color="#E8611A" open={openSection} onToggle={s=>setOpenSection(openSection===s?"":s)}>
                  <LeadsSection
                    leads={leads} activeEntry={activeEntry}
                    showForm={showLeadForm} newLead={newLead}
                    onOpenForm={()=>setShowLeadForm(true)}
                    onCloseForm={()=>setShowLeadForm(false)}
                    onChange={(k,v)=>setNewLead(p=>({...p,[k]:v}))}
                    onSave={saveLead} onDelete={deleteLead} onUpdateStatus={updateLeadStatus}/>
                </CollapsibleSection>
              )}

            </div>
          ) : (
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:"60px 0",textAlign:"center"}}>
              <p style={{fontSize:24,marginBottom:8}}>📋</p>
              <p style={{fontSize:13.5,fontWeight:600,color:"#1C1917"}}>No period selected</p>
              <p style={{fontSize:12.5,color:"#A8A29E",marginTop:4}}>Select a period from the left or click + to create a new one</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared label style ────────────────────────────────────────────────────────
const lbl:React.CSSProperties = {display:"block",fontSize:11.5,fontWeight:600,color:"#78716C",marginBottom:4};

// ─── CollapsibleSection ────────────────────────────────────────────────────────
function CollapsibleSection({id,label,color,children,open,onToggle}:{id:string;label:string;color:string;children:React.ReactNode;open:string;onToggle:(id:string)=>void}) {
  const isOpen = open===id;
  return (
    <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
      <button onClick={()=>onToggle(id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"14px 18px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
        <span style={{width:10,height:10,borderRadius:"50%",background:color,flexShrink:0}}/>
        <span style={{fontSize:13.5,fontWeight:700,color:"#1C1917",flex:1,textAlign:"left"}}>{label}</span>
        {isOpen ? <ChevronDown size={15} color="#78716C"/> : <ChevronRight size={15} color="#78716C"/>}
      </button>
      {isOpen && <div style={{padding:"0 18px 18px"}}>{children}</div>}
    </div>
  );
}

// ─── LeadRevenueTable ─────────────────────────────────────────────────────────
function LeadRevenueTable({leads,activeEntry,onSave}:{leads:Lead[];activeEntry:string|null;onSave:(e:Record<string,{licences:string;revenue:string;expected:string}>)=>Promise<void>}) {
  const [edits,setEdits] = useState<Record<string,{licences:string;revenue:string;expected:string}>>({});
  const [saving,setSaving] = useState(false);
  const [search,setSearch] = useState("");

  useEffect(()=>{
    const init:Record<string,{licences:string;revenue:string;expected:string}> = {};
    leads.forEach(l=>{init[l.id]={
      licences: l.total_licences_allocated!=null?String(l.total_licences_allocated):"",
      revenue:  l.revenue_collected!=null&&l.revenue_collected>0?String(l.revenue_collected):"",
      expected: l.expected_revenue!=null?String(l.expected_revenue):"",
    };});
    setEdits(init);
  },[leads]);

  const filtered = leads.filter(l=>{
    if(!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q)||(l.location??"").toLowerCase().includes(q)||(l.status??"").toLowerCase().includes(q);
  });

  const totalRev = Object.values(edits).reduce((s,v)=>s+(Number(v.revenue)||0),0);
  const totalExp = Object.values(edits).reduce((s,v)=>s+(Number(v.expected)||0),0);
  const totalLic = Object.values(edits).reduce((s,v)=>s+(Number(v.licences)||0),0);

  const DOT:Record<string,string> = {new:"#6366F1",contacted:"#F59E0B",qualified:"#F97316",proposal:"#8B5CF6",negotiation:"#F97316",won:"#16A34A",lost:"#EF4444"};

  async function handleSave(){setSaving(true);await onSave(edits);setSaving(false);}

  if(leads.length===0) return (
    <div style={{background:"#FAFAF9",border:"1px dashed #E7E5E4",borderRadius:10,padding:"24px 0",textAlign:"center",color:"#A8A29E",fontSize:13}}>
      Add leads below — then enter revenue here
    </div>
  );

  return (
    <div style={{border:"1px solid #E7E5E4",borderRadius:10,overflow:"hidden"}}>
      <div style={{background:"#F9F8F7",padding:"10px 14px",borderBottom:"1px solid #F0EEEC",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:16,fontSize:12}}>
          <span>💰 <strong style={{color:"#16A34A"}}>₹{totalRev.toLocaleString("en-IN")}</strong> collected</span>
          <span>🔮 <strong style={{color:"#D97706"}}>₹{totalExp.toLocaleString("en-IN")}</strong> expected</span>
          <span>📦 <strong style={{color:"#2563EB"}}>{totalLic}</strong> licences</span>
        </div>
        <button onClick={handleSave} disabled={saving||!activeEntry||activeEntry==="new"}
          style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",background:"#E8611A",border:"none",borderRadius:8,color:"#fff",fontSize:12.5,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",opacity:saving?0.7:1}}>
          <Save size={13}/> {saving?"Saving...":"Save All"}
        </button>
      </div>

      {leads.length>4&&(
        <div style={{padding:"8px 14px",borderBottom:"1px solid #F5F4F0"}}>
          <div style={{position:"relative"}}>
            <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#A8A29E"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads..."
              style={{width:"100%",padding:"6px 10px 6px 28px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:12.5,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
      )}

      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
            {["Lead","Status","Location","Licences","Revenue Collected (₹)","Expected Revenue (₹)"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:11,fontWeight:700,color:"#A8A29E",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(lead=>{
              const e = edits[lead.id]??{licences:"",revenue:"",expected:""};
              const hasRev = Number(e.revenue)>0;
              return (
                <tr key={lead.id} style={{borderBottom:"1px solid #F5F4F0",background:hasRev?"#F0FDF4":"transparent"}}>
                  <td style={{padding:"10px 12px"}}>
                    <p style={{fontWeight:600,color:"#1C1917"}}>{lead.name}</p>
                    {(lead.country||lead.state)&&<p style={{fontSize:11,color:"#A8A29E"}}>{[lead.country,lead.state].filter(Boolean).join(", ")}</p>}
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,fontWeight:600}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:DOT[lead.status]??"#A8A29E",display:"inline-block"}}/>
                      {lead.status.charAt(0).toUpperCase()+lead.status.slice(1)}
                    </span>
                  </td>
                  <td style={{padding:"10px 12px",color:"#78716C",fontSize:12.5}}>{lead.location||"—"}</td>
                  <td style={{padding:"10px 12px"}}>
                    <input type="number" min="0" value={e.licences} placeholder="0"
                      onChange={ev=>setEdits(p=>({...p,[lead.id]:{...p[lead.id],licences:ev.target.value}}))}
                      style={{width:80,padding:"6px 8px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"right"}}/>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:12,color:"#78716C"}}>₹</span>
                      <input type="number" min="0" value={e.revenue} placeholder="0"
                        onChange={ev=>setEdits(p=>({...p,[lead.id]:{...p[lead.id],revenue:ev.target.value}}))}
                        style={{width:110,padding:"6px 8px",border:hasRev?"1.5px solid #16A34A":"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"right",background:hasRev?"#F0FDF4":"#fff",fontWeight:hasRev?700:400}}/>
                    </div>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:12,color:"#78716C"}}>₹</span>
                      <input type="number" min="0" value={e.expected} placeholder="0"
                        onChange={ev=>setEdits(p=>({...p,[lead.id]:{...p[lead.id],expected:ev.target.value}}))}
                        style={{width:110,padding:"6px 8px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"right"}}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr style={{background:"#F9F8F7",borderTop:"2px solid #E7E5E4"}}>
            <td colSpan={3} style={{padding:"10px 12px",fontSize:12,fontWeight:700,color:"#1C1917"}}>Totals ({filtered.length} leads)</td>
            <td style={{padding:"10px 12px",fontSize:13,fontWeight:800,color:"#2563EB",textAlign:"right",paddingRight:20}}>{totalLic>0?totalLic:"—"}</td>
            <td style={{padding:"10px 12px",fontSize:13,fontWeight:800,color:"#16A34A",paddingLeft:28}}>{totalRev>0?`₹${totalRev.toLocaleString("en-IN")}` :"—"}</td>
            <td style={{padding:"10px 12px",fontSize:13,fontWeight:800,color:"#D97706",paddingLeft:28}}>{totalExp>0?`₹${totalExp.toLocaleString("en-IN")}` :"—"}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── CampaignSection ──────────────────────────────────────────────────────────
interface AccTotals {
  emailSent:number;emailOpened:number;emailClicked:number;
  waSent:number;waDelivered:number;waReplied:number;
  callsMade:number;callsConnected:number;callsConverted:number;
  followUpCallsMade:number;demoScheduled:number;demoCompleted:number;
  demoRescheduled:number;followUpMeetingDone:number;
}
function CampaignSection({updates,acc,showForm,newUpdate,onOpenForm,onCloseForm,onChange,onSave,onDelete}:{
  updates:CampaignUpdate[];acc:AccTotals;showForm:boolean;newUpdate:UpdateForm;
  onOpenForm:()=>void;onCloseForm:()=>void;
  onChange:(k:keyof UpdateForm,v:string|number)=>void;
  onSave:()=>void;onDelete:(id:string)=>void;
}) {
  const badge = (ch:string) => ({padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600 as const,
    background:ch==="email"?"#DBEAFE":ch==="whatsapp"?"#DCFCE7":"#EDE9FE",
    color:ch==="email"?"#1D4ED8":ch==="whatsapp"?"#15803D":"#6D28D9"});

  const callMetricVal:Record<string,number> = {
    calls_made:acc.callsMade, follow_up_calls_made:acc.followUpCallsMade,
    demo_scheduled:acc.demoScheduled, demo_completed:acc.demoCompleted,
    demo_rescheduled:acc.demoRescheduled, follow_up_meeting_done:acc.followUpMeetingDone,
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,marginTop:4}}>
        <p style={{fontSize:12.5,color:"#78716C"}}>{updates.length} entries — all rows accumulate into period totals</p>
        <button onClick={onOpenForm} className="btn-primary" style={{padding:"6px 14px",fontSize:12}}>
          <Plus size={12}/> Add Entry
        </button>
      </div>

      {/* ── Add Entry Form ── */}
      {showForm && (
        <div style={{background:"#F9F8F7",border:"1px solid #E7E5E4",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <div>
              <label style={lbl}>Channel</label>
              <select className="input" value={newUpdate.channel}
                onChange={e=>onChange("channel",e.target.value)} style={{fontSize:13}}>
                <option value="email">📧 Email</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="calls">📞 Calls</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" className="input" value={newUpdate.update_date}
                onChange={e=>onChange("update_date",e.target.value)} style={{fontSize:13}}/>
            </div>
          </div>

          {newUpdate.channel==="calls" ? (
            <div>
              <p style={{fontSize:12,fontWeight:700,color:"#6D28D9",marginBottom:10}}>📞 Enter count for each call activity</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
                {CALL_METRICS.map(({key,label,icon,color,bg})=>(
                  <div key={key} style={{background:bg,border:`1px solid ${color}30`,borderRadius:9,padding:"12px 14px"}}>
                    <label style={{display:"block",fontSize:11.5,fontWeight:700,color,marginBottom:8}}>{icon} {label}</label>
                    <input type="number" className="input" min={0}
                      value={(newUpdate as any)[key]??0}
                      onChange={e=>onChange(key as keyof UpdateForm,Number(e.target.value))}
                      style={{fontSize:16,fontWeight:700,textAlign:"center",padding:"8px"}}/>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {([["Connected (funnel)","calls_connected","#2563EB"],["Converted (funnel)","calls_converted","#16A34A"]] as [string,keyof UpdateForm,string][]).map(([label,key,color])=>(
                  <div key={key} style={{background:"#fff",border:`1px solid ${color}25`,borderRadius:9,padding:"12px 14px"}}>
                    <label style={{display:"block",fontSize:11.5,fontWeight:700,color,marginBottom:8}}>{label}</label>
                    <input type="number" className="input" min={0} value={newUpdate[key] as number}
                      onChange={e=>onChange(key,Number(e.target.value))}
                      style={{fontSize:16,fontWeight:700,textAlign:"center",padding:"8px"}}/>
                  </div>
                ))}
              </div>
            </div>
          ) : newUpdate.channel==="email" ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {([["Sent","email_sent"],["Opened","email_opened"],["Clicked","email_clicked"]] as [string,keyof UpdateForm][]).map(([label,key])=>(
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type="number" className="input" value={newUpdate[key] as number}
                    onChange={e=>onChange(key,Number(e.target.value))} style={{fontSize:13}}/>
                </div>
              ))}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {([["Sent","whatsapp_sent"],["Delivered","whatsapp_delivered"],["Replied","whatsapp_replied"]] as [string,keyof UpdateForm][]).map(([label,key])=>(
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type="number" className="input" value={newUpdate[key] as number}
                    onChange={e=>onChange(key,Number(e.target.value))} style={{fontSize:13}}/>
                </div>
              ))}
            </div>
          )}

          <textarea className="input" rows={2} placeholder="Notes (optional)..."
            value={newUpdate.notes} onChange={e=>onChange("notes",e.target.value)}
            style={{resize:"none",fontSize:13,marginTop:10,marginBottom:10}}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={onCloseForm} className="btn-secondary" style={{fontSize:12}}>Cancel</button>
            <button onClick={onSave} className="btn-primary" style={{fontSize:12}}>Add Row</button>
          </div>
        </div>
      )}

      {/* ── Rows table ── */}
      {updates.length>0 && (
        <div style={{overflowX:"auto",marginBottom:14}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
            <thead><tr style={{background:"#F9F8F7",borderBottom:"1px solid #F0EEEC"}}>
              {["Date","Channel","Metric 1","Metric 2","Metric 3","Notes",""].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:11,fontWeight:600,color:"#A8A29E"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {updates.map(u=>(
                <tr key={u.id} style={{borderBottom:"1px solid #F5F4F0"}}>
                  <td style={{padding:"8px 10px",color:"#78716C"}}>{u.update_date}</td>
                  <td style={{padding:"8px 10px"}}><span style={badge(u.channel)}>{u.channel}</span></td>
                  <td style={{padding:"8px 10px",fontWeight:700,color:"#1C1917"}}>
                    {u.channel==="email"?`${u.email_sent} sent`:u.channel==="whatsapp"?`${u.whatsapp_sent} sent`:`${u.calls_made} new calls`}
                  </td>
                  <td style={{padding:"8px 10px",color:"#57534E"}}>
                    {u.channel==="email"?`${u.email_opened} opened`:u.channel==="whatsapp"?`${u.whatsapp_delivered} delivered`:`${u.follow_up_calls_made} follow-up`}
                  </td>
                  <td style={{padding:"8px 10px",color:"#57534E"}}>
                    {u.channel==="email"?`${u.email_clicked} clicked`:u.channel==="whatsapp"?`${u.whatsapp_replied} replied`:`${u.demo_scheduled} demo sched.`}
                  </td>
                  <td style={{padding:"8px 10px",color:"#A8A29E",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.notes||"—"}</td>
                  <td style={{padding:"8px 10px"}}>
                    <button onClick={()=>onDelete(u.id)}
                      style={{background:"transparent",border:"none",cursor:"pointer",padding:4,borderRadius:5,display:"flex"}}
                      onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <Trash2 size={12} color="#EF4444"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Accumulated totals ── */}
      {updates.length>0 && (
        <div>
          <div style={{background:"#F0FDF4",border:"1px solid #A7F3D0",borderRadius:10,padding:14,marginBottom:12}}>
            <p style={{fontSize:12,fontWeight:700,color:"#15803D",marginBottom:10}}>✅ Accumulated Totals ({updates.length} entries)</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {[
                {title:"📧 EMAIL",color:"#1D4ED8",bd:"#BFDBFE",items:[["Sent",acc.emailSent,0],["Opened",acc.emailOpened,acc.emailSent],["Clicked",acc.emailClicked,acc.emailSent]]},
                {title:"💬 WHATSAPP",color:"#15803D",bd:"#A7F3D0",items:[["Sent",acc.waSent,0],["Delivered",acc.waDelivered,acc.waSent],["Replied",acc.waReplied,acc.waSent]]},
                {title:"📞 CALLS",color:"#6D28D9",bd:"#DDD6FE",items:[["New Calls Made",acc.callsMade,0],["Follow Up Call Made",acc.followUpCallsMade,0],["Demo Scheduled",acc.demoScheduled,acc.callsMade],["Demo Completed",acc.demoCompleted,acc.demoScheduled],["Demo Rescheduled",acc.demoRescheduled,acc.demoScheduled],["Follow Up Meeting",acc.followUpMeetingDone,0],["Connected",acc.callsConnected,acc.callsMade],["Converted",acc.callsConverted,acc.callsMade]]},
              ].map(({title,color,bd,items})=>(
                <div key={title} style={{background:"#fff",borderRadius:8,padding:12,border:`1px solid ${bd}`}}>
                  <p style={{fontSize:11,fontWeight:700,color,marginBottom:8}}>{title}</p>
                  {(items as [string,number,number][]).map(([label,value,total])=>(
                    <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"1px solid #F5F4F0"}}>
                      <span style={{color:"#78716C"}}>{label}</span>
                      <span>
                        <span style={{fontWeight:700,color}}>{value}</span>
                        {total>0&&<span style={{fontSize:10.5,color:"#A8A29E",marginLeft:5}}>({Math.round((value/total)*100)}%)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Call activity visual cards */}
          {(acc.callsMade+acc.followUpCallsMade+acc.demoScheduled+acc.demoCompleted+acc.demoRescheduled+acc.followUpMeetingDone)>0 && (
            <div>
              <p style={{fontSize:12,fontWeight:700,color:"#6D28D9",marginBottom:8}}>📞 Call Activity Breakdown</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
                {CALL_METRICS.map(({key,label,icon,color,bg})=>(
                  <div key={key} style={{background:bg,border:`1px solid ${color}25`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                    <p style={{fontSize:24,fontWeight:800,color,lineHeight:1}}>{callMetricVal[key]??0}</p>
                    <p style={{fontSize:10.5,fontWeight:600,color:"#57534E",marginTop:5,lineHeight:1.3}}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {updates.length===0 && !showForm && (
        <div style={{textAlign:"center",padding:"24px 0",color:"#A8A29E",fontSize:13}}>
          No entries yet. Click "Add Entry" to log email, WhatsApp or call data.
        </div>
      )}
    </div>
  );
}

// ─── LeadsSection ─────────────────────────────────────────────────────────────
function LeadsSection({leads,activeEntry,showForm,newLead,onOpenForm,onCloseForm,onChange,onSave,onDelete,onUpdateStatus}:{
  leads:Lead[];activeEntry:string|null;showForm:boolean;newLead:LeadForm;
  onOpenForm:()=>void;onCloseForm:()=>void;onChange:(k:keyof LeadForm,v:string)=>void;
  onSave:()=>void;onDelete:(id:string)=>void;onUpdateStatus:(id:string,ns:string,os:string)=>void;
}) {
  const fields:[string,keyof LeadForm,string,string][] = [
    ["Lead Name *","name","text",""],["Country","country","text","India"],
    ["State","state","text",""],["City / Location","location","text",""],
    ["Expected Volume","expected_volume","number",""],["Expected Revenue (₹)","expected_revenue","number",""],
    ["Cycle Label","cycle_label","text","e.g. Apr 2026"],
  ];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <button onClick={onOpenForm} className="btn-primary" style={{padding:"6px 14px",fontSize:12}}>
          <Plus size={12}/> Add Lead
        </button>
      </div>

      {showForm && (
        <div style={{background:"#F9F8F7",border:"1px solid #E7E5E4",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {fields.map(([label,key,type,placeholder])=>(
              <div key={key}>
                <label style={lbl}>{label}</label>
                <input className="input" type={type} value={newLead[key]}
                  onChange={e=>onChange(key,e.target.value)} placeholder={placeholder} style={{fontSize:13}}/>
              </div>
            ))}
            <div>
              <label style={lbl}>Status</label>
              <select className="input" value={newLead.status}
                onChange={e=>onChange("status",e.target.value)} style={{fontSize:13}}>
                {LEAD_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <textarea className="input" rows={2} placeholder="Notes..."
            value={newLead.notes} onChange={e=>onChange("notes",e.target.value)}
            style={{resize:"none",fontSize:13,marginBottom:10}}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={onCloseForm} className="btn-secondary" style={{fontSize:12}}>Cancel</button>
            <button onClick={onSave} className="btn-primary" style={{fontSize:12}}>Save Lead</button>
          </div>
        </div>
      )}

      {leads.length===0 ? (
        <p style={{textAlign:"center",color:"#A8A29E",fontSize:13,padding:"16px 0"}}>No leads yet. Click "+ Add Lead" to start.</p>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid #F0EEEC",background:"#FAFAF9"}}>
              {["Lead","Period","Country","State","Location","Volume","Exp. Rev","Collected","Status","Cycle","Change",""].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"9px 10px",fontSize:11,fontWeight:600,color:"#A8A29E",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {leads.map(l=>(
                <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
                  <td style={{padding:"9px 10px",fontWeight:600,color:"#1C1917"}}>
                    {l.name}{l.is_updated_this_cycle&&<span style={{marginLeft:5,fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 5px",borderRadius:8,fontWeight:600}}>↑</span>}
                  </td>
                  <td style={{padding:"9px 10px",fontSize:11.5}}>
                    {!l.data_entry_id?<span style={{color:"#D6D3D1"}}>—</span>:
                      l.data_entry_id===activeEntry?
                        <span style={{background:"#DBEAFE",color:"#1D4ED8",padding:"1px 6px",borderRadius:5,fontWeight:500}}>This period</span>:
                        <span style={{background:"#F5F4F0",color:"#78716C",padding:"1px 6px",borderRadius:5}}>Other</span>}
                  </td>
                  <td style={{padding:"9px 10px",color:"#78716C",fontSize:12}}>{l.country??"—"}</td>
                  <td style={{padding:"9px 10px",color:"#78716C",fontSize:12}}>{l.state??"—"}</td>
                  <td style={{padding:"9px 10px",color:"#78716C",fontSize:12}}>{l.location??"—"}</td>
                  <td style={{padding:"9px 10px",color:"#78716C",fontSize:12}}>{l.expected_volume??"—"}</td>
                  <td style={{padding:"9px 10px",fontWeight:500,color:"#D97706",fontSize:12}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                  <td style={{padding:"9px 10px",fontWeight:600,color:"#16A34A",fontSize:12}}>{l.revenue_collected&&l.revenue_collected>0?fmtINR(l.revenue_collected):"—"}</td>
                  <td style={{padding:"9px 10px"}}>
                    <select value={l.status} onChange={e=>onUpdateStatus(l.id,e.target.value,l.status)}
                      style={{appearance:"none",padding:"3px 8px",borderRadius:8,fontSize:11.5,fontWeight:600,
                        background:`${STATUS_COLOR[l.status]}15`,color:STATUS_COLOR[l.status],
                        border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                      {LEAD_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </td>
                  <td style={{padding:"9px 10px",color:"#A8A29E",fontSize:12}}>{l.cycle_label??"—"}</td>
                  <td style={{padding:"9px 10px",fontSize:12}}>
                    {l.previous_status&&l.previous_status!==l.status?(
                      <span>
                        <span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>
                        {" → "}
                        <span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span>
                      </span>
                    ):<span style={{color:"#D6D3D1"}}>—</span>}
                  </td>
                  <td style={{padding:"9px 10px"}}>
                    <button onClick={()=>onDelete(l.id)}
                      style={{background:"transparent",border:"none",cursor:"pointer",padding:"3px 5px",borderRadius:5}}
                      onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <Trash2 size={13} color="#EF4444"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

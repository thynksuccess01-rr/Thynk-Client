"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Save, Trash2, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const LEAD_STATUSES = ["new","contacted","qualified","proposal","negotiation","won","lost"];
const STATUS_COLOR: Record<string,string> = { new:"#3B82F6",contacted:"#F59E0B",qualified:"#F59E0B",proposal:"#8B5CF6",negotiation:"#F97316",won:"#16A34A",lost:"#EF4444" };
const EMPTY_ENTRY = { period_start:"",period_end:"",entry_label:"",entry_date:"",email_summary:"",email_sent:0,email_opened:0,email_clicked:0,whatsapp_summary:"",whatsapp_sent:0,whatsapp_delivered:0,whatsapp_replied:0,calls_summary:"",calls_made:0,calls_connected:0,calls_converted:0,total_licences:0,total_revenue_collected:0,expected_collection:0 };
const EMPTY_LEAD = { name:"",location:"",expected_volume:"",expected_revenue:"",status:"new",notes:"",cycle_label:"" };
const EMPTY_UPDATE = { channel:"email",update_date:new Date().toISOString().split("T")[0],email_sent:0,email_opened:0,email_clicked:0,whatsapp_sent:0,whatsapp_delivered:0,whatsapp_replied:0,calls_made:0,calls_connected:0,calls_converted:0,notes:"" };

const fmtINR = (n: number) => `₹${n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:n}`;

export default function DataPanelPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [activeEntry, setActiveEntry] = useState<string|null>(null);
  const [form, setForm] = useState<any>(EMPTY_ENTRY);
  const [newLead, setNewLead] = useState<any>(EMPTY_LEAD);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [newUpdate, setNewUpdate] = useState<any>(EMPTY_UPDATE);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("revenue");
  const supabase = createClient();

  useEffect(() => { supabase.from("clients").select("id,name").order("name").then(r=>setClients(r.data??[])); }, []);
  useEffect(() => { if(selectedClient){loadEntries();loadLeads();} }, [selectedClient]);
  useEffect(() => { if(activeEntry&&activeEntry!=="new") loadUpdates(); }, [activeEntry]);

  async function loadEntries() {
    const { data } = await supabase.from("data_entries").select("*").eq("client_id",selectedClient).order("period_start",{ascending:false});
    setEntries(data??[]);
  }
  async function loadLeads() {
    const { data } = await supabase.from("leads").select("*").eq("client_id",selectedClient).order("created_at",{ascending:false});
    setLeads(data??[]);
  }
  async function loadUpdates() {
    if(!activeEntry||activeEntry==="new") return;
    const { data } = await supabase.from("campaign_updates").select("*").eq("data_entry_id",activeEntry).order("update_date");
    setUpdates(data??[]);
  }

  async function saveEntry() {
    if(!form.period_start||!form.period_end){toast.error("Set period dates");return;}
    setSaving(true);
    const payload={...form,client_id:selectedClient,updated_at:new Date().toISOString()};
    if(activeEntry&&activeEntry!=="new"){
      const {error}=await supabase.from("data_entries").update(payload).eq("id",activeEntry);
      if(error) toast.error(error.message); else { toast.success("Saved"); loadEntries(); }
    } else {
      const {data,error}=await supabase.from("data_entries").insert({...payload,created_at:new Date().toISOString()}).select().single();
      if(error) toast.error(error.message); else { setActiveEntry(data.id); toast.success("Entry created"); loadEntries(); }
    }
    setSaving(false);
  }

  async function saveCampaignUpdate() {
    if(!activeEntry||activeEntry==="new"){toast.error("Save the entry first");return;}
    const {error}=await supabase.from("campaign_updates").insert({...newUpdate,data_entry_id:activeEntry,client_id:selectedClient});
    if(error) toast.error(error.message);
    else { toast.success("Update added"); setNewUpdate(EMPTY_UPDATE); setShowUpdateForm(false); loadUpdates(); }
  }

  async function deleteUpdate(id:string) {
    await supabase.from("campaign_updates").delete().eq("id",id);
    toast.success("Deleted"); loadUpdates();
  }

  async function saveLead() {
    if(!newLead.name){toast.error("Lead name required");return;}
    const payload={...newLead,client_id:selectedClient,data_entry_id:activeEntry&&activeEntry!=="new"?activeEntry:null,
      expected_volume:newLead.expected_volume?Number(newLead.expected_volume):null,expected_revenue:newLead.expected_revenue?Number(newLead.expected_revenue):null};
    const {error}=await supabase.from("leads").insert(payload);
    if(error) toast.error(error.message);
    else { toast.success("Lead added"); setNewLead(EMPTY_LEAD); setShowLeadForm(false); loadLeads(); }
  }

  async function deleteLead(id:string) {
    if(!confirm("Delete this lead?")) return;
    await supabase.from("leads").delete().eq("id",id);
    toast.success("Deleted"); loadLeads();
  }

  async function updateLeadStatus(id:string,newStatus:string,oldStatus:string) {
    await supabase.from("leads").update({status:newStatus,previous_status:oldStatus,status_updated_at:new Date().toISOString(),is_updated_this_cycle:true,updated_at:new Date().toISOString()}).eq("id",id);
    loadLeads();
  }

  function selectEntry(e:any) {
    setActiveEntry(e.id);
    setForm({period_start:e.period_start,period_end:e.period_end,entry_label:e.entry_label??"",entry_date:e.entry_date??"",email_summary:e.email_summary??"",email_sent:e.email_sent,email_opened:e.email_opened,email_clicked:e.email_clicked,whatsapp_summary:e.whatsapp_summary??"",whatsapp_sent:e.whatsapp_sent,whatsapp_delivered:e.whatsapp_delivered,whatsapp_replied:e.whatsapp_replied,calls_summary:e.calls_summary??"",calls_made:e.calls_made,calls_connected:e.calls_connected,calls_converted:e.calls_converted,total_licences:e.total_licences??0,total_revenue_collected:e.total_revenue_collected??0,expected_collection:e.expected_collection??0});
  }

  const Section=({id,label,color,children}:{id:string,label:string,color:string,children:React.ReactNode})=>(
    <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,overflow:"hidden",marginBottom:10}}>
      <button onClick={()=>setExpandedSection(expandedSection===id?"":id)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
        <span style={{width:24,height:24,borderRadius:6,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{id.toUpperCase()}</span>
        <span style={{fontSize:13.5,fontWeight:600,color:"#1C1917",flex:1}}>{label}</span>
        {expandedSection===id?<ChevronDown size={14} color="#78716C"/>:<ChevronRight size={14} color="#78716C"/>}
      </button>
      {expandedSection===id && <div style={{padding:"0 16px 16px"}}>{children}</div>}
    </div>
  );

  const NumField=({label,k}:{label:string,k:string})=>(
    <div>
      <label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>{label}</label>
      <input type="number" className="input" value={form[k]} onChange={e=>setForm({...form,[k]:Number(e.target.value)})} min={0} style={{fontSize:13}}/>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:600,color:"#1C1917",fontFamily:"Fraunces,Georgia,serif"}}>Data Panel</h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Enter campaign and lead data per client per period</p>
        </div>
      </div>

      <div style={{maxWidth:300,marginBottom:24}}>
        <label style={{display:"block",fontSize:12,fontWeight:500,color:"#57534E",marginBottom:5}}>Select Client</label>
        <select className="input" value={selectedClient} onChange={e=>{setSelectedClient(e.target.value);setActiveEntry(null);setForm(EMPTY_ENTRY);}}>
          <option value="">Choose a client...</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selectedClient && (
        <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:16}}>
          {/* Entry list */}
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,overflow:"hidden",height:"fit-content"}}>
            <div style={{padding:"12px 14px",borderBottom:"1px solid #F5F4F0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#FAFAF9"}}>
              <span style={{fontSize:13,fontWeight:600,color:"#1C1917"}}>Periods</span>
              <button onClick={()=>{setActiveEntry("new");setForm(EMPTY_ENTRY);setExpandedSection("a");}}
                style={{width:26,height:26,borderRadius:7,background:"#E8611A",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Plus size={13} color="#fff"/>
              </button>
            </div>
            {entries.length===0&&activeEntry!=="new"&&<p style={{fontSize:12.5,textAlign:"center",padding:"24px 0",color:"#A8A29E"}}>No entries yet</p>}
            {activeEntry==="new"&&(
              <div style={{padding:"10px 14px",borderLeft:"3px solid #E8611A",background:"#FFF7ED"}}>
                <p style={{fontSize:13,fontWeight:600,color:"#E8611A"}}>+ New Entry</p>
              </div>
            )}
            {entries.map(e=>(
              <button key={e.id} onClick={()=>selectEntry(e)}
                style={{width:"100%",textAlign:"left",padding:"10px 14px",borderLeft:`3px solid ${activeEntry===e.id?"#E8611A":"transparent"}`,background:activeEntry===e.id?"#FFF7ED":"transparent",border:"none",borderBottom:"1px solid #F5F4F0",cursor:"pointer",fontFamily:"inherit"}}>
                <p style={{fontSize:12.5,fontWeight:600,color:"#1C1917"}}>{e.entry_label||`${new Date(e.period_start).toLocaleDateString("en-IN",{month:"short",day:"numeric"})} – ${new Date(e.period_end).toLocaleDateString("en-IN",{month:"short",day:"numeric","year":"2-digit"})}`}</p>
                <p style={{fontSize:11.5,color:"#A8A29E",marginTop:2}}>{(e.email_sent+e.whatsapp_sent+e.calls_made).toLocaleString()} activities · {e.total_revenue_collected?fmtINR(e.total_revenue_collected):""}</p>
              </button>
            ))}
          </div>

          {/* Form */}
          {activeEntry ? (
            <div>
              {/* A: Period */}
              <Section id="a" label="Period & Entry Details" color="#6366F1">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginTop:4}}>
                  <div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Start Date</label><input type="date" className="input" value={form.period_start} onChange={e=>setForm({...form,period_start:e.target.value})} style={{fontSize:13}}/></div>
                  <div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>End Date</label><input type="date" className="input" value={form.period_end} onChange={e=>setForm({...form,period_end:e.target.value})} style={{fontSize:13}}/></div>
                  <div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Entry Label</label><input className="input" value={form.entry_label} onChange={e=>setForm({...form,entry_label:e.target.value})} placeholder="e.g. Q1 2025" style={{fontSize:13}}/></div>
                  <div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Entry Date</label><input type="date" className="input" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})} style={{fontSize:13}}/></div>
                </div>
              </Section>

              {/* Revenue */}
              <Section id="revenue" label="Revenue & Licences" color="#16A34A">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:4}}>
                  <NumField label="Total Licences" k="total_licences"/>
                  <NumField label="Revenue Collected (₹)" k="total_revenue_collected"/>
                  <NumField label="Expected Collection (₹)" k="expected_collection"/>
                </div>
              </Section>

              {/* B: Email */}
              <Section id="b" label="Email Campaign Summary" color="#2563EB">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:4,marginBottom:10}}>
                  <NumField label="Sent" k="email_sent"/> <NumField label="Opened" k="email_opened"/> <NumField label="Clicked" k="email_clicked"/>
                </div>
                <textarea className="input" rows={2} placeholder="Campaign notes..." value={form.email_summary} onChange={e=>setForm({...form,email_summary:e.target.value})} style={{resize:"none",fontSize:13}}/>
              </Section>

              {/* C: WhatsApp */}
              <Section id="c" label="WhatsApp Campaign Summary" color="#16A34A">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:4,marginBottom:10}}>
                  <NumField label="Sent" k="whatsapp_sent"/> <NumField label="Delivered" k="whatsapp_delivered"/> <NumField label="Replied" k="whatsapp_replied"/>
                </div>
                <textarea className="input" rows={2} placeholder="WhatsApp notes..." value={form.whatsapp_summary} onChange={e=>setForm({...form,whatsapp_summary:e.target.value})} style={{resize:"none",fontSize:13}}/>
              </Section>

              {/* D: Calls */}
              <Section id="d" label="Calls Interaction Summary" color="#7C3AED">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:4,marginBottom:10}}>
                  <NumField label="Made" k="calls_made"/> <NumField label="Connected" k="calls_connected"/> <NumField label="Converted" k="calls_converted"/>
                </div>
                <textarea className="input" rows={2} placeholder="Call notes..." value={form.calls_summary} onChange={e=>setForm({...form,calls_summary:e.target.value})} style={{resize:"none",fontSize:13}}/>
              </Section>

              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={saveEntry} disabled={saving} className="btn-primary">
                  <Save size={14}/>{saving?"Saving...":"Save Entry"}
                </button>
              </div>

              {/* Campaign Updates — multiple sub-entries */}
              {activeEntry&&activeEntry!=="new"&&(
                <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:16,marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <h3 style={{fontSize:13.5,fontWeight:600,color:"#1C1917"}}>Campaign Updates <span style={{fontSize:12,color:"#A8A29E",fontWeight:400"}}>({updates.length} updates)</span></h3>
                    <button onClick={()=>setShowUpdateForm(true)} className="btn-primary" style={{padding:"5px 12px",fontSize:12}}>
                      <Plus size={12}/> Add Update
                    </button>
                  </div>

                  {showUpdateForm&&(
                    <div style={{background:"#F9F8F7",border:"1px solid #E7E5E4",borderRadius:8,padding:14,marginBottom:12}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                        <div>
                          <label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Channel</label>
                          <select className="input" value={newUpdate.channel} onChange={e=>setNewUpdate({...newUpdate,channel:e.target.value})} style={{fontSize:13}}>
                            <option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="calls">Calls</option>
                          </select>
                        </div>
                        <div>
                          <label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Date</label>
                          <input type="date" className="input" value={newUpdate.update_date} onChange={e=>setNewUpdate({...newUpdate,update_date:e.target.value})} style={{fontSize:13}}/>
                        </div>
                        {newUpdate.channel==="email"&&<><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Sent</label><input type="number" className="input" value={newUpdate.email_sent} onChange={e=>setNewUpdate({...newUpdate,email_sent:Number(e.target.value)})} style={{fontSize:13}}/></div></>}
                        {newUpdate.channel==="email"&&<><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Opened</label><input type="number" className="input" value={newUpdate.email_opened} onChange={e=>setNewUpdate({...newUpdate,email_opened:Number(e.target.value)})} style={{fontSize:13}}/></div><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Clicked</label><input type="number" className="input" value={newUpdate.email_clicked} onChange={e=>setNewUpdate({...newUpdate,email_clicked:Number(e.target.value)})} style={{fontSize:13}}/></div></>}
                        {newUpdate.channel==="whatsapp"&&<><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Sent</label><input type="number" className="input" value={newUpdate.whatsapp_sent} onChange={e=>setNewUpdate({...newUpdate,whatsapp_sent:Number(e.target.value)})} style={{fontSize:13}}/></div><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Delivered</label><input type="number" className="input" value={newUpdate.whatsapp_delivered} onChange={e=>setNewUpdate({...newUpdate,whatsapp_delivered:Number(e.target.value)})} style={{fontSize:13}}/></div><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Replied</label><input type="number" className="input" value={newUpdate.whatsapp_replied} onChange={e=>setNewUpdate({...newUpdate,whatsapp_replied:Number(e.target.value)})} style={{fontSize:13}}/></div></>}
                        {newUpdate.channel==="calls"&&<><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Made</label><input type="number" className="input" value={newUpdate.calls_made} onChange={e=>setNewUpdate({...newUpdate,calls_made:Number(e.target.value)})} style={{fontSize:13}}/></div><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Connected</label><input type="number" className="input" value={newUpdate.calls_connected} onChange={e=>setNewUpdate({...newUpdate,calls_connected:Number(e.target.value)})} style={{fontSize:13}}/></div><div><label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Converted</label><input type="number" className="input" value={newUpdate.calls_converted} onChange={e=>setNewUpdate({...newUpdate,calls_converted:Number(e.target.value)})} style={{fontSize:13}}/></div></>}
                      </div>
                      <textarea className="input" rows={2} placeholder="Notes for this update..." value={newUpdate.notes} onChange={e=>setNewUpdate({...newUpdate,notes:e.target.value})} style={{resize:"none",fontSize:13,marginBottom:10}}/>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <button onClick={()=>setShowUpdateForm(false)} className="btn-secondary" style={{fontSize:12}}>Cancel</button>
                        <button onClick={saveCampaignUpdate} className="btn-primary" style={{fontSize:12}}>Save Update</button>
                      </div>
                    </div>
                  )}

                  {updates.length===0?<p style={{fontSize:12.5,color:"#A8A29E",textAlign:"center",padding:"16px 0"}}>No updates yet. Add individual channel updates above.</p>:(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {updates.map(u=>(
                        <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:"#F9F8F7",borderRadius:8,border:"1px solid #F0EEEC"}}>
                          <span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600,background:u.channel==="email"?"#DBEAFE":u.channel==="whatsapp"?"#DCFCE7":"#EDE9FE",color:u.channel==="email"?"#1D4ED8":u.channel==="whatsapp"?"#15803D":"#6D28D9"}}>{u.channel}</span>
                          <span style={{fontSize:12.5,color:"#78716C"}}>{u.update_date}</span>
                          <span style={{fontSize:12.5,color:"#1C1917",flex:1}}>
                            {u.channel==="email"&&`Sent: ${u.email_sent} · Opened: ${u.email_opened} · Clicked: ${u.email_clicked}`}
                            {u.channel==="whatsapp"&&`Sent: ${u.whatsapp_sent} · Delivered: ${u.whatsapp_delivered} · Replied: ${u.whatsapp_replied}`}
                            {u.channel==="calls"&&`Made: ${u.calls_made} · Connected: ${u.calls_connected} · Converted: ${u.calls_converted}`}
                          </span>
                          {u.notes&&<span style={{fontSize:12,color:"#A8A29E",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.notes}</span>}
                          <button onClick={()=>deleteUpdate(u.id)} style={{background:"transparent",border:"none",cursor:"pointer",padding:4,borderRadius:5,display:"flex"}} onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                            <Trash2 size={13} color="#EF4444"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* E: Leads */}
              <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <h3 style={{fontSize:13.5,fontWeight:600,color:"#1C1917"}}>Lead Details <span style={{fontSize:12,color:"#A8A29E",fontWeight:400}}>({leads.length} total)</span></h3>
                  <button onClick={()=>setShowLeadForm(true)} className="btn-primary" style={{padding:"5px 12px",fontSize:12}}>
                    <Plus size={12}/> Add Lead
                  </button>
                </div>

                {showLeadForm&&(
                  <div style={{background:"#F9F8F7",border:"1px solid #E7E5E4",borderRadius:8,padding:14,marginBottom:12}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                      {[["Lead Name *","name","text",""],["Location","location","text",""],["Expected Volume","expected_volume","number",""],["Expected Revenue (₹)","expected_revenue","number",""],["Cycle Label","cycle_label","text","e.g. Q1 2025"]].map(([l,k,t,p])=>(
                        <div key={k as string}>
                          <label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>{l as string}</label>
                          <input className="input" type={t as string} value={newLead[k as string]} onChange={e=>setNewLead({...newLead,[k as string]:e.target.value})} placeholder={p as string} style={{fontSize:13}}/>
                        </div>
                      ))}
                      <div>
                        <label style={{display:"block",fontSize:11.5,fontWeight:500,color:"#78716C",marginBottom:4}}>Status</label>
                        <select className="input" value={newLead.status} onChange={e=>setNewLead({...newLead,status:e.target.value})} style={{fontSize:13}}>
                          {LEAD_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    <textarea className="input" rows={2} placeholder="Notes..." value={newLead.notes} onChange={e=>setNewLead({...newLead,notes:e.target.value})} style={{resize:"none",fontSize:13,marginBottom:10}}/>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button onClick={()=>setShowLeadForm(false)} className="btn-secondary" style={{fontSize:12}}>Cancel</button>
                      <button onClick={saveLead} className="btn-primary" style={{fontSize:12}}>Save Lead</button>
                    </div>
                  </div>
                )}

                {leads.length===0?<p style={{fontSize:12.5,color:"#A8A29E",textAlign:"center",padding:"16px 0"}}>No leads yet.</p>:(
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead>
                        <tr style={{borderBottom:"1px solid #F5F4F0"}}>
                          {["Lead","Location","Volume","Revenue","Status","Cycle","Updated",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"0 8px 8px 0",fontSize:11.5,fontWeight:500,color:"#A8A29E",whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map(l=>(
                          <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
                            <td style={{padding:"9px 8px 9px 0",fontWeight:500,color:"#1C1917"}}>
                              {l.name}
                              {l.is_updated_this_cycle&&<span style={{marginLeft:5,fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 5px",borderRadius:8,fontWeight:600}}>↑</span>}
                            </td>
                            <td style={{padding:"9px 8px 9px 0",color:"#78716C",fontSize:12}}>{l.location??"—"}</td>
                            <td style={{padding:"9px 8px 9px 0",color:"#78716C",fontSize:12}}>{l.expected_volume??"—"}</td>
                            <td style={{padding:"9px 8px 9px 0",fontWeight:500,color:"#1C1917",fontSize:12}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                            <td style={{padding:"9px 8px 9px 0"}}>
                              <select value={l.status} onChange={e=>updateLeadStatus(l.id,e.target.value,l.status)}
                                style={{appearance:"none",padding:"3px 8px",borderRadius:8,fontSize:11.5,fontWeight:600,background:`${STATUS_COLOR[l.status]}18`,color:STATUS_COLOR[l.status],border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                                {LEAD_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                              </select>
                            </td>
                            <td style={{padding:"9px 8px 9px 0",color:"#A8A29E",fontSize:12}}>{l.cycle_label??"—"}</td>
                            <td style={{padding:"9px 8px 9px 0",fontSize:12,color:"#78716C"}}>
                              {l.previous_status&&l.previous_status!==l.status?<span>{l.previous_status} → <strong>{l.status}</strong></span>:"—"}
                            </td>
                            <td style={{padding:"9px 0"}}>
                              <button onClick={()=>deleteLead(l.id)} style={{background:"transparent",border:"none",cursor:"pointer",padding:"3px 5px",borderRadius:5}} onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
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
            </div>
          ) : (
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:"60px 0",textAlign:"center"}}>
              <p style={{fontSize:13.5,color:"#A8A29E"}}>Select a period or create a new one</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

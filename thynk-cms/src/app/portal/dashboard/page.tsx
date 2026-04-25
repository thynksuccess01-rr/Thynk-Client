"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const TIMELINES=[{label:"Today",days:1},{label:"Last 5 Days",days:5},{label:"Last 15 Days",days:15},{label:"Last 30 Days",days:30},{label:"Last 90 Days",days:90},{label:"Last 180 Days",days:180},{label:"Current Year",days:365}];
const TABS=["Summary","Campaigns","Leads","Reports"];
const fmt=(n:number)=>n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n??0);
const fmtINR=(n:number)=>`₹${n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:(n??0)}`;
const rate=(a:number,b:number)=>b>0?Math.round(a/b*100):0;

export default function PortalDashboard() {
  const [client, setClient] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selProduct, setSelProduct] = useState("all");
  const [timeline, setTimeline] = useState(30);
  const [tab, setTab] = useState("Summary");
  const [entries, setEntries] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string|null>(null);
  const supabase = createClient();

  useEffect(()=>{
    async function init(){
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) return;
      const {data:p}=await supabase.from("profiles").select("client_id,clients(*)").eq("id",user.id).single();
      if(!p?.client_id) return;
      setClientId(p.client_id); setClient(p.clients);
      const {data:mp}=await supabase.from("client_products").select("products(id,name)").eq("client_id",p.client_id);
      setProducts((mp??[]).map((m:any)=>m.products).filter(Boolean));
    }
    init();
  },[]);

  const load=useCallback(async()=>{
    if(!clientId) return;
    const since=new Date(); since.setDate(since.getDate()-timeline);
    const s=since.toISOString().split("T")[0];
    const [e,u,l]=await Promise.all([
      supabase.from("data_entries").select("*").eq("client_id",clientId).gte("period_start",s).order("period_start"),
      supabase.from("campaign_updates").select("*").eq("client_id",clientId).gte("update_date",s).order("update_date"),
      supabase.from("leads").select("*").eq("client_id",clientId).order("created_at",{ascending:false}),
    ]);
    setEntries(e.data??[]); setUpdates(u.data??[]); setLeads(l.data??[]);
  },[clientId,timeline]);

  useEffect(()=>{if(clientId)load();},[load]);

  const accent=client?.accent_color??"#E8611A";
  const primary=client?.primary_color??"#1C1917";

  const emailSent=entries.reduce((s,e)=>s+e.email_sent,0)+updates.filter(u=>u.channel==="email").reduce((s,u)=>s+u.email_sent,0);
  const emailOpened=entries.reduce((s,e)=>s+e.email_opened,0)+updates.filter(u=>u.channel==="email").reduce((s,u)=>s+u.email_opened,0);
  const emailClicked=entries.reduce((s,e)=>s+e.email_clicked,0)+updates.filter(u=>u.channel==="email").reduce((s,u)=>s+u.email_clicked,0);
  const waSent=entries.reduce((s,e)=>s+e.whatsapp_sent,0)+updates.filter(u=>u.channel==="whatsapp").reduce((s,u)=>s+u.whatsapp_sent,0);
  const waDelivered=entries.reduce((s,e)=>s+e.whatsapp_delivered,0)+updates.filter(u=>u.channel==="whatsapp").reduce((s,u)=>s+u.whatsapp_delivered,0);
  const waReplied=entries.reduce((s,e)=>s+e.whatsapp_replied,0)+updates.filter(u=>u.channel==="whatsapp").reduce((s,u)=>s+u.whatsapp_replied,0);
  const callsMade=entries.reduce((s,e)=>s+e.calls_made,0)+updates.filter(u=>u.channel==="calls").reduce((s,u)=>s+u.calls_made,0);
  const callsConnected=entries.reduce((s,e)=>s+e.calls_connected,0)+updates.filter(u=>u.channel==="calls").reduce((s,u)=>s+u.calls_connected,0);
  const callsConverted=entries.reduce((s,e)=>s+e.calls_converted,0)+updates.filter(u=>u.channel==="calls").reduce((s,u)=>s+u.calls_converted,0);
  const totalRev=entries.reduce((s,e)=>s+(e.total_revenue_collected??0),0);
  const expectedRev=entries.reduce((s,e)=>s+(e.expected_collection??0),0);
  const totalLic=entries.reduce((s,e)=>s+(e.total_licences??0),0);
  const wonLeads=leads.filter(l=>l.status==="won").length;
  const activeLeads=leads.filter(l=>!["won","lost"].includes(l.status)).length;
  const lostLeads=leads.filter(l=>l.status==="lost").length;
  const updatedLeads=leads.filter(l=>l.is_updated_this_cycle).length;

  const chartData=entries.slice(-8).map(e=>({
    name:new Date(e.period_start).toLocaleDateString("en-IN",{month:"short",day:"numeric"}),
    Email:e.email_sent,WA:e.whatsapp_sent,Calls:e.calls_made,Revenue:e.total_revenue_collected??0,
  }));

  const leadPie=[
    {name:"New",value:leads.filter(l=>l.status==="new").length,color:"#6366F1"},
    {name:"Active",value:activeLeads,color:"#F59E0B"},
    {name:"Won",value:wonLeads,color:"#10B981"},
    {name:"Lost",value:lostLeads,color:"#EF4444"},
  ].filter(d=>d.value>0);

  const StatCard=({icon,label,value,sub,color,bg}:{icon:string,label:string,value:string|number,sub:string,color:string,bg:string})=>(
    <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:"16px 14px"}}>
      <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
      <p style={{fontSize:10.5,fontWeight:700,color:"#A8A29E",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{label}</p>
      <p style={{fontSize:26,fontWeight:800,color,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</p>
      <p style={{fontSize:11.5,color:"#A8A29E",marginTop:5}}>{sub}</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:"#1C1917"}}>
            {client?.name??""} <span style={{color:accent}}>Dashboard</span>
          </h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:2}}>
            {entries.length} periods · {leads.length} leads · {fmtINR(totalRev)} collected
            {updatedLeads>0&&<span style={{marginLeft:8,fontSize:11,background:"#FEF3C7",color:"#92400E",padding:"2px 8px",borderRadius:8,fontWeight:600}}>{updatedLeads} LEADS UPDATED</span>}
          </p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {products.length>1&&(
            <div style={{position:"relative"}}>
              <select value={selProduct} onChange={e=>setSelProduct(e.target.value)}
                style={{appearance:"none",padding:"8px 32px 8px 12px",background:"#fff",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,color:"#1C1917",cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>
                <option value="all">All Products</option>
                {products.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={13} style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#78716C"}}/>
            </div>
          )}
          <div style={{display:"flex",gap:3,background:"#fff",border:"1px solid #E7E5E4",borderRadius:8,padding:3}}>
            {TIMELINES.map(t=>(
              <button key={t.days} onClick={()=>setTimeline(t.days)}
                style={{padding:"5px 10px",fontSize:11.5,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,borderRadius:6,background:timeline===t.days?primary:"transparent",color:timeline===t.days?"#fff":"#78716C",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"2px solid #E7E5E4",marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"10px 20px",fontSize:13.5,fontWeight:600,border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",color:tab===t?accent:"#78716C",borderBottom:tab===t?`2px solid ${accent}`:"2px solid transparent",marginBottom:-2,transition:"all 0.15s"}}>
            {t}
          </button>
        ))}
      </div>

      {/* SUMMARY */}
      {tab==="Summary"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10,marginBottom:20}}>
            <StatCard icon="📧" label="Emails Sent" value={fmt(emailSent)} sub={`${rate(emailOpened,emailSent)}% opened`} color="#2563EB" bg="#EFF6FF"/>
            <StatCard icon="👁️" label="Opened" value={fmt(emailOpened)} sub={`${rate(emailClicked,emailOpened)}% clicked`} color="#6366F1" bg="#EEF2FF"/>
            <StatCard icon="💬" label="WhatsApp" value={fmt(waSent)} sub={`${rate(waDelivered,waSent)}% delivered`} color="#16A34A" bg="#F0FDF4"/>
            <StatCard icon="↩️" label="WA Replied" value={fmt(waReplied)} sub={`${rate(waReplied,waSent)}% reply rate`} color="#0891B2" bg="#ECFEFF"/>
            <StatCard icon="📞" label="Calls Made" value={fmt(callsMade)} sub={`${rate(callsConnected,callsMade)}% connected`} color="#7C3AED" bg="#F5F3FF"/>
            <StatCard icon="🎯" label="Active Leads" value={activeLeads} sub={`${wonLeads} won`} color={accent} bg="#FFF7ED"/>
            <StatCard icon="₹" label="Collected" value={fmtINR(totalRev)} sub="revenue" color="#D97706" bg="#FFFBEB"/>
            <StatCard icon="📦" label="Licences" value={fmt(totalLic)} sub="units sold" color="#BE185D" bg="#FDF2F8"/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:16,marginBottom:20}}>
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:18}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <p style={{fontSize:13,fontWeight:700,color:"#1C1917",display:"flex",alignItems:"center",gap:6}}><span>📊</span> Campaign Activity</p>
                <div style={{display:"flex",gap:10}}>
                  {[["Email","#3B82F6"],["WA","#10B981"],["Calls",accent]].map(([l,c])=>(
                    <span key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:"#78716C"}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block"}}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              {chartData.length===0?<div style={{height:180,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No data yet</div>:(
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barSize={7} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={28}/>
                    <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}}/>
                    <Bar dataKey="Email" fill="#3B82F6" radius={[3,3,0,0]}/>
                    <Bar dataKey="WA" fill="#10B981" radius={[3,3,0,0]}/>
                    <Bar dataKey="Calls" fill={accent} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:18}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><span>🎯</span> Lead Status</p>
              {leadPie.length===0?<div style={{height:130,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No leads</div>:(
                <>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart><Pie data={leadPie} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value">
                      {leadPie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie><Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}}/></PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6}}>
                    {leadPie.map(d=>(
                      <div key={d.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                        <span style={{display:"flex",alignItems:"center",gap:5,color:"#57534E"}}><span style={{width:8,height:8,borderRadius:2,background:d.color,display:"inline-block"}}/>{d.name}</span>
                        <span style={{fontWeight:700,color:"#1C1917"}}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:18}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><span>💰</span> Revenue</p>
              <div style={{textAlign:"center",padding:"12px 0",borderBottom:"1px solid #F5F4F0",marginBottom:12}}>
                <p style={{fontSize:26,fontWeight:800,color:"#16A34A"}}>{fmtINR(totalRev)}</p>
                <p style={{fontSize:11.5,color:"#78716C",marginTop:3}}>Collected</p>
              </div>
              <div style={{textAlign:"center",padding:"12px 0",borderBottom:"1px solid #F5F4F0",marginBottom:12}}>
                <p style={{fontSize:22,fontWeight:700,color:"#D97706"}}>{fmtINR(expectedRev)}</p>
                <p style={{fontSize:11.5,color:"#78716C",marginTop:3}}>Expected</p>
              </div>
              <div style={{textAlign:"center"}}>
                <p style={{fontSize:22,fontWeight:700,color:"#2563EB"}}>{totalLic.toLocaleString("en-IN")}</p>
                <p style={{fontSize:11.5,color:"#78716C",marginTop:3}}>Licences</p>
              </div>
            </div>
          </div>

          {/* Conversion funnel */}
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20,marginBottom:20}}>
            <p style={{fontSize:12,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:16}}>CAMPAIGN → CONVERSION FUNNEL</p>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {[
                {icon:"📧",label:"Emails Sent",value:emailSent,sub:`Total outreach`,color:"#6366F1",bg:"#EEF2FF"},
                {icon:"👁️",label:"Opened",value:emailOpened,sub:`${rate(emailOpened,emailSent)}% rate`,color:"#F59E0B",bg:"#FFFBEB"},
                {icon:"💬",label:"WA Delivered",value:waDelivered,sub:`${rate(waDelivered,waSent)}% rate`,color:"#10B981",bg:"#ECFDF5"},
                {icon:"↩️",label:"WA Replied",value:waReplied,sub:`${rate(waReplied,waSent)}% rate`,color:"#0891B2",bg:"#ECFEFF"},
                {icon:"📞",label:"Calls Connected",value:callsConnected,sub:`${rate(callsConnected,callsMade)}% rate`,color:"#3B82F6",bg:"#EFF6FF"},
                {icon:"🏆",label:"Leads Won",value:wonLeads,sub:`${rate(wonLeads,leads.length)}% win rate`,color:"#16A34A",bg:"#F0FDF4"},
              ].map(({icon,label,value,sub,color,bg},i,arr)=>(
                <div key={label} style={{display:"flex",alignItems:"center",flex:1,gap:6}}>
                  <div style={{flex:1,background:bg,border:`1px solid ${color}25`,borderRadius:10,padding:"14px 10px",textAlign:"center"}}>
                    <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
                    <p style={{fontSize:20,fontWeight:800,color,lineHeight:1}}>{fmt(value)}</p>
                    <p style={{fontSize:12,fontWeight:600,color:"#1C1917",marginTop:5}}>{label}</p>
                    <p style={{fontSize:11,color:"#78716C",marginTop:2}}>{sub}</p>
                  </div>
                  {i<arr.length-1&&<span style={{fontSize:16,color:"#D6D3D1",flexShrink:0}}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Updated leads highlight */}
          {updatedLeads>0&&(
            <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:12,padding:16,marginBottom:16}}>
              <p style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:10}}>⚡ {updatedLeads} Lead{updatedLeads>1?"s":""} Updated Across Cycles</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {leads.filter(l=>l.is_updated_this_cycle).map(l=>(
                  <div key={l.id} style={{background:"#fff",border:"1px solid #FDE68A",borderRadius:8,padding:"8px 12px"}}>
                    <p style={{fontSize:13,fontWeight:600,color:"#1C1917"}}>{l.name}</p>
                    <p style={{fontSize:12,color:"#78716C",marginTop:2}}>
                      <span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span>
                      {" → "}
                      <span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span>
                      {l.cycle_label&&<span style={{color:"#A8A29E",fontSize:11,marginLeft:4}}>· {l.cycle_label}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* CAMPAIGNS TAB */}
      {tab==="Campaigns"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[
            {icon:"📧",title:"Email Campaign",color:"#2563EB",bg:"#EFF6FF",border:"#BFDBFE",stats:[["Sent",emailSent],["Opened",emailOpened],["Clicked",emailClicked],["Open Rate",`${rate(emailOpened,emailSent)}%`],["Click Rate",`${rate(emailClicked,emailSent)}%`]]},
            {icon:"💬",title:"WhatsApp Campaign",color:"#16A34A",bg:"#F0FDF4",border:"#A7F3D0",stats:[["Sent",waSent],["Delivered",waDelivered],["Replied",waReplied],["Delivery Rate",`${rate(waDelivered,waSent)}%`],["Reply Rate",`${rate(waReplied,waSent)}%`]]},
            {icon:"📞",title:"Calls",color:"#7C3AED",bg:"#F5F3FF",border:"#DDD6FE",stats:[["Made",callsMade],["Connected",callsConnected],["Converted",callsConverted],["Connect Rate",`${rate(callsConnected,callsMade)}%`],["Conversion",`${rate(callsConverted,callsMade)}%`]]},
          ].map(({icon,title,color,bg,border,stats})=>(
            <div key={title} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
              <div style={{background:bg,border:`1px solid ${border}`,padding:"16px 20px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:26}}>{icon}</span>
                <p style={{fontSize:15,fontWeight:700,color}}>{title}</p>
              </div>
              <div style={{padding:20}}>
                {stats.map(([l,v])=>(
                  <div key={l as string} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #F5F4F0"}}>
                    <span style={{fontSize:13,color:"#78716C"}}>{l as string}</span>
                    <span style={{fontSize:16,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>{typeof v==="number"?fmt(v):v}</span>
                  </div>
                ))}
                <div style={{marginTop:16,height:6,background:"#F5F4F0",borderRadius:3}}>
                  <div style={{height:6,background:color,borderRadius:3,width:`${Math.min(rate(stats[1][1] as number,stats[0][1] as number),100)}%`,transition:"width 0.6s"}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEADS TAB */}
      {tab==="Leads"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
            {[{icon:"📥",label:"Total",v:leads.length,color:"#6366F1"},{icon:"🔵",label:"New",v:leads.filter(l=>l.status==="new").length,color:"#3B82F6"},{icon:"🟡",label:"Active",v:activeLeads,color:"#F59E0B"},{icon:"✅",label:"Won",v:wonLeads,color:"#16A34A"},{icon:"❌",label:"Lost",v:lostLeads,color:"#EF4444"}].map(({icon,label,v,color})=>(
              <div key={label} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:18,textAlign:"center"}}>
                <div style={{fontSize:26,marginBottom:8}}>{icon}</div>
                <p style={{fontSize:28,fontWeight:800,color,lineHeight:1}}>{v}</p>
                <p style={{fontSize:12.5,color:"#78716C",marginTop:6,fontWeight:600}}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
            {leads.length===0?<p style={{textAlign:"center",color:"#A8A29E",padding:"40px 0",fontSize:13}}>No leads yet</p>:(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
                  {["Lead","Status","Location","Revenue","Cycle","Progress"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:11.5,fontWeight:600,color:"#A8A29E"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {leads.map(l=>(
                    <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#1C1917"}}>
                        {l.name}{l.is_updated_this_cycle&&<span style={{marginLeft:5,fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 6px",borderRadius:8,fontWeight:700}}>UPDATED</span>}
                      </td>
                      <td style={{padding:"10px 12px"}}><span style={{fontSize:11.5,padding:"3px 9px",borderRadius:10,fontWeight:600,background:l.status==="won"?"#DCFCE7":l.status==="lost"?"#FEE2E2":"#EEF2FF",color:l.status==="won"?"#15803D":l.status==="lost"?"#B91C1C":"#4338CA"}}>{l.status.charAt(0).toUpperCase()+l.status.slice(1)}</span></td>
                      <td style={{padding:"10px 12px",color:"#78716C",fontSize:12.5}}>{l.location??"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#16A34A"}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                      <td style={{padding:"10px 12px",color:"#A8A29E",fontSize:12}}>{l.cycle_label??"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12}}>
                        {l.previous_status&&l.previous_status!==l.status?<span><span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span> → <span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span></span>:<span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {tab==="Reports"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
            <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:16}}>📈 Campaign Trend</p>
            {chartData.length===0?<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No data</div>:(
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={28}/>
                  <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}}/>
                  <Line type="monotone" dataKey="Email" stroke="#3B82F6" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="WA" stroke="#10B981" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="Calls" stroke={accent} strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
            <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:16}}>💰 Revenue Timeline</p>
            {chartData.length===0?<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No data</div>:(
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={50} tickFormatter={(v)=>fmtINR(v)}/>
                  <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}} formatter={(v:any)=>fmtINR(v)}/>
                  <Line type="monotone" dataKey="Revenue" stroke="#16A34A" strokeWidth={3} dot={{r:4,fill:"#16A34A"}} activeDot={{r:6}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

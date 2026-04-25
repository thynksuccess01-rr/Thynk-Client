"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ComposedChart, Legend
} from "recharts";

const TIMELINES = [{label:"Today",days:1},{label:"Last 5 Days",days:5},{label:"Last 10 Days",days:10},{label:"Last 15 Days",days:15},{label:"Last 30 Days",days:30},{label:"Current Year",days:365}];
const TABS = ["Summary","Campaigns","Leads","Revenue"];
const fmt=(n:number)=>n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n??0);
const fmtINR=(n:number)=>`₹${n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:(n??0)}`;
const rate=(a:number,b:number)=>b>0?Math.round(a/b*100):0;

const CHART_COLORS = { email:"#3B82F6", wa:"#10B981", calls:"#E8611A", revenue:"#F59E0B", won:"#16A34A", lost:"#EF4444", active:"#8B5CF6" };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#1C1917",border:"none",borderRadius:10,padding:"10px 14px",boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>
      <p style={{color:"#A8A29E",fontSize:11,marginBottom:6}}>{label}</p>
      {payload.map((p:any) => (
        <p key={p.dataKey} style={{color:p.color,fontSize:12.5,fontWeight:600}}>
          {p.name}: {typeof p.value==="number"&&p.name==="Revenue"?fmtINR(p.value):fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [sel, setSel] = useState("all");
  const [timeline, setTimeline] = useState(30);
  const [tab, setTab] = useState("Summary");
  const [entries, setEntries] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [gStats, setGStats] = useState({clients:0,products:0,users:0});
  const supabase = createClient();

  useEffect(()=>{
    supabase.from("clients").select("id,name").eq("is_active",true).order("name").then(r=>setClients(r.data??[]));
    Promise.all([
      supabase.from("clients").select("id",{count:"exact",head:true}),
      supabase.from("products").select("id",{count:"exact",head:true}),
      supabase.from("profiles").select("id",{count:"exact",head:true}),
    ]).then(([c,p,u])=>setGStats({clients:c.count??0,products:p.count??0,users:u.count??0}));
  },[]);

  const load = useCallback(async()=>{
    const since=new Date(); since.setDate(since.getDate()-timeline);
    const s=since.toISOString().split("T")[0];
    const base=(q:any)=>sel!=="all"?q.eq("client_id",sel):q;
    const [e,u,l]=await Promise.all([
      base(supabase.from("data_entries").select("*").gte("period_start",s)).order("period_start"),
      base(supabase.from("campaign_updates").select("*").gte("update_date",s)).order("update_date"),
      base(supabase.from("leads").select("*")).order("created_at",{ascending:false}),
    ]);
    setEntries(e.data??[]); setUpdates(u.data??[]); setLeads(l.data??[]);
  },[sel,timeline]);

  useEffect(()=>{load();},[load]);

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

  // Rich chart data with accumulated updates merged by date
  const periodChartData = entries.slice(-10).map(e=>{
    const periodUpdates = updates.filter(u=>u.update_date>=e.period_start&&u.update_date<=e.period_end);
    const eUpds = periodUpdates.filter(u=>u.channel==="email");
    const wUpds = periodUpdates.filter(u=>u.channel==="whatsapp");
    const cUpds = periodUpdates.filter(u=>u.channel==="calls");
    return {
      name: e.entry_label || new Date(e.period_start).toLocaleDateString("en-IN",{month:"short",day:"numeric"}),
      Email: e.email_sent+eUpds.reduce((s,u)=>s+u.email_sent,0),
      WA: e.whatsapp_sent+wUpds.reduce((s,u)=>s+u.whatsapp_sent,0),
      Calls: e.calls_made+cUpds.reduce((s,u)=>s+u.calls_made,0),
      Revenue: e.total_revenue_collected??0,
      Licences: e.total_licences??0,
      OpenRate: rate(e.email_opened+eUpds.reduce((s,u)=>s+u.email_opened,0), e.email_sent+eUpds.reduce((s,u)=>s+u.email_sent,0)),
      DeliveryRate: rate(e.whatsapp_delivered+wUpds.reduce((s,u)=>s+u.whatsapp_delivered,0), e.whatsapp_sent+wUpds.reduce((s,u)=>s+u.whatsapp_sent,0)),
      ConnectRate: rate(e.calls_connected+cUpds.reduce((s,u)=>s+u.calls_connected,0), e.calls_made+cUpds.reduce((s,u)=>s+u.calls_made,0)),
    };
  });

  const leadStatusData = [
    {name:"New",value:leads.filter(l=>l.status==="new").length,color:CHART_COLORS.email},
    {name:"Contacted",value:leads.filter(l=>l.status==="contacted").length,color:"#F59E0B"},
    {name:"Qualified",value:leads.filter(l=>l.status==="qualified").length,color:"#F97316"},
    {name:"Proposal",value:leads.filter(l=>l.status==="proposal").length,color:"#8B5CF6"},
    {name:"Negotiation",value:leads.filter(l=>l.status==="negotiation").length,color:"#EC4899"},
    {name:"Won",value:wonLeads,color:CHART_COLORS.won},
    {name:"Lost",value:lostLeads,color:CHART_COLORS.lost},
  ].filter(d=>d.value>0);

  const rateRadarData = [
    {metric:"Open Rate",value:rate(emailOpened,emailSent),fullMark:100},
    {metric:"Click Rate",value:rate(emailClicked,emailSent),fullMark:100},
    {metric:"WA Delivery",value:rate(waDelivered,waSent),fullMark:100},
    {metric:"WA Reply",value:rate(waReplied,waSent),fullMark:100},
    {metric:"Call Connect",value:rate(callsConnected,callsMade),fullMark:100},
    {metric:"Conversion",value:rate(callsConverted,callsMade),fullMark:100},
  ];

  // Client comparison (top 5 by revenue)
  const clientRevData = clients.slice(0,6).map(c=>{
    const cEntries = entries.filter(e=>e.client_id===c.id);
    return { name:c.name.split(" ")[0], Revenue:cEntries.reduce((s,e)=>s+(e.total_revenue_collected??0),0), Leads:leads.filter(l=>l.client_id===c.id).length };
  }).filter(d=>d.Revenue>0||d.Leads>0).sort((a,b)=>b.Revenue-a.Revenue);

  const Card=({icon,label,value,sub,color}:{icon:string,label:string,value:string|number,sub:string,color:string})=>(
    <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:"16px 14px",display:"flex",flexDirection:"column",gap:6,minWidth:0}}>
      <div style={{fontSize:22}}>{icon}</div>
      <p style={{fontSize:10.5,fontWeight:700,color:"#A8A29E",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</p>
      <p style={{fontSize:26,fontWeight:800,color,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</p>
      <p style={{fontSize:11.5,color:"#A8A29E"}}>{sub}</p>
    </div>
  );

  const RateGauge=({label,value,color}:{label:string,value:number,color:string})=>(
    <div style={{textAlign:"center"}}>
      <div style={{position:"relative",width:64,height:64,margin:"0 auto 6px"}}>
        <svg viewBox="0 0 64 64" style={{transform:"rotate(-90deg)"}}>
          <circle cx="32" cy="32" r="26" fill="none" stroke="#F0EEEC" strokeWidth="7"/>
          <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${(value/100)*163.4} 163.4`} strokeLinecap="round"/>
        </svg>
        <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color}}>{value}%</span>
      </div>
      <p style={{fontSize:11,color:"#78716C",fontWeight:500}}>{label}</p>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F5F4F0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:"#1C1917"}}>Reporting <span style={{color:"#E8611A"}}>Analytics</span></h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:2}}>{gStats.clients} clients · {gStats.products} products · {leads.length} leads total</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <div style={{position:"relative"}}>
            <select value={sel} onChange={e=>setSel(e.target.value)} style={{appearance:"none",padding:"8px 32px 8px 12px",background:"#fff",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,color:"#1C1917",cursor:"pointer",fontFamily:"inherit",fontWeight:500,minWidth:150}}>
              <option value="all">All Clients</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={13} style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#78716C"}}/>
          </div>
          <div style={{display:"flex",gap:4,background:"#fff",border:"1px solid #E7E5E4",borderRadius:8,padding:3}}>
            {TIMELINES.map(t=>(
              <button key={t.days} onClick={()=>setTimeline(t.days)} style={{padding:"5px 10px",fontSize:11.5,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,borderRadius:6,background:timeline===t.days?"#1C1917":"transparent",color:timeline===t.days?"#fff":"#78716C",transition:"all 0.15s",whiteSpace:"nowrap"}}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:0,borderBottom:"2px solid #E7E5E4",marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"10px 20px",fontSize:13.5,fontWeight:600,border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",color:tab===t?"#E8611A":"#78716C",borderBottom:tab===t?"2px solid #E8611A":"2px solid transparent",marginBottom:-2,transition:"all 0.15s"}}>{t}</button>
        ))}
      </div>

      {tab==="Summary"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10,marginBottom:20}}>
            <Card icon="🏢" label="Clients" value={gStats.clients} sub={`${clients.length} active`} color="#6366F1"/>
            <Card icon="📧" label="Emails Sent" value={fmt(emailSent)} sub={`${rate(emailOpened,emailSent)}% opened`} color="#2563EB"/>
            <Card icon="💬" label="WhatsApp" value={fmt(waSent)} sub={`${rate(waDelivered,waSent)}% delivered`} color="#16A34A"/>
            <Card icon="📞" label="Calls" value={fmt(callsMade)} sub={`${rate(callsConnected,callsMade)}% connected`} color="#7C3AED"/>
            <Card icon="🎯" label="Total Leads" value={leads.length} sub={`${wonLeads} won`} color="#E8611A"/>
            <Card icon="₹" label="Collected" value={fmtINR(totalRev)} sub={`${fmtINR(expectedRev)} expected`} color="#D97706"/>
            <Card icon="📦" label="Licences" value={fmt(totalLic)} sub="units sold" color="#0891B2"/>
            <Card icon="🔮" label="Pipeline" value={fmtINR(expectedRev)} sub="expected value" color="#BE185D"/>
          </div>

          {/* Rate gauges row */}
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:"18px 24px",marginBottom:16,display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
            <div>
              <p style={{fontSize:12,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:4}}>PERFORMANCE RATES</p>
              <p style={{fontSize:11.5,color:"#78716C"}}>Key conversion metrics across all channels</p>
            </div>
            <div style={{display:"flex",gap:24,flex:1,justifyContent:"flex-end"}}>
              <RateGauge label="Open Rate" value={rate(emailOpened,emailSent)} color="#3B82F6"/>
              <RateGauge label="Click Rate" value={rate(emailClicked,emailSent)} color="#6366F1"/>
              <RateGauge label="WA Delivery" value={rate(waDelivered,waSent)} color="#10B981"/>
              <RateGauge label="WA Reply" value={rate(waReplied,waSent)} color="#0891B2"/>
              <RateGauge label="Call Connect" value={rate(callsConnected,callsMade)} color="#7C3AED"/>
              <RateGauge label="Converted" value={rate(callsConverted,callsMade)} color="#E8611A"/>
              <RateGauge label="Lead Win" value={rate(wonLeads,leads.length)} color="#16A34A"/>
            </div>
          </div>

          {/* Main charts row */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
            {/* Campaign activity area chart */}
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:"#1C1917"}}>📊 Campaign Activity by Period</p>
                  <p style={{fontSize:11.5,color:"#A8A29E",marginTop:2}}>Email, WhatsApp & Calls volume</p>
                </div>
                <div style={{display:"flex",gap:12}}>
                  {[["Email",CHART_COLORS.email],["WA",CHART_COLORS.wa],["Calls",CHART_COLORS.calls]].map(([l,c])=>(
                    <span key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:"#78716C"}}>
                      <span style={{width:10,height:3,borderRadius:2,background:c,display:"inline-block"}}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              {periodChartData.length===0?(
                <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No data for this period</div>
              ):(
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={periodChartData} margin={{top:4,right:4,left:0,bottom:0}}>
                    <defs>
                      <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.email} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={CHART_COLORS.email} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="waGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.wa} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={CHART_COLORS.wa} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.calls} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={CHART_COLORS.calls} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:10.5,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={32}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="Email" stroke={CHART_COLORS.email} strokeWidth={2.5} fill="url(#emailGrad)" dot={{r:3,fill:CHART_COLORS.email}}/>
                    <Area type="monotone" dataKey="WA" stroke={CHART_COLORS.wa} strokeWidth={2.5} fill="url(#waGrad)" dot={{r:3,fill:CHART_COLORS.wa}}/>
                    <Area type="monotone" dataKey="Calls" stroke={CHART_COLORS.calls} strokeWidth={2.5} fill="url(#callsGrad)" dot={{r:3,fill:CHART_COLORS.calls}}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Lead status donut */}
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:4}}>🎯 Lead Status Distribution</p>
              <p style={{fontSize:11.5,color:"#A8A29E",marginBottom:14}}>{leads.length} total leads</p>
              {leadStatusData.length===0?(
                <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No leads</div>
              ):(
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                        {leadStatusData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:8}}>
                    {leadStatusData.map(d=>(
                      <div key={d.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5}}>
                        <span style={{width:8,height:8,borderRadius:2,background:d.color,display:"inline-block",flexShrink:0}}/>
                        <span style={{color:"#57534E",flex:1}}>{d.name}</span>
                        <span style={{fontWeight:700,color:"#1C1917"}}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Revenue + Radar row */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
            {/* Revenue area */}
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:"#1C1917"}}>💰 Revenue & Licences by Period</p>
                  <p style={{fontSize:11.5,color:"#A8A29E",marginTop:2}}>Collected revenue and licence count</p>
                </div>
              </div>
              {periodChartData.length===0?(
                <div style={{height:180,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No data</div>
              ):(
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={periodChartData} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:10.5,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="rev" tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={44} tickFormatter={v=>fmtINR(v)}/>
                    <YAxis yAxisId="lic" orientation="right" tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={30}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#E8611A" strokeWidth={2.5} fill="#FFF7ED" dot={{r:4,fill:"#E8611A"}}/>
                    <Bar yAxisId="lic" dataKey="Licences" fill="#0891B2" opacity={0.7} radius={[3,3,0,0]} barSize={12}/>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Radar chart */}
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:4}}>📡 Channel Performance Radar</p>
              <p style={{fontSize:11.5,color:"#A8A29E",marginBottom:10}}>Rate metrics (0–100%)</p>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart data={rateRadarData} margin={{top:0,right:10,left:10,bottom:0}}>
                  <PolarGrid stroke="#F0EEEC"/>
                  <PolarAngleAxis dataKey="metric" tick={{fontSize:10,fill:"#78716C"}}/>
                  <Radar name="Rate" dataKey="value" stroke="#E8611A" fill="#E8611A" fillOpacity={0.2} strokeWidth={2}/>
                  <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}} formatter={(v:any)=>`${v}%`}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel */}
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20,marginBottom:16}}>
            <p style={{fontSize:12,fontWeight:700,color:"#A8A29E",letterSpacing:"0.08em",marginBottom:16}}>CAMPAIGN → CONVERSION FUNNEL</p>
            <div style={{display:"flex",alignItems:"stretch",gap:0}}>
              {[
                {icon:"📧",label:"Emails Sent",value:emailSent,rate:null,color:"#6366F1",bg:"#EEF2FF"},
                {icon:"👁️",label:"Opened",value:emailOpened,rate:rate(emailOpened,emailSent),color:"#2563EB",bg:"#EFF6FF"},
                {icon:"🖱️",label:"Clicked",value:emailClicked,rate:rate(emailClicked,emailSent),color:"#0891B2",bg:"#ECFEFF"},
                {icon:"💬",label:"WA Delivered",value:waDelivered,rate:rate(waDelivered,waSent),color:"#10B981",bg:"#ECFDF5"},
                {icon:"↩️",label:"WA Replied",value:waReplied,rate:rate(waReplied,waSent),color:"#16A34A",bg:"#F0FDF4"},
                {icon:"📞",label:"Connected",value:callsConnected,rate:rate(callsConnected,callsMade),color:"#3B82F6",bg:"#EFF6FF"},
                {icon:"🏆",label:"Won Leads",value:wonLeads,rate:rate(wonLeads,leads.length),color:"#16A34A",bg:"#DCFCE7"},
              ].map(({icon,label,value,rate:r,color,bg},i,arr)=>(
                <div key={label} style={{display:"flex",alignItems:"center",flex:1,gap:0}}>
                  <div style={{flex:1,background:bg,border:`1px solid ${color}20`,borderRadius:10,padding:"14px 10px",textAlign:"center",minWidth:0}}>
                    <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                    <p style={{fontSize:18,fontWeight:800,color,lineHeight:1}}>{fmt(value)}</p>
                    <p style={{fontSize:11,fontWeight:600,color:"#1C1917",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</p>
                    {r!==null&&<p style={{fontSize:10.5,color:"#78716C",marginTop:2}}>{r}% rate</p>}
                  </div>
                  {i<arr.length-1&&<span style={{fontSize:14,color:"#D6D3D1",flexShrink:0,padding:"0 4px"}}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Recent leads */}
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",display:"flex",alignItems:"center",gap:6}}>
                📋 Recent Leads {updatedLeads>0&&<span style={{fontSize:11,background:"#FEF3C7",color:"#92400E",padding:"2px 8px",borderRadius:8,fontWeight:600,marginLeft:4}}>{updatedLeads} UPDATED</span>}
              </p>
              <Link href="/admin/leads" style={{fontSize:12.5,color:"#E8611A",textDecoration:"none",fontWeight:600}}>View All →</Link>
            </div>
            {leads.length===0?<p style={{fontSize:13,color:"#A8A29E",textAlign:"center",padding:"24px 0"}}>No leads yet</p>:(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
                  {["Lead","Status","Location","Revenue","Cycle","Change"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:11.5,fontWeight:600,color:"#A8A29E"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {leads.slice(0,6).map(l=>(
                    <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#1C1917"}}>{l.name}{l.is_updated_this_cycle&&<span style={{marginLeft:5,fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 6px",borderRadius:8,fontWeight:700}}>↑</span>}</td>
                      <td style={{padding:"10px 12px"}}><span style={{fontSize:11.5,padding:"3px 9px",borderRadius:10,fontWeight:600,background:l.status==="won"?"#DCFCE7":l.status==="lost"?"#FEE2E2":"#EEF2FF",color:l.status==="won"?"#15803D":l.status==="lost"?"#B91C1C":"#4338CA"}}>{l.status.charAt(0).toUpperCase()+l.status.slice(1)}</span></td>
                      <td style={{padding:"10px 12px",color:"#78716C",fontSize:12.5}}>{l.location??"—"}</td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#16A34A"}}>{l.expected_revenue?fmtINR(l.expected_revenue):"—"}</td>
                      <td style={{padding:"10px 12px",color:"#A8A29E",fontSize:12}}>{l.cycle_label??"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12}}>
                        {l.previous_status&&l.previous_status!==l.status
                          ?<span><span style={{background:"#FEE2E2",color:"#B91C1C",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.previous_status}</span> → <span style={{background:"#DCFCE7",color:"#15803D",padding:"1px 5px",borderRadius:4,fontSize:11}}>{l.status}</span></span>
                          :<span style={{color:"#D6D3D1"}}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab==="Campaigns"&&(
        <div>
          {/* Channel cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
            {[
              {icon:"📧",title:"Email Campaign",color:"#2563EB",bg:"#EFF6FF",border:"#BFDBFE",
                stats:[["Sent",emailSent],["Opened",emailOpened],["Clicked",emailClicked],["Open Rate",`${rate(emailOpened,emailSent)}%`],["Click Rate",`${rate(emailClicked,emailSent)}%`]],
                rateA:rate(emailOpened,emailSent),rateB:rate(emailClicked,emailSent)},
              {icon:"💬",title:"WhatsApp",color:"#16A34A",bg:"#F0FDF4",border:"#A7F3D0",
                stats:[["Sent",waSent],["Delivered",waDelivered],["Replied",waReplied],["Delivery Rate",`${rate(waDelivered,waSent)}%`],["Reply Rate",`${rate(waReplied,waSent)}%`]],
                rateA:rate(waDelivered,waSent),rateB:rate(waReplied,waSent)},
              {icon:"📞",title:"Calls",color:"#7C3AED",bg:"#F5F3FF",border:"#DDD6FE",
                stats:[["Made",callsMade],["Connected",callsConnected],["Converted",callsConverted],["Connect Rate",`${rate(callsConnected,callsMade)}%`],["Conversion",`${rate(callsConverted,callsMade)}%`]],
                rateA:rate(callsConnected,callsMade),rateB:rate(callsConverted,callsMade)},
            ].map(({icon,title,color,bg,border,stats,rateA,rateB})=>(
              <div key={title} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
                <div style={{background:bg,padding:"16px 20px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:24}}>{icon}</span>
                  <p style={{fontSize:15,fontWeight:700,color}}>{title}</p>
                </div>
                <div style={{padding:20}}>
                  {stats.map(([l,v])=>(
                    <div key={l as string} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #F5F4F0"}}>
                      <span style={{fontSize:13,color:"#78716C"}}>{l as string}</span>
                      <span style={{fontSize:16,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>{typeof v==="number"?fmt(v):v}</span>
                    </div>
                  ))}
                  <div style={{marginTop:14,display:"flex",gap:12,justifyContent:"center"}}>
                    <RateGauge label={stats[3][0] as string} value={rateA} color={color}/>
                    <RateGauge label={stats[4][0] as string} value={rateB} color={color}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Grouped bar for comparison */}
          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
            <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:16}}>📊 Channel Volume by Period</p>
            {periodChartData.length===0?<div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No data</div>:(
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={periodChartData} barGap={2} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:10.5,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={32}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:"#78716C"}}/>
                  <Bar dataKey="Email" fill={CHART_COLORS.email} radius={[4,4,0,0]}/>
                  <Bar dataKey="WA" fill={CHART_COLORS.wa} radius={[4,4,0,0]}/>
                  <Bar dataKey="Calls" fill={CHART_COLORS.calls} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {tab==="Leads"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
            {[{icon:"📥",label:"Total",value:leads.length,color:"#6366F1"},{icon:"🔵",label:"New",value:leads.filter(l=>l.status==="new").length,color:"#3B82F6"},{icon:"🟡",label:"In Progress",value:activeLeads,color:"#F59E0B"},{icon:"✅",label:"Won",value:wonLeads,color:"#16A34A"},{icon:"❌",label:"Lost",value:lostLeads,color:"#EF4444"}].map(({icon,label,value,color})=>(
              <div key={label} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:18,textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
                <p style={{fontSize:30,fontWeight:800,color,lineHeight:1}}>{value}</p>
                <p style={{fontSize:12.5,color:"#78716C",marginTop:6,fontWeight:600}}>{label}</p>
              </div>
            ))}
          </div>

          {/* Lead charts */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:14}}>🎯 Lead Status Breakdown</p>
              {leadStatusData.length===0?<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No leads</div>:(
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={leadStatusData} layout="vertical" margin={{top:0,right:30,left:40,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:11.5,fill:"#57534E"}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}}/>
                    <Bar dataKey="value" radius={[0,4,4,0]}>
                      {leadStatusData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:14}}>💎 Revenue Pipeline Distribution</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[
                    {name:"Won Revenue",value:leads.filter(l=>l.status==="won").reduce((s,l)=>s+(l.expected_revenue??0),0),color:"#16A34A"},
                    {name:"Pipeline",value:leads.filter(l=>!["won","lost"].includes(l.status)).reduce((s,l)=>s+(l.expected_revenue??0),0),color:"#F59E0B"},
                    {name:"Lost",value:leads.filter(l=>l.status==="lost").reduce((s,l)=>s+(l.expected_revenue??0),0),color:"#EF4444"},
                  ].filter(d=>d.value>0)} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                    {[0,1,2].map(i=><Cell key={i} fill={["#16A34A","#F59E0B","#EF4444"][i]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}} formatter={(v:any)=>fmtINR(v)}/>
                  <Legend wrapperStyle={{fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917"}}>📋 All Leads</p>
              <Link href="/admin/leads" style={{fontSize:12.5,color:"#E8611A",textDecoration:"none",fontWeight:600}}>Manage All →</Link>
            </div>
            {leads.length===0?<p style={{textAlign:"center",color:"#A8A29E",padding:"40px 0",fontSize:13}}>No leads yet</p>:(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#FAFAF9",borderBottom:"1px solid #F0EEEC"}}>
                  {["Lead","Status","Location","Volume","Revenue","Cycle","Updated"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:11.5,fontWeight:600,color:"#A8A29E"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {leads.slice(0,10).map(l=>(
                    <tr key={l.id} style={{borderBottom:"1px solid #FAFAF9",background:l.is_updated_this_cycle?"#FFFBEB":"transparent"}}>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#1C1917"}}>{l.name}{l.is_updated_this_cycle&&<span style={{marginLeft:5,fontSize:10,background:"#FEF3C7",color:"#92400E",padding:"1px 6px",borderRadius:8,fontWeight:700}}>UPDATED</span>}</td>
                      <td style={{padding:"10px 12px"}}><span style={{fontSize:11.5,padding:"3px 9px",borderRadius:10,fontWeight:600,background:l.status==="won"?"#DCFCE7":l.status==="lost"?"#FEE2E2":"#EEF2FF",color:l.status==="won"?"#15803D":l.status==="lost"?"#B91C1C":"#4338CA"}}>{l.status.charAt(0).toUpperCase()+l.status.slice(1)}</span></td>
                      <td style={{padding:"10px 12px",color:"#78716C",fontSize:12.5}}>{l.location??"—"}</td>
                      <td style={{padding:"10px 12px",color:"#78716C",fontSize:12.5}}>{l.expected_volume??"—"}</td>
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

      {tab==="Revenue"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
            {[{icon:"₹",title:"Revenue Collected",value:fmtINR(totalRev),sub:`Across ${entries.length} entries`,color:"#16A34A",bg:"#F0FDF4",border:"#A7F3D0"},{icon:"🔮",title:"Expected Collection",value:fmtINR(expectedRev),sub:"Pipeline value",color:"#D97706",bg:"#FFFBEB",border:"#FDE68A"},{icon:"📦",title:"Total Licences",value:totalLic.toLocaleString("en-IN"),sub:"Units sold",color:"#2563EB",bg:"#EFF6FF",border:"#BFDBFE"}].map(({icon,title,value,sub,color,bg,border})=>(
              <div key={title} style={{background:bg,border:`1px solid ${border}`,borderRadius:12,padding:24,textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:10}}>{icon}</div>
                <p style={{fontSize:32,fontWeight:800,color,lineHeight:1}}>{value}</p>
                <p style={{fontSize:14,fontWeight:700,color:"#1C1917",marginTop:8}}>{title}</p>
                <p style={{fontSize:12,color:"#78716C",marginTop:4}}>{sub}</p>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
            <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
              <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:16}}>💰 Revenue Timeline</p>
              {periodChartData.length===0?<div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center",color:"#A8A29E",fontSize:13}}>No data</div>:(
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={periodChartData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E8611A" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#E8611A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:"#A8A29E"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:"#A8A29E"}} axisLine={false} tickLine={false} width={50} tickFormatter={v=>fmtINR(v)}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="Revenue" stroke="#E8611A" strokeWidth={3} fill="url(#revGrad)" dot={{r:4,fill:"#E8611A"}} activeDot={{r:6}}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            {clientRevData.length>0&&(
              <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:20}}>
                <p style={{fontSize:13,fontWeight:700,color:"#1C1917",marginBottom:16}}>🏢 Top Clients by Revenue</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={clientRevData} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:"#A8A29E"}} axisLine={false} tickLine={false} tickFormatter={v=>fmtINR(v)}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:11.5,fill:"#57534E"}} axisLine={false} tickLine={false} width={55}/>
                    <Tooltip contentStyle={{background:"#1C1917",border:"none",borderRadius:8,color:"#F5F4F0",fontSize:12}} formatter={(v:any)=>fmtINR(v)}/>
                    <Bar dataKey="Revenue" fill="#E8611A" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




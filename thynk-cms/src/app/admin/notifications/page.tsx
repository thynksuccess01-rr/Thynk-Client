"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Send, Trash2, Search, Check, Filter } from "lucide-react";
import toast from "react-hot-toast";

const NOTIF_TYPES = ["admin_message","data_update","document","lead_update","system"];
const NOTIF_META: Record<string,{icon:string,color:string,bg:string}> = {
  admin_message: { icon:"💬", color:"#4338CA", bg:"#EEF2FF" },
  data_update:   { icon:"📊", color:"#15803D", bg:"#DCFCE7" },
  document:      { icon:"📎", color:"#7C3AED", bg:"#F5F3FF" },
  lead_update:   { icon:"🎯", color:"#B45309", bg:"#FFFBEB" },
  system:        { icon:"🔔", color:"#0891B2", bg:"#ECFEFF" },
};
const fmtDate = (d:string) => new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

export default function NotificationControlPanel() {
  const [clients,      setClients]      = useState<any[]>([]);
  const [notifications,setNotifications]= useState<any[]>([]);
  const [selClient,    setSelClient]    = useState("all");
  const [selType,      setSelType]      = useState("all");
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState(true);
  // Compose
  const [compClient,   setCompClient]   = useState("");
  const [compType,     setCompType]     = useState("admin_message");
  const [compTitle,    setCompTitle]    = useState("");
  const [compBody,     setCompBody]     = useState("");
  const [broadcastAll, setBroadcastAll] = useState(false);
  const [sending,      setSending]      = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("clients").select("id,name").eq("is_active",true).order("name").then(r=>setClients(r.data??[]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("notifications")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (selClient !== "all") q = q.eq("client_id", selClient);
    if (selType   !== "all") q = q.eq("type", selType);
    const { data } = await q;
    setNotifications(data ?? []);
    setLoading(false);
  }, [selClient, selType]);

  useEffect(() => { load(); }, [load]);

  async function sendNotification() {
    if (!compTitle.trim()) { toast.error("Title required"); return; }
    if (!broadcastAll && !compClient) { toast.error("Select a client or enable broadcast"); return; }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (broadcastAll) {
      // Send to all active clients
      const rows = clients.map(c => ({
        client_id:  c.id,
        type:       compType,
        title:      compTitle.trim(),
        body:       compBody.trim() || null,
        created_by: user?.id,
      }));
      await supabase.from("notifications").insert(rows);
      toast.success(`Sent to all ${clients.length} clients`);
    } else {
      await supabase.from("notifications").insert({
        client_id:  compClient,
        type:       compType,
        title:      compTitle.trim(),
        body:       compBody.trim() || null,
        created_by: user?.id,
      });
      toast.success("Notification sent");
    }
    setCompTitle(""); setCompBody("");
    setSending(false);
    load();
  }

  async function deleteNotif(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    toast.success("Deleted");
    load();
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  }

  const filtered = notifications.filter(n => {
    if (search) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || (n.body??"").toLowerCase().includes(q) || (n.clients?.name??"").toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total:  notifications.length,
    unread: notifications.filter(n=>!n.is_read).length,
    today:  notifications.filter(n=>new Date(n.created_at).toDateString()===new Date().toDateString()).length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:"#1C1917",fontFamily:"Fraunces,Georgia,serif"}}>
          Notification <span style={{color:"#E8611A"}}>Control Panel</span>
        </h1>
        <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Send, manage and track all client notifications</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Total Sent",    value:stats.total,  color:"#6366F1"},
          {label:"Unread",        value:stats.unread, color:"#F59E0B"},
          {label:"Sent Today",    value:stats.today,  color:"#16A34A"},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:10,padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
            <Bell size={22} color={s.color}/>
            <div>
              <p style={{fontSize:24,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</p>
              <p style={{fontSize:12,color:"#78716C",marginTop:3,fontWeight:600}}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16}}>
        {/* Compose Panel */}
        <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:14,padding:20,height:"fit-content"}}>
          <p style={{fontSize:14,fontWeight:700,color:"#1C1917",marginBottom:16}}>✉️ Compose Notification</p>

          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"#57534E",marginBottom:5}}>Type</label>
            <select value={compType} onChange={e=>setCompType(e.target.value)}
              style={{width:"100%",padding:"9px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff"}}>
              {NOTIF_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
          </div>

          <div style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <label style={{fontSize:12,fontWeight:600,color:"#57534E"}}>Send To</label>
              <button onClick={()=>setBroadcastAll(!broadcastAll)}
                style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,padding:"3px 8px",borderRadius:6,border:"1px solid",borderColor:broadcastAll?"#E8611A":"#E7E5E4",background:broadcastAll?"#FFF7ED":"#fff",color:broadcastAll?"#E8611A":"#78716C",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {broadcastAll ? "📢 Broadcast All" : "Single Client"}
              </button>
            </div>
            {!broadcastAll && (
              <select value={compClient} onChange={e=>setCompClient(e.target.value)}
                style={{width:"100%",padding:"9px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff"}}>
                <option value="">Choose client...</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {broadcastAll && <p style={{fontSize:12,color:"#E8611A",fontWeight:500}}>Will send to all {clients.length} active clients</p>}
          </div>

          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"#57534E",marginBottom:5}}>Title *</label>
            <input value={compTitle} onChange={e=>setCompTitle(e.target.value)} placeholder="Notification title..."
              style={{width:"100%",padding:"9px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"#57534E",marginBottom:5}}>Message (optional)</label>
            <textarea value={compBody} onChange={e=>setCompBody(e.target.value)} rows={4} placeholder="Detailed message..."
              style={{width:"100%",padding:"9px 12px",border:"1px solid #E7E5E4",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",boxSizing:"border-box"}}/>
          </div>

          <button onClick={sendNotification} disabled={sending||!compTitle.trim()}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 0",background:"#E8611A",border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:sending?"not-allowed":"pointer",fontFamily:"inherit",opacity:sending||!compTitle.trim()?0.6:1}}>
            <Send size={14}/> {sending?"Sending...":broadcastAll?`Broadcast to All (${clients.length})`:"Send Notification"}
          </button>
        </div>

        {/* Notification Feed */}
        <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:14,overflow:"hidden"}}>
          {/* Filters */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid #F0EEEC",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:180}}>
              <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#A8A29E"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
                style={{width:"100%",paddingLeft:28,padding:"7px 10px 7px 28px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:12.5,fontFamily:"inherit",outline:"none"}}/>
            </div>
            <select value={selClient} onChange={e=>setSelClient(e.target.value)}
              style={{padding:"7px 10px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:12.5,fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
              <option value="all">All Clients</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={selType} onChange={e=>setSelType(e.target.value)}
              style={{padding:"7px 10px",border:"1px solid #E7E5E4",borderRadius:7,fontSize:12.5,fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
              <option value="all">All Types</option>
              {NOTIF_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
            </select>
            <p style={{fontSize:12,color:"#A8A29E",whiteSpace:"nowrap"}}>{filtered.length} items</p>
          </div>

          {loading ? (
            <div style={{padding:"48px 0",textAlign:"center",color:"#A8A29E",fontSize:13}}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{padding:"48px 0",textAlign:"center",color:"#A8A29E",fontSize:13}}>No notifications found</div>
          ) : (
            <div style={{maxHeight:600,overflowY:"auto"}}>
              {filtered.map(n=>{
                const meta = NOTIF_META[n.type]??NOTIF_META.system;
                return (
                  <div key={n.id} style={{padding:"12px 16px",borderBottom:"1px solid #F5F4F0",display:"flex",alignItems:"flex-start",gap:10,background:n.is_read?"#fff":"#FFFBEB"}}>
                    <div style={{width:34,height:34,borderRadius:8,background:meta.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{meta.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
                        <p style={{fontSize:12.5,fontWeight:600,color:"#1C1917"}}>{n.title}</p>
                        <span style={{fontSize:10,padding:"1px 5px",borderRadius:5,background:meta.bg,color:meta.color,fontWeight:600}}>{n.type.replace(/_/g," ")}</span>
                        <span style={{fontSize:11,color:"#A8A29E",background:"#F5F4F0",padding:"1px 6px",borderRadius:5}}>{n.clients?.name||"—"}</span>
                        {!n.is_read&&<span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",display:"inline-block"}}/>}
                      </div>
                      {n.body&&<p style={{fontSize:12,color:"#78716C",lineHeight:1.5}}>{n.body}</p>}
                      <p style={{fontSize:11,color:"#A8A29E",marginTop:3}}>{fmtDate(n.created_at)}</p>
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      {!n.is_read&&(
                        <button onClick={()=>markRead(n.id)} title="Mark read"
                          style={{background:"transparent",border:"none",cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}
                          onMouseEnter={e=>(e.currentTarget.style.background="#DCFCE7")}
                          onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                          <Check size={13} color="#16A34A"/>
                        </button>
                      )}
                      <button onClick={()=>deleteNotif(n.id)} title="Delete"
                        style={{background:"transparent",border:"none",cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}
                        onMouseEnter={e=>(e.currentTarget.style.background="#FEE2E2")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <Trash2 size={13} color="#EF4444"/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

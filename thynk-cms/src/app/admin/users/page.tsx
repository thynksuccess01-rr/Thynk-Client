"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, X, Key, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [modal, setModal] = useState<"create"|"password"|null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [form, setForm] = useState({ email:"",full_name:"",role:"client",client_id:"",password:"" });
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function load() {
    const [u, c] = await Promise.all([
      supabase.from("profiles").select("*,clients(name)").order("created_at",{ascending:false}),
      supabase.from("clients").select("id,name").order("name"),
    ]);
    setUsers(u.data??[]); setClients(c.data??[]);
  }
  useEffect(()=>{load();},[]);

  async function createUser() {
    setSaving(true);
    const res = await fetch("/api/admin/users/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const data = await res.json();
    if(!res.ok) toast.error(data.error??"Failed");
    else { toast.success("User created"); setModal(null); load(); }
    setSaving(false);
  }

  async function setPassword() {
    if(!newPassword||newPassword.length<8){toast.error("Min 8 characters");return;}
    setSaving(true);
    const res = await fetch("/api/admin/users/set-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:selectedUser.id,password:newPassword})});
    const data = await res.json();
    if(!res.ok) toast.error(data.error??"Failed");
    else { toast.success("Password updated"); setModal(null); setNewPassword(""); }
    setSaving(false);
  }

  async function deleteUser(id:string) {
    if(!confirm("Delete this user?")) return;
    const res = await fetch(`/api/admin/users/delete?id=${id}`,{method:"DELETE"});
    if(res.ok){toast.success("Deleted");load();} else toast.error("Failed");
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:600,color:"#1C1917",fontFamily:"Fraunces,Georgia,serif"}}>Users</h1>
          <p style={{fontSize:13,color:"#78716C",marginTop:3}}>Manage admin and client portal logins</p>
        </div>
        <button onClick={()=>{setForm({email:"",full_name:"",role:"client",client_id:"",password:""});setModal("create");}} className="btn-primary">
          <Plus size={15}/> Create User
        </button>
      </div>

      <div style={{background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
          <thead>
            <tr style={{background:"#FAFAF9",borderBottom:"1px solid #E7E5E4"}}>
              {["User","Email","Role","Client","Created","Actions"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"10px 16px",fontSize:12,fontWeight:500,color:"#A8A29E"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length===0?<tr><td colSpan={6} style={{textAlign:"center",padding:"48px 0",fontSize:13,color:"#A8A29E"}}>No users yet.</td></tr>
            :users.map(u=>(
              <tr key={u.id} style={{borderBottom:"1px solid #FAFAF9"}}>
                <td style={{padding:"11px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:u.role==="admin"?"#1C1917":"#FFF7ED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:u.role==="admin"?"#F5F4F0":"#E8611A"}}>
                      {(u.full_name??u.email??"?").charAt(0).toUpperCase()}
                    </div>
                    <span style={{fontWeight:500,color:"#1C1917"}}>{u.full_name??"—"}</span>
                  </div>
                </td>
                <td style={{padding:"11px 16px",color:"#57534E",fontSize:12.5}}>{u.email}</td>
                <td style={{padding:"11px 16px"}}>
                  <span style={{padding:"2px 8px",borderRadius:10,fontSize:11.5,fontWeight:600,background:u.role==="admin"?"#1C1917":"#FFF7ED",color:u.role==="admin"?"#F5F4F0":"#E8611A"}}>
                    {u.role==="admin"?"Admin":"Client"}
                  </span>
                </td>
                <td style={{padding:"11px 16px",color:"#78716C",fontSize:12.5}}>{u.clients?.name??"—"}</td>
                <td style={{padding:"11px 16px",fontSize:12,color:"#A8A29E"}}>{new Date(u.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</td>
                <td style={{padding:"11px 16px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setSelectedUser(u);setNewPassword("");setModal("password");}}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:6,cursor:"pointer",fontSize:12,color:"#2563EB",fontFamily:"inherit"}}>
                      <Key size={12}/> Password
                    </button>
                    <button onClick={()=>deleteUser(u.id)}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:6,cursor:"pointer",fontSize:12,color:"#B91C1C",fontFamily:"inherit"}}>
                      <Trash2 size={12}/> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {modal==="create"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderBottom:"1px solid #F5F4F0"}}>
              <h2 style={{fontSize:16,fontWeight:600,color:"#1C1917"}}>Create User</h2>
              <button onClick={()=>setModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",padding:4}}><X size={18} color="#78716C"/></button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"#57534E",marginBottom:5}}>Full Name</label><input className="input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="John Doe"/></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"#57534E",marginBottom:5}}>Email *</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="user@example.com"/></div>
              <div style={{position:"relative"}}>
                <label style={{display:"block",fontSize:12,fontWeight:500,color:"#57534E",marginBottom:5}}>Password *</label>
                <input className="input" type={showPwd?"text":"password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 8 characters" style={{paddingRight:36}}/>
                <button onClick={()=>setShowPwd(!showPwd)} style={{position:"absolute",right:10,top:28,background:"transparent",border:"none",cursor:"pointer",padding:2}}>
                  {showPwd?<EyeOff size={15} color="#A8A29E"/>:<Eye size={15} color="#A8A29E"/>}
                </button>
              </div>
              <div><label style={{display:"block",fontSize:12,fontWeight:500,color:"#57534E",marginBottom:5}}>Role</label>
                <select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                  <option value="client">Client</option><option value="admin">Admin</option>
                </select>
              </div>
              {form.role==="client"&&<div><label style={{display:"block",fontSize:12,fontWeight:500,color:"#57534E",marginBottom:5}}>Link to Client</label>
                <select className="input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">Select client...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",padding:"14px 20px",borderTop:"1px solid #F5F4F0"}}>
              <button onClick={()=>setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={createUser} disabled={saving||!form.email||!form.password} className="btn-primary">{saving?"Creating...":"Create User"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {modal==="password"&&selectedUser&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderBottom:"1px solid #F5F4F0"}}>
              <div>
                <h2 style={{fontSize:16,fontWeight:600,color:"#1C1917"}}>Set Password</h2>
                <p style={{fontSize:12.5,color:"#78716C",marginTop:2}}>{selectedUser.email}</p>
              </div>
              <button onClick={()=>setModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",padding:4}}><X size={18} color="#78716C"/></button>
            </div>
            <div style={{padding:20}}>
              <label style={{display:"block",fontSize:12,fontWeight:500,color:"#57534E",marginBottom:5}}>New Password</label>
              <div style={{position:"relative"}}>
                <input className="input" type={showPwd?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min 8 characters" style={{paddingRight:36}}/>
                <button onClick={()=>setShowPwd(!showPwd)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer"}}>
                  {showPwd?<EyeOff size={15} color="#A8A29E"/>:<Eye size={15} color="#A8A29E"/>}
                </button>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",padding:"14px 20px",borderTop:"1px solid #F5F4F0"}}>
              <button onClick={()=>setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={setPassword} disabled={saving||!newPassword} className="btn-primary">{saving?"Saving...":"Set Password"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

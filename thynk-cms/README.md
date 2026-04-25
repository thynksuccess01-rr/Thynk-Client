# Thynk CMS — Client Management Platform

Full-stack client management system for Thynk Success Agency.
Built with Next.js 14, Supabase, Tailwind CSS — all free tools.

## Quick Setup

### 1. Install
```bash
npm install
```

### 2. Supabase Setup
1. Create project at supabase.com (free)
2. Run `supabase/schema.sql` in SQL Editor
3. Copy URL + anon key + service role key

### 3. Environment
```bash
cp .env.example .env.local
# Fill in your Supabase credentials
```

### 4. Create First Admin
In Supabase → Authentication → Add User, then:
```sql
INSERT INTO public.profiles (id, email, role, full_name)
VALUES ('<user-uuid>', 'admin@thynk.com', 'admin', 'Admin Name');
```

### 5. Run
```bash
npm run dev
```

## Deploy to Vercel
Push to GitHub → Import in Vercel → Add env vars → Deploy.

## Features
- Admin: Dashboard, Clients, Products, Mappings, Data Panel (Email/WhatsApp/Calls/Leads), Users, Theme Controller
- Portal: SaaS Dashboard, Leads, Working Status
- Per-client branding (colors, fonts, logo)
- Auto-create client logins on client creation
- Row Level Security on all tables

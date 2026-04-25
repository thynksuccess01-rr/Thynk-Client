import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "#FDFAF5" }}>
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

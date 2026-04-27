import Sidebar from "@/components/admin/Sidebar";
import ThemeLoader from "@/components/admin/ThemeLoader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg, #F5F4F0)" }}>
      <ThemeLoader />
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

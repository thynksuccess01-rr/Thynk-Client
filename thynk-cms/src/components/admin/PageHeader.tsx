interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1C1917", fontFamily: "Fraunces, Georgia, serif" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13.5, color: "#78716C", marginTop: 3 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

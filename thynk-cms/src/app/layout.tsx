import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Thynk CMS — Client Management",
  description: "Client management platform for Thynk Success Agency",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#2C1A0F", color: "#FAF4E8", borderRadius: "12px", fontSize: "14px" },
            success: { iconTheme: { primary: "#D4A843", secondary: "#2C1A0F" } },
          }}
        />
      </body>
    </html>
  );
}

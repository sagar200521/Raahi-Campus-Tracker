import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Raahi — Your campus. Connected.",
  description:
    "Campus rides, fleet operations and security incident management at IIT Roorkee. Interactive project demonstration.",
  icons: { icon: "/assets/raahi-icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTrip Planner",
  description: "Road-trip planning with live route and traffic data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

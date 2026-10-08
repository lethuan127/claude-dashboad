import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Dashboard",
  description: "Local dashboard of Claude Code usage from ~/.claude logs",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

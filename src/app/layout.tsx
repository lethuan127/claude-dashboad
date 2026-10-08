import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Dashboard",
  description: "Local dashboard of Claude Code usage from ~/.claude logs",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/">Overview</Link>
          <Link href="/projects">Projects</Link>
        </nav>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}

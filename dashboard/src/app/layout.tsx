import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow.ai Dashboard",
  description:
    "Orchestrate Jira and GitHub flows with AI-driven planning and delivery.",
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


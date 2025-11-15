"use client";

import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { SectionHeader } from "@/components/SectionHeader";
import { workspaceSectionMap } from "@/lib/workspace";

const section = workspaceSectionMap["/dashboard"];

export default function DashboardPage() {
  return (
    <>
      <SectionHeader
        tag={section.tag}
        title={section.title}
        description={section.description}
      />
      <PlaceholderPanel
        sectionId={section.id}
        title="Signals timeline coming soon"
        description="We are building a macro view that blends Jira metrics, AI chat iterations, and GitHub throughput for hackathon squads."
      />
    </>
  );
}


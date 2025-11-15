"use client";

import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { SectionHeader } from "@/components/SectionHeader";
import { workspaceSectionMap } from "@/lib/workspace";

const section = workspaceSectionMap["/projects"];

export default function ProjectsPage() {
  return (
    <>
      <SectionHeader
        tag={section.tag}
        title={section.title}
        description={section.description}
      />
      <PlaceholderPanel
        sectionId={section.id}
        title="Project capsules under construction"
        description="Soon you will track Jira cards, MCP transcripts, and Copilot branches per initiative from a single view."
      />
    </>
  );
}


"use client";

import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { SectionHeader } from "@/components/SectionHeader";
import { workspaceSectionMap } from "@/lib/workspace";

const section = workspaceSectionMap["/library"];

export default function LibraryPage() {
  return (
    <>
      <SectionHeader
        tag={section.tag}
        title={section.title}
        description={section.description}
      />
      <PlaceholderPanel
        sectionId={section.id}
        title="Knowledge base coming online"
        description="We will surface reusable prompts, Jira specs, and MCP evaluation templates so each squad can start faster."
      />
    </>
  );
}


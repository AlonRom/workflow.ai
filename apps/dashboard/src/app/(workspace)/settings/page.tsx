"use client";

import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { SectionHeader } from "@/components/SectionHeader";
import { workspaceSectionMap } from "@/lib/workspace";

const section = workspaceSectionMap["/settings"];

export default function SettingsPage() {
  return (
    <>
      <SectionHeader
        tag={section.tag}
        title={section.title}
        description={section.description}
      />
      <PlaceholderPanel
        sectionId={section.id}
        title="Control center coming soon"
        description="Soon you'll adjust Jira project mappings, GitHub repos, MCP toolchains, and AI guardrails from here."
      />
    </>
  );
}


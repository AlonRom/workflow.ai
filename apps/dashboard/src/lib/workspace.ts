import {
  Bookmark,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspacePath =
  | "/dashboard"
  | "/insights"
  | "/workflow"
  | "/projects"
  | "/library"
  | "/settings";

export type WorkspaceSection = {
  id: string;
  label: string;
  path: WorkspacePath;
  icon: LucideIcon;
  tag: string;
  title: string;
  description: string;
};

export const workspaceSections: WorkspaceSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    tag: "Executive signal board",
    title: "Workflow HQ",
    description:
      "Track idea funnel health, Jira throughput, and AI refinement sessions at a glance.",
  },
  {
    id: "insights",
    label: "Insights",
    path: "/insights",
    icon: Star,
    tag: "Insights",
    title: "Insights",
    description:
      "Turn any natural language question into Jira-powered insights surfaced via the mock MCP.",
  },
  {
    id: "workflow",
    label: "Workflow",
    path: "/workflow",
    icon: MessageSquare,
    tag: "Workflow",
    title: "WorkItem",
    description:
      "Iterate on requirements with an AI partner before handing them to Jira or GitHub.",
  },
  {
    id: "projects",
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
    tag: "Projects",
    title: "Project Capsules",
    description:
      "Manage ongoing build streams, attach MCP transcripts, and plan Jira launches.",
  },
  {
    id: "library",
    label: "Library",
    path: "/library",
    icon: Bookmark,
    tag: "Library",
    title: "Knowledge Library",
    description:
      "Browse past refinements, prompts, and evaluations to accelerate new initiatives.",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    tag: "Settings",
    title: "Control Center",
    description:
      "Configure Jira spaces, GitHub repos, MCP tools, and AI guardrails.",
  },
];

export const workspaceSectionMap = workspaceSections.reduce<
  Record<string, WorkspaceSection>
>((acc, section) => {
  acc[section.path] = section;
  return acc;
}, {});


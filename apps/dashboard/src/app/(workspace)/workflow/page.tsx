"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { workspaceSectionMap } from "@/lib/workspace";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

const section = workspaceSectionMap["/workflow"];

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Welcome! Describe the feature you’d like refined before we ship it to Jira.",
    timestamp: "09:00",
  },
  {
    id: "2",
    role: "user",
    content:
      "Need a workflow so hackathon squads can chat through acceptance criteria before filing issues.",
    timestamp: "09:01",
  },
  {
    id: "3",
    role: "assistant",
    content:
      "Great. Let’s iterate on the story until it’s ready. What outcome or metric proves success?",
    timestamp: "09:02",
  },
];

const headerDescription =
  "Co-write and execute the Jira work item with AI. Capture context, constraints, and acceptance criteria before handing off.";

type WorkItemTemplate = {
  label: string;
  titleLabel: string;
  descriptionLabel: string;
  listLabel: string;
  title: string;
  description: string;
  acceptance: string[];
};

const workItemTemplates: Record<string, WorkItemTemplate> = {
  story: {
    label: "User Story",
    titleLabel: "Story Title",
    descriptionLabel: "Narrative",
    listLabel: "Acceptance Criteria",
    title: "Workflow AI refinement lane",
    description:
      "As a hackathon squad lead, I want a chat-first workspace so we can evolve requirements with AI before pushing a Jira card.",
    acceptance: [
      "Given a squad inputs an initiative, when the AI session finishes, then a structured story (title, description, AC) is generated.",
      "Given acceptance criteria are approved, when Create in Jira runs, then the issue is created with transcript links.",
      "Given the Jira issue exists, when Copilot is triggered, then branch context references the generated acceptance criteria.",
    ],
  },
  feature: {
    label: "Feature",
    titleLabel: "Feature Title",
    descriptionLabel: "Business Outcome",
    listLabel: "Success Criteria",
    title: "AI-assisted Jira intake",
    description:
      "Deliver a guided workflow where hackathon squads can author Jira-ready specs with AI moderation.",
    acceptance: [
      "Feature toggles can be rolled out per squad with audit logs.",
      "Exports link the AI transcript to the Jira issue for compliance.",
      "Copilot branches inherit the generated specs automatically.",
    ],
  },
  epic: {
    label: "Epic",
    titleLabel: "Epic Title",
    descriptionLabel: "Epic Narrative",
    listLabel: "Milestone Checks",
    title: "Workflow AI program rollout",
    description:
      "As the platform team, we want every hackathon squad to plan AI-to-Jira-to-GitHub handoffs within a single workspace.",
    acceptance: [
      "Week 1: 5 pilot squads use the workspace end-to-end.",
      "Week 3: Jira issues link to AI transcripts with metrics dashboards live.",
      "Week 4: Copilot branches deployed with smoke tests passing.",
    ],
  },
  bug: {
    label: "Bug",
    titleLabel: "Bug Title",
    descriptionLabel: "Reproduction / Impact",
    listLabel: "Fix Verification",
    title: "[BUG] Jira sync fails for multi-project payloads",
    description:
      "Steps: 1) Capture idea 2) Include multiple Jira projects 3) Click Create in Jira → error 500. Impact: blocks cross-squad refinement.",
    acceptance: [
      "Multi-project payload creates issues without error.",
      "Error states display actionable guidance.",
      "Regression tests cover multiple project IDs.",
    ],
  },
  issue: {
    label: "Issue",
    titleLabel: "Work Item Title",
    descriptionLabel: "Details",
    listLabel: "Definition of Done",
    title: "Capture observability for AI sessions",
    description:
      "Add logging + dashboards so we track AI session latency, quality, and Jira success rates.",
    acceptance: [
      "Logs include session ID, tool usage, and duration.",
      "Dashboard exposes latency + success KPIs.",
      "Alerts fire if Create in Jira fails twice consecutively.",
    ],
  },
};

type WorkItemType = keyof typeof workItemTemplates;

export default function WorkflowPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [workItemType, setWorkItemType] = useState<WorkItemType>("story");
  const [workItem, setWorkItem] = useState<WorkItemTemplate>({
    ...workItemTemplates.story,
    acceptance: [...workItemTemplates.story.acceptance],
  });
  const [chatWidthPct, setChatWidthPct] = useState(64);
  const [resizing, setResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [jiraState, setJiraState] = useState<
    | { status: "idle" }
    | { status: "creating" }
    | { status: "success"; key: string; url: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const summary = useMemo(
    () => ({
      goal: `Run AI conversations until the ${workItemTemplates[workItemType].label.toLowerCase()} captures value, scope, and acceptance tests before Jira sync.`,
      readiness: 72,
      blockers: ["Need metric definition", "Need rollout guardrail"],
    }),
    [workItemType],
  );

  const sendMessage = () => {
    if (!draft.trim()) return;
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: draft.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setDraft("");
    setIsReplying(true);

    // Create a placeholder assistant message to append deltas
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      },
    ]);

    fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workItemType,
        messages: [...messages, newMessage],
      }),
    })
      .then(async (res) => {
        if (!res.body) throw new Error("No stream");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            if (!part.startsWith("data:")) continue;
            const payload = part.slice(5).trim();
            try {
              const evt = JSON.parse(payload) as
                | { type: "delta"; delta: string }
                | { type: "done" };
              if (evt.type === "delta") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: (m.content || "") + evt.delta }
                      : m,
                  ),
                );
              }
            } catch {
              // ignore bad chunks
            }
          }
        }
      })
      .catch(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Something went wrong while replying. Try again in a few seconds.",
                }
              : m,
          ),
        );
      })
      .finally(() => setIsReplying(false));
  };

  const handleTypeChange = (type: WorkItemType) => {
    setWorkItemType(type);
    setWorkItem({
      ...workItemTemplates[type],
      acceptance: [...workItemTemplates[type].acceptance],
    });
  };

  const createJiraIssue = async () => {
    if (jiraState.status === "creating") return;
    setJiraState({ status: "creating" });
    try {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workItemType,
          title: workItem.title,
          description: workItem.description,
          acceptance: workItem.acceptance,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create issue");
      }
      const data = (await res.json()) as { key: string; url: string };
      setJiraState({ status: "success", ...data });
    } catch (error) {
      setJiraState({
        status: "error",
        message: "Unable to create Jira issue. Try again soon.",
      });
    }
  };

  useEffect(() => {
    if (!resizing) return;
    const handle = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const { left, width } = containerRef.current.getBoundingClientRect();
      const x = event.clientX - left;
      const pct = Math.min(85, Math.max(45, (x / width) * 100));
      setChatWidthPct(pct);
    };
    const stop = () => setResizing(false);
    window.addEventListener("mousemove", handle);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handle);
      window.removeEventListener("mouseup", stop);
    };
  }, [resizing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col gap-8 overflow-hidden min-h-0">
      <SectionHeader
        tag={section.tag}
        title={section.title}
        description={headerDescription}
      />

      <div
        ref={containerRef}
        className="flex flex-1 gap-4 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        <section
          className="glass-panel flex h-full flex-col overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0"
          style={{ flexBasis: `${chatWidthPct}%` }}
        >
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Workflow channel
              </p>
              <h3 className="text-lg font-semibold text-white">
                Refine First
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(workItemTemplates).map(([type, template]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type as WorkItemType)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                    workItemType === type
                      ? "bg-white/80 text-slate-900 shadow-lg shadow-purple-500/30"
                      : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </header>

          <div className="chat-scroll flex-1 min-h-0 space-y-6 overflow-y-auto px-6 py-6">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            className="border-t border-white/10 px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isReplying) {
                sendMessage();
              }
            }}
          >
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 shadow-inner shadow-black/20">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask follow-ups, refine scope, set acceptance tests..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isReplying}
                className="rounded-full bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isReplying ? "Waiting..." : "Send"}
              </button>
            </div>
          </form>
        </section>

        <div
          className="hidden cursor-col-resize items-center justify-center px-2 lg:flex"
          onMouseDown={() => setResizing(true)}
        >
          <div
            className={`h-48 w-[3px] rounded-full bg-gradient-to-b from-white/50 via-white/20 to-transparent shadow-[0_0_20px_rgba(176,137,255,0.6)] transition duration-200 ${
              resizing ? "opacity-90" : "opacity-60 hover:opacity-90"
            }`}
          />
        </div>

        <aside
          className="glass-panel flex flex-col rounded-[32px] border border-white/10 bg-white/5 p-6"
          style={{ flexBasis: `${100 - chatWidthPct}%` }}
        >
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            {workItemTemplates[workItemType].label} outcome
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Ready for Jira?
          </h3>
          <p className="mt-2 text-sm text-white/70">{summary.goal}</p>

          <form className="mt-6 flex flex-1 flex-col space-y-5">
            <label className="flex flex-col gap-2 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                {workItemTemplates[workItemType].titleLabel}
              </span>
              <input
                value={workItem.title}
                onChange={(event) =>
                  setWorkItem((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                {workItemTemplates[workItemType].descriptionLabel}
              </span>
              <textarea
                value={workItem.description}
                onChange={(event) =>
                  setWorkItem((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                {workItemTemplates[workItemType].listLabel}
              </span>
              <div className="space-y-3">
                {workItem.acceptance.map((criterion, index) => (
                  <textarea
                    key={index}
                    value={criterion}
                    onChange={(event) => {
                      const next = [...workItem.acceptance];
                      next[index] = event.target.value;
                      setWorkItem((prev) => ({ ...prev, acceptance: next }));
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
                  />
                ))}
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex flex-col gap-2 pt-4">
              {jiraState.status === "success" ? (
                <a
                  href={jiraState.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs uppercase tracking-[0.3em] text-green-200"
                >
                  {workItemTemplates[workItemType].label}: {workItem.title} created →
                </a>
              ) : null}
              {jiraState.status === "error" ? (
                <p className="text-xs text-red-300">{jiraState.message}</p>
              ) : null}
              <button
                type="button"
                onClick={createJiraIssue}
                disabled={jiraState.status === "creating"}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {jiraState.status === "creating"
                  ? "Creating..."
                  : `Create ${workItemTemplates[workItemType].label} in Jira`}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  const avatar = isAssistant
    ? {
        src: "/chat-assistant.svg",
        alt: "Workflow assistant",
        name: "Assistant",
      }
    : {
        src: "/profile.jpeg",
        alt: "Alon Rom",
        name: "Alon Rom",
      };

  const baseWrapper =
    "relative h-14 w-14 overflow-hidden rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)]";
  const wrapperClass = isAssistant
    ? `${baseWrapper} bg-white shadow-[0_8px_24px_rgba(6,182,212,0.35)]`
    : `${baseWrapper} border border-white/20 bg-white/5`;

  return (
    <article
      className={`flex items-start gap-4 ${
        isAssistant ? "flex-row" : "flex-row-reverse"
      }`}
    >
      <div className="flex w-20 flex-col items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-white/60">
        <div className={wrapperClass}>
          <Image
            src={avatar.src}
            alt={avatar.alt}
            fill
            sizes="56px"
            className={isAssistant ? "object-contain p-2" : "object-cover"}
            priority={false}
          />
        </div>
        <span className="text-center leading-tight">{avatar.name}</span>
      </div>
      <div
        className={`flex max-w-[70%] flex-col gap-2 ${
          isAssistant ? "items-start" : "items-end"
        }`}
      >
        <div
          className={`w-full rounded-[28px] px-5 py-4 text-sm leading-relaxed shadow-lg ${
            isAssistant
              ? "rounded-tl-none bg-white/10 text-white/80"
              : "rounded-tr-none bg-gradient-to-br from-[#c084fc] to-[#7c3aed] text-white"
          }`}
        >
          {message.content}
        </div>
        <span
          className={`text-xs uppercase tracking-wide text-white/50 ${
            isAssistant ? "text-left" : "text-right"
          }`}
        >
          {message.timestamp}
        </span>
      </div>
    </article>
  );
}


"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { workspaceSectionMap } from "@/lib/workspace";

const section = workspaceSectionMap["/insights"];

type JiraInsight = {
  id: string;
  title: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
  trend: number;
  impact: string;
  recommendations: string[];
  lastUpdated: string;
};

type JiraInsightsResponse = {
  query: string;
  generatedAt: string;
  results: JiraInsight[];
};

export default function InsightsPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<JiraInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastUpdatedLabel = useMemo(() => {
    if (!response) return "No insights yet";
    return new Date(response.generatedAt).toLocaleString();
  }, [response]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/jira/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt }),
      });

      if (!res.ok) {
        let message = "Failed to fetch Jira insights";
        try {
          const body = await res.json();
          message =
            body?.message ??
            body?.error ??
            `Jira insights failed with status ${res.status}`;
        } catch {
          // ignore JSON parsing errors
        }
        throw new Error(message);
      }

      const data = (await res.json()) as JiraInsightsResponse;
      setResponse(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach the mock Jira MCP right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">
          {section.tag}
        </p>
        <div>
          <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
            {section.title}
          </h2>
          <p className="text-base text-white/70">{section.description}</p>
        </div>
      </header>

      <section className="glass-panel rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Insights chat
            </p>
            <h3 className="text-xl font-semibold text-white">
              Ask the mock Jira MCP anything about velocity, blockers, or
              delivery signals.
            </h3>
          </div>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
            MCP connected
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 shadow-inner shadow-black/20"
        >
          <label className="text-sm uppercase tracking-[0.3em] text-white/60">
            Natural language prompt
          </label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. Where are we losing velocity in Jira and what should we fix first?"
            rows={3}
            className="w-full resize-none rounded-2xl border border-white/5 bg-transparent px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/50">
              Responses are generated locally to mimic a Jira MCP tool.
            </p>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4" />
                  Send
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="glass-panel flex flex-col gap-4 rounded-[32px] border border-white/10 bg-white/5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Insight stream
            </p>
            <h3 className="text-2xl font-semibold text-white">
              {response ? "Latest Jira intelligence" : "Awaiting your question"}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Last sync
            </p>
            <p className="text-sm text-white/80">{lastUpdatedLabel}</p>
          </div>
        </header>

        {error ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {!response && !error ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
            Ask a natural-language question above to populate mock Jira
            insights powered by the local MCP simulator.
          </p>
        ) : null}

        {response ? (
          <div className="grid gap-4 md:grid-cols-2">
            {response.results.map((insight) => (
              <article
                key={insight.id}
                className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-white/0 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      {insight.metricLabel}
                    </p>
                    <p className="text-3xl font-semibold text-white">
                      {insight.metricValue}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                      insight.trend >= 0
                        ? "bg-emerald-500/10 text-emerald-200"
                        : "bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {insight.trend >= 0 ? "+" : ""}
                    {insight.trend}%
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-white/70">{insight.summary}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Impact
                  </p>
                  <p className="text-sm text-white/80">{insight.impact}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Recommendations
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-white/80">
                    {insight.recommendations.map((recommendation, index) => (
                      <li
                        key={index}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                      >
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Updated {new Date(insight.lastUpdated).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}



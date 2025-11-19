type MockInsight = {
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

const BASE_INSIGHTS: MockInsight[] = [
  {
    id: "velocity",
    title: "Velocity dipped week over week",
    summary:
      "Closed story points fell 18% after redirecting senior engineers to support.",
    metricLabel: "Velocity (pts)",
    metricValue: "41",
    trend: -18,
    impact:
      "Release runway is tightening; Insights beta could slip without a staffing boost.",
    recommendations: [
      "Rebalance support rotation so only one squad is impacted.",
      "Escalate blockers older than 4 days to the triage channel.",
      "Fast-track automation ideas surfaced last sprint.",
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "blockers",
    title: "Blocked issues cluster in Insights revamp",
    summary:
      "Seven tickets share the same missing design artifact dependency.",
    metricLabel: "Blocked issues",
    metricValue: "7",
    trend: -32,
    impact:
      "Shared dependencies are idling ~60 story points until design exports land.",
    recommendations: [
      "Promote the design artifact task to a standalone Jira issue with a 24h SLA.",
      "Link relevant MCP transcripts to each blocked ticket for context.",
      "Assign a single DRI to unblock across squads.",
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "backlog",
    title: "Backlog growth in Workflow channel",
    summary:
      "Open scope grew 23% as beta feedback rolled in faster than grooming sessions.",
    metricLabel: "Open items",
    metricValue: "38",
    trend: 23,
    impact:
      "Signal-to-noise ratio will suffer if we don’t cluster new asks behind priorities.",
    recommendations: [
      "Tag new requests with `insights-beta` and triage every morning.",
      "Convert high-signal asks into MCP-backed playbooks before sprint planning.",
      "Archive duplicate cards so exec summaries stay clean.",
    ],
    lastUpdated: new Date().toISOString(),
  },
];

const KEYWORD_MAP: Record<string, string[]> = {
  velocity: ["velocity", "throughput", "speed"],
  blockers: ["block", "impediment", "stuck", "risk"],
  backlog: ["backlog", "scope", "priority", "roadmap"],
};

export class MockJiraMcp {
  fetchInsights(query: string): MockInsight[] {
    const normalized = query.toLowerCase();
    const selected = new Set<MockInsight>();

    for (const [key, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some((word) => normalized.includes(word))) {
        const insight = BASE_INSIGHTS.find((item) => item.id === key);
        if (insight) selected.add(this.cloneInsight(insight));
      }
    }

    if (selected.size === 0) {
      BASE_INSIGHTS.slice(0, 2).forEach((insight) =>
        selected.add(this.cloneInsight(insight)),
      );
    }

    return Array.from(selected).map((insight, index) => ({
      ...insight,
      id: `${insight.id}-${index}`,
      lastUpdated: new Date().toISOString(),
    }));
  }

  private cloneInsight(insight: MockInsight): MockInsight {
    return {
      ...insight,
      recommendations: [...insight.recommendations],
    };
  }
}



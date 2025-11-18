import type { Env } from "../../config";

export class ConfluenceService {
  constructor(private readonly env: Env) {}

  private get authHeader() {
    // Use Confluence credentials if available, otherwise fall back to Jira credentials
    const email = this.env.CONFLUENCE_EMAIL || this.env.JIRA_EMAIL;
    const token = this.env.CONFLUENCE_API_TOKEN || this.env.JIRA_API_TOKEN;
    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    return `Basic ${auth}`;
  }

  private get baseUrl() {
    return this.env.CONFLUENCE_BASE_URL || this.env.JIRA_BASE_URL.replace("/jira", "");
  }

  /**
   * Converts wiki markup to Confluence Storage Format (the format Confluence API expects)
   */
  private wikiMarkupToStorageFormat(wikiMarkup: string): any {
    // For now, we'll send wiki markup and let Confluence convert it
    // Or we can use the storage format. Let's use storage format for better control
    
    // Split content into sections based on headings
    const lines = wikiMarkup.split("\n");
    const content: any[] = [];
    let currentParagraph: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Heading detection
      if (trimmed.startsWith("h1.")) {
        if (currentParagraph.length > 0) {
          content.push({
            type: "paragraph",
            content: [{ type: "text", text: currentParagraph.join(" ") }],
          });
          currentParagraph = [];
        }
        content.push({
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: trimmed.substring(3).trim() }],
        });
      } else if (trimmed.startsWith("h2.")) {
        if (currentParagraph.length > 0) {
          content.push({
            type: "paragraph",
            content: [{ type: "text", text: currentParagraph.join(" ") }],
          });
          currentParagraph = [];
        }
        content.push({
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: trimmed.substring(3).trim() }],
        });
      } else if (trimmed.startsWith("h3.")) {
        if (currentParagraph.length > 0) {
          content.push({
            type: "paragraph",
            content: [{ type: "text", text: currentParagraph.join(" ") }],
          });
          currentParagraph = [];
        }
        content.push({
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: trimmed.substring(3).trim() }],
        });
      } else if (trimmed.startsWith("* ") || trimmed.match(/^\d+\./)) {
        // Bullet or numbered list
        if (currentParagraph.length > 0) {
          content.push({
            type: "paragraph",
            content: [{ type: "text", text: currentParagraph.join(" ") }],
          });
          currentParagraph = [];
        }
        // Simple list item - in a real implementation, we'd group list items
        const listText = trimmed.replace(/^[*\d+.]\s*/, "");
        content.push({
          type: "paragraph",
          content: [{ type: "text", text: `• ${listText}` }],
        });
      } else if (trimmed === "" && currentParagraph.length > 0) {
        // Empty line - flush current paragraph
        content.push({
          type: "paragraph",
          content: [{ type: "text", text: currentParagraph.join(" ") }],
        });
        currentParagraph = [];
      } else if (trimmed.startsWith("{code")) {
        // Code block - simple implementation
        if (currentParagraph.length > 0) {
          content.push({
            type: "paragraph",
            content: [{ type: "text", text: currentParagraph.join(" ") }],
          });
          currentParagraph = [];
        }
        // Extract code content (simplified)
        const codeContent = trimmed.replace(/^{code[^}]*}/, "").replace(/{code}$/, "");
        content.push({
          type: "codeBlock",
          attrs: { language: "text" },
          content: [{ type: "text", text: codeContent }],
        });
      } else if (trimmed.length > 0) {
        currentParagraph.push(trimmed);
      }
    }

    // Flush remaining paragraph
    if (currentParagraph.length > 0) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: currentParagraph.join(" ") }],
      });
    }

    return {
      type: "doc",
      version: 1,
      content: content.length > 0 ? content : [
        {
          type: "paragraph",
          content: [{ type: "text", text: wikiMarkup }],
        },
      ],
    };
  }

  /**
   * Creates a Confluence page with the provided content
   */
  async createPage(title: string, wikiContent: string, spaceKey?: string): Promise<{ id: string; url: string }> {
    // Determine space key - use provided, env variable, or default to user's personal space (~)
    const space = spaceKey || this.env.CONFLUENCE_SPACE_KEY || this.env.JIRA_PROJECT_KEY || "~";
    
    // Use wiki markup format - Confluence can convert it
    const body = {
      type: "page",
      title,
      space: { key: space },
      body: {
        storage: {
          value: wikiContent,
          representation: "wiki", // Use wiki representation - Confluence will convert it
        },
      },
    };

    // Ensure base URL ends correctly
    const apiUrl = this.baseUrl.endsWith('/') 
      ? `${this.baseUrl}rest/api/content`
      : `${this.baseUrl}/rest/api/content`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Confluence API error (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      id: string;
      _links: { webui: string };
    };

    // Construct full URL
    const webuiPath = data._links.webui;
    const pageUrl = webuiPath.startsWith('http') 
      ? webuiPath
      : `${this.baseUrl}${webuiPath}`;

    return {
      id: data.id,
      url: pageUrl,
    };
  }
}


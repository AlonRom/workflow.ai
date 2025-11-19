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
   * Converts wiki markup to Confluence Storage Format (HTML)
   */
  private wikiMarkupToStorageFormat(wikiMarkup: string): string {
    let html = '';
    const lines = wikiMarkup.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const tag = listType === 'ul' ? 'ul' : 'ol';
        html += `<${tag}>`;
        listItems.forEach(item => {
          html += `<li><p>${this.escapeHtml(item)}</p></li>`;
        });
        html += `</${tag}>`;
        listItems = [];
        listType = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle code blocks
      if (trimmed.startsWith('{code') || trimmed.startsWith('{noformat')) {
        flushList();
        inCodeBlock = true;
        continue;
      }
      if ((trimmed === '{code}' || trimmed === '{noformat}') && inCodeBlock) {
        html += `<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[${codeBlockContent.join('\n')}]]></ac:plain-text-body></ac:structured-macro>`;
        codeBlockContent = [];
        inCodeBlock = false;
        continue;
      }
      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle headings
      if (trimmed.startsWith('h1.')) {
        flushList();
        html += `<h1>${this.escapeHtml(trimmed.substring(3).trim())}</h1>`;
      } else if (trimmed.startsWith('h2.')) {
        flushList();
        html += `<h2>${this.escapeHtml(trimmed.substring(3).trim())}</h2>`;
      } else if (trimmed.startsWith('h3.')) {
        flushList();
        html += `<h3>${this.escapeHtml(trimmed.substring(3).trim())}</h3>`;
      } else if (trimmed.startsWith('h4.')) {
        flushList();
        html += `<h4>${this.escapeHtml(trimmed.substring(3).trim())}</h4>`;
      }
      // Handle bullet lists
      else if (trimmed.startsWith('* ')) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(trimmed.substring(2).trim());
      }
      // Handle numbered lists
      else if (trimmed.match(/^\d+\.\s/)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(trimmed.replace(/^\d+\.\s*/, ''));
      }
      // Handle paragraphs
      else if (trimmed.length > 0) {
        flushList();
        html += `<p>${this.escapeHtml(trimmed)}</p>`;
      } else {
        flushList();
      }
    }

    flushList();
    return html;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Creates a Confluence page with the provided content
   */
  async createPage(title: string, wikiContent: string, spaceKey?: string): Promise<{ id: string; url: string }> {
    // Determine space key - use provided, env variable, or default to user's personal space (~)
    const space = spaceKey || this.env.CONFLUENCE_SPACE_KEY || this.env.JIRA_PROJECT_KEY || "~";
    
    // Convert wiki markup to storage format (HTML)
    const storageContent = this.wikiMarkupToStorageFormat(wikiContent);
    
    const body = {
      type: "page",
      title,
      space: { key: space },
      body: {
        storage: {
          value: storageContent,
          representation: "storage",
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


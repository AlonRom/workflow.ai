# Copilot CLI Integration Guide

This guide explains how the workflow.ai system integrates with GitHub Copilot CLI to automatically generate code from Jira stories.

## Overview

When you create a Jira story in the dashboard, the system can automatically trigger GitHub Copilot CLI to:
- Analyze the requirements
- Generate the necessary code
- Create a pull request with the implementation

## How It Works

### 1. User Creates Jira Story
```
Title: Add multiplication functionality
Description: Implement multiply operation for calculator
Acceptance Criteria:
- Function accepts two numbers
- Returns the product
- Includes unit tests
```

### 2. Server Triggers Copilot CLI
The server executes this command:
```bash
copilot -p "In repository workflowai-hackaton/hackaton-demo-calculator: **Jira Story**: SCRUM-43

Add multiplication functionality

Implement multiply operation for calculator

**Acceptance Criteria:**
- Function accepts two numbers
- Returns the product
- Includes unit tests

Please implement this feature following existing code patterns. Create a pull request to add these changes." --allow-all-tools
```

### 3. Copilot Creates Implementation
- Copilot analyzes the repository structure
- Generates the code following existing patterns
- Runs tests to verify the implementation
- Creates a pull request automatically

## Architecture

```
┌─────────────────┐
│  Jira Story     │
│  (Dashboard)    │
└────────┬────────┘
         │
         │ POST /api/jira
         ▼
┌─────────────────────────┐
│  Dashboard API Route    │
│  /api/jira/route.ts     │
└────────┬────────────────┘
         │
         │ POST /api/copilot-cli/create-pr
         ▼
┌─────────────────────────┐
│  Server Controller      │
│  copilot-cli/           │
│  controller.ts          │
└────────┬────────────────┘
         │
         │ makeChangesAndCreatePR()
         ▼
┌─────────────────────────┐
│  Copilot CLI Service    │
│  copilot-cli/           │
│  service.ts             │
└────────┬────────────────┘
         │
         │ spawn('copilot', ['-p', prompt, '--allow-all-tools'])
         ▼
┌─────────────────────────┐
│  Copilot CLI            │
│  (VS Code Install)      │
└────────┬────────────────┘
         │
         │ Creates PR
         ▼
┌─────────────────────────┐
│  GitHub Repository      │
└─────────────────────────┘
```

## Configuration

### Automation Mode

The system supports multiple automation modes in `/apps/dashboard/src/app/api/jira/route.ts`:

```typescript
const automationMode = payload.automationMode || "copilot"; // Default
```

Available modes:
- **`copilot`** - Use Copilot CLI (requires VS Code Copilot CLI installed)
- **`dispatch`** - Use repository_dispatch (custom GitHub Actions workflow)
- **`both`** - Use both approaches
- **`none`** - Only create Jira issue

### Target Repository

Configure the target repository in the same file:

```typescript
const copilotPayload = {
  owner: "workflowai-hackaton",
  repo: "hackaton-demo-calculator",
  description: `**Jira Story**: ${jiraBody.key}...`,
  allowAllTools: true,
};
```

## Prerequisites

### 1. Copilot CLI Installation
The Copilot CLI is automatically installed by VS Code when you install the GitHub Copilot extension:
```
/Users/[username]/Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot
```

### 2. GitHub Authentication
The Copilot CLI uses your VS Code GitHub authentication. No additional setup needed.

### 3. Copilot Subscription
Requires an active GitHub Copilot subscription (Individual, Business, or Enterprise).

## Testing

### Check CLI Availability
```bash
curl http://localhost:4000/api/copilot-cli/check
```

Response when available:
```json
{
  "message": "Copilot CLI is ready to use",
  "available": true,
  "ghInstalled": true,
  "copilotInstalled": true,
  "authenticated": true
}
```

### Test Copilot CLI Directly
```bash
copilot -p "Add a hello world function to the calculator" --allow-all-tools
```

### Create Jira Story
1. Navigate to http://localhost:3000/workflow
2. Fill in the Jira story form
3. Click "Create User Story in Jira"
4. Watch the server terminal for `[COPILOT]` output logs

## API Endpoints

### POST `/api/copilot-cli/create-pr`
Trigger Copilot to create a pull request

**Request:**
```json
{
  "owner": "workflowai-hackaton",
  "repo": "hackaton-demo-calculator",
  "description": "Add multiplication functionality with tests",
  "allowAllTools": true
}
```

**Response:**
```json
{
  "success": true,
  "output": "Created pull request: https://github.com/...",
  "prUrl": "https://github.com/workflowai-hackaton/hackaton-demo-calculator/pull/123"
}
```

### GET `/api/copilot-cli/check`
Check if Copilot CLI is available

**Response:**
```json
{
  "available": true,
  "ghInstalled": true,
  "copilotInstalled": true,
  "authenticated": true
}
```

### POST `/api/copilot-cli/prompt`
Run any Copilot CLI prompt

**Request:**
```json
{
  "prompt": "Show me the last 5 git commits",
  "allowAllTools": true,
  "workingDirectory": "/path/to/repo"
}
```

## Implementation Details

### Service Layer (`copilot-cli/service.ts`)

**Key Methods:**

1. **`checkAvailability()`**
   - Verifies gh CLI is installed
   - Checks authentication status
   - Confirms copilot CLI is available

2. **`runPrompt(prompt, options)`**
   - Executes copilot CLI commands
   - Streams output to server console with `[COPILOT]` prefix
   - Supports `--allow-all-tools`, `--allow-tool`, `--deny-tool` flags

3. **`makeChangesAndCreatePR(description, repository)`**
   - Constructs full prompt with repository context
   - Executes copilot with auto-approval
   - Extracts PR URL from output

### Controller Layer (`copilot-cli/controller.ts`)

**Endpoints:**

1. **GET `/api/copilot-cli/check`**
   - Returns CLI availability status
   - Provides setup instructions if not available

2. **POST `/api/copilot-cli/prompt`**
   - Generic prompt execution
   - Validates input with Zod schema

3. **POST `/api/copilot-cli/create-pr`**
   - Specialized PR creation endpoint
   - Accepts `owner`, `repo`, `description`
   - Builds repository context automatically

## Monitoring

The server logs all Copilot CLI output in real-time:

```
[COPILOT] I'll help you implement the multiplication feature...
[COPILOT] $ git checkout -b feature/add-multiplication
[COPILOT] Creating src/multiply.js...
[COPILOT] Creating tests/multiply.test.js...
[COPILOT] $ npm test
[COPILOT] ✓ All tests passing
[COPILOT] $ git commit -m "Add multiplication functionality"
[COPILOT] $ gh pr create --title "Add multiplication" --body "..."
[COPILOT] Created pull request #123
```

## Troubleshooting

### "Copilot CLI not available"
**Solution:** Install VS Code GitHub Copilot extension, which includes the CLI

### "Permission denied"
**Solution:** Copilot needs approval for file operations. Use `--allow-all-tools` flag

### "Command exited with code 127"
**Solution:** Copilot CLI not in PATH. Check installation:
```bash
ls -la ~/Library/Application\ Support/Code/User/globalStorage/github.copilot-chat/copilotCli/
```

### No output in terminal
**Solution:** Check server logs - output streams with `[COPILOT]` prefix

## Security Considerations

### Tool Permissions
By default, requests use `--allow-all-tools` to enable autonomous operation. To restrict:

```typescript
const result = await copilotCLI.runPrompt(prompt, {
  allowTools: ['shell(git)', 'write'], // Only allow git and file writing
  denyTools: ['shell(rm)', 'shell(curl)'], // Deny destructive/network commands
});
```

### Repository Access
Copilot inherits your GitHub authentication and can only access repositories you have access to.

### Local File System
Copilot runs with the same permissions as the Node.js server process. Ensure the server runs with appropriate user permissions.

## Comparison with Other Approaches

| Feature | Copilot CLI | GraphQL API | repository_dispatch |
|---------|------------|-------------|---------------------|
| Setup Complexity | Low (VS Code extension) | Medium (personal token) | High (GitHub App) |
| EMU Compatible | ✅ Yes | ❌ No (blocked) | ✅ Yes |
| Autonomous Coding | ✅ Yes | ✅ Yes | ❌ No (custom code) |
| Real-time Output | ✅ Yes | ❌ No | ❌ No |
| Local Development | ✅ Yes | ✅ Yes | ✅ Yes |
| Custom Workflows | ❌ No | ❌ No | ✅ Yes |

## Best Practices

1. **Clear Requirements**: Provide detailed acceptance criteria in Jira stories
2. **Repository Context**: Always specify the target repository in prompts
3. **Monitor Output**: Watch server logs for Copilot's progress
4. **Review PRs**: Always review Copilot-generated code before merging
5. **Incremental Tasks**: Break large features into smaller, focused stories

## Example Workflow

### 1. Create Jira Story
```
Title: Add division functionality
Description: Implement division operation
Acceptance Criteria:
- Function divides two numbers
- Handles division by zero
- Includes error handling
- Has unit tests
```

### 2. Server Executes
```bash
copilot -p "In repository workflowai-hackaton/hackaton-demo-calculator: 
Add division functionality..." --allow-all-tools
```

### 3. Copilot Delivers
- Creates `src/divide.js`
- Creates `tests/divide.test.js`
- Handles edge cases (division by zero)
- Commits changes
- Opens PR #124

### 4. Review & Merge
- Review PR on GitHub
- Verify tests pass
- Merge to main branch

## Future Enhancements

- **Session Management**: Resume interrupted Copilot sessions
- **Custom Instructions**: Load project-specific coding guidelines
- **Multi-Repository**: Support changes across multiple repos
- **PR Templates**: Use custom PR templates for Copilot-created PRs
- **Metrics Tracking**: Track Copilot success rate and time savings

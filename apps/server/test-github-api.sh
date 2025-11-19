#!/bin/bash

# Example API calls for GitHub App integration
# Make sure the server is running: npm run dev

BASE_URL="http://localhost:4000"

echo "🚀 GitHub App Integration - Test Examples"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Example 1: Generic dispatch
echo -e "${BLUE}📤 Example 1: Generic Workflow Dispatch${NC}"
echo "POST /api/github/dispatch"
echo ""

curl -X POST "$BASE_URL/api/github/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "AlonRom",
    "repo": "workflow.ai",
    "eventType": "agent-task",
    "payload": {
      "custom_field": "custom_value",
      "another_field": 123
    }
  }'

echo -e "\n\n"

# Example 2: Structured task dispatch (Step 5)
echo -e "${BLUE}📋 Example 2: Structured Task Dispatch (Step 5)${NC}"
echo "POST /api/github/tasks"
echo ""

curl -X POST "$BASE_URL/api/github/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "AlonRom",
    "repo": "workflow.ai",
    "taskId": "TASK-123",
    "title": "Add health endpoint",
    "summary": "Create GET /health returning JSON {status: \"ok\"} and tests",
    "acceptanceCriteria": "- Returns 200\n- Unit tests pass\n- Integration tests pass",
    "branch": "feature/agent-TASK-123",
    "base": "main"
  }'

echo -e "\n\n"

# Example 3: Issue creation (Step 6)
echo -e "${BLUE}📝 Example 3: Issue-Driven Workflow (Step 6)${NC}"
echo "POST /api/github/issues"
echo ""

curl -X POST "$BASE_URL/api/github/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "AlonRom",
    "repo": "workflow.ai",
    "taskId": "TASK-124",
    "title": "Add user authentication",
    "body": "Implement OAuth2 authentication with GitHub",
    "acceptanceCriteria": [
      "OAuth2 flow implemented",
      "User session management",
      "Logout functionality",
      "Tests for auth flow"
    ],
    "labels": ["agent-task", "enhancement", "security"],
    "assignees": ["AlonRom"]
  }'

echo -e "\n\n"

# Example 4: Minimal task dispatch
echo -e "${BLUE}⚡ Example 4: Minimal Task Dispatch${NC}"
echo "POST /api/github/tasks (with defaults)"
echo ""

curl -X POST "$BASE_URL/api/github/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "AlonRom",
    "repo": "workflow.ai",
    "taskId": "TASK-125",
    "title": "Add logging middleware",
    "summary": "Add request/response logging middleware to Fastify server"
  }'

echo -e "\n\n"

# Example 5: Work item from placeholder data
echo -e "${BLUE}🎯 Example 5: Work Item with Placeholder Data${NC}"
echo "POST /api/github/tasks (simulating real work item)"
echo ""

curl -X POST "$BASE_URL/api/github/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "AlonRom",
    "repo": "workflow.ai",
    "taskId": "WF-001",
    "title": "Implement workflow execution engine",
    "summary": "Create a workflow execution engine that can:\n- Parse workflow definitions\n- Execute steps sequentially\n- Handle error conditions\n- Report progress",
    "acceptanceCriteria": "- Workflow parser implemented\n- Step executor with error handling\n- Progress reporting\n- Unit tests with 80% coverage\n- Integration tests for happy path",
    "branch": "feature/workflow-engine",
    "base": "main"
  }'

echo -e "\n\n"
echo -e "${GREEN}✅ All examples completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Check the server logs for any errors"
echo "2. Verify the GitHub Actions workflow was triggered"
echo "3. Check the target repository for new branches/PRs/issues"

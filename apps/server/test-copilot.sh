#!/bin/bash

# Test script for GitHub Copilot coding agent integration
# Usage: ./test-copilot.sh

echo "🤖 Testing GitHub Copilot Coding Agent Integration"
echo "=================================================="
echo ""

# Server URL
SERVER_URL="http://localhost:4000"

# Repository details
OWNER="workflowai-hackaton"
REPO="hackaton-demo-calculator"

# Test 1: Check if Copilot is available
echo "1️⃣  Checking if Copilot is enabled..."
curl -s "${SERVER_URL}/api/copilot/check/${OWNER}/${REPO}" | jq '.'
echo ""
echo ""

# Test 2: Assign a simple task to Copilot
echo "2️⃣  Assigning task to Copilot coding agent..."
RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/copilot/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "'"${OWNER}"'",
    "repo": "'"${REPO}"'",
    "title": "Add multiplication functionality",
    "body": "Implement a multiply function that:\n- Takes two numbers as parameters\n- Returns their product\n- Handles edge cases (null, undefined, NaN)\n- Includes comprehensive unit tests\n- Has JSDoc documentation",
    "labels": ["enhancement", "ai-generated", "copilot"],
    "additionalInstructions": "Follow our existing code style. Use Jest for tests."
  }')

echo "$RESPONSE" | jq '.'

# Extract issue URL
ISSUE_URL=$(echo "$RESPONSE" | jq -r '.issue.url // empty')

echo ""
echo "✅ Done! Copilot will start working on this task."
echo ""

if [ -n "$ISSUE_URL" ]; then
  echo "📋 Issue created: $ISSUE_URL"
  echo "👀 Watch for Copilot's PR at: https://github.com/${OWNER}/${REPO}/pulls"
  echo ""
  echo "🔔 You'll get a notification when Copilot requests your review"
fi

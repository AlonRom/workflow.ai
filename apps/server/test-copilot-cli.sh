#!/bin/bash

echo "🤖 Testing GitHub Copilot CLI Integration"
echo "=========================================="
echo ""

# Server URL
SERVER_URL="http://localhost:4000"

# Test 1: Check if Copilot CLI is available
echo "1️⃣  Checking Copilot CLI availability..."
curl -s "${SERVER_URL}/api/copilot-cli/check" | jq '.'
echo ""
echo ""

# Test 2: Run a simple prompt
echo "2️⃣  Running a simple Copilot CLI prompt..."
curl -s -X POST "${SERVER_URL}/api/copilot-cli/prompt" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me the last 3 git commits in this repository",
    "allowTools": ["shell(git)"]
  }' | jq '.'
echo ""
echo ""

# Test 3: Create a pull request
echo "3️⃣  Asking Copilot to create a PR..."
curl -s -X POST "${SERVER_URL}/api/copilot-cli/create-pr" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add a simple README.md with project description",
    "repository": "merck-ahtl/hack2025-workflow-calculator-app"
  }' | jq '.'
echo ""

echo "✅ Testing complete!"

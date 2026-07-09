#!/usr/bin/env bash
# Price Compare AI — Local Setup Script
# Works on Linux, macOS, and WSL
set -e

echo "=========================================="
echo "  Price Compare AI — Local Setup"
echo "=========================================="

# 0. Ensure we're in the project directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo "✗ Run this script from inside the project folder (where package.json is)."
  echo "  cd Price_Compare_AI   # or wherever you extracted"
  exit 1
fi

# 1. Fix DATABASE_URL to a relative path (in case the tarball had a sandbox path)
echo ""
echo "[1/6] Configuring database path..."
mkdir -p db
cat > .env <<'EOF'
DATABASE_URL=file:./db/custom.db
EOF
echo "  ✓ .env set to ./db/custom.db (relative — works anywhere)"

# 2. Install dependencies
echo ""
echo "[2/6] Installing dependencies..."
npm install

# 3. Create Gemini config
echo ""
echo "[3/6] Creating .z-ai-config with your Gemini key..."
cat > .z-ai-config <<'EOF'
{
  "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
  "apiKey": "${GEMINI_API_KEY}",
  "model": "gemini-2.5-flash"
}
EOF
echo "  ✓ .z-ai-config created (gitignored — your key stays private)"

# 4. Test the Gemini key
echo ""
echo "[4/6] Testing your Gemini API key..."
RESPONSE=$(curl -s -w "\n%{http_code}" "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Say OK"}]}],"generationConfig":{"thinkingConfig":{"thinkingBudget":0}}}' 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ Gemini API key works! (HTTP 200)"
elif echo "$BODY" | grep -q "location is not supported"; then
  echo "  ⚠ Gemini blocked in your region — try a VPN, or get a Z.ai key instead"
elif echo "$BODY" | grep -q "API key not valid"; then
  echo "  ✗ API key is invalid — get a new one at https://aistudio.google.com/apikey"
else
  echo "  ⚠ Unexpected response (HTTP $HTTP_CODE):"
  echo "  $BODY" | head -c 200
fi

# 5. Set up database
echo ""
echo "[5/6] Setting up SQLite database..."
npx prisma db push

# 6. Check port 3000
echo ""
echo "[6/6] Checking port 3000..."
if command -v lsof >/dev/null 2>&1; then
  PORT_PID=$(lsof -ti :3000 2>/dev/null || true)
elif command -v ss >/dev/null 2>&1; then
  PORT_PID=$(ss -tlnp 2>/dev/null | grep ':3000 ' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
elif command -v fuser >/dev/null 2>&1; then
  PORT_PID=$(fuser 3000/tcp 2>/dev/null | head -1 || true)
else
  PORT_PID=""
fi

if [ -n "$PORT_PID" ]; then
  echo "  ⚠ Port 3000 is in use by process $PORT_PID"
  echo "    Option A: kill it  →  kill $PORT_PID"
  echo "    Option B: use another port  →  PORT=3001 npm run dev"
  echo "               (then open http://localhost:3001)"
else
  echo "  ✓ Port 3000 is free"
fi

# Done
echo ""
echo "=========================================="
echo "  ✓ Setup complete!"
echo ""
echo "  Start the dev server:"
echo "    npm run dev"
echo ""
echo "  Then open: http://localhost:3000"
echo ""
echo "  If port 3000 is busy, use:"
echo "    npx next dev -p 3001"
echo "  Then open: http://localhost:3001"
echo "=========================================="

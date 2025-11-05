#!/bin/bash

# Script to download QPC v4 layout (tajweed) from qul.tarteel.ai
# Resource ID: 19
# URL: https://qul.tarteel.ai/resources/mushaf-layout/19

OUTPUT_DIR="src/data/layouts"
OUTPUT_FILE="$OUTPUT_DIR/qpc-v4-tajweed-15-lines.db"

echo "📥 Downloading QPC v4 layout (tajweed) from qul.tarteel.ai..."

# Option 1: If you have authentication token/cookies
# curl -L -o "$OUTPUT_FILE" \
#   "https://qul.tarteel.ai/resources/mushaf-layout/19/download" \
#   -H "Cookie: your_session_cookie_here" \
#   -H "Accept: application/x-sqlite3"

# Option 2: Manual download instructions
echo ""
echo "⚠️  Authentication required for direct download."
echo ""
echo "To download manually:"
echo "1. Visit: https://qul.tarteel.ai/resources/mushaf-layout/19?page="
echo "2. Sign in to your account"
echo "3. Click 'Download sqlite' button"
echo "4. Save the file to: $OUTPUT_FILE"
echo ""
echo "Or use the API endpoint (requires authentication):"
echo "GET https://api.quran.com/api/v4/resources/mushaf-layout/19/download"
echo "Headers:"
echo "  x-auth-token: YOUR_ACCESS_TOKEN"
echo "  x-client-id: YOUR_CLIENT_ID"
echo ""

# Check if file already exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ File already exists: $OUTPUT_FILE"
    echo "   File size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
    
    # Check if SQLite file is valid
    if command -v sqlite3 &> /dev/null; then
        PAGE_COUNT=$(sqlite3 "$OUTPUT_FILE" "SELECT COUNT(DISTINCT page_number) FROM pages;" 2>/dev/null)
        echo "   Pages in database: $PAGE_COUNT"
    fi
fi


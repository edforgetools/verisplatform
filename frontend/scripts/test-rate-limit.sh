#!/bin/bash

# Simple rate limit test script
# This script makes rapid requests to test rate limiting

API_URL="http://localhost:3000"
ENDPOINT="/api/proof/create"

echo "🚀 Testing rate limiting..."
echo "📊 Making 70 requests (should hit 60 req/min limit)"
echo ""

# Make 70 requests rapidly
for i in {1..70}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"file":null,"user_id":"test"}' \
        "$API_URL$ENDPOINT")
    
    if [ "$response" = "429" ]; then
        echo "🔴 Request $i: RATE LIMITED (429)"
        echo "✅ Rate limiting is working! First 429 at request #$i"
        break
    elif [ "$response" = "400" ]; then
        echo "🟡 Request $i: Validation error (400) - expected"
    else
        echo "🟢 Request $i: Status $response"
    fi
    
    # Small delay to avoid overwhelming
    sleep 0.1
done

echo ""
echo "🏁 Rate limit test completed!"

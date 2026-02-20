#!/bin/bash
# Security Verification Test Script
# Tests cross-family data isolation and admin API protection

BASE_URL="http://localhost:8000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

# Function to test endpoint
test_endpoint() {
    local description=$1
    local expected_code=$2
    local endpoint=$3
    local token=$4

    if [ -n "$token" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $token" "$BASE_URL$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    fi

    if [ "$response" == "$expected_code" ]; then
        echo -e "${GREEN}[PASS]${NC} $description (got $response)"
        ((PASS_COUNT++))
    else
        echo -e "${RED}[FAIL]${NC} $description (expected $expected_code, got $response)"
        ((FAIL_COUNT++))
    fi
}

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  SECURITY VERIFICATION TEST SUITE   ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Step 1: Login as Parents
echo -e "${YELLOW}Step 1: Getting authentication tokens...${NC}"
TOKEN_PARENT_A=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"parent-a@test.com","password":"TestPass123"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

TOKEN_PARENT_B=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"parent-b@test.com","password":"TestPass456"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN_PARENT_A" ] || [ -z "$TOKEN_PARENT_B" ]; then
    echo -e "${RED}Failed to get tokens. Make sure test families exist.${NC}"
    exit 1
fi
echo -e "${GREEN}Tokens obtained successfully${NC}"
echo ""

# Step 2: Add children to Family A
echo -e "${YELLOW}Step 2: Adding children to Family A...${NC}"
CHILD_A1_RESP=$(curl -s -X POST "$BASE_URL/api/family/members" \
  -H "Authorization: Bearer $TOKEN_PARENT_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Child A1","username":"child-a1","password":"ChildPass1","role":"child","dob":"2015-05-10","grade":"5th"}')
CHILD_A1_ID=$(echo "$CHILD_A1_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

CHILD_A2_RESP=$(curl -s -X POST "$BASE_URL/api/family/members" \
  -H "Authorization: Bearer $TOKEN_PARENT_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Child A2","username":"child-a2","password":"ChildPass2","role":"child","dob":"2017-08-20","grade":"3rd"}')
CHILD_A2_ID=$(echo "$CHILD_A2_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

CHILD_A3_RESP=$(curl -s -X POST "$BASE_URL/api/family/members" \
  -H "Authorization: Bearer $TOKEN_PARENT_A" \
  -H "Content-Type: application/json" \
  -d '{"name":"Child A3","username":"child-a3","password":"ChildPass3","role":"child","dob":"2019-12-15","grade":"1st"}')
CHILD_A3_ID=$(echo "$CHILD_A3_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo "Created Child A1 (ID: $CHILD_A1_ID), Child A2 (ID: $CHILD_A2_ID), Child A3 (ID: $CHILD_A3_ID)"

# Step 3: Add children to Family B
echo -e "${YELLOW}Step 3: Adding children to Family B...${NC}"
CHILD_B1_RESP=$(curl -s -X POST "$BASE_URL/api/family/members" \
  -H "Authorization: Bearer $TOKEN_PARENT_B" \
  -H "Content-Type: application/json" \
  -d '{"name":"Child B1","username":"child-b1","password":"ChildPass4","role":"child","dob":"2014-03-25","grade":"6th"}')
CHILD_B1_ID=$(echo "$CHILD_B1_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

CHILD_B2_RESP=$(curl -s -X POST "$BASE_URL/api/family/members" \
  -H "Authorization: Bearer $TOKEN_PARENT_B" \
  -H "Content-Type: application/json" \
  -d '{"name":"Child B2","username":"child-b2","password":"ChildPass5","role":"child","dob":"2016-09-08","grade":"4th"}')
CHILD_B2_ID=$(echo "$CHILD_B2_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

CHILD_B3_RESP=$(curl -s -X POST "$BASE_URL/api/family/members" \
  -H "Authorization: Bearer $TOKEN_PARENT_B" \
  -H "Content-Type: application/json" \
  -d '{"name":"Child B3","username":"child-b3","password":"ChildPass6","role":"child","dob":"2018-11-30","grade":"2nd"}')
CHILD_B3_ID=$(echo "$CHILD_B3_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo "Created Child B1 (ID: $CHILD_B1_ID), Child B2 (ID: $CHILD_B2_ID), Child B3 (ID: $CHILD_B3_ID)"
echo ""

# Step 4: Create sample data for children
echo -e "${YELLOW}Step 4: Creating sample data...${NC}"

# Create tasks for Family A children
curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Authorization: Bearer $TOKEN_PARENT_A" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Task for Child A1\",\"assigned_to\":$CHILD_A1_ID,\"points\":10,\"category\":\"chores\"}" > /dev/null

# Create tasks for Family B children
curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Authorization: Bearer $TOKEN_PARENT_B" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Task for Child B1\",\"assigned_to\":$CHILD_B1_ID,\"points\":15,\"category\":\"homework\"}" > /dev/null

# Log prayers for children
curl -s -X POST "$BASE_URL/api/islamic/prayers" \
  -H "Authorization: Bearer $TOKEN_PARENT_A" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$CHILD_A1_ID,\"prayer_name\":\"fajr\",\"date\":\"2026-02-20\",\"status\":\"prayed\",\"in_masjid\":false}" > /dev/null

curl -s -X POST "$BASE_URL/api/islamic/prayers" \
  -H "Authorization: Bearer $TOKEN_PARENT_B" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$CHILD_B1_ID,\"prayer_name\":\"fajr\",\"date\":\"2026-02-20\",\"status\":\"prayed\",\"in_masjid\":true}" > /dev/null

# Add Quran progress
curl -s -X POST "$BASE_URL/api/islamic/quran" \
  -H "Authorization: Bearer $TOKEN_PARENT_A" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$CHILD_A1_ID,\"surah_number\":114,\"surah_name\":\"An-Nas\",\"total_verses\":6,\"verses_memorized\":6,\"status\":\"memorized\"}" > /dev/null

curl -s -X POST "$BASE_URL/api/islamic/quran" \
  -H "Authorization: Bearer $TOKEN_PARENT_B" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$CHILD_B1_ID,\"surah_number\":113,\"surah_name\":\"Al-Falaq\",\"total_verses\":5,\"verses_memorized\":5,\"status\":\"memorized\"}" > /dev/null

echo "Sample data created"
echo ""

# =============================================
# SECURITY TESTS START HERE
# =============================================

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  TEST 1: ADMIN API AUTHENTICATION   ${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}All should return 401 Unauthorized${NC}"
echo ""

test_endpoint "Admin dashboard (no auth)" "401" "/api/admin/dashboard" ""
test_endpoint "Admin families list (no auth)" "401" "/api/admin/families" ""
test_endpoint "Admin settings (no auth)" "401" "/api/admin/settings" ""
test_endpoint "Admin email config (no auth)" "401" "/api/admin/email-config" ""
test_endpoint "Admin admins list (no auth)" "401" "/api/admin/admins" ""
test_endpoint "Admin dashboard (user token)" "401" "/api/admin/dashboard" "$TOKEN_PARENT_A"
test_endpoint "Support admin issues (no auth)" "401" "/api/support/admin/issues" ""
test_endpoint "Support admin logs (no auth)" "401" "/api/support/admin/activity-logs" ""

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  TEST 2: CROSS-FAMILY ACCESS (IDOR) ${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}Parent A trying to access Family B data - should return 404${NC}"
echo ""

# Learning endpoints - Parent A trying to access Child B1
test_endpoint "Learning homework (cross-family)" "404" "/api/learning/homework/$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Learning proficiency (cross-family)" "404" "/api/learning/proficiency/$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Learning weak-areas (cross-family)" "404" "/api/learning/weak-areas/$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Learning suggestions (cross-family)" "404" "/api/learning/suggestions/$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Learning worksheets (cross-family)" "404" "/api/learning/worksheets/assigned/$CHILD_B1_ID" "$TOKEN_PARENT_A"

# Islamic endpoints - Parent A trying to access Child B1
test_endpoint "Islamic prayers (cross-family)" "404" "/api/islamic/prayers/$CHILD_B1_ID/2026-02-20" "$TOKEN_PARENT_A"
test_endpoint "Islamic quran (cross-family)" "404" "/api/islamic/quran/$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Islamic ramadan (cross-family)" "404" "/api/islamic/ramadan/$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Islamic ramadan summary (cross-family)" "404" "/api/islamic/ramadan/$CHILD_B1_ID/summary" "$TOKEN_PARENT_A"
test_endpoint "Islamic ramadan goals (cross-family)" "404" "/api/islamic/ramadan-goals?user_id=$CHILD_B1_ID" "$TOKEN_PARENT_A"

# Quran goals - Parent A trying to access Child B1
test_endpoint "Quran goals active (cross-family)" "404" "/api/quran-goals/active?user_id=$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Quran goals logs (cross-family)" "404" "/api/quran-goals/logs?user_id=$CHILD_B1_ID" "$TOKEN_PARENT_A"
test_endpoint "Quran goals stats (cross-family)" "404" "/api/quran-goals/stats?user_id=$CHILD_B1_ID" "$TOKEN_PARENT_A"

# Tasks points - Parent A trying to access Child B1
test_endpoint "Tasks points (cross-family)" "404" "/api/tasks/points/$CHILD_B1_ID" "$TOKEN_PARENT_A"

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  TEST 3: SAME-FAMILY ACCESS         ${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}Parent A accessing own family data - should return 200${NC}"
echo ""

# Learning endpoints - Parent A accessing Child A1
test_endpoint "Learning homework (same-family)" "200" "/api/learning/homework/$CHILD_A1_ID" "$TOKEN_PARENT_A"
test_endpoint "Learning proficiency (same-family)" "200" "/api/learning/proficiency/$CHILD_A1_ID" "$TOKEN_PARENT_A"
test_endpoint "Learning weak-areas (same-family)" "200" "/api/learning/weak-areas/$CHILD_A1_ID" "$TOKEN_PARENT_A"

# Islamic endpoints - Parent A accessing Child A1
test_endpoint "Islamic prayers (same-family)" "200" "/api/islamic/prayers/$CHILD_A1_ID/2026-02-20" "$TOKEN_PARENT_A"
test_endpoint "Islamic quran (same-family)" "200" "/api/islamic/quran/$CHILD_A1_ID" "$TOKEN_PARENT_A"
test_endpoint "Islamic ramadan (same-family)" "200" "/api/islamic/ramadan/$CHILD_A1_ID" "$TOKEN_PARENT_A"

# Tasks points - Parent A accessing Child A1
test_endpoint "Tasks points (same-family)" "200" "/api/tasks/points/$CHILD_A1_ID" "$TOKEN_PARENT_A"

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  TEST 4: AI CONTEXT DATA ISOLATION  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

echo "Checking AI context for Parent A (should only see Family Alpha members)..."
AI_CONTEXT_A=$(curl -s -H "Authorization: Bearer $TOKEN_PARENT_A" "$BASE_URL/api/ai/context")
if echo "$AI_CONTEXT_A" | grep -q "Child B1"; then
    echo -e "${RED}[FAIL]${NC} AI context contains Family B data (Child B1 found)"
    ((FAIL_COUNT++))
else
    echo -e "${GREEN}[PASS]${NC} AI context does NOT contain Family B data"
    ((PASS_COUNT++))
fi

if echo "$AI_CONTEXT_A" | grep -q "Child A1"; then
    echo -e "${GREEN}[PASS]${NC} AI context contains Family A data (Child A1 found)"
    ((PASS_COUNT++))
else
    echo -e "${RED}[FAIL]${NC} AI context missing Family A data"
    ((FAIL_COUNT++))
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}           TEST SUMMARY              ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Total Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Total Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}ALL SECURITY TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}SOME TESTS FAILED - REVIEW SECURITY FIXES${NC}"
    exit 1
fi

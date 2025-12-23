#!/bin/bash

###############################################################################
# BeamLab Deployment Verification Script
# 
# Usage: ./scripts/verify-deployment.sh [backend_url] [frontend_url]
# Example: ./scripts/verify-deployment.sh https://api.beamlab.com https://app.beamlab.com
###############################################################################

BACKEND_URL=${1:-"http://localhost:3000"}
FRONTEND_URL=${2:-"http://localhost:8000"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    log_info "Testing: $description"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        log_success "$description - Status: $response"
    else
        log_error "$description - Expected: $expected_status, Got: $response"
    fi
}

check_json_response() {
    local url=$1
    local expected_field=$2
    local description=$3
    
    log_info "Testing: $description"
    
    response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "\"$expected_field\""; then
        log_success "$description - Response contains '$expected_field'"
    else
        log_error "$description - Response missing '$expected_field'"
        echo "Response: $response"
    fi
}

check_cors() {
    local url=$1
    local origin=$2
    
    log_info "Testing CORS headers"
    
    response=$(curl -s -I -H "Origin: $origin" "$url" 2>/dev/null | grep -i "access-control-allow-origin")
    
    if [ -n "$response" ]; then
        log_success "CORS headers present: $response"
    else
        log_error "CORS headers missing"
    fi
}

check_ssl() {
    local url=$1
    
    log_info "Testing SSL certificate"
    
    if [[ "$url" == https://* ]]; then
        response=$(curl -s -I "$url" 2>&1)
        if echo "$response" | grep -q "HTTP"; then
            log_success "SSL certificate valid"
        else
            log_error "SSL certificate invalid or unreachable"
        fi
    else
        log_info "Skipping SSL check for non-HTTPS URL"
    fi
}

echo ""
log_info "=========================================="
log_info "BeamLab Deployment Verification"
log_info "=========================================="
echo ""
log_info "Backend URL: $BACKEND_URL"
log_info "Frontend URL: $FRONTEND_URL"
echo ""

# Backend Health Check
log_info "=== Backend API Tests ==="
check_endpoint "$BACKEND_URL/health" "200" "Backend health endpoint"
check_json_response "$BACKEND_URL/health" "status" "Health endpoint JSON format"
check_json_response "$BACKEND_URL/health" "timestamp" "Health endpoint timestamp"
check_cors "$BACKEND_URL/health" "$FRONTEND_URL"

echo ""

# Backend API Routes (should return 401 without auth)
log_info "=== Backend API Routes ==="
check_endpoint "$BACKEND_URL/api/projects" "401" "Projects endpoint (auth required)"
check_endpoint "$BACKEND_URL/api/analysis" "404" "Analysis endpoint (not found = working)"

echo ""

# Frontend Tests
log_info "=== Frontend Tests ==="
check_endpoint "$FRONTEND_URL" "200" "Frontend homepage"
check_ssl "$FRONTEND_URL"

echo ""

# DNS Resolution (if using custom domain)
if [[ "$BACKEND_URL" != *"localhost"* && "$BACKEND_URL" != *"127.0.0.1"* ]]; then
    log_info "=== DNS Resolution ==="
    
    backend_host=$(echo "$BACKEND_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
    frontend_host=$(echo "$FRONTEND_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
    
    log_info "Checking DNS for $backend_host..."
    if nslookup "$backend_host" > /dev/null 2>&1; then
        log_success "DNS resolution successful for $backend_host"
    else
        log_error "DNS resolution failed for $backend_host"
    fi
    
    log_info "Checking DNS for $frontend_host..."
    if nslookup "$frontend_host" > /dev/null 2>&1; then
        log_success "DNS resolution successful for $frontend_host"
    else
        log_error "DNS resolution failed for $frontend_host"
    fi
fi

echo ""
log_info "=========================================="
log_info "Verification Summary"
log_info "=========================================="
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    log_success "All checks passed! 🎉"
    exit 0
else
    log_error "Some checks failed. Please review the output above."
    exit 1
fi

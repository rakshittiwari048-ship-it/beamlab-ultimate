#!/bin/bash

###############################################################################
# Quick Launch Checklist for BeamLab
# 
# Run this script to see your deployment status
###############################################################################

echo "🚀 BeamLab Production Launch Checklist"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_env_var() {
    if [ -n "${!1}" ]; then
        echo -e "${GREEN}✓${NC} $1 is set"
    else
        echo -e "${RED}✗${NC} $1 is NOT set"
    fi
}

echo "📋 STEP 1: Environment Variables"
echo "--------------------------------"
echo ""
echo "Backend (Render):"
check_env_var "MONGODB_URI"
check_env_var "CLERK_SECRET_KEY"
check_env_var "STRIPE_SECRET_KEY"
check_env_var "STRIPE_WEBHOOK_SECRET"
echo ""
echo "Frontend (Vercel):"
check_env_var "VITE_CLERK_PUBLISHABLE_KEY"
check_env_var "VITE_API_URL"
echo ""

echo "📋 STEP 2: Database Migration"
echo "--------------------------------"
echo "Run: node scripts/migrate.js"
echo ""
echo "Expected output:"
echo "  ✓ User indexes created"
echo "  ✓ Critical clerkId index verified"
echo "  ✓ Project indexes created"
echo "  ✓ Subscription indexes created"
echo ""

echo "📋 STEP 3: DNS Configuration"
echo "--------------------------------"
echo "Add these CNAME records at your DNS provider:"
echo ""
echo "  Type   Name   Value"
echo "  ----   ----   -----"
echo "  CNAME  app    cname.vercel-dns.com"
echo "  CNAME  api    your-service.onrender.com"
echo ""

echo "📋 STEP 4: UptimeRobot Monitor"
echo "--------------------------------"
echo "Setup at: https://uptimerobot.com"
echo ""
echo "Monitor Configuration:"
echo "  Type: HTTP(s)"
echo "  URL: https://api.beamlab.com/health"
echo "  Interval: 5 minutes"
echo "  Expected: {\"status\":\"ok\"}"
echo ""

echo "📋 STEP 5: Verify Deployment"
echo "--------------------------------"
echo "Run: ./scripts/verify-deployment.sh https://api.beamlab.com https://app.beamlab.com"
echo ""

echo "========================================"
echo ""
echo "📚 Full documentation: See DEPLOYMENT.md"
echo ""

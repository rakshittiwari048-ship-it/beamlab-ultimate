#!/bin/bash

###############################################################################
# BeamLab Production Deployment Script
# 
# Usage: ./scripts/deploy.sh [environment]
# Environments: production, staging
###############################################################################

set -e  # Exit on error

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

###############################################################################
# 1. PRE-DEPLOYMENT CHECKS
###############################################################################

log_info "Starting BeamLab deployment for ${ENVIRONMENT}..."

# Check required environment variables
check_env_vars() {
    log_info "Checking required environment variables..."
    
    REQUIRED_VARS=(
        "MONGODB_URI"
        "CLERK_SECRET_KEY"
        "CLERK_PUBLISHABLE_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "CORS_ORIGIN"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        log_error "Set these in your deployment platform (Render/Vercel) before deploying."
        exit 1
    fi
    
    log_success "All required environment variables are set"
}

# Check Node.js version
check_node_version() {
    log_info "Checking Node.js version..."
    
    REQUIRED_NODE_VERSION="18"
    CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    
    if [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
        log_error "Node.js version $REQUIRED_NODE_VERSION or higher is required (found v$CURRENT_NODE_VERSION)"
        exit 1
    fi
    
    log_success "Node.js version check passed (v$(node -v))"
}

# Check pnpm installation
check_pnpm() {
    log_info "Checking pnpm installation..."
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Install with: npm install -g pnpm"
        exit 1
    fi
    
    log_success "pnpm is installed ($(pnpm -v))"
}

###############################################################################
# 2. BUILD PROCESS
###############################################################################

build_project() {
    log_info "Installing dependencies..."
    cd "$PROJECT_ROOT"
    pnpm install --frozen-lockfile
    
    log_info "Building packages..."
    pnpm --filter @beamlab/types build
    pnpm --filter @beamlab/analysis-engine build
    
    log_info "Building backend..."
    pnpm --filter @beamlab/backend build
    
    log_info "Building frontend..."
    pnpm --filter @beamlab/frontend build
    
    log_success "Build completed successfully"
}

###############################################################################
# 3. DATABASE MIGRATION
###############################################################################

run_database_migration() {
    log_info "Running database migration..."
    
    cd "$PROJECT_ROOT"
    node "$SCRIPT_DIR/migrate.js"
    
    log_success "Database migration completed"
}

###############################################################################
# 4. HEALTH CHECK
###############################################################################

health_check() {
    log_info "Running health check..."
    
    if [ -n "$HEALTH_CHECK_URL" ]; then
        RETRY_COUNT=0
        MAX_RETRIES=30
        
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if curl -sf "$HEALTH_CHECK_URL" > /dev/null; then
                log_success "Health check passed!"
                return 0
            fi
            
            RETRY_COUNT=$((RETRY_COUNT + 1))
            log_info "Waiting for service to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
            sleep 2
        done
        
        log_error "Health check failed after $MAX_RETRIES attempts"
        return 1
    else
        log_warning "HEALTH_CHECK_URL not set, skipping health check"
    fi
}

###############################################################################
# 5. POST-DEPLOYMENT TASKS
###############################################################################

post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Clear any application caches if needed
    log_info "Clearing caches..."
    
    # Warm up the application
    if [ -n "$HEALTH_CHECK_URL" ]; then
        log_info "Warming up application..."
        curl -sf "$HEALTH_CHECK_URL" > /dev/null || true
    fi
    
    log_success "Post-deployment tasks completed"
}

###############################################################################
# MAIN DEPLOYMENT FLOW
###############################################################################

main() {
    log_info "=========================================="
    log_info "BeamLab Deployment - ${ENVIRONMENT}"
    log_info "=========================================="
    echo ""
    
    # Pre-deployment checks
    check_node_version
    check_pnpm
    check_env_vars
    
    # Build
    build_project
    
    # Database migration
    run_database_migration
    
    # Health check (if URL provided)
    health_check || log_warning "Health check failed, but continuing..."
    
    # Post-deployment
    post_deployment
    
    echo ""
    log_success "=========================================="
    log_success "Deployment completed successfully!"
    log_success "=========================================="
    echo ""
    log_info "Next steps:"
    echo "  1. Verify DNS configuration (see docs/DEPLOYMENT.md)"
    echo "  2. Setup UptimeRobot monitor"
    echo "  3. Test production endpoints"
    echo "  4. Monitor logs for errors"
}

# Run main deployment
main

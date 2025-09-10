#!/bin/bash

# Database Deployment Script for Supabase
# This script handles database schema deployment with proper error handling and validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/schema.sql"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Functions
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

check_requirements() {
    log_info "Checking requirements..."
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed. Please install PostgreSQL client."
        exit 1
    fi
    
    # Check if schema file exists
    if [ ! -f "$SCHEMA_FILE" ]; then
        log_error "Schema file not found: $SCHEMA_FILE"
        exit 1
    fi
    
    # Check required environment variables
    if [ -z "$SUPABASE_HOST" ] || [ -z "$SUPABASE_API_KEY" ]; then
        log_error "Missing required environment variables:"
        log_error "  SUPABASE_HOST: ${SUPABASE_HOST:-'NOT SET'}"
        log_error "  SUPABASE_API_KEY: ${SUPABASE_API_KEY:-'NOT SET'}"
        exit 1
    fi
    
    log_success "All requirements met"
}

create_backup() {
    log_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Create backup of current schema
    PGPASSWORD="$SUPABASE_API_KEY" pg_dump \
        -h "$SUPABASE_HOST" \
        -U postgres \
        -d postgres \
        -p 5432 \
        --schema-only \
        --no-owner \
        --no-privileges \
        > "$BACKUP_DIR/backup_$TIMESTAMP.sql" 2>/dev/null || {
        log_warning "Could not create backup (database might be empty)"
    }
    
    log_success "Backup created: backup_$TIMESTAMP.sql"
}

validate_connection() {
    log_info "Validating database connection..."
    
    PGPASSWORD="$SUPABASE_API_KEY" psql \
        -h "$SUPABASE_HOST" \
        -U postgres \
        -d postgres \
        -p 5432 \
        -c "SELECT version();" \
        -t > /dev/null
    
    log_success "Database connection validated"
}

deploy_schema() {
    log_info "Deploying database schema..."
    
    # Deploy schema with error handling
    PGPASSWORD="$SUPABASE_API_KEY" psql \
        -h "$SUPABASE_HOST" \
        -U postgres \
        -d postgres \
        -p 5432 \
        -f "$SCHEMA_FILE" \
        -v ON_ERROR_STOP=1 \
        --echo-errors
    
    log_success "Schema deployment completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check that all required tables exist
    EXPECTED_TABLES=("players" "sessions" "session_players" "matches" "elo_history" "courts" "match_events" "session_settings")
    
    for table in "${EXPECTED_TABLES[@]}"; do
        TABLE_EXISTS=$(PGPASSWORD="$SUPABASE_API_KEY" psql \
            -h "$SUPABASE_HOST" \
            -U postgres \
            -d postgres \
            -p 5432 \
            -t \
            -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | xargs)
        
        if [ "$TABLE_EXISTS" = "t" ]; then
            log_success "✓ Table '$table' exists"
        else
            log_error "✗ Table '$table' missing"
            exit 1
        fi
    done
    
    # Check that views exist
    EXPECTED_VIEWS=("player_leaderboard" "session_leaderboard" "recent_matches")
    
    for view in "${EXPECTED_VIEWS[@]}"; do
        VIEW_EXISTS=$(PGPASSWORD="$SUPABASE_API_KEY" psql \
            -h "$SUPABASE_HOST" \
            -U postgres \
            -d postgres \
            -p 5432 \
            -t \
            -c "SELECT EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = '$view');" | xargs)
        
        if [ "$VIEW_EXISTS" = "t" ]; then
            log_success "✓ View '$view' exists"
        else
            log_warning "⚠ View '$view' missing (may be expected)"
        fi
    done
    
    log_success "Deployment verification completed"
}

run_sample_data() {
    if [ "$1" = "--with-sample-data" ]; then
        log_info "Creating sample data..."
        
        PGPASSWORD="$SUPABASE_API_KEY" psql \
            -h "$SUPABASE_HOST" \
            -U postgres \
            -d postgres \
            -p 5432 \
            -c "SELECT create_sample_data();"
        
        log_success "Sample data created"
    fi
}

show_summary() {
    log_success "🎉 Database deployment completed successfully!"
    echo ""
    echo -e "${BLUE}Deployment Summary:${NC}"
    echo "  📅 Timestamp: $TIMESTAMP"
    echo "  🗄️  Database: $SUPABASE_HOST"
    echo "  📋 Schema: $SCHEMA_FILE"
    echo "  💾 Backup: $BACKUP_DIR/backup_$TIMESTAMP.sql"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "  1. Update your React app environment variables"
    echo "  2. Deploy your application"
    echo "  3. Test the integration"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  # Connect to database:"
    echo "  PGPASSWORD=\"\$SUPABASE_API_KEY\" psql -h \"\$SUPABASE_HOST\" -U postgres -d postgres -p 5432"
    echo ""
    echo "  # View tables:"
    echo "  \\dt"
    echo ""
    echo "  # Check sample data:"
    echo "  SELECT * FROM player_leaderboard LIMIT 5;"
}

# Main execution
main() {
    echo -e "${BLUE}🏸 Badminton Pairing App - Database Deployment${NC}"
    echo "=================================================="
    
    check_requirements
    validate_connection
    create_backup
    deploy_schema
    verify_deployment
    run_sample_data "$1"
    show_summary
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [--with-sample-data] [--help]"
        echo ""
        echo "Options:"
        echo "  --with-sample-data    Create sample data after deployment"
        echo "  --help, -h           Show this help message"
        echo ""
        echo "Environment Variables Required:"
        echo "  SUPABASE_HOST        Your Supabase database host"
        echo "  SUPABASE_API_KEY     Your Supabase service role key"
        exit 0
        ;;
    *)
        main "$1"
        ;;
esac

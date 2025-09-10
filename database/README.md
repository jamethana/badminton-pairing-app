# Database Deployment Automation

This directory contains automated database deployment scripts and configurations for the Badminton Pairing App.

## 🚀 GitLab CI/CD Pipeline

The `.gitlab-ci.yml` file in the project root automates database deployment using your existing GitLab secrets.

### Repository Secrets Used
- `SUPABASE_API_KEY` - Your Supabase service role key
- `SUPABASE_HOST` - Your Supabase database host
- `SUPABASE_KEY` - Your Supabase anon key (for app deployment)

### Pipeline Stages

#### 1. **Validate** 🔍
- Validates SQL syntax
- Checks schema file integrity
- Runs on merge requests and main branch

#### 2. **Deploy Database** 🗄️
- Connects to Supabase PostgreSQL
- Creates backup of existing schema
- Deploys new schema from `database/schema.sql`
- Verifies all tables and views are created
- **Triggers**: When `database/` files change

#### 3. **Deploy App** 🚀
- Builds React app with Supabase environment variables
- Creates production build
- Deploys to GitLab Pages
- **Triggers**: On main branch commits

#### 4. **Test** 🧪
- Runs database integration tests
- Validates table creation and constraints
- Runs application unit tests
- **Triggers**: After successful deployment

## 🛠️ Manual Deployment

### Prerequisites
```bash
# Install PostgreSQL client
sudo apt-get install postgresql-client

# Or on macOS
brew install postgresql
```

### Deploy Database
```bash
# Set environment variables
export SUPABASE_HOST="your-project-id.supabase.co"
export SUPABASE_API_KEY="your-service-role-key"

# Run deployment script
chmod +x database/deploy.sh
./database/deploy.sh

# Or with sample data
./database/deploy.sh --with-sample-data
```

### Direct SQL Deployment
```bash
# Connect and run schema directly
PGPASSWORD="$SUPABASE_API_KEY" psql \
  -h "$SUPABASE_HOST" \
  -U postgres \
  -d postgres \
  -p 5432 \
  -f database/schema.sql
```

## 📁 File Structure

```
database/
├── README.md                 # This file
├── deploy.sh                # Manual deployment script
├── deploy-config.yml        # Deployment configuration
├── schema.sql              # Complete database schema
└── migrations/
    └── 001_initial_schema.sql  # Migration tracking
```

## 🔄 GitLab CI/CD Workflow

### Automatic Triggers
1. **Database Changes**: When you modify files in `database/` directory
2. **Main Branch**: Deploys to production automatically
3. **Merge Requests**: Manual deployment option for testing

### Manual Triggers
1. **Rollback**: Manual job to rollback database changes
2. **Sample Data**: Optional sample data creation
3. **Test Deployment**: Deploy to staging for testing

### Pipeline Variables
```yaml
# Set in GitLab CI/CD Variables
SUPABASE_HOST: "your-project-id.supabase.co"
SUPABASE_API_KEY: "your-service-role-key"
SUPABASE_KEY: "your-anon-key"

# Optional
SLACK_WEBHOOK_URL: "your-slack-webhook"
DISCORD_WEBHOOK_URL: "your-discord-webhook"
```

## 🔧 Customization

### Environment-Specific Deployment
Modify `deploy-config.yml` to customize deployment for different environments:
- Development: Local Supabase instance
- Staging: Staging database with sample data
- Production: Production database with full validation

### Notification Setup
Add webhook URLs to get deployment notifications:
```bash
# In GitLab CI/CD Variables
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Custom Deployment Steps
Modify `.gitlab-ci.yml` to add custom steps:
- **Pre-deployment**: Data validation, backup verification
- **Post-deployment**: Performance testing, data seeding
- **Monitoring**: Health checks, alert setup

## 🚨 Troubleshooting

### Common Issues

#### Connection Failed
```bash
# Test connection manually
PGPASSWORD="$SUPABASE_API_KEY" psql \
  -h "$SUPABASE_HOST" \
  -U postgres \
  -d postgres \
  -p 5432 \
  -c "SELECT version();"
```

#### Schema Errors
- Check SQL syntax in `database/schema.sql`
- Verify table dependencies and foreign keys
- Review constraint definitions

#### Permission Denied
- Verify `SUPABASE_API_KEY` is the service role key (not anon key)
- Check RLS policies are not blocking operations
- Ensure user has schema modification permissions

#### Pipeline Failures
- Check GitLab CI/CD logs for specific error messages
- Verify environment variables are set correctly
- Ensure repository secrets are accessible

### Debug Commands
```bash
# Check pipeline logs
gitlab-ci-lint .gitlab-ci.yml

# Test deployment locally
docker run --rm -v $(pwd):/app -w /app postgres:15 \
  bash -c "database/deploy.sh"

# Validate schema syntax
psql -f database/schema.sql --dry-run
```

## 📊 Monitoring

### Health Checks
The pipeline includes automated health checks:
- Table existence validation
- Constraint verification
- Performance benchmarks
- Data integrity tests

### Rollback Strategy
1. **Automatic Backup**: Created before each deployment
2. **Manual Rollback**: GitLab job for emergency rollback
3. **Version Control**: All schema changes tracked in Git
4. **Migration History**: Database tracks applied migrations

## 🔮 Future Enhancements

### Planned Improvements
- **Blue-Green Deployment**: Zero-downtime deployments
- **Automated Testing**: Comprehensive integration tests
- **Performance Monitoring**: Query performance tracking
- **Multi-Environment**: Separate dev/staging/prod databases
- **Schema Versioning**: Advanced migration management
- **Rollback Automation**: Automatic rollback on failure detection

### Integration Options
- **Terraform**: Infrastructure as Code for Supabase setup
- **Ansible**: Configuration management automation
- **Kubernetes**: Container orchestration for complex deployments
- **Monitoring Stack**: Prometheus + Grafana for observability

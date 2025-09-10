# Database Setup for Supabase Integration

This document outlines the database structure and setup process for integrating the Badminton Pairing App with Supabase PostgreSQL.

## 📊 Database Schema Overview

### Core Tables

#### `players`
- **Purpose**: Global player database across all sessions
- **Key Fields**: name, email, lifetime stats, current ELO, match history
- **Relationships**: One-to-many with session_players, matches, elo_history

#### `sessions`
- **Purpose**: Independent game sessions with their own courts and settings
- **Key Fields**: name, description, court count, session stats, active status
- **Relationships**: One-to-many with session_players, matches, courts

#### `session_players`
- **Purpose**: Many-to-many relationship between players and sessions
- **Key Fields**: session-specific stats, ELO progression, join/leave timestamps
- **Constraints**: Unique player per session, prevents double-booking

#### `matches`
- **Purpose**: Individual badminton matches with teams and results
- **Key Fields**: teams (4 player IDs), winner, scores, timing, court number
- **Constraints**: Validates different players, completion status

#### `elo_history`
- **Purpose**: Track ELO changes over time for analytics
- **Key Fields**: before/after ELO, change amount, match context
- **Analytics**: Player progression, performance trends

### Supporting Tables

#### `courts`
- **Purpose**: Court management within sessions
- **Key Fields**: court number, availability, current match

#### `match_events`
- **Purpose**: Detailed match event tracking
- **Key Fields**: event type, event data (JSON), timestamps

#### `session_settings`
- **Purpose**: Customizable session rules and preferences
- **Key Fields**: ELO settings, match duration, notifications

## 🚀 Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and anon key

### 2. Run Database Schema
1. Open Supabase SQL Editor
2. Copy contents of `database/schema.sql`
3. Execute the SQL to create all tables, indexes, and constraints

### 3. Configure Environment Variables
Create `.env.local` file in project root:
```env
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 5. Enable Real-time (Optional)
In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for tables: players, sessions, matches
3. Configure real-time policies

## 📈 Data Migration

The app includes automatic migration from localStorage to Supabase:

### Migration Process
1. **Existing Data Detection**: Checks for localStorage data
2. **Schema Mapping**: Maps old structure to new database schema
3. **Batch Processing**: Migrates data in batches for performance
4. **Validation**: Ensures data integrity during migration
5. **Backup**: Optionally keeps localStorage backup

### Manual Migration
If needed, you can trigger migration manually:
```javascript
import databaseService from './src/services/DatabaseService';
await databaseService.migrateExistingData();
```

## 🔄 Real-time Features

### Supported Real-time Updates
- **Player Stats**: Live ELO and match count updates
- **Session Changes**: Players joining/leaving sessions
- **Match Updates**: Live match completion and court status
- **Leaderboard**: Real-time ranking updates

### Implementation
```javascript
// Enable real-time sync
import { useGameData } from './src/hooks/useGameData';

const { enableRealtimeSync } = useGameData();
await enableRealtimeSync();
```

## 📊 Analytics Capabilities

### Available Analytics
1. **Player Performance**: Win rates, ELO progression, match history
2. **Session Statistics**: Match counts, duration, player participation
3. **Historical Trends**: ELO changes over time, improvement tracking
4. **Comparative Analysis**: Player vs player statistics

### Sample Queries
```sql
-- Top 10 players by ELO
SELECT * FROM player_leaderboard LIMIT 10;

-- Session performance summary
SELECT 
    s.name,
    COUNT(DISTINCT sp.player_id) as players,
    COUNT(m.id) as matches,
    AVG(sp.session_elo_current) as avg_elo
FROM sessions s
LEFT JOIN session_players sp ON s.id = sp.session_id
LEFT JOIN matches m ON s.id = m.session_id
GROUP BY s.id, s.name;

-- Player ELO progression
SELECT 
    eh.created_at,
    eh.elo_before,
    eh.elo_after,
    eh.elo_change,
    eh.was_winner
FROM elo_history eh
WHERE eh.player_id = 'PLAYER_ID'
ORDER BY eh.created_at;
```

## 🔐 Security Considerations

### Row Level Security (RLS)
- **Enabled**: All tables have RLS enabled
- **Current Policy**: Allow all (development mode)
- **Future**: Will be restricted based on user authentication

### Data Validation
- **Constraints**: Database-level validation for data integrity
- **Triggers**: Automatic timestamp updates
- **Indexes**: Optimized for common query patterns

### Authentication (Future)
- **User Accounts**: Link sessions to user accounts
- **Access Control**: Restrict data access based on ownership
- **Multi-tenancy**: Support multiple organizations

## 🛠️ Development Workflow

### Local Development
1. Use localStorage mode (current implementation)
2. Test with sample data
3. Validate business logic

### Staging/Production
1. Connect to Supabase
2. Run migrations
3. Enable real-time sync
4. Monitor performance

### Testing
1. **Unit Tests**: Business logic validation
2. **Integration Tests**: Database operations
3. **E2E Tests**: Full user workflows
4. **Performance Tests**: Large dataset handling

## 📝 Future Enhancements

### Planned Features
- **User Authentication**: Supabase Auth integration
- **Multi-tenancy**: Support multiple organizations
- **Advanced Analytics**: Dashboard with charts and insights
- **Export/Import**: Data backup and restoration
- **API Layer**: REST/GraphQL API for external integrations
- **Mobile App**: React Native app using same backend

### Scalability Considerations
- **Horizontal Scaling**: Supabase handles database scaling
- **Caching**: Redis layer for frequently accessed data
- **CDN**: Static asset optimization
- **Real-time Limits**: Rate limiting for real-time updates

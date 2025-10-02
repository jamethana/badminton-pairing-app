# Badminton Application - System Architecture Document

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER (Flutter)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  iOS App     │  │ Android App  │  │  Web App     │                 │
│  │ (Flutter)    │  │ (Flutter)    │  │ (Flutter)    │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            │                                            │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │  HTTPS/WSS       │
                    │  (TLS 1.3)       │
                    └────────┬─────────┘
                             │
┌────────────────────────────┼────────────────────────────────────────────┐
│                   API GATEWAY / LOAD BALANCER                          │
│            (NGINX / AWS ALB / Google Cloud Load Balancer)              │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
            ┌───────▼──────┐   ┌──────▼────────┐
            │   REST API   │   │   WebSocket   │
            │   Server     │   │   Server      │
            │ (Express.js) │   │ (Socket.IO)   │
            └───────┬──────┘   └──────┬────────┘
                    │                  │
┌───────────────────┼──────────────────┼──────────────────────────────────┐
│                   │  APPLICATION TIER (Node.js)                        │
│  ┌────────────────┼──────────────────┼────────────────────────────┐    │
│  │                │                  │                            │    │
│  │  ┌─────────────▼────┐   ┌─────────▼──────┐   ┌─────────────┐  │    │
│  │  │ Auth Service     │   │ Session Service │   │ Match Svc   │  │    │
│  │  │ - OAuth Handler  │   │ - CRUD         │   │ - TrueSkill │  │    │
│  │  │ - JWT Manager    │   │ - Matchmaking  │   │ - Stats     │  │    │
│  │  └──────────────────┘   └────────────────┘   └─────────────┘  │    │
│  │                                                                 │    │
│  │  ┌────────────────┐   ┌────────────────┐   ┌──────────────┐   │    │
│  │  │ User Service   │   │ Rating Service │   │ Real-time    │   │    │
│  │  │ - Profile      │   │ - History      │   │ - Updates    │   │    │
│  │  │ - Org Mgmt     │   │ - Calculations │   │ - Live Score │   │    │
│  │  └────────┬───────┘   └────────┬───────┘   └──────┬───────┘   │    │
│  └───────────┼──────────────────────┼──────────────────┼───────────┘    │
└──────────────┼──────────────────────┼──────────────────┼────────────────┘
               │                      │                  │
               └──────────────────────┼──────────────────┘
                                      │
┌─────────────────────────────────────┼──────────────────────────────────┐
│                          DATA TIER                                     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL 17.x                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │ Primary DB   │──│ Read Replica │  │ Read Replica │         │   │
│  │  │ (Read/Write) │  │ (Read Only)  │  │ (Read Only)  │         │   │
│  │  └──────┬───────┘  └──────────────┘  └──────────────┘         │   │
│  │         │                                                       │   │
│  │  ┌──────▼────────────────────────────────────────────────┐    │   │
│  │  │  Connection Pooler (PgBouncer / Amazon RDS Proxy)     │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    Redis / ElastiCache                         │   │
│  │  - Session Store                                              │   │
│  │  - Real-time Presence Data                                    │   │
│  │  - API Response Cache                                         │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Flutter 3.x | Cross-platform mobile/web app |
| **State Management** | Riverpod / Provider | Reactive state management |
| **API Communication** | Dio / http | REST API client |
| **Real-time** | Socket.IO Client | WebSocket communication |
| **Backend API** | Node.js + Express.js | REST API server |
| **Real-time Server** | Socket.IO | WebSocket server |
| **Authentication** | Clerk + Line OAuth | Secure authentication |
| **Database** | PostgreSQL 17.x | Primary data store |
| **Cache** | Redis | Session & cache layer |
| **File Storage** | S3 / Cloud Storage | Avatar images, QR codes |

---

## 2. Flutter Frontend Architecture

### 2.1 Clean Architecture Layers

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                         UI (Widgets)                          │     │
│  │  - Pages (SessionListPage, MatchDetailPage)                  │     │
│  │  - Components (PlayerCard, MatchScoreWidget)                 │     │
│  │  - Screens (AuthScreen, ProfileScreen)                       │     │
│  └────────────────────────────┬─────────────────────────────────┘     │
│                                │                                       │
│  ┌────────────────────────────▼─────────────────────────────────┐     │
│  │                    STATE MANAGEMENT                           │     │
│  │                     (Riverpod)                                │     │
│  │  - Providers (sessionProvider, userProvider)                 │     │
│  │  - StateNotifiers (MatchStateNotifier)                       │     │
│  │  - ViewModels (SessionViewModel)                             │     │
│  └────────────────────────────┬─────────────────────────────────┘     │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │
┌────────────────────────────────┼───────────────────────────────────────┐
│                          DOMAIN LAYER                                  │
│  ┌────────────────────────────▼─────────────────────────────────┐     │
│  │                        USE CASES                              │     │
│  │  - GetUserSessions, CreateMatch, JoinSession                 │     │
│  │  - UpdateMatchScore, CalculateRatings                        │     │
│  └────────────────────────────┬─────────────────────────────────┘     │
│                                │                                       │
│  ┌────────────────────────────▼─────────────────────────────────┐     │
│  │                         ENTITIES                              │     │
│  │  - User, Session, Match, Rating, Organization                │     │
│  │  - Business Logic & Validation                               │     │
│  └────────────────────────────┬─────────────────────────────────┘     │
│                                │                                       │
│  ┌────────────────────────────▼─────────────────────────────────┐     │
│  │                  REPOSITORY INTERFACES                        │     │
│  │  - IAuthRepository, ISessionRepository                       │     │
│  │  - IMatchRepository, IRatingRepository                       │     │
│  └───────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼───────────────────────────────────────┐
│                           DATA LAYER                                   │
│  ┌────────────────────────────▼─────────────────────────────────┐     │
│  │                   REPOSITORY IMPLEMENTATIONS                  │     │
│  │  - AuthRepositoryImpl, SessionRepositoryImpl                 │     │
│  │  - Uses Data Sources                                         │     │
│  └────────────────────────────┬─────────────────────────────────┘     │
│                                │                                       │
│  ┌────────────────────────────▼─────────────────────────────────┐     │
│  │                       DATA SOURCES                            │     │
│  │  - Remote: API Client (REST), WebSocket Client               │     │
│  │  - Local: Secure Storage, SQLite Cache                       │     │
│  └────────────────────────────┬─────────────────────────────────┘     │
│                                │                                       │
│  ┌────────────────────────────▼─────────────────────────────────┐     │
│  │                       MODELS (DTOs)                           │     │
│  │  - UserDto, SessionDto, MatchDto                             │     │
│  │  - JSON Serialization/Deserialization                        │     │
│  └───────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Flutter Project Structure

```
lib/
├── main.dart                          # App entry point
├── app/
│   ├── app.dart                       # MaterialApp configuration
│   ├── router.dart                    # GoRouter navigation
│   └── theme.dart                     # App theme
├── core/
│   ├── constants/
│   │   ├── api_constants.dart         # API endpoints
│   │   └── app_constants.dart         # App-wide constants
│   ├── errors/
│   │   ├── exceptions.dart            # Custom exceptions
│   │   └── failures.dart              # Failure classes
│   ├── network/
│   │   ├── api_client.dart            # Dio HTTP client
│   │   └── websocket_client.dart      # Socket.IO client
│   ├── utils/
│   │   ├── validators.dart            # Input validators
│   │   ├── helpers.dart               # Helper functions
│   │   └── result.dart                # Result/Either pattern
│   ├── events/
│   │   └── app_event_bus.dart         # Event bus for cross-feature communication
│   ├── feature_flags/
│   │   └── feature_flags.dart         # Feature flag management
│   └── di/
│       └── injection.dart             # Dependency injection (get_it)
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── models/
│   │   │   │   └── user_dto.dart
│   │   │   ├── datasources/
│   │   │   │   ├── auth_remote_datasource.dart
│   │   │   │   └── auth_local_datasource.dart
│   │   │   └── repositories/
│   │   │       └── auth_repository_impl.dart
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user.dart
│   │   │   ├── repositories/
│   │   │   │   └── auth_repository.dart
│   │   │   └── usecases/
│   │   │       ├── login_with_google.dart
│   │   │       └── logout.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── auth_provider.dart
│   │       ├── pages/
│   │       │   ├── login_page.dart
│   │       │   └── welcome_page.dart
│   │       └── widgets/
│   │           └── oauth_button.dart
│   ├── sessions/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       ├── providers/
│   │       │   ├── session_provider.dart
│   │       │   └── realtime_session_provider.dart  # WebSocket state
│   │       ├── pages/
│   │       │   ├── session_list_page.dart
│   │       │   ├── session_detail_page.dart
│   │       │   └── create_session_page.dart
│   │       └── widgets/
│   │           ├── session_card.dart
│   │           ├── qr_scanner.dart
│   │           └── invite_code_input.dart
│   ├── matches/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       ├── providers/
│   │       │   ├── match_provider.dart
│   │       │   └── live_match_provider.dart       # Real-time match updates
│   │       ├── pages/
│   │       │   ├── match_list_page.dart
│   │       │   ├── live_match_page.dart
│   │       │   └── match_result_page.dart
│   │       └── widgets/
│   │           ├── match_score_widget.dart
│   │           └── player_match_card.dart
│   └── profile/
│       ├── data/
│       ├── domain/
│       └── presentation/
└── shared/
    ├── widgets/
    │   ├── custom_button.dart
    │   ├── loading_indicator.dart
    │   └── error_widget.dart
    └── providers/
        └── connectivity_provider.dart
```

### 2.3 State Management with Riverpod (Example)

```dart
// lib/features/sessions/presentation/providers/session_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/session.dart';
import '../../domain/usecases/get_user_sessions.dart';

// Provider for session list state
final sessionListProvider = StateNotifierProvider<SessionListNotifier, AsyncValue<List<Session>>>((ref) {
  final getUserSessions = ref.read(getUserSessionsUseCaseProvider);
  return SessionListNotifier(getUserSessions);
});

class SessionListNotifier extends StateNotifier<AsyncValue<List<Session>>> {
  final GetUserSessions _getUserSessions;
  
  SessionListNotifier(this._getUserSessions) : super(const AsyncValue.loading()) {
    loadSessions();
  }
  
  Future<void> loadSessions() async {
    state = const AsyncValue.loading();
    try {
      final sessions = await _getUserSessions.execute();
      state = AsyncValue.data(sessions);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
  
  Future<void> refreshSessions() async {
    await loadSessions();
  }
}

// Usage in UI
class SessionListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(sessionListProvider);
    
    return sessionsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => ErrorWidget(error: error.toString()),
      data: (sessions) => ListView.builder(
        itemCount: sessions.length,
        itemBuilder: (context, index) => SessionCard(session: sessions[index]),
      ),
    );
  }
}
```

### 2.4 Real-Time Updates with WebSocket

```dart
// lib/core/network/websocket_client.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class WebSocketClient {
  IO.Socket? _socket;
  final String baseUrl;
  
  WebSocketClient(this.baseUrl);
  
  Future<void> connect(String token) async {
    _socket = IO.io(baseUrl, 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': token})
        .enableAutoConnect()
        .build()
    );
    
    _socket!.onConnect((_) {
      print('Connected to WebSocket');
    });
    
    _socket!.onDisconnect((_) {
      print('Disconnected from WebSocket');
    });
  }
  
  void joinSession(String sessionId) {
    _socket?.emit('join:session', {'sessionId': sessionId});
  }
  
  void listenToMatchUpdates(Function(Map<String, dynamic>) callback) {
    _socket?.on('match:updated', (data) => callback(data));
  }
  
  void disconnect() {
    _socket?.disconnect();
  }
}

// lib/features/matches/presentation/providers/live_match_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final liveMatchProvider = StateNotifierProvider.autoDispose.family<
  LiveMatchNotifier, 
  AsyncValue<Match>, 
  String
>((ref, matchId) {
  final wsClient = ref.read(websocketClientProvider);
  return LiveMatchNotifier(wsClient, matchId);
});

class LiveMatchNotifier extends StateNotifier<AsyncValue<Match>> {
  final WebSocketClient _wsClient;
  final String matchId;
  
  LiveMatchNotifier(this._wsClient, this.matchId) : super(const AsyncValue.loading()) {
    _initialize();
  }
  
  void _initialize() {
    _wsClient.listenToMatchUpdates((data) {
      if (data['matchId'] == matchId) {
        final updatedMatch = Match.fromJson(data);
        state = AsyncValue.data(updatedMatch);
      }
    });
  }
  
  @override
  void dispose() {
    // Cleanup WebSocket listeners
    super.dispose();
  }
}
```

---

## 3. Backend API Architecture (Node.js + Express)

### 3.1 Backend Project Structure

```
backend/
├── src/
│   ├── index.ts                       # Application entry point
│   ├── app.ts                         # Express app configuration
│   ├── server.ts                      # HTTP & WebSocket server setup
│   ├── config/
│   │   ├── database.ts                # PostgreSQL configuration
│   │   ├── redis.ts                   # Redis configuration
│   │   ├── auth.ts                    # OAuth & JWT configuration
│   │   └── env.ts                     # Environment variables
│   ├── middleware/
│   │   ├── auth.middleware.ts         # JWT verification
│   │   ├── validation.middleware.ts   # Request validation
│   │   ├── error.middleware.ts        # Global error handler
│   │   ├── rate-limit.middleware.ts   # Rate limiting
│   │   └── logger.middleware.ts       # Request logging
│   ├── routes/
│   │   ├── index.ts                   # Route aggregator
│   │   ├── auth.routes.ts             # /api/v1/auth
│   │   ├── users.routes.ts            # /api/v1/users
│   │   ├── sessions.routes.ts         # /api/v1/sessions
│   │   ├── matches.routes.ts          # /api/v1/matches
│   │   ├── ratings.routes.ts          # /api/v1/ratings
│   │   └── organizations.routes.ts    # /api/v1/organizations
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── session.controller.ts
│   │   ├── match.controller.ts
│   │   └── rating.controller.ts
│   ├── services/
│   │   ├── auth.service.ts            # OAuth & JWT logic
│   │   ├── session.service.ts         # Business logic
│   │   ├── match.service.ts
│   │   ├── rating.service.ts          # TrueSkill calculations
│   │   └── notification.service.ts    # Push notifications
│   ├── repositories/
│   │   ├── user.repository.ts         # Database queries
│   │   ├── session.repository.ts
│   │   ├── match.repository.ts
│   │   └── rating.repository.ts
│   ├── models/
│   │   ├── user.model.ts              # TypeORM / Prisma entities
│   │   ├── session.model.ts
│   │   └── match.model.ts
│   ├── websocket/
│   │   ├── socket.handler.ts          # Socket.IO event handlers
│   │   ├── session.events.ts          # Session-related events
│   │   └── match.events.ts            # Match-related events
│   ├── utils/
│   │   ├── trueskill.ts               # TrueSkill implementation
│   │   ├── validators.ts
│   │   └── helpers.ts
│   └── types/
│       ├── express.d.ts               # Extended Express types
│       └── interfaces.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
└── .env.example
```

### 3.2 Express.js API Server Setup

```typescript
// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';

export function createApp(): Application {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true
  }));
  
  // Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());
  
  // Logging middleware
  app.use(loggerMiddleware);
  
  // API routes
  app.use('/api/v1', routes);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Error handling (must be last)
  app.use(errorMiddleware);
  
  return app;
}
```

```typescript
// src/server.ts
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { initializeWebSocket } from './websocket/socket.handler';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

async function startServer() {
  // Initialize database connections
  await connectDatabase();
  await connectRedis();
  
  // Create Express app
  const app = createApp();
  
  // Create HTTP server
  const httpServer = http.createServer(app);
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(','),
      credentials: true
    },
    transports: ['websocket', 'polling']
  });
  
  initializeWebSocket(io);
  
  // Start server
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
  });
}

startServer().catch(console.error);
```

### 3.3 Authentication Middleware

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedException } from '../utils/exceptions';

interface JWTPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export async function authMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET!
    ) as JWTPayload;
    
    req.user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedException('Invalid token'));
  }
}
```

### 3.4 WebSocket Real-Time Implementation

```typescript
// src/websocket/socket.handler.ts
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { initializeSessionEvents } from './session.events';
import { initializeMatchEvents } from './match.events';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeWebSocket(io: Server) {
  // Authentication middleware for WebSocket
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);
    
    // Initialize event handlers
    initializeSessionEvents(io, socket);
    initializeMatchEvents(io, socket);
    
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
}

// src/websocket/match.events.ts
import { Server, Socket } from 'socket.io';
import { MatchService } from '../services/match.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeMatchEvents(io: Server, socket: AuthenticatedSocket) {
  const matchService = new MatchService();
  
  // Join match room
  socket.on('match:join', async ({ matchId }) => {
    await socket.join(`match:${matchId}`);
    console.log(`User ${socket.userId} joined match ${matchId}`);
  });
  
  // Leave match room
  socket.on('match:leave', async ({ matchId }) => {
    await socket.leave(`match:${matchId}`);
  });
  
  // Update match score (real-time)
  socket.on('match:updateScore', async ({ matchId, team1Score, team2Score }) => {
    try {
      const updatedMatch = await matchService.updateScore(
        matchId, 
        team1Score, 
        team2Score
      );
      
      // Broadcast to all users watching this match
      io.to(`match:${matchId}`).emit('match:scoreUpdated', {
        matchId,
        team1Score: updatedMatch.team1Score,
        team2Score: updatedMatch.team2Score,
        updatedAt: updatedMatch.updatedAt
      });
    } catch (error) {
      socket.emit('match:error', { message: error.message });
    }
  });
  
  // Match completed
  socket.on('match:complete', async ({ matchId, winningTeam }) => {
    try {
      const result = await matchService.completeMatch(matchId, winningTeam);
      
      // Notify all participants about match completion and rating updates
      io.to(`match:${matchId}`).emit('match:completed', {
        matchId,
        winningTeam,
        ratingUpdates: result.ratingUpdates
      });
      
      // Also notify session room about match completion
      const match = await matchService.getById(matchId);
      io.to(`session:${match.sessionId}`).emit('session:matchCompleted', {
        matchId,
        sessionId: match.sessionId
      });
    } catch (error) {
      socket.emit('match:error', { message: error.message });
    }
  });
}
```

---

## 4. Database Layer (PostgreSQL)

### 4.1 Database Configuration with Connection Pooling

```typescript
// src/config/database.ts
import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings for production
  max: 20,                    // Maximum number of clients in pool
  min: 5,                     // Minimum number of clients in pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout for acquiring connection
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_CA_CERT
  } : false
};

export const pool = new Pool(poolConfig);

// Test connection
export async function connectDatabase() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Database pool closed');
});
```

### 4.2 Repository Pattern Example

```typescript
// src/repositories/session.repository.ts
import { pool } from '../config/database';
import { Session, CreateSessionDto } from '../models/session.model';

export class SessionRepository {
  async findById(id: string): Promise<Session | null> {
    const query = `
      SELECT 
        s.*,
        u.player_name as host_name,
        COUNT(DISTINCT sp.user_id) as participant_count,
        COUNT(DISTINCT m.id) as total_matches
      FROM sessions s
      LEFT JOIN users u ON s.host_user_id = u.id
      LEFT JOIN session_participants sp ON s.id = sp.session_id
      LEFT JOIN matches m ON s.id = m.session_id
      WHERE s.id = $1
      GROUP BY s.id, u.player_name
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  async findByInviteCode(inviteCode: string): Promise<Session | null> {
    const query = `
      SELECT * FROM sessions
      WHERE invite_code = $1
        AND allow_code_join = TRUE
        AND (invite_code_expires_at IS NULL OR invite_code_expires_at > NOW())
        AND (max_code_uses IS NULL OR code_uses_count < max_code_uses)
        AND status IN ('scheduled', 'active')
    `;
    
    const result = await pool.query(query, [inviteCode]);
    return result.rows[0] || null;
  }
  
  async create(dto: CreateSessionDto): Promise<Session> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate unique invite code
      const inviteCode = await this.generateUniqueInviteCode();
      
      // Create session
      const insertQuery = `
        INSERT INTO sessions (
          name, description, host_user_id, location_name,
          location_latitude, location_longitude, scheduled_start_time,
          scheduled_end_time, max_players, courts_available,
          invite_code, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled')
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        dto.name,
        dto.description,
        dto.hostUserId,
        dto.locationName,
        dto.locationLatitude,
        dto.locationLongitude,
        dto.scheduledStartTime,
        dto.scheduledEndTime,
        dto.maxPlayers,
        dto.courtsAvailable,
        inviteCode
      ]);
      
      // Add host as first participant
      await client.query(
        `INSERT INTO session_participants (session_id, user_id, status)
         VALUES ($1, $2, 'confirmed')`,
        [result.rows[0].id, dto.hostUserId]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  private async generateUniqueInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let attempts = 0;
    
    while (attempts < 10) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const exists = await pool.query(
        'SELECT 1 FROM sessions WHERE invite_code = $1',
        [code]
      );
      
      if (exists.rows.length === 0) {
        return code;
      }
      
      attempts++;
    }
    
    throw new Error('Failed to generate unique invite code');
  }
}
```

---

## 5. Authentication & Authorization Flow

### 5.1 Clerk + Line OAuth Flow

```
┌──────────┐                                                          ┌──────────┐
│  Flutter │                                                          │   Line   │
│   App    │                                                          │  Login   │
└─────┬────┘                                                          └────┬─────┘
      │                                                                    │
      │ 1. User taps "Sign in with Line"                                  │
      │    (Using Clerk Flutter SDK)                                      │
      │───────────────────────────────────────────────────────────────────▶
      │                                                                    │
      │ 2. Redirect to Line Login consent screen                          │
      │◀───────────────────────────────────────────────────────────────────
      │                                                                    │
      │ 3. User grants permission                                         │
      │───────────────────────────────────────────────────────────────────▶
      │                                                                    │
      │ 4. Clerk handles OAuth callback & creates session                 │
      │◀───────────────────────────────────────────────────────────────────
      │                                                                    │
┌─────▼────┐                                                          ┌────┴─────┐
│  Flutter │                                                          │  Clerk   │
│   App    │                                                          │  Backend │
└─────┬────┘                                                          └────┬─────┘
      │                                                                    │
      │ 5. Clerk SDK returns session token automatically                  │
      │◀───────────────────────────────────────────────────────────────────
      │                                                                    │
      │ 6. Store Clerk session token                                      │
      │                                                                    │
┌─────▼────┐                                                          ┌────┴─────┐
│  Flutter │                                                          │  Backend │
│   App    │                                                          │   API    │
└─────┬────┘                                                          └────┬─────┘
      │                                                                    │
      │ 7. POST /api/v1/auth/clerk                                        │
      │    Authorization: Bearer <clerk_session_token>                    │
      │────────────────────────────────────────────────────────────────────▶
      │                                                                    │
      │                                           8. Verify token with    │
      │                                              Clerk Backend API    │
      │                                           9. Get user from Clerk  │
      │                                          10. Create/sync local user│
      │                                          11. Generate app JWT     │
      │                                                                    │
      │ 12. { "accessToken": "app_jwt", "user": {...} }                  │
      │◀────────────────────────────────────────────────────────────────────
      │                                                                    │
      │ 13. Store app JWT in secure storage                               │
      │                                                                    │
      │ 14. API requests with Authorization header                        │
      │    Authorization: Bearer app_jwt                                  │
      │────────────────────────────────────────────────────────────────────▶
      │                                                                    │
      │                                          15. Verify JWT           │
      │                                          16. Process request      │
      │                                                                    │
      │ 17. Response                                                      │
      │◀────────────────────────────────────────────────────────────────────
      │                                                                    │
```

### 5.2 Flutter Frontend Implementation with Clerk

```dart
// lib/core/services/clerk_auth_service.dart
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ClerkAuthService {
  final _storage = const FlutterSecureStorage();
  
  // Sign in with Line using Clerk
  Future<void> signInWithLine() async {
    try {
      // Clerk handles the OAuth flow automatically
      await Clerk.instance.signIn(
        strategy: Strategy.oauthCustomLine, // Custom Line OAuth
      );
      
      // Get the session token
      final session = Clerk.instance.session;
      if (session != null) {
        // Store Clerk session token
        await _storage.write(
          key: 'clerk_session_token',
          value: session.id,
        );
        
        // Exchange Clerk token for app token with backend
        await _syncWithBackend(session.id);
      }
    } catch (e) {
      throw Exception('Line sign-in failed: $e');
    }
  }
  
  // Exchange Clerk token for app JWT
  Future<void> _syncWithBackend(String clerkSessionToken) async {
    final response = await http.post(
      Uri.parse('${Config.apiUrl}/api/v1/auth/clerk'),
      headers: {
        'Authorization': 'Bearer $clerkSessionToken',
        'Content-Type': 'application/json',
      },
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await _storage.write(key: 'app_jwt', value: data['accessToken']);
    } else {
      throw Exception('Failed to sync with backend');
    }
  }
  
  // Get current user
  User? get currentUser => Clerk.instance.user;
  
  // Sign out
  Future<void> signOut() async {
    await Clerk.instance.signOut();
    await _storage.delete(key: 'clerk_session_token');
    await _storage.delete(key: 'app_jwt');
  }
  
  // Check if user is signed in
  bool get isSignedIn => Clerk.instance.session != null;
}

// lib/main.dart - App setup with Clerk
import 'package:clerk_flutter/clerk_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Clerk with your publishable key
  await Clerk.instance.initialize(
    publishableKey: 'pk_test_YOUR_CLERK_KEY',
  );
  
  runApp(const MyApp());
}

// lib/features/auth/presentation/pages/login_page.dart
class LoginPage extends StatelessWidget {
  const LoginPage({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Badminton Pairing',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 48),
            
            // Sign in with Line button
            ClerkSignInButton(
              strategy: OAuthStrategy.line,
              onPressed: () async {
                final authService = ClerkAuthService();
                await authService.signInWithLine();
                
                // Navigate to home after successful login
                if (authService.isSignedIn) {
                  Navigator.pushReplacementNamed(context, '/home');
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF00B900), // Line green
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset('assets/line_logo.png', height: 24),
                    const SizedBox(width: 12),
                    const Text(
                      'Sign in with Line',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

### 5.3 Backend Implementation with Clerk

```typescript
// src/config/clerk.ts
import { clerkClient } from '@clerk/clerk-sdk-node';

export const clerk = clerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// src/services/auth.service.ts
import { clerk } from '../config/clerk';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';

export class AuthService {
  private userRepository: UserRepository;
  
  constructor() {
    this.userRepository = new UserRepository();
  }
  
  async clerkLogin(clerkSessionToken: string) {
    try {
      // Verify Clerk session token
      const session = await clerk.sessions.verifySession(
        clerkSessionToken,
        process.env.CLERK_SECRET_KEY!
      );
      
      // Get user from Clerk
      const clerkUser = await clerk.users.getUser(session.userId);
      
      // Extract Line user info from external accounts
      const lineAccount = clerkUser.externalAccounts.find(
        (account) => account.provider === 'oauth_line'
      );
      
      if (!lineAccount) {
        throw new Error('Line account not found');
      }
      
      // Find or create user in local database
      let user = await this.userRepository.findByClerkId(clerkUser.id);
      
      if (!user) {
        user = await this.userRepository.create({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          oauthProvider: 'line',
          oauthProviderId: lineAccount.externalId,
          playerName: await this.generateUniquePlayerName(
            clerkUser.firstName || 'Player'
          ),
          avatarUrl: clerkUser.imageUrl || lineAccount.avatarUrl,
        });
      } else {
        // Update user info
        await this.userRepository.update(user.id, {
          avatarUrl: clerkUser.imageUrl,
          lastLoginAt: new Date(),
        });
      }
      
      // Generate app JWT token
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken);
      
      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          playerName: user.playerName,
          avatarUrl: user.avatarUrl,
          trueskillRating: user.trueskillRating,
        },
      };
    } catch (error) {
      throw new Error(`Clerk authentication failed: ${error.message}`);
    }
  }
  
  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        clerkId: user.clerkId,
        email: user.email,
        playerName: user.playerName,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' } // Short-lived access token
    );
  }
  
  private generateRefreshToken(user: any): string {
    return jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' } // Long-lived refresh token
    );
  }
  
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as any;
      
      const isValid = await this.verifyRefreshToken(
        decoded.userId,
        refreshToken
      );
      if (!isValid) {
        throw new Error('Invalid refresh token');
      }
      
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const accessToken = this.generateAccessToken(user);
      
      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
  
  private async generateUniquePlayerName(baseName: string): Promise<string> {
    let playerName = baseName;
    let counter = 1;
    
    while (await this.userRepository.existsByPlayerName(playerName)) {
      playerName = `${baseName}${counter}`;
      counter++;
    }
    
    return playerName;
  }
  
  private async storeRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    // Store in Redis or database
    await this.userRepository.updateRefreshToken(userId, refreshToken);
  }
  
  private async verifyRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<boolean> {
    const storedToken = await this.userRepository.getRefreshToken(userId);
    return storedToken === refreshToken;
  }
}

// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService: AuthService;
  
  constructor() {
    this.authService = new AuthService();
  }
  
  async clerkLogin(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract Clerk session token from Authorization header
      const clerkSessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!clerkSessionToken) {
        return res.status(401).json({ error: 'No session token provided' });
      }
      
      const result = await this.authService.clerkLogin(clerkSessionToken);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }
      
      const result = await this.authService.refreshAccessToken(refreshToken);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// Clerk authentication endpoint
router.post('/clerk', (req, res, next) => authController.clerkLogin(req, res, next));

// Refresh token endpoint
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));

export default router;
```

### 5.4 Setting Up Line as Custom OAuth Provider in Clerk

**Step 1: Configure Line Login Channel**

1. Go to [Line Developers Console](https://developers.line.biz/console/)
2. Create a new Provider (or select existing)
3. Create a new Line Login channel
4. Note down:
   - **Channel ID** (Client ID)
   - **Channel Secret** (Client Secret)
5. Set Callback URL to Clerk's callback:
   ```
   https://[your-clerk-domain]/v1/oauth_callback
   ```

**Step 2: Configure Custom OAuth in Clerk Dashboard**

1. Go to Clerk Dashboard → Authentication → Social Connections
2. Click "Add connection" → "Custom OAuth"
3. Configure Line provider:

```json
{
  "provider": "line",
  "name": "Line",
  "strategy": "oauth_custom_line",
  "client_id": "YOUR_LINE_CHANNEL_ID",
  "client_secret": "YOUR_LINE_CHANNEL_SECRET",
  "authorization_url": "https://access.line.me/oauth2/v2.1/authorize",
  "token_url": "https://api.line.me/oauth2/v2.1/token",
  "userinfo_url": "https://api.line.me/v2/profile",
  "scope": "profile openid email",
  "user_id_param": "userId",
  "email_param": "email",
  "first_name_param": "displayName",
  "avatar_url_param": "pictureUrl"
}
```

**Step 3: Update Database Schema for Clerk**

```sql
-- Add clerk_id column to users table
ALTER TABLE users 
ADD COLUMN clerk_id VARCHAR(255) UNIQUE,
ADD COLUMN clerk_created_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX idx_users_clerk_id ON users(clerk_id);

-- Update oauth_provider to support 'line'
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_oauth_provider_check;

ALTER TABLE users 
ADD CONSTRAINT users_oauth_provider_check 
CHECK (oauth_provider IN ('google', 'github', 'line'));
```

**Step 4: Environment Variables**

```bash
# .env (Backend)
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key

# JWT secrets for app tokens
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=badminton_db
DB_USER=postgres
DB_PASSWORD=your-password
```

```dart
// Flutter - lib/core/config/config.dart
class Config {
  static const clerkPublishableKey = String.fromEnvironment(
    'CLERK_PUBLISHABLE_KEY',
    defaultValue: 'pk_test_your_clerk_publishable_key',
  );
  
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://api.yourdomain.com',
  );
}
```

**Step 5: Package Dependencies**

```yaml
# pubspec.yaml (Flutter)
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.4.0
  
  # Authentication
  clerk_flutter: ^1.0.0
  
  # Network
  dio: ^5.4.0
  http: ^1.1.0
  socket_io_client: ^2.0.3+1
  
  # Navigation
  go_router: ^13.0.0
  
  # Dependency Injection
  get_it: ^7.6.0
  
  # Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2
  
  # Feature Flags
  firebase_core: ^2.24.2
  firebase_remote_config: ^4.3.8
  
  # QR Code & Maps
  qr_code_scanner: ^1.0.1
  qr_flutter: ^4.1.0
  google_maps_flutter: ^2.5.0
  
  # Utilities
  intl: ^0.18.1
  uuid: ^4.3.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  mockito: ^5.4.4
  build_runner: ^2.4.8
```

**📚 For detailed implementation of architectural patterns (Result, DI, Navigation, Event Bus, Feature Flags), see [`ARCHITECTURE_ENHANCEMENTS.md`](./ARCHITECTURE_ENHANCEMENTS.md)**

```json
// package.json (Backend)
{
  "dependencies": {
    "@clerk/clerk-sdk-node": "^5.0.0",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "socket.io": "^4.7.2",
    "dotenv": "^16.3.1"
  }
}
```

**Benefits of Using Clerk:**

✅ **Simplified Authentication**
- Clerk handles OAuth flow, token management, and session handling
- No need to implement OAuth 2.0 flow manually
- Automatic token refresh

✅ **Built-in User Management**
- User dashboard in Clerk portal
- Profile management UI components
- Email verification and password reset

✅ **Security**
- Enterprise-grade security
- Automatic session management
- Built-in XSS and CSRF protection

✅ **Developer Experience**
- Pre-built UI components
- Comprehensive SDKs for Flutter and Node.js
- Easy to add more OAuth providers later

✅ **Flexibility**
- Custom OAuth providers (Line, etc.)
- Webhooks for user events
- Customizable user metadata

---

## 6. Real-Time Features Implementation

### 6.1 Real-Time Match Scheduling Notification

```typescript
// src/services/match.service.ts
export class MatchService {
  async scheduleMatch(sessionId: string, matchData: CreateMatchDto) {
    const match = await this.matchRepository.create(matchData);
    
    // Emit real-time notification to all session participants
    const io = getSocketIOInstance();
    io.to(`session:${sessionId}`).emit('match:scheduled', {
      matchId: match.id,
      sessionId: sessionId,
      court: match.courtNumber,
      scheduledTime: match.scheduledStartTime,
      players: {
        team1: [match.team1Player1Id, match.team1Player2Id],
        team2: [match.team2Player1Id, match.team2Player2Id]
      }
    });
    
    // Send push notifications to players
    await this.sendMatchNotifications(match);
    
    return match;
  }
  
  private async sendMatchNotifications(match: Match) {
    const playerIds = [
      match.team1Player1Id,
      match.team1Player2Id,
      match.team2Player1Id,
      match.team2Player2Id
    ];
    
    for (const playerId of playerIds) {
      await this.notificationService.send(playerId, {
        title: 'Match Scheduled',
        body: `Your match on Court ${match.courtNumber} starts soon!`,
        data: { matchId: match.id, type: 'match_scheduled' }
      });
    }
  }
}
```

### 6.2 Flutter Real-Time Match Widget

```dart
// lib/features/matches/presentation/widgets/scheduled_match_widget.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ScheduledMatchWidget extends ConsumerStatefulWidget {
  final String sessionId;
  
  const ScheduledMatchWidget({required this.sessionId});
  
  @override
  ConsumerState<ScheduledMatchWidget> createState() => _ScheduledMatchWidgetState();
}

class _ScheduledMatchWidgetState extends ConsumerState<ScheduledMatchWidget> {
  @override
  void initState() {
    super.initState();
    // Join session room for real-time updates
    ref.read(websocketClientProvider).joinSession(widget.sessionId);
  }
  
  @override
  Widget build(BuildContext context) {
    final scheduledMatches = ref.watch(scheduledMatchesProvider(widget.sessionId));
    
    // Listen for real-time match scheduling
    ref.listen(realtimeMatchProvider(widget.sessionId), (previous, next) {
      next.whenData((newMatch) {
        // Show notification when match is scheduled
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('New match scheduled on Court ${newMatch.court}!'),
            action: SnackBarAction(
              label: 'View',
              onPressed: () {
                Navigator.pushNamed(
                  context, 
                  '/match/${newMatch.id}'
                );
              },
            ),
          ),
        );
      });
    });
    
    return scheduledMatches.when(
      loading: () => const CircularProgressIndicator(),
      error: (error, stack) => Text('Error: $error'),
      data: (matches) {
        if (matches.isEmpty) {
          return const Center(child: Text('No scheduled matches'));
        }
        
        return ListView.builder(
          itemCount: matches.length,
          itemBuilder: (context, index) {
            final match = matches[index];
            return MatchCard(
              match: match,
              isMyMatch: match.hasPlayer(ref.read(currentUserProvider).value!.id),
            );
          },
        );
      },
    );
  }
}
```

---

## 7. Deployment Architecture (Regional Scale)

### 7.1 Production Deployment on AWS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLOUDFLARE / ROUTE 53                        │
│                         (DNS + DDoS Protection)                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                      ┌───────────▼───────────┐
                      │  AWS Application      │
                      │  Load Balancer (ALB)  │
                      │  + SSL/TLS            │
                      └───────────┬───────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
         ┌────────▼──────┐  ┌────▼──────┐  ┌────▼──────┐
         │  ECS/Fargate  │  │  ECS/Fargate │  │  ECS/Fargate │
         │  Container 1  │  │  Container 2 │  │  Container 3 │
         │  (API+WS)     │  │  (API+WS)    │  │  (API+WS)    │
         └───────┬───────┘  └─────┬────────┘  └─────┬────────┘
                 │                │                  │
                 └────────────────┼──────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
    ┌────▼───────┐      ┌────────▼──────────┐    ┌───────▼──────┐
    │   RDS      │      │  ElastiCache      │    │     S3       │
    │ PostgreSQL │      │    (Redis)        │    │  (Avatars,   │
    │  Primary   │      │  - Sessions       │    │   QR Codes)  │
    │            │      │  - Cache          │    └──────────────┘
    │  ┌─────────┴──┐   └───────────────────┘
    │  │ Read Replica│
    │  └────────────┘
    └────────────────┘
```

### 7.2 Cost-Optimized Deployment (Regional App)

**Estimated Monthly Costs (AWS):**
- **ECS Fargate** (3 containers): ~$100-150
- **RDS PostgreSQL** (db.t4g.small): ~$30-40
- **ElastiCache Redis** (cache.t4g.micro): ~$15-20
- **S3 Storage** (avatars, QR codes): ~$5-10
- **Data Transfer**: ~$10-30
- **Total**: ~$160-250/month for ~1000-5000 active users

**Alternative: DigitalOcean (Lower Cost)**
- **App Platform** (3 containers): ~$36/month
- **Managed PostgreSQL**: ~$15/month
- **Managed Redis**: ~$15/month
- **Spaces (S3-compatible)**: ~$5/month
- **Total**: ~$71/month

---

## 8. Best Practices Summary

### 8.1 Frontend (Flutter) Best Practices

✅ **State Management**
- Use Riverpod for predictable state management
- Implement proper error handling with `AsyncValue`
- Use `autoDispose` for temporary providers

✅ **Performance**
- Lazy load lists with pagination
- Cache images and API responses
- Use `const` constructors where possible

✅ **Security**
- Store tokens in `flutter_secure_storage`
- Validate all user inputs
- Implement certificate pinning for production

### 8.2 Backend (Node.js) Best Practices

✅ **API Design**
- Follow RESTful conventions
- Implement proper HTTP status codes
- Version your APIs (`/api/v1/`)

✅ **Performance**
- Use connection pooling (PostgreSQL + Redis)
- Implement caching strategy
- Add pagination for list endpoints

✅ **Security**
- Use Helmet.js for security headers
- Implement rate limiting
- Validate and sanitize all inputs
- Use parameterized queries (prevent SQL injection)

### 8.3 Database Best Practices

✅ **Indexing Strategy**
```sql
-- Essential indexes from your schema
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);
CREATE INDEX idx_sessions_invite_code ON sessions(invite_code);
CREATE INDEX idx_sessions_scheduled_start ON sessions(scheduled_start_time);
CREATE INDEX idx_matches_session ON matches(session_id);
CREATE INDEX idx_rating_history_user_timeline ON rating_history(user_id, created_at);
```

✅ **Query Optimization**
- Use connection pooling (20 max connections)
- Implement read replicas for analytics
- Use `EXPLAIN ANALYZE` for slow queries

✅ **Data Integrity**
- Always use transactions for multi-table operations
- Implement proper foreign key constraints
- Regular backups with point-in-time recovery

---

## 9. Monitoring & Observability

### 9.1 Logging Strategy

```typescript
// Use structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'badminton-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log important events
logger.info('Match completed', {
  matchId: match.id,
  sessionId: match.sessionId,
  duration: match.matchDurationMinutes,
  winner: match.winningTeam
});
```

### 9.2 Metrics to Track

**Application Metrics:**
- API response times (p50, p95, p99)
- WebSocket connection count
- Active sessions count
- Matches per hour

**Database Metrics:**
- Query execution time
- Connection pool usage
- Slow query count
- Cache hit rate

**Business Metrics:**
- Daily active users (DAU)
- Sessions created per day
- Matches played per session
- User retention rate

---

## 10. Future Scalability Considerations

### 10.1 Horizontal Scaling

When user base grows beyond regional scale:

1. **Database Sharding** by geographic region
2. **Microservices Architecture** (split monolith into services)
3. **CDN for Static Assets** (CloudFlare, CloudFront)
4. **Message Queue** (RabbitMQ, AWS SQS) for async processing
5. **Kubernetes** for container orchestration

### 10.2 Performance Targets

**Regional App (Target):**
- Support 10,000 active users
- 100 concurrent sessions
- < 200ms API response time (p95)
- 99.9% uptime

**API Rate Limits:**
- 100 requests/minute per user
- 1000 requests/minute per IP

---

This architecture provides a solid foundation for your badminton app with real-time features, OAuth authentication, and scalability for regional deployment. The Flutter frontend with Riverpod state management ensures a reactive UI, while the Node.js/Express backend with Socket.IO handles real-time match updates efficiently.


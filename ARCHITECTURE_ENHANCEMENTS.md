# Architecture Enhancements - Flutter Best Practices

## Overview

This document details the core architectural patterns and enhancements for the Badminton Pairing Flutter application. These patterns follow industry best practices and ensure scalability, testability, and maintainability.

---

## 1. Result Pattern for Error Handling

### Purpose
Provides type-safe error handling without exceptions, making error states explicit and easy to handle.

### Implementation

```dart
// lib/core/utils/result.dart
sealed class Result<T> {
  const Result();
}

class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

class Failure<T> extends Result<T> {
  final String message;
  final Exception? exception;
  const Failure(this.message, [this.exception]);
}

// Extension for convenience
extension ResultExtension<T> on Result<T> {
  bool get isSuccess => this is Success<T>;
  bool get isFailure => this is Failure<T>;
  
  T? get dataOrNull => this is Success<T> ? (this as Success<T>).data : null;
  String? get errorOrNull => this is Failure<T> ? (this as Failure<T>).message : null;
  
  R fold<R>({
    required R Function(T data) onSuccess,
    required R Function(String error) onFailure,
  }) {
    if (this is Success<T>) {
      return onSuccess((this as Success<T>).data);
    } else {
      return onFailure((this as Failure<T>).message);
    }
  }
}
```

### Usage Examples

**In Repository:**
```dart
class SessionRepositoryImpl implements ISessionRepository {
  @override
  Future<Result<List<Session>>> getSessions() async {
    try {
      final response = await _apiClient.get('/sessions');
      final sessions = (response.data as List)
          .map((json) => Session.fromJson(json))
          .toList();
      return Success(sessions);
    } on DioException catch (e) {
      return Failure('Failed to fetch sessions: ${e.message}');
    } catch (e) {
      return Failure('Unexpected error: $e');
    }
  }
}
```

**In UseCase:**
```dart
class GetSessionsUseCase {
  final ISessionRepository repository;
  
  GetSessionsUseCase(this.repository);
  
  Future<Result<List<Session>>> call() async {
    return await repository.getSessions();
  }
}
```

**In Provider:**
```dart
final sessionsProvider = FutureProvider<Result<List<Session>>>((ref) async {
  final useCase = ref.read(getSessionsUseCaseProvider);
  return await useCase();
});
```

**In UI:**
```dart
class SessionListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(sessionsProvider);
    
    return sessionsAsync.when(
      data: (result) => result.fold(
        onSuccess: (sessions) => ListView.builder(
          itemCount: sessions.length,
          itemBuilder: (context, index) => SessionCard(sessions[index]),
        ),
        onFailure: (error) => ErrorWidget(message: error),
      ),
      loading: () => const CircularProgressIndicator(),
      error: (error, stack) => ErrorWidget(message: error.toString()),
    );
  }
}
```

---

## 2. Dependency Injection with GetIt

### Purpose
Provides a service locator pattern for managing dependencies, making code testable and decoupled.

### Implementation

```dart
// lib/core/di/injection.dart
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final getIt = GetIt.instance;

Future<void> setupDependencyInjection() async {
  // Core
  getIt.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(),
  );
  
  // Network
  getIt.registerLazySingleton<Dio>(
    () => Dio(BaseOptions(
      baseUrl: Config.apiUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ))..interceptors.add(AuthInterceptor(getIt())),
  );
  
  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(getIt<Dio>()),
  );
  
  getIt.registerLazySingleton<WebSocketClient>(
    () => WebSocketClient(Config.wsUrl),
  );
  
  // Auth
  getIt.registerLazySingleton<IAuthRepository>(
    () => AuthRepositoryImpl(
      apiClient: getIt(),
      secureStorage: getIt(),
    ),
  );
  
  getIt.registerLazySingleton(() => LoginUseCase(getIt()));
  getIt.registerLazySingleton(() => LogoutUseCase(getIt()));
  
  // Sessions
  getIt.registerLazySingleton<ISessionRepository>(
    () => SessionRepositoryImpl(
      remoteDataSource: getIt(),
      localDataSource: getIt(),
    ),
  );
  
  getIt.registerLazySingleton(() => GetSessionsUseCase(getIt()));
  getIt.registerLazySingleton(() => CreateSessionUseCase(getIt()));
  getIt.registerLazySingleton(() => JoinSessionUseCase(getIt()));
  
  // Matches
  getIt.registerLazySingleton<IMatchRepository>(
    () => MatchRepositoryImpl(
      remoteDataSource: getIt(),
      webSocketClient: getIt(),
    ),
  );
  
  getIt.registerLazySingleton(() => GetMatchesUseCase(getIt()));
  getIt.registerLazySingleton(() => UpdateMatchScoreUseCase(getIt()));
  getIt.registerLazySingleton(() => CompleteMatchUseCase(getIt()));
}
```

### Auth Interceptor

```dart
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage storage;
  
  AuthInterceptor(this.storage);
  
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await storage.read(key: 'app_jwt');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired, trigger re-authentication
      AppEventBus.fire(UnauthorizedEvent());
    }
    handler.next(err);
  }
}
```

### Main.dart Setup

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Setup dependency injection
  await setupDependencyInjection();
  
  // Initialize Clerk
  await Clerk.instance.initialize(
    publishableKey: Config.clerkPublishableKey,
  );
  
  runApp(
    ProviderScope(
      child: const MyApp(),
    ),
  );
}
```

---

## 3. Navigation with GoRouter

### Purpose
Provides declarative routing with deep linking support and type-safe navigation.

### Implementation

```dart
// lib/app/router.dart
import 'package:go_router/go_router.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  debugLogDiagnostics: true,
  routes: [
    // Auth routes
    GoRoute(
      path: '/',
      name: 'welcome',
      builder: (context, state) => const WelcomePage(),
    ),
    
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => const LoginPage(),
    ),
    
    // Main app routes
    GoRoute(
      path: '/home',
      name: 'home',
      builder: (context, state) => const HomePage(),
    ),
    
    // Sessions
    GoRoute(
      path: '/sessions',
      name: 'sessions',
      builder: (context, state) => const SessionListPage(),
      routes: [
        GoRoute(
          path: ':id',
          name: 'session-detail',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return SessionDetailPage(sessionId: id);
          },
        ),
        GoRoute(
          path: 'create',
          name: 'create-session',
          builder: (context, state) => const CreateSessionPage(),
        ),
        GoRoute(
          path: 'join/:inviteCode',
          name: 'join-session',
          builder: (context, state) {
            final inviteCode = state.pathParameters['inviteCode']!;
            return JoinSessionPage(inviteCode: inviteCode);
          },
        ),
      ],
    ),
    
    // Matches
    GoRoute(
      path: '/matches/:id',
      name: 'match-detail',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        final isLive = state.uri.queryParameters['live'] == 'true';
        return isLive 
          ? LiveMatchPage(matchId: id)
          : MatchDetailPage(matchId: id);
      },
    ),
    
    // Profile
    GoRoute(
      path: '/profile',
      name: 'profile',
      builder: (context, state) => const ProfilePage(),
      routes: [
        GoRoute(
          path: 'edit',
          name: 'edit-profile',
          builder: (context, state) => const EditProfilePage(),
        ),
        GoRoute(
          path: 'stats',
          name: 'player-stats',
          builder: (context, state) => const PlayerStatsPage(),
        ),
      ],
    ),
    
    // Organizations
    GoRoute(
      path: '/organizations/:id',
      name: 'organization',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return OrganizationPage(orgId: id);
      },
    ),
    
    // QR Scanner
    GoRoute(
      path: '/scan-qr',
      name: 'scan-qr',
      builder: (context, state) => const QRScannerPage(),
    ),
  ],
  
  // Redirect logic
  redirect: (context, state) {
    final isLoggedIn = Clerk.instance.session != null;
    final isGoingToAuth = state.matchedLocation == '/' || 
                          state.matchedLocation == '/login';
    
    // Redirect to login if not authenticated
    if (!isLoggedIn && !isGoingToAuth) {
      return '/';
    }
    
    // Redirect to home if already authenticated and going to auth pages
    if (isLoggedIn && isGoingToAuth) {
      return '/home';
    }
    
    return null; // No redirect
  },
  
  // Error handling
  errorBuilder: (context, state) => ErrorPage(error: state.error),
);
```

### Navigation Helpers

```dart
// Extension for type-safe navigation
extension GoRouterExtension on BuildContext {
  void goToSessionDetail(String sessionId) {
    go('/sessions/$sessionId');
  }
  
  void goToLiveMatch(String matchId) {
    go('/matches/$matchId?live=true');
  }
  
  void goToProfile() {
    go('/profile');
  }
  
  void goToJoinSession(String inviteCode) {
    go('/sessions/join/$inviteCode');
  }
  
  void goToQRScanner() {
    go('/scan-qr');
  }
}
```

### App Setup

```dart
// lib/app/app.dart
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Badminton Pairing',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: appRouter,
    );
  }
}
```

---

## 4. Event Bus for Cross-Feature Communication

### Purpose
Enables decoupled communication between features without direct dependencies.

### Implementation

```dart
// lib/core/events/app_event_bus.dart
import 'dart:async';

class AppEventBus {
  static final _controller = StreamController<AppEvent>.broadcast();
  
  static Stream<AppEvent> get stream => _controller.stream;
  
  static void fire(AppEvent event) {
    _controller.add(event);
  }
  
  static StreamSubscription<T> on<T extends AppEvent>(
    void Function(T event) handler,
  ) {
    return _controller.stream
        .where((event) => event is T)
        .cast<T>()
        .listen(handler);
  }
  
  static void dispose() {
    _controller.close();
  }
}

// Base event
abstract class AppEvent {
  final DateTime timestamp;
  
  AppEvent() : timestamp = DateTime.now();
}
```

### Event Definitions

```dart
// lib/core/events/app_events.dart

// Auth events
class UserLoggedInEvent extends AppEvent {
  final String userId;
  final String playerName;
  
  UserLoggedInEvent(this.userId, this.playerName);
}

class UserLoggedOutEvent extends AppEvent {}

class UnauthorizedEvent extends AppEvent {}

// Match events
class MatchScheduledEvent extends AppEvent {
  final String matchId;
  final String sessionId;
  final int courtNumber;
  final DateTime scheduledTime;
  
  MatchScheduledEvent({
    required this.matchId,
    required this.sessionId,
    required this.courtNumber,
    required this.scheduledTime,
  });
}

class MatchCompletedEvent extends AppEvent {
  final String matchId;
  final int winningTeam;
  final Map<String, double> ratingChanges;
  
  MatchCompletedEvent({
    required this.matchId,
    required this.winningTeam,
    required this.ratingChanges,
  });
}

class MatchScoreUpdatedEvent extends AppEvent {
  final String matchId;
  final int team1Score;
  final int team2Score;
  
  MatchScoreUpdatedEvent({
    required this.matchId,
    required this.team1Score,
    required this.team2Score,
  });
}

// Rating events
class RatingUpdatedEvent extends AppEvent {
  final String userId;
  final double oldRating;
  final double newRating;
  
  RatingUpdatedEvent({
    required this.userId,
    required this.oldRating,
    required this.newRating,
  });
}

// Session events
class SessionJoinedEvent extends AppEvent {
  final String sessionId;
  final String userId;
  
  SessionJoinedEvent(this.sessionId, this.userId);
}

class SessionStartedEvent extends AppEvent {
  final String sessionId;
  SessionStartedEvent(this.sessionId);
}
```

### Usage in Features

```dart
// Listening to events
class ProfileViewModel extends StateNotifier<ProfileState> {
  StreamSubscription? _ratingSubscription;
  StreamSubscription? _matchSubscription;
  
  ProfileViewModel() : super(ProfileState.initial()) {
    _setupEventListeners();
  }
  
  void _setupEventListeners() {
    // Listen for rating updates
    _ratingSubscription = AppEventBus.on<RatingUpdatedEvent>((event) {
      if (event.userId == state.user.id) {
        _refreshProfile();
      }
    });
    
    // Listen for completed matches
    _matchSubscription = AppEventBus.on<MatchCompletedEvent>((event) {
      if (event.ratingChanges.containsKey(state.user.id)) {
        _showRatingChangeNotification(event);
      }
    });
  }
  
  @override
  void dispose() {
    _ratingSubscription?.cancel();
    _matchSubscription?.cancel();
    super.dispose();
  }
  
  void _refreshProfile() {
    // Refresh profile data
  }
  
  void _showRatingChangeNotification(MatchCompletedEvent event) {
    // Show notification
  }
}

// Firing events
class MatchService {
  Future<void> completeMatch(String matchId, int winningTeam) async {
    // Complete match logic...
    final ratingChanges = await _calculateRatingChanges(matchId);
    
    // Fire event
    AppEventBus.fire(MatchCompletedEvent(
      matchId: matchId,
      winningTeam: winningTeam,
      ratingChanges: ratingChanges,
    ));
  }
}
```

---

## 5. Feature Flags Management

### Purpose
Enables gradual rollouts, A/B testing, and kill switches for features without code deployments.

### Implementation

```dart
// lib/core/feature_flags/feature_flags.dart
import 'package:firebase_remote_config/firebase_remote_config.dart';

class FeatureFlags {
  static late FirebaseRemoteConfig _remoteConfig;
  
  // Local feature flags (for development)
  static const bool enableRealTimeUpdates = true;
  static const bool enableAdvancedMatchmaking = true;
  static const bool enablePushNotifications = true;
  static const bool enableQRScanning = true;
  static const bool enableOrganizations = true;
  static const bool enableSessionTemplates = true;
  
  // Initialize Remote Config
  static Future<void> initialize() async {
    _remoteConfig = FirebaseRemoteConfig.instance;
    
    await _remoteConfig.setConfigSettings(
      RemoteConfigSettings(
        fetchTimeout: const Duration(seconds: 10),
        minimumFetchInterval: const Duration(hours: 1),
      ),
    );
    
    // Set default values
    await _remoteConfig.setDefaults({
      'enable_real_time_updates': true,
      'enable_advanced_matchmaking': false,
      'enable_push_notifications': true,
      'enable_qr_scanning': true,
      'enable_organizations': true,
      'enable_session_templates': true,
      'min_app_version': '1.0.0',
      'force_update': false,
      'maintenance_mode': false,
      'max_session_participants': 20,
      'max_courts': 10,
    });
    
    // Fetch and activate
    await _remoteConfig.fetchAndActivate();
  }
  
  // Remote feature flags
  static bool get remoteEnableRealTimeUpdates =>
      _remoteConfig.getBool('enable_real_time_updates');
  
  static bool get remoteEnableAdvancedMatchmaking =>
      _remoteConfig.getBool('enable_advanced_matchmaking');
  
  static bool get remoteEnablePushNotifications =>
      _remoteConfig.getBool('enable_push_notifications');
  
  static bool get remoteEnableQRScanning =>
      _remoteConfig.getBool('enable_qr_scanning');
  
  static bool get maintenanceMode =>
      _remoteConfig.getBool('maintenance_mode');
  
  static bool get forceUpdate =>
      _remoteConfig.getBool('force_update');
  
  static String get minAppVersion =>
      _remoteConfig.getString('min_app_version');
  
  static int get maxSessionParticipants =>
      _remoteConfig.getInt('max_session_participants');
  
  static int get maxCourts =>
      _remoteConfig.getInt('max_courts');
  
  // Combined flags (local + remote)
  static bool get shouldUseRealTimeUpdates =>
      enableRealTimeUpdates && remoteEnableRealTimeUpdates;
  
  static bool get shouldUseAdvancedMatchmaking =>
      enableAdvancedMatchmaking && remoteEnableAdvancedMatchmaking;
  
  static bool get shouldUsePushNotifications =>
      enablePushNotifications && remoteEnablePushNotifications;
      
  static bool get shouldUseQRScanning =>
      enableQRScanning && remoteEnableQRScanning;
}
```

### Main.dart Setup

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp();
  await FeatureFlags.initialize();
  await setupDependencyInjection();
  
  // Check maintenance mode
  if (FeatureFlags.maintenanceMode) {
    runApp(const MaintenanceApp());
    return;
  }
  
  // Check force update
  if (FeatureFlags.forceUpdate) {
    runApp(const UpdateRequiredApp());
    return;
  }
  
  runApp(
    ProviderScope(
      child: const MyApp(),
    ),
  );
}
```

### Usage in Features

```dart
class SessionListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sessions')),
      body: Column(
        children: [
          // Conditionally show advanced matchmaking
          if (FeatureFlags.shouldUseAdvancedMatchmaking)
            const AdvancedMatchmakingWidget(),
          
          // Use real-time or static list based on flag
          Expanded(
            child: FeatureFlags.shouldUseRealTimeUpdates
              ? const RealTimeSessionList()
              : const StaticSessionList(),
          ),
        ],
      ),
      
      // Conditionally show QR scanner button
      floatingActionButton: FeatureFlags.shouldUseQRScanning
        ? FloatingActionButton(
            onPressed: () => context.goToQRScanner(),
            child: const Icon(Icons.qr_code_scanner),
          )
        : null,
    );
  }
}

// Validate with feature flags
class CreateSessionPage extends ConsumerWidget {
  void _validateSession(int participants, int courts) {
    if (participants > FeatureFlags.maxSessionParticipants) {
      throw ValidationException(
        'Maximum ${ FeatureFlags.maxSessionParticipants} participants allowed',
      );
    }
    
    if (courts > FeatureFlags.maxCourts) {
      throw ValidationException(
        'Maximum ${FeatureFlags.maxCourts} courts allowed',
      );
    }
  }
}
```

---

## 6. Package Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.4.0
  
  # Authentication
  clerk_flutter: ^1.0.0
  
  # Network
  dio: ^5.4.0
  socket_io_client: ^2.0.3+1
  
  # Navigation
  go_router: ^13.0.0
  
  # Dependency Injection
  get_it: ^7.6.0
  
  # Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # Feature Flags
  firebase_core: ^2.24.2
  firebase_remote_config: ^4.3.8
  
  # QR Code
  qr_code_scanner: ^1.0.1
  qr_flutter: ^4.1.0
  
  # Maps
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

---

## Summary

These architectural enhancements provide:

✅ **Type-Safe Error Handling** with Result pattern  
✅ **Dependency Management** with GetIt  
✅ **Declarative Navigation** with GoRouter  
✅ **Decoupled Communication** with Event Bus  
✅ **Feature Control** with Remote Config  

All patterns follow Clean Architecture principles and are production-ready for your regional-scale badminton application!


import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import 'core/api/api_client.dart';
import 'core/storage/session_store.dart';
import 'features/auth/auth_repository.dart';
import 'features/auth/auth_scope.dart';
import 'features/auth/forgot_password_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/public/public_home_screen.dart';
import 'theme/app_theme.dart';

class C2PMobileApp extends StatefulWidget {
  const C2PMobileApp({super.key});

  @override
  State<C2PMobileApp> createState() => _C2PMobileAppState();
}

class _C2PMobileAppState extends State<C2PMobileApp> {
  late final AuthSession _authSession;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    const storage = FlutterSecureStorage();
    final sessionStore = SessionStore(storage);
    final apiClient = ApiClient(sessionStore);
    _authSession = AuthSession(AuthRepository(apiClient, sessionStore));

    _router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => PublicHomeScreen(authSession: _authSession),
        ),
        GoRoute(
          path: '/auth/login',
          builder: (context, state) => LoginScreen(authSession: _authSession),
        ),
        GoRoute(
          path: '/auth/register',
          builder: (context, state) => RegisterScreen(authSession: _authSession),
        ),
        GoRoute(
          path: '/auth/forgot-password',
          builder: (context, state) => ForgotPasswordScreen(authSession: _authSession),
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => DashboardScreen(authSession: _authSession),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'C2P Mobile',
      debugShowCheckedModeBanner: false,
      theme: buildC2PTheme(),
      routerConfig: _router,
    );
  }
}

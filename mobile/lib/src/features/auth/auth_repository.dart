import '../../core/api/api_client.dart';
import '../../core/storage/session_store.dart';
import 'auth_models.dart';

class AuthRepository {
  const AuthRepository(this._apiClient, this._sessionStore);

  final ApiClient _apiClient;
  final SessionStore _sessionStore;

  Future<AuthUser> login({required String email, required String password}) async {
    final json = await _apiClient.post<Map<String, dynamic>>(
      '/auth/login',
      body: {'email': email.trim(), 'password': password},
    );
    return _extractUser(json);
  }

  Future<AuthUser> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String phone,
    required String role,
    String? location,
    String? publicTitle,
    String? bio,
    List<String>? skills,
    String? website,
    String? preferredLanguage,
  }) async {
    final json = await _apiClient.post<Map<String, dynamic>>(
      '/auth/register',
      body: {
        'email': email.trim(),
        'password': password,
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        'phone': phone.trim(),
        'role': role,
        if (location != null && location.isNotEmpty) 'location': location.trim(),
        if (publicTitle != null && publicTitle.isNotEmpty) 'publicTitle': publicTitle.trim(),
        if (bio != null && bio.isNotEmpty) 'bio': bio.trim(),
        if (skills != null && skills.isNotEmpty) 'skills': skills,
        if (website != null && website.isNotEmpty) 'website': website.trim(),
        if (preferredLanguage != null && preferredLanguage.isNotEmpty)
          'preferredLanguage': preferredLanguage.trim(),
      },
    );
    return _extractUser(json);
  }

  Future<void> forgotPassword(String email) {
    return _apiClient.post<void>('/auth/forgot-password', body: {'email': email.trim()});
  }

  Future<AuthUser?> currentUser() async {
    try {
      final json = await _apiClient.get<Map<String, dynamic>>('/auth/me');
      return AuthUser.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.post<void>('/auth/logout');
    } finally {
      await _sessionStore.clear();
    }
  }

  AuthUser _extractUser(Map<String, dynamic> json) {
    final candidate = json['user'] is Map<String, dynamic> ? json['user'] as Map<String, dynamic> : json;
    return AuthUser.fromJson(candidate);
  }
}

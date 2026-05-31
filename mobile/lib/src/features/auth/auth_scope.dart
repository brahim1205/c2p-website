import 'auth_models.dart';
import 'auth_repository.dart';

class AuthSession {
  AuthSession(this.repository);

  final AuthRepository repository;
  AuthUser? user;

  bool get isAuthenticated => user != null;

  Future<AuthUser?> restore() async {
    user = await repository.currentUser();
    return user;
  }

  Future<AuthUser> login(String email, String password) async {
    user = await repository.login(email: email, password: password);
    return user!;
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
    user = await repository.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      role: role,
      location: location,
      publicTitle: publicTitle,
      bio: bio,
      skills: skills,
      website: website,
      preferredLanguage: preferredLanguage,
    );
    return user!;
  }

  Future<void> logout() async {
    await repository.logout();
    user = null;
  }
}

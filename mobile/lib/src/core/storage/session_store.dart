import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  const SessionStore(this._storage);

  final FlutterSecureStorage _storage;

  static const _cookieKey = 'c2p.cookies';
  static const _requestIdKey = 'c2p.request_id';

  Future<String?> readCookieHeader() => _storage.read(key: _cookieKey);

  Future<void> saveCookies(String cookieHeader) {
    return _storage.write(key: _cookieKey, value: cookieHeader);
  }

  Future<String?> readRequestId() => _storage.read(key: _requestIdKey);

  Future<void> saveRequestId(String requestId) {
    return _storage.write(key: _requestIdKey, value: requestId);
  }

  Future<void> clear() async {
    await _storage.delete(key: _cookieKey);
    await _storage.delete(key: _requestIdKey);
  }
}

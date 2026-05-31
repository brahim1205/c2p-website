import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';
import '../storage/session_store.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient(this._sessionStore, {http.Client? httpClient})
      : _httpClient = httpClient ?? http.Client();

  final SessionStore _sessionStore;
  final http.Client _httpClient;

  Future<T> get<T>(String path) => request<T>('GET', path);

  Future<T> post<T>(String path, {Map<String, Object?>? body}) {
    return request<T>('POST', path, body: body);
  }

  Future<T> patch<T>(String path, {Map<String, Object?>? body}) {
    return request<T>('PATCH', path, body: body);
  }

  Future<T> delete<T>(String path) => request<T>('DELETE', path);

  Future<T> request<T>(
    String method,
    String path, {
    Map<String, Object?>? body,
    bool retryOnAuth = true,
  }) async {
    final response = await _send(method, path, body: body);

    if (response.statusCode == 401 && retryOnAuth && !_isAuthRefreshPath(path)) {
      final refreshed = await _refresh();
      if (refreshed) {
        return request<T>(method, path, body: body, retryOnAuth: false);
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _parseError(response);
    }

    if (response.statusCode == 204 || response.body.trim().isEmpty) {
      return null as T;
    }

    return jsonDecode(response.body) as T;
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Map<String, Object?>? body,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl.replaceAll(RegExp(r'/$'), '')}$path');
    final cookieHeader = await _sessionStore.readCookieHeader();
    final requestId = await _sessionStore.readRequestId();
    final headers = <String, String>{
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      if (body != null) 'Content-Type': 'application/json',
      if (cookieHeader != null && cookieHeader.isNotEmpty) 'Cookie': cookieHeader,
      if (requestId != null && requestId.isNotEmpty) 'X-Request-Id': requestId,
      if (_isUnsafe(method)) ..._csrfHeader(cookieHeader),
    };

    final encodedBody = body == null ? null : jsonEncode(body);
    final request = http.Request(method, uri)..headers.addAll(headers);
    if (encodedBody != null) request.body = encodedBody;

    final response = await _httpClient.send(request).timeout(const Duration(seconds: 30));

    final buffered = await http.Response.fromStream(response);
    await _captureSessionHeaders(buffered);
    return buffered;
  }

  Future<void> _captureSessionHeaders(http.Response response) async {
    final requestId = response.headers['x-request-id'];
    if (requestId != null && requestId.isNotEmpty) {
      await _sessionStore.saveRequestId(requestId);
    }

    final setCookie = response.headers['set-cookie'];
    if (setCookie == null || setCookie.isEmpty) return;

    final current = _parseCookieHeader(await _sessionStore.readCookieHeader());
    final incoming = _parseSetCookieHeader(setCookie);
    current.addAll(incoming);
    await _sessionStore.saveCookies(
      current.entries.map((entry) => '${entry.key}=${entry.value}').join('; '),
    );
  }

  Future<bool> _refresh() async {
    final response = await _send('POST', '/auth/refresh');
    return response.statusCode >= 200 && response.statusCode < 300;
  }

  ApiException _parseError(http.Response response) {
    String message = response.statusCode >= 500
        ? 'Une erreur est survenue. Veuillez reessayer plus tard.'
        : 'Requete invalide.';
    String? code;

    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        message = decoded['message']?.toString() ?? message;
        code = decoded['code']?.toString();
      }
    } catch (_) {
      // Keep safe default.
    }

    return ApiException(
      message: message,
      statusCode: response.statusCode,
      code: code,
      requestId: response.headers['x-request-id'],
    );
  }

  bool _isAuthRefreshPath(String path) {
    return {
      '/auth/login',
      '/auth/register',
      '/auth/verify-2fa',
      '/auth/resend-2fa',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
    }.contains(path);
  }

  bool _isUnsafe(String method) {
    return {'POST', 'PUT', 'PATCH', 'DELETE'}.contains(method.toUpperCase());
  }

  Map<String, String> _csrfHeader(String? cookieHeader) {
    final cookies = _parseCookieHeader(cookieHeader);
    final token = cookies['c2p_csrf'];
    return token == null ? const {} : {'X-CSRF-Token': token};
  }

  Map<String, String> _parseCookieHeader(String? header) {
    if (header == null || header.trim().isEmpty) return {};
    return Map.fromEntries(
      header.split(';').map((part) {
        final index = part.indexOf('=');
        if (index == -1) return const MapEntry('', '');
        return MapEntry(part.substring(0, index).trim(), part.substring(index + 1).trim());
      }).where((entry) => entry.key.isNotEmpty),
    );
  }

  Map<String, String> _parseSetCookieHeader(String header) {
    final cookies = <String, String>{};
    for (final rawCookie in header.split(RegExp(r', (?=[^;,]+=)'))) {
      final firstSegment = rawCookie.split(';').first;
      final index = firstSegment.indexOf('=');
      if (index == -1) continue;
      cookies[firstSegment.substring(0, index).trim()] = firstSegment.substring(index + 1).trim();
    }
    return cookies;
  }
}

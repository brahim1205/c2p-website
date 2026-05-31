import 'package:flutter/foundation.dart';

class ApiConfig {
  const ApiConfig._();

  static const _definedBaseUrl = String.fromEnvironment(
    'C2P_API_BASE_URL',
    defaultValue: '',
  );

  static String get baseUrl {
    if (_definedBaseUrl.isNotEmpty) return _definedBaseUrl;
    if (kIsWeb) return 'http://127.0.0.1:3003/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3003/api';
    }
    return 'http://127.0.0.1:3003/api';
  }
}

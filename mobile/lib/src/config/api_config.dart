class ApiConfig {
  const ApiConfig._();

  static const baseUrl = String.fromEnvironment(
    'C2P_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3003/api',
  );
}

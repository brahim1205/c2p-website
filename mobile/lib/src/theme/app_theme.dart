import 'package:flutter/material.dart';

class C2PColors {
  const C2PColors._();

  static const navy = Color(0xFF06053A);
  static const blue = Color(0xFF0F63C8);
  static const sky = Color(0xFF5FA6F3);
  static const yellow = Color(0xFFF9C846);
  static const ink = Color(0xFF27346B);
  static const surface = Color(0xFFF7FAFF);
}

ThemeData buildC2PTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: C2PColors.blue,
    primary: C2PColors.navy,
    secondary: C2PColors.yellow,
    surface: Colors.white,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: C2PColors.surface,
    appBarTheme: const AppBarTheme(
      centerTitle: false,
      backgroundColor: Colors.white,
      foregroundColor: C2PColors.navy,
      elevation: 0,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFD9E4F2)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: C2PColors.blue, width: 1.5),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: C2PColors.navy,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE3EBF6)),
      ),
    ),
  );
}

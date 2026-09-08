import 'package:flutter/material.dart';

abstract final class DestinyColors {
  static const background = Color(0xFF050713);
  static const surface = Color(0xFF101528);
  static const surfaceElevated = Color(0xFF171E35);
  static const primary = Color(0xFF9B7BFF);
  static const secondary = Color(0xFFFF8FCA);
  static const accent = Color(0xFFD8B15A);
  static const text = Color(0xFFF7F4FF);
  static const muted = Color(0xFFA8ABC0);
}

abstract final class DestinyTheme {
  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: DestinyColors.primary,
      brightness: Brightness.dark,
    ).copyWith(
      primary: DestinyColors.primary,
      secondary: DestinyColors.secondary,
      surface: DestinyColors.surface,
      onSurface: DestinyColors.text,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: DestinyColors.background,
      fontFamily: 'Roboto',
      visualDensity: VisualDensity.standard,
      splashFactory: InkSparkle.splashFactory,
      cardTheme: CardThemeData(
        color: DestinyColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(color: Colors.white.withValues(alpha: .06)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: DestinyColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: .06)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: DestinyColors.primary, width: 1.2),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: DestinyColors.surface.withValues(alpha: .96),
        indicatorColor: DestinyColors.primary.withValues(alpha: .20),
        elevation: 0,
        labelTextStyle: WidgetStatePropertyAll(
          const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: DestinyColors.background,
        foregroundColor: DestinyColors.text,
        elevation: 0,
        centerTitle: false,
      ),
    );
  }
}

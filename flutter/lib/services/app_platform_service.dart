import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Shared platform services used by Destiny AI for production-grade app state.
class AppPlatformService {
  AppPlatformService._();

  static final AppPlatformService instance = AppPlatformService._();

  static const FlutterSecureStorage secureStorage = FlutterSecureStorage();
  final Connectivity connectivity = Connectivity();

  Future<PackageInfo> get packageInfo => PackageInfo.fromPlatform();

  Stream<List<ConnectivityResult>> get connectivityStream =>
      connectivity.onConnectivityChanged;

  Future<List<ConnectivityResult>> get connectivityNow =>
      connectivity.checkConnectivity();

  Future<void> writeSecret(String key, String value) =>
      secureStorage.write(key: key, value: value);

  Future<String?> readSecret(String key) => secureStorage.read(key: key);

  Future<void> deleteSecret(String key) => secureStorage.delete(key: key);

  Future<void> clearSecrets() => secureStorage.deleteAll();
}

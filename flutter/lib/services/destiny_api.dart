import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class DestinyApi {
  DestinyApi._();
  static final DestinyApi instance = DestinyApi._();

  static const _storage = FlutterSecureStorage();
  static const baseUrl = String.fromEnvironment(
    'DESTINY_API_URL',
    defaultValue: 'https://api.yourdomain.com',
  );
  static const apiKey = String.fromEnvironment('DESTINY_API_KEY');

  Future<String?> get token async => _storage.read(key: 'destiny_access_token');

  Future<void> _saveToken(String value) =>
      _storage.write(key: 'destiny_access_token', value: value);

  Future<void> logout() => _storage.delete(key: 'destiny_access_token');

  Map<String, String> _headers({bool json = true}) {
    final h = <String, String>{'Accept': 'application/json'};
    if (json) h['Content-Type'] = 'application/json';
    if (apiKey.isNotEmpty) h['X-API-Key'] = apiKey;
    return h;
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final headers = _headers();
    final access = await token;
    if (auth && access != null && access.isNotEmpty) {
      headers['Authorization'] = 'Bearer $access';
    }
    final uri = Uri.parse('${baseUrl.replaceAll(RegExp(r'/$'), '')}$path');
    late http.Response response;
    if (method == 'POST') {
      response = await http.post(uri, headers: headers, body: jsonEncode(body ?? {}));
    } else if (method == 'GET') {
      response = await http.get(uri, headers: headers);
    } else {
      throw UnsupportedError(method);
    }
    Map<String, dynamic> data = {};
    if (response.body.isNotEmpty) {
      final decoded = jsonDecode(response.body);
      if (decoded is Map) data = Map<String, dynamic>.from(decoded);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final detail = data['detail'] ?? data['error'] ?? response.reasonPhrase ?? 'Request failed';
      throw Exception(detail is Map ? (detail['message'] ?? detail).toString() : detail.toString());
    }
    return data;
  }

  Future<Map<String, dynamic>> register(String email, String password, {String name = ''}) async {
    final data = await _request('POST', '/auth/register', body: {
      'email': email.trim(), 'password': password, 'name': name.trim(),
    }, auth: false);
    if (data['access_token'] != null) await _saveToken(data['access_token'].toString());
    return data;
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await _request('POST', '/auth/login', body: {
      'email': email.trim(), 'password': password,
    }, auth: false);
    if (data['access_token'] != null) await _saveToken(data['access_token'].toString());
    return data;
  }

  Future<Map<String, dynamic>> me() => _request('GET', '/auth/me');

  Future<Map<String, dynamic>> usage() => _request('GET', '/v1/usage');

  Future<Map<String, dynamic>> chat(List<Map<String, dynamic>> messages, {String? model}) =>
      _request('POST', '/v1/chat/completions', body: {
        if (model != null) 'model': model,
        'messages': messages,
        'stream': false,
        'auto_route': true,
        'fallback': true,
      });

  Future<Map<String, dynamic>> generateImage(String prompt) =>
      _request('POST', '/v1/images/generations', body: {'prompt': prompt});

  Future<Map<String, dynamic>> generateVideo(String prompt, {int duration = 5}) =>
      _request('POST', '/v1/videos/generations', body: {'prompt': prompt, 'duration': duration});

  Future<Map<String, dynamic>> generateMusic(String prompt, {int duration = 30, bool instrumental = true}) =>
      _request('POST', '/v1/audio/music/generations', body: {
        'prompt': prompt, 'duration': duration, 'instrumental': instrumental,
      });

  Future<Map<String, dynamic>> capabilities() => _request('GET', '/v1/media/capabilities', auth: false);
}

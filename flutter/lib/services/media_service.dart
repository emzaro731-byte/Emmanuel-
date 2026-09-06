import 'package:supabase_flutter/supabase_flutter.dart';

class MediaService {
  static final _client = Supabase.instance.client;

  static Future<Map<String, dynamic>> generateImage({required String prompt}) async {
    final response = await _client.functions.invoke(
      'fal-ai',
      body: {'action': 'image', 'model': 'fal-ai/flux/schnell', 'input': {'prompt': prompt}},
    );
    final data = response.data is Map
        ? Map<String, dynamic>.from(response.data as Map)
        : <String, dynamic>{};
    if (response.status >= 400 || data['error'] != null) {
      throw Exception(data['error'] ?? 'Image generation failed (${response.status}).');
    }
    return data;
  }
}

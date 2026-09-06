import 'package:supabase_flutter/supabase_flutter.dart';

class MediaService {
  static final _client = Supabase.instance.client;

  static Future<Map<String, dynamic>> generateImage({required String prompt}) async {
    final response = await _client.functions.invoke(
      'media-ai',
      body: {
        'action': 'image',
        'model': 'fal-ai/flux/schnell',
        'input': {'prompt': prompt},
      },
    );
    final data = response.data is Map
        ? Map<String, dynamic>.from(response.data as Map)
        : <String, dynamic>{};
    if (response.status >= 400 || data['error'] != null) {
      throw Exception(data['error'] ?? 'Image generation failed (${response.status}).');
    }
    return data;
  }

  static String? extractImageUrl(Map<String, dynamic> data) {
    final result = data['result'];
    if (result is Map) {
      final images = result['images'];
      if (images is List && images.isNotEmpty && images.first is Map) {
        final url = images.first['url'];
        if (url is String && url.isNotEmpty) return url;
      }
      final image = result['image'];
      if (image is Map && image['url'] is String) return image['url'] as String;
    }
    return null;
  }
}

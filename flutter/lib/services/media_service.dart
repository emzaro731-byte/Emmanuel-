import 'package:supabase_flutter/supabase_flutter.dart';

class MediaService {
  static final _client = Supabase.instance.client;

  static Future<Map<String, dynamic>> generate({
    required String action,
    required String prompt,
    String? model,
    Map<String, dynamic>? input,
  }) async {
    final cleanPrompt = prompt.trim();
    if (cleanPrompt.isEmpty) throw Exception('A prompt is required.');

    final response = await _client.functions.invoke(
      'media-ai',
      body: {
        'action': action,
        if (model != null) 'model': model,
        'input': {
          ...?input,
          'prompt': cleanPrompt,
        },
      },
    );

    final data = response.data is Map
        ? Map<String, dynamic>.from(response.data as Map)
        : <String, dynamic>{};

    if (response.status >= 400 || data['error'] != null) {
      throw Exception(
          data['error'] ?? 'Media generation failed (${response.status}).');
    }
    return data;
  }

  static Future<Map<String, dynamic>> generateImage({required String prompt}) {
    return generate(
      action: 'image',
      model: 'fal-ai/flux/schnell',
      prompt: prompt,
    );
  }

  static Future<Map<String, dynamic>> generateVideo({
    required String prompt,
    bool sound = false,
  }) {
    return generate(
      action: 'video',
      model: 'fal-ai/kling-video/v2.6/pro/text-to-video',
      prompt: prompt,
      input: {
        'sound': sound,
      },
    );
  }

  static Future<Map<String, dynamic>> generateMusic({
    required String prompt,
    String lyrics = '',
    bool instrumental = false,
  }) {
    return generate(
      action: 'music',
      model: 'fal-ai/minimax-music/v2.5',
      prompt: prompt,
      input: {
        'lyrics': lyrics.trim(),
        'is_instrumental': instrumental,
        'lyrics_optimizer': lyrics.trim().isEmpty && !instrumental,
      },
    );
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

  static String? extractVideoUrl(Map<String, dynamic> data) {
    final result = data['result'];
    if (result is Map) {
      final video = result['video'];
      if (video is Map &&
          video['url'] is String &&
          (video['url'] as String).isNotEmpty) {
        return video['url'] as String;
      }
      if (video is String && video.isNotEmpty) return video;
    }
    return null;
  }

  static String? extractAudioUrl(Map<String, dynamic> data) {
    final result = data['result'];
    if (result is Map) {
      final audio = result['audio'];
      if (audio is Map &&
          audio['url'] is String &&
          (audio['url'] as String).isNotEmpty) {
        return audio['url'] as String;
      }
      if (audio is String && audio.isNotEmpty) return audio;
      final audioUrl = result['audio_url'];
      if (audioUrl is String && audioUrl.isNotEmpty) return audioUrl;
    }
    return null;
  }
}

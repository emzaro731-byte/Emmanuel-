import 'destiny_api.dart';

class MediaService {
  static Future<Map<String, dynamic>> generate({required String action, required String prompt, String? model, Map<String, dynamic>? input}) async {
    switch (action.toLowerCase()) {
      case 'image': return DestinyApi.instance.generateImage(prompt);
      case 'video': return DestinyApi.instance.generateVideo(prompt, duration: (input?['duration'] as num?)?.toInt() ?? 5);
      case 'music': return DestinyApi.instance.generateMusic(prompt, duration: (input?['duration'] as num?)?.toInt() ?? 30, instrumental: input?['is_instrumental'] != false);
      default: throw Exception('Unsupported media action: $action');
    }
  }
  static Future<Map<String, dynamic>> generateImage({required String prompt}) => DestinyApi.instance.generateImage(prompt);
  static Future<Map<String, dynamic>> generateVideo({required String prompt, bool sound = false}) => DestinyApi.instance.generateVideo(prompt);
  static Future<Map<String, dynamic>> generateMusic({required String prompt, String lyrics = '', bool instrumental = false}) => DestinyApi.instance.generateMusic(prompt, instrumental: instrumental);
  static String? extractImageUrl(Map<String,dynamic> data) => _extract(data, ['url','image_url']);
  static String? extractVideoUrl(Map<String,dynamic> data) => _extract(data, ['url','video_url']);
  static String? extractAudioUrl(Map<String,dynamic> data) => _extract(data, ['url','audio_url']);
  static String? _extract(Map<String,dynamic> data, List<String> keys) { final list=data['data']; if(list is List && list.isNotEmpty && list.first is Map){for(final k in keys){final v=(list.first as Map)[k];if(v is String&&v.isNotEmpty)return v;}} for(final k in keys){final v=data[k];if(v is String&&v.isNotEmpty)return v;} return null; }
}

import 'dart:convert';

class AiRequestBuilder {
  static Map<String, dynamic> build({
    required String mode,
    required List<Map<String, String>> messages,
    String? model,
    String? memory,
    String? project,
    bool stream = false,
  }) {
    final cleanMessages = messages
        .where((m) => (m['text'] ?? '').trim().isNotEmpty)
        .map((m) => <String, dynamic>{
              'role': m['role'] == 'assistant' ? 'assistant' : 'user',
              'content': m['text']!.trim(),
            })
        .toList();

    return {
      'mode': mode,
      'messages': cleanMessages,
      if (model != null && model.trim().isNotEmpty) 'model': model.trim(),
      if (memory != null && memory.trim().isNotEmpty) 'memory': memory.trim(),
      if (project != null && project.trim().isNotEmpty) 'project': project.trim(),
      'stream': stream,
    };
  }

  static String encode(Map<String, dynamic> body) => jsonEncode(body);
}

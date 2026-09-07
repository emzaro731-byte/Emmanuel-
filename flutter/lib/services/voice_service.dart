import 'package:flutter_tts/flutter_tts.dart';

/// Centralized voice-output service for Destiny AI.
/// Provider credentials are not required on the device.
class VoiceService {
  VoiceService._();
  static final VoiceService instance = VoiceService._();

  final FlutterTts _tts = FlutterTts();
  bool _ready = false;

  Future<void> initialize() async {
    if (_ready) return;
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.48);
    await _tts.setPitch(1.0);
    _ready = true;
  }

  Future<void> speak(String text) async {
    final clean = text.trim();
    if (clean.isEmpty) return;
    await initialize();
    await _tts.stop();
    await _tts.speak(clean);
  }

  Future<void> stop() async {
    await _tts.stop();
  }

  Future<void> setSpeechRate(double value) async {
    await initialize();
    await _tts.setSpeechRate(value.clamp(0.25, 0.75));
  }
}

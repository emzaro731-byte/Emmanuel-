import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:share_plus/share_plus.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'media_studio_page.dart';
import 'payment_screen.dart';

const _bg = Color(0xFF050713);
const _text = Color(0xFFF7F4FF);
const _muted = Color(0xFFA8ABC0);
const _purple = Color(0xFF9B7BFF);
const _pink = Color(0xFFFF8FCA);
const _gold = Color(0xFFD8B15A);
const _url = 'https://vihbsfrwnslnmheowkhy.supabase.co';
const _publishableKey = 'sb_publishable_j8gV4-PeFte1RMgl759uQQ_KrM_3vzK';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <_ChatMessage>[];
  final _speech = SpeechToText();
  final _tts = FlutterTts();

  XFile? _attachment;
  http.Client? _client;
  StreamSubscription<String>? _subscription;
  String _mode = 'Chat';
  String? _streamingId;
  bool _busy = false;
  bool _listening = false;
  bool _speaking = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
    _tts.setCompletionHandler(() {
      if (mounted) {
        setState(() => _speaking = false);
      }
    });
  }

  @override
  void dispose() {
    _cancelStream();
    _speech.stop();
    _tts.stop();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final rows = await Supabase.instance.client
            .from('destiny_chat_messages')
            .select('role, content, created_at')
            .eq('user_id', user.id)
            .order('created_at', ascending: true)
            .limit(80);
        _messages.addAll(
          rows.map(
            (row) => _ChatMessage(
              id: '${row['created_at']}-${row['role']}',
              role: '${row['role'] ?? 'assistant'}',
              text: '${row['content'] ?? ''}',
            ),
          ),
        );
      }
    } catch (_) {}

    if (_messages.isEmpty) {
      try {
        final prefs = await SharedPreferences.getInstance();
        for (final item in prefs.getStringList('destiny_chat_history') ?? []) {
          final split = item.indexOf('|');
          if (split > 0) {
            _messages.add(
              _ChatMessage(
                id: '${DateTime.now().microsecondsSinceEpoch}-${_messages.length}',
                role: item.substring(0, split),
                text: item.substring(split + 1),
              ),
            );
          }
        }
      } catch (_) {}
    }

    if (mounted) {
      setState(() {});
    }
    _scrollBottom();
  }

  Future<void> _saveHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(
        'destiny_chat_history',
        _messages.take(80).map((m) => '${m.role}|${m.text}').toList(),
      );
    } catch (_) {}
  }

  Future<void> _saveCloud(String role, String text) async {
    if (text.trim().isEmpty) return;
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await Supabase.instance.client.from('destiny_chat_messages').insert({
          'user_id': user.id,
          'role': role,
          'content': text,
        });
      }
    } catch (_) {}
  }

  Future<void> _pickImage() async {
    try {
      final image = await ImagePicker().pickImage(source: ImageSource.gallery);
      if (image != null && mounted) {
        setState(() => _attachment = image);
      }
    } catch (e) {
      _showMessage('Could not select image: $e');
    }
  }

  Future<void> _toggleListening() async {
    if (_listening) {
      await _speech.stop();
      if (mounted) setState(() => _listening = false);
      return;
    }

    final available = await _speech.initialize(
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          if (mounted) setState(() => _listening = false);
        }
      },
      onError: (_) {
        if (mounted) setState(() => _listening = false);
      },
    );

    if (!available) {
      _showMessage('Voice input is not available on this device.');
      return;
    }

    if (mounted) setState(() => _listening = true);
    await _speech.listen(
      onResult: (result) {
        if (mounted) {
          setState(() => _input.text = result.recognizedWords);
        }
      },
      listenFor: const Duration(minutes: 1),
      pauseFor: const Duration(seconds: 4),
      partialResults: true,
    );
  }

  Future<void> _copyMessage(String text) async {
    if (text.trim().isEmpty) return;
    await Clipboard.setData(ClipboardData(text: text));
    _showMessage('Copied to clipboard');
  }

  Future<void> _shareMessage(String text) async {
    if (text.trim().isEmpty) return;
    await SharePlus.instance.share(
      ShareParams(text: text, title: 'Destiny AI response'),
    );
  }

  Future<void> _speakMessage(String text) async {
    if (text.trim().isEmpty) return;
    if (_speaking) {
      await _tts.stop();
      if (mounted) setState(() => _speaking = false);
      return;
    }
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.48);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.0);
    if (mounted) setState(() => _speaking = true);
    await _tts.speak(text);
  }

  Future<void> _send() async {
    if (_busy) return;
    final typed = _input.text.trim();
    if (typed.isEmpty && _attachment == null) return;

    final image = _attachment;
    final prompt = image == null
        ? typed
        : '$typed\n[Image attached: ${image.name}]'.trim();
    _input.clear();

    final userId = '${DateTime.now().microsecondsSinceEpoch}-user';
    final assistantId = '${DateTime.now().microsecondsSinceEpoch}-assistant';

    setState(() {
      _attachment = null;
      _messages.add(_ChatMessage(id: userId, role: 'user', text: prompt));
      _messages.add(_ChatMessage(id: assistantId, role: 'assistant', text: ''));
      _streamingId = assistantId;
      _busy = true;
    });

    await _saveCloud('user', prompt);
    await _saveHistory();
    _scrollBottom();

    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      _finishWithError(
        assistantId,
        'Your session has expired. Please sign in again.',
      );
      return;
    }

    _client = http.Client();
    try {
      // All client AI requests now pass through the server-side gated function.
      // The gated function atomically reserves the user's daily AI allowance
      // before forwarding the request to the underlying Destiny AI function.
      final request = http.Request(
        'POST',
        Uri.parse('$_url/functions/v1/destiny-ai-gated'),
      );
      request.headers.addAll({
        'Authorization': 'Bearer ${session.accessToken}',
        'apikey': _publishableKey,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });
      request.body = jsonEncode({
        'mode': _mode,
        'stream': true,
        'messages': _messages
            .where((m) => m.id != assistantId)
            .map(
              (m) => {
                'role': m.role == 'assistant' ? 'assistant' : 'user',
                'content': m.text,
              },
            )
            .toList(),
        if (image != null) 'attachment_name': image.name,
      });

      final response = await _client!.send(request);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final body = await response.stream.bytesToString();
        var message = body;
        try {
          final decoded = jsonDecode(body);
          final code = decoded['code']?.toString();
          final error = decoded['error']?.toString();
          message = code == 'AI_LIMIT_REACHED'
              ? 'Daily AI limit reached. Upgrade your plan to continue.'
              : (error ?? body);
        } catch (_) {}
        throw Exception(message);
      }

      var buffer = '';
      _subscription = response.stream
          .transform(utf8.decoder)
          .listen(
            (chunk) {
              buffer += chunk;
              final events = buffer.split('\n\n');
              buffer = events.removeLast();
              for (final event in events) {
                _handleEvent(assistantId, event);
              }
            },
            onError: (Object error) {
              _finishWithError(
                assistantId,
                'Streaming connection failed: $error',
              );
            },
            onDone: () {
              if (_streamingId == assistantId) {
                _finishStream(assistantId);
              }
            },
            cancelOnError: true,
          );
    } catch (e) {
      _finishWithError(
        assistantId,
        'Sorry, I could not connect to Destiny AI.\n\n$e',
      );
    }
  }

  void _handleEvent(String id, String event) {
    String? dataLine;
    for (final line in event.split('\n')) {
      if (line.startsWith('data:')) {
        dataLine = line.substring(5).trim();
      }
    }
    if (dataLine == null || dataLine!.isEmpty) return;

    try {
      final data = jsonDecode(dataLine!);
      final type = data['type'];
      if (type == 'delta') {
        final delta = '${data['text'] ?? ''}';
        if (delta.isEmpty) return;
        final index = _messages.indexWhere((m) => m.id == id);
        if (index >= 0 && mounted) {
          setState(() {
            _messages[index] = _messages[index].copyWith(
              text: '${_messages[index].text}$delta',
            );
          });
          _scrollBottom();
        }
      } else if (type == 'error') {
        _finishWithError(id, '${data['error'] ?? 'Streaming failed.'}');
      } else if (type == 'done') {
        _finishStream(id);
      }
    } catch (_) {}
  }

  Future<void> _finishStream(String id) async {
    if (_streamingId != id) return;
    await _subscription?.cancel();
    _subscription = null;
    _client?.close();
    _client = null;

    final index = _messages.indexWhere((m) => m.id == id);
    final answer = index >= 0 ? _messages[index].text : '';
    if (mounted) {
      setState(() {
        _streamingId = null;
        _busy = false;
      });
    }
    if (answer.isNotEmpty) await _saveCloud('assistant', answer);
    await _saveHistory();
    _scrollBottom();
  }

  void _finishWithError(String id, String error) {
    if (!mounted || _streamingId != id) return;
    _cancelStream();
    final index = _messages.indexWhere((m) => m.id == id);
    setState(() {
      if (index >= 0) {
        _messages[index] = _messages[index].copyWith(text: '⚠️ $error');
      }
      _streamingId = null;
      _busy = false;
    });
    _saveHistory();
    _scrollBottom();
  }

  void _cancelStream() {
    _subscription?.cancel();
    _subscription = null;
    _client?.close();
    _client = null;
  }

  Future<void> _stopStream() async {
    final id = _streamingId;
    if (id == null) return;
    _cancelStream();
    final index = _messages.indexWhere((m) => m.id == id);
    final partial = index >= 0 ? _messages[index].text : '';
    if (mounted) {
      setState(() {
        _streamingId = null;
        _busy = false;
      });
    }
    if (partial.isNotEmpty) await _saveCloud('assistant', partial);
    await _saveHistory();
  }

  void _scrollBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _clear() async {
    _cancelStream();
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await Supabase.instance.client
            .from('destiny_chat_messages')
            .delete()
            .eq('user_id', user.id);
      }
    } catch (_) {}
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('destiny_chat_history');
    } catch (_) {}
    if (mounted) {
      setState(() {
        _messages.clear();
        _streamingId = null;
        _busy = false;
      });
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        foregroundColor: _text,
        title: const Text('Destiny AI'),
        actions: [
          IconButton(
            tooltip: 'Clear chat',
            onPressed: _messages.isEmpty ? null : _clear,
            icon: const Icon(Icons.delete_outline),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final message = _messages[index];
                  final isUser = message.role == 'user';
                  return Align(
                    alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 720),
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isUser ? _purple.withOpacity(.18) : Colors.white.withOpacity(.06),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.white.withOpacity(.08)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            message.text.isEmpty && !isUser ? 'Thinking…' : message.text,
                            style: const TextStyle(color: _text, height: 1.45),
                          ),
                          if (!isUser && message.text.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 4,
                              children: [
                                IconButton(
                                  tooltip: 'Copy',
                                  onPressed: () => _copyMessage(message.text),
                                  icon: const Icon(Icons.copy, size: 18, color: _muted),
                                ),
                                IconButton(
                                  tooltip: 'Speak',
                                  onPressed: () => _speakMessage(message.text),
                                  icon: const Icon(Icons.volume_up_outlined, size: 18, color: _muted),
                                ),
                                IconButton(
                                  tooltip: 'Share',
                                  onPressed: () => _shareMessage(message.text),
                                  icon: const Icon(Icons.share_outlined, size: 18, color: _muted),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            if (_attachment != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Chip(
                    label: Text(_attachment!.name, style: const TextStyle(color: _text)),
                    onDeleted: () => setState(() => _attachment = null),
                    backgroundColor: Colors.white.withOpacity(.07),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(.06),
                      border: Border.all(color: Colors.white.withOpacity(.09)),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          tooltip: 'Attach image',
                          onPressed: _pickImage,
                          icon: const Icon(Icons.image_outlined, color: _muted),
                        ),
                        Expanded(
                          child: TextField(
                            controller: _input,
                            minLines: 1,
                            maxLines: 5,
                            style: const TextStyle(color: _text),
                            decoration: const InputDecoration(
                              hintText: 'Message Destiny AI…',
                              hintStyle: TextStyle(color: _muted),
                              border: InputBorder.none,
                            ),
                            onSubmitted: (_) => _send(),
                          ),
                        ),
                        IconButton(
                          tooltip: _listening ? 'Stop listening' : 'Voice input',
                          onPressed: _toggleListening,
                          icon: Icon(
                            _listening ? Icons.mic : Icons.mic_none,
                            color: _listening ? _pink : _muted,
                          ),
                        ),
                        IconButton(
                          tooltip: _busy ? 'Stop' : 'Send',
                          onPressed: _busy ? _stopStream : _send,
                          icon: Icon(
                            _busy ? Icons.stop_circle_outlined : Icons.arrow_upward_rounded,
                            color: _busy ? _pink : _gold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatMessage {
  const _ChatMessage({
    required this.id,
    required this.role,
    required this.text,
  });

  final String id;
  final String role;
  final String text;

  _ChatMessage copyWith({String? id, String? role, String? text}) {
    return _ChatMessage(
      id: id ?? this.id,
      role: role ?? this.role,
      text: text ?? this.text,
    );
  }
}

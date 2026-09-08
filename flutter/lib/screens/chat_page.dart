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
      _messages.add(
        _ChatMessage(id: assistantId, role: 'assistant', text: ''),
      );
      _streamingId = assistantId;
      _busy = true;
    });

    await _saveCloud('user', prompt);
    await _saveHistory();
    _scrollBottom();

    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      _finishWithError(
          assistantId, 'Your session has expired. Please sign in again.');
      return;
    }

    _client = http.Client();
    try {
      final request = http.Request(
        'POST',
        Uri.parse('$_url/functions/v1/destiny-ai'),
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
          message = '${decoded['error'] ?? body}';
        } catch (_) {}
        throw Exception(message);
      }

      var buffer = '';
      _subscription = response.stream.transform(utf8.decoder).listen(
        (chunk) {
          buffer += chunk;
          final events = buffer.split('\n\n');
          buffer = events.removeLast();
          for (final event in events) {
            _handleEvent(assistantId, event);
          }
        },
        onError: (Object error) {
          _finishWithError(assistantId, 'Streaming connection failed: $error');
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
      SnackBar(content: Text(message), duration: const Duration(seconds: 1)),
    );
  }

  void _showModes() {
    const modes = ['Chat', 'Code', 'Study', 'Write', 'Creative'];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return _GlassSheet(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Choose an AI mode',
                style: TextStyle(
                  color: _text,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              for (final mode in modes)
                ListTile(
                  leading: Icon(
                    _mode == mode ? Icons.check_circle : Icons.circle_outlined,
                    color: _mode == mode ? _gold : _muted,
                  ),
                  title: Text(
                    mode,
                    style: const TextStyle(
                      color: _text,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onTap: () {
                    setState(() => _mode = mode);
                    Navigator.pop(context);
                  },
                ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  void _showMoreMenu() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return _GlassSheet(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.auto_awesome, color: _purple),
                title: const Text(
                  'AI Studio',
                  style: TextStyle(color: _text),
                ),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const MediaStudioPage(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.workspace_premium, color: _gold),
                title: const Text(
                  'Upgrade to Pro',
                  style: TextStyle(color: _text),
                ),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const PaymentScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: _text),
                title: const Text(
                  'Clear chat',
                  style: TextStyle(color: _text),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _clear();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _GlowPainter())),
          SafeArea(
            child: Column(
              children: [
                _header(),
                Expanded(child: _messagesView()),
                _composer(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          const _GlassIcon(icon: Icons.auto_awesome, color: _gold),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Destiny AI',
                  style: TextStyle(
                    color: _text,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  'Live AI streaming',
                  style: TextStyle(color: _muted, fontSize: 11),
                ),
              ],
            ),
          ),
          _GlassIcon(icon: Icons.tune_rounded, onTap: _showModes),
          const SizedBox(width: 7),
          _GlassIcon(icon: Icons.more_horiz, onTap: _showMoreMenu),
        ],
      ),
    );
  }

  Widget _messagesView() {
    if (_messages.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 44, 20, 24),
        children: [
          const _HeroOrb(),
          const SizedBox(height: 22),
          const Text(
            'Hi, I’m Destiny ✨',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: _text,
              fontSize: 28,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 9),
          const Text(
            'Chat, code, study, write and create\nwith live AI responses.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _muted, height: 1.5),
          ),
          const SizedBox(height: 25),
          _suggestion('Explain something to me simply'),
          _suggestion('Help me write a professional message'),
          _suggestion('Build a modern app idea with me'),
          _suggestion('Create an image or video concept'),
        ],
      );
    }

    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 18),
      itemCount: _messages.length,
      itemBuilder: (_, index) {
        final message = _messages[index];
        return _Bubble(
          message: message,
          streaming: message.id == _streamingId,
          onCopy: _copyMessage,
          onShare: _shareMessage,
          onSpeak: _speakMessage,
        );
      },
    );
  }

  Widget _suggestion(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          _input.text = text;
          _send();
        },
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(.06),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withOpacity(.10)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: _purple, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      text,
                      style: const TextStyle(
                        color: _text,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: _muted,
                    size: 13,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _composer() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(11, 4, 11, 11),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(27),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(.075),
              borderRadius: BorderRadius.circular(27),
              border: Border.all(color: Colors.white.withOpacity(.13)),
            ),
            child: Column(
              children: [
                if (_attachment != null) _attachmentPreview(),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    IconButton(
                      onPressed: _toggleListening,
                      icon: Icon(
                        _listening ? Icons.mic : Icons.mic_none_rounded,
                        color: _listening ? _pink : _muted,
                      ),
                    ),
                    IconButton(
                      onPressed: _pickImage,
                      icon: const Icon(
                        Icons.add_photo_alternate_outlined,
                        color: _muted,
                      ),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _input,
                        minLines: 1,
                        maxLines: 6,
                        style: const TextStyle(color: _text, fontSize: 15),
                        decoration: const InputDecoration(
                          hintText: 'Message Destiny…',
                          hintStyle: TextStyle(color: _muted),
                          border: InputBorder.none,
                          filled: false,
                          contentPadding: EdgeInsets.symmetric(vertical: 15),
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(7),
                      child: GestureDetector(
                        onTap: _busy ? _stopStream : _send,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          width: 45,
                          height: 45,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: _busy ? [_gold, _pink] : [_purple, _pink],
                            ),
                          ),
                          child: Icon(
                            _busy
                                ? Icons.stop_rounded
                                : Icons.arrow_upward_rounded,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 9),
                  child: Row(
                    children: [
                      Text(
                        _mode,
                        style: const TextStyle(
                          color: _muted,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        _busy
                            ? 'Generating live • Tap stop'
                            : _listening
                                ? 'Listening…'
                                : 'Live token streaming enabled',
                        style: const TextStyle(color: _muted, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _attachmentPreview() {
    final attachment = _attachment;
    if (attachment == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 9, 9, 0),
      child: Row(
        children: [
          const Icon(Icons.image_outlined, color: _purple, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              attachment.name,
              style: const TextStyle(color: _text, fontSize: 12),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            onPressed: () => setState(() => _attachment = null),
            icon: const Icon(Icons.close, color: _muted, size: 18),
          ),
        ],
      ),
    );
  }
}

class _ChatMessage {
  final String id;
  final String role;
  final String text;

  const _ChatMessage({
    required this.id,
    required this.role,
    required this.text,
  });

  _ChatMessage copyWith({String? id, String? role, String? text}) {
    return _ChatMessage(
      id: id ?? this.id,
      role: role ?? this.role,
      text: text ?? this.text,
    );
  }
}

class _Bubble extends StatelessWidget {
  final _ChatMessage message;
  final bool streaming;
  final Future<void> Function(String) onCopy;
  final Future<void> Function(String) onShare;
  final Future<void> Function(String) onSpeak;

  const _Bubble({
    required this.message,
    required this.streaming,
    required this.onCopy,
    required this.onShare,
    required this.onSpeak,
  });

  @override
  Widget build(BuildContext context) {
    final user = message.role == 'user';
    final showActions = !user && !streaming && message.text.trim().isNotEmpty;

    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          mainAxisAlignment:
              user ? MainAxisAlignment.end : MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!user) const _AIAvatar(),
            if (!user) const SizedBox(width: 7),
            Flexible(
              child: Column(
                crossAxisAlignment:
                    user ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.sizeOf(context).width * .82,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 15,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: user
                          ? _purple.withOpacity(.21)
                          : Colors.white.withOpacity(.065),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(20),
                        topRight: const Radius.circular(20),
                        bottomLeft: Radius.circular(user ? 20 : 5),
                        bottomRight: Radius.circular(user ? 5 : 20),
                      ),
                      border: Border.all(
                        color: Colors.white.withOpacity(.10),
                      ),
                    ),
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(
                          color: _text,
                          fontSize: 15,
                          height: 1.5,
                        ),
                        children: [
                          TextSpan(text: message.text),
                          streaming
                              ? const TextSpan(
                                  text: ' ▌',
                                  style: TextStyle(
                                    color: _purple,
                                    fontWeight: FontWeight.w900,
                                  ),
                                )
                              : const TextSpan(text: ''),
                        ],
                      ),
                    ),
                  ),
                  if (showActions)
                    Padding(
                      padding: const EdgeInsets.only(top: 5, left: 3),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _BubbleAction(
                            icon: Icons.copy_rounded,
                            label: 'Copy',
                            onTap: () => onCopy(message.text),
                          ),
                          _BubbleAction(
                            icon: Icons.volume_up_rounded,
                            label: 'Voice',
                            onTap: () => onSpeak(message.text),
                          ),
                          _BubbleAction(
                            icon: Icons.share_rounded,
                            label: 'Share',
                            onTap: () => onShare(message.text),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            if (streaming)
              const Padding(
                padding: EdgeInsets.only(left: 7, bottom: 4),
                child: Text(
                  'Generating',
                  style: TextStyle(color: _muted, fontSize: 9),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BubbleAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _BubbleAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 5),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(.055),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(.08)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: _muted, size: 13),
              const SizedBox(width: 4),
              Text(
                label,
                style: const TextStyle(
                  color: _muted,
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GlassIcon extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final VoidCallback? onTap;

  const _GlassIcon({
    required this.icon,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(15),
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(15),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(.06),
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: Colors.white.withOpacity(.10)),
            ),
            child: Icon(icon, color: color ?? _muted, size: 20),
          ),
        ),
      ),
    );
  }
}

class _GlassSheet extends StatelessWidget {
  final Widget child;

  const _GlassSheet({required this.child});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
            child: Container(
              padding: const EdgeInsets.fromLTRB(10, 18, 10, 10),
              decoration: BoxDecoration(
                color: const Color(0xFF111326).withOpacity(.92),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: Colors.white.withOpacity(.10)),
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class _AIAvatar extends StatelessWidget {
  const _AIAvatar();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(colors: [_purple, _pink]),
        boxShadow: [
          BoxShadow(
            color: _purple.withOpacity(.25),
            blurRadius: 14,
            spreadRadius: 2,
          ),
        ],
      ),
      child: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
    );
  }
}

class _HeroOrb extends StatelessWidget {
  const _HeroOrb();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 92,
        height: 92,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(colors: [_purple, _pink, _gold]),
          boxShadow: [
            BoxShadow(
              color: _purple.withOpacity(.28),
              blurRadius: 35,
              spreadRadius: 5,
            ),
          ],
        ),
        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 40),
      ),
    );
  }
}

class _GlowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          _purple.withOpacity(.10),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(size.width * .75, size.height * .15),
          radius: size.width * .75,
        ),
      );
    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

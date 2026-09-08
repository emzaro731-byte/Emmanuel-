import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'media_studio_page.dart';
import 'payment_screen.dart';

const _bg = Color(0xFF050713);
const _glass = Color(0x121A2140);
const _border = Color(0x22FFFFFF);
const _text = Color(0xFFF7F4FF);
const _muted = Color(0xFFA8ABC0);
const _purple = Color(0xFF9B7BFF);
const _pink = Color(0xFFFF8FCA);
const _gold = Color(0xFFD8B15A);

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <_ChatMessage>[];
  XFile? _attachment;
  Timer? _streamTimer;
  String _mode = 'Chat';
  String? _streamingId;
  bool _busy = false;
  int _streamIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _streamTimer?.cancel();
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
        _messages.addAll(rows.map((row) => _ChatMessage(
              id: '${row['created_at']}-${row['role']}',
              role: '${row['role'] ?? 'assistant'}',
              text: '${row['content'] ?? ''}',
            )));
      }
    } catch (_) {}

    if (_messages.isEmpty) {
      try {
        final prefs = await SharedPreferences.getInstance();
        for (final item in prefs.getStringList('destiny_chat_history') ?? []) {
          final split = item.indexOf('|');
          if (split > 0) {
            _messages.add(_ChatMessage(
              id: '${DateTime.now().microsecondsSinceEpoch}-${_messages.length}',
              role: item.substring(0, split),
              text: item.substring(split + 1),
            ));
          }
        }
      } catch (_) {}
    }
    if (mounted) setState(() {});
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
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      await Supabase.instance.client.from('destiny_chat_messages').insert({
        'user_id': user.id,
        'role': role,
        'content': text,
      });
    } catch (_) {}
  }

  Future<void> _pickImage() async {
    final image = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (image != null && mounted) setState(() => _attachment = image);
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
    setState(() {
      _attachment = null;
      _messages.add(_ChatMessage(
        id: '${DateTime.now().microsecondsSinceEpoch}-user',
        role: 'user',
        text: prompt,
      ));
      _busy = true;
    });
    await _saveCloud('user', prompt);
    await _saveHistory();
    _scrollBottom();

    try {
      final response = await Supabase.instance.client.functions.invoke(
        'destiny-ai',
        body: {
          'mode': _mode,
          'messages': _messages
              .map((m) => {
                    'role': m.role == 'assistant' ? 'assistant' : 'user',
                    'content': m.text,
                  })
              .toList(),
          if (image != null) 'attachment_name': image.name,
        },
      );

      final data = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      if (response.status >= 400 || data['error'] != null) {
        throw Exception(data['error'] ?? 'Destiny AI returned an error.');
      }
      final answer = '${data['response'] ?? data['answer'] ?? data['message'] ?? ''}'.trim();
      if (answer.isEmpty) throw Exception('No response was returned.');

      if (!mounted) return;
      final id = '${DateTime.now().microsecondsSinceEpoch}-assistant';
      setState(() {
        _streamingId = id;
        _streamIndex = 0;
        _messages.add(_ChatMessage(id: id, role: 'assistant', text: ''));
      });
      _startPresentationStream(id, answer);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(
          id: '${DateTime.now().microsecondsSinceEpoch}-error',
          role: 'assistant',
          text: 'Sorry, I could not complete that request.\n\n$e',
        ));
        _busy = false;
        _streamingId = null;
      });
      await _saveHistory();
      _scrollBottom();
    }
  }

  void _startPresentationStream(String id, String answer) {
    _streamTimer?.cancel();
    final words = _chunk(answer);
    var part = 0;
    _streamTimer = Timer.periodic(const Duration(milliseconds: 24), (timer) {
      if (!mounted || _streamingId != id) {
        timer.cancel();
        return;
      }
      if (part >= words.length) {
        timer.cancel();
        _finishStream(id, answer);
        return;
      }
      _streamIndex = part + 1;
      final visible = words.take(_streamIndex).join();
      final index = _messages.indexWhere((m) => m.id == id);
      if (index >= 0) {
        setState(() => _messages[index] = _messages[index].copyWith(text: visible));
      }
      part++;
      _scrollBottom();
    });
  }

  List<String> _chunk(String value) {
    final result = <String>[];
    for (var i = 0; i < value.length;) {
      final remaining = value.length - i;
      final size = remaining > 5 ? 3 : remaining;
      result.add(value.substring(i, i + size));
      i += size;
    }
    return result;
  }

  Future<void> _finishStream(String id, String answer) async {
    if (!mounted) return;
    final index = _messages.indexWhere((m) => m.id == id);
    if (index >= 0) {
      setState(() {
        _messages[index] = _messages[index].copyWith(text: answer);
        _streamingId = null;
        _busy = false;
      });
    }
    await _saveCloud('assistant', answer);
    await _saveHistory();
    _scrollBottom();
  }

  void _stopStream() {
    if (_streamingId == null) return;
    _streamTimer?.cancel();
    final index = _messages.indexWhere((m) => m.id == _streamingId);
    if (index >= 0) {
      final partial = _messages[index].text;
      setState(() {
        _messages[index] = _messages[index].copyWith(text: partial.isEmpty ? 'Generation stopped.' : partial);
        _streamingId = null;
        _busy = false;
      });
      _saveCloud('assistant', partial);
      _saveHistory();
    } else {
      setState(() {
        _streamingId = null;
        _busy = false;
      });
    }
  }

  void _scrollBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _clear() async {
    _streamTimer?.cancel();
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
        _busy = false;
        _streamingId = null;
      });
    }
  }

  void _showModes() {
    const modes = ['Chat', 'Code', 'Study', 'Write', 'Creative'];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _GlassSheet(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Choose an AI mode', style: TextStyle(color: _text, fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            for (final mode in modes)
              ListTile(
                leading: Icon(_mode == mode ? Icons.check_circle : Icons.circle_outlined, color: _mode == mode ? _gold : _muted),
                title: Text(mode, style: const TextStyle(color: _text, fontWeight: FontWeight.w600)),
                onTap: () {
                  setState(() => _mode = mode);
                  Navigator.pop(context);
                },
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
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

  Widget _header() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          children: [
            _GlassIcon(icon: Icons.auto_awesome, color: _gold),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Destiny AI', style: TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.w900)),
                Text('Online • intelligent companion', style: TextStyle(color: _muted, fontSize: 11)),
              ]),
            ),
            _GlassIcon(icon: Icons.tune_rounded, onTap: _showModes),
            const SizedBox(width: 7),
            _GlassIcon(
              icon: Icons.more_horiz,
              onTap: () => showModalBottomSheet<void>(
                context: context,
                backgroundColor: Colors.transparent,
                builder: (_) => _GlassSheet(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    ListTile(leading: const Icon(Icons.auto_awesome, color: _purple), title: const Text('AI Studio', style: TextStyle(color: _text)), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const MediaStudioPage())); }),
                    ListTile(leading: const Icon(Icons.workspace_premium, color: _gold), title: const Text('Upgrade to Pro', style: TextStyle(color: _text)), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentScreen())); }),
                    ListTile(leading: const Icon(Icons.delete_outline, color: _text), title: const Text('Clear chat', style: TextStyle(color: _text)), onTap: () { Navigator.pop(context); _clear(); }),
                  ]),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _messagesView() {
    if (_messages.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 44, 20, 24),
        children: [
          const _HeroOrb(),
          const SizedBox(height: 22),
          const Text('Hi, I’m Destiny ✨', textAlign: TextAlign.center, style: TextStyle(color: _text, fontSize: 28, fontWeight: FontWeight.w900)),
          const SizedBox(height: 9),
          const Text('Chat, code, study, write and create\nwith your AI companion.', textAlign: TextAlign.center, style: TextStyle(color: _muted, height: 1.5)),
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
      itemBuilder: (_, i) {
        final m = _messages[i];
        return _Bubble(message: m, streaming: m.id == _streamingId);
      },
    );
  }

  Widget _suggestion(String text) => Padding(
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
                decoration: BoxDecoration(color: _glass, borderRadius: BorderRadius.circular(18), border: Border.all(color: _border)),
                child: Row(children: [const Icon(Icons.auto_awesome, color: _purple, size: 18), const SizedBox(width: 10), Expanded(child: Text(text, style: const TextStyle(color: _text, fontWeight: FontWeight.w600))), const Icon(Icons.arrow_forward_ios_rounded, color: _muted, size: 13)]),
              ),
            ),
          ),
        ),
      );

  Widget _composer() => Padding(
        padding: const EdgeInsets.fromLTRB(11, 4, 11, 11),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(27),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              decoration: BoxDecoration(color: Colors.white.withOpacity(.075), borderRadius: BorderRadius.circular(27), border: Border.all(color: Colors.white.withOpacity(.13))),
              child: Column(children: [
                if (_attachment != null) Padding(padding: const EdgeInsets.fromLTRB(14, 9, 9, 0), child: Row(children: [const Icon(Icons.image_outlined, color: _purple, size: 18), const SizedBox(width: 8), Expanded(child: Text(_attachment!.name, style: const TextStyle(color: _text, fontSize: 12), overflow: TextOverflow.ellipsis)), IconButton(onPressed: () => setState(() => _attachment = null), icon: const Icon(Icons.close, color: _muted, size: 18))])),
                Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  IconButton(onPressed: _pickImage, icon: const Icon(Icons.add_photo_alternate_outlined, color: _muted)),
                  Expanded(child: TextField(controller: _input, minLines: 1, maxLines: 6, style: const TextStyle(color: _text, fontSize: 15), decoration: const InputDecoration(hintText: 'Message Destiny…', hintStyle: TextStyle(color: _muted), border: InputBorder.none, filled: false, contentPadding: EdgeInsets.symmetric(vertical: 15)), onSubmitted: (_) => _send())),
                  Padding(padding: const EdgeInsets.all(7), child: GestureDetector(onTap: _busy ? _stopStream : _send, child: AnimatedContainer(duration: const Duration(milliseconds: 250), width: 45, height: 45, decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: _busy ? [_gold, _pink] : [_purple, _pink])), child: Icon(_busy ? Icons.stop_rounded : Icons.arrow_upward_rounded, color: Colors.white)))),
                ]),
                Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 9), child: Row(children: [Text(_mode, style: const TextStyle(color: _muted, fontSize: 11, fontWeight: FontWeight.w700)), const Spacer(), Text(_busy ? 'Generating • Tap stop' : 'Destiny AI can make mistakes', style: const TextStyle(color: _muted, fontSize: 10))])),
              ]),
            ),
          ),
        ),
      );
}

class _ChatMessage {
  final String id;
  final String role;
  final String text;
  const _ChatMessage({required this.id, required this.role, required this.text});
  _ChatMessage copyWith({String? id, String? role, String? text}) => _ChatMessage(id: id ?? this.id, role: role ?? this.role, text: text ?? this.text);
}

class _Bubble extends StatelessWidget {
  final _ChatMessage message;
  final bool streaming;
  const _Bubble({required this.message, required this.streaming});
  @override
  Widget build(BuildContext context) {
    final user = message.role == 'user';
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(mainAxisAlignment: user ? MainAxisAlignment.end : MainAxisAlignment.start, crossAxisAlignment: CrossAxisAlignment.end, children: [
          if (!user) const _AIAvatar(),
          if (!user) const SizedBox(width: 7),
          Flexible(child: Container(constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .82), padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12), decoration: BoxDecoration(color: user ? _purple.withOpacity(.21) : Colors.white.withOpacity(.065), borderRadius: BorderRadius.only(topLeft: const Radius.circular(20), topRight: const Radius.circular(20), bottomLeft: Radius.circular(user ? 20 : 5), bottomRight: Radius.circular(user ? 5 : 20)), border: Border.all(color: Colors.white.withOpacity(.10))), child: RichText(text: TextSpan(style: const TextStyle(color: _text, fontSize: 15, height: 1.5), children: [TextSpan(text: message.text), if (streaming) const TextSpan(text: ' ▌', style: TextStyle(color: _purple, fontWeight: FontWeight.w900))]))),
          if (streaming) const Padding(padding: EdgeInsets.only(left: 7, bottom: 4), child: Text('Generating', style: TextStyle(color: _muted, fontSize: 9))),
        ]),
      ),
    );
  }
}

class _AIAvatar extends StatefulWidget {
  const _AIAvatar();
  @override
  State<_AIAvatar> createState() => _AIAvatarState();
}
class _AIAvatarState extends State<_AIAvatar> with SingleTickerProviderStateMixin {
  late final AnimationController c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat(reverse: true);
  @override
  void dispose() { c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => ScaleTransition(scale: Tween(begin: .94, end: 1.05).animate(CurvedAnimation(parent: c, curve: Curves.easeInOut)), child: Container(width: 29, height: 29, decoration: BoxDecoration(shape: BoxShape.circle, gradient: const LinearGradient(colors: [_purple, _pink]), boxShadow: [BoxShadow(color: _purple.withOpacity(.35), blurRadius: 12)]), child: const Icon(Icons.auto_awesome, color: Colors.white, size: 15)));
}

class _HeroOrb extends StatefulWidget {
  const _HeroOrb();
  @override
  State<_HeroOrb> createState() => _HeroOrbState();
}
class _HeroOrbState extends State<_HeroOrb> with SingleTickerProviderStateMixin {
  late final AnimationController c = AnimationController(vsync: this, duration: const Duration(seconds: 3))..repeat();
  @override
  void dispose() { c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => RotationTransition(turns: c, child: Container(width: 92, height: 92, decoration: BoxDecoration(shape: BoxShape.circle, gradient: const LinearGradient(colors: [_purple, _pink, _gold]), boxShadow: [BoxShadow(color: _purple.withOpacity(.30), blurRadius: 34, spreadRadius: 7)]), child: const Center(child: Icon(Icons.auto_awesome, color: Colors.white, size: 38))));
}

class _GlassIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  const _GlassIcon({required this.icon, this.color = _text, this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, borderRadius: BorderRadius.circular(16), child: ClipRRect(borderRadius: BorderRadius.circular(16), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15), child: Container(width: 42, height: 42, decoration: BoxDecoration(color: Colors.white.withOpacity(.07), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(.12))), child: Icon(icon, color: color, size: 20)))));
}

class _GlassSheet extends StatelessWidget {
  final Widget child;
  const _GlassSheet({required this.child});
  @override
  Widget build(BuildContext context) => SafeArea(child: Padding(padding: const EdgeInsets.all(10), child: ClipRRect(borderRadius: BorderRadius.circular(28), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24), child: Container(padding: const EdgeInsets.fromLTRB(8, 18, 8, 10), decoration: BoxDecoration(color: const Color(0xEE10152A), borderRadius: BorderRadius.circular(28), border: Border.all(color: Colors.white.withOpacity(.12))), child: child)))));
}

class _GlowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..maskFilter = const MaskFilter.blur(BlurStyle.normal, 70);
    p.color = _purple.withOpacity(.12);
    canvas.drawCircle(Offset(size.width * .15, size.height * .18), 100, p);
    p.color = _pink.withOpacity(.07);
    canvas.drawCircle(Offset(size.width * .88, size.height * .55), 130, p);
    p.color = _gold.withOpacity(.045);
    canvas.drawCircle(Offset(size.width * .45, size.height * .9), 160, p);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

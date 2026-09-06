import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _chatGold = Color(0xFFD8B15A);
const _chatPurple = Color(0xFF9B7BFF);
const _chatPink = Color(0xFFFF8FCA);
const _chatBlue = Color(0xFF6CA8FF);
const _chatBg = Color(0xFF050713);
const _chatText = Color(0xFFF7F4FF);
const _chatMuted = Color(0xFFA8ABC0);

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _messages = <Map<String, String>>[];
  String _mode = 'Chat';
  XFile? _attachment;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
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
        if (rows.isNotEmpty) {
          _messages.addAll(rows.map<Map<String, String>>((row) {
            final map = Map<String, dynamic>.from(row as Map);
            return {
              'role': '${map['role'] ?? 'assistant'}',
              'text': '${map['content'] ?? ''}',
            };
          }));
        }
      }
    } catch (_) {}

    if (_messages.isEmpty) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final saved = prefs.getStringList('destiny_chat_history') ?? [];
        for (final item in saved) {
          final split = item.indexOf('|');
          if (split > 0) {
            _messages.add({
              'role': item.substring(0, split),
              'text': item.substring(split + 1),
            });
          }
        }
      } catch (_) {}
    }
    if (mounted) setState(() {});
    _scrollToBottom();
  }

  Future<void> _saveLocalHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final values = _messages
          .take(80)
          .map((m) => '${m['role']}|${m['text']}')
          .toList();
      await prefs.setStringList('destiny_chat_history', values);
    } catch (_) {}
  }

  Future<void> _saveCloudMessage(String role, String text) async {
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

  Future<void> _chooseImage() async {
    final image = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (image != null && mounted) setState(() => _attachment = image);
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty && _attachment == null) return;
    if (_loading) return;

    final prompt = _attachment == null
        ? text
        : '$text\n[Image attached: ${_attachment!.name}]'.trim();
    _controller.clear();
    final attachment = _attachment;
    setState(() {
      _attachment = null;
      _messages.add({'role': 'user', 'text': prompt});
      _loading = true;
    });
    await _saveCloudMessage('user', prompt);
    await _saveLocalHistory();
    _scrollToBottom();

    try {
      final response = await Supabase.instance.client.functions.invoke(
        'destiny-ai',
        body: {
          'mode': _mode,
          'messages': _messages
              .map((m) => {
                    'role': m['role'] == 'assistant' ? 'assistant' : 'user',
                    'content': m['text'] ?? '',
                  })
              .toList(),
          if (attachment != null) 'attachment_name': attachment.name,
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
      setState(() => _messages.add({'role': 'assistant', 'text': answer}));
      await _saveCloudMessage('assistant', answer);
      await _saveLocalHistory();
    } catch (e) {
      if (!mounted) return;
      setState(() => _messages.add({
            'role': 'assistant',
            'text': 'Sorry, I could not complete that request. Please try again.\n\n$e',
          }));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _clearChat() async {
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
    if (mounted) setState(_messages.clear);
  }

  void _showModes() {
    const modes = ['Chat', 'Code', 'Study', 'Write', 'Creative'];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _GlassSheet(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Choose an AI mode', style: TextStyle(color: _chatText, fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            for (final mode in modes)
              ListTile(
                leading: Icon(_mode == mode ? Icons.check_circle : Icons.circle_outlined, color: _mode == mode ? _chatGold : _chatMuted),
                title: Text(mode, style: const TextStyle(color: _chatText, fontWeight: FontWeight.w600)),
                onTap: () {
                  setState(() => _mode = mode);
                  Navigator.pop(context);
                },
              ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _chatBg,
      body: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _GlowPainter())),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(child: _buildMessages()),
                _buildComposer(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          _GlassCircle(
            child: const Icon(Icons.auto_awesome, color: _chatGold, size: 22),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Destiny AI', style: TextStyle(color: _chatText, fontSize: 18, fontWeight: FontWeight.w800)),
                Text('Your intelligent companion', style: TextStyle(color: _chatMuted, fontSize: 12)),
              ],
            ),
          ),
          _GlassButton(icon: Icons.tune_rounded, onTap: _showModes),
          const SizedBox(width: 8),
          _GlassButton(
            icon: Icons.more_horiz,
            onTap: () => showModalBottomSheet<void>(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => _GlassSheet(
                child: ListTile(
                  leading: const Icon(Icons.delete_outline, color: _chatText),
                  title: const Text('Clear chat history', style: TextStyle(color: _chatText)),
                  onTap: () {
                    Navigator.pop(context);
                    _clearChat();
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessages() {
    if (_messages.isEmpty && !_loading) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 48, 20, 24),
        children: [
          const SizedBox(height: 30),
          Center(child: _HeroOrb()),
          const SizedBox(height: 24),
          const Center(child: Text('Hi, I’m Destiny ✨', style: TextStyle(color: _chatText, fontSize: 28, fontWeight: FontWeight.w800))),
          const SizedBox(height: 10),
          const Center(child: Text('Ask me anything, create ideas, write code,\nor turn your imagination into media.', textAlign: TextAlign.center, style: TextStyle(color: _chatMuted, height: 1.5))),
          const SizedBox(height: 28),
          ...[
            'Explain something to me simply',
            'Help me write a professional message',
            'Build a modern app idea with me',
          ].map((text) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _SuggestionCard(text: text, onTap: () {
                  _controller.text = text;
                  _send();
                }),
              )),
        ],
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
      itemCount: _messages.length + (_loading ? 1 : 0),
      itemBuilder: (context, index) {
        if (_loading && index == _messages.length) return const _TypingBubble();
        final message = _messages[index];
        return _MessageBubble(
          role: message['role'] ?? 'assistant',
          text: message['text'] ?? '',
        );
      },
    );
  }

  Widget _buildComposer() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(26),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(.07),
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: Colors.white.withOpacity(.12)),
            ),
            child: Column(
              children: [
                if (_attachment != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
                    child: Row(children: [
                      const Icon(Icons.image_outlined, color: _chatPurple, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_attachment!.name, style: const TextStyle(color: _chatText, fontSize: 12), overflow: TextOverflow.ellipsis)),
                      IconButton(onPressed: () => setState(() => _attachment = null), icon: const Icon(Icons.close, color: _chatMuted, size: 18)),
                    ]),
                  ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    IconButton(onPressed: _chooseImage, icon: const Icon(Icons.add_photo_alternate_outlined, color: _chatMuted)),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 6,
                        style: const TextStyle(color: _chatText),
                        decoration: const InputDecoration(
                          hintText: 'Message Destiny…',
                          hintStyle: TextStyle(color: _chatMuted),
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
                        onTap: _send,
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: const BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [_chatPurple, _chatPink])),
                          child: Icon(_loading ? Icons.hourglass_top_rounded : Icons.arrow_upward_rounded, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 9),
                  child: Row(children: [
                    Text(_mode, style: const TextStyle(color: _chatMuted, fontSize: 11, fontWeight: FontWeight.w700)),
                    const Spacer(),
                    const Text('Destiny AI can make mistakes', style: TextStyle(color: _chatMuted, fontSize: 10)),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final String role;
  final String text;
  const _MessageBubble({required this.role, required this.text});

  @override
  Widget build(BuildContext context) {
    final isUser = role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .86),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          color: isUser ? _chatPurple.withOpacity(.20) : Colors.white.withOpacity(.065),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(isUser ? 20 : 5),
            bottomRight: Radius.circular(isUser ? 5 : 20),
          ),
          border: Border.all(color: Colors.white.withOpacity(.10)),
        ),
        child: Text(text, style: const TextStyle(color: _chatText, fontSize: 15, height: 1.5)),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();
  @override
  Widget build(BuildContext context) => const Align(
        alignment: Alignment.centerLeft,
        child: Padding(
          padding: EdgeInsets.only(left: 10, bottom: 12),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            _Dot(delay: 0),
            SizedBox(width: 4),
            _Dot(delay: 120),
            SizedBox(width: 4),
            _Dot(delay: 240),
          ]),
        ),
      );
}

class _Dot extends StatelessWidget {
  final int delay;
  const _Dot({required this.delay});
  @override
  Widget build(BuildContext context) => Container(width: 7, height: 7, decoration: const BoxDecoration(shape: BoxShape.circle, color: _chatPurple));
}

class _SuggestionCard extends StatelessWidget {
  final String text;
  final VoidCallback onTap;
  const _SuggestionCard({required this.text, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              padding: const EdgeInsets.all(15),
              decoration: BoxDecoration(color: Colors.white.withOpacity(.055), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withOpacity(.10))),
              child: Row(children: [const Icon(Icons.auto_awesome, color: _chatGold, size: 18), const SizedBox(width: 12), Expanded(child: Text(text, style: const TextStyle(color: _chatText, fontWeight: FontWeight.w600))), const Icon(Icons.arrow_forward_ios, color: _chatMuted, size: 14)]),
            ),
          ),
        ),
      );
}

class _GlassButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _GlassButton({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(onTap: onTap, child: _GlassCircle(child: Icon(icon, color: _chatText, size: 19)));
}

class _GlassCircle extends StatelessWidget {
  final Widget child;
  const _GlassCircle({required this.child});
  @override
  Widget build(BuildContext context) => Container(width: 42, height: 42, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(.07), border: Border.all(color: Colors.white.withOpacity(.11))), child: Center(child: child));
}

class _HeroOrb extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        width: 92,
        height: 92,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(colors: [_chatPurple, _chatPink], begin: Alignment.topLeft, end: Alignment.bottomRight),
          boxShadow: [BoxShadow(color: _chatPurple.withOpacity(.28), blurRadius: 36, spreadRadius: 8)],
        ),
        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 38),
      );
}

class _GlassSheet extends StatelessWidget {
  final Widget child;
  const _GlassSheet({required this.child});
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            padding: const EdgeInsets.fromLTRB(18, 22, 18, 30),
            decoration: BoxDecoration(color: const Color(0xFF101326).withOpacity(.94), border: Border(top: BorderSide(color: Colors.white.withOpacity(.12)))),
            child: child,
          ),
        ),
      );
}

class _GlowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p1 = Paint()..shader = RadialGradient(colors: [_chatPurple.withOpacity(.13), Colors.transparent]).createShader(Rect.fromCircle(center: Offset(size.width * .15, size.height * .18), radius: size.width * .65));
    final p2 = Paint()..shader = RadialGradient(colors: [_chatPink.withOpacity(.09), Colors.transparent]).createShader(Rect.fromCircle(center: Offset(size.width * .9, size.height * .35), radius: size.width * .6));
    canvas.drawRect(Offset.zero & size, p1);
    canvas.drawRect(Offset.zero & size, p2);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

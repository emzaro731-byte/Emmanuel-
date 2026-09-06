import 'dart:convert';
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
  State<ChatPage> createState() => _ChatState();
}

class _ChatState extends State<ChatPage> {
  final input = TextEditingController();
  final scroll = ScrollController();
  final picker = ImagePicker();
  final messages = <Map<String, String>>[];
  bool busy = false;
  String mode = 'Chat';
  XFile? attachment;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    input.dispose();
    scroll.dispose();
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
        if (rows is List && rows.isNotEmpty) {
          final cloud = rows
              .map<Map<String, String>>((row) => {
                    'role': (row['role'] ?? 'assistant').toString(),
                    'text': (row['content'] ?? '').toString(),
                  })
              .where((m) => (m['text'] ?? '').isNotEmpty)
              .toList();
          if (mounted) {
            setState(() => messages.addAll(cloud));
            _scrollToBottom();
          }
          return;
        }
      }
      final p = await SharedPreferences.getInstance();
      final raw = p.getString('destiny_chat_history');
      if (raw != null) {
        final list = (jsonDecode(raw) as List)
            .map((x) => Map<String, String>.from(x as Map))
            .toList();
        if (mounted) {
          setState(() => messages.addAll(list));
          _scrollToBottom();
        }
      }
    } catch (e) {
      debugPrint('History load failed: $e');
    }
  }

  Future<void> _saveLocalHistory() async {
    final p = await SharedPreferences.getInstance();
    final saved = messages.length > 80
        ? messages.sublist(messages.length - 80)
        : List<Map<String, String>>.from(messages);
    await p.setString('destiny_chat_history', jsonEncode(saved));
  }

  Future<void> _saveCloudMessage(String role, String content) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null || content.trim().isEmpty) return;
      await Supabase.instance.client.from('destiny_chat_messages').insert({
        'user_id': user.id,
        'role': role,
        'content': content.trim(),
      });
    } catch (e) {
      debugPrint('Cloud history save failed: $e');
    }
  }

  Future<void> chooseImage() async {
    try {
      final x = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
        maxWidth: 1800,
      );
      if (x != null && mounted) setState(() => attachment = x);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not select image: $e')),
        );
      }
    }
  }

  Future<void> send() async {
    final text = input.text.trim();
    if ((text.isEmpty && attachment == null) || busy) return;
    final prompt = attachment == null
        ? text
        : '$text\n[Image attached: ${attachment!.name}]'.trim();
    input.clear();
    setState(() {
      messages.add({'role': 'user', 'text': prompt});
      busy = true;
      attachment = null;
    });
    _scrollToBottom();
    await _saveCloudMessage('user', prompt);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Please sign in again.');
      final r = await Supabase.instance.client.functions.invoke(
        'destiny-ai',
        body: {
          'mode': mode,
          'messages': messages
              .map((m) => {
                    'role': m['role'] == 'assistant' ? 'assistant' : 'user',
                    'content': m['text'] ?? '',
                  })
              .toList(),
        },
      );
      final data = r.data is Map
          ? Map<String, dynamic>.from(r.data as Map)
          : <String, dynamic>{};
      if (r.status >= 400 || data['error'] != null) {
        throw Exception(data['error'] ?? 'AI request failed (${r.status}).');
      }
      final answer = (data['response'] ??
              data['answer'] ??
              data['message'] ??
              'No response returned.')
          .toString();
      if (mounted) setState(() => messages.add({'role': 'assistant', 'text': answer}));
      await _saveCloudMessage('assistant', answer);
      await _saveLocalHistory();
    } catch (e) {
      final errorText = 'Error: $e';
      if (mounted) setState(() => messages.add({'role': 'assistant', 'text': errorText}));
      await _saveCloudMessage('assistant', errorText);
      await _saveLocalHistory();
    } finally {
      if (mounted) setState(() => busy = false);
      _scrollToBottom();
    }
  }

  Future<void> clearChat() async {
    if (busy) return;
    setState(() => messages.clear());
    final p = await SharedPreferences.getInstance();
    await p.remove('destiny_chat_history');
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await Supabase.instance.client
            .from('destiny_chat_messages')
            .delete()
            .eq('user_id', user.id);
      }
    } catch (e) {
      debugPrint('Cloud history clear failed: $e');
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !scroll.hasClients) return;
      scroll.animateTo(
        scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _quickPrompt(String value) {
    input.text = value;
    input.selection = TextSelection.collapsed(offset: input.text.length);
    FocusScope.of(context).requestFocus(FocusNode());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _chatBg,
      body: Stack(
        children: [
          const _ChatAmbientBackground(),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: messages.isEmpty ? _buildEmptyState() : _buildMessages(),
                ),
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
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      child: _GlassSurface(
        radius: 24,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [_chatGold, _chatPink, _chatPurple],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: _chatPurple.withValues(alpha: .28),
                    blurRadius: 20,
                  ),
                ],
              ),
              child: const Icon(Icons.auto_awesome_rounded, color: Colors.white),
            ),
            const SizedBox(width: 11),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Destiny AI', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: _chatText)),
                  SizedBox(height: 2),
                  Text('Your intelligent companion', style: TextStyle(fontSize: 11, color: _chatMuted)),
                ],
              ),
            ),
            _ModePill(
              mode: mode,
              onTap: () => _showModes(),
            ),
            const SizedBox(width: 4),
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'clear') clearChat();
              },
              icon: const Icon(Icons.more_horiz_rounded, color: _chatText),
              color: const Color(0xFF15182A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: 'clear',
                  child: Row(children: [Icon(Icons.delete_outline_rounded, size: 20), SizedBox(width: 10), Text('Clear chat history')]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showModes() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _ModeSheet(current: mode),
    );
    if (selected != null && mounted) setState(() => mode = selected);
  }

  Widget _buildEmptyState() {
    final suggestions = [
      ('✨', 'Help me plan my day'),
      ('💡', 'Explain something simply'),
      ('💻', 'Write some code'),
      ('📝', 'Help me write something'),
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(22, 22, 22, 24),
      children: [
        const SizedBox(height: 26),
        Center(
          child: Container(
            width: 82,
            height: 82,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [_chatPurple, _chatPink, _chatGold],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [BoxShadow(color: _chatPurple.withValues(alpha: .25), blurRadius: 35)],
            ),
            child: const Icon(Icons.auto_awesome_rounded, size: 38, color: Colors.white),
          ),
        ),
        const SizedBox(height: 22),
        const Center(
          child: Text(
            'Hi, I’m Destiny ✨',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: _chatText),
          ),
        ),
        const SizedBox(height: 8),
        const Center(
          child: Text(
            'What would you like to create, learn, or explore today?',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, height: 1.45, color: _chatMuted),
          ),
        ),
        const SizedBox(height: 28),
        ...suggestions.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _SuggestionCard(
                emoji: item.$1,
                text: item.$2,
                onTap: () => _quickPrompt(item.$2),
              ),
            )),
        const SizedBox(height: 12),
        Center(
          child: Text(
            'Powered by Destiny AI • ${mode.toUpperCase()} mode',
            style: const TextStyle(fontSize: 11, color: _chatMuted),
          ),
        ),
      ],
    );
  }

  Widget _buildMessages() {
    return ListView.builder(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
      itemCount: messages.length + (busy ? 1 : 0),
      itemBuilder: (_, i) {
        if (busy && i == messages.length) return const _TypingBubble();
        final m = messages[i];
        return _MessageBubble(
          text: m['text'] ?? '',
          user: m['role'] == 'user',
        );
      },
    );
  }

  Widget _buildComposer() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 5, 12, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (attachment != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _GlassSurface(
                radius: 17,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.image_rounded, color: _chatGold, size: 20),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        attachment!.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: _chatText, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: () => setState(() => attachment = null),
                      icon: const Icon(Icons.close_rounded, size: 19, color: _chatMuted),
                    ),
                  ],
                ),
              ),
            ),
          _GlassSurface(
            radius: 27,
            padding: const EdgeInsets.fromLTRB(7, 7, 7, 7),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  tooltip: 'Attach image',
                  onPressed: busy ? null : chooseImage,
                  icon: const Icon(Icons.add_rounded, color: _chatText),
                ),
                Expanded(
                  child: TextField(
                    controller: input,
                    minLines: 1,
                    maxLines: 5,
                    textCapitalization: TextCapitalization.sentences,
                    style: const TextStyle(color: _chatText, fontSize: 15, height: 1.35),
                    onSubmitted: (_) => send(),
                    decoration: const InputDecoration(
                      hintText: 'Message Destiny AI…',
                      hintStyle: TextStyle(color: _chatMuted),
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 7, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: busy ? null : send,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 47,
                    height: 47,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: busy
                          ? LinearGradient(colors: [Colors.white.withValues(alpha: .12), Colors.white.withValues(alpha: .08)])
                          : const LinearGradient(colors: [_chatPurple, _chatPink], begin: Alignment.topLeft, end: Alignment.bottomRight),
                      boxShadow: busy ? null : [BoxShadow(color: _chatPurple.withValues(alpha: .25), blurRadius: 20)],
                    ),
                    child: Center(
                      child: busy
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.arrow_upward_rounded, color: Colors.white, size: 23),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 7),
          const Text(
            'Destiny AI can make mistakes. Check important information.',
            style: TextStyle(fontSize: 9.5, color: _chatMuted),
          ),
        ],
      ),
    );
  }
}

class _ChatAmbientBackground extends StatelessWidget {
  const _ChatAmbientBackground();
  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: Stack(
          children: [
            Positioned(top: -100, right: -80, child: _Glow(color: _chatPurple, size: 260)),
            Positioned(top: 180, left: -150, child: _Glow(color: _chatBlue, size: 300)),
            Positioned(bottom: -130, right: -90, child: _Glow(color: _chatPink, size: 300)),
            Positioned(bottom: 170, left: 60, child: _Glow(color: _chatGold, size: 120)),
          ],
        ),
      );
}

class _Glow extends StatelessWidget {
  final Color color;
  final double size;
  const _Glow({required this.color, required this.size});
  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color.withValues(alpha: .07),
          boxShadow: [BoxShadow(color: color.withValues(alpha: .11), blurRadius: 100, spreadRadius: 45)],
        ),
      );
}

class _GlassSurface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  const _GlassSurface({required this.child, required this.padding, this.radius = 24});
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .055),
              borderRadius: BorderRadius.circular(radius),
              border: Border.all(color: Colors.white.withValues(alpha: .105)),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .25), blurRadius: 28, offset: const Offset(0, 10))],
            ),
            child: child,
          ),
        ),
      );
}

class _ModePill extends StatelessWidget {
  final String mode;
  final VoidCallback onTap;
  const _ModePill({required this.mode, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [Colors.white.withValues(alpha: .08), _chatPurple.withValues(alpha: .10)]),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: Colors.white.withValues(alpha: .09)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.tune_rounded, size: 15, color: _chatGold),
            const SizedBox(width: 5),
            Text(mode, style: const TextStyle(color: _chatText, fontSize: 11, fontWeight: FontWeight.w700)),
            const SizedBox(width: 2),
            const Icon(Icons.keyboard_arrow_down_rounded, size: 15, color: _chatMuted),
          ]),
        ),
      );
}

class _SuggestionCard extends StatelessWidget {
  final String emoji;
  final String text;
  final VoidCallback onTap;
  const _SuggestionCard({required this.emoji, required this.text, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: _GlassSurface(
          radius: 20,
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
          child: Row(children: [
            Text(emoji, style: const TextStyle(fontSize: 21)),
            const SizedBox(width: 12),
            Expanded(child: Text(text, style: const TextStyle(color: _chatText, fontSize: 13.5, fontWeight: FontWeight.w600))),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: _chatMuted),
          ]),
        ),
      );
}

class _MessageBubble extends StatelessWidget {
  final String text;
  final bool user;
  const _MessageBubble({required this.text, required this.user});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 15),
      child: Row(
        mainAxisAlignment: user ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!user) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(colors: [_chatPurple, _chatPink]),
                boxShadow: [BoxShadow(color: _chatPurple.withValues(alpha: .20), blurRadius: 15)],
              ),
              child: const Icon(Icons.auto_awesome_rounded, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 700),
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
              decoration: BoxDecoration(
                gradient: user
                    ? const LinearGradient(colors: [_chatPurple, _chatPink], begin: Alignment.topLeft, end: Alignment.bottomRight)
                    : null,
                color: user ? null : Colors.white.withValues(alpha: .055),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(21),
                  topRight: const Radius.circular(21),
                  bottomLeft: Radius.circular(user ? 21 : 6),
                  bottomRight: Radius.circular(user ? 6 : 21),
                ),
                border: Border.all(color: Colors.white.withValues(alpha: user ? .10 : .09)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .18), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Text(
                text,
                style: const TextStyle(color: _chatText, fontSize: 14.5, height: 1.48),
              ),
            ),
          ),
          if (user) const SizedBox(width: 40),
        ],
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 15),
        child: Row(children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [_chatPurple, _chatPink])),
            child: const Icon(Icons.auto_awesome_rounded, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 8),
          _GlassSurface(
            radius: 20,
            padding: const EdgeInsets.symmetric(horizontal: 17, vertical: 14),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              for (int i = 0; i < 3; i++) ...[
                if (i > 0) const SizedBox(width: 4),
                Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: _chatMuted)),
              ],
            ]),
          ),
        ]),
      );
}

class _ModeSheet extends StatelessWidget {
  final String current;
  const _ModeSheet({required this.current});
  @override
  Widget build(BuildContext context) {
    const modes = [
      ('Chat', Icons.chat_bubble_outline_rounded, _chatPurple),
      ('Code', Icons.code_rounded, _chatBlue),
      ('Study', Icons.school_outlined, _chatGold),
      ('Write', Icons.edit_note_rounded, _chatPink),
      ('Creative', Icons.auto_awesome_outlined, _chatPurple),
    ];
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
      decoration: const BoxDecoration(
        color: Color(0xFF0B0E1B),
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 42, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(4))),
        const SizedBox(height: 20),
        const Align(alignment: Alignment.centerLeft, child: Text('Choose a mode', style: TextStyle(color: _chatText, fontSize: 20, fontWeight: FontWeight.w900))),
        const SizedBox(height: 14),
        ...modes.map((m) => ListTile(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(17)),
              tileColor: m.$1 == current ? Colors.white.withValues(alpha: .07) : Colors.transparent,
              leading: Container(width: 40, height: 40, decoration: BoxDecoration(shape: BoxShape.circle, color: m.$3.withValues(alpha: .14)), child: Icon(m.$2, color: m.$3, size: 20)),
              title: Text(m.$1, style: const TextStyle(color: _chatText, fontWeight: FontWeight.w700)),
              trailing: m.$1 == current ? const Icon(Icons.check_circle_rounded, color: _chatGold) : null,
              onTap: () => Navigator.pop(context, m.$1),
            )),
      ]),
    );
  }
}

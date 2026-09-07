import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/ai_request_builder.dart';
import '../services/model_service.dart';
import '../services/payment_service.dart';
import '../services/voice_service.dart';

const _gold = Color(0xFFD8B15A);
const _purple = Color(0xFF9B7BFF);
const _pink = Color(0xFFFF8FCA);
const _bg = Color(0xFF050713);
const _text = Color(0xFFF7F4FF);
const _muted = Color(0xFFA8ABC0);

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _messages = <Map<String, String>>[];
  final _voice = VoiceService.instance;
  String _mode = 'Chat';
  String _modelId = ModelService.models.first.id;
  XFile? _attachment;
  bool _loading = false;
  bool _speaking = false;

  @override
  void initState() {
    super.initState();
    _voice.initialize();
    _loadHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _voice.stop();
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
        _messages.addAll(rows.map<Map<String, String>>((row) {
          final map = Map<String, dynamic>.from(row as Map);
          return {'role': '${map['role'] ?? 'assistant'}', 'text': '${map['content'] ?? ''}'};
        }));
      }
    } catch (_) {}
    if (_messages.isEmpty) {
      try {
        final prefs = await SharedPreferences.getInstance();
        for (final item in prefs.getStringList('destiny_chat_history') ?? []) {
          final split = item.indexOf('|');
          if (split > 0) {
            _messages.add({'role': item.substring(0, split), 'text': item.substring(split + 1)});
          }
        }
      } catch (_) {}
    }
    if (mounted) setState(() {});
    _scrollToBottom();
  }

  Future<void> _saveHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('destiny_chat_history', _messages.take(80).map((m) => '${m['role']}|${m['text']}').toList());
    } catch (_) {}
  }

  Future<void> _saveCloud(String role, String text) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await Supabase.instance.client.from('destiny_chat_messages').insert({'user_id': user.id, 'role': role, 'content': text});
      }
    } catch (_) {}
  }

  Future<void> _chooseImage() async {
    final image = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (image != null && mounted) setState(() => _attachment = image);
  }

  Future<void> _selectModel() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _GlassSheet(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Choose Destiny model', style: TextStyle(color: _text, fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          ...ModelService.models.map((model) => ListTile(
                leading: Icon(model.premium ? Icons.workspace_premium : Icons.auto_awesome, color: model.id == _modelId ? _gold : _purple),
                title: Text(model.name, style: const TextStyle(color: _text, fontWeight: FontWeight.w700)),
                subtitle: Text(model.description, style: const TextStyle(color: _muted)),
                trailing: model.id == _modelId ? const Icon(Icons.check_circle, color: _gold) : null,
                onTap: () async {
                  if (model.premium && !await PaymentService().isPremium()) {
                    if (mounted) {
                      Navigator.pop(context);
                      _showPremium();
                    }
                    return;
                  }
                  if (mounted) Navigator.pop(context, model.id);
                },
              )),
          const SizedBox(height: 10),
        ]),
      ),
    );
    if (selected != null && mounted) setState(() => _modelId = selected);
  }

  void _showPremium() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF101326),
        title: const Text('Destiny Premium', style: TextStyle(color: _text)),
        content: const Text('Upgrade to unlock the Premium model and premium AI access.', style: TextStyle(color: _muted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Later')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await PaymentService().openPremiumCheckout();
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
              }
            },
            child: const Text('Upgrade'),
          ),
        ],
      ),
    );
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty && _attachment == null || _loading) return;
    final model = ModelService.byId(_modelId);
    if (model.premium && !await PaymentService().isPremium()) {
      _showPremium();
      return;
    }
    final attachment = _attachment;
    final prompt = attachment == null ? text : '${text.isEmpty ? 'Please analyze this image.' : text}\n[Image attached: ${attachment.name}]';
    _controller.clear();
    setState(() {
      _attachment = null;
      _messages.add({'role': 'user', 'text': prompt});
      _loading = true;
    });
    await _saveCloud('user', prompt);
    await _saveHistory();
    _scrollToBottom();

    try {
      final body = AiRequestBuilder.build(
        mode: _mode,
        model: _modelId,
        messages: _messages,
        memory: 'Use the conversation history as short-term memory. Be helpful, accurate and concise.',
      );
      if (attachment != null) body['attachment_name'] = attachment.name;
      final response = await Supabase.instance.client.functions.invoke('destiny-ai', body: body);
      final data = response.data is Map ? Map<String, dynamic>.from(response.data as Map) : <String, dynamic>{};
      if (response.status >= 400 || data['error'] != null) throw Exception(data['error'] ?? 'Destiny AI returned an error.');
      final answer = '${data['response'] ?? data['answer'] ?? data['message'] ?? ''}'.trim();
      if (answer.isEmpty) throw Exception('No response was returned.');
      if (!mounted) return;
      setState(() => _messages.add({'role': 'assistant', 'text': answer}));
      await _saveCloud('assistant', answer);
      await _saveHistory();
    } catch (e) {
      if (!mounted) return;
      setState(() => _messages.add({'role': 'assistant', 'text': 'Sorry, I could not complete that request. Please try again.\n\n$e'}));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        _scrollToBottom();
      }
    }
  }

  Future<void> _speak(String text) async {
    if (_speaking) {
      await _voice.stop();
      if (mounted) setState(() => _speaking = false);
      return;
    }
    if (mounted) setState(() => _speaking = true);
    await _voice.speak(text);
    if (mounted) setState(() => _speaking = false);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 280), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _clearChat() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) await Supabase.instance.client.from('destiny_chat_messages').delete().eq('user_id', user.id);
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
      builder: (_) => _GlassSheet(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('Choose an AI mode', style: TextStyle(color: _text, fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...modes.map((mode) => ListTile(
              leading: Icon(_mode == mode ? Icons.check_circle : Icons.circle_outlined, color: _mode == mode ? _gold : _muted),
              title: Text(mode, style: const TextStyle(color: _text, fontWeight: FontWeight.w600)),
              onTap: () { setState(() => _mode = mode); Navigator.pop(context); },
            )),
        const SizedBox(height: 8),
      ])),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: _bg,
        body: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _GlowPainter())),
          SafeArea(child: Column(children: [_header(), Expanded(child: _messagesView()), _composer()])),
        ]),
      );

  Widget _header() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(children: [
          _Circle(child: const Icon(Icons.auto_awesome, color: _gold, size: 22)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Destiny AI', style: TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.w800)),
            Text('${ModelService.byId(_modelId).name} • $_mode', style: const TextStyle(color: _muted, fontSize: 12)),
          ])),
          _Button(icon: Icons.memory_rounded, onTap: _selectModel),
          const SizedBox(width: 7),
          _Button(icon: Icons.tune_rounded, onTap: _showModes),
          const SizedBox(width: 7),
          _Button(icon: Icons.more_horiz, onTap: () => showModalBottomSheet<void>(
            context: context,
            backgroundColor: Colors.transparent,
            builder: (_) => _GlassSheet(child: ListTile(
              leading: const Icon(Icons.delete_outline, color: _text),
              title: const Text('Clear chat history', style: TextStyle(color: _text)),
              onTap: () { Navigator.pop(context); _clearChat(); },
            )),
          )),
        ]),
      );

  Widget _messagesView() {
    if (_messages.isEmpty && !_loading) {
      return ListView(padding: const EdgeInsets.fromLTRB(20, 55, 20, 24), children: [
        const Center(child: _Orb()),
        const SizedBox(height: 24),
        const Center(child: Text('Hi, I’m Destiny ✨', style: TextStyle(color: _text, fontSize: 28, fontWeight: FontWeight.w800))),
        const SizedBox(height: 10),
        const Center(child: Text('Ask me anything, create ideas, write code,\nor turn your imagination into media.', textAlign: TextAlign.center, style: TextStyle(color: _muted, height: 1.5))),
        const SizedBox(height: 26),
        ...['Explain something to me simply', 'Help me write a professional message', 'Build a modern app idea with me'].map((text) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _Suggestion(text: text, onTap: () { _controller.text = text; _send(); }))),
      ]);
    }
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
      itemCount: _messages.length + (_loading ? 1 : 0),
      itemBuilder: (_, index) {
        if (_loading && index == _messages.length) return const _Typing();
        final message = _messages[index];
        return _Bubble(role: message['role'] ?? 'assistant', text: message['text'] ?? '', onSpeak: (message['role'] == 'assistant') ? () => _speak(message['text'] ?? '') : null, speaking: _speaking);
      },
    );
  }

  Widget _composer() => Padding(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
        child: ClipRRect(borderRadius: BorderRadius.circular(26), child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(decoration: BoxDecoration(color: Colors.white.withOpacity(.07), borderRadius: BorderRadius.circular(26), border: Border.all(color: Colors.white.withOpacity(.12))), child: Column(children: [
            if (_attachment != null) Padding(padding: const EdgeInsets.fromLTRB(14, 10, 14, 0), child: Row(children: [const Icon(Icons.image_outlined, color: _purple, size: 18), const SizedBox(width: 8), Expanded(child: Text(_attachment!.name, style: const TextStyle(color: _text, fontSize: 12), overflow: TextOverflow.ellipsis)), IconButton(onPressed: () => setState(() => _attachment = null), icon: const Icon(Icons.close, color: _muted, size: 18))])),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              IconButton(onPressed: _chooseImage, icon: const Icon(Icons.add_photo_alternate_outlined, color: _muted)),
              Expanded(child: TextField(controller: _controller, minLines: 1, maxLines: 6, style: const TextStyle(color: _text), decoration: const InputDecoration(hintText: 'Message Destiny…', hintStyle: TextStyle(color: _muted), border: InputBorder.none, contentPadding: EdgeInsets.symmetric(vertical: 15)), onSubmitted: (_) => _send())),
              Padding(padding: const EdgeInsets.all(7), child: GestureDetector(onTap: _send, child: Container(width: 44, height: 44, decoration: const BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [_purple, _pink])), child: Icon(_loading ? Icons.hourglass_top_rounded : Icons.arrow_upward_rounded, color: Colors.white)))),
            ]),
            Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 9), child: Row(children: [Text(_mode, style: const TextStyle(color: _muted, fontSize: 11, fontWeight: FontWeight.w700)), const Spacer(), Text(ModelService.byId(_modelId).name, style: const TextStyle(color: _gold, fontSize: 10, fontWeight: FontWeight.w700))])),
          ])),
        ));

}

class _Bubble extends StatelessWidget {
  final String role, text;
  final VoidCallback? onSpeak;
  final bool speaking;
  const _Bubble({required this.role, required this.text, this.onSpeak, this.speaking = false});
  @override
  Widget build(BuildContext context) {
    final user = role == 'user';
    return Align(alignment: user ? Alignment.centerRight : Alignment.centerLeft, child: Container(constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .86), margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.fromLTRB(16, 13, 8, 8), decoration: BoxDecoration(color: user ? _purple.withOpacity(.20) : Colors.white.withOpacity(.065), borderRadius: BorderRadius.only(topLeft: const Radius.circular(20), topRight: const Radius.circular(20), bottomLeft: Radius.circular(user ? 20 : 5), bottomRight: Radius.circular(user ? 5 : 20)), border: Border.all(color: Colors.white.withOpacity(.10))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(text, style: const TextStyle(color: _text, fontSize: 15, height: 1.5)), if (onSpeak != null) Align(alignment: Alignment.centerRight, child: IconButton(tooltip: speaking ? 'Stop voice' : 'Read aloud', onPressed: onSpeak, icon: Icon(speaking ? Icons.stop_circle_outlined : Icons.volume_up_outlined, color: _gold, size: 20)))]));
  }
}

class _Typing extends StatelessWidget {
  const _Typing();
  @override
  Widget build(BuildContext context) => const Align(alignment: Alignment.centerLeft, child: Padding(padding: EdgeInsets.only(left: 10, bottom: 12), child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.more_horiz, color: _purple), SizedBox(width: 5), Text('Destiny is thinking…', style: TextStyle(color: _muted, fontSize: 12))])));
}

class _Suggestion extends StatelessWidget {
  final String text; final VoidCallback onTap;
  const _Suggestion({required this.text, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(onTap: onTap, child: Container(padding: const EdgeInsets.all(15), decoration: BoxDecoration(color: Colors.white.withOpacity(.055), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withOpacity(.10))), child: Row(children: [const Icon(Icons.auto_awesome, color: _gold, size: 18), const SizedBox(width: 12), Expanded(child: Text(text, style: const TextStyle(color: _text, fontWeight: FontWeight.w600))), const Icon(Icons.arrow_forward_ios, color: _muted, size: 14)])));
}

class _Button extends StatelessWidget {
  final IconData icon; final VoidCallback onTap;
  const _Button({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(onTap: onTap, child: _Circle(child: Icon(icon, color: _text, size: 19)));
}

class _Circle extends StatelessWidget {
  final Widget child; const _Circle({required this.child});
  @override
  Widget build(BuildContext context) => Container(width: 42, height: 42, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(.07), border: Border.all(color: Colors.white.withOpacity(.11))), child: Center(child: child));
}

class _Orb extends StatelessWidget {
  const _Orb();
  @override
  Widget build(BuildContext context) => Container(width: 92, height: 92, decoration: BoxDecoration(shape: BoxShape.circle, gradient: const LinearGradient(colors: [_purple, _pink]), boxShadow: [BoxShadow(color: _purple.withOpacity(.28), blurRadius: 36, spreadRadius: 8)]), child: const Icon(Icons.auto_awesome, color: Colors.white, size: 38));
}

class _GlassSheet extends StatelessWidget {
  final Widget child; const _GlassSheet({required this.child});
  @override
  Widget build(BuildContext context) => ClipRRect(borderRadius: const BorderRadius.vertical(top: Radius.circular(30)), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24), child: Container(padding: const EdgeInsets.fromLTRB(18, 22, 18, 30), decoration: BoxDecoration(color: const Color(0xFF101326).withOpacity(.96), border: Border(top: BorderSide(color: Colors.white.withOpacity(.12)))), child: child)));
}

class _GlowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p1 = Paint()..shader = RadialGradient(colors: [_purple.withOpacity(.13), Colors.transparent]).createShader(Rect.fromCircle(center: Offset(size.width * .15, size.height * .18), radius: size.width * .65));
    final p2 = Paint()..shader = RadialGradient(colors: [_pink.withOpacity(.09), Colors.transparent]).createShader(Rect.fromCircle(center: Offset(size.width * .9, size.height * .35), radius: size.width * .6));
    canvas.drawRect(Offset.zero & size, p1); canvas.drawRect(Offset.zero & size, p2);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

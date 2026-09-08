from pathlib import Path
import re

FILES = [
    Path('flutter/lib/screens/chat_page.dart'),
    Path('flutter/lib/screens/chat_page_v2.dart'),
]


def repair_widgets(text: str) -> str:
    start = text.find('  Widget _header()')
    marker = '\n}\n\nclass _ChatMessage'
    end = text.find(marker, start)
    if start < 0 or end < 0:
        return text
    replacement = r'''  Widget _header() => Padding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 8), child: Row(children: [
    _GlassIcon(icon: Icons.auto_awesome, color: _gold), const SizedBox(width: 12),
    const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Destiny AI', style: TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.w900)), Text('Live AI streaming', style: TextStyle(color: _muted, fontSize: 11))])),
    _GlassIcon(icon: Icons.tune_rounded, onTap: _showModes), const SizedBox(width: 7), _GlassIcon(icon: Icons.more_horiz, onTap: _showMoreMenu),
  ]));

  void _showMoreMenu() {
    showModalBottomSheet<void>(context: context, backgroundColor: Colors.transparent, builder: (_) => _GlassSheet(child: Column(mainAxisSize: MainAxisSize.min, children: [
      ListTile(leading: const Icon(Icons.auto_awesome, color: _purple), title: const Text('AI Studio', style: TextStyle(color: _text)), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const MediaStudioPage())); }),
      ListTile(leading: const Icon(Icons.workspace_premium, color: _gold), title: const Text('Upgrade to Pro', style: TextStyle(color: _text)), onTap: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentScreen())); }),
      ListTile(leading: const Icon(Icons.delete_outline, color: _text), title: const Text('Clear chat', style: TextStyle(color: _text)), onTap: () { Navigator.pop(context); _clear(); }),
    ])));
  }

  Widget _messagesView() {
    if (_messages.isEmpty) return ListView(padding: const EdgeInsets.fromLTRB(20, 44, 20, 24), children: [const _HeroOrb(), const SizedBox(height: 22), const Text('Hi, I’m Destiny ✨', textAlign: TextAlign.center, style: TextStyle(color: _text, fontSize: 28, fontWeight: FontWeight.w900)), const SizedBox(height: 9), const Text('Chat, code, study, write and create\nwith live AI responses.', textAlign: TextAlign.center, style: TextStyle(color: _muted, height: 1.5)), const SizedBox(height: 25), _suggestion('Explain something to me simply'), _suggestion('Help me write a professional message'), _suggestion('Build a modern app idea with me'), _suggestion('Create an image or video concept')]);
    return ListView.builder(controller: _scroll, padding: const EdgeInsets.fromLTRB(14, 12, 14, 18), itemCount: _messages.length, itemBuilder: (_, i) => _Bubble(message: _messages[i], streaming: _messages[i].id == _streamingId, onCopy: _copyMessage, onShare: _shareMessage, onSpeak: _speakMessage));
  }

  Widget _suggestion(String text) => Padding(padding: const EdgeInsets.only(bottom: 10), child: InkWell(borderRadius: BorderRadius.circular(18), onTap: () { _input.text = text; _send(); }, child: ClipRRect(borderRadius: BorderRadius.circular(18), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16), child: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white.withOpacity(.06), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withOpacity(.10))), child: Row(children: [const Icon(Icons.auto_awesome, color: _purple, size: 18), const SizedBox(width: 10), Expanded(child: Text(text, style: const TextStyle(color: _text, fontWeight: FontWeight.w600))), const Icon(Icons.arrow_forward_ios_rounded, color: _muted, size: 13)])))));

  Widget _composer() => Padding(padding: const EdgeInsets.fromLTRB(11, 4, 11, 11), child: ClipRRect(borderRadius: BorderRadius.circular(27), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24), child: Container(decoration: BoxDecoration(color: Colors.white.withOpacity(.075), borderRadius: BorderRadius.circular(27), border: Border.all(color: Colors.white.withOpacity(.13))), child: Column(children: [
    _attachmentPreview(),
    Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      IconButton(onPressed: _toggleListening, icon: Icon(_listening ? Icons.mic : Icons.mic_none_rounded, color: _listening ? _pink : _muted)),
      IconButton(onPressed: _pickImage, icon: const Icon(Icons.add_photo_alternate_outlined, color: _muted)),
      Expanded(child: TextField(controller: _input, minLines: 1, maxLines: 6, style: const TextStyle(color: _text, fontSize: 15), decoration: const InputDecoration(hintText: 'Message Destiny…', hintStyle: TextStyle(color: _muted), border: InputBorder.none, filled: false, contentPadding: EdgeInsets.symmetric(vertical: 15)), onSubmitted: (_) => _send())),
      Padding(padding: const EdgeInsets.all(7), child: GestureDetector(onTap: _busy ? _stopStream : _send, child: AnimatedContainer(duration: const Duration(milliseconds: 250), width: 45, height: 45, decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: _busy ? [_gold, _pink] : [_purple, _pink])), child: Icon(_busy ? Icons.stop_rounded : Icons.arrow_upward_rounded, color: Colors.white)))),
    ]),
    Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 9), child: Row(children: [Text(_mode, style: const TextStyle(color: _muted, fontSize: 11, fontWeight: FontWeight.w700)), const Spacer(), Text(_busy ? 'Generating live • Tap stop' : (_listening ? 'Listening…' : 'Live token streaming enabled'), style: const TextStyle(color: _muted, fontSize: 10))])),
  ]))));

  Widget _attachmentPreview() {
    final attachment = _attachment;
    if (attachment == null) return const SizedBox.shrink();
    return Padding(padding: const EdgeInsets.fromLTRB(14, 9, 9, 0), child: Row(children: [const Icon(Icons.image_outlined, color: _purple, size: 18), const SizedBox(width: 8), Expanded(child: Text(attachment.name, style: const TextStyle(color: _text, fontSize: 12), overflow: TextOverflow.ellipsis)), IconButton(onPressed: () => setState(() => _attachment = null), icon: const Icon(Icons.close, color: _muted, size: 18))]));
  }
'''
    return text[:start] + replacement + text[end:]


def add_voice_and_actions(text: str) -> str:
    anchor = "import 'package:flutter/material.dart';"
    additions = ["import 'package:flutter/services.dart';", "import 'package:flutter_tts/flutter_tts.dart';", "import 'package:share_plus/share_plus.dart';", "import 'package:speech_to_text/speech_to_text.dart';"]
    if anchor in text:
        missing = [x for x in additions if x not in text]
        if missing: text = text.replace(anchor, anchor + '\n' + '\n'.join(missing), 1)

    state = "  bool _busy = false;"
    state_new = """  bool _busy = false;
  final SpeechToText _speech = SpeechToText();
  final FlutterTts _tts = FlutterTts();
  bool _listening = false;
  bool _speaking = false;"""
    if 'final SpeechToText _speech' not in text and state in text: text = text.replace(state, state_new, 1)

    anchor = '  Future<void> _send() async {'
    methods = r'''  Future<void> _toggleListening() async {
    if (_listening) { await _speech.stop(); if (mounted) setState(() => _listening = false); return; }
    final available = await _speech.initialize(onStatus: (status) { if (status == 'done' || status == 'notListening') { if (mounted) setState(() => _listening = false); } }, onError: (_) { if (mounted) setState(() => _listening = false); });
    if (!available) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Voice input is not available on this device.'))); return; }
    if (mounted) setState(() => _listening = true);
    await _speech.listen(onResult: (result) { if (mounted) setState(() => _input.text = result.recognizedWords); }, listenFor: const Duration(minutes: 1), pauseFor: const Duration(seconds: 4), partialResults: true);
  }

  Future<void> _copyMessage(String text) async {
    if (text.trim().isEmpty) return;
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied to clipboard'), duration: Duration(seconds: 1)));
  }

  Future<void> _shareMessage(String text) async {
    if (text.trim().isEmpty) return;
    await SharePlus.instance.share(ShareParams(text: text, title: 'Destiny AI response'));
  }

  Future<void> _speakMessage(String text) async {
    if (text.trim().isEmpty) return;
    if (_speaking) { await _tts.stop(); if (mounted) setState(() => _speaking = false); return; }
    await _tts.setLanguage('en-US'); await _tts.setSpeechRate(0.48); await _tts.setVolume(1.0); await _tts.setPitch(1.0);
    if (mounted) setState(() => _speaking = true);
    _tts.setCompletionHandler(() { if (mounted) setState(() => _speaking = false); });
    await _tts.speak(text);
  }

'''
    if 'Future<void> _toggleListening()' not in text and anchor in text: text = text.replace(anchor, methods + anchor, 1)

    pattern = re.compile(r'class _Bubble extends StatelessWidget \{.*?\nclass _AIAvatar', re.S)
    replacement = r'''class _Bubble extends StatelessWidget {
  final _ChatMessage message;
  final bool streaming;
  final Future<void> Function(String) onCopy;
  final Future<void> Function(String) onShare;
  final Future<void> Function(String) onSpeak;
  const _Bubble({required this.message, required this.streaming, required this.onCopy, required this.onShare, required this.onSpeak});
  @override
  Widget build(BuildContext context) {
    final user = message.role == 'user';
    return Align(alignment: user ? Alignment.centerRight : Alignment.centerLeft, child: Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(mainAxisAlignment: user ? MainAxisAlignment.end : MainAxisAlignment.start, crossAxisAlignment: CrossAxisAlignment.end, children: [
      user ? const SizedBox.shrink() : const _AIAvatar(), user ? const SizedBox.shrink() : const SizedBox(width: 7),
      Flexible(child: Column(crossAxisAlignment: user ? CrossAxisAlignment.end : CrossAxisAlignment.start, children: [
        Container(constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .82), padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12), decoration: BoxDecoration(color: user ? _purple.withOpacity(.21) : Colors.white.withOpacity(.065), borderRadius: BorderRadius.only(topLeft: const Radius.circular(20), topRight: const Radius.circular(20), bottomLeft: Radius.circular(user ? 20 : 5), bottomRight: Radius.circular(user ? 5 : 20)), border: Border.all(color: Colors.white.withOpacity(.10))), child: RichText(text: TextSpan(style: const TextStyle(color: _text, fontSize: 15, height: 1.5), children: [TextSpan(text: message.text), streaming ? const TextSpan(text: ' ▌', style: TextStyle(color: _purple, fontWeight: FontWeight.w900)) : const TextSpan(text: '')])),
        if (!user && !streaming && message.text.trim().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 5, left: 3), child: Row(mainAxisSize: MainAxisSize.min, children: [
          _BubbleAction(icon: Icons.copy_rounded, label: 'Copy', onTap: () => onCopy(message.text)),
          _BubbleAction(icon: Icons.volume_up_rounded, label: 'Voice', onTap: () => onSpeak(message.text)),
          _BubbleAction(icon: Icons.share_rounded, label: 'Share', onTap: () => onShare(message.text)),
        ])),
      ])),
      streaming ? const Padding(padding: EdgeInsets.only(left: 7, bottom: 4), child: Text('Generating', style: TextStyle(color: _muted, fontSize: 9))) : const SizedBox.shrink(),
    ])));
  }
}

class _BubbleAction extends StatelessWidget {
  final IconData icon; final String label; final VoidCallback onTap;
  const _BubbleAction({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(right: 5), child: InkWell(borderRadius: BorderRadius.circular(12), onTap: onTap, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: Colors.white.withOpacity(.055), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(.08))), child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, color: _muted, size: 13), const SizedBox(width: 4), Text(label, style: const TextStyle(color: _muted, fontSize: 9, fontWeight: FontWeight.w600))]))));
}

class _AIAvatar'''
    text, _ = pattern.subn(replacement, text, count=1)
    return text


for path in FILES:
    if not path.exists(): continue
    original = path.read_text(encoding='utf-8')
    updated = add_voice_and_actions(repair_widgets(original))
    if updated != original:
        path.write_text(updated, encoding='utf-8')
        print(f'Upgraded chat controls: {path}')

manifest = Path('flutter/android/app/src/main/AndroidManifest.xml')
if manifest.exists():
    m = manifest.read_text(encoding='utf-8')
    permission = '    <uses-permission android:name="android.permission.RECORD_AUDIO" />'
    if 'android.permission.RECORD_AUDIO' not in m:
        m = m.replace('<manifest ', '<manifest ', 1)
        marker = '    <uses-permission android:name="android.permission.INTERNET" />'
        if marker in m:
            m = m.replace(marker, marker + '\n' + permission, 1)
        else:
            m = m.replace('>\n', '>\n' + permission + '\n', 1)
        manifest.write_text(m, encoding='utf-8')
        print('Added Android microphone permission')

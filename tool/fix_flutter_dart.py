from pathlib import Path
import re

FILES = [
    Path('flutter/lib/screens/chat_page.dart'),
    Path('flutter/lib/screens/chat_page_v2.dart'),
]


def repair_widgets(text: str) -> str:
    # Replace the fragile, deeply nested widget section with a parser-safe
    # version. This runs before dart format in CI, so malformed generated
    # parentheses cannot stop the build.
    start = text.find('  Widget _header()')
    marker = '\n}\n\nclass _ChatMessage'
    end = text.find(marker, start)
    if start < 0 or end < 0:
        return text

    replacement = r'''  Widget _header() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          children: [
            _GlassIcon(icon: Icons.auto_awesome, color: _gold),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Destiny AI', style: TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.w900)),
                  Text('Live AI streaming', style: TextStyle(color: _muted, fontSize: 11)),
                ],
              ),
            ),
            _GlassIcon(icon: Icons.tune_rounded, onTap: _showModes),
            const SizedBox(width: 7),
            _GlassIcon(icon: Icons.more_horiz, onTap: _showMoreMenu),
          ],
        ),
      );

  void _showMoreMenu() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _GlassSheet(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.auto_awesome, color: _purple),
              title: const Text('AI Studio', style: TextStyle(color: _text)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const MediaStudioPage()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.workspace_premium, color: _gold),
              title: const Text('Upgrade to Pro', style: TextStyle(color: _text)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: _text),
              title: const Text('Clear chat', style: TextStyle(color: _text)),
              onTap: () {
                Navigator.pop(context);
                _clear();
              },
            ),
          ],
        ),
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
            style: TextStyle(color: _text, fontSize: 28, fontWeight: FontWeight.w900),
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
      itemBuilder: (_, i) => _Bubble(
        message: _messages[i],
        streaming: _messages[i].id == _streamingId,
      ),
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
                        style: const TextStyle(color: _text, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, color: _muted, size: 13),
                  ],
                ),
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
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(.075),
                borderRadius: BorderRadius.circular(27),
                border: Border.all(color: Colors.white.withOpacity(.13)),
              ),
              child: Column(
                children: [
                  _attachmentPreview(),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      IconButton(
                        onPressed: _pickImage,
                        icon: const Icon(Icons.add_photo_alternate_outlined, color: _muted),
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
                              _busy ? Icons.stop_rounded : Icons.arrow_upward_rounded,
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
                        Text(_mode, style: const TextStyle(color: _muted, fontSize: 11, fontWeight: FontWeight.w700)),
                        const Spacer(),
                        Text(
                          _busy ? 'Generating • Tap stop' : 'Destiny AI can make mistakes',
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
'''
    return text[:start] + replacement + text[end:]


for path in FILES:
    if not path.exists():
        continue
    original = path.read_text(encoding='utf-8')
    updated = repair_widgets(original)
    if updated != original:
        path.write_text(updated, encoding='utf-8')
        print(f'Repaired Flutter chat widget section: {path}')

from pathlib import Path

FILES = [
    Path('flutter/lib/screens/chat_page.dart'),
    Path('flutter/lib/screens/chat_page_v2.dart'),
]

OLD = """          if (streaming) const Padding(padding: EdgeInsets.only(left: 7, bottom: 4), child: Text('Generating', style: TextStyle(color: _muted, fontSize: 9))),"""
NEW = """          streaming
              ? const Padding(
                  padding: EdgeInsets.only(left: 7, bottom: 4),
                  child: Text(
                    'Generating',
                    style: TextStyle(color: _muted, fontSize: 9),
                  ),
                )
              : const SizedBox.shrink(),"""

for path in FILES:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    updated = text.replace(OLD, NEW)
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        print(f'Fixed streaming bubble syntax: {path}')

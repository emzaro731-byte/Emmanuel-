from pathlib import Path

FILES = [
    Path('flutter/lib/screens/chat_page.dart'),
    Path('flutter/lib/screens/chat_page_v2.dart'),
]

# The generated chat screen previously contained one extra closing parenthesis
# in the overflow-menu expression. Keep this repair deterministic and idempotent
# so dart format can always parse the checked-out source.
BAD = "    ]))))),\n  ]));"
GOOD = "    ])))),\n  ]));"

for path in FILES:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    updated = text.replace(BAD, GOOD)
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        print(f'Normalized chat syntax: {path}')

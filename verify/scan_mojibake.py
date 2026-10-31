"""Flag mojibake in source files: Latin-1/CP1252 sequences where Arabic should be."""
import io, os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(BASE, 'web-app')
SKIP_DIRS = {'.next', 'node_modules', '.git', '.turbo'}

# Characters that only appear when UTF-8 Arabic is decoded as Latin-1/CP1252.
SUSPECT = set('ÙÑÖÜßáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ')
SUSPECT |= {chr(c) for c in range(0x80, 0x100)}
ARABIC = re.compile(r'[\u0600-\u06FF]')
ELLIPSIS_BROKEN = re.compile(r'[-ؿ]')

problems = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for name in filenames:
        if not name.endswith(('.ts', '.tsx', '.css', '.sql', '.json', '.mjs', '.md', '.example')):
            continue
        full = os.path.join(dirpath, name)
        raw = io.open(full, 'rb').read()
        rel = os.path.relpath(full, BASE)
        if raw[:3] == b'\xef\xbb\xbf':
            problems.append((rel, 'UTF-8 BOM'))
        try:
            text = raw.decode('utf-8')
        except UnicodeDecodeError as exc:
            problems.append((rel, f'invalid utf-8: {exc}'))
            continue
        for lineno, line in enumerate(text.split('\n'), 1):
            hits = [c for c in line if c in SUSPECT and not ARABIC.match(c)]
            # A line is suspicious if it mixes Latin-1 letters with Arabic.
            if hits and ARABIC.search(line):
                problems.append((rel, f'line {lineno}: mixed mojibake {hits[:6]!r}'))
            elif hits and name.endswith(('.ts', '.tsx', '.css', '.sql', '.mjs')):
                problems.append((rel, f'line {lineno}: suspect chars {hits[:6]!r}'))

if not problems:
    print('clean: no mojibake detected')
else:
    for rel, msg in problems:
        print(f'{rel}: {msg}')
    print(f'\n{len(problems)} problem(s)')

"""Strip a UTF-8 BOM from source files (safe UTF-8 round-trip)."""
import io, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(BASE, 'web-app')
SKIP = {'.next', 'node_modules', '.git'}

fixed = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP]
    for name in filenames:
        if not name.endswith(('.ts', '.tsx', '.css', '.sql', '.json', '.mjs', '.md', '.example')):
            continue
        full = os.path.join(dirpath, name)
        raw = io.open(full, 'rb').read()
        if raw[:3] == b'\xef\xbb\xbf':
            io.open(full, 'wb').write(raw[3:])
            fixed.append(os.path.relpath(full, BASE))

print('BOM stripped from:', fixed or 'nothing')

import urllib.request, re

h = urllib.request.urlopen('http://localhost:3111/', timeout=120).read().decode('utf-8').replace('<!-- -->', '')
m = re.search(r'bg-cocoa px-3\.5[^>]*>([^<]*)<', h)
print('pill text:', repr(m.group(1)) if m else None)
print('codepoints:', [hex(ord(c)) for c in m.group(1)] if m else None)
print('contains Arabic:', bool(re.search(r'[\u0600-\u06FF]', m.group(1))) if m else None)

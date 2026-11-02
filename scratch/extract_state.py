import re, os, sys
s = open('You-Cosmetics.html', encoding='utf-8', errors='ignore').read()
i = s.find('J("div",{dir:"rtl"')
if i < 0:
    print('not found'); sys.exit(1)
# sanity: check Tajawal + fonts
for kw in ['Tajawal', 'wght', 'scroll-behavior', 'slideUp', 'line-clamp']:
    print(kw, s.count(kw))
# print the toast / scroll helpers + state hooks region
j = s.find('NV=()=>')
print('NV at', j)
print(s[j-6000:j+400] if j > 0 else 'NV missing')
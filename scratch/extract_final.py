import json
path = 'products_raw.json'
with open(path, encoding='utf-8', errors='ignore') as f:
    s = f.read()
# try eval in safe way
try:
    # replace some problematic constructs if any
    import ast
    # not directly parseable as json; use eval with no builtins? risky but it's local file
    pass
except:
    pass

# try with eval in restricted context
code = s
# convert to proper JS object string by wrapping
try:
    result = eval('(' + code + ')', {"__builtins__": {}}, {})
    with open('products_final.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(len(result))
except Exception as e:
    print('ERR')

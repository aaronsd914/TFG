import re
path = r'frontend/src/components/ProductosPage.jsx'
c = open(path,'r',encoding='utf-8').read()
orig = c

pats = [
    (r"sileo\.warning\(\{ title: '[^']*Faltan campos[^']*', description: msg \}\);",
     "sileo.warning({\n        title: t('products.notifMissingFieldsTitle'),\n        description: t('products.notifMissingFieldsDesc', { fields: v.missing.join(', ') }),\n      });"),
    (r"sileo\.error\(\{ title: '[^']*No se pudo crear el producto', description: e2\.message \}\);",
     "sileo.error({ title: t('products.notifCreateErrorTitle'), description: e2.message });"),
    (r"sileo\.warning\(\{ title: '[^']*Selecciona un producto'[^}]+\}\);",
     "sileo.warning({\n      title: t('products.notifSelectProductTitle'),\n      description: t('products.notifSelectProductDesc'),\n    });"),
    (r"sileo\.error\(\{ title: '[^']*No se pudo actualizar', description: e2\.message \}\);",
     "sileo.error({ title: t('products.notifUpdateErrorTitle'), description: e2.message });"),
]

for pat, repl in pats:
    matches = re.findall(pat, c)
    c = re.sub(pat, repl, c)
    print(f'Pattern {pat[:40]!r}: replaced {len(matches)}')

if c != orig:
    open(path,'w',encoding='utf-8').write(c)
    print('File written')
else:
    print('No changes')
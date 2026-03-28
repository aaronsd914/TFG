import re
path = r'frontend/src/components/ProductosPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
original = c

# Use regex for Fix 1 (Producto creado) - replace whole sileo.success block
pat1 = r"sileo\.success\(\{\s*title:\s*'[^']*Producto creado'[^}]*\}\);"
replacement1 = (
    "sileo.success({\n"
    "          title: t('products.notifProductCreatedTitle'),\n"
    "          description: t('products.notifProductCreatedDesc', {\n"
    "            name: nuevo.name,\n"
    "            price: eur(nuevo.price),\n"
    "            supplier: supplierName(nuevo.supplier_id),\n"
    "          }),\n"
    "        });"
)
m = re.search(pat1, c, re.DOTALL)
if m:
    c = c[:m.start()] + replacement1 + c[m.end():]
    print('Fix 1 OK')
else:
    print('Fix 1 FAILED')

# Use regex for Fix 2 (Producto actualizado) - replace whole sileo.success block
pat2 = r"sileo\.success\(\{ title: '[^']*Producto actualizado', description: [^;]+\}\);"
replacement2 = (
    "sileo.success({\n"
    "        title: t('products.notifProductUpdatedTitle'),\n"
    "        description: t('products.notifProductUpdatedDesc', { name: updated.name }),\n"
    "      });"
)
m2 = re.search(pat2, c, re.DOTALL)
if m2:
    c = c[:m2.start()] + replacement2 + c[m2.end():]
    print('Fix 2 OK')
else:
    print('Fix 2 FAILED')

if c != original:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('File written.')
else:
    print('No changes.')
path = r'frontend/src/components/ProductosPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

original = c

# Fix 1: 'Producto creado' sileo.success block
# Description uses curly quotes U+201C and U+201D around ${nuevo.name}
old1 = (
    "sileo.success({\n"
    "          title: '\U0001f4e6 Producto creado',\n"
    "          description: `\u201c${nuevo.name}\u201d \xb7 ${eur(nuevo.price)} \xb7 Proveedor: ${supplierName(nuevo.supplier_id)}`,\n"
    "        });"
)
new1 = (
    "sileo.success({\n"
    "          title: t('products.notifProductCreatedTitle'),\n"
    "          description: t('products.notifProductCreatedDesc', {\n"
    "            name: nuevo.name,\n"
    "            price: eur(nuevo.price),\n"
    "            supplier: supplierName(nuevo.supplier_id),\n"
    "          }),\n"
    "        });"
)
if old1 in c:
    c = c.replace(old1, new1)
    print('Fix 1 OK')
else:
    i = c.find('Producto creado')
    print(f'Fix 1 FAILED, context bytes: {[hex(ord(x)) for x in c[i-10:i+120]]}')

# Fix 2: Curly quotes + two spaces before backtick
# Context shows: description:  `Cambios guardados en \u201c${updated.name}\u201d.`
old2 = (
    "sileo.success({ title: '\u270f\ufe0f Producto actualizado',"
    " description:  " + chr(96) + "Cambios guardados en \u201c${updated.name}\u201d." + chr(96) + " });"
)
new2 = (
    "sileo.success({\n"
    "        title: t('products.notifProductUpdatedTitle'),\n"
    "        description: t('products.notifProductUpdatedDesc', { name: updated.name }),\n"
    "      });"
)
if old2 in c:
    c = c.replace(old2, new2)
    print('Fix 2 OK')
else:
    i = c.find('Producto actualizado')
    print(f'Fix 2 FAILED, context: {repr(c[i-20:i+150])}')

if c != original:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('File written.')
else:
    print('No changes made.')
    "sileo.success({\n"
    "          title: '\U0001f4e6 Producto creado',\n"
    "          description: `\"${nuevo.name}\" \xb7 ${eur(nuevo.price)} \xb7 Proveedor: ${supplierName(nuevo.supplier_id)}`,\n"
    "        });"
)
new1 = (
    "sileo.success({\n"
    "          title: t('products.notifProductCreatedTitle'),\n"
    "          description: t('products.notifProductCreatedDesc', {\n"
    "            name: nuevo.name,\n"
    "            price: eur(nuevo.price),\n"
    "            supplier: supplierName(nuevo.supplier_id),\n"
    "          }),\n"
    "        });"
)
if old1 in c:
    c = c.replace(old1, new1)
    print('Fix 1 OK')
else:
    print('Fix 1 FAILED')

# Fix 2a: with namee typo
old2a = (
    "sileo.success({ title: '\u270f\ufe0f Producto actualizado',"
    " description: `Cambios guardados en \"${updated.namee}\".\'  });"
)
# Fix 2b: no typo
old2b = (
    "sileo.success({ title: '\u270f\ufe0f Producto actualizado',"
    " description: `Cambios guardados en \"${updated.name}\".` });"
)
new2 = (
    "sileo.success({\n"
    "        title: t('products.notifProductUpdatedTitle'),\n"
    "        description: t('products.notifProductUpdatedDesc', { name: updated.name }),\n"
    "      });"
)
if old2a in c:
    c = c.replace(old2a, new2)
    print('Fix 2 OK (namee typo)')
elif old2b in c:
    c = c.replace(old2b, new2)
    print('Fix 2 OK (no typo)')
else:
    # Find the exact string in the file
    i = c.find('Producto actualizado')
    print(f'Fix 2 FAILED, context: {repr(c[i-20:i+120])}')

if c != original:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('File written.')
else:
    print('No changes made.')

import re
path = r'frontend/src/components/ProductosPage.jsx'
c = open(path,'r',encoding='utf-8').read()
orig = c

# Fix delete success with typo (deletteTarget)
pat1 = r"sileo\.success\(\{ title: '[^']*Producto eliminado'[^;]+\}[^;]*\);"
repl1 = "sileo.success({ title: t('products.notifProductDeletedTitle'), description: t('products.notifProductDeletedDesc', { name: deleteTarget.nombre }) });"
m1 = re.search(pat1, c)
if m1: print('Delete success found:', repr(m1.group())); c = c[:m1.start()]+repl1+c[m1.end():]; print('Fix delete success OK')
else: print('Delete success NOT found')

# Fix delete error
pat2 = r"sileo\.error\(\{ title: '[^']*No se pudo eliminar', description: e2\.message \}\);"
repl2 = "sileo.error({ title: t('products.notifDeleteErrorTitle'), description: e2.message });"
count2 = len(re.findall(pat2, c))
c = re.sub(pat2, repl2, c)
print(f'Delete error: replaced {count2}')

# Fix load error
pat3 = r"sileo\.error\(\{ title: '[^']*Error cargando productos', description: e\.message \}\);"
repl3 = "sileo.error({ title: t('products.notifLoadErrorTitle'), description: e.message });"
count3 = len(re.findall(pat3, c))
c = re.sub(pat3, repl3, c)
print(f'Load error: replaced {count3}')

if c != orig:
    open(path,'w',encoding='utf-8').write(c)
    print('File written')
else:
    print('No changes')
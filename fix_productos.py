with open('frontend/src/components/ProductosPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add createModalOpen state after deleteTarget state
old1 = '''  // ✅ modal confirmación borrado
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id,nombre}'''
new1 = '''  // ✅ modal confirmación borrado
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id,nombre}

  // modal creación (accesible desde cualquier tab)
  const [createModalOpen, setCreateModalOpen] = useState(false);'''
assert old1 in content, "Section 1 not found"
content = content.replace(old1, new1)

# 2. After form reset in crearProducto, close modal
old2 = '''      setFNombre('');
      setFDesc('');
      setFPrecio('');
      setFProveedor('');
      setCreateTouched(false);
      setCreateErrors({});
    } catch (e2) {'''
new2 = '''      setFNombre('');
      setFDesc('');
      setFPrecio('');
      setFProveedor('');
      setCreateTouched(false);
      setCreateErrors({});
      setCreateModalOpen(false);
    } catch (e2) {'''
assert old2 in content, "Section 2 not found"
content = content.replace(old2, new2)

# 3. Add "Nuevo producto" button in header (after the tab toggle div)
old3 = '''        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${tab === 'listado' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setTab('listado')}
              type="button"
            >
              Listado
            </button>
            <button
              className={`px-4 py-2 text-sm border-l border-gray-300 ${
                tab === 'gestion' ? 'bg-black text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setTab('gestion')}
              type="button"
            >
              Gestión
            </button>
          </div>
        </div>'''
new3 = '''        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${tab === 'listado' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setTab('listado')}
              type="button"
            >
              Listado
            </button>
            <button
              className={`px-4 py-2 text-sm border-l border-gray-300 ${
                tab === 'gestion' ? 'bg-black text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setTab('gestion')}
              type="button"
            >
              Gestión
            </button>
          </div>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)} type="button">
            Nuevo producto
          </Button>
        </div>'''
assert old3 in content, "Section 3 not found"
content = content.replace(old3, new3)

# 4. Move expand/collapse buttons to the search bar (next to Todos/Por proveedor toggle)
# Add expand/collapse buttons after the toggle, visible only in proveedor mode
old4 = '''                <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGroupMode('all')}
                    className={`px-3 py-2 text-sm ${groupMode === 'all' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
                    title="Ver todos los productos"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode('proveedor')}
                    className={`px-3 py-2 text-sm border-l border-gray-300 ${
                      groupMode === 'proveedor' ? 'bg-black text-white' : 'bg-white text-gray-700'
                    }`}
                    title="Agrupar por proveedor"
                  >
                    Por proveedor
                  </button>
                </div>'''
new4 = '''                <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGroupMode('all')}
                    className={`px-3 py-2 text-sm ${groupMode === 'all' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
                    title="Ver todos los productos"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode('proveedor')}
                    className={`px-3 py-2 text-sm border-l border-gray-300 ${
                      groupMode === 'proveedor' ? 'bg-black text-white' : 'bg-white text-gray-700'
                    }`}
                    title="Agrupar por proveedor"
                  >
                    Por proveedor
                  </button>
                </div>
                {groupMode === 'proveedor' && (
                  <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        const next = {};
                        for (const pc of providerCards) next[pc.proveedor.id] = true;
                        setOpenProviders(next);
                      }}
                      className="px-3 py-2 text-sm bg-white text-gray-700 hover:bg-gray-50"
                    >
                      Expandir todo
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenProviders({})}
                      className="px-3 py-2 text-sm border-l border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      Colapsar todo
                    </button>
                  </div>
                )}'''
assert old4 in content, "Section 4 not found"
content = content.replace(old4, new4)

# 5. Remove the expand/collapse buttons from after the providerCards grid
old5 = '''              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    const next = {};
                    for (const pc of providerCards) next[pc.proveedor.id] = true;
                    setOpenProviders(next);
                  }}
                >
                  Expandir todo
                </Button>
                <Button variant="secondary" type="button" onClick={() => setOpenProviders({})}>
                  Colapsar todo
                </Button>
              </div>'''
assert old5 in content, "Section 5 not found"
content = content.replace(old5, '')

# 6. Remove ID display from gestión list items
old6 = '''                          <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className={active ? 'text-xs text-white/70' : 'text-xs text-gray-500'}>#{p.id}</div>
                                  <div className={active ? 'font-semibold truncate text-white' : 'font-semibold truncate text-gray-900'}>
                                    {p.nombre}
                                  </div>
                                  <div className={active ? 'text-xs mt-1 text-white/80' : 'text-xs mt-1 text-gray-500'}>
                                    {provName(p.proveedor_id)}
                                  </div>
                                </div>
                                <div className={active ? 'font-semibold text-white' : 'font-semibold text-gray-900'}>{eur(p.precio)}</div>
                              </div>'''
new6 = '''                          <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className={active ? 'font-semibold truncate text-white' : 'font-semibold truncate text-gray-900'}>
                                    {p.nombre}
                                  </div>
                                  <div className={active ? 'text-xs mt-1 text-white/80' : 'text-xs mt-1 text-gray-500'}>
                                    {provName(p.proveedor_id)}
                                  </div>
                                </div>
                                <div className={active ? 'font-semibold text-white' : 'font-semibold text-gray-900'}>{eur(p.precio)}</div>
                              </div>'''
assert old6 in content, "Section 6 not found"
content = content.replace(old6, new6)

# 7. Remove "Alta de producto" section from Gestión tab
# Find the section start and end
alta_start = '          {/* Alta de producto */}\n          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">'
alta_end = '          {/* Gestión */}'
start_idx = content.find(alta_start)
end_idx = content.find(alta_end)
assert start_idx != -1, f"Alta de producto start not found"
assert end_idx != -1, f"Gestion section not found"
content = content[:start_idx] + content[end_idx:]

# 8. Add creation Modal before the delete Modal in the gestión tab
# Find the delete modal and add the creation one before it
old8 = '''          {/* ✅ Modal confirmación borrar */}
          <Modal'''
new8 = '''          {/* ✅ Modal: Crear nuevo producto */}
          <Modal
            open={createModalOpen}
            onClose={() => {
              setCreateModalOpen(false);
              setCreateTouched(false);
              setCreateErrors({});
            }}
            title="Nuevo producto"
            maxWidth="max-w-2xl"
          >
            <form
              onSubmit={crearProducto}
              className="grid md:grid-cols-2 gap-3"
              onChange={() => {
                if (createTouched) {
                  const v = validateCreate();
                  setCreateErrors(v.errors);
                }
              }}
            >
              <div>
                <label className={labelReq(createTouched && !!createErrors.nombre)}>
                  Nombre<RequiredAsterisk />
                </label>
                <input
                  value={fNombre}
                  onChange={(e) => setFNombre(e.target.value)}
                  className={inputReq(createTouched && !!createErrors.nombre)}
                  placeholder="Ej: Mesa de comedor"
                />
              </div>

              <div>
                <label className={labelReq(createTouched && !!createErrors.precio)}>
                  Precio<RequiredAsterisk />
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fPrecio}
                  onChange={(e) => setFPrecio(clampNumberInput(e.target.value))}
                  className={inputReq(createTouched && !!createErrors.precio)}
                  placeholder="Ej: 199.99"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Descripción</label>
                <textarea
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full"
                  rows={3}
                  placeholder="Detalles, medidas, materiales…"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelReq(createTouched && !!createErrors.proveedor)}>
                  Proveedor<RequiredAsterisk />
                </label>
                <select
                  value={fProveedor}
                  onChange={(e) => setFProveedor(e.target.value)}
                  className={selectReq(createTouched && !!createErrors.proveedor)}
                >
                  <option value="">Selecciona proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : 'Crear producto'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFNombre('');
                    setFDesc('');
                    setFPrecio('');
                    setFProveedor('');
                    setCreateTouched(false);
                    setCreateErrors({});
                  }}
                  disabled={saving}
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </Modal>

          {/* ✅ Modal confirmación borrar */}
          <Modal'''
assert old8 in content, "Section 8 delete modal not found"
content = content.replace(old8, new8)

with open('frontend/src/components/ProductosPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! All sections replaced successfully.")

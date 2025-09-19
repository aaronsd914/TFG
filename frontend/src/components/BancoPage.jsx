// frontend/src/components/BancoPage.jsx
import React, { useEffect, useState } from "react";

const API = "http://localhost:8000/api";

export default function BancoPage() {
  const [status, setStatus] = useState({ linked: false, provider: 'caixabank' });
  const [accounts, setAccounts] = useState([]);
  const [accId, setAccId] = useState("");
  const [txs, setTxs] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // si volvemos del callback con ?linked=ok, refresca estado
  useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    if (p.get("linked")==="ok") {
      window.history.replaceState({}, "", "/banco");
    }
  },[]);

  async function loadStatus() {
    setErr("");
    try {
      const r = await fetch(`${API}/bank/caixa/status`);
      const j = await r.json();
      setStatus(j);
    } catch (e) {
      setErr(String(e));
    }
  }
  async function loadAccounts() {
    setErr("");
    try {
      const r = await fetch(`${API}/bank/caixa/accounts`);
      if (!r.ok) throw new Error(`HTTP ${r.status} – ${await r.text()}`);
      const j = await r.json();
      setAccounts(j.accounts || []);
      if (!accId && j.accounts?.length) setAccId(j.accounts[0].id);
    } catch (e) {
      setErr(String(e));
    }
  }
  async function loadTxs() {
    if (!accId) return;
    setErr(""); setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("account_id", accId);
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const r = await fetch(`${API}/bank/caixa/transactions?${q.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status} – ${await r.text()}`);
      const j = await r.json();
      setTxs(j.transactions || []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      await loadStatus();
      await loadAccounts();
      setLoading(false);
    })();
  },[]);

  useEffect(()=>{
    loadTxs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accId, from, to]);

  async function connect() {
    setErr("");
    try {
      const r = await fetch(`${API}/bank/caixa/link`, { method: "POST" });
      const j = await r.json();
      if (!j.redirect_url) throw new Error("No hay redirect_url");
      window.location.href = j.redirect_url;
    } catch (e) {
      setErr(String(e));
    }
  }

  async function syncNow() {
    setErr("");
    try {
      const r = await fetch(`${API}/bank/caixa/sync`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status} – ${await r.text()}`);
      await loadAccounts();
      await loadTxs();
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banco (CaixaBank)</h1>
        <div className="flex items-center gap-3">
          {!status.linked ? (
            <button onClick={connect} className="px-4 py-2 rounded-xl bg-black text-white">
              Conectar con CaixaBank
            </button>
          ) : (
            <button onClick={syncNow} className="px-4 py-2 rounded-xl border">
              Sincronizar ahora
            </button>
          )}
        </div>
      </div>

      {err && <div className="text-red-600">{err}</div>}

      {/* Estado */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Estado de enlace</div>
            <div className="text-lg font-semibold">
              {status.linked ? "Conectado" : "No conectado"}
            </div>
            {status.last_sync && (
              <div className="text-sm text-gray-500">Última sync: {new Date(status.last_sync).toLocaleString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Cuentas */}
      <section className="bg-white border rounded-2xl p-4 space-y-3">
        <h3 className="font-semibold">Cuentas</h3>
        {!accounts.length && (
          <p className="text-gray-600">
            {status.linked
              ? "No se han encontrado cuentas (prueba sincronizar)."
              : "Conéctate para listar cuentas; en demo verás datos ficticios."}
          </p>
        )}
        {accounts.length>0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm">Cuenta:</label>
            <select
              className="border rounded-lg px-3 py-2"
              value={accId}
              onChange={(e)=>setAccId(e.target.value)}
            >
              {accounts.map(a=>(
                <option key={a.id} value={a.id}>
                  {a.name || a.iban} · {a.currency} · Saldo: {a.balance?.toFixed?.(2)} 
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Movimientos */}
      <section className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-sm">Desde</label>
            <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="border rounded px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm">Hasta</label>
            <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="border rounded px-3 py-2"/>
          </div>
        </div>

        {loading ? (
          <div>Cargando…</div>
        ) : (
          <div className="border rounded-xl overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Concepto</th>
                  <th className="text-left p-2">Contraparte</th>
                  <th className="text-right p-2">Importe</th>
                  <th className="text-right p-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {txs.length===0 && (
                  <tr><td colSpan={5} className="p-4 text-gray-500">Sin movimientos en el rango.</td></tr>
                )}
                {txs.map((t,i)=>(
                  <tr key={i} className="border-b">
                    <td className="p-2">{t.bookingDate || t.valueDate}</td>
                    <td className="p-2">{t.remittanceInformationUnstructured || t.description}</td>
                    <td className="p-2">{t.counterparty || '—'}</td>
                    <td className={`p-2 text-right ${Number(t.amount)<0?'text-red-600':'text-green-700'}`}>
                      {Number(t.amount).toFixed(2)} {t.currency}
                    </td>
                    <td className="p-2 text-right">{t.balanceAfterTx!=null ? `${Number(t.balanceAfterTx).toFixed(2)} ${t.currency}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

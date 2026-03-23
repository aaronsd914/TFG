// frontend/src/components/BancoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sileo } from 'sileo';
import { API_URL } from '../config.js';

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

export default function BancoPage() {
  const { t } = useTranslation();
  // ===== Stripe =====
  const [stripeStatus, setStripeStatus] = useState({ configured: false, currency: 'eur' });
  const [stripeAmount, setStripeAmount] = useState('');
  const [stripeDesc, setStripeDesc] = useState('Cobro tienda');
  const [stripeCheckouts, setStripeCheckouts] = useState([]);
  const [stripeBusy, setStripeBusy] = useState(false);

  const stripeCanCreate = useMemo(() => {
    const a = Number(stripeAmount);
    return stripeStatus.configured && Number.isFinite(a) && a > 0;
  }, [stripeAmount, stripeStatus.configured]);

  // ========= Helpers de carga =========
  async function loadStripeStatus() {
    try {
      const r = await fetch(`${API_URL}stripe/status`);
      const j = await r.json();
      setStripeStatus(j);
    } catch {
      setStripeStatus({ configured: false, currency: 'eur' });
    }
  }

  async function loadStripeCheckouts() {
    try {
      const r = await fetch(`${API_URL}stripe/checkouts?limit=25`);
      const j = await r.json();
      setStripeCheckouts(Array.isArray(j) ? j : []);
    } catch {
      setStripeCheckouts([]);
    }
  }

  // ========= Carga inicial =========
  useEffect(() => {
    (async () => {
      await loadStripeStatus();
      await loadStripeCheckouts();
    })();
     
  }, []);

  // ========= Stripe: manejar retorno success/cancel =========
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const stripeResult = p.get('stripe');
    const sessionId = p.get('session_id');
    if (!stripeResult) return;

    // limpiar URL
    window.history.replaceState({}, '', '/banco');

    if (stripeResult === 'cancel') {
      sileo.warning({
        title: t('bank.toastCancelled'),
        description: t('bank.toastCancelledDesc'),
      });
      return;
    }

    if (stripeResult === 'success') {
      if (!sessionId) {
        sileo.success({ title: t('bank.toastCompleted'), description: t('bank.toastCompletedDesc') });
        loadStripeCheckouts();
        return;
      }

      (async () => {
        try {
          await sileo.promise(
            async () => {
              const r = await fetch(`${API_URL}stripe/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
              });
              const data = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
              return data;
            },
            {
              loading: { title: t('bank.toastConfirming') },
              success: (data) => ({
                title: data.created ? t('bank.toastRegistered') : t('bank.toastAlreadyRegistered'),
                description: `${eur(data.amount)} · ${data.description || 'Stripe'}`,
              }),
              error: (e) => ({
                title: t('bank.toastConfirmError'),
                description: e?.message || 'Error desconocido',
              }),
            }
          );
          await loadStripeCheckouts();
        } catch {
          // Error ya mostrado por sileo.promise
        }
      })();
    }
     
  }, []);

  // ========= Acciones Stripe =========
  async function createStripeCheckout() {
    if (!stripeCanCreate) {
      sileo.warning({
        title: 'Importe inválido',
        description: 'Introduce un importe mayor que 0 y asegúrate de configurar Stripe en el backend.',
      });
      return;
    }
    setStripeBusy(true);
    try {
      const data = await sileo.promise(
        async () => {
          const r = await fetch(`${API_URL}stripe/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Number(stripeAmount),
              description: stripeDesc || 'Cobro tienda',
            }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
          if (!j.url) throw new Error('Stripe no devolvió URL de checkout');
          return j;
        },
        {
          loading: { title: 'Creando checkout…' },
          success: { title: 'Redirigiendo a Stripe…', description: 'Se abrirá la pantalla de pago.' },
          error: (e) => ({ title: 'No se pudo crear el cobro', description: e?.message || 'Error' }),
        }
      );
      window.location.href = data.url;
    } catch {
      // Error ya mostrado por sileo.promise
    } finally {
      setStripeBusy(false);
    }
  }

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('bank.title')}</h1>
        <button
          onClick={async () => {
            await loadStripeStatus();
            await loadStripeCheckouts();
            sileo.success({ title: 'Actualizado', description: 'Stripe refrescado.' });
          }}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
        >
          Refrescar
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-600">{t('bank.stripeStatus')}</div>
            <div className="text-lg font-semibold">{stripeStatus.configured ? 'Configurado' : 'No configurado'}</div>
            <div className="text-sm text-gray-500">Moneda: {(stripeStatus.currency || 'eur').toUpperCase()}</div>
          </div>
        </div>

        {!stripeStatus.configured ? (
          <div className="mt-3 text-sm text-gray-700">
            <p className="font-medium">Te falta configurar Stripe en el backend.</p>
            <p className="text-gray-600">
              Rellena <code className="px-1 rounded bg-gray-100">backend/app/stripe_config.py</code>:
            </p>
            <pre className="mt-2 text-xs bg-gray-50 border rounded-xl p-3 overflow-auto">
STRIPE_SECRET_KEY = "sk_test_..."
STRIPE_PUBLISHABLE_KEY = "pk_test_..."
            </pre>
          </div>
        ) : null}
      </div>

      <section className="bg-white border rounded-2xl p-4 space-y-4">
        <h3 className="font-semibold">{t('bank.createCharge')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Importe (€)</label>
            <input
              type="number"
              step="0.01"
              value={stripeAmount}
              onChange={(e) => setStripeAmount(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder={t('bank.amountPlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">{t('bank.descLabel')}</label>
            <input
              type="text"
              value={stripeDesc}
              onChange={(e) => setStripeDesc(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder={t('bank.descPlaceholder')}
            />
          </div>
        </div>

        <button
          disabled={!stripeCanCreate || stripeBusy}
          onClick={createStripeCheckout}
          className={`px-4 py-2 rounded-xl text-white ${!stripeCanCreate || stripeBusy ? 'bg-gray-400' : 'bg-black hover:opacity-90'}`}
        >
          {stripeBusy ? 'Creando…' : 'Cobrar con Stripe'}
        </button>
      </section>

      <section className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('bank.recentCharges')}</h3>
          <span className="text-xs text-gray-500">{t('bank.recentChargesHint')}</span>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left p-2">{t('bank.colDate')}</th>
                <th className="text-left p-2">{t('bank.colDesc')}</th>
                <th className="text-left p-2">{t('bank.colSession')}</th>
                <th className="text-right p-2">{t('bank.colAmount')}</th>
                <th className="text-left p-2">{t('bank.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {stripeCheckouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-gray-500">
                    Aún no hay cobros registrados.
                  </td>
                </tr>
              ) : (
                stripeCheckouts.map((c) => (
                  <tr key={c.session_id} className="border-b">
                    <td className="p-2">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                    <td className="p-2">{c.description || '—'}</td>
                    <td className="p-2 font-mono text-xs">{c.session_id}</td>
                    <td className="p-2 text-right">{eur(c.amount)}</td>
                    <td className="p-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg border text-xs bg-green-50 border-green-200 text-green-800">
                        {c.status || 'paid'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

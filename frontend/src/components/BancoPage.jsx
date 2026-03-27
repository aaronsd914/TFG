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

  const [stripeStatus, setStripeStatus] = useState({ configured: false, currency: 'eur' });
  const [stripeCheckouts, setStripeCheckouts] = useState([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [stripeAmount, setStripeAmount] = useState('');
  const [stripeDesc, setStripeDesc] = useState('');
  const [stripeBusy, setStripeBusy] = useState(false);

  const stripeCanCreate = useMemo(() => {
    const a = Number(stripeAmount);
    return stripeStatus.configured && Number.isFinite(a) && a > 0;
  }, [stripeAmount, stripeStatus.configured]);

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
      const r = await fetch(`${API_URL}stripe/checkouts?limit=50`);
      const j = await r.json();
      setStripeCheckouts(Array.isArray(j) ? j : []);
    } catch {
      setStripeCheckouts([]);
    }
  }

  useEffect(() => {
    (async () => {
      await loadStripeStatus();
      await loadStripeCheckouts();
    })();
  }, []);

  // Handle Stripe return (success / cancel)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const stripeResult = p.get('stripe');
    const sessionId = p.get('session_id');
    if (!stripeResult) return;

    window.history.replaceState({}, '', '/banco');

    if (stripeResult === 'cancel') {
      sileo.warning({ title: t('bank.toastCancelled'), description: t('bank.toastCancelledDesc') });
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
              error: (e) => ({ title: t('bank.toastConfirmError'), description: e?.message || 'Error desconocido' }),
            }
          );
          await loadStripeCheckouts();
        } catch {
          // handled by sileo.promise
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openModal() {
    setStripeAmount('');
    setStripeDesc('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function createStripeCheckout() {
    if (!stripeCanCreate) return;
    setStripeBusy(true);
    try {
      const data = await sileo.promise(
        async () => {
          const r = await fetch(`${API_URL}stripe/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.round(Number(stripeAmount) * 100) / 100,
              description: stripeDesc || t('bank.descPlaceholder'),
            }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
          if (!j.url) throw new Error('Stripe no devolvió URL de checkout');
          return j;
        },
        {
          loading: { title: t('bank.toastCreating') },
          success: { title: t('bank.toastRedirecting') },
          error: (e) => ({ title: t('bank.toastCreateError'), description: e?.message || 'Error' }),
        }
      );
      window.location.href = data.url;
    } catch {
      // handled by sileo.promise
    } finally {
      setStripeBusy(false);
    }
  }

  return (
    <div className="p-3 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('bank.title')}</h1>
        <button
          data-testid="nuevo-cobro-btn"
          onClick={openModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-accent shadow-sm transition-colors"
        >
          + {t('bank.newChargeBtn')}
        </button>
      </div>

      {/* Charges table */}
      <section className="bg-white border rounded-2xl p-4 space-y-3" data-testid="banco-table-section">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('bank.recentCharges')}</h3>
          <span className="text-xs text-gray-500">{t('bank.recentChargesHint')}</span>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-[600px] w-full text-sm" data-testid="cobros-table">
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
                  <td colSpan={5} className="p-4 text-gray-500" data-testid="cobros-empty">
                    {t('bank.noCharges')}
                  </td>
                </tr>
              ) : (
                stripeCheckouts.map((c) => (
                  <tr key={c.session_id} className="border-b hover:bg-gray-50" data-testid="cobro-row">
                    <td className="p-2">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                    <td className="p-2">{c.description || '—'}</td>
                    <td className="p-2 font-mono text-xs">{c.session_id}</td>
                    <td className="p-2 text-right font-medium">{eur(c.amount)}</td>
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

      {/* New charge modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="nuevo-cobro-modal"
          onClick={closeModal}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold">{t('bank.newChargeTitle')}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('bank.amountLabel')} (€)</label>
                <input
                  data-testid="cobro-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={stripeAmount}
                  onChange={(e) => setStripeAmount(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder={t('bank.amountPlaceholder')}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('bank.descLabel')}</label>
                <input
                  data-testid="cobro-desc-input"
                  type="text"
                  value={stripeDesc}
                  onChange={(e) => setStripeDesc(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder={t('bank.descPlaceholder')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                data-testid="cobro-cancel-btn"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm"
              >
                {t('bank.btnCancel')}
              </button>
              <button
                data-testid="cobro-submit-btn"
                disabled={!stripeCanCreate || stripeBusy}
                onClick={createStripeCheckout}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${!stripeCanCreate || stripeBusy ? 'bg-gray-400 cursor-not-allowed' : 'btn-accent'}`}
              >
                {stripeBusy ? t('bank.toastCreating') : t('bank.btnCreateCharge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { apiFetch, apiFetchBlob } from './http.js';

export const getAnalyticsSummary = (dateFrom, dateTo) => {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  return apiFetch(`analytics/summary?${params.toString()}`);
};

export const getAnalyticsCompare = (dateFrom, dateTo) => {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  return apiFetch(`analytics/compare?${params.toString()}`);
};

export const exportTendenciasPdf = (dateFrom, dateTo, includeCompare) => {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  params.set('include_compare', includeCompare ? 'true' : 'false');
  return apiFetchBlob(`analytics/export/pdf?${params.toString()}`);
};

export const aiChat = (payload) =>
  apiFetch('ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

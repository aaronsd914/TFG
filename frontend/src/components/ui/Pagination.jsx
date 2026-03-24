import React from 'react';

function getPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/**
 * Pagination component.
 *
 * page:     current page (1-based)
 * total:    total number of items
 * pageSize: items per page (default 20)
 * onChange: (newPage: number) => void
 */
export function Pagination({ page, total, pageSize = 20, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = getPages(page, totalPages);

  const btn =
    'px-3 py-1.5 rounded-lg border text-sm transition-colors duration-150 focus:outline-none';
  const btnActive = 'btn-accent border-[var(--fg-accent)] font-semibold';
  const btnNormal = 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
  const btnDisabled = 'opacity-40 cursor-not-allowed bg-white border-gray-200 text-gray-400';

  return (
    <nav className="flex items-center justify-center gap-1 mt-4 flex-wrap" aria-label="Paginación">
      <button
        className={`${btn} ${page <= 1 ? btnDisabled : btnNormal}`}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Anterior"
        type="button"
      >
        ←
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`${btn} ${p === page ? btnActive : btnNormal}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            type="button"
          >
            {p}
          </button>
        )
      )}

      <button
        className={`${btn} ${page >= totalPages ? btnDisabled : btnNormal}`}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Siguiente"
        type="button"
      >
        →
      </button>
    </nav>
  );
}

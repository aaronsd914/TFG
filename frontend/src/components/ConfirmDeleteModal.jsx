export default function ConfirmDeleteModal({ isOpen, onClose, title, message, onConfirm, loading, confirmTestId, confirmLabel, cancelLabel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-lg font-semibold mb-3">{title}</h2>
          <p className="text-gray-700 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300"
              type="button"
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              type="button"
              disabled={loading}
              data-testid={confirmTestId}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

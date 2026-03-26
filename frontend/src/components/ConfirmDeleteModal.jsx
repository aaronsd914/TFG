import PropTypes from 'prop-types';
import ModalCenter from './ModalCenter.jsx';

export default function ConfirmDeleteModal({ isOpen, onClose, title, message, onConfirm, loading, confirmTestId, confirmLabel, cancelLabel }) {
  return (
    <ModalCenter isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
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
    </ModalCenter>
  );
}

ConfirmDeleteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  confirmTestId: PropTypes.string,
  confirmLabel: PropTypes.string.isRequired,
  cancelLabel: PropTypes.string.isRequired,
};

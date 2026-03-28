import PropTypes from 'prop-types';

export const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export const closeButtonClass = 'p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700';

export default function ModalCenter({ isOpen, onClose, children, maxWidth = 'max-w-3xl', showClose = true }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 w-full h-full border-none p-0 cursor-default appearance-none"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        tabIndex={-1}
        aria-label="Cerrar"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]`}>
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              className={`absolute top-3 right-3 ${closeButtonClass}`}
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

ModalCenter.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.string,
  showClose: PropTypes.bool,
};

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-6">{t('notFound.message', 'Página no encontrada')}</p>
      <Link
        to="/"
        className="px-6 py-3 rounded-xl btn-accent text-white font-medium"
      >
        {t('notFound.goHome', 'Volver al inicio')}
      </Link>
    </div>
  );
}

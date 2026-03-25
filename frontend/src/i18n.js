import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es } },
    lng: 'es',
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    interpolation: { escapeValue: false },
  });

// If the user previously selected English, load it lazily at startup
const _saved = (() => { try { return localStorage.getItem('fg-lang'); } catch { return null; } })();
if (_saved === 'en') {
  import('./locales/en.json').then(({ default: en }) => {
    i18n.addResourceBundle('en', 'translation', en);
    i18n.changeLanguage('en');
  });
}

export async function loadLocale(lang) {
  if (lang === 'en' && !i18n.hasResourceBundle('en', 'translation')) {
    const { default: en } = await import('./locales/en.json');
    i18n.addResourceBundle('en', 'translation', en);
  }
  i18n.changeLanguage(lang);
  try { localStorage.setItem('fg-lang', lang); } catch { /* storage unavailable */ }
}

export default i18n;

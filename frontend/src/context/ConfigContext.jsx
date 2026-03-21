import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api/http.js';

const DEFAULTS = {
  tienda_nombre: 'FurniGest',
  logo_empresa: '',
  firma_email: '',
  resumen_email_destino: '',
  resumen_intervalo_dias: '7',
  resumen_ultima_vez: '',
};

const ConfigContext = createContext({
  config: DEFAULTS,
  updateConfig: async () => {},
});

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);

  useEffect(() => {
    apiFetch('config')
      .then(data => setConfig({ ...DEFAULTS, ...data }))
      .catch(() => {});
  }, []);

  async function updateConfig(key, value) {
    await apiFetch(`config/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  return (
    <ConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(ConfigContext);
}

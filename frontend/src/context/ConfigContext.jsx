import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
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

  const updateConfig = useCallback(async (key, value) => {
    await apiFetch(`config/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const contextValue = useMemo(() => ({ config, updateConfig }), [config, updateConfig]);
  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}

ConfigProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAppConfig() {
  return useContext(ConfigContext);
}

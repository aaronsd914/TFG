# Prompt para Gamma — Presentación TFG FurniGest (20 módulos)

> Copia y pega el bloque siguiente directamente en el campo "Generar con IA" de Gamma (https://gamma.app). Está pensado para producir una presentación de **20 diapositivas** con la misma estructura que la plantilla TFG de la ETSII URJC seguida por Carlos Gómez (2025): portada, índice, introducción (contexto + motivación), objetivos (general + específicos), desarrollo (metodología + arquitectura + funcionalidades + algoritmos + IA + pruebas + CI/CD), resultados, conclusiones, trabajos futuros y portada de cierre.

---

```
Genera una presentación de 20 diapositivas en español para la defensa de un Trabajo Fin de Grado del Grado en Ingeniería Informática (Universidad Rey Juan Carlos, ETSII, curso 2024-2025).

Título: "FurniGest: aplicación web de gestión integral para tienda de muebles"
Autor: Aarón Salinero Valencia
Tutor: Nicolás Rodríguez Uribe
Fecha: Junio 2026

Estilo visual:
- Tema profesional y minimalista, paleta basada en el rojo institucional de la URJC (#CB0017) sobre fondo blanco, con acentos en gris oscuro.
- Cada diapositiva debe priorizar las imágenes y los iconos sobre el texto. Nada de párrafos largos: solo bullets cortos, palabras clave o frases breves que sirvan de guion para que el ponente desarrolle de viva voz.
- Usa diagramas, esquemas, iconos y capturas siempre que la información lo permita (sectores, flujos, máquinas de estado, pipelines, pirámides).
- Tipografía sans-serif (Inter o similar). Espaciado generoso.
- Pie de página discreto con: "Aarón Salinero Valencia · TFG-GII · Junio 2026".

Estructura exacta de las 20 diapositivas:

1. PORTADA. Título grande, autor, tutor, grado, curso 2024-2025, logo de la URJC y de la ETSII. Fondo blanco con franja roja decorativa.

2. CONTENIDO (índice). Lista numerada de las cinco secciones: Introducción, Objetivos, Desarrollo, Resultados, Conclusiones.

3. INTRODUCCIÓN — CONTEXTO. Bullets cortos:
   - Sector retail de muebles dominado por PYMEs.
   - Herramientas genéricas: hojas de cálculo, papel, facturación básica.
   - Problemas recurrentes: pérdida de trazabilidad, duplicación de datos, sin métricas en tiempo real.
   - Sistemas de Información de Gestión (MIS) / ERP como solución.
   Imagen sugerida: tienda de muebles o iconografía de pedidos / hojas de cálculo.

4. INTRODUCCIÓN — MOTIVACIÓN. Bullets cortos:
   - ERPs del mercado: Odoo, SAP Business One, Holded.
   - Limitaciones: configuración compleja, coste elevado, módulos no específicos.
   - Conceptos del dominio NO cubiertos: albarán, fianza, rutas por camión, liquidación de transporte.
   - FurniGest: aplicación a medida con vocación de "producción real".
   Imagen sugerida: logos comparativos de Odoo / Holded vs. icono propio.

5. OBJETIVOS — OBJETIVO GENERAL. Una sola frase destacada en una caja:
   "Diseñar, implementar y desplegar en producción una aplicación web de gestión integral para una tienda de muebles que centralice clientes, pedidos, logística, finanzas y analíticas de negocio."
   Debajo, tres pequeños iconos con texto: "Adaptada al flujo real", "Cloud", "Quality gate + CI/CD".

6. OBJETIVOS — OBJETIVOS ESPECÍFICOS (1/2). Bullets numerados:
   - OBJ-01. CRUD completo de clientes, productos y proveedores.
   - OBJ-02. Máquina de estados del albarán (5 estados).
   - OBJ-03. Movimientos financieros automáticos.
   - OBJ-04. Módulo de logística (camiones, manifiestos, liquidación).
   - OBJ-05. Motor de analíticas (RFM, cesta, predicción de Holt).

7. OBJETIVOS — OBJETIVOS ESPECÍFICOS (2/2). Bullets numerados:
   - OBJ-06. Asistente IA con LLM (Llama-3 vía Groq).
   - OBJ-07. Cobro con tarjeta integrando Stripe Checkout.
   - OBJ-08. Suite de pruebas (unitarias, integración y E2E).
   - OBJ-09. Pipeline CI/CD con GitHub Actions y SonarCloud.
   - OBJ-10. Despliegue en producción (Railway + Vercel).

8. DESARROLLO — METODOLOGÍA. Bullets cortos:
   - Enfoque ágil con iteraciones cortas.
   - Trunk-Based Development: rama main única + ramas feature/* y fix/* de corta vida.
   - Conventional Commits: feat, fix, refactor, test, docs, chore.
   - IEEE 830 para los requisitos.
   Imagen sugerida: diagrama de ramas Git (main central con ramas feature cortas integrándose).

9. DESARROLLO — ARQUITECTURA. Diagrama central de tres cajas conectadas con flechas bidireccionales:
   - "React 19 SPA (Vite 6 + TailwindCSS 4)" --HTTP/JSON-- "FastAPI 0.115 (Python 3.12)" --SQL-- "PostgreSQL 16".
   Pie de diapositiva: "Estilo REST sobre HTTP/1.1 + TLS · 11 entidades en 3FN".

10. DESARROLLO — STACK TECNOLÓGICO. Tres columnas con logos / iconos:
    - Backend: FastAPI, SQLAlchemy 2, Pydantic v2, PostgreSQL 16, Alembic, ReportLab, Groq/Llama-3, Stripe, SMTP+Resend.
    - Frontend: React 19, Vite 6, TailwindCSS 4, React Router 7, Chart.js 4, i18next.
    - Infraestructura: Docker Compose, Railway, Vercel.

11. DESARROLLO — CICLO DE VIDA DEL ALBARÁN. Diagrama de máquina de estados con cinco nodos:
    FIANZA → ALMACEN → RUTA → ENTREGADO  ↔  INCIDENCIA.
    Etiquetas: "Pago fianza", "Asignar camión", "Confirmar entrega", "Reportar problema", "Eliminar incidencia".
    Anotaciones: "Auto: movimiento INGRESO (fianza)" y "Auto: movimiento INGRESO (pendiente = total − fianza)".

12. DESARROLLO — ALGORITMOS DE NEGOCIO. Tres bloques con iconos:
    - Segmentación RFM: VIP, En crecimiento, En riesgo, Ocasional. Complejidad O(n).
    - Análisis de cesta: soporte, confianza, lift. Complejidad O(m·k²).
    - Predicción con suavizado exponencial doble de Holt + intervalos al 80%.
    Imagen sugerida: pequeños mockups de gráfico RFM, tabla de reglas y curva de predicción.

13. DESARROLLO — ASISTENTE IA. Bullets cortos:
    - Modelo: Llama-3.1-8b-instant.
    - Proveedor: Groq (LPU, baja latencia, plan free).
    - Prompt engineering puro, sin fine-tuning.
    - Devuelve texto en lenguaje natural y JSON convertible en gráficos.
    - Caso de uso: chat dentro de la pantalla de Tendencias.
    Imagen sugerida: bocadillo de chat con el icono del asistente.

14. DESARROLLO — ESTRATEGIA DE PRUEBAS. Pirámide de pruebas con tres tramos:
    - Base (verde): "Unitarias: 511 (Vitest)".
    - Medio (amarillo): "Integración: 239 (pytest, SQLite en memoria)".
    - Cima (rojo): "E2E: 107 (Selenium sobre navegador real)".
    Pie: "857 pruebas · cobertura > 80% en backend y frontend".

15. DESARROLLO — PIPELINE CI/CD. Pipeline horizontal con etapas conectadas:
    Lint → (Frontend tests · Backend tests) → SonarCloud Quality Gate → E2E → Docker build → Deploy (Railway + Vercel).
    Pie: "GitHub Actions · 2 workflows · 9 jobs · bloqueo automático de Pull Requests si falla cualquier paso".

16. RESULTADOS — APLICACIÓN. Mosaico de cuatro capturas (placeholders para que yo añada después):
    - Dashboard (KPIs + gráficos).
    - Nueva venta (asistente paso a paso).
    - Tendencias (gráficos + chat IA).
    - Transporte (kanban almacén / camiones).

17. RESULTADOS — MÉTRICAS DE CALIDAD. Dos columnas con cifras grandes:
    - Quality Gate SonarCloud: Passed.
    - Cobertura backend: > 80%.
    - Cobertura frontend: > 80%.
    - Bugs: 0.
    - Vulnerabilidades: 0.
    - Tests totales: 857.
    - Endpoints REST: 56.
    - Entidades de dominio: 11.
    - Workflows CI/CD: 2 (9 jobs).
    - Desplegado en producción real.

18. CONCLUSIONES. Bullets cortos:
    - Cumplidos los 10 objetivos específicos.
    - Enfoque a producción real con restricciones reales (Railway bloquea SMTP, cobertura ≥ 80%).
    - Inversión en ingeniería del software: pruebas, CI/CD, análisis estático, quality gate.
    - Cada Pull Request fusionada con la garantía de pasar el pipeline completo.

19. TRABAJOS FUTUROS. Lista con iconos:
    - Roles y permisos granulares.
    - Gestión de stock e inventario en tiempo real.
    - Aplicación móvil (PWA o React Native).
    - Caché Redis para analíticas.
    - WebSockets para notificaciones en tiempo real.
    - Módulo de presupuestos.
    - Soporte multi-tienda.
    - Pruebas de carga (Locust).
    - Conciliación bancaria (Open Banking PSD2).

20. PORTADA DE CIERRE. Igual que la portada inicial pero con la palabra "GRACIAS" centrada en grande sobre el título.

Reglas estrictas:
- No inventes datos, cifras ni tecnologías que no aparezcan en este prompt.
- No incluyas párrafos largos en ninguna diapositiva.
- Usa SIEMPRE bullets, palabras clave o esquemas.
- Mantén coherencia cromática URJC-roja en todas las diapositivas.
```

---

## Después de generar

Una vez Gamma haya producido la presentación:

1. **Revisa que mantenga las 20 diapositivas** y la estructura indicada (a veces fusiona).
2. **Sustituye los placeholders de capturas** (diapositiva 16) por los `cap_*.png` que generes desde la aplicación según las indicaciones de la sección "Capturas de pantalla" de la memoria.
3. **Comprueba que todos los datos numéricos** (511, 239, 107, 857, 56, 11, 2, 9 jobs, > 80 %) coinciden exactamente con la memoria.
4. **Exporta a PDF** desde Gamma para tener una versión equivalente al `.pdf` de Carlos Gómez.

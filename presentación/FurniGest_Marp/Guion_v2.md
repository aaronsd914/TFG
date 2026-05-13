# Guion de defensa — TFG FurniGest (14 slides · ~11 min)

> Objetivo: ~11 minutos de exposicion natural. Con nervios y pausas llegaras a ~13 min, bien dentro del limite de 15. Cada slide tiene el tiempo estimado. Lo que aparece **en negrita** es lo destacado en el slide; el resto es lo que dices en voz alta.

---

## Estructura

- **Slides 1–10**: exposicion (~7 min)
- **Slide 11**: demo en vivo (~2.5 min)
- **Slides 12–14**: conclusiones, trabajos futuros y cierre (~1.5 min)

---

## Slide 1 — Portada (~20 s)

> *(Saludas, esperas a que el tribunal este listo.)*

> «Buenos dias. Soy **Aaron Salinero Valencia**, alumno del Grado en Ingenieria Informatica. Voy a presentar mi Trabajo Fin de Grado: **FurniGest, una aplicacion web de gestion integral para tienda de muebles**, dirigido por el profesor **Nicolas Rodriguez Uribe**.»

---

## Slide 2 — Problema y solucion (~40 s)

> «Las tiendas de muebles son PYMEs que gestionan su dia a dia con hojas de calculo y papel. Tres problemas: **sin trazabilidad** de pedidos, **datos duplicados** y **sin metricas de negocio**.»

> «Los ERPs del mercado — Odoo, SAP, Holded — son complejos, caros y genericos. No modelan conceptos clave del mueble como el albaran con fianza o las rutas de camion. De ahi nace **FurniGest**: una aplicacion **a medida** con vocacion de **produccion real**.»

---

## Slide 3 — Objetivos (~35 s)

> «El objetivo general es *disenar, implementar y desplegar en produccion una aplicacion web de gestion integral para una tienda de muebles*.»

> «Se descompone en **diez objetivos especificos**. Los cinco primeros son el nucleo funcional — CRUDs, maquina de estados, movimientos financieros, logistica y Stripe Checkout. Los cinco siguientes son los **diferenciadores**: asistente IA, analiticas de negocio, 857 pruebas, pipeline CI/CD y despliegue en produccion.»

---

## Slide 4 — Arquitectura (~25 s)

> «Arquitectura **cliente-servidor de tres capas**: **SPA** en **React 19** con Vite y Tailwind, API REST en **FastAPI** con Python 3.12, y **PostgreSQL 16** con 11 entidades. Comunicacion REST sobre HTTPS, con autenticacion **JWT** y contrasenas hasheadas con **bcrypt**.»

---

## Slide 5 — Stack tecnologico (~25 s)

> «En **backend**: PostgreSQL con SQLAlchemy 2, Groq con Llama-3 para la IA, Stripe Checkout y ReportLab para PDF. En **frontend**: React 19, Chart.js e i18next. En **infraestructura**: Docker Compose, Railway y Vercel, con GitHub Actions y SonarCloud.»

---

## Slide 6 — Ciclo de vida del albaran (~45 s)

> «El corazon del dominio es el **albaran** y su maquina de cinco estados.»

> «Empieza en **FIANZA** — se genera automaticamente un ingreso del 30%. Pasa a **ALMACEN** cuando el mueble llega. Se asigna a un camion y transita a **RUTA**. Al confirmar la entrega pasa a **ENTREGADO** — y se genera el segundo ingreso por el resto pendiente. Desde cualquier estado se puede escalar a **INCIDENCIA**.»

> «Ademas, al crear un albaran, un BackgroundTask genera el PDF y lo envia al cliente por email.»

---

## Slide 7 — Motor de analiticas (~30 s)

> «Sobre los datos operacionales corren tres algoritmos: **segmentacion RFM** que clasifica clientes en VIP, Crecimiento, Riesgo u Ocasional; **analisis de cesta** con soporte, confianza y lift; y **prediccion de Holt** con intervalos al 80%.»

---

## Slide 8 — Asistente IA (~30 s)

> «El backend inyecta contexto real — RFM, ventas, cesta — y el LLM devuelve una **respuesta dual**: texto en lenguaje natural y un JSON que Chart.js convierte en grafico al vuelo. Sin fine-tuning, solo prompt engineering. Y si Groq cae, la app se **degrada con elegancia**: el resto funciona sin interrupcion.»

---

## Slide 9 — Estrategia de pruebas (~30 s)

> «Piramide clasica: **511 unitarias** con Vitest, **239 de integracion** con pytest sobre SQLite en memoria, y **107 end-to-end** con Selenium en navegador real. En total, **857 pruebas** y cobertura por encima del 80% en ambas capas.»

---

## Slide 10 — Pipeline CI/CD (~30 s)

> «Esa suite se ejecuta en un pipeline de GitHub Actions: **1 workflow, 7 jobs**. Lint, tests en paralelo, quality gate de SonarCloud, E2E, build Docker y deploy en Railway y Vercel. Cualquier fallo **bloquea automaticamente la PR**: nada llega a main sin pasar todo el pipeline.»

---

## Slide 11 — DEMO en vivo (~2 min 30 s)

> *(Cambias del PDF al navegador.)*

### 1. Login + Dashboard (~20 s)

> «Voy a mostrar la aplicacion **funcionando en produccion real**.»

> *(Login con `user` / `useruser`.)*

> «Esto es el Dashboard: KPIs principales, ingresos del mes, pedidos abiertos, distribucion de albaranes por estado.»

### 2. Nueva venta (~30 s)

> *(Pinchas en "Nueva venta".)*

> «Creo una venta: busco al cliente, anado productos, confirmo. En este instante se crea el albaran en FIANZA, se registra el ingreso de la fianza, se genera el PDF y se envia por email — todo automatico.»

### 3. Transporte (~20 s)

> *(Vas a "Transporte".)*

> «Pantalla de logistica: a la izquierda albaranes en almacen, a la derecha los camiones. Asigno el albaran a un camion.»

### 4. Tendencias + IA (~30 s)

> *(Vas a "Tendencias".)*

> «Graficos analiticos, RFM, prediccion de Holt. Y aqui el chat IA. Le pregunto: *"Que cliente compra mas?"*»

> *(Esperas respuesta + grafico.)*

> «Respuesta en lenguaje natural y grafico generado al vuelo.»

### 5. Personalizacion (~20 s)

> *(Vas a "Personalizacion".)*

> «Modo oscuro, cambio de paleta, y conmuto a ingles: toda la interfaz se traduce al instante.»

### 6. Cierre demo (~10 s)

> *(Vuelves al PDF.)*

> «Con esto cierro la demo.»

---

## Slide 12 — Conclusiones (~50 s)

> «Se han **cumplido los diez objetivos** marcados. Quiero destacar tres cosas:»

> «Primero: **esto no es un prototipo**. FurniGest esta desplegado en produccion real, con pagos Stripe, emails y una PostgreSQL con datos operativos.»

> «Segundo: **857 pruebas automatizadas** y un pipeline de 7 jobs que bloquea el merge si falla cualquier paso. SonarCloud reporta **cero bugs y cero vulnerabilidades**.»

> «Y tercero: se han abordado problemas reales de produccion — Railway bloquea SMTP asi que se integro Resend; la cobertura exigio invertir en tests con cada feature. Esa inversion en **ingenieria del software** es deliberada.»

---

## Slide 13 — Trabajos futuros (~20 s)

> «Como lineas de continuacion: **roles y permisos granulares**, **stock en tiempo real**, **app movil**, **multi-tienda** y **conciliacion bancaria** via Open Banking PSD2.»

---

## Slide 14 — GRACIAS (~10 s)

> «Y con esto termino. **Muchas gracias por vuestra atencion.** Quedo a vuestra disposicion para las preguntas.»

---

## Resumen de tiempos

| Bloque | Slides | Tiempo |
|--------|--------|--------|
| Exposicion | 1–10 | ~5 min 30 s |
| Demo | 11 | ~2 min 30 s |
| Cierre | 12–14 | ~1 min 20 s |
| Pausas y transiciones | — | ~1 min 40 s |
| **Total estimado** | | **~11 min** |

> Con nervios y ritmo mas lento llegaras a 12–13 min. Tienes 2–3 minutos de colchon antes de los 15.

---

## Anexo — Posibles preguntas del tribunal

| Pregunta | Respuesta corta |
|---|---|
| ¿Por que FastAPI y no Django o Flask? | FastAPI da tipado con Pydantic, validacion automatica, OpenAPI integrada y async sin construir todo a mano. Django era excesivo para una API pura. |
| ¿Por que Trunk-Based Development y no Git Flow? | TBD encaja con CI/CD continuo: ramas cortas, integracion constante. Git Flow esta pensado para releases largas. |
| ¿Por que Llama-3 en Groq y no GPT-4? | Coste cero, latencia muy baja (LPU), calidad suficiente para el dominio, y codigo agnostico via variable de entorno. |
| ¿Como garantizas la seguridad? | JWT, bcrypt, HTTPS forzado, Pydantic en cada endpoint, SonarCloud sin vulnerabilidades. |
| ¿Por que Railway + Vercel? | Free tier suficiente, CI/CD nativo desde GitHub, separacion backend/frontend para escalar independientemente. |
| ¿Como mediste la cobertura? | pytest-cov en backend, Vitest V8 en frontend; ambos generan lcov que SonarCloud consume. |
| ¿Que pasa si Groq cae? | El asistente se degrada con mensaje informativo; el resto de la app funciona sin dependencia del LLM. |
| ¿Como resolviste el bloqueo de SMTP en Railway? | Si esta definida RESEND_API_KEY se usa Resend (HTTP), si no SMTP. Cambio de proveedor sin tocar logica. |
| ¿Por que SQLite en los tests? | Aislamiento total: BD en memoria por test, sin PostgreSQL real. Las pruebas tardan menos de un segundo. |
| ¿Son necesarias tantas tecnologias? | Cada herramienta cubre una responsabilidad clara sin solapamiento. Quitar cualquiera dejaria un hueco funcional. |

---

| | |
|---|---|
| URL | `furnigest.com` |
| Usuario | `user` |
| Contrasena | `useruser` |
| Swagger | `https://supportive-nurturing-production-66dc.up.railway.app/docs` |
| Tarjeta Stripe (test) | `4242 4242 4242 4242` · CVC `123` · fecha futura |

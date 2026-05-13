# Guion de la defensa — TFG FurniGest (20 diapositivas)

> Pensado para ~12-13 minutos de exposición (≈ 30-45 s por diapositiva). Cada bloque corresponde a una diapositiva de la presentación Beamer / Gamma. Lo que aparece **en negrita** es el bullet visible en la diapositiva; el resto es lo que dices en voz alta. Toda la información proviene de la memoria.

---

## Diapositiva 1 — Portada

> *(Saludas, esperas a que la mesa esté lista, miras al tribunal.)*

«Buenos días. Soy **Aarón Salinero Valencia**, alumno del Grado en Ingeniería Informática. Voy a presentar mi Trabajo Fin de Grado, titulado **"FurniGest: aplicación web de gestión integral para tienda de muebles"**, dirigido por el profesor **Nicolás Rodríguez Uribe**.»

*(Transición: pasas a la diapositiva del índice.)*

---

## Diapositiva 2 — Contenido

«La presentación está estructurada en cinco bloques: empezaré con una **introducción** al problema, después detallaré los **objetivos** del trabajo, expondré las decisiones más relevantes del **desarrollo**, mostraré los **resultados** —tanto la aplicación funcionando como las métricas de calidad— y terminaré con las **conclusiones y los trabajos futuros**.»

---

## Diapositiva 3 — Introducción · Contexto

«El sector retail de muebles está dominado por **PYMEs** que, en su mayoría, gestionan su día a día con herramientas genéricas: hojas de cálculo, papel y, en el mejor de los casos, un programa de facturación básico.

Esto provoca tres problemas recurrentes: **pérdida de trazabilidad** entre la venta y la entrega, **duplicación manual de datos** entre sistemas, y la **ausencia total de métricas de negocio en tiempo real**.

La respuesta clásica de la industria son los **Sistemas de Información de Gestión**, que en el ámbito empresarial se conocen como ERPs.»

---

## Diapositiva 4 — Introducción · Motivación

«Sin embargo, los ERPs del mercado —Odoo, SAP Business One, Holded— tienen tres limitaciones importantes para una tienda pequeña: **configuración compleja, coste elevado y módulos no específicos**.

En particular, conceptos esenciales del dominio del mueble como el **albarán con fianza, las rutas asignadas a un camión o la liquidación de transporte** no están cubiertos de forma nativa.

De ahí nace **FurniGest**: una aplicación a medida, diseñada con vocación de **producción real**, no de prototipo académico.»

---

## Diapositiva 5 — Objetivos · Objetivo general

«El objetivo general del trabajo es, literalmente: *"Diseñar, implementar y desplegar en producción una aplicación web de gestión integral para una tienda de muebles que centralice clientes, pedidos, logística, finanzas y analíticas de negocio".*

Tres ideas resumen el enfoque: **adaptada al flujo real** de la tienda, desplegada en la **nube**, y respaldada por un **quality gate y un pipeline de CI/CD**.»

---

## Diapositiva 6 — Objetivos específicos (1/2)

«Ese objetivo general se descompone en **diez objetivos específicos**. Los cinco primeros cubren el núcleo funcional:

- El **OBJ-01** es el CRUD completo de clientes, productos y proveedores.
- El **OBJ-02**, una máquina de estados del albarán con cinco estados.
- El **OBJ-03**, los movimientos financieros automáticos asociados a cada operación.
- El **OBJ-04**, el módulo de logística: camiones, manifiestos y liquidación.
- El **OBJ-05**, el motor de analíticas, que incluye segmentación RFM, análisis de cesta y predicción.»

---

## Diapositiva 7 — Objetivos específicos (2/2)

«Los cinco siguientes son los objetivos diferenciadores:

- **OBJ-06**: un asistente conversacional con un modelo grande de lenguaje, Llama-3 a través de Groq.
- **OBJ-07**: cobro con tarjeta integrando Stripe Checkout.
- **OBJ-08**: una suite de pruebas que combina unitarias, integración y end-to-end.
- **OBJ-09**: un pipeline CI/CD con GitHub Actions y SonarCloud.
- Y por último el **OBJ-10**, el despliegue real en producción usando Railway para el backend y Vercel para el frontend.»

---

## Diapositiva 8 — Desarrollo · Metodología

«Pasando al desarrollo: el trabajo se ha llevado con un enfoque **ágil de iteraciones cortas**. La estrategia de control de versiones es **Trunk-Based Development**: una única rama `main` siempre desplegable, y ramas `feature/*` o `fix/*` de vida muy corta que se integran rápido.

Cada commit sigue **Conventional Commits** —`feat`, `fix`, `refactor`, `test`, `docs`, `chore`— para que el historial sea legible y permita generar changelogs.

Los requisitos están documentados siguiendo el estándar **IEEE 830**.»

---

## Diapositiva 9 — Desarrollo · Arquitectura

«La arquitectura es **cliente-servidor de tres capas**, claramente desacopladas:

- En el cliente, una **SPA en React 19**, construida con Vite y estilada con TailwindCSS.
- En el servidor, una **API REST en FastAPI**, en Python 3.12.
- En la capa de datos, **PostgreSQL 16**, con un modelo de **once entidades en tercera forma normal**.

La comunicación es REST sobre HTTP/1.1 con TLS, intercambiando JSON.»

---

## Diapositiva 10 — Desarrollo · Stack tecnológico

«Estos son los componentes principales. En el **backend** destaco SQLAlchemy 2 con Pydantic v2 para serialización, Alembic para migraciones, ReportLab para PDFs, Groq con Llama-3 para el asistente, Stripe para pagos y un emisor de correo con SMTP y Resend.

En el **frontend**, React 19, React Router 7, Chart.js para los gráficos e i18next para internacionalización.

Y en **infraestructura**, Docker Compose para desarrollo, Railway para el backend y Vercel para el frontend.»

---

## Diapositiva 11 — Desarrollo · Ciclo de vida del albarán

«El corazón del dominio es el **albarán** y su máquina de estados. Una venta empieza en el estado **FIANZA**, cuando el cliente paga la señal —y aquí se genera de forma automática un movimiento financiero de tipo INGRESO—. Cuando el mueble llega a la tienda pasa a **ALMACÉN**.

Al asignarlo a un camión transita a **RUTA**, y al confirmar la entrega pasa a **ENTREGADO**, momento en el que **automáticamente se genera el segundo INGRESO** por la diferencia entre el total y la fianza.

Si surge un problema, desde cualquier estado se puede saltar a **INCIDENCIA**, y volver al estado anterior cuando se resuelve.»

---

## Diapositiva 12 — Desarrollo · Algoritmos de negocio

«Sobre esos datos operacionales se ejecutan tres algoritmos del dominio analítico:

- **Segmentación RFM**, que clasifica a los clientes en VIP, En crecimiento, En riesgo u Ocasional. Es lineal, O(n).
- **Análisis de cesta de la compra**, que extrae reglas de asociación calculando soporte, confianza y lift. Su coste es O(m·k²).
- Y **predicción de ventas con suavizado exponencial doble de Holt**, con intervalos de confianza al 80%, que se renderiza directamente en la pantalla de Tendencias.»

---

## Diapositiva 13 — Desarrollo · Asistente IA

«Sobre esa capa analítica añadí un **asistente conversacional**. Utilizo el modelo **Llama-3.1-8b-instant a través de la API de Groq**, que ofrece muy baja latencia gracias a su hardware LPU y un plan gratuito.

No hay fine-tuning: todo se resuelve con **prompt engineering**. El modelo responde tanto en lenguaje natural como en **JSON estructurado**, que el frontend convierte automáticamente en gráficos. El caso de uso principal es el chat embebido en la pantalla de Tendencias, donde el usuario puede preguntar cosas como *"¿qué cliente compra más?"* y obtener la respuesta acompañada de un gráfico.»

---

## Diapositiva 14 — Desarrollo · Estrategia de pruebas

«La estrategia de pruebas sigue la **pirámide clásica**: en la base, **511 pruebas unitarias** del frontend con Vitest; en el medio, **239 pruebas de integración** del backend con pytest sobre una base de datos SQLite en memoria; y en la cima, **107 pruebas end-to-end** con Selenium que recorren el navegador real.

En total, **857 pruebas automatizadas y una cobertura por encima del 80%** tanto en backend como en frontend.»

---

## Diapositiva 15 — Desarrollo · Pipeline CI/CD

«Toda esa suite se ejecuta en un **pipeline de GitHub Actions con dos workflows y nueve jobs** que enlazan, en orden: lint, pruebas de frontend y backend en paralelo, **quality gate de SonarCloud**, end-to-end, build de imágenes Docker y despliegue automático en Railway y Vercel.

Cualquier fallo en cualquier paso bloquea automáticamente la Pull Request, de modo que **nada llega a `main` sin pasar el pipeline completo**.»

---

## Diapositiva 16 — Resultados · Aplicación

«Estos son algunos resultados visuales. *(Vas señalando capturas.)*

- En el **Dashboard** se ven los KPIs principales y los gráficos de actividad.
- La pantalla de **Nueva venta** es un asistente paso a paso que abstrae al usuario del modelo de datos.
- En **Tendencias** se concentran los gráficos analíticos junto al chat con el asistente IA.
- Y la pantalla de **Transporte** es un kanban que separa los albaranes en almacén de los asignados a cada camión.»

---

## Diapositiva 17 — Resultados · Métricas de calidad

«En cuanto a métricas de calidad: el **Quality Gate de SonarCloud está en verde**, con **cero bugs y cero vulnerabilidades** detectadas.

La aplicación expone **56 endpoints REST** sobre **11 entidades de dominio**, está respaldada por **857 pruebas automatizadas** y por un pipeline de CI/CD de **dos workflows con nueve jobs**.

Y, lo más importante, **está desplegada en producción real**, accesible desde Internet.»

---

## Diapositiva 18 — Conclusiones

«Como conclusión: **se han cumplido los diez objetivos específicos** marcados al inicio del trabajo.

El enfoque ha sido siempre el de un proyecto de **producción real**, asumiendo restricciones reales —por ejemplo, que Railway bloquea SMTP de salida, lo que obligó a integrar Resend; o el compromiso de mantener cobertura por encima del 80%—.

Ha habido una **inversión consciente en ingeniería del software**: pruebas, CI/CD, análisis estático y quality gate. Eso garantiza que **toda Pull Request fusionada en `main` ha pasado el pipeline completo**.»

---

## Diapositiva 19 — Trabajos futuros

«Como líneas de continuación, las más relevantes son: un sistema de **roles y permisos granulares**, gestión de **stock e inventario en tiempo real**, una **aplicación móvil** —ya sea PWA o React Native—, **caché Redis** para acelerar las analíticas, **WebSockets** para notificaciones en tiempo real, un **módulo de presupuestos** previo al albarán, **soporte multi-tienda**, **pruebas de carga con Locust** y, a más largo plazo, **conciliación bancaria automática** vía Open Banking.»

---

## Diapositiva 20 — Cierre

«Y con esto termino. **Muchas gracias por vuestra atención.** Quedo a vuestra disposición para las preguntas que estiméis oportunas.»

---

## Anexo — Posibles preguntas del tribunal y respuestas breves

| Pregunta esperable | Respuesta corta |
|---|---|
| ¿Por qué FastAPI y no Django o Flask? | FastAPI da tipado con Pydantic, validación automática, documentación OpenAPI integrada y rendimiento async sin renunciar a Python; Flask exigía construir todo eso a mano y Django era excesivo para una API pura. |
| ¿Por qué Trunk-Based Development y no Git Flow? | TBD encaja con CI/CD continuo: ramas cortas, integración constante, menos conflictos. Git Flow es más pesado y está pensado para releases largas. |
| ¿Por qué Llama-3 en Groq y no GPT-4? | Coste cero en el plan free, latencia muy baja gracias a la LPU de Groq, y suficiente calidad para los prompts del dominio. Mantiene el código agnóstico vía variable de entorno. |
| ¿Cómo garantizas la seguridad? | JWT en cabecera Authorization, hash de contraseñas con bcrypt, HTTPS forzado, validación con Pydantic en cada endpoint, SonarCloud sin vulnerabilidades y dependencias actualizadas. |
| ¿Por qué Railway + Vercel? | Free tier suficiente para un TFG, CI/CD nativo desde GitHub, separar backend y frontend permite escalar y desplegar de forma independiente. |
| ¿Cómo mediste la cobertura? | `pytest-cov` en backend y `vitest --coverage` (V8) en frontend; ambos generan `lcov.info` que SonarCloud consume y bloquea el merge si baja del umbral. |
| ¿Qué pasa si Groq cae? | El asistente se degrada con un mensaje informativo; el resto de la aplicación funciona sin dependencia del LLM. |

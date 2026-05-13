---
marp: true
theme: default
paginate: true
size: 16:9
header: 'FurniGest · TFG · Aarón Salinero'
footer: 'URJC · ETSII · Junio 2026'
math: katex
style: |
  :root {
    --urjc: #CB0017;
    --urjc-soft: #FCE6E8;
    --ink: #1a1a1a;
    --muted: #666;
    --bg: #ffffff;
    --green: #2E7D32;
    --amber: #F57F17;
    --blue: #1565C0;
    --violet: #6A1B9A;
  }
  section {
    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif;
    background: var(--bg);
    color: var(--ink);
    padding: 50px 70px;
  }
  h1 { color: var(--urjc); font-weight: 700; letter-spacing: -0.5px; }
  h2 {
    color: var(--urjc);
    border-bottom: 3px solid var(--urjc);
    padding-bottom: 8px;
    font-weight: 700;
    margin-top: 0;
  }
  h3 { color: var(--ink); font-weight: 600; }
  strong { color: var(--urjc); }
  ul li { margin-bottom: 6px; }
  header {
    color: var(--muted);
    font-size: 16px;
    padding: 16px 24px 0 70px;
  }
  footer {
    color: var(--muted);
    font-size: 14px;
    padding: 0 70px 16px 0;
    text-align: right;
  }
  section.cover {
    background: linear-gradient(135deg, var(--urjc) 0%, #8a000f 100%);
    color: #fff;
    padding: 90px;
  }
  section.cover h1 { color: #fff; font-size: 64px; line-height: 1.05; }
  section.cover .sub { color: #ffe2e6; font-size: 26px; margin-top: 8px; }
  section.cover .meta { color: #fff; font-size: 20px; margin-top: 60px; line-height: 1.7; }
  section.cover strong { color: #fff; }
  section.cover header, section.cover footer { color: rgba(255,255,255,0.7); }
  section.demo {
    background: var(--ink);
    color: #fff;
    text-align: center;
  }
  section.demo h1 { color: #fff; font-size: 96px; letter-spacing: 3px; }
  section.demo p { color: #aaa; font-size: 22px; }
  section.demo h3 { color: #fff; font-size: 36px; margin-top: 20px; }
  section.demo a {
    color: #fff;
    text-decoration: none;
    font-size: 42px;
    font-weight: 700;
    border-bottom: 3px solid var(--urjc);
    padding-bottom: 6px;
    transition: color 0.2s;
    letter-spacing: 1px;
  }
  section.demo a:hover { color: #ffe2e6; }
  section.thanks { background: var(--urjc); color: #fff; }
  section.thanks h1 { color: #fff; font-size: 110px; letter-spacing: 5px; text-align: center; margin-top: 120px; }
  section.thanks .who { text-align: center; color: #ffe2e6; margin-top: 40px; font-size: 22px; }

  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 22px; margin-top: 18px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 18px; }
  .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-top: 14px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 14px; }
  .card {
    background: #fafafa;
    border: 1.5px solid #eee;
    border-left: 5px solid var(--urjc);
    border-radius: 6px;
    padding: 14px 18px;
  }
  .card .icon { font-size: 36px; }
  .card h4 { margin: 8px 0 4px 0; color: var(--urjc); font-size: 18px; }
  .card p { margin: 0; font-size: 16px; color: var(--muted); }
  .obj {
    background: #fff;
    border: 1.5px solid #ddd;
    border-radius: 6px;
    padding: 10px 12px;
    text-align: center;
    font-size: 14px;
  }
  .obj .id { color: var(--urjc); font-weight: 700; font-size: 16px; }
  .obj .desc { color: var(--ink); margin-top: 2px; }
  .obj.obj-diff { border: 2px solid var(--urjc); background: var(--urjc-soft); }
  .obj.obj-diff .id { color: #fff; background: var(--urjc); display: inline-block; padding: 1px 8px; border-radius: 3px; }
  .arch-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin: 30px 0; }
  .flow-row { display: flex; justify-content: center; align-items: center; gap: 10px; margin: 24px 0; flex-wrap: nowrap; }
  .flow-row .arch-box { min-width: 0; flex: 1 1 0; padding: 12px 10px; }
  .flow-row .arch-box .tech { font-size: 14px; }
  .flow-row .arch-arrow { flex: 0 0 auto; font-size: 26px; }
  .arch-box {
    background: #fff; border: 2px solid var(--urjc);
    border-radius: 10px; padding: 18px 22px; min-width: 230px; text-align: center;
  }
  .arch-box .layer { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
  .arch-box .tech { color: var(--urjc); font-weight: 700; font-size: 20px; margin-top: 4px; }
  .arch-box .sub { color: var(--ink); font-size: 14px; margin-top: 4px; }
  .arch-arrow { color: var(--urjc); font-size: 30px; font-weight: 900; }
  .arch-edge { font-size: 12px; color: var(--muted); text-align: center; }

  .auto-tag {
    display: inline-block; background: var(--urjc-soft); color: var(--urjc);
    padding: 2px 8px; border-radius: 4px; font-size: 13px; font-weight: 600;
  }

  .pipeline { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 18px; flex-wrap: wrap; }
  .pipe-step {
    background: #f5f5f5; border-top: 3px solid var(--urjc);
    padding: 10px 12px; border-radius: 4px; font-size: 13px; text-align: center; min-width: 92px;
  }
  .pipe-step strong { display: block; color: var(--urjc); font-size: 13px; }
  .pipe-arrow { color: var(--urjc); font-weight: 900; }

  .big-num { text-align: center; padding: 10px; }
  .big-num .v { font-size: 56px; font-weight: 800; color: var(--urjc); line-height: 1; }
  .big-num .l { font-size: 14px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

  .stack-col { background: #fafafa; border-radius: 8px; padding: 16px 18px; }
  .stack-col h4 { color: var(--urjc); margin: 0 0 10px 0; font-size: 18px; }
  .stack-col ul { margin: 0; padding-left: 20px; font-size: 15px; }
  .stack-col li { margin-bottom: 4px; }

  .lead { font-size: 22px; line-height: 1.4; }

  .stats-row {
    display: flex !important;
    justify-content: center;
    align-items: flex-start;
    gap: 60px;
    margin-top: 28px;
  }
  .stats-row-compact {
    display: flex !important;
    justify-content: center;
    align-items: flex-start;
    gap: 40px;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid #eee;
  }
---

<!-- _class: cover -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# FurniGest

<div class="sub">Aplicación web de gestión integral<br>para tienda de muebles</div>

<div class="meta">
<strong>Aarón Salinero Valencia</strong><br>
Tutor: Nicolás Rodríguez Uribe<br>
<br>
Grado en Ingeniería Informática · ETSII URJC<br>
Curso 2024–2025 · Junio 2026
</div>

---

## Problema y solución

<div class="grid-2">
<div class="stack-col">
<h4>❌ Las PYMEs del mueble</h4>
<ul>
<li><strong>Sin trazabilidad</strong> — pedidos perdidos entre venta y entrega</li>
<li><strong>Datos duplicados</strong> — el mismo cliente en cinco sitios</li>
<li><strong>Sin métricas</strong> — sin visibilidad de ventas ni clientes</li>
<li><strong>ERPs del mercado</strong> — Odoo, SAP, Holded: complejos, caros, genéricos</li>
</ul>
</div>
<div class="stack-col" style="border-left:4px solid #2E7D32">
<h4 style="color:#2E7D32">✅ FurniGest — a medida</h4>
<ul>
<li><strong>Albarán con fianza</strong> — máquina de 5 estados automáticos</li>
<li><strong>Rutas por camión</strong> — logística y liquidación de transporte</li>
<li><strong>Producción real</strong> — desplegada y operativa en la nube</li>
<li><strong>A medida</strong> — no es un prototipo académico</li>
</ul>
</div>
</div>

---

## Objetivo general y 10 objetivos específicos

> *Diseñar, implementar y desplegar en producción una aplicación web de gestión integral para una tienda de muebles.*

<p style="margin:8px 0 2px; font-size:14px; color:var(--muted); text-transform:uppercase; letter-spacing:1px">Núcleo funcional</p>

<div class="grid-5">
<div class="obj"><div class="id">OBJ-01</div><div class="desc">CRUDs</div></div>
<div class="obj"><div class="id">OBJ-02</div><div class="desc">Máquina de estados<br>del albarán</div></div>
<div class="obj"><div class="id">OBJ-03</div><div class="desc">Movimientos<br>automáticos</div></div>
<div class="obj"><div class="id">OBJ-04</div><div class="desc">Logística:<br>camiones y rutas</div></div>
<div class="obj"><div class="id">OBJ-05</div><div class="desc">Pago con<br>Stripe Checkout</div></div>
</div>

<p style="margin:12px 0 2px; font-size:14px; color:var(--urjc); text-transform:uppercase; letter-spacing:1px; font-weight:700">★ Diferenciadores</p>

<div class="grid-5">
<div class="obj obj-diff"><div class="id">OBJ-06</div><div class="desc">Asistente IA<br>(Llama-3 / Groq)</div></div>
<div class="obj obj-diff"><div class="id">OBJ-07</div><div class="desc">Analíticas:<br>RFM, cesta, Holt</div></div>
<div class="obj obj-diff"><div class="id">OBJ-08</div><div class="desc">Pirámide<br>de pruebas</div></div>
<div class="obj obj-diff"><div class="id">OBJ-09</div><div class="desc">CI/CD<br>+ SonarCloud</div></div>
<div class="obj obj-diff"><div class="id">OBJ-10</div><div class="desc">Despliegue en<br>Railway + Vercel</div></div>
</div>

---

## Arquitectura cliente-servidor de tres capas

<div class="arch-row">
<div class="arch-box">
<div class="layer">Cliente</div>
<div class="tech">React 19 SPA</div>
<div class="sub">Vite 6 · TailwindCSS 4</div>
</div>
<div>
<div class="arch-arrow">⇄</div>
<div class="arch-edge">HTTP · JSON · REST</div>
</div>
<div class="arch-box">
<div class="layer">Servidor</div>
<div class="tech">FastAPI 0.115</div>
<div class="sub">Python 3.12 · Pydantic v2</div>
</div>
<div>
<div class="arch-arrow">⇄</div>
<div class="arch-edge">SQLAlchemy 2</div>
</div>
<div class="arch-box">
<div class="layer">Datos</div>
<div class="tech">PostgreSQL 16</div>
<div class="sub">11 entidades</div>
</div>
</div>

<br>

- Estilo arquitectónico **REST** (Fielding) sobre HTTP/1.1 + TLS.
- Frontend **SPA** (Single Page Application) con navegación client-side.
- Autenticación con **JWT** + contraseñas hasheadas con **bcrypt**.

---

## Stack tecnológico

<div class="grid-3">
<div class="stack-col">
<h4>🖥️ Backend</h4>
<ul>
<li>FastAPI 0.115</li>
<li>SQLAlchemy 2 + Alembic</li>
<li>Pydantic v2</li>
<li>PostgreSQL 16</li>
<li>ReportLab (PDF)</li>
<li>Groq + Llama-3.1</li>
<li>Stripe Checkout</li>
<li>SMTP + Resend</li>
</ul>
</div>
<div class="stack-col">
<h4>🌐 Frontend</h4>
<ul>
<li>React 19</li>
<li>Vite 6</li>
<li>TailwindCSS 4</li>
<li>React Router 7</li>
<li>Chart.js 4</li>
<li>i18next (ES / EN)</li>
<li>Hooks personalizados</li>
<li>Context API</li>
</ul>
</div>
<div class="stack-col">
<h4>☁️ Infraestructura</h4>
<ul>
<li>Docker Compose</li>
<li>Railway (backend)</li>
<li>Vercel (frontend)</li>
<li>GitHub Actions</li>
<li>SonarCloud</li>
<li>Resend (email)</li>
<li>JWT + bcrypt</li>
<li>HTTPS forzado</li>
</ul>
</div>
</div>

---

## Ciclo de vida del albarán — máquina de 5 estados

<div class="flow-row" style="margin:16px 0 6px">
<div class="arch-box" style="min-width:0;flex:1;padding:10px 8px"><div class="layer">1</div><div class="tech" style="font-size:16px">FIANZA</div><div class="sub">Cliente paga señal</div></div>
<div class="arch-arrow" style="font-size:22px">→</div>
<div class="arch-box" style="min-width:0;flex:1;padding:10px 8px"><div class="layer">2</div><div class="tech" style="font-size:16px">ALMACÉN</div><div class="sub">Mueble recibido</div></div>
<div class="arch-arrow" style="font-size:22px">→</div>
<div class="arch-box" style="min-width:0;flex:1;padding:10px 8px"><div class="layer">3</div><div class="tech" style="font-size:16px">RUTA</div><div class="sub">Asignado a camión</div></div>
<div class="arch-arrow" style="font-size:22px">→</div>
<div class="arch-box" style="min-width:0;flex:1;padding:10px 8px;border-color:#2E7D32"><div class="layer">4</div><div class="tech" style="font-size:16px;color:#2E7D32">ENTREGADO</div><div class="sub">Entrega confirmada</div></div>
</div>
<div style="text-align:center; margin-top:6px">
<div style="font-size:14px; color:#666">↓ desde cualquier estado ↓</div>
<div class="arch-box" style="display:inline-block; padding:8px 28px; border-color:#CB0017; margin-top:4px"><div class="tech" style="font-size:16px; color:#CB0017">INCIDENCIA</div><div class="sub">Reportar problema · revertible</div></div>
</div>

<div class="grid-3" style="margin-top:14px">
<div class="stack-col">
<h4>⚡ Auto-ingreso fianza</h4>
<p style="margin:0; font-size:15px">Al pagar → movimiento INGRESO (30 % del total)</p>
</div>
<div class="stack-col">
<h4>⚡ Auto-ingreso entrega</h4>
<p style="margin:0; font-size:15px">Al entregar → movimiento INGRESO (resto pendiente)</p>
</div>
<div class="stack-col">
<h4>⚡ Auto-PDF + email</h4>
<p style="margin:0; font-size:15px">Al crear albarán → PDF + envío en BackgroundTask</p>
</div>
</div>

---

## Motor de analíticas: 3 algoritmos

<div class="grid-3">
<div class="card">
<div class="icon">👥</div>
<h4>Segmentación RFM</h4>
<p><strong>R</strong>ecencia · <strong>F</strong>recuencia · <strong>M</strong>onetario</p>
<p style="margin-top:6px">→ VIP · Crecimiento · Riesgo · Ocasional</p>
<p style="margin-top:8px; color: var(--urjc)"><strong>O(n)</strong></p>
</div>
<div class="card">
<div class="icon">🛒</div>
<h4>Análisis de cesta</h4>
<p>Pares de productos comprados juntos.</p>
<p style="margin-top:6px">Soporte · Confianza · Lift</p>
<p style="margin-top:8px; color: var(--urjc)"><strong>O(m · k²)</strong></p>
</div>
<div class="card">
<div class="icon">📈</div>
<h4>Predicción Holt</h4>
<p>Suavizado exponencial doble.</p>
<p style="margin-top:6px">Nivel + tendencia.</p>
<p style="margin-top:8px; color: var(--urjc)"><strong>Intervalo 80 %</strong></p>
</div>
</div>

---

## Asistente IA conversacional

<div class="flow-row">
<div class="arch-box"><div class="layer">Usuario</div><div class="tech">"¿Qué cliente<br>compra más?"</div></div>
<div class="arch-arrow">→</div>
<div class="arch-box" style="border-color:#1565C0"><div class="layer">Backend</div><div class="tech" style="color:#1565C0">Inyecta contexto<br>RFM + ventas</div></div>
<div class="arch-arrow">→</div>
<div class="arch-box" style="border-color:#6A1B9A"><div class="layer">LLM</div><div class="tech" style="color:#6A1B9A">Prompt engineering<br>temp=0.2</div></div>
<div class="arch-arrow">→</div>
<div class="arch-box" style="border-color:#2E7D32"><div class="layer">Respuesta dual</div><div class="tech" style="color:#2E7D32">Texto natural +<br>JSON → gráfico</div></div>
</div>

- Respuesta **dual**: texto en lenguaje natural + JSON que Chart.js renderiza como gráfico al vuelo.
- **Degradación elegante**: si el proveedor LLM cae, el resto de la app funciona sin interrupción.

---

## Estrategia de pruebas — 857 tests automatizados

<div class="grid-3">
<div class="card">
<h4>Unitarias · 511</h4>
<p><strong>Vitest</strong> + Testing Library</p>
<p style="margin-top:6px; color:var(--muted)">Frontend · componentes y hooks</p>
</div>
<div class="card">
<h4>Integración · 239</h4>
<p><strong>pytest</strong> + SQLite en memoria</p>
<p style="margin-top:6px; color:var(--muted)">Backend · endpoints REST aislados</p>
</div>
<div class="card">
<h4>E2E · 107</h4>
<p><strong>Selenium</strong> + navegador real</p>
<p style="margin-top:6px; color:var(--muted)">Flujos completos de usuario</p>
</div>
</div>

<div class="stats-row">
<div class="big-num"><div class="v">857</div><div class="l">tests totales</div></div>
<div class="big-num"><div class="v">> 80 %</div><div class="l">cobertura back + front</div></div>
<div class="big-num"><div class="v" style="color:#2E7D32">0</div><div class="l">bugs SonarCloud</div></div>
</div>

---

## Pipeline CI/CD

<div class="pipeline">
<div class="pipe-step"><strong>Lint</strong>Ruff · ESLint</div>
<div class="pipe-arrow">→</div>
<div class="pipe-step"><strong>Frontend</strong>Vitest</div>
<div class="pipe-arrow">→</div>
<div class="pipe-step"><strong>Backend</strong>pytest</div>
<div class="pipe-arrow">→</div>
<div class="pipe-step"><strong>SonarCloud</strong>Quality Gate</div>
<div class="pipe-arrow">→</div>
<div class="pipe-step"><strong>E2E</strong>Selenium</div>
<div class="pipe-arrow">→</div>
<div class="pipe-step"><strong>Docker</strong>Build & Push</div>
<div class="pipe-arrow">→</div>
<div class="pipe-step"><strong>Deploy</strong>Railway + Vercel</div>
</div>

<br>

- **1 workflow**, **7 jobs**, ejecutados en cada Pull Request.
- Cualquier fallo **bloquea el merge** automáticamente.
- *Quality gate* SonarCloud: cobertura, *bugs*, *code smells*, *security hotspots*.

---

<!-- _class: demo -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# DEMO

<br>

### 🎬 [furnigest.com](https://furnigest.com/login)


---

## Conclusiones

<div class="grid-4" style="margin-top:30px">
<div class="stack-col" style="text-align:center; border-top:4px solid var(--urjc)">
<div style="font-size:36px">✅</div>
<h4>10 / 10 objetivos</h4>
<p style="font-size:14px; color:#666; margin-top:6px">Del CRUD al asistente IA y el cobro con Stripe.</p>
</div>
<div class="stack-col" style="text-align:center; border-top:4px solid #2E7D32">
<div style="font-size:36px">🚀</div>
<h4 style="color:#2E7D32">Producción real</h4>
<p style="font-size:14px; color:#666; margin-top:6px">Desplegado en Railway + Vercel, accesible desde Internet.</p>
</div>
<div class="stack-col" style="text-align:center; border-top:4px solid #1565C0">
<div style="font-size:36px">🔧</div>
<h4 style="color:#1565C0">Ingeniería del software</h4>
<p style="font-size:14px; color:#666; margin-top:6px">Pruebas, CI/CD, análisis estático, quality gate.</p>
</div>
<div class="stack-col" style="text-align:center; border-top:4px solid #6A1B9A">
<div style="font-size:36px">🛡️</div>
<h4 style="color:#6A1B9A">Garantía de pipeline</h4>
<p style="font-size:14px; color:#666; margin-top:6px">Toda PR fusionada pasa los 7 jobs del CI/CD.</p>
</div>
</div>

<div class="stats-row-compact">
<div class="big-num"><div class="v" style="font-size:42px">857</div><div class="l">tests</div></div>
<div class="big-num"><div class="v" style="font-size:42px">56</div><div class="l">endpoints</div></div>
<div class="big-num"><div class="v" style="font-size:42px">11</div><div class="l">entidades</div></div>
<div class="big-num"><div class="v" style="font-size:42px; color:#2E7D32">0</div><div class="l">bugs</div></div>
<div class="big-num"><div class="v" style="font-size:42px; color:#2E7D32">PASS</div><div class="l">SonarCloud</div></div>
<div class="big-num"><div class="v" style="font-size:42px; color:#2E7D32">LIVE</div><div class="l">producción</div></div>
</div>

---

## Trabajos futuros

- Roles y **permisos granulares** (admin, vendedor, repartidor)
- Gestión de **stock e inventario** en tiempo real
- **Aplicación móvil** (PWA o React Native)
- **Caché Redis** para acelerar analíticas
- **WebSockets** para notificaciones en tiempo real
- Módulo de **presupuestos** previo al albarán
- Soporte **multi-tienda**
- Pruebas de **carga con Locust**
- **Conciliación bancaria** automática vía Open Banking PSD2

---

<!-- _class: thanks -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# GRACIAS

<div class="who">
Aarón Salinero Valencia<br>
Trabajo Fin de Grado · Junio 2026<br>
ETSII · Universidad Rey Juan Carlos
</div>

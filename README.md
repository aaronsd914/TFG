# FurniGest — Furniture Store Management ERP

> **Management Information System (MIS) for a furniture store:** customers, delivery notes (albaranes), products, suppliers, logistics, financial analytics and AI-assisted business intelligence. FurniGest captures, stores, processes and distributes business data to support management decision-making.

| | |
|---|---|
| **Student** | Aarón Salinero Valencia |
| **Tutor** | Nicolás Hernán Rodríguez Uribe |
| **Academic year** | 2025 / 2026 |

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=aaronsd914_TFG&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=aaronsd914_TFG)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=aaronsd914_TFG&metric=coverage)](https://sonarcloud.io/summary/new_code?id=aaronsd914_TFG)
[![Tests](https://github.com/aaronsd914/TFG/actions/workflows/ci.yml/badge.svg)](https://github.com/aaronsd914/TFG/actions/workflows/ci.yml)

---

## Table of Contents

- [FurniGest — Furniture Store Management ERP](#furnigest--furniture-store-management-erp)
  - [Table of Contents](#table-of-contents)
  - [Phase 0 — Feature Definition](#phase-0--feature-definition)
    - [Core features](#core-features)
    - [Advanced features](#advanced-features)
    - [Entities](#entities)
    - [User types \& permissions](#user-types--permissions)
      - [User personas](#user-personas)
    - [Charts](#charts)
    - [Complementary technology](#complementary-technology)
    - [Advanced algorithm](#advanced-algorithm)
  - [Phase 1 — Implementation](#phase-1--implementation)
    - [Tech stack](#tech-stack)
    - [Architecture decisions](#architecture-decisions)
      - [Backend](#backend)
      - [Frontend](#frontend)
    - [Project structure](#project-structure)
    - [Configuration reference](#configuration-reference)
      - [`backend/app/stripe_config.py` — Payments](#backendappstripe_configpy--payments)
      - [`backend/app/ia_settings.py` — AI / LLM](#backendappia_settingspy--ai--llm)
      - [`backend/app/settings_email.py` — SMTP / Email](#backendappsettings_emailpy--smtp--email)
      - [`backend/app/database.py` — Database connection](#backendappdatabasepy--database-connection)
    - [Backend — REST API](#backend--rest-api)
      - [Customers — `/api/clientes`](#customers--apiclientes)
      - [Products — `/api/productos`](#products--apiproductos)
      - [Suppliers — `/api/proveedores`](#suppliers--apiproveedores)
      - [Delivery notes — `/api/albaranes`](#delivery-notes--apialbaranes)
      - [Financial movements — `/api/movimientos`](#financial-movements--apimovimientos)
      - [Transport — `/api/transporte`](#transport--apitransporte)
      - [Analytics — `/api/analytics`](#analytics--apianalytics)
      - [AI assistant — `/api/ai`](#ai-assistant--apiai)
      - [Stripe — `/api/stripe`](#stripe--apistripe)
      - [Health — `/health`](#health--health)
    - [Frontend — React SPA](#frontend--react-spa)
      - [Navigation](#navigation)
    - [Technical flows](#technical-flows)
      - [1 — Delivery note lifecycle (Albaran state machine)](#1--delivery-note-lifecycle-albaran-state-machine)
      - [2 — Stripe payment flow](#2--stripe-payment-flow)
      - [3 — Email + PDF delivery flow](#3--email--pdf-delivery-flow)
    - [Database diagram](#database-diagram)
      - [Full SQL schema](#full-sql-schema)
    - [Component diagram](#component-diagram)
    - [Analytics engine — technical depth](#analytics-engine--technical-depth)
      - [RFM customer segmentation](#rfm-customer-segmentation)
      - [Market basket analysis (association rules)](#market-basket-analysis-association-rules)
    - [LLM integration — technical depth](#llm-integration--technical-depth)
      - [Architecture overview](#architecture-overview)
      - [System prompt (verbatim)](#system-prompt-verbatim)
      - [User message structure](#user-message-structure)
      - [Temperature and model choice](#temperature-and-model-choice)
      - [Chart JSON extraction](#chart-json-extraction)
      - [Fallback behaviour](#fallback-behaviour)
      - [Model background](#model-background)
    - [Running the application](#running-the-application)
      - [Prerequisites](#prerequisites)
      - [Local development (without Docker)](#local-development-without-docker)
        - [Backend](#backend-1)
        - [Frontend](#frontend-1)
      - [Docker (recommended)](#docker-recommended)
    - [Seed data](#seed-data)
    - [Automated tests](#automated-tests)
      - [Backend tests — pytest](#backend-tests--pytest)
      - [Frontend tests — Vitest](#frontend-tests--vitest)
      - [Continuous Integration — GitHub Actions](#continuous-integration--github-actions)
        - [ci.yml — test, build & deploy](#ciyml--test-build--deploy)
          - [CI pipeline steps (backend job)](#ci-pipeline-steps-backend-job)
          - [Why dummy config files are needed in CI](#why-dummy-config-files-are-needed-in-ci)
          - [Stripe secret key mock](#stripe-secret-key-mock)
        - [lint.yml — code quality](#lintyml--code-quality)
        - [Summary — all workflows](#summary--all-workflows)
      - [Git branching model \& commit conventions](#git-branching-model--commit-conventions)
      - [Test isolation notes](#test-isolation-notes)
    - [Docker containerisation](#docker-containerisation)
      - [Container architecture](#container-architecture)
      - [Nginx reverse proxy and SPA routing](#nginx-reverse-proxy-and-spa-routing)
      - [Config-file volume strategy](#config-file-volume-strategy)
      - [Database URL environment variable](#database-url-environment-variable)
      - [.env.example](#envexample)
    - [Code quality](#code-quality)
      - [Ruff (Python)](#ruff-python)
      - [ESLint (JavaScript / React)](#eslint-javascript--react)
    - [UI quality evaluation](#ui-quality-evaluation)
    - [Screen captures](#screen-captures)
    - [Production deployment](#production-deployment)
      - [Infrastructure](#infrastructure)
      - [Transport security (TLS)](#transport-security-tls)
      - [Email in production](#email-in-production)
      - [Continuous deployment](#continuous-deployment)

## Phase 0 — Feature Definition

### Core features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Customer management** | Full CRUD for customers: name, DNI, contact details, full address. |
| 2 | **Product & supplier management** | Manage the product catalogue with prices and link each product to a supplier. Full CRUD for both entities from a single screen. |
| 3 | **Delivery note (albarán) lifecycle** | Create orders with one or more line items, assign them to new or existing customers and track their progress through a five-step state machine: `FIANZA → ALMACEN → RUTA → ENTREGADO → INCIDENCIA`. |
| 4 | **Financial movements ledger** | Record and list income and expense movements. Movements are generated automatically when a deposit is collected and when an order is delivered. |
| 5 | **Dashboard** | Overview page with key business KPIs and an interactive revenue and orders chart. |
| 6 | **Email notification** | An HTML email with a PDF attachment of the delivery note is sent to the customer automatically in the background when an order is created. |

### Advanced features

| # | Feature | Description |
|---|---------|-------------|
| 7 | **Analytics engine** | Computable metrics: daily/weekly revenue, order count, average basket size, top products by revenue, period-over-period comparison. |
| 8 | **RFM segmentation** | Customers are automatically classified into segments (Champions, Loyal, Need Attention, At Risk, Lost) using a Recency-Frequency-Monetary model. |
| 9 | **Basket pair analysis** | Market basket analysis that surfaces product pairs frequently purchased together, allowing cross-sell insights. |
| 10 | **AI assistant (Groq / Llama-3)** | A natural-language chat interface backed by a large language model. The LLM is injected with live business metrics and can answer questions and generate charts from plain-text questions. |
| 11 | **Transport / logistics module** | Assign delivery notes to numbered trucks, view per-truck manifests, liquidate routes (registers a 7 % transport cost as an expense), and download a PDF route invoice. |
| 12 | **Stripe payment collection** | Generate a Stripe Checkout Session for any amount, redirect the customer, and confirm the payment server-side. Confirmed payments are automatically recorded as income movements. |
| 13 | **PDF generation** | ReportLab-powered PDF exports: delivery note, route invoice and analytics trends report. |
| 14 | **Personalisation & dark mode** | Full theming system: 6 colour palettes selectable at runtime (Warm, Slate, Forest, Rose, Ocean, Lavender), dark / light mode toggle (persisted in `localStorage`), store name and logo (up to 4 MB, displayed prominently in the sidebar) configurable from the UI. |
| 15 | **Weekly AI business summary** | APScheduler `BackgroundScheduler` fires every minute; each tick compares the current time (Europe/Madrid) against the configurable `resumen_hora_envio` setting. When the time matches and the configured interval has elapsed, it calls Groq/Llama-3 with a live snapshot of the business metrics and emails the summary to a configurable address. |
| 16 | **User profile & store settings** | `GET/PUT /api/auth/me` — update own password. `GET/PUT /api/config` — read and write the key-value `configuracion` table (store name, logo URL, email signature, weekly summary recipient and interval). |
| 17 | **Internationalisation (i18n) & ARIA accessibility** | Full ES/EN interface translation via **i18next** + `react-i18next`; language detected from `localStorage` (`fg-lang` key) with Spanish fallback. All primary components (`Sidebar`, `LoginPage`, `PersonalizacionPage`) use `useTranslation()`. WCAG 2.1 AA ARIA improvements: `aria-current="page"` on active nav links, `aria-hidden` on decorative icons, `htmlFor`/`id` pairing on form inputs, `role="switch"` + `aria-checked` on the dark-mode toggle, `role="radiogroup"`/`role="radio"` on palette and language selectors. Language can be changed at runtime from the Personalisation page. |
| 18 | **Incidents (incidencias)** | Track delivery issues by promoting a delivered albaran from `ENTREGADO` to `INCIDENCIA`. Each incident stores a free-text problem description and references the original delivery note. Incidents are visible on the Dashboard (stat card + recent table) and managed from a dedicated `/incidencias` page with list, search, create modal and delete. Deleting an incident automatically reverts the albaran back to `ENTREGADO`. |

---

### Entities

FurniGest manages **11 entities** stored in a PostgreSQL database:

```
CustomerDB ──< DeliveryNoteDB ──< DeliveryNoteLineDB >── ProductDB >── SupplierDB
                        │
                        ├──< DeliveryNoteRouteDB (truck_id)
                        └──< IncidenciaDB
MovementDB   (standalone — created automatically by business rules)
StripeCheckoutDB (idempotency record for Stripe sessions)
```

> **Note on naming convention:** All Python/SQLAlchemy ORM class names and field names use English identifiers (e.g. `CustomerDB`, `customer.name`, `delivery_note.date`). The underlying PostgreSQL table and column names remain in Spanish (`clientes`, `nombre`, `fecha`) to avoid database migrations. SQLAlchemy column aliases map between the two: `name = Column('nombre', String)`.

| Python class | Table | Key relationships |
|--------|-------|-------------------|
| `CustomerDB` | `clientes` | Has many `DeliveryNoteDB` |
| `SupplierDB` | `proveedores` | Has many `ProductDB` |
| `ProductDB` | `productos` | Belongs to `SupplierDB`; referenced from `DeliveryNoteLineDB` |
| `DeliveryNoteDB` | `albaranes` | Belongs to `CustomerDB`; has many `DeliveryNoteLineDB`; optionally in `DeliveryNoteRouteDB` |
| `DeliveryNoteLineDB` | `lineas_albaran` | Join between `DeliveryNoteDB` and `ProductDB` (quantity + unit price) |
| `MovementDB` | `movimientos` | Standalone income/expense record; auto-created by business logic |
| `DeliveryNoteRouteDB` | `albaran_rutas` | Maps one `DeliveryNoteDB` to a truck (`truck_id`) |
| `StripeCheckoutDB` | `stripe_checkouts` | Audit record per Stripe Checkout Session (prevents duplicate payments) |
| `IncidenciaDB` | `incidencias` | Incident report referencing one `DeliveryNoteDB`; triggers the `INCIDENCIA` status transition |
| `UserDB` | `usuarios` | Staff account with hashed password for JWT authentication |
| `ConfigDB` | `configuracion` | Key-value store for application settings (store name, logo, email signature, scheduler config) |

---

### User types & permissions

> **Design note:** FurniGest is an internal tool used exclusively by store staff. Authentication is enforced via **JWT tokens** — all API endpoints require a valid `Authorization: Bearer <token>` header. The login page is available at `/login`; a default `admin` account is created by `seed.py` on first run.

The three canonical user types from the template map as follows:

| Type | Implementation |
|------|---------------|
| **Anonymous user** | Not applicable — the app is not intended for public access. |
| **Registered user** | Not applicable — no user accounts exist in the system. |
| **Administrator** | All users are implicitly administrators. The only actor is a trusted store employee with full read/write access to every entity. |

Every entity in the system is owned by the store itself, not by individual users.

#### User personas

Following the **User-Centred Design (UCD)** methodology, three user personas were identified to represent the distinct actors of the system:

| Persona | Description | Key needs |
|---------|-------------|----------|
| **Store manager** | Oversees the business, reviews sales, analyses trends and makes strategic decisions. Daily use on a desktop computer. | Consolidated view of income and expenses; analytics and RFM customer segmentation; AI assistant for business queries. |
| **Sales assistant** | Serves customers in-store, creates new orders and updates albaran states. Frequent use throughout the working day. | Fast order creation; quick customer and product search; state updates without technical knowledge. |
| **Delivery driver** | Picks up assigned routes, manages deliveries and records route liquidation. Occasional use via the transport module. | Per-truck load manifest; in-route albaran state changes; download of route liquidation PDF. |

---

### Charts

All charts are rendered with **Chart.js** via `react-chartjs-2` on the *Tendencias* (Trends) page and the *Dashboard*.

| Chart | Type | Data |
|-------|------|------|
| Revenue over time | **Line** | Daily or weekly aggregated `Albaran.total`, filterable by date range |
| Orders over time | **Line** | Daily order count for the selected date range |
| Top products | **Bar** | Top 10 products by total revenue in the selected period |
| Period comparison | **Bar** (grouped) | Current period vs. previous period — revenue, order count, average basket, new customers |
| Order status distribution | **Pie** | Count of orders per state (FIANZA / ALMACEN / RUTA / ENTREGADO / INCIDENCIA) on the Dashboard |

---

### Complementary technology

| Technology | Purpose |
|------------|---------|
| **Email — SMTP (Gmail)** | Sends an HTML email with a PDF delivery note to the customer whenever a new order is created. Sent as a FastAPI `BackgroundTask` so it never blocks the HTTP response. |
| **PDF generation — ReportLab** | Generates three types of PDF: the customer delivery note, the truck route invoice, and the analytics trends report. |
| **Stripe Payments API** | Accepts card payments through Stripe Checkout. The backend creates a session, the customer is redirected to Stripe's hosted page, and on return the backend verifies and records the payment. |
| **Groq LLM API (Llama-3)** | Powers the AI assistant on the Tendencias page. The model receives a compact JSON payload of live business metrics and responds with analysis and chart suggestions in natural language. |

---

### Advanced algorithm

**RFM customer segmentation + market basket analysis**

Two independent analytical models run on the historical order data:

1. **RFM segmentation** (`analytics.rfm_segments`):  
   Each customer is scored on three dimensions computed from `albaranes`:
   - **Recency** — days since last order (lower is better)
   - **Frequency** — total number of orders
   - **Monetary** — total lifetime spend  
   
   Scores are bucketed into quintiles and combined into a segment label: *Champions*, *Loyal Customers*, *Potential Loyalists*, *Need Attention*, *At Risk*, *Lost*. The segment summary is shown on the Tendencias page and is also injected into the LLM context.

2. **Basket pair analysis** (`analytics.basket_pairs`):  
   For each pair of products that appear together in the same order, the algorithm counts co-occurrences. Pairs with at least `min_support` appearances are returned ordered by frequency, giving actionable cross-sell information.

Both algorithms run entirely in Python/SQLAlchemy on request — no pre-computation or background jobs required.

3. **Predictive analytics — Holt's double exponential smoothing** (`analytics.predict`):
   Monthly revenue is aggregated from daily albaran data and fed into Holt's double exponential smoothing (equivalent to ARIMA(0,1,1)+drift). The model maintains a level $L_t$ and a trend $T_t$, updated with smoothing parameters $\alpha=0.3$ and $\beta=0.1$. The forecast for $h$ months ahead is $\hat{y}_{t+h} = L_t + h \cdot T_t$, with 80% prediction intervals of $\pm 1.28\,\hat{\sigma}\sqrt{h}$ based on in-sample RMSE. Implementation is in plain Python (`math` stdlib, no scipy/statsmodels needed).

   - **Endpoint**: `GET /api/analytics/predict?date_from&date_to&n_months=3` — returns historical months + n-step ahead forecast with confidence intervals
   - **Tendencias page**: combined line chart (historical solid blue + forecast dashed green) and a table with month, estimated revenue, and 80% interval
   - **Weekly email**: next-month revenue estimate appended in a green block
   - **PDF export**: prediction table included in the trends PDF report

---

## Phase 1 — Implementation

### Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend language | Python | 3.12 |
| Backend framework | FastAPI | 0.115 |
| ORM | SQLAlchemy | 2.x |
| Data validation | Pydantic | v2 |
| Database | PostgreSQL | 16 |
| Task runner | Uvicorn | — |
| HTTP client (internal) | httpx | 0.28 |
| PDF generation | ReportLab | 4.x |
| LLM client | Groq API (Llama-3) | — |
| Payments | Stripe Python SDK | 14.3 |
| Frontend framework | React | 19 |
| Build tool | Vite | 6 |
| Routing | React Router DOM | 7 |
| Styling | TailwindCSS | 4 |
| Charts | Chart.js + react-chartjs-2 | 4.x |
| Toast notifications | sileo | 0.1.4 |

---

### Architecture decisions

Every technology choice was made deliberately rather than by default. This section explains the *why* behind each tool.

#### Backend

| Decision | Chosen | Alternatives considered | Reason |
|----------|--------|------------------------|--------|
| **Framework** | FastAPI 0.115 | Django REST, Flask | FastAPI is natively async (ASGI), generates OpenAPI docs automatically from type hints, and integrates with Pydantic out of the box. Django's ORM and admin were unnecessary overhead for an API-only backend; Flask requires too much manual wiring. |
| **ORM** | SQLAlchemy 2.x | raw psycopg2, Django ORM, Tortoise | SQLAlchemy's declarative mapping, `relationship()` cascade, and `selectinload()` eliminate N+1 queries. The `get_db()` dependency injected via `Depends()` gives per-request session scoping without sharing state. Raw psycopg2 would require hand-writing every JOIN. |
| **Validation** | Pydantic v2 | marshmallow, dataclasses | Pydantic v2's `model_dump()` and `model_validate()` integrate directly with FastAPI's request/response cycle. `Literal["FIANZA","ALMACEN","RUTA","ENTREGADO"]` enforces the state machine at the HTTP boundary. `from_attributes=True` (`Config.orm_mode` in v1) lets schemas be constructed directly from ORM objects. |
| **Database** | PostgreSQL 16 | SQLite, MySQL | PostgreSQL supports concurrent writes, native `JSON`/`JSONB` columns, full-text search and proper foreign-key enforcement. SQLite would have caused write-lock issues under Uvicorn's async workers. Under the **CAP theorem** (Brewer, 2000) PostgreSQL is a **CP** system: it prioritises consistency and partition tolerance over availability. For an internal management tool, data integrity is more important than availability during rare network partitions. |
| **ASGI server** | Uvicorn | Gunicorn, Hypercorn | Uvicorn is the de-facto standard ASGI server for FastAPI. `--reload` mode for development re-evaluates the module graph on every file save. |
| **Background tasks** | FastAPI `BackgroundTasks` | Celery, RQ | Email sending is the only long-running task. FastAPI's built-in `BackgroundTasks` runs the task in the same process after the HTTP response is returned, zero-infrastructure solution. Celery would require Redis and a separate worker process. |
| **LLM provider** | Groq (Llama-3.1-8b-instant) | OpenAI GPT-4o, Ollama | Groq's inference hardware gives sub-second latency for `llama-3.1-8b-instant` at zero cost during development. The API is OpenAI-compatible so the `openai` Python client is used without modification. A smaller 8B model is sufficient because the prompt injects structured JSON metrics — the model is doing reasoning, not knowledge retrieval. |
| **PDF generation** | ReportLab 4.x | WeasyPrint, Puppeteer | ReportLab generates PDFs entirely in-process with no browser dependency. Three separate builders (`albaran_pdf.py`, `tendencias_pdf.py`) use `SimpleDocTemplate`, `Paragraph`, and `Table` primitives for pixel-accurate layout. |
| **Email transport** | smtplib + email.mime / Resend HTTP API | SendGrid API, Mailgun | In local development, `smtplib` sends via Gmail SMTP port 587 with STARTTLS — no extra dependency. In production (Railway), outbound SMTP is blocked by the cloud provider; the emailer automatically switches to **Resend** (HTTP API over port 443, never blocked) when `RESEND_API_KEY` is present. The `MIMEMultipart("alternative")` structure is reused for SMTP; Resend receives the HTML body and PDF attachment as base64. |
| **Payments** | Stripe Checkout (server-side) | PayPal, Redsys | Stripe's hosted Checkout page offloads PCI compliance. The server creates a `Session` with `payment_method_types=["card"]`, redirects the browser, then calls `Session.retrieve()` to verify `payment_status == "paid"` before recording the movement. |

#### Frontend

| Decision | Chosen | Alternatives considered | Reason |
|----------|--------|------------------------|--------|
| **UI framework** | React 19 | Vue 3, Angular, Svelte | React's ecosystem (react-chartjs-2, react-router-dom) covers every requirement. Hooks (`useState`, `useEffect`) provide clean local state without a global store. |
| **Build tool** | Vite 6 | Create React App, Webpack | Vite uses native ES modules in development meaning HMR updates in under 50 ms. CRA is officially unmaintained. Webpack's config overhead is unjustified for a single-team project. |
| **Styling** | TailwindCSS 4 | CSS Modules, Styled Components, Bootstrap | Utility-first CSS eliminates context switching between files. TailwindCSS v4's new CSS-native config (`@theme`) removed the `tailwind.config.js` file entirely. Zero runtime overhead — all CSS is generated at build time. |
| **Charts** | Chart.js 4 + react-chartjs-2 | Recharts, D3.js, ApexCharts | Chart.js is battle-tested and renders on `<canvas>` for performance. `react-chartjs-2` provides React component wrappers (`<Line>`, `<Bar>`, `<Pie>`). Registering only the required components with `Chart.register(...)` keeps the bundle size small. |
| **Toast notifications** | sileo 0.1.4 | react-toastify, sonner | sileo is minimal and tree-shakeable. The key API methods used are: `sileo.promise(promise, {loading, success, error})` for async operations, `sileo.success()`, `sileo.error()`, and `sileo.warning()`. A single `<Toaster>` instance in `main.jsx` with `fill: '#171717'` provides the dark style used throughout. |
| **Routing** | React Router DOM 7 | TanStack Router, Wouter | React Router v7's `createBrowserRouter` + `<Outlet>` pattern mounts the persistent `App.jsx` shell (sidebar) once and swaps only the content area on navigation. |

---

### Project structure

```
TFG/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app, lifespan, CORS, router registration
│       ├── database.py          # SQLAlchemy engine, SessionLocal, get_db()
│       ├── seed.py              # Demo data (runs once on first startup)
│       ├── stripe_settings.py   # Stripe configuration loader
│       ├── settings_email.py    # SMTP configuration
│       ├── ia_settings.py       # Groq API configuration
│       ├── api/                 # Route handlers — thin HTTP layer (one file per domain)
│       │   ├── auth.py          # JWT login, me GET/PUT
│       │   ├── clientes.py
│       │   ├── productos.py
│       │   ├── proveedores.py
│       │   ├── albaranes.py
│       │   ├── movimientos.py
│       │   ├── transportes.py
│       │   ├── analytics.py
│       │   ├── ai.py
│       │   ├── bank.py
│       │   ├── configuracion.py # Key-value store GET/PUT
│       │   └── stripe_payments.py
│       ├── services/            # Business logic layer (Option B)
│       │   ├── clientes_service.py
│       │   ├── productos_service.py
│       │   └── movimientos_service.py
│       ├── entidades/           # SQLAlchemy ORM models (English attrs) + Pydantic schemas
│       │   ├── cliente.py       # CustomerDB  + Customer / CustomerCreate
│       │   ├── producto.py      # ProductDB   + Product / ProductCreate
│       │   ├── proveedor.py     # SupplierDB  + Supplier / SupplierCreate
│       │   ├── albaran.py       # DeliveryNoteDB + DeliveryNote / DeliveryNoteCreate
│       │   ├── linea_albaran.py # DeliveryNoteLineDB + DeliveryNoteLine
│       │   ├── movimiento.py    # MovementDB  + Movement / MovementCreate
│       │   ├── albaran_ruta.py  # DeliveryNoteRouteDB
│       │   ├── stripe_checkout.py # StripeCheckoutDB
│       │   ├── incidencia.py    # IncidenciaDB + Incidencia schema
│       │   ├── usuario.py       # UserDB (staff accounts, hashed passwords)
│       │   └── configuracion.py # ConfigDB (key-value store)
│       └── utils/
│           ├── albaran_pdf.py   # generate_delivery_note_pdf()
│           ├── tendencias_pdf.py# Analytics PDF builder
│           ├── emailer.py       # SMTP mail sender
│           ├── groq_llm.py      # Groq API wrapper (groq_chat)
│           ├── jwt_utils.py     # JWT token creation helper
│           ├── resumen_semanal.py# Weekly AI summary scheduler
│           └── templates.py     # Jinja2 HTML template renderer
└── frontend/
    └── src/
        ├── main.jsx             # App entry point, router, global Toaster
        ├── config.js            # Centralised API_URL constant
        ├── api/                 # API call functions (Option B)
        │   ├── http.js          # Base apiFetch / apiFetchBlob helpers
        │   ├── clientes.js
        │   ├── productos.js
        │   ├── movimientos.js
        │   ├── albaranes.js
        │   └── analytics.js
        ├── hooks/               # Reusable data hooks (Option B)
        │   ├── useClientes.js
        │   ├── useProductos.js
        │   └── useMovimientos.js
        ├── context/             # React context providers
        │   ├── ThemeContext.jsx  # Dark mode + palette (persisted in localStorage)
        │   └── ConfigContext.jsx # Store config from /api/config
        └── components/
            ├── App.jsx          # Shell with Sidebar + <Outlet>
            ├── Sidebar.jsx      # Navigation sidebar
            ├── LoginPage.jsx    # JWT login form
            ├── Dashboard.jsx    # KPIs + charts overview
            ├── NuevaVenta.jsx   # New order wizard
            ├── ClientesPage.jsx # Customer management
            ├── AlbaranesPage.jsx# Delivery note management
            ├── ProductosPage.jsx# Products + suppliers CRUD
            ├── MovimientosPage.jsx # Financial ledger
            ├── Tendencias.jsx   # Analytics, AI assistant, PDF export
            ├── TransportePage.jsx  # Logistics / transport module
            ├── BancoPage.jsx    # Stripe payments panel
            ├── IncidenciasPage.jsx # Incident management
            ├── PerfilPage.jsx   # Change username / password
            └── PersonalizacionPage.jsx # Theme, palette, store identity
```

---

### Configuration reference

FurniGest uses plain Python constant files instead of a `.env` loader. Edit these files before starting the backend.

> **Quick reference:** A fully annotated template for all variables is provided in [`.env.example`](.env.example) at the repository root. Copy the variable names from there and paste the values into the corresponding Python config files described below. When running the application via Docker Compose, the config files are mounted as read-only volumes from the host — see [Config-file volume strategy](#config-file-volume-strategy).

#### `backend/app/auth_config.py` — JWT Authentication

```python
import os
JWT_SECRET_KEY     = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production")
JWT_ALGORITHM      = "HS256"
JWT_EXPIRE_MINUTES = 60
```

All API endpoints require a valid JWT token in the `Authorization: Bearer <token>` header. Obtain a token by calling `POST /api/auth/login` with `username` and `password` form fields.

The frontend login page is available at `/login`. On first run, `seed.py` automatically creates a default admin account:

| Field    | Value      |
| -------- | ---------- |
| Username | `admin`    |
| Password | `admin123` |

> **Security note:** Change the default `admin123` password and set `JWT_SECRET_KEY` to a long random string in production (e.g. `openssl rand -hex 32`). The default value is only safe for local development.

#### `backend/app/stripe_settings.py` — Payments

```python
STRIPE_SECRET_KEY      = "sk_test_..."        # Secret key from Stripe Dashboard
STRIPE_PUBLISHABLE_KEY = "pk_test_..."        # Publishable key (returned to frontend via /api/stripe/status)
STRIPE_SUCCESS_URL     = "http://localhost:5173/banco?stripe=success&session_id={CHECKOUT_SESSION_ID}"
STRIPE_CANCEL_URL      = "http://localhost:5173/banco?stripe=cancel"
STRIPE_CURRENCY        = "eur"               # ISO 4217 lowercase
```

> The publishable key is exposed to the browser intentionally — Stripe requires it to initialise `Stripe.js`. The secret key never leaves the server.

#### `backend/app/ia_settings.py` — AI / LLM

```python
GROQ_API_KEY   = "gsk_..."                            # Groq Console API key
GROQ_MODEL     = "llama-3.1-8b-instant"               # Model identifier on Groq's fleet
GROQ_BASE_URL  = "https://api.groq.com/openai/v1"     # OpenAI-compatible endpoint
REQUEST_TIMEOUT = 60                                  # HTTP timeout in seconds
```

> `llama-3.1-8b-instant` was chosen over larger models because the prompt injects structured JSON metrics — the model reasons over numbers, not free-form documents. The 8B parameter model is fast enough for interactive use (~200 ms on Groq's hardware).

#### `backend/app/settings_email.py` — SMTP / Email

```python
EMAIL_HOST        = "smtp.gmail.com"
EMAIL_PORT        = 587                   # STARTTLS port
EMAIL_USER        = "your@gmail.com"      # Sending account
EMAIL_PASSWORD    = "xxxx xxxx xxxx xxxx" # Gmail App Password (not the account password)
EMAIL_FROM        = "your@gmail.com"      # Envelope From address
EMAIL_SENDER_NAME = "FurniGest"           # Display name in email client

# Resend (production — bypasses Railway's SMTP block)
RESEND_API_KEY = "re_..."                 # API key from resend.com
RESEND_FROM    = "you@yourdomain.com"     # Must be a verified sender in Resend
```

> **Local development:** Gmail SMTP is used automatically when `RESEND_API_KEY` is empty. Requires a 16-character **App Password** from *Google Account → Security → 2-Step Verification → App passwords*.

> **Production (Railway):** Railway's free tier blocks outbound SMTP connections. Set `RESEND_API_KEY` in Railway's environment variables and the emailer switches to Resend's HTTP API automatically. Sign up at [resend.com](https://resend.com) — the free tier allows 100 emails/day. Set `RESEND_FROM` to an address on a [verified domain](https://resend.com/docs/dashboard/domains/introduction) in your Resend account.

#### `backend/app/database.py` — Database connection

```python
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:root@localhost:5432/TFG"
)
```

The connection string is read from the `DATABASE_URL` **environment variable** first. If the variable is absent (local development), the hardcoded `localhost` fallback is used. Docker Compose injects `DATABASE_URL=postgresql://postgres:root@db:5432/TFG` so the backend container can reach the `db` service by its internal hostname.

Change `postgres:root` and `TFG` in the fallback to match your local PostgreSQL installation. SQLAlchemy creates all tables automatically on first startup via `Base.metadata.create_all(engine)`.

---

### Backend — REST API

The API is served at `http://localhost:8000`. All domain endpoints are prefixed with `/api`. Communication uses **HTTP/1.1** (RFC 2616) as the application-layer protocol, transported over **TLS** (HTTPS) in production — Railway automatically provisions and terminates TLS so every request from the browser reaches the backend over an encrypted channel.

#### Customers — `/api/clientes`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/clientes/get` | List all customers |
| `GET` | `/api/clientes/get/{id}` | Get one customer |
| `POST` | `/api/clientes/post` | Create customer |
| `PUT` | `/api/clientes/put/{id}` | Update customer |
| `DELETE` | `/api/clientes/delete/{id}` | Delete customer |

#### Products — `/api/productos`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/productos/get` | List all products (with supplier) |
| `GET` | `/api/productos/get/{id}` | Get one product |
| `GET` | `/api/productos/search` | Search products by name |
| `POST` | `/api/productos/post` | Create product |
| `PUT` | `/api/productos/put/{id}` | Update product |
| `DELETE` | `/api/productos/delete/{id}` | Delete product |

#### Suppliers — `/api/proveedores`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/proveedores/get` | List all suppliers |
| `GET` | `/api/proveedores/get/{id}` | Get one supplier |
| `POST` | `/api/proveedores/post` | Create supplier |
| `PUT` | `/api/proveedores/put/{id}` | Update supplier |
| `DELETE` | `/api/proveedores/delete/{id}` | Delete supplier |

#### Delivery notes — `/api/albaranes`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/albaranes/post` | Create full order (client + lines + deposit movement + email) |
| `GET` | `/api/albaranes/get` | List all delivery notes |
| `GET` | `/api/albaranes/get/{id}` | Get one delivery note |
| `GET` | `/api/albaranes/by-cliente/{id}` | All orders for a customer |
| `PUT` | `/api/albaranes/put/{id}` | Update editable fields (date, description, status) |
| `PUT` | `/api/albaranes/{id}/items` | Update delivery note line items |
| `PATCH` | `/api/albaranes/{id}/estado` | Advance state to `ENTREGADO` (auto-registers pending payment) |
| `GET` | `/api/albaranes/{id}/pdf` | Download delivery note as PDF |

#### Financial movements — `/api/movimientos`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/movimientos/get` | List movements (optional `tipo` filter) |
| `GET` | `/api/movimientos/get/{id}` | Get one movement |
| `POST` | `/api/movimientos/post` | Manually register a movement |
| `PUT` | `/api/movimientos/put/{id}` | Update a movement |
| `DELETE` | `/api/movimientos/delete/{id}` | Delete a movement |

#### Transport — `/api/transporte`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/transporte/almacen` | Delivery notes in `ALMACEN` state |
| `GET` | `/api/transporte/ruta` | Delivery notes in `RUTA` state |
| `GET` | `/api/transporte/rutas` | All `RUTA` orders grouped by truck |
| `POST` | `/api/transporte/ruta/asignar` | Assign orders to a truck |
| `POST` | `/api/transporte/ruta/quitar` | Remove orders from a truck (back to ALMACEN) |
| `POST` | `/api/transporte/ruta/pendiente` | Mark orders as RUTA without truck assignment |
| `POST` | `/api/transporte/ruta/{id}/liquidar` | Liquidate truck route (records 7 % transport cost, generates PDF invoice) |

#### Analytics — `/api/analytics`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/summary` | Full metrics bundle (sales, top products, RFM, basket pairs) |
| `GET` | `/api/analytics/compare` | Period-over-period comparison |
| `GET` | `/api/analytics/predict` | Revenue forecast with Holt's exponential smoothing |
| `GET` | `/api/analytics/export/pdf` | Download analytics PDF report |

#### AI assistant — `/api/ai`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/ask` | One-shot question with auto-injected metrics |
| `POST` | `/api/ai/chat` | Multi-turn conversation (general or analytics mode) |

#### Stripe — `/api/stripe`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stripe/status` | Returns Stripe configuration status and currency |
| `POST` | `/api/stripe/checkout` | Creates a Stripe Checkout Session |
| `POST` | `/api/stripe/confirm` | Verifies payment and records income movement |
| `GET` | `/api/stripe/checkouts` | Lists confirmed payment records |

#### Incidents — `/api/incidencias`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/incidencias/get` | List all incidents (newest first) |
| `GET` | `/api/incidencias/get/{id}` | Get one incident by ID |
| `POST` | `/api/incidencias/post` | Create incident — requires albaran in `ENTREGADO` state; sets it to `INCIDENCIA` |
| `DELETE` | `/api/incidencias/{id}` | Delete incident and restore albaran to `ENTREGADO` |

#### Health — `/health`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Railway / Docker healthcheck probe — returns `{"status": "ok"}` |

#### Authentication — `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Obtain a JWT token (`username` + `password` form fields) |
| `GET` | `/api/auth/me` | Return the current user's profile |
| `PUT` | `/api/auth/me` | Update own password |

#### Store configuration — `/api/config`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Return all key-value settings from the `configuracion` table |
| `PUT` | `/api/config/{key}` | Update a single configuration key |

---

### Frontend — React SPA

The frontend is a single-page application built with **React 19 + Vite 6**. Navigation is handled by **React Router 7** with a persistent sidebar layout (`App.jsx` + `Sidebar.jsx`).

A single global `<Toaster>` instance (defined in `main.jsx`) provides all toast notifications with a dark background (`fill: '#171717'`).

The centralised API base URL is exported from `src/config.js`:

```js
export const BASE_URL = 'http://localhost:8000';
export const API_URL  = `${BASE_URL}/api/`;
```

#### Navigation

```
/                  → Dashboard           (KPIs, revenue chart, status pie)
/ventas/nueva      → NuevaVenta          (new order wizard)
/clientes          → ClientesPage        (customer list, order history, edit modal)
/albaranes         → AlbaranesPage       (delivery note list, state control, edit modal)
/productos         → ProductosPage       (products + suppliers)
/movimientos       → MovimientosPage     (financial ledger)
/tendencias        → Tendencias          (analytics, AI chat, PDF export)
/transporte        → TransportePage      (logistics, truck management)
/banco             → BancoPage           (Stripe payments)
/perfil            → PerfilPage          (change own password)
/personalizacion   → PersonalizacionPage (dark mode, palettes, store branding, weekly summary)
```

---

### Technical flows

#### 1 — Delivery note lifecycle (Albaran state machine)

An `Albaran` moves through four states. Each transition has side-effects enforced in the backend.

```
POST /api/albaranes/post
        │
        ▼
  ┌─────────┐    PATCH /albaranes/{id}/estado    ┌──────────┐
  │ FIANZA  │ ──────────────────────────────────▶ │ ALMACEN  │
  └─────────┘    (manual — staff confirms         └──────────┘
  Auto-creates:  payment received)                      │
  Movimiento                                   PATCH /albaranes/{id}/estado
  tipo=INGRESO                                 (staff loads truck)
  concepto="Fianza albaran #{id}"                        │
                                                         ▼
                                               ┌──────────────────┐
                                               │  RUTA  (camion)  │
                                               └──────────────────┘
                                               POST /transporte/ruta/asignar
                                               assigns camion_id in albaran_rutas
                                                         │
                                               POST /transporte/ruta/{id}/liquidar
                                               Records 7% transport cost (EGRESO)
                                                         │
                                               PATCH /albaranes/{id}/estado
                                               (delivery confirmed)
                                                         ▼
                                               ┌──────────────────┐
                                               │   ENTREGADO      │
                                               └──────────────────┘
                                               Auto-creates:
                                               Movimiento tipo=INGRESO
                                               concepto="Pendiente albaran #{id}"
                                               cantidad = total - fianza
                                                         │
                                               POST /api/incidencias/post
                                               (staff reports delivery issue)
                                                         ▼
                                               ┌──────────────────────┐
                                               │   INCIDENCIA         │
                                               └──────────────────────┘
                                               Creates IncidenciaDB record
                                               with free-text descripcion.
                                               DELETE /api/incidencias/{id}
                                               reverts albaran → ENTREGADO
```

The `POST /api/albaranes/post` handler also enqueues a `BackgroundTask` that:
1. Builds a PDF of the delivery note with ReportLab (`albaran_pdf.py`)
2. Constructs a `MIMEMultipart("alternative")` email with an HTML body (`albaran_email.html`) and the PDF as an attachment
3. Connects to the SMTP server over STARTTLS port 587 and sends the message

Because it runs as a `BackgroundTask`, the HTTP response (201 Created) is returned to the client immediately — the email is sent asynchronously without blocking.

---

#### 2 — Stripe payment flow

```
Frontend (BancoPage)
    │
    │  POST /api/stripe/checkout  { amount, description }
    ▼
Backend
    │  stripe.checkout.Session.create(
    │    payment_method_types=["card"],
    │    line_items=[{ price_data: { unit_amount: amount*100, currency: "eur" }, quantity: 1 }],
    │    mode="payment",
    │    success_url=STRIPE_SUCCESS_URL,
    │    cancel_url=STRIPE_CANCEL_URL
    │  )
    │  Returns { session_id, checkout_url }
    ▼
Frontend redirects browser to checkout_url (Stripe-hosted HTTPS page)
    │
    │  Customer enters card → Stripe processes payment
    ▼
Stripe redirects back to STRIPE_SUCCESS_URL  (→ /banco?stripe=success&session_id=...)
    │
    │  Frontend detects ?stripe=success in URL
    │  POST /api/stripe/confirm  { session_id }
    ▼
Backend
    │  stripe.checkout.Session.retrieve(session_id)
    │  Checks payment_status == "paid"
    │  Writes StripeCheckout row (idempotency guard)
    │  Creates Movimiento tipo=INGRESO, concepto=description, cantidad=amount
    │  Returns { ok: true }
    ▼
Frontend shows success toast; refreshes movement list
```

The idempotency guard (`StripeCheckout` table keyed on `session_id`) prevents double-recording if the user refreshes the success page.

---

#### 3 — Email + PDF delivery flow

```
POST /api/albaranes/post  (creates albaran in DB)
    │
    └─→  background_task(send_albaran_email, db, albaran_id)
              │
              ├─ build_albaran_pdf(albaran)   ← ReportLab
              │    Returns BytesIO buffer
              │
              ├─ render HTML body from albaran_email.html (Jinja2)
              │
              ├─ if RESEND_API_KEY is set?  ──────────────────────────────┐
              │                                                            │
              │  NO — SMTP path (local / Docker)          YES — Resend path (Railway / production)
              │                                                            │
              ├─ msg = MIMEMultipart("mixed")              resend.Emails.send({
              │    ├─ MIMEMultipart("alternative")           "from": RESEND_FROM,
              │    │    ├─ MIMEText(plain_text, "plain")     "to":   [client.email],
              │    │    └─ MIMEText(html_body,  "html")      "html": html_body,
              │    └─ MIMEApplication(pdf_bytes, "pdf")      "attachments": [{
              │         filename="albaran_{id}.pdf"            "filename": "albaran_{id}.pdf",
              │                                               "content":  base64(pdf_bytes)
              └─ smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)       }]
                   smtp.starttls()                         })
                   smtp.login(EMAIL_USER, EMAIL_PASSWORD)
                   smtp.sendmail(EMAIL_FROM, client.email, msg)
```

> Railway's networking layer blocks outbound SMTP (ports 587/465). `send_email_with_pdf()` detects the environment at call time — if `RESEND_API_KEY` is a non-empty string it calls `_send_via_resend()`, otherwise `_send_via_smtp()`. No code change or restart needed when switching between local and cloud.

---

### Database diagram

```
┌──────────────┐       ┌──────────────────────┐       ┌──────────────┐
│  CustomerDB  │       │    DeliveryNoteDB     │       │  ProductDB   │
│  (clientes)  │       │    (albaranes)        │       │  (productos) │
│──────────────│       │──────────────────────│       │──────────────│
│ id (PK)      │──1──< │ id (PK)              │       │ id (PK)      │
│ name         │       │ customer_id (FK)      │       │ name         │
│ surnames     │       │ date                  │       │ description  │
│ dni          │       │ description           │       │ price        │
│ email        │       │ total                 │  ┌──> │ supplier_id  │
│ phone1       │       │ status                │  │    └──────────────┘
│ phone2       │       └──────────────────────┘  │           │
│ street       │                  │              │    ┌──────────────┐
│ street_num   │                  │ 1:N          │    │  SupplierDB  │
│ floor        │                  ▼              │    │ (proveedores)│
│ city         │    ┌──────────────────────┐     │    │──────────────│
│ post_code    │    │  DeliveryNoteLineDB  │     │    │ id (PK)      │
└──────────────┘    │  (lineas_albaran)    │     │    │ name         │
                    │──────────────────────│     │    │ contact      │
                    │ id (PK)              │     │    └──────────────┘
                    │ delivery_note_id(FK) │     │
                    │ product_id (FK)      │─────┘
                    │ quantity             │
                    │ unit_price           │
                    └──────────────────────┘
                                  │
                    ┌──────────────────────┐
                    │ DeliveryNoteRouteDB  │
                    │  (albaran_rutas)     │
                    │──────────────────────│
                    │ id (PK)              │
                    │ delivery_note_id(FK) │
                    │ truck_id             │
                    └──────────────────────┘

┌──────────────────┐    ┌──────────────────┐
│   MovementDB     │    │ StripeCheckoutDB │
│  (movimientos)   │    │(stripe_checkouts)│
│──────────────────│    │──────────────────│
│ id (PK)          │    │ id (PK)          │
│ date             │    │ session_id       │
│ description      │    │ payment_intent_id│
│ amount           │    │ amount           │
│ type (ING/EGR)   │    │ currency         │
└──────────────────┘    │ description      │
                        │ status           │
                        │ created_at       │
                        └──────────────────┘
```

> **Naming convention:** Python ORM attributes use English names (e.g. `movement.date`, `movement.description`, `movement.amount`, `movement.type`). The underlying PostgreSQL columns keep their original Spanish names (`fecha`, `concepto`, `cantidad`, `tipo`) via SQLAlchemy column aliasing: `date = Column('fecha', Date)`. This avoids database migrations while keeping all Python/API code in English.

#### Full SQL schema

All tables are created by SQLAlchemy's `Base.metadata.create_all(engine)` at startup. Column types are defined using SQLAlchemy's type system and map to the following PostgreSQL types.

> **Column alias convention:** Python ORM attribute names use English. The Spanish column name (actual PostgreSQL column name) is shown alongside. Example: `name = Column('nombre', String(100))`.

**`clientes` — `CustomerDB`**

| Python attr | DB column | SQLAlchemy type | PostgreSQL | Notes |
|-------------|-----------|----------------|-----------|-------|
| `id` | `id` | `Integer` | `SERIAL` | Primary key, auto-increment |
| `name` | `nombre` | `String(100)` | `VARCHAR(100)` | First name |
| `surnames` | `apellidos` | `String(150)` | `VARCHAR(150)` | Last name(s) |
| `dni` | `dni` | `String(20)` | `VARCHAR(20)` | National ID |
| `email` | `email` | `String(200)` | `VARCHAR(200)` | Contact email |
| `phone1` | `telefono1` | `String(20)` | `VARCHAR(20)` | Primary phone |
| `phone2` | `telefono2` | `String(20)` | `VARCHAR(20)` | Secondary phone (optional) |
| `street` | `calle` | `String(200)` | `VARCHAR(200)` | Street name |
| `street_number` | `numero_vivienda` | `String(10)` | `VARCHAR(10)` | Street number |
| `floor` | `piso_portal` | `String(50)` | `VARCHAR(50)` | Floor / entrance (optional) |
| `city` | `ciudad` | `String(100)` | `VARCHAR(100)` | City |
| `post_code` | `codigo_postal` | `String(10)` | `VARCHAR(10)` | Postcode |

**`proveedores` — `SupplierDB`**

| Python attr | DB column | SQLAlchemy type | PostgreSQL | Notes |
|-------------|-----------|----------------|-----------|-------|
| `id` | `id` | `Integer` | `SERIAL` | Primary key |
| `name` | `nombre` | `String(200)` | `VARCHAR(200)` | Supplier name |
| `contact` | `contacto` | `String(200)` | `VARCHAR(200)` | Contact person / phone |

**`productos` — `ProductDB`**

| Python attr | DB column | SQLAlchemy type | PostgreSQL | Notes |
|-------------|-----------|----------------|-----------|-------|
| `id` | `id` | `Integer` | `SERIAL` | Primary key |
| `name` | `nombre` | `String(200)` | `VARCHAR(200)` | Product name |
| `description` | `descripcion` | `Text` | `TEXT` | Long description |
| `price` | `precio` | `Float` | `DOUBLE PRECISION` | Unit price (€) |
| `supplier_id` | `proveedor_id` | `Integer (FK)` | `INTEGER` | → `proveedores.id` |

**`albaranes` — `DeliveryNoteDB`**

| Python attr | DB column | SQLAlchemy type | PostgreSQL | Notes |
|-------------|-----------|----------------|-----------|-------|
| `id` | `id` | `Integer` | `SERIAL` | Primary key |
| `customer_id` | `cliente_id` | `Integer (FK)` | `INTEGER` | → `clientes.id` |
| `date` | `fecha` | `DateTime` | `TIMESTAMP` | Creation timestamp |
| `description` | `descripcion` | `String(500)` | `VARCHAR(500)` | Order description |
| `total` | `total` | `Float` | `DOUBLE PRECISION` | Sum of line totals |
| `status` | `estado` | `String(20)` | `VARCHAR(20)` | `FIANZA` / `ALMACEN` / `RUTA` / `ENTREGADO` |

**`lineas_albaran` — `DeliveryNoteLineDB`**

| Python attr | DB column | SQLAlchemy type | PostgreSQL | Notes |
|-------------|-----------|----------------|-----------|-------|
| `id` | `id` | `Integer` | `SERIAL` | Primary key |
| `delivery_note_id` | `albaran_id` | `Integer (FK)` | `INTEGER` | → `albaranes.id` |
| `product_id` | `producto_id` | `Integer (FK)` | `INTEGER` | → `productos.id` |
| `quantity` | `cantidad` | `Integer` | `INTEGER` | Number of units |
| `unit_price` | `precio_unitario` | `Float` | `DOUBLE PRECISION` | Price at time of order |

**`movimientos` — `MovementDB`**

| Python attr | DB column | SQLAlchemy type | PostgreSQL | Notes |
|-------------|-----------|----------------|-----------|-------|
| `id` | `id` | `Integer` | `SERIAL` | Primary key |
| `date` | `fecha` | `DateTime` | `TIMESTAMP` | Movement timestamp |
| `description` | `concepto` | `String(500)` | `VARCHAR(500)` | Human-readable description |
| `amount` | `cantidad` | `Float` | `DOUBLE PRECISION` | Amount (€, always positive) |
| `type` | `tipo` | `String(10)` | `VARCHAR(10)` | `INGRESO` or `EGRESO` |

**`albaran_rutas` — `DeliveryNoteRouteDB`**

| Python attr | DB column | SQLAlchemy type | PostgreSQL | Notes |
|-------------|-----------|----------------|-----------|-------|
| `id` | `id` | `Integer` | `SERIAL` | Primary key |
| `delivery_note_id` | `albaran_id` | `Integer (FK)` | `INTEGER` | → `albaranes.id` (unique) |
| `truck_id` | `camion_id` | `Integer` | `INTEGER` | Truck number (1–N) |

**`stripe_checkouts`**

| Column | SQLAlchemy type | PostgreSQL | Notes |
|--------|----------------|-----------|-------|
| `id` | `Integer` | `SERIAL` | Primary key |
| `session_id` | `String(200)` | `VARCHAR(200)` | Stripe Session ID (`cs_...`) — unique |
| `payment_intent_id` | `String(200)` | `VARCHAR(200)` | Stripe PaymentIntent ID |
| `amount` | `Float` | `DOUBLE PRECISION` | Amount charged (€) |
| `currency` | `String(10)` | `VARCHAR(10)` | ISO 4217 code (`eur`) |
| `description` | `String(500)` | `VARCHAR(500)` | Payment description |
| `status` | `String(50)` | `VARCHAR(50)` | `paid` / `unpaid` / `no_payment_required` |
| `created_at` | `DateTime` | `TIMESTAMP` | Record creation timestamp |

> **Normalisation note:** The schema is in **Third Normal Form (3NF)** — every non-key attribute depends only on the primary key of its table. For example, supplier data is not duplicated in every product row but referenced via `supplier_id`; each delivery note line stores its own `unit_price` independently from the product's current catalogue price, preserving sales history.

---

### Component diagram

```
main.jsx
 └── <RouterProvider>
      └── App.jsx  (shell)
           ├── Sidebar.jsx  (navigation links)
           └── <Outlet>  (active page)
                ├── Dashboard.jsx
                │    └── Chart.js (Line + Pie)
                ├── NuevaVenta.jsx
                ├── ClientesPage.jsx
                ├── AlbaranesPage.jsx
                ├── ProductosPage.jsx
                ├── MovimientosPage.jsx
                ├── Tendencias.jsx
                │    └── Chart.js (Line + Bar)
                ├── TransportePage.jsx
                └── BancoPage.jsx

Shared modules (imported by components as needed):
  config.js          → API_URL constant
  api/*.js           → Centralised API call functions (Option B)
  hooks/use*.js      → Reusable data-fetching hooks (Option B)
  sileo (npm)        → Toast notification system
```

---

### Analytics engine — technical depth

#### RFM customer segmentation

RFM scores each customer on three dimensions derived exclusively from the `albaranes` table. No pre-computation or scheduled jobs are used — the algorithm runs on every `GET /api/analytics/summary` request.

**Step 1 — Raw metric extraction**

```python
# For each cliente_id that has at least one albaran:
recency    = (today - max(fecha)).days          # days since last order
frequency  = COUNT(albaran_id)                  # total orders
monetary   = SUM(total)                         # total lifetime spend (€)
```

**Step 2 — Quartile scoring with numpy**

Each dimension is converted to a score 1–4 using `numpy.quantile` over the full customer population:

```python
import numpy as np

Q1, Q2, Q3 = np.quantile(values, [0.25, 0.50, 0.75])

# Frequency and Monetary: higher = better
def score_asc(val):
    if val <= Q1: return 1
    if val <= Q2: return 2
    if val <= Q3: return 3
    return 4

# Recency: lower days = more recent = better (INVERSE scoring)
def score_desc(val):
    if val <= Q1: return 4   # very recent → score 4
    if val <= Q2: return 3
    if val <= Q3: return 2
    return 1                 # stale → score 1
```

**Step 3 — Segment assignment**

```python
if   sR >= 3 and sF == 4 and sM == 4:  segment = "VIP"
elif sF >= 3 and sM >= 3:              segment = "En crecimiento"
elif sR == 1 and sF <= 2:              segment = "En riesgo"
else:                                  segment = "Ocasional"
```

The four segments map directly to actionable CRM strategies:

| Segment | Condition | Suggested action |
|---------|-----------|-----------------|
| **VIP** | Recent, frequent, high-spend | Loyalty rewards, early access to new collections |
| **En crecimiento** | Growing frequency and spend | Upsell complementary products |
| **En riesgo** | Not purchased recently, low frequency | Re-engagement email campaign |
| **Ocasional** | Everything else | Promotional offers to increase visit frequency |

---

#### Market basket analysis (association rules)

The basket analysis discovers product pairs that are frequently purchased together in the same order. It computes **support**, **confidence**, and **lift** for every product pair.

**Algorithm**

```python
from itertools import combinations

# Build a list of product sets per order
baskets = {
    albaran_id: set(producto_id for each LineaAlbaran)
    for each albaran_id
}

# Count individual product occurrences
product_counts = Counter(producto_id across all baskets)
n_orders = len(baskets)

# Count pair co-occurrences
pair_counts = Counter()
for products in baskets.values():
    for a, b in combinations(sorted(products), 2):
        pair_counts[(a, b)] += 1

# Compute metrics
for (a, b), support in pair_counts.items():
    if support < min_support:           # default min_support = 2
        continue
    confidence = support / product_counts[a]
    lift       = confidence / (product_counts[b] / n_orders)
```

**Metric definitions**

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Support** | $\|A \cap B\| / N$ | Probability that an order contains *both* A and B |
| **Confidence(A→B)** | $\|A \cap B\| / \|A\|$ | Probability that B is ordered given A was ordered |
| **Lift(A→B)** | $\text{confidence}(A \to B) / P(B)$ | How much more likely B is when A is present vs. at random. Lift > 1 indicates positive association. |

Results are sorted by `(support DESC, confidence DESC)` and the top 10 pairs are returned to the frontend.

---

### LLM integration — technical depth

#### Architecture overview

```
Frontend (Tendencias.jsx)
    │  POST /api/ai/ask  { range, question }
    ▼
Backend (ai.py)
    ├─ Fetch live metrics from analytics module
    ├─ Trim context to ≤120 data points
    ├─ Build system prompt + user message
    ├─ Call Groq API (OpenAI-compatible endpoint)
    ├─ Extract JSON chart specs from response (regex)
    └─ Return { answer, charts[] }
```

#### System prompt (verbatim)

```
Eres analista de datos retail de una tienda de muebles.
Responde en español, claro y accionable.
Si propones un gráfico, devuelve SOLO JSON estricto válido:
{"charts":[...]} y usa números con punto decimal, sin separador de miles.
```

The prompt is deliberately minimal. The model is not given general business context — instead it is given *live data* in the user message, so the system prompt only needs to set language (Spanish), tone (clear and actionable), and the output contract for charts (strict JSON).

#### User message structure

```python
user_message = f"""
Rango de fechas: {range_str}

Pregunta: {question}

Datos de negocio:
{_json_compact(metrics_small)}
"""
```

`metrics_small` is a reduced version of the full analytics payload:
- Sales series: if the range exceeds 120 days, daily data is aggregated to weekly buckets to avoid 413 (Payload Too Large) errors from Groq.
- Top 10 products by revenue
- RFM segment counts
- Basket pair top-5

The `_json_compact` function serialises the object with no whitespace (`separators=(',', ':')`) to minimise token usage.

#### Temperature and model choice

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `temperature` | `0.2` | Low temperature produces consistent, factual outputs. The model reasons over numbers, not creative text. Higher temperature (> 0.7) would introduce numerical hallucinations. |
| `model` | `llama-3.1-8b-instant` | 8B parameters is enough for structured reasoning over injected JSON. The "instant" variant minimises latency on Groq's LPU hardware. |

#### Chart JSON extraction

The model is instructed to emit chart specifications inline with the analysis text. The backend extracts them with a regex:

```python
import re, json

pattern = re.compile(r'\{.*?"charts"\s*:\s*\[.*?\]\s*\}', re.DOTALL)
match = pattern.search(llm_response_text)
if match:
    charts = json.loads(match.group())["charts"]
else:
    charts = []
```

A `charts` object contains a list of chart descriptors:

```json
{
  "charts": [
    {
      "type": "bar",
      "title": "Ventas por producto (€)",
      "labels": ["Sofá Oslo", "Mesa Roma", "Silla Nórdica"],
      "data":   [4200.50, 3100.00, 1800.75]
    }
  ]
}
```

The frontend `Tendencias.jsx` renders these descriptors as Chart.js `<Bar>` or `<Line>` components alongside the text answer.

#### Fallback behaviour

If the Groq API is unavailable (network timeout, rate limit, invalid key), the endpoint returns a deterministic answer computed directly from the `metrics_small` payload — a formatted summary of the top KPIs — without any LLM call. This ensures the analytics page remains functional even without an active Groq subscription.

#### Model background

Llama-3 belongs to the family of **Large Language Models (LLMs)** built on the **Transformer** architecture. The attention mechanism at its core — which allows the model to capture long-range dependencies between tokens — was introduced by Vaswani et al.\ in *Attention Is All You Need* (NeurIPS 2017). FurniGest uses Llama-3 via the Groq LPU inference platform in a **transfer learning** paradigm: the pre-trained model is reused for analytical reasoning through prompt engineering, without any fine-tuning.

---

### Running the application

#### Prerequisites

- Python 3.12 with a virtual environment at `.venv/`
- PostgreSQL 16 running locally with database `TFG` owned by user `postgres` / password `root`
- Node.js 20+

---

#### Local development (without Docker)

##### Backend

```bash
# From the repository root
.venv\Scripts\activate          # Windows (PowerShell)
# or: source .venv/bin/activate  (Linux / macOS)

uvicorn backend.app.main:app --reload
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

Required environment variables / config files:

| File / Variable | Purpose |
|-----------------|---------|
| `backend/app/stripe_settings.py` | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_CURRENCY` |
| `backend/app/ia_settings.py` | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BASE_URL` |
| `backend/app/settings_email.py` | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` |

##### Frontend

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

---

#### Docker (recommended)

Docker Compose orchestrates the full three-container stack — database, backend and frontend — with a single command. No local Python or PostgreSQL installation is required.

**Prerequisites:** Docker Desktop (or Docker Engine + Compose plugin).

```bash
# Build images and start all containers (first run downloads base images)
docker compose up --build

# Stop all containers and remove containers/networks (data volume is preserved)
docker compose down
```

| URL | What you get |
|-----|-------------|
| `http://localhost` | FurniGest frontend (Nginx served React SPA) |
| `http://localhost/api/...` | Backend REST API (proxied by Nginx from port 80) |
| `http://localhost:8000` | Backend directly (if you want to use `/docs` without the proxy) |

The first `docker compose up --build` takes 2–4 minutes depending on download speed. Subsequent startups reuse the cached layers and start in a few seconds.

> **Config files in Docker:** The four Python config files (`ia_settings.py`, `settings_email.py`, `stripe_settings.py`, `stripe_config.py`) are mounted as read-only volumes from the host into the backend container. You must create these files locally before starting the stack — see [Config-file volume strategy](#config-file-volume-strategy).

> **Data persistence:** PostgreSQL data is stored in a named Docker volume (`postgres_data`). Running `docker compose down` does **not** delete this volume. To wipe the database completely, run `docker compose down -v`.

---

### Seed data

On first startup, `seed.py` is executed automatically via FastAPI's `lifespan` hook. It populates the database with:

- **18 suppliers** — real Spanish/European furniture & home-goods brands
- **99 products** — with realistic names, descriptions and prices, each linked to a supplier
- **100 customers** — with Spanish names, valid DNI format and addresses across major cities
- **~150 delivery notes** — distributed across the four states with a realistic temporal distribution
- **~260 movements** — deposits, pending payments and operational expenses

The seed is **idempotent**: if the `proveedores` table already contains rows, the function exits immediately without touching any data.

To reset the database manually:

```python
# Run once from a Python shell with the venv activated
from backend.app.database import SessionLocal
from backend.app.seed import _wipe, _insert_providers_and_products, _insert_clients, _insert_orders

with SessionLocal() as db:
    _wipe(db)
```

Then restart the server — `seed()` will repopulate on the next startup.

---

### Database migrations — Alembic

FurniGest uses **[Alembic](https://alembic.sqlalchemy.org/)** to manage schema evolution on the live PostgreSQL database. Unlike `Base.metadata.create_all()` (which only creates tables that don't exist yet), Alembic tracks every change as a versioned migration file — allowing columns to be added, renamed or removed in production without data loss.

#### Structure

```
alembic.ini                          # Alembic configuration (project root)
backend/alembic/
    env.py                           # Runtime environment: reads DATABASE_URL and loads all models
    script.py.mako                   # Template for new migration files
    versions/
        20241201_a1b2c3d4e5f6_initial_schema.py   # v1 — creates all 9 tables
```

#### How it works

Each migration file has two functions:
- **`upgrade()`** — applies the change forward (e.g. `op.add_column(...)`)
- **`downgrade()`** — reverts it (e.g. `op.drop_column(...)`)

Alembic records which migrations have been applied in an `alembic_version` table inside PostgreSQL. This makes deployments safe and reproducible: only unapplied migrations are run.

#### Common commands

```bash
# Apply all pending migrations (runs automatically on every deploy)
alembic upgrade head

# Check which revision is currently applied
alembic current

# Generate a new migration after editing a model
alembic revision --autogenerate -m "add column X to table Y"

# Revert the last applied migration
alembic downgrade -1

# Show full migration history
alembic history
```

#### Production startup

`backend/start.sh` runs `alembic upgrade head` automatically before starting Uvicorn. This guarantees the schema is always in sync with the code on every Railway deploy:

```bash
alembic upgrade head
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
```

---

### Automated tests

The project includes a full automated test suite covering both the backend REST API and the frontend React components. Tests are designed to run in isolation without any external dependencies (database, SMTP, Stripe, Groq API).

#### Backend tests — pytest

**Location:** `test/backend/`  
**Runner:** pytest 9 + httpx (ASGI test client) + pytest-asyncio

```bash
# From the repository root, with the virtual environment active
.venv\Scripts\activate
pytest test/backend/ -q
```

Coverage report:

```bash
pytest test/backend/ --cov=backend/app --cov-report=term-missing
```

| File | Tests | Coverage area |
|------|-------|---------------|
| `test_clientes.py` | 12 | Full CRUD + upsert by DNI/email |
| `test_proveedores.py` | 9 | Full CRUD |
| `test_productos.py` | 11 | Full CRUD + FK-violation 409 + search |
| `test_movimientos.py` | 12 | Full CRUD + date ordering + invalid tipo 422 |
| `test_albaranes.py` | 34 | Create/list/get, fianza auto-calc, custom fianza, state transitions, pending-payment movement, PDF, line items |
| `test_analytics.py` | 31 | `/summary`, `/compare`, `/predict`, `/export/pdf` with mocked Groq, RFM, basket |
| `test_transportes.py` | 34 | Almacén listing, route CRUD, assign/unassign, pendiente, liquidate |
| `test_stripe.py` | 10 | Checkout, confirm, list — all Stripe calls mocked |
| `test_auth.py` | 16 | Login OK/fail, `/api/auth/me` GET, all PUT /me branches (password OK, wrong password, username OK, conflict 409, too-short 422), protected endpoint, expired/tampered token |
| `test_configuracion.py` | 12 | GET defaults, GET/PUT round-trip, unknown key 400, overwrite, `ultima_vez` timestamp |
| `test_emailer.py` | 7 | `_html_to_text` (empty, strip tags, strip script, entities), `send_email_simple` (SMTP path, Resend path, captures recipient) |
| `test_resumen_semanal.py` | 39 | `_get`/`_set` round-trips, `_eur` formatting, `_build_html` with/without insight + red balance, `_run` skip conditions + execution + Groq error handling + `ultima_vez` update, `job_resumen_semanal` exception capture |
| `test_incidencias.py` | 12 | Create, list, get, delete, automatic status revert |
| **Total** | **239** | |

> Tests exercise both the original router layer and the new `services/` layer — the service functions are called through the same HTTP endpoints, so the existing test suite validates both layers without requiring new test files.

**Key isolation strategies:**

- **Database:** SQLite `:memory:` with `StaticPool` (single shared connection). All tables are created fresh for each test via an `autouse` fixture with function scope (`Base.metadata.create_all()` / `drop_all()`), then dropped afterwards.
- **Seed data:** The `seed()` startup hook is patched to a no-op so it never populates the test DB, keeping tests starting from a clean empty state.
- **Foreign keys:** `PRAGMA foreign_keys=ON` is applied via an SQLAlchemy event listener so SQLite enforces referential integrity the same way PostgreSQL does in production.
- **Email (albaranes):** `send_email_with_pdf`, `generar_pdf_albaran` and `render` are all patched to no-ops via an `autouse` fixture. This prevents any SMTP connection attempt during tests — important because `BackgroundTasks` inside `TestClient` run synchronously.
- **Groq API:** `groq_chat` is patched via `mocker.patch("backend.app.api.analytics.groq_chat", return_value=GROQ_STUB)` (pytest-mock) so analytics tests never call the real LLM. The patched object is captured and verified with `mock_groq.assert_called_once()` — making it a **spy**, not just a stub.
- **Stripe:** `stripe.checkout.Session.create` is replaced with a `MagicMock` and verified with `spy_create.assert_called_once()`. `stripe.checkout.Session.retrieve` is similarly mocked.
- **Test doubles taxonomy:** FurniGest uses all five classic double types (Meszaros, *xUnit Test Patterns*): Stub (Groq fixed response), Mock/Spy (Stripe call verification), Fake (SQLite in-memory DB), Dummy (empty email return value). All doubles are managed with **pytest-mock** (`mocker` fixture), which automatically restores the original callables after each test without requiring `with patch(...):` context managers.

#### Frontend tests — Vitest

**Location:** `frontend/test/`  
**Runner:** Vitest 4 + `@testing-library/react` + `happy-dom`

```bash
cd frontend
npm test          # single run
npm run test:watch  # watch mode
```

| File | Tests | Coverage area |
|------|-------|---------------|
| `Sidebar.test.jsx` | 13 | App name, all nav links present, correct `href` values, active/inactive CSS class tokens, logout button, logout calls `removeToken` and redirects |
| `App.test.jsx` | 7 | Root renders, title present, layout classes, `<main>` and `<aside>` in DOM |
| `Dashboard.test.jsx` | 10 | Mounts without error, `fetch` called on mount, empty-data grace, network-error resilience, KPI cards |
| `AlbaranesPage.test.jsx` | 38 | Mounts without error, API called on mount, page heading, state filters, no visible errors, network-error resilience, modal open/close, PDF download |
| `BancoPage.test.jsx` | 43 | Mounts without error, calls Stripe status and checkouts endpoints, no visible errors, network-error resilience, checkout flow, payment confirmation |
| `ClientesPage.test.jsx` | 33 | Mounts without error, API called on mount, `<h1>` heading, search input present, empty-list grace, network-error resilience, CRUD modals |
| `NuevaVenta.test.jsx` | 39 | Mounts without error, "Nueva venta" heading, customer search mode present, checkbox controls, network-error resilience, full checkout flow |
| `ProductosPage.test.jsx` | 28 | Mounts without error, both API calls (productos + proveedores) on mount, `<h1>` heading, "Nuevo producto" button in header, tabs, no visible errors, network-error resilience |
| `Tendencias.test.jsx` | 27 | Mounts without error, API called on mount, page heading, "Asistente IA" section present, chat welcome message, network-error resilience |
| `TransportePage.test.jsx` | 38 | Mounts without error, all three initial API calls (almacén/rutas/clientes), page heading, trucks column, network-error resilience, route assignment |
| `LoginPage.test.jsx` | 18 | Form renders, type in fields, toggle password visibility, login OK/fail, redirect, error message |
| `auth.test.js` | 13 | `saveToken`, `getToken`, `removeToken`, `isTokenValid` (expired/tampered/valid/Base64url), `login` fetch call |
| `fetchInterceptor.test.js` | 9 | Auth header injection, skips external URLs, 401 → `removeToken` + redirect, preserves existing headers |
| `PersonalizacionPage.test.jsx` | 48 | Renders sections, dark mode toggle, palettes, username/password fields, save buttons, email signature, form submissions, weekly summary config, i18n settings |
| `ThemeContext.test.jsx` | 11 | Default values (isDark, palette), `localStorage` read on init, `setIsDark` updates value + DOM class + persists, `setPalette` updates value + `dataset.palette` + persists |
| `IncidenciasPage.test.jsx` | 28 | Mounts without error, API called, list incidents, create modal, delete confirmation, state transitions |
| `i18n.test.jsx` | 14 | Language detection, fallback, translation keys, language switching |
| `api.test.js` | 29 | API client functions, request building, error handling, response parsing |
| `hooks.test.jsx` | 8 | Custom React hooks: state management, side effects, cleanup |
| `http.test.js` | 8 | HTTP utility functions, base URL resolution, header management |
| `i18n.test.js` | 9 | i18n configuration, locale loading, pluralisation |
| `ModalCenter.test.jsx` | 6 | Modal rendering, portal mounting, close on backdrop click |
| `UIComponents.test.jsx` | 34 | Shared UI components: buttons, inputs, badges, modals, form controls |
| **Total** | **511** | |

**Key isolation strategies:**

- `globalThis.fetch` is replaced with a `vi.fn()` stub that returns empty arrays/objects, preventing real API calls.
- `ResizeObserver` is stubbed (not available in happy-dom) to prevent Chart.js from throwing.
- `react-chartjs-2` (`<Line>`, `<Bar>`, `<Pie>`) is vi-mocked with lightweight `<canvas>` components.
- `sileo` is fully mocked: both the `Toaster` component (returns `null`) and all notification methods (`sileo.error`, `.success`, `.warning`, `.info`) are replaced with `vi.fn()` stubs. This is necessary because several components call `sileo.error(...)` in async error handlers — if those methods were undefined, Vitest 4 would report unhandled rejections and exit with code 1 even when all assertions pass.
- All render calls are wrapped in `await act(async () => { ... })` so that all `useEffect` callbacks and their subsequent state updates are fully flushed before the test's cleanup phase. Without this, async effects that run after render finish but before `afterEach` tears down the component produce unhandled promise rejections in Vitest 4.
- Active-link CSS class assertions split `className` by whitespace and check for exact Tailwind tokens (e.g. `bg-[#c8c3ba]`) to avoid false positives from `hover:bg-[...]` classes sharing the same substring.

#### Continuous Integration — GitHub Actions

The project uses **two GitHub Actions workflow files** that together define nine jobs. All workflows ignore Markdown-only changes via `paths-ignore: '**.md'`.

---

##### ci.yml — full CI/CD pipeline

**File:** `.github/workflows/ci.yml`

Runs on every **pull request to `main`/`master`** and on manual dispatch (`workflow_dispatch`). Contains seven sequential jobs:

```
PR to main
    │
    ▼
  lint (Ruff + ESLint)
    │
    ├──► backend-tests (pytest --cov)
    └──► frontend-tests (Vitest --coverage)
              │
              ▼
        sonarcloud (quality gate)
              │
              ▼
          e2e (Selenium — full stack)
              │
              ▼
        docker (build & push to ghcr.io)
              │
              ▼
        deploy (Railway + Vercel)
```

The backend-tests and frontend-tests jobs run **in parallel** after lint passes. All subsequent jobs are sequential — each depends on the previous one passing.

###### CI pipeline steps (backend job)

| Step | What it does |
|------|-------------|
| `actions/checkout@v4` | Clones the repository onto the runner |
| `actions/setup-python@v5` | Installs Python 3.12 with pip cache |
| `pip install -r requirements.txt` | Installs all backend dependencies |
| **Create dummy config files** | Generates placeholder `.py` config files (see below) |
| `pytest --cov` | Runs the 239-test backend suite and produces a coverage XML report |
| `actions/upload-artifact@v4` | Saves `coverage-backend.xml` as a downloadable artifact |

###### Why dummy config files are needed in CI

Four Python modules are intentionally excluded from Git via `.gitignore` because they contain real API keys and credentials:

| File | Variables exposed |
|------|-------------------|
| `backend/app/settings_email.py` | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_SENDER_NAME`, `RESEND_API_KEY`, `RESEND_FROM` |
| `backend/app/ia_settings.py` | `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`, `REQUEST_TIMEOUT` |
| `backend/app/stripe_settings.py` | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_CURRENCY` |
| `backend/app/stripe_config.py` | Legacy Stripe config; re-exports values from `stripe_settings.py` |

FastAPI registers all routers at import time, so Python must be able to parse every `from backend.app.settings_email import ...` statement before a single test is collected. If any of these files is absent the entire test run aborts with `ModuleNotFoundError`.

The **Create dummy config files** step writes these modules with empty strings / safe defaults to unblock the import chain. The actual values are never used during tests — all external calls (SMTP, Stripe, Groq, bank OAuth) are either mocked at the test level or never reached.

###### Stripe secret key mock

The `test_stripe.py` suite uses an additional `autouse` fixture to patch `STRIPE_SECRET_KEY` with a non-empty fake value at the module level:

```python
@pytest.fixture(autouse=True)
def mock_stripe_secret_key():
    with patch("backend.app.api.stripe_payments.STRIPE_SECRET_KEY", "sk_test_fake_ci_key"):
        yield
```

Without this, the production guard `if not STRIPE_SECRET_KEY: raise HTTPException(500, …)` would fire on every Stripe endpoint because the CI dummy file sets the key to `''`, causing all stripe tests to return 500 instead of the expected 400 / 200.

---

##### lint.yml — code quality

**File:** `.github/workflows/lint.yml`

Runs on every **push** to any branch and on manual dispatch. Fails the pipeline if any linting or formatting violation is found, preventing low-quality code from being merged.

Two jobs run in parallel:

| Job | Runner | Steps |
|-----|--------|-------|
| `ruff` | `ubuntu-latest` / Python 3.12 | `pip install ruff` → `ruff check backend/ --output-format=github` → `ruff format backend/ --check` |
| `eslint` | `ubuntu-latest` / Node 20 | `npm ci` → `npm run lint` |

**Ruff** enforces:
- `ruff check`: PEP 8 compliance, unused imports (`F401`), multiple imports per line (`E401`), inline semicolons (`E702`), and a broad set of pyflakes / pycodestyle rules.
- `ruff format --check`: Verifies formatting matches Ruff's opinionated formatter (equivalent to Black but significantly faster). The `--check` flag causes the step to exit non-zero if any file would be reformatted, making it a pure read-only lint pass without modifying files.

**ESLint** enforces React best practices and catches undefined variables. The configuration at `frontend/eslint.config.js` enables:
- `no-empty: { allowEmptyCatch: true }` — allows `catch {}` blocks (used in several components for silent error dismissal).
- Vitest globals block — adds `vi`, `describe`, `it`, `expect`, `beforeEach`, `afterEach` and `beforeAll` as known globals in test files so ESLint does not flag them as undeclared.

---

##### Summary — all workflows

| Workflow | Trigger | Jobs | Secrets needed |
|----------|---------|------|----------------|
| `ci.yml` | PR to `main` / manual | 7: lint → backend-tests & frontend-tests → SonarCloud → E2E → Docker build & push → deploy (Railway + Vercel) | `SONAR_TOKEN`, `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| `lint.yml` | push to any branch / manual | 2: Ruff (Python) + ESLint (JavaScript) | None |

#### SonarCloud quality gate

FurniGest integrates **SonarCloud** (the cloud-hosted version of SonarQube) as a quality gate in the `ci.yml` pipeline. The `sonarcloud` job runs after backend and frontend tests pass, blocking the E2E and deploy jobs if the quality gate fails.

> **Prerequisite — disable Automatic Analysis:** In SonarCloud → Administration → Analysis Method, **uncheck "SonarCloud Automatic Analysis"**. Automatic Analysis does not support external coverage import. CI-based analysis (GitHub Actions) must be used instead.

1. Generates `coverage-backend.xml` (pytest + pytest-cov) and `frontend/coverage/lcov.info` (Vitest v8 coverage)
2. Runs the [`SonarSource/sonarcloud-github-action@v3`](https://github.com/SonarSource/sonarcloud-github-action) action using the configuration in `sonar-project.properties`
3. SonarCloud analyses Python (backend) and JavaScript/JSX (frontend), checking for bugs, code smells, security vulnerabilities and coverage
4. If the **quality gate** fails (e.g., coverage drops below the configured threshold), the deploy job is blocked

**Secrets required:** Add `SONAR_TOKEN` to the repository secrets (Settings → Secrets → Actions). `GITHUB_TOKEN` is provided automatically.

**`sonar-project.properties`** (root of the repo):
```properties
sonar.projectKey=aaronsd914_TFG
sonar.organization=aaronsd914
sonar.sources=backend,frontend/src
sonar.python.version=3.12
sonar.python.coverage.reportPaths=coverage-backend.xml
sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info
```

> SonarCloud is **free for public repositories**. Create an account at [sonarcloud.io](https://sonarcloud.io), import the GitHub project, and copy the `SONAR_TOKEN` for the secret.

#### Git branching model & commit conventions

FurniGest follows **Trunk-Based Development (TBD)**: `main` is the only long-lived branch. Every feature is developed on a short-lived `feature/*` or `fix/*` branch and merged to `main` via a Pull Request. This suits continuous deployment — every push triggers linting via `lint.yml`, and every Pull Request to `main` triggers the full `ci.yml` pipeline (tests + quality gate + deploy).

**Why not Gitflow?** Gitflow adds `develop`, `release/*` and `hotfix/*` branches, which make sense for projects with periodic release cycles. FurniGest deploys on every merge, so the extra branches would only add merge overhead without benefit.

**Conventional Commits** — all commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>[optional scope]: <imperative description in lowercase>

[optional body — explains WHAT and WHY, not how]
```

Types used in FurniGest:

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behaviour change |
| `test` | Tests added or updated |
| `docs` | Documentation only |
| `chore` | Maintenance (deps, config, CI) |

**Pull Request template** — every PR fills in `.github/PULL_REQUEST_TEMPLATE.md`, which asks for: change description, commit type, list of modified files, local test confirmation, and CI pass confirmation. This ensures no broken commit reaches production.

#### Test isolation notes

> **Why SQLite instead of PostgreSQL in tests?**  
> Running tests against a real PostgreSQL instance requires a live server, credentials, and slow startup. SQLite with `StaticPool` provides full relational semantics (including FK enforcement via `PRAGMA foreign_keys=ON`) in-process and in-memory, making the suite runnable on any machine — including the GitHub Actions runner — with zero infrastructure setup.

> **Why mock emails in `test_albaranes.py`?**  
> When `crear_albaran` is called via `TestClient`, FastAPI's `BackgroundTasks` execute **synchronously** (not in a background thread), so `_send_albaran_email_task` actually runs during the test. Without mocking, every test that creates an albarán would attempt a real SMTP connection to send an email to the (fake) customer address, fail, and pollute test output. The `autouse` fixture patches `send_email_with_pdf`, `generar_pdf_albaran`, and `render` at module import time.

---

### Docker containerisation

FurniGest ships a production-ready Docker Compose setup. Every component runs in its own container and communicates over an isolated bridge network created automatically by Compose.

#### Container architecture

```
┌────────────────────────────────────────────────────────┐
│  Host machine                                          │
│                                                        │
│  :80 ──► ┌─────────────┐                              │
│          │  frontend   │  nginx:alpine                │
│          │  (React SPA)│  serves /app/dist            │
│          └──────┬──────┘                              │
│                 │ /api/* proxy_pass                   │
│         :8000 ◄─┘                                     │
│          ┌──────▼──────┐                              │
│          │   backend   │  python:3.12-slim            │
│          │  (FastAPI)  │  uvicorn :8000               │
│          └──────┬──────┘                              │
│                 │ DATABASE_URL                        │
│         :5432 ◄─┘                                     │
│          ┌──────▼──────┐                              │
│          │     db      │  postgres:16-alpine          │
│          │             │  named volume: postgres_data │
│          └─────────────┘                              │
└────────────────────────────────────────────────────────┘
```

| Service | Base image | Port (host) | Start command |
|---------|------------|-------------|---------------|
| `db` | `postgres:16-alpine` | `5432` | Built-in postgres entrypoint with healthcheck |
| `backend` | `python:3.12-slim` | `8000` | `uvicorn backend.app.main:app --host 0.0.0.0 --port 8000` |
| `frontend` | `node:20-alpine` → `nginx:alpine` | `80` | nginx serving the Vite production build |

Service startup order:
1. `db` starts first and runs a healthcheck (`pg_isready`) every 5 seconds.
2. `backend` waits for `db` to be **healthy** before starting (`depends_on: db: condition: service_healthy`).
3. `frontend` waits for `backend` to start (`depends_on: backend: condition: service_started`).

#### Nginx reverse proxy and SPA routing

`frontend/nginx.conf` handles two distinct concerns:

**1. Reverse proxy for API calls**

```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

The browser at `http://localhost/api/...` never talks to port 8000 directly. All API traffic goes through Nginx on port 80, which forwards it to the `backend` container by its Compose service name. This means the frontend `VITE_API_BASE_URL` in Docker is set to `/api` (a relative path) rather than `http://localhost:8000`.

**2. Single-Page Application fallback**

```nginx
location / {
    root   /usr/share/nginx/html;
    index  index.html;
    try_files $uri $uri/ /index.html;
}
```

Because React Router handles client-side navigation, hard-refreshing any deep link (e.g. `http://localhost/clientes`) would return a 404 from Nginx if it tried to serve a real file. The `try_files ... /index.html` fallback ensures the React bundle is served for every non-asset path, letting the client router take over.

**CORS note:** When running behind the Nginx proxy, the browser origin is `http://localhost` (port 80). FastAPI's CORS middleware is configured to allow this origin in addition to `http://localhost:5173` (Vite dev server) and `http://127.0.0.1`.

#### Config-file volume strategy

The four Python config files that hold real secrets are excluded from Git (`.gitignore`) but are required by the running backend container. Docker Compose mounts them directly from the host file system as **read-only volumes**:

```yaml
backend:
  volumes:
    - ./backend/app/settings_email.py:/app/backend/app/settings_email.py:ro
    - ./backend/app/ia_settings.py:/app/backend/app/ia_settings.py:ro
    - ./backend/app/stripe_config.py:/app/backend/app/stripe_config.py:ro
    - ./backend/app/stripe_settings.py:/app/backend/app/stripe_settings.py:ro
```

This approach keeps secrets off the image layer (they are never baked into `docker build`) while still making them available at runtime without any environment variable injection in the compose file.

> If a config file is missing when `docker compose up` runs, Docker will create an empty **directory** at that path instead of a file, and Python will throw `IsADirectoryError` at import time. Make sure all four files exist on the host before starting the stack.

#### Database URL environment variable

```yaml
backend:
  environment:
    - DATABASE_URL=postgresql://postgres:root@db:5432/TFG
```

Inside the Docker network, the PostgreSQL service is reachable at hostname `db` (its Compose service name), not `localhost`. The `DATABASE_URL` environment variable overrides the hardcoded fallback in `backend/app/database.py`, pointing the ORM at the correct container. No code change is needed between local and Docker deployments.

#### .env.example

[`.env.example`](.env.example) documents every variable the application requires, grouped by subsystem, with explanatory comments:

```
# Email (settings_email.py)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=your@gmail.com
EMAIL_SENDER_NAME=FurniGest

# AI / LLM (ia_settings.py)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
REQUEST_TIMEOUT=60

# Stripe (stripe_settings.py)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SUCCESS_URL=http://localhost/banco?stripe=success&session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost/banco?stripe=cancel
STRIPE_CURRENCY=eur

# Frontend API base URL (injected at build time via Vite)
VITE_API_BASE_URL=/api
```

Use `.env.example` as a checklist when setting up a new environment. Copy the variable names into the corresponding Python config files for local development, or set them as Railway / Vercel environment variables for cloud deployments.

---

### Code quality

#### Ruff (Python)

[Ruff](https://docs.astral.sh/ruff/) is used for both **linting** and **formatting** the entire `backend/` tree. It replaces Flake8. isort and Black with a single binary that runs an order of magnitude faster.

**Install:**

```bash
pip install ruff
# or, if ruff is not on PATH:
.venv\Scripts\python.exe -m ruff ...
```

**Linting:**

```bash
ruff check backend/
# With GitHub-compatible annotations (used in CI):
ruff check backend/ --output-format=github
```

Rules enforced (excerpt):

| Rule code | Category | Example violation |
|-----------|----------|-------------------|
| `E401` | pycodestyle | `import os, sys` — multiple modules on one line |
| `F401` | pyflakes | `from datetime import datetime` — imported but never used |
| `E702` | pycodestyle | `x = 1; y = 2` — statement ends with semicolon |
| `E501` | pycodestyle | Line exceeds maximum length |
| `F811` | pyflakes | Redefinition of unused name |

**Formatting:**

```bash
ruff format backend/          # auto-formats all Python files
ruff format backend/ --check  # dry run — exits non-zero if any file would change
```

Ruff format normalises: quote style, trailing commas, blank lines between top-level definitions, and import grouping. It was applied to all 25 Python source files in a single pass during the Docker / CI setup sprint.

#### ESLint (JavaScript / React)

ESLint is configured in `frontend/eslint.config.js` using the flat config format (ESLint 9). The configuration extends the recommended rule sets for JavaScript and React:

**Key customisations:**

```js
// Allow empty catch blocks
rules: {
  'no-empty': ['error', { allowEmptyCatch: true }],
}
```

Several components use `catch {}` (empty catch) for silent error dismissal in non-critical UI paths. Without `allowEmptyCatch: true`, ESLint would flag every such block as an error.

```js
// Vitest globals for test files
{
  files: ['test/**'],
  languageOptions: {
    globals: {
      vi: 'readonly',
      describe: 'readonly',
      it: 'readonly',
      expect: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
      beforeAll: 'readonly',
    },
  },
}
```

Vitest injects its test helpers (`vi`, `describe`, `it`, etc.) as implicit globals at runtime. Without declaring them in ESLint, every test file would produce `no-undef` errors during linting. The `test/**` glob matches all files under `frontend/test/`.

**Run locally:**

```bash
cd frontend
npm run lint          # check only
npm run lint -- --fix # auto-fix safe violations
```

The lint script is defined in `frontend/package.json` as `"lint": "eslint ."`.

Both Ruff and ESLint act as **shift-left SCA (Static Code Analysis)** tools — defects are caught at commit time, before they reach production. This aligns with OWASP's secure development philosophy of "designing, developing, and maintaining trustworthy applications", in the same vein as OWASP-ecosystem tools such as PMD, FlawFinder, and LAPSE.

---


> **Why SQLite instead of PostgreSQL in tests?**  
> Running tests against a real PostgreSQL instance requires a live server, credentials, and slow startup. SQLite with `StaticPool` provides full relational semantics (including FK enforcement via `PRAGMA foreign_keys=ON`) in-process and in-memory, making the suite runnable on any machine — including the GitHub Actions runner — with zero infrastructure setup.

> **Why mock emails in `test_albaranes.py`?**  
> When `crear_albaran` is called via `TestClient`, FastAPI's `BackgroundTasks` execute **synchronously** (not in a background thread), so `_send_albaran_email_task` actually runs during the test. Without mocking, every test that creates an albarán would attempt a real SMTP connection to send an email to the (fake) customer address, fail, and pollute test output. The `autouse` fixture patches `send_email_with_pdf`, `generar_pdf_albaran`, and `render` at module import time.

---

### UI quality evaluation

The FurniGest interface was evaluated using **Nielsen's heuristic evaluation** method, inspecting the UI against the ten recognised usability principles to identify issues without requiring live user sessions.

| Heuristic | Implementation in FurniGest |
|-----------|----------------------------|
| **Visibility of system status** | Toast notifications (sileo) confirm every operation in real time; albaran states are displayed with distinct colour badges (amber, blue, violet, green). |
| **Match between system and real world** | Terminology mirrors the business vocabulary (albarán, fianza, ruta, camión) without exposing internal technical concepts. |
| **User control and freedom** | Destructive operations require explicit confirmation; filters and searches can be cleared in one click. |
| **Consistency and standards** | TailwindCSS 4 enforces a uniform colour palette, typography and spacing across all screens. |
| **Error prevention** | Forms validate fields client-side before submission; Pydantic rejects malformed requests before they reach the database. |
| **Recognition rather than recall** | Icons and labels are always visible in the sidebar; tables include descriptive headers on all views. |
| **Aesthetic and minimalist design** | Each screen shows only the columns and actions relevant to the active module, with no superfluous information. |

> **Accessibility (WCAG 2.1 AA):** The interface targets WCAG 2.1 level AA compliance: minimum 4.5:1 colour contrast ratio between text and background, full keyboard navigation, and ARIA attributes on interactive elements. TailwindCSS 4's calibrated colour palette facilitates meeting contrast ratios throughout the UI.

---

### Screen captures

> *Screenshots to be added after final UI polish.*

| Page | Description |
|------|-------------|
| Dashboard | KPI cards (total revenue, open orders, active customers) with a revenue line chart and order-status pie chart. |
| Nueva Venta | Step-by-step order wizard: search or create customer → add product lines → confirm. |
| Clientes | Searchable customer table with a side panel showing the full order history per customer. |
| Albaranes | Filterable list of all delivery notes; inline state button to mark orders as delivered. |
| Productos | Split view: product list on the left, create/edit form on the right; inline supplier management. |
| Movimientos | Chronological ledger of all income and expense movements with running totals. |
| Tendencias | Date-range picker, revenue + top-products charts, period comparison, RFM segment summary, AI assistant chat. |
| Transporte | Kanban-style board: Almacén column and per-truck Route columns; drag-style assign/unassign; liquidate and download route PDF. |
| Banco | Stripe configuration status, payment form (amount + description), confirmed-payment history table. |

---

### Production deployment

FurniGest is deployed at the following public URLs:

| Service | URL |
|---------|-----|
| **Frontend** | [`https://tfg-five-drab.vercel.app`](https://tfg-five-drab.vercel.app) |
| **Backend API** | [`https://supportive-nurturing-production-66dc.up.railway.app`](https://supportive-nurturing-production-66dc.up.railway.app) |
| **API docs (Swagger)** | [`https://supportive-nurturing-production-66dc.up.railway.app/docs`](https://supportive-nurturing-production-66dc.up.railway.app/docs) |

#### Infrastructure

| Component | Provider | Details |
|-----------|----------|---------|
| Backend | [Railway](https://railway.app) | `python:3.12-slim` container, `europe-west4` region, Hobby plan |
| Database | Railway PostgreSQL | `postgres:16-alpine`, `postgres-volume` persistent volume |
| Frontend | [Vercel](https://vercel.com) | Static Vite build, edge CDN, auto-deploy on push to `main` |

#### Transport security (TLS)

In production, all communication between client and server is protected by **TLS** (Transport Layer Security) via a certificate automatically managed by Railway. TLS encrypts HTTP traffic using **AES** (symmetric session cipher) and authenticates the server via **X.509 certificates**, ensuring both confidentiality and integrity of all data in transit. No additional configuration is required — Railway terminates TLS at the load-balancer level before forwarding requests to the container.

#### Email in production

Railway's networking layer **blocks all outbound SMTP connections** (ports 587 and 465) at the infrastructure level — this is a platform restriction with no technical workaround. Attempting to connect to `smtp.gmail.com:587` from a Railway container produces `OSError: [Errno 101] Network is unreachable`.

The emailer in `backend/app/utils/emailer.py` handles this transparently: if `RESEND_API_KEY` is set, it calls `_send_via_resend()` (HTTP API over port 443, never blocked); otherwise it falls back to `_send_via_smtp()`. The albarán is always saved to the database regardless — the email is a background task and its failure does not affect the main request.

**Known limitation:** In the current public deployment (`supportive-nurturing-production-66dc.up.railway.app`) `RESEND_API_KEY` is not configured, so emails are not sent in production. The full email flow (PDF generation + HTML template + attachment delivery) works correctly in local development and in the Docker Compose stack where SMTP is not blocked.

To enable email sending in a Railway deployment:
1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day, no credit card)
2. Go to **API Keys** → **Create API Key**
3. For `RESEND_FROM`: use `onboarding@resend.dev` (no domain setup needed; Resend limits delivery to your own verified email address) or add a custom domain under **Domains**
4. Add to Railway → service → **Variables**:
   - `RESEND_API_KEY` = `re_...`
   - `RESEND_FROM` = `onboarding@resend.dev` (or your domain address)

Without `RESEND_API_KEY`, the emailer falls back to SMTP — which works in local development and Docker but not on Railway.

#### Continuous deployment

Both Railway and Vercel are connected directly to the GitHub repository and deploy automatically on every push to `main`. The `ci.yml` workflow provides an additional CI-gated deploy path: its `deploy-railway` and `deploy-vercel` jobs run the full test suite before deploying, preventing a broken commit from reaching production.

> **Vercel deploy note:** the Vercel CLI is invoked from the repository root (not `frontend/`) so that `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` secrets resolve without path duplication. The project's root directory is already set to `frontend` in the Vercel dashboard.

> **Railway deploy note:** requires both `RAILWAY_TOKEN` and `RAILWAY_PROJECT_ID` secrets in GitHub → Settings → Secrets. The `RAILWAY_PROJECT_ID` is the UUID visible in your Railway project URL. Regenerate the token from Railway Dashboard → Account Settings → Tokens if the deploy step fails with "Invalid RAILWAY_TOKEN". A `railway.toml` at the repository root configures the Dockerfile builder and the `/health` healthcheck path.


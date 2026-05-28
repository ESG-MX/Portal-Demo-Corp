# Portal Demo Corp — ERP Operativo

Sistema ERP web fullstack integrado con **SAP Business One** y **Azure SQL**, diseñado para la gestión operativa de sucursales: ventas, inventario, recepción de mercancía, caja chica y reportería.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS v3 |
| Backend | Node.js · Express |
| Base de datos | Azure SQL Server (mssql / tedious) |
| Autenticación | Azure Active Directory (MSAL) |
| Cron jobs | node-cron (alertas de inventario) |
| UI Icons | Lucide React |

---

## Módulos del Sistema

| Módulo | Descripción |
|---|---|
| **Ventas** | Registro y seguimiento de órdenes de venta con historial analítico |
| **Recepción Mercancía** | Control de entradas de mercancía y validación de órdenes de compra |
| **Inventario** | Gestión de stock, semáforo de alertas y auditoría de movimientos |
| **Consumo** | Registro de consumos internos y salidas de almacén |
| **Caja Chica** | Control de gastos menores con comprobantes |
| **Reportes** | Dashboards y exportación de datos operativos |
| **Auditoría Stock** | Log de cambios con comparativas en tiempo real |
| **Dashboard Incidencias** | Seguimiento y reporte de incidencias operativas |
| **Panel Admin** | Gestión de usuarios y configuración del sistema |

---

## Arquitectura

```
Portal Demo Corp/
├── client/                  # Frontend React + Vite
│   ├── src/
│   │   ├── pages/           # Vistas por módulo
│   │   ├── components/      # Sidebar, Header, modales, etc.
│   │   └── utils/           # Helpers y estilos de selects
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── server/                  # Backend Express
    ├── routes/              # Endpoints REST por módulo
    ├── config/              # Conexión a Azure SQL e init DB
    ├── middleware/          # Autenticación, manejo de errores
    ├── cron/                # Alertas automáticas de inventario
    └── utils/               # Logger
```

---

## Instalación y Ejecución

### Requisitos
- Node.js 18+
- npm 9+

### 1. Clonar el repositorio

```bash
git clone https://github.com/ESG-MX/Portal-Demo-Corp.git
cd Portal-Demo-Corp
```

### 2. Instalar dependencias

```bash
# Dependencias del servidor
cd server && npm install

# Dependencias del cliente
cd ../client && npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del servidor (`server/.env`):

```env
PORT=8080

# Base de datos Azure SQL
DB_SERVER=tu-servidor.database.windows.net
DB_DATABASE=nombre_base_datos
DB_USER=usuario
DB_PASSWORD=contraseña

# Modo demo (sin DB real ni Azure AD)
DEMO_MODE=true
USE_MOCK_DB=true

# Azure AD (producción)
AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
```

> **Modo Demo**: con `DEMO_MODE=true` y `USE_MOCK_DB=true` el sistema arranca con datos en memoria sin necesidad de conectarse a Azure SQL ni Azure AD.

### 4. Ejecutar en desarrollo

```bash
# Terminal 1 — Backend
cd server && node index.js

# Terminal 2 — Frontend
cd client && npm run dev
```

La aplicación queda disponible en `http://localhost:5173` (frontend) y `http://localhost:8080` (API).

### 5. Build para producción

```bash
cd client && npm run build
# El backend sirve el dist estático automáticamente desde puerto 8080
```

---

## API Endpoints

| Prefijo | Recurso |
|---|---|
| `/api/ventas` | Órdenes de venta |
| `/api/entradas` | Recepción de mercancía |
| `/api/inventario` | Stock y movimientos |
| `/api/salidas` | Consumos / salidas |
| `/api/entradascc` | Caja chica |
| `/api/reportes` | Reportería |
| `/api/auditoria` | Auditoría de stock |
| `/api/incidencias` | Incidencias operativas |
| `/api/notificaciones` | Notificaciones en tiempo real |
| `/api/consultas` | Consultas generales SAP B1 |
| `/api/user` | Gestión de usuarios |
| `/api/admin` | Configuración administrativa |

---

## Características Destacadas

- **Integración SAP B1**: consultas y sincronización de datos maestros (artículos, socios de negocio, órdenes).
- **Autenticación Azure AD**: flujo OAuth2 con MSAL para entornos corporativos.
- **Alertas automáticas**: cron job que monitorea niveles de inventario y dispara notificaciones.
- **Modo Demo**: datos mock en memoria para demostraciones sin infraestructura real.
- **Diseño responsivo**: UI adaptada a desktop y tablets con paleta Slate + Violet.
- **Auditoría completa**: log de movimientos con historial, comparativas y exportación.

---

## Autor

**ESG-MX** · [github.com/ESG-MX](https://github.com/ESG-MX)

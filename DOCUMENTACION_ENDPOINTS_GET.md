# 📋 API de Atención al Cliente - Documentación Completa

Documentación exhaustiva de todos los endpoints GET del sistema de Atención al Cliente de Charlotte.

**Base URL**: `/api/v1/atencion-cliente`

---

## 📑 Índice de Submódulos

1. [Mesas (Tables)](#-submódulo-mesas-tables)
2. [Clientes Temporales (Clients)](#-submódulo-clientes-temporales-clients)
3. [Solicitudes de Servicio (Service Requests)](#-submódulo-solicitudes-de-servicio-service-requests)
4. [Comandas (Orders)](#-submódulo-comandas-orders)
5. [Endpoints de Prueba (Test)](#-endpoints-de-prueba-test)

---

## 🪑 Submódulo: Mesas (Tables)

Gestión del inventario de mesas del restaurante y verificación de códigos QR para acceso de clientes.

### 📍 GET /api/v1/atencion-cliente/tables

**Propósito**: Obtener listado paginado de todas las mesas del restaurante con filtros opcionales de estado y archivo.

**Características**:
- ✅ Paginación incluida
- ✅ Filtros por estado (AVAILABLE, OCCUPIED, OUT_OF_SERVICE)
- ✅ Filtro para ver mesas archivadas
- ✅ Acceso público (sin autenticación)

#### 📊 Parámetros (Query String)

##### 1. `page` - Número de Página

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 1 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

**Descripción**: Número de página para la paginación del listado.

**Ejemplos**:
```http
# Primera página (default)
GET /api/v1/atencion-cliente/tables

# Segunda página
GET /api/v1/atencion-cliente/tables?page=2

# Tercera página
GET /api/v1/atencion-cliente/tables?page=3
```

---

##### 2. `limit` - Límite de Resultados

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 20 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

**Descripción**: Cantidad máxima de mesas a retornar por página.

**Ejemplos**:
```http
# Obtener 10 mesas por página
GET /api/v1/atencion-cliente/tables?limit=10

# Obtener 50 mesas por página
GET /api/v1/atencion-cliente/tables?limit=50&page=1
```

---

##### 3. `status` - Filtro por Estado

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (enum) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valores permitidos** | `AVAILABLE`, `OCCUPIED`, `OUT_OF_SERVICE` |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra las mesas por su estado actual de ocupación o servicio.

**Valores**:
- `AVAILABLE` - Mesas disponibles para asignar
- `OCCUPIED` - Mesas actualmente ocupadas por clientes
- `OUT_OF_SERVICE` - Mesas fuera de servicio (mantenimiento, reservadas, etc.)

**Ejemplos**:
```http
# Solo mesas disponibles
GET /api/v1/atencion-cliente/tables?status=AVAILABLE

# Solo mesas ocupadas
GET /api/v1/atencion-cliente/tables?status=OCCUPIED

# Solo mesas fuera de servicio
GET /api/v1/atencion-cliente/tables?status=OUT_OF_SERVICE
```

---

##### 4. `archived` - Filtro de Archivado

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | boolean (como string) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valores permitidos** | `true`, `false` |
| **Valor por defecto** | undefined (muestra todas) |

**Descripción**: Filtra mesas según su estado de archivado (eliminación lógica).

**Valores**:
- `true` - Solo mesas archivadas/eliminadas
- `false` - Solo mesas activas (no archivadas)
- Sin valor - Muestra todas (archivadas y activas)

**Ejemplos**:
```http
# Solo mesas activas
GET /api/v1/atencion-cliente/tables?archived=false

# Solo mesas archivadas
GET /api/v1/atencion-cliente/tables?archived=true

# Todas las mesas (default)
GET /api/v1/atencion-cliente/tables
```

---

#### 🔗 Combinación de Filtros

Puedes combinar múltiples parámetros para búsquedas más específicas:

**Ejemplos de Combinaciones**:

```http
# Mesas disponibles activas, 10 por página
GET /api/v1/atencion-cliente/tables?status=AVAILABLE&archived=false&limit=10

# Segunda página de mesas ocupadas
GET /api/v1/atencion-cliente/tables?status=OCCUPIED&page=2&limit=20

# Mesas archivadas que estaban fuera de servicio
GET /api/v1/atencion-cliente/tables?status=OUT_OF_SERVICE&archived=true
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "table_number": 5,
      "qr_uuid": "a3f85f64-5717-4562-b3fc-2c963f66afa6",
      "capacity": 4,
      "current_status": "AVAILABLE",
      "is_archived": false,
      "created_at": "2026-01-15T10:30:00.000Z",
      "updated_at": "2026-01-30T14:20:00.000Z"
    },
    {
      "id": 2,
      "table_number": 8,
      "qr_uuid": "b4e96g75-6828-5673-c4gd-3d074g77bgb7",
      "capacity": 2,
      "current_status": "OCCUPIED",
      "is_archived": false,
      "created_at": "2026-01-15T10:35:00.000Z",
      "updated_at": "2026-01-31T09:15:00.000Z"
    }
  ],
  "metadata": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 45,
    "items_per_page": 10,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

**Descripción de Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | Identificador único de la mesa |
| `table_number` | integer | Número de mesa visible para el personal |
| `qr_uuid` | string (UUID) | Código único del QR de la mesa |
| `capacity` | integer | Capacidad máxima de comensales (2-6 personas) |
| `current_status` | enum | Estado actual de la mesa |
| `is_archived` | boolean | Indica si la mesa está archivada |
| `created_at` | ISO DateTime | Fecha de creación del registro |
| `updated_at` | ISO DateTime | Última actualización del registro |

---

### 📍 GET /api/v1/atencion-cliente/tables/:id

**Propósito**: Obtener información detallada de una mesa específica por su ID.

**Características**:
- ✅ Retorna datos completos de la mesa
- ✅ Incluye información de sesiones activas asociadas
- ✅ Acceso público (sin autenticación)

#### 📊 Parámetros

##### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | integer | ✅ Sí | ID único de la mesa a consultar |

**Validación**: Debe ser un número entero positivo válido.

**Ejemplos**:
```http
# Obtener mesa con ID 1
GET /api/v1/atencion-cliente/tables/1

# Obtener mesa con ID 15
GET /api/v1/atencion-cliente/tables/15
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "id": 1,
  "table_number": 5,
  "qr_uuid": "a3f85f64-5717-4562-b3fc-2c963f66afa6",
  "capacity": 4,
  "current_status": "OCCUPIED",
  "is_archived": false,
  "created_at": "2026-01-15T10:30:00.000Z",
  "updated_at": "2026-01-31T14:20:00.000Z",
  "active_sessions": [
    {
      "id": 123,
      "customer_name": "Juan Pérez",
      "customer_dni": "V-12345678",
      "status": "ACTIVE",
      "created_at": "2026-01-31T13:00:00.000Z"
    }
  ]
}
```

**Respuesta de Error (404 Not Found)**:

```json
{
  "error": "Mesa no encontrada"
}
```

**Descripción de Campos Adicionales**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `active_sessions` | array | Lista de sesiones de clientes actualmente en la mesa |
| `active_sessions[].id` | integer | ID de la sesión del cliente |
| `active_sessions[].customer_name` | string | Nombre del cliente |
| `active_sessions[].customer_dni` | string | DNI/Cédula del cliente |
| `active_sessions[].status` | enum | Estado de la sesión (ACTIVE, BILL_REQUESTED, CLOSED) |

---

## 👥 Submódulo: Clientes Temporales (Clients)

Gestión de sesiones temporales de clientes que han escaneado el QR de una mesa.

### 📍 GET /api/v1/atencion-cliente/clients

**Propósito**: Obtener listado paginado de clientes temporales con filtros avanzados para monitoreo de sesiones y generación de KPIs.

**Características**:
- ✅ Paginación incluida
- ✅ Filtros por estado, fechas y monto mínimo
- ✅ Requiere autenticación (Guest o Staff)
- ✅ Guests solo ven sus propias sesiones
- ✅ Staff ve todas las sesiones

#### 📊 Parámetros (Query String)

##### 1. `page` - Número de Página

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 1 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

**Descripción**: Número de página para la paginación del listado.

---

##### 2. `limit` - Límite de Resultados

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 10 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

**Descripción**: Cantidad máxima de clientes a retornar por página.

---

##### 3. `status` - Filtro por Estado de Sesión

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (enum) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valores permitidos** | `ACTIVE`, `BILL_REQUESTED`, `CLOSED` |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra las sesiones de clientes por su estado actual.

**Valores**:
- `ACTIVE` - Cliente activo consumiendo en la mesa
- `BILL_REQUESTED` - Cliente solicitó la cuenta
- `CLOSED` - Sesión cerrada/finalizada

**Ejemplos**:
```http
# Solo clientes activos
GET /api/v1/atencion-cliente/clients?status=ACTIVE

# Clientes que solicitaron la cuenta
GET /api/v1/atencion-cliente/clients?status=BILL_REQUESTED

# Sesiones cerradas
GET /api/v1/atencion-cliente/clients?status=CLOSED
```

---

##### 4. `date_from` - Fecha Inicio del Rango

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (ISO 8601 date-time) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Formato** | `YYYY-MM-DDTHH:mm:ss.sssZ` |
| **Valor por defecto** | null (sin límite inferior) |

**Descripción**: Filtra clientes cuya sesión fue creada desde la fecha especificada (mayor o igual).

**Ejemplos**:
```http
# Clientes desde el 30 de enero de 2026
GET /api/v1/atencion-cliente/clients?date_from=2026-01-30T00:00:00.000Z

# Clientes de las últimas 24 horas
GET /api/v1/atencion-cliente/clients?date_from=2026-01-30T14:00:00.000Z
```

---

##### 5. `date_to` - Fecha Fin del Rango

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (ISO 8601 date-time) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Formato** | `YYYY-MM-DDTHH:mm:ss.sssZ` |
| **Valor por defecto** | null (sin límite superior) |

**Descripción**: Filtra clientes cuya sesión fue creada hasta la fecha especificada (menor o igual).

**Ejemplos**:
```http
# Clientes hasta el 31 de enero de 2026
GET /api/v1/atencion-cliente/clients?date_to=2026-01-31T23:59:59.999Z

# Clientes en un rango específico
GET /api/v1/atencion-cliente/clients?date_from=2026-01-30T00:00:00.000Z&date_to=2026-01-31T00:00:00.000Z
```

---

##### 6. `min_amount` - Monto Mínimo de Consumo

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | number (decimal) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Validación** | Debe ser un número no negativo (≥ 0) |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra clientes cuyo total de consumo sea mayor o igual al monto especificado.

**Ejemplos**:
```http
# Clientes con consumo mínimo de $50
GET /api/v1/atencion-cliente/clients?min_amount=50

# Clientes con consumo mínimo de $100
GET /api/v1/atencion-cliente/clients?min_amount=100.00
```

---

#### 🔗 Combinación de Filtros

**Ejemplos de Combinaciones**:

```http
# Clientes activos con consumo superior a $75
GET /api/v1/atencion-cliente/clients?status=ACTIVE&min_amount=75

# Sesiones cerradas del día 30 de enero
GET /api/v1/atencion-cliente/clients?status=CLOSED&date_from=2026-01-30T00:00:00.000Z&date_to=2026-01-30T23:59:59.999Z

# Top 20 clientes con mayor gasto hoy
GET /api/v1/atencion-cliente/clients?date_from=2026-01-31T00:00:00.000Z&min_amount=50&limit=20

# Paginación con filtros combinados
GET /api/v1/atencion-cliente/clients?status=ACTIVE&page=2&limit=10
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "customer_name": "María González",
      "customer_dni": "V-23456789",
      "table_id": 5,
      "table": {
        "table_number": 8
      },
      "status": "ACTIVE",
      "total_amount": 125.50,
      "created_at": "2026-01-31T12:30:00.000Z",
      "updated_at": "2026-01-31T14:15:00.000Z"
    },
    {
      "id": 124,
      "customer_name": "Carlos Rodríguez",
      "customer_dni": "V-34567890",
      "table_id": 3,
      "table": {
        "table_number": 12
      },
      "status": "BILL_REQUESTED",
      "total_amount": 89.00,
      "created_at": "2026-01-31T11:00:00.000Z",
      "updated_at": "2026-01-31T14:20:00.000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 8,
    "total_items": 76,
    "items_per_page": 10,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

**Descripción de Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID único de la sesión del cliente |
| `customer_name` | string | Nombre completo del cliente |
| `customer_dni` | string | DNI/Cédula del cliente (formato: V-12345678) |
| `table_id` | integer | ID de la mesa asociada |
| `table.table_number` | integer | Número de mesa visible |
| `status` | enum | Estado de la sesión del cliente |
| `total_amount` | decimal | Monto total consumido en la sesión |
| `created_at` | ISO DateTime | Inicio de la sesión |
| `updated_at` | ISO DateTime | Última actualización |

---

### 📍 GET /api/v1/atencion-cliente/clients/active

**Propósito**: Endpoint especializado para obtener clientes activos con su consumo calculado en tiempo real.

**Características**:
- ✅ Solo retorna clientes con estado ACTIVE o BILL_REQUESTED
- ✅ Calcula el consumo actual sumando todas las comandas no canceladas
- ✅ Detecta "clientes fantasma" (más de 50 mins sin consumo)
- ✅ Ordenado por antigüedad (más viejos primero)
- ✅ Sin paginación (retorna todos los activos)

#### 📊 Parámetros

**No requiere parámetros**. Este endpoint no acepta query parameters.

**Ejemplo**:
```http
GET /api/v1/atencion-cliente/clients/active
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 125,
      "customer_name": "Ana Martínez",
      "customer_dni": "V-45678901",
      "table": {
        "table_number": 5
      },
      "created_at": "2026-01-31T11:00:00.000Z",
      "status": "ACTIVE",
      "totalAmount": 45.75,
      "ordersCount": 2,
      "isGhostCandidate": false
    },
    {
      "id": 126,
      "customer_name": "Pedro Sánchez",
      "customer_dni": "V-56789012",
      "table": {
        "table_number": 12
      },
      "created_at": "2026-01-31T10:00:00.000Z",
      "status": "ACTIVE",
      "totalAmount": 0.00,
      "ordersCount": 0,
      "isGhostCandidate": true
    }
  ]
}
```

**Descripción de Campos Especiales**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `totalAmount` | decimal | **Consumo calculado en tiempo real** (suma de items de comandas no canceladas) |
| `ordersCount` | integer | Cantidad total de comandas del cliente |
| `isGhostCandidate` | boolean | `true` si lleva más de 50 minutos sin consumir nada (posible sesión abandonada) |

**Casos de Uso**:
- Monitor de sala en tiempo real
- Dashboard de KPIs del restaurante
- Alertas de mesas inactivas
- Detección de sesiones fantasma

---

### 📍 GET /api/v1/atencion-cliente/clients/:id

**Propósito**: Obtener información detallada de un cliente temporal específico por su ID.

**Características**:
- ✅ Retorna datos completos del cliente y su sesión
- ✅ Incluye información de la mesa asociada
- ✅ Requiere autenticación
- ✅ Guests solo pueden ver su propia sesión
- ✅ Staff puede ver cualquier sesión

#### 📊 Parámetros

##### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | integer | ✅ Sí | ID único del cliente temporal a consultar |

**Validación**: Debe ser un número entero positivo válido.

**Ejemplos**:
```http
# Obtener cliente con ID 123
GET /api/v1/atencion-cliente/clients/123

# Obtener cliente con ID 456
GET /api/v1/atencion-cliente/clients/456
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "id": 123,
  "customer_name": "María González",
  "customer_dni": "V-23456789",
  "table_id": 5,
  "table": {
    "id": 5,
    "table_number": 8,
    "qr_uuid": "a3f85f64-5717-4562-b3fc-2c963f66afa6",
    "capacity": 4,
    "current_status": "OCCUPIED"
  },
  "status": "ACTIVE",
  "total_amount": 125.50,
  "created_at": "2026-01-31T12:30:00.000Z",
  "updated_at": "2026-01-31T14:15:00.000Z",
  "comandas": [
    {
      "id": "c7e96g75-6828-5673-c4gd-3d074g77bgb7",
      "status": "DELIVERED",
      "created_at": "2026-01-31T12:45:00.000Z"
    }
  ]
}
```

**Respuesta de Error (404 Not Found)**:

```json
{
  "error": "Cliente no encontrado"
}
```

**Descripción de Campos Adicionales**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `table` | object | Objeto completo con detalles de la mesa |
| `comandas` | array | Lista de todas las comandas/órdenes del cliente |

---

## 🛎️ Submódulo: Solicitudes de Servicio (Service Requests)

Gestión de solicitudes de servicio de clientes (llamar mesero, quejas, etc.).

### 📍 GET /api/v1/atencion-cliente/service-requests

**Propósito**: Obtener listado paginado de solicitudes de servicio con filtros avanzados para el dashboard del personal.

**Características**:
- ✅ Paginación incluida
- ✅ Filtros por estado, tipo y mesa
- ✅ Requiere autenticación (Guest o Staff)
- ✅ Ordenamiento por fecha de creación (más recientes primero)

#### 📊 Parámetros (Query String)

##### 1. `page` - Número de Página

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 1 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

---

##### 2. `limit` - Límite de Resultados

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 20 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

---

##### 3. `status` - Filtro por Estado

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (enum) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valores permitidos** | `PENDING`, `ATTENDED` |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra las solicitudes por su estado de atención.

**Valores**:
- `PENDING` - Solicitud pendiente de atención
- `ATTENDED` - Solicitud ya atendida por el personal

**Ejemplos**:
```http
# Solo solicitudes pendientes
GET /api/v1/atencion-cliente/service-requests?status=PENDING

# Solo solicitudes atendidas
GET /api/v1/atencion-cliente/service-requests?status=ATTENDED
```

---

##### 4. `type` - Filtro por Tipo de Solicitud

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (enum) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valores permitidos** | `CALL_WAITER`, `COMPLAINT` |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra las solicitudes por su tipo/categoría.

**Valores**:
- `CALL_WAITER` - Cliente solicita atención del mesero
- `COMPLAINT` - Queja o reclamo del cliente

**Ejemplos**:
```http
# Solo llamadas de mesero
GET /api/v1/atencion-cliente/service-requests?type=CALL_WAITER

# Solo quejas
GET /api/v1/atencion-cliente/service-requests?type=COMPLAINT
```

---

##### 5. `table_id` - Filtro por Mesa

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Validación** | Debe ser un número entero positivo |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra solicitudes de una mesa específica.

**Ejemplos**:
```http
# Solicitudes de la mesa ID 5
GET /api/v1/atencion-cliente/service-requests?table_id=5

# Solicitudes pendientes de la mesa 12
GET /api/v1/atencion-cliente/service-requests?table_id=12&status=PENDING
```

---

#### 🔗 Combinación de Filtros

**Ejemplos de Combinaciones**:

```http
# Quejas pendientes
GET /api/v1/atencion-cliente/service-requests?type=COMPLAINT&status=PENDING

# Llamadas atendidas de la mesa 8
GET /api/v1/atencion-cliente/service-requests?type=CALL_WAITER&status=ATTENDED&table_id=8

# Segunda página de solicitudes pendientes
GET /api/v1/atencion-cliente/service-requests?status=PENDING&page=2&limit=10
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "d8f07h86-7939-6784-d5he-4e185h88cha8",
      "type": "CALL_WAITER",
      "message": "Necesito la cuenta por favor",
      "status": "PENDING",
      "cliente_id": 123,
      "cliente": {
        "id": 123,
        "customer_name": "María González",
        "table": {
          "table_number": 8
        }
      },
      "created_at": "2026-01-31T14:25:00.000Z",
      "attended_at": null
    },
    {
      "id": "e9g18i97-8040-7895-e6if-5f296i99dib9",
      "type": "COMPLAINT",
      "message": "La comida llegó fría",
      "status": "ATTENDED",
      "cliente_id": 124,
      "cliente": {
        "id": 124,
        "customer_name": "Carlos Rodríguez",
        "table": {
          "table_number": 12
        }
      },
      "created_at": "2026-01-31T13:10:00.000Z",
      "attended_at": "2026-01-31T13:15:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Descripción de Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la solicitud |
| `type` | enum | Tipo de solicitud (CALL_WAITER o COMPLAINT) |
| `message` | string | Mensaje/descripción de la solicitud |
| `status` | enum | Estado de atención (PENDING o ATTENDED) |
| `cliente_id` | integer | ID del cliente que hizo la solicitud |
| `cliente` | object | Objeto con datos del cliente |
| `created_at` | ISO DateTime | Fecha de creación de la solicitud |
| `attended_at` | ISO DateTime | Fecha de atención (null si está pendiente) |

---

### 📍 GET /api/v1/atencion-cliente/service-requests/:id

**Propósito**: Obtener el detalle completo de una solicitud de servicio específica.

**Características**:
- ✅ Retorna información completa de la solicitud
- ✅ Incluye datos del cliente y mesa asociados
- ✅ Requiere autenticación (Guest o Staff)

#### 📊 Parámetros

##### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | UUID | ✅ Sí | ID único de la solicitud de servicio |

**Validación**: Debe ser un UUID válido.

**Ejemplos**:
```http
# Obtener solicitud específica
GET /api/v1/atencion-cliente/service-requests/d8f07h86-7939-6784-d5he-4e185h88cha8
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "d8f07h86-7939-6784-d5he-4e185h88cha8",
    "type": "CALL_WAITER",
    "message": "Necesito la cuenta por favor",
    "status": "PENDING",
    "cliente_id": 123,
    "cliente": {
      "id": 123,
      "customer_name": "María González",
      "customer_dni": "V-23456789",
      "table_id": 5,
      "table": {
        "id": 5,
        "table_number": 8,
        "capacity": 4
      }
    },
    "created_at": "2026-01-31T14:25:00.000Z",
    "attended_at": null
  }
}
```

**Respuesta de Error (404 Not Found)**:

```json
{
  "success": false,
  "message": "Solicitud no encontrada"
}
```

---

## 🍽️ Submódulo: Comandas (Orders)

Gestión de órdenes/comandas de comida de los clientes.

### 📍 GET /api/v1/atencion-cliente/comandas

**Propósito**: Obtener listado paginado de comandas/órdenes con filtros avanzados.

**Características**:
- ✅ Paginación incluida
- ✅ Filtros por estado, mesa y fechas
- ✅ Requiere autenticación (Guest o Staff)
- ✅ Guests solo ven sus propias comandas
- ✅ Staff ve todas las comandas

#### 📊 Parámetros (Query String)

##### 1. `page` - Número de Página

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 1 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

---

##### 2. `limit` - Límite de Resultados

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valor por defecto** | 20 |
| **Validación** | Debe ser un número entero positivo mayor a 0 |

---

##### 3. `status` - Filtro por Estado

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (enum) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Valores permitidos** | `PENDING`, `COOKING`, `DELIVERED`, `CANCELLED` |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra las comandas por su estado de preparación.

**Valores**:
- `PENDING` - Comanda pendiente de preparación
- `COOKING` - Comanda en cocina
- `DELIVERED` - Comanda entregada al cliente
- `CANCELLED` - Comanda cancelada

**Ejemplos**:
```http
# Solo comandas en cocina
GET /api/v1/atencion-cliente/comandas?status=COOKING

# Solo comandas entregadas
GET /api/v1/atencion-cliente/comandas?status=DELIVERED

# Solo comandas canceladas
GET /api/v1/atencion-cliente/comandas?status=CANCELLED
```

---

##### 4. `table_id` - Filtro por Mesa

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | integer |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Validación** | Debe ser un número entero positivo |
| **Valor por defecto** | null (sin filtro) |

**Descripción**: Filtra comandas de una mesa específica.

**Ejemplos**:
```http
# Comandas de la mesa ID 5
GET /api/v1/atencion-cliente/comandas?table_id=5

# Comandas activas de la mesa 12
GET /api/v1/atencion-cliente/comandas?table_id=12&status=COOKING
```

---

##### 5. `date_from` - Fecha Inicio del Rango

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (ISO 8601 date-time) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Formato** | `YYYY-MM-DDTHH:mm:ss.sssZ` |
| **Valor por defecto** | null (sin límite inferior) |

**Descripción**: Filtra comandas creadas desde la fecha especificada (inclusive).

**Ejemplos**:
```http
# Comandas desde el 30 de enero
GET /api/v1/atencion-cliente/comandas?date_from=2026-01-30T00:00:00.000Z

# Comandas de las últimas 2 horas
GET /api/v1/atencion-cliente/comandas?date_from=2026-01-31T12:00:00.000Z
```

---

##### 6. `date_to` - Fecha Fin del Rango

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | string (ISO 8601 date-time) |
| **Ubicación** | Query parameter |
| **Requerido** | ❌ No (opcional) |
| **Formato** | `YYYY-MM-DDTHH:mm:ss.sssZ` |
| **Valor por defecto** | null (sin límite superior) |

**Descripción**: Filtra comandas creadas hasta la fecha especificada (inclusive).

**Ejemplos**:
```http
# Comandas hasta el 31 de enero
GET /api/v1/atencion-cliente/comandas?date_to=2026-01-31T23:59:59.999Z

# Comandas en un rango de fechas
GET /api/v1/atencion-cliente/comandas?date_from=2026-01-30T00:00:00.000Z&date_to=2026-01-31T00:00:00.000Z
```

---

#### 🔗 Combinación de Filtros

**Ejemplos de Combinaciones**:

```http
# Comandas entregadas hoy
GET /api/v1/atencion-cliente/comandas?status=DELIVERED&date_from=2026-01-31T00:00:00.000Z

# Comandas en cocina de la mesa 8
GET /api/v1/atencion-cliente/comandas?status=COOKING&table_id=8

# Reporte de comandas canceladas en enero
GET /api/v1/atencion-cliente/comandas?status=CANCELLED&date_from=2026-01-01T00:00:00.000Z&date_to=2026-01-31T23:59:59.999Z&limit=100

# Paginación con filtros
GET /api/v1/atencion-cliente/comandas?status=PENDING&page=2&limit=15
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "f0h29j08-9151-8906-f7jg-6g307j00ejc0",
      "table_id": 5,
      "cliente_id": 123,
      "status": "COOKING",
      "notes": "Sin cebolla por favor",
      "created_at": "2026-01-31T13:15:00.000Z",
      "updated_at": "2026-01-31T13:20:00.000Z",
      "items": [
        {
          "id": "g1i30k19-0262-9017-g8kh-7h418k11fkd1",
          "product_id": "a3f85f64-5717-4562-b3fc-2c963f66afa6",
          "quantity": 2,
          "unit_price": 25.50,
          "special_instructions": "Término medio",
          "excluded_recipe_ids": ["b4e96g75-6828-5673-c4gd-3d074g77bgb7"]
        }
      ],
      "table": {
        "table_number": 8
      },
      "cliente": {
        "customer_name": "María González"
      }
    },
    {
      "id": "h2j41l20-1373-0128-h9li-8i529l22glf2",
      "table_id": 12,
      "cliente_id": 124,
      "status": "DELIVERED",
      "notes": null,
      "created_at": "2026-01-31T12:00:00.000Z",
      "updated_at": "2026-01-31T12:35:00.000Z",
      "items": [
        {
          "id": "i3k52m31-2484-1239-i0mj-9j630m33hmg3",
          "product_id": "c5g07i86-7939-6784-d5he-4e185h88cha8",
          "quantity": 1,
          "unit_price": 18.00,
          "special_instructions": null,
          "excluded_recipe_ids": []
        }
      ],
      "table": {
        "table_number": 12
      },
      "cliente": {
        "customer_name": "Carlos Rodríguez"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 6,
    "total_items": 112,
    "items_per_page": 20,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

**Descripción de Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la comanda |
| `table_id` | integer | ID de la mesa asociada |
| `cliente_id` | integer | ID del cliente que ordenó |
| `status` | enum | Estado de la comanda |
| `notes` | string | Notas generales de la comanda |
| `created_at` | ISO DateTime | Fecha de creación de la comanda |
| `updated_at` | ISO DateTime | Última actualización |
| `items` | array | Lista de items/productos de la comanda |
| `items[].id` | UUID | ID del item |
| `items[].product_id` | UUID | ID del producto |
| `items[].quantity` | integer | Cantidad de unidades |
| `items[].unit_price` | decimal | Precio unitario del producto |
| `items[].special_instructions` | string | Instrucciones especiales del item |
| `items[].excluded_recipe_ids` | array | IDs de ingredientes excluidos |
| `table.table_number` | integer | Número de mesa |
| `cliente.customer_name` | string | Nombre del cliente |

---

### 📍 GET /api/v1/atencion-cliente/comandas/:id

**Propósito**: Obtener el detalle completo de una comanda específica con todos sus items.

**Características**:
- ✅ Retorna información completa de la comanda
- ✅ Incluye todos los items con detalles
- ✅ Incluye datos de mesa y cliente
- ✅ Requiere autenticación
- ✅ Guests solo pueden ver sus propias comandas
- ✅ Staff puede ver cualquier comanda

#### 📊 Parámetros

##### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | UUID | ✅ Sí | ID único de la comanda a consultar |

**Validación**: Debe ser un UUID válido.

**Ejemplos**:
```http
# Obtener comanda específica
GET /api/v1/atencion-cliente/comandas/f0h29j08-9151-8906-f7jg-6g307j00ejc0
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "f0h29j08-9151-8906-f7jg-6g307j00ejc0",
    "table_id": 5,
    "cliente_id": 123,
    "status": "COOKING",
    "notes": "Sin cebolla por favor",
    "created_at": "2026-01-31T13:15:00.000Z",
    "updated_at": "2026-01-31T13:20:00.000Z",
    "items": [
      {
        "id": "g1i30k19-0262-9017-g8kh-7h418k11fkd1",
        "product_id": "a3f85f64-5717-4562-b3fc-2c963f66afa6",
        "quantity": 2,
        "unit_price": 25.50,
        "special_instructions": "Término medio",
        "excluded_recipe_ids": ["b4e96g75-6828-5673-c4gd-3d074g77bgb7"],
        "created_at": "2026-01-31T13:15:00.000Z"
      },
      {
        "id": "h2j41l20-1373-0128-h9li-8i529l22glf2",
        "product_id": "d6h18j97-8040-7895-e6if-5f296i99dib9",
        "quantity": 1,
        "unit_price": 12.00,
        "special_instructions": null,
        "excluded_recipe_ids": [],
        "created_at": "2026-01-31T13:15:00.000Z"
      }
    ],
    "table": {
      "id": 5,
      "table_number": 8,
      "capacity": 4,
      "current_status": "OCCUPIED"
    },
    "cliente": {
      "id": 123,
      "customer_name": "María González",
      "customer_dni": "V-23456789",
      "status": "ACTIVE"
    },
    "total_amount": 63.00
  }
}
```

**Respuesta de Error (404 Not Found)**:

```json
{
  "success": false,
  "message": "Comanda no encontrada"
}
```

**Descripción de Campos Adicionales**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `table` | object | Objeto completo con detalles de la mesa |
| `cliente` | object | Objeto completo con detalles del cliente |
| `total_amount` | decimal | Monto total de la comanda (suma de todos los items) |

---

## 🧪 Endpoints de Prueba (Test)

Endpoints de desarrollo para probar los middlewares de autenticación.

> [!WARNING]
> Estos endpoints son solo para **desarrollo y pruebas**. Deben ser **eliminados o deshabilitados** en producción.

---

### 📍 GET /api/v1/atencion-cliente/test-guest

**Propósito**: Endpoint de prueba para verificar que el middleware `verifyGuest` funciona correctamente.

**Características**:
- ✅ Requiere autenticación con token de cliente temporal (Guest)
- ✅ Retorna información del usuario autenticado
- ⚠️ Solo para desarrollo

#### 📊 Parámetros

**Headers Requeridos**:

| Header | Valor | Descripción |
|--------|-------|-------------|
| `Authorization` | `Bearer <token>` | Token JWT de cliente temporal |

**Ejemplo**:
```http
GET /api/v1/atencion-cliente/test-guest
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "message": "✅ verifyGuest funcionó correctamente",
  "user": {
    "id": 123,
    "customer_name": "María González",
    "customer_dni": "V-23456789",
    "table_id": 5,
    "userType": "GUEST"
  }
}
```

**Respuesta de Error (401 Unauthorized)**:

```json
{
  "error": "Token inválido o expirado"
}
```

---

### 📍 GET /api/v1/atencion-cliente/test-staff

**Propósito**: Endpoint de prueba para verificar que el middleware `verifyStaff` funciona correctamente sin validación de permisos específicos.

**Características**:
- ✅ Requiere autenticación con token de personal (Staff)
- ✅ No valida permisos específicos (solo verifica que sea staff)
- ✅ Retorna información del usuario autenticado
- ⚠️ Solo para desarrollo

#### 📊 Parámetros

**Headers Requeridos**:

| Header | Valor | Descripción |
|--------|-------|-------------|
| `Authorization` | `Bearer <token>` | Token JWT de personal |

**Ejemplo**:
```http
GET /api/v1/atencion-cliente/test-staff
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "message": "✅ verifyStaff funcionó correctamente",
  "user": {
    "id": 456,
    "email": "mesero@charlotte.com",
    "name": "Juan Mesero",
    "role": "WAITER",
    "userType": "STAFF"
  }
}
```

**Respuesta de Error (401 Unauthorized)**:

```json
{
  "error": "Token inválido o expirado"
}
```

---

### 📍 GET /api/v1/atencion-cliente/test-staff-permission

**Propósito**: Endpoint de prueba para verificar que el middleware `verifyStaff` funciona correctamente **con validación de permisos específicos**.

**Características**:
- ✅ Requiere autenticación con token de personal (Staff)
- ✅ Valida permisos específicos: `resource: 'Table_atc'`, `method: 'Read'`
- ✅ Retorna información del usuario autenticado
- ⚠️ Solo para desarrollo

#### 📊 Parámetros

**Headers Requeridos**:

| Header | Valor | Descripción |
|--------|-------|-------------|
| `Authorization` | `Bearer <token>` | Token JWT de personal con permisos adecuados |

**Permisos Requeridos**:
- **Resource**: `Table_atc`
- **Method**: `Read`

**Ejemplo**:
```http
GET /api/v1/atencion-cliente/test-staff-permission
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### 📤 Formato de Respuesta

**Respuesta Exitosa (200 OK)**:

```json
{
  "message": "✅ verifyStaff con permisos funcionó correctamente",
  "user": {
    "id": 456,
    "email": "mesero@charlotte.com",
    "name": "Juan Mesero",
    "role": "WAITER",
    "userType": "STAFF",
    "permissions": {
      "Table_atc": ["Create", "Read", "Update", "Delete"]
    }
  }
}
```

**Respuesta de Error (403 Forbidden)**:

```json
{
  "error": "No tienes permisos para acceder a este recurso",
  "required_permission": {
    "resource": "Table_atc",
    "method": "Read"
  }
}
```

---

## 📌 Notas Generales

### Autenticación

La API utiliza dos tipos de autenticación mediante tokens JWT:

1. **Guest Token**: Para clientes temporales que escanearon el QR
   - Generado al crear una sesión (`POST /clients`)
   - Limitado a operaciones de su propia sesión
   - Expira al cerrar la sesión

2. **Staff Token**: Para personal del restaurante
   - Generado por el sistema de autenticación central
   - Permisos basados en roles (Waiter, Manager, Admin)
   - Acceso completo según permisos asignados

**Formato del Header**:
```http
Authorization: Bearer <token_jwt>
```

### Manejo de Errores

Todos los endpoints siguen un formato consistente de respuesta de error:

```json
{
  "error": "Mensaje descriptivo del error",
  "message": "Detalles adicionales (opcional)"
}
```

**Códigos HTTP Comunes**:
- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Error de validación de datos
- `401 Unauthorized` - No autenticado o token inválido
- `403 Forbidden` - Sin permisos para la operación
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto con el estado actual
- `500 Internal Server Error` - Error interno del servidor

### Paginación

Los endpoints con paginación devuelven metadata adicional:

```json
{
  "meta": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 96,
    "items_per_page": 20,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

### Formatos de Fecha

Todas las fechas utilizan el formato **ISO 8601**:

```
YYYY-MM-DDTHH:mm:ss.sssZ
```

Ejemplo: `2026-01-31T14:25:30.123Z`

### Validación de UUIDs

Los IDs de tipo UUID deben cumplir con el formato estándar:

```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Ejemplo: `a3f85f64-5717-4562-b3fc-2c963f66afa6`

---

## 🎯 Resumen de Endpoints

| Endpoint | Método | Autenticación | Propósito |
|----------|--------|---------------|-----------|
| `/tables` | GET | Pública | Listar todas las mesas con filtros |
| `/tables/:id` | GET | Pública | Obtener detalle de mesa específica |
| `/clients` | GET | Guest/Staff | Listar clientes temporales con filtros |
| `/clients/active` | GET | Guest/Staff | Listar clientes activos con consumo en tiempo real |
| `/clients/:id` | GET | Guest/Staff | Obtener detalle de cliente específico |
| `/service-requests` | GET | Guest/Staff | Listar solicitudes de servicio con filtros |
| `/service-requests/:id` | GET | Guest/Staff | Obtener detalle de solicitud específica |
| `/comandas` | GET | Guest/Staff | Listar comandas/órdenes con filtros |
| `/comandas/:id` | GET | Guest/Staff | Obtener detalle de comanda específica |
| `/test-guest` | GET | Guest | **[TEST]** Verificar middleware Guest |
| `/test-staff` | GET | Staff | **[TEST]** Verificar middleware Staff |
| `/test-staff-permission` | GET | Staff | **[TEST]** Verificar middleware Staff con permisos |

---

**Documentación generada el**: 2026-02-01  
**Versión del API**: v1  
**Base URL**: `/api/v1/atencion-cliente`

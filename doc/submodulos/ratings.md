# Submódulo: Calificaciones (Ratings)

Este documento describe los endpoints del submódulo de calificaciones de meseros y clientes en `charlotte-atencion-cliente`, sus parámetros y respuestas.

Base de rutas: `/ratings`.

## Endpoints

### 1) Crear calificación para una sesión de cliente
- **Método/URL**: `POST /ratings/clients/:id`
- **Auth**: `verifyGuestOrStaff` + `ensureOwnership('clienteTemporal')`
- **Path params**:
  - `id` (number): ID de `ClienteTemporal`.
- **Body (JSON)**:
  - `score` (int, 0–5, requerido): Calificación.
  - `comment` (string, opcional, max 300): Comentario.
  - `waiter_id` (uuid, opcional): Mesero específico si no quedó registrado en el cierre.
  - `for_all` (boolean, opcional): Si es true, aplica la misma calificación a todos los meseros que atendieron esa sesión.
- **Respuestas**:
  - 201: `{ success: true, data: Rating | Rating[] }`
  - 400: Errores de validación (id/score/etc) o `WAITER_NOT_ASSIGNED`.
  - 404: `CLIENT_NOT_FOUND`.
  - 409: `ALREADY_RATED` (si existiera lógica de duplicidad en cierto flujo).

**Ejemplos de respuesta**

- Único mesero:

```json
{
  "success": true,
  "data": {
    "id": 987,
    "clienteId": 123,
    "waiterId": "b3f9f5f0-1a2b-4c3d-8e9f-0123456789ab",
    "score": 5,
    "comment": "Excelente atención",
    "createdAt": "2026-02-02T12:34:56.000Z"
  }
}
```

- Para todos los meseros que atendieron (`for_all: true`):

```json
{
  "success": true,
  "data": [
    {
      "id": 988,
      "clienteId": 123,
      "waiterId": "b3f9f5f0-1a2b-4c3d-8e9f-0123456789ab",
      "score": 4,
      "comment": null,
      "createdAt": "2026-02-02T12:35:01.000Z"
    },
    {
      "id": 989,
      "clienteId": 123,
      "waiterId": "c4e0a2c1-2b3c-4d5e-9f01-abcdef012345",
      "score": 4,
      "comment": null,
      "createdAt": "2026-02-02T12:35:01.000Z"
    }
  ]
}
```

### 2) Listado simple de calificaciones
- **Método/URL**: `GET /ratings/`
- **Query**:
  - `waiter_id` (uuid, opcional): Filtra por mesero.
  - `from` (ISO date string, opcional): Fecha mínima (inclusiva).
  - `to` (ISO date string, opcional): Fecha máxima (inclusiva; se normaliza a 23:59:59 del día).
- **Respuestas**:
  - 200: `{ success: true, data: Rating[] }`

**Ejemplo de respuesta**

```json
{
  "success": true,
  "data": [
    {
      "id": 1001,
      "clienteId": 321,
      "waiterId": "b3f9f5f0-1a2b-4c3d-8e9f-0123456789ab",
      "score": 5,
      "comment": "Genial",
      "createdAt": "2026-02-01T18:20:10.000Z"
    },
    {
      "id": 1002,
      "clienteId": 322,
      "waiterId": "c4e0a2c1-2b3c-4d5e-9f01-abcdef012345",
      "score": 3,
      "comment": null,
      "createdAt": "2026-02-01T19:05:44.000Z"
    }
  ]
}
```

### 3) Resumen (métricas agregadas)
- **Método/URL**: `GET /ratings/summary`
- **Query**: Igual a listado simple (`waiter_id`, `from`, `to`).
- **Respuestas**:
  - 200: `{ success: true, data: { count: number, average: number, distribution: { 0..5: number } } }`

**Ejemplo de respuesta**

```json
{
  "success": true,
  "data": {
    "count": 42,
    "average": 4.2,
    "distribution": {
      "0": 0,
      "1": 1,
      "2": 3,
      "3": 8,
      "4": 15,
      "5": 15
    }
  }
}
```

### 4) Meseros que atendieron una sesión
- **Método/URL**: `GET /ratings/clients/:id/waiters`
- **Path params**:
  - `id` (number): ID de `ClienteTemporal`.
- **Respuestas**:
  - 200: `{ success: true, data: string[] }` // Lista de UUIDs de meseros.

**Ejemplo de respuesta**

```json
{
  "success": true,
  "data": [
    "b3f9f5f0-1a2b-4c3d-8e9f-0123456789ab",
    "c4e0a2c1-2b3c-4d5e-9f01-abcdef012345"
  ]
}
```

### 5) Calificaciones agrupadas por mesero (paginadas)
- **Método/URL**: `GET /ratings/by-waiter`
- **Query**:
  - `page` (int, opcional, default 1)
  - `page_size` (int, opcional, default 10, max 100)
  - `recent_count` (int, opcional, default 10, max 50)
  - `granularity` (string, opcional): `global | daily | weekly`
  - `from` (ISO date string, opcional)
  - `to` (ISO date string, opcional)
- **Comportamiento**:
  - Siempre incluye `stats` por mesero: `{ count, average, lastRatingAt }` y `recentRatings` (limitado por `recent_count`).
  - Si `granularity` = `daily` o `weekly`, añade `buckets`: `[{ bucket: 'YYYY-MM-DD', count, average }]` agrupado por día o por semana (semana iniciando lunes).
  - Enriquecimiento de mesero vía Cocina (best-effort): `name`, `email`, `role`.
- **Respuestas**:
  - 200: `{ success: true, page, page_size, total_waiters, data: [{ waiter, stats, buckets?, recentRatings }] }`

**Ejemplo de respuesta (granularity = daily)**

```json
{
  "success": true,
  "page": 1,
  "page_size": 10,
  "total_waiters": 25,
  "data": [
    {
      "waiter": {
        "id": "b3f9f5f0-1a2b-4c3d-8e9f-0123456789ab",
        "name": "Juan Pérez",
        "email": "juan.perez@example.com",
        "role": "mesero"
      },
      "stats": {
        "count": 12,
        "average": 4.5,
        "lastRatingAt": "2026-02-01T20:11:00.000Z"
      },
      "buckets": [
        { "bucket": "2026-01-29", "count": 3, "average": 4.33 },
        { "bucket": "2026-01-30", "count": 5, "average": 4.60 },
        { "bucket": "2026-01-31", "count": 4, "average": 4.50 }
      ],
      "recentRatings": [
        {
          "id": 1010,
          "clienteId": 350,
          "score": 5,
          "comment": "Excelente",
          "createdAt": "2026-02-01T22:30:00.000Z"
        },
        {
          "id": 1009,
          "clienteId": 349,
          "score": 4,
          "comment": null,
          "createdAt": "2026-02-01T21:15:00.000Z"
        }
      ]
    }
  ]
}
```

**Ejemplo de respuesta (granularity = global)**
```json
{
  "success": true,
  "page": 1,
  "page_size": 10,
  "total_waiters": 3,
  "data": [
    {
      "waiter": {
        "id": "2ac9116f-2764-4bb3-ac7d-7ac154fc09bb"
      },
      "stats": {
        "count": 1,
        "average": 3,
        "lastRatingAt": "2026-02-02T18:10:01.733Z"
      },
      "recentRatings": [
        {
          "id": "e6aa2cd7-11b4-42a1-8d4e-ff72c3cc836f",
          "clienteId": 147,
          "score": 3,
          "comment": "",
          "createdAt": "2026-02-02T18:10:01.733Z"
        }
      ]
    },
    {
      "waiter": {
        "id": "665fcdd8-f54a-4b53-b758-67b4fad83e18"
      },
      "stats": {
        "count": 2,
        "average": 4.5,
        "lastRatingAt": "2026-02-02T18:15:01.331Z"
      },
      "recentRatings": [
        {
          "id": "6fb99e29-9457-4ce8-a68e-edb22734c647",
          "clienteId": 148,
          "score": 5,
          "comment": "",
          "createdAt": "2026-02-02T18:15:01.331Z"
        },
        {
          "id": "57b6d77c-0984-409a-8e7a-99b427814542",
          "clienteId": 145,
          "score": 4,
          "comment": "Muy buen servicio",
          "createdAt": "2026-02-02T15:27:26.472Z"
        }
      ]
    },
    {
      "waiter": {
        "id": "c541f56b-9ba5-4e3d-8e1a-ec64568c8e9a"
      },
      "stats": {
        "count": 1,
        "average": 5,
        "lastRatingAt": "2026-02-02T18:15:01.383Z"
      },
      "recentRatings": [
        {
          "id": "8055a39d-89e4-47b5-abd6-68a541ca7e25",
          "clienteId": 148,
          "score": 5,
          "comment": "",
          "createdAt": "2026-02-02T18:15:01.383Z"
        }
      ]
    }
  ]
}
```

### 6) Listado paginado de calificaciones (incluye datos esenciales del cliente)
- **Método/URL**: `GET /ratings/paged`
- **Query**:
  - `page` (int, opcional, default 1)
  - `page_size` (int, opcional, default 10, max 100)
  - `waiter_id` (uuid, opcional)
  - `from` (ISO date string, opcional)
  - `to` (ISO date string, opcional)
  - `order_by` (string, opcional): `createdAt | score` (default `createdAt`)
  - `direction` (string, opcional): `asc | desc` (default `desc`)
- **Respuestas**:
  - 200: `{ success: true, page, page_size, total, data: [{ id, waiterId, score, comment, createdAt, cliente: { id, customerName, customerDni } }] }`

**Ejemplo de respuesta**

```json
{
  "success": true,
  "page": 1,
  "page_size": 20,
  "total": 87,
  "data": [
    {
      "id": 1001,
      "waiterId": "b3f9f5f0-1a2b-4c3d-8e9f-0123456789ab",
      "score": 4,
      "comment": "Bien",
      "createdAt": "2026-02-01T17:45:00.000Z",
      "cliente": {
        "id": 123,
        "customerName": "Ana García",
        "customerDni": "12345678"
      }
    }
  ]
}
```

### 7) Serie temporal (diaria o semanal)
- **Método/URL**: `GET /ratings/timeseries`
- **Query**:
  - `granularity` (enum, requerido): `daily | weekly`
  - `waiter_id` (uuid, opcional)
  - `from` (ISO date string, opcional)
  - `to` (ISO date string, opcional)
- **Respuestas**:
  - 200: `{ success: true, granularity, data: [{ bucket: ISODate, count: number, average: number }] }`

**Ejemplo de respuesta (weekly)**

```json
{
  "success": true,
  "granularity": "weekly",
  "data": [
    { "bucket": "2026-01-26T00:00:00.000Z", "count": 12, "average": 4.2 },
    { "bucket": "2026-02-02T00:00:00.000Z", "count": 8, "average": 4.5 }
  ]
}
```

## Ejemplos

### Crear calificación (único mesero conocido)
```bash
curl -X POST \
  "$BASE_URL/ratings/clients/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "score": 5,
    "comment": "Excelente atención"
  }'
```

### Crear calificación para todos los meseros que atendieron
```bash
curl -X POST \
  "$BASE_URL/ratings/clients/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "score": 4,
    "for_all": true
  }'
```

### Agrupado por mesero con buckets diarios
```bash
curl -X GET "$BASE_URL/ratings/by-waiter?granularity=daily&from=2026-01-01&to=2026-02-01&page=1&page_size=10"
```

### Listado paginado ordenado por puntaje ascendente
```bash
curl -X GET "$BASE_URL/ratings/paged?order_by=score&direction=asc&page=1&page_size=20"
```

### Serie semanal para un mesero
```bash
curl -X GET "$BASE_URL/ratings/timeseries?granularity=weekly&waiter_id=UUID-MESERO&from=2026-01-01&to=2026-02-01"
```

## Referencias de código
- Rutas: [src/routes/submodulos/ratings.route.js](../../src/routes/submodulos/ratings.route.js)
- Controladores: [src/controllers/submodulos/ratings.controller.js](../../src/controllers/submodulos/ratings.controller.js)
- Schemas/validación: [src/schemas/submodulos/ratings.schema.js](../../src/schemas/submodulos/ratings.schema.js)
- Servicio: [src/services/submodulos/ratings.service.js](../../src/services/submodulos/ratings.service.js)

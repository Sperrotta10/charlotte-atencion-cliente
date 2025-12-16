# 📋 Changelog: Implementación del Endpoint GET /tables (Obtener Todas las Mesas)

## 🎯 Objetivo

Implementar el endpoint **GET `/api/v1/atencion-cliente/tables`** para obtener todas las mesas con paginación, filtrado opcional por estado y cálculo de sesiones activas. Este endpoint es consumido por el Módulo de Interfaces (Dashboard Admin) o Módulo de Cocina (Asignación).

---

## 📝 Archivos Modificados

### 1. `src/schemas/submodulos/tables.schema.js`

**Ubicación**: `src/schemas/submodulos/`

**Estado anterior**: Solo contenía el esquema `createTableSchema` para validar la creación de mesas.

**¿Por qué se modificó?**
- Este archivo ya existía y contenía la validación para POST `/tables`.
- Se añadió un nuevo esquema de validación para los query parameters del endpoint GET `/tables`.
- Mantiene la consistencia: todas las validaciones relacionadas con mesas están en el mismo archivo.
- Sigue la convención del proyecto: los schemas de validación van en `src/schemas/submodulos/`.

**Cambios realizados**:
- **Añadido**: Esquema `getTablesQuerySchema` que valida los query parameters:
  - `page`: número entero positivo (opcional, default: 1).
  - `limit`: número entero positivo (opcional, default: 20).
  - `status`: enum opcional (`AVAILABLE` u `OCCUPIED`).
- **Técnica utilizada**: `z.preprocess()` para establecer valores por defecto cuando los parámetros no están presentes.
- **Transformación**: Convierte strings (como vienen en query params) a números enteros.

**Precondiciones**:
- La librería `zod` debe estar instalada (`package.json` ya la incluye).
- El archivo `tables.schema.js` debe existir (ya existía de la implementación anterior).

**Postcondiciones**:
- El esquema `getTablesQuerySchema` está disponible para importar en controladores.
- Valida y transforma los query parameters antes de llegar a la lógica de negocio.
- Si `page` o `limit` no están presentes, asigna valores por defecto (1 y 20 respectivamente).
- Si `status` no está presente, se omite del filtro (no es requerido).

---

### 2. `src/services/submodulos/tables.service.js`

**Ubicación**: `src/services/submodulos/`

**Estado anterior**: Solo contenía la función `createTable` para crear nuevas mesas.

**¿Por qué se modificó?**
- Este archivo ya existía y contenía la lógica de negocio para crear mesas.
- Se añadió una nueva función de servicio para obtener todas las mesas con paginación.
- Mantiene la consistencia: toda la lógica de negocio relacionada con mesas está en el mismo archivo.
- Sigue el patrón establecido: los servicios contienen la lógica de negocio pura (sin conocimiento de HTTP).

**Cambios realizados**:
- **Añadido**: Función `getAllTables({ page, limit, status })` que implementa:
  - **Paso 1**: Calcula el offset usando la fórmula: `(page - 1) * limit`.
  - **Paso 2**: Construye el filtro `where` condicionalmente:
    - Si `status` está presente, aplica `WHERE current_status = status`.
    - Si no está presente, no aplica filtro (obtiene todas las mesas).
  - **Paso 3**: Obtiene el total de items con `prisma.table.count({ where })` para los metadatos.
  - **Paso 4**: Consulta las mesas con paginación usando `findMany`:
    - Aplica `skip` y `take` para la paginación.
    - Ordena por `tableNumber` ascendente.
    - Incluye la relación `clientes` filtrada por `status: 'ACTIVE'` para calcular sesiones activas.
  - **Paso 5**: Formatea las mesas mapeando los campos:
    - Convierte nombres de Prisma (`tableNumber`, `qrUuid`, `currentStatus`) a formato snake_case (`table_number`, `qr_uuid`, `current_status`).
    - Calcula `active_sessions` contando el array de `clientes` activos.
  - **Paso 6**: Calcula metadatos de paginación:
    - `total_items`: total de mesas (con filtro aplicado si existe).
    - `current_page`: página actual.
    - `per_page`: límite de items por página.
    - `total_pages`: calculado con `Math.ceil(totalItems / limit)`.
  - **Retorna**: Objeto con `tables` (array formateado) y `metadata` (objeto con información de paginación).

**Precondiciones**:
- Prisma Client debe estar generado (`npx prisma generate`).
- La tabla `tables` debe existir en la BD (modelo `Table` en `schema.prisma`).
- La tabla `cliente_temporal` debe existir en la BD (modelo `ClienteTemporal` en `schema.prisma`).
- La relación entre `Table` y `ClienteTemporal` debe estar definida en el schema Prisma.
- La conexión a la BD debe estar configurada (`DATABASE_URL` en `.env`).

**Postcondiciones**:
- La función retorna un objeto con la estructura:
  ```javascript
  {
    tables: [...], // Array de mesas formateadas
    metadata: {
      total_items: number,
      current_page: number,
      per_page: number,
      total_pages: number
    }
  }
  ```
- Cada mesa en el array incluye el campo calculado `active_sessions`.
- Los metadatos permiten al cliente implementar navegación de paginación.

---

### 3. `src/controllers/submodulos/tables.controller.js`

**Ubicación**: `src/controllers/submodulos/`

**Estado anterior**: Solo contenía la función `createTable` para manejar peticiones POST.

**¿Por qué se modificó?**
- Este archivo ya existía y contenía el controlador para crear mesas.
- Se añadió un nuevo controlador para manejar peticiones GET `/tables`.
- Mantiene la consistencia: todos los controladores relacionados con mesas están en el mismo archivo.
- Sigue el patrón establecido: los controladores orquestan las peticiones HTTP (reciben `req`, `res`).

**Cambios realizados**:
- **Añadido**: Importación de `getTablesQuerySchema` desde el schema.
- **Añadido**: Función `getTables(req, res)` que implementa:
  - **Paso 1**: Valida `req.query` con `getTablesQuerySchema.safeParse()`.
  - **Paso 2**: Si la validación falla → responde `400 Bad Request` con errores de Zod.
  - **Paso 3**: Llama a `tablesService.getAllTables(validation.data)`.
  - **Paso 4**: Formatea la respuesta según especificación:
    ```json
    {
      "success": true,
      "data": [...],
      "metadata": {...}
    }
    ```
  - **Paso 5**: Responde `200 OK` con el JSON formateado.
  - **Manejo de errores**:
    - Errores de validación → `400 Bad Request`.
    - Otros errores → `500 Internal Server Error` con log en consola.

**Precondiciones**:
- El servicio `tables.service.js` debe existir y exportar `getAllTables`.
- El schema `tables.schema.js` debe existir y exportar `getTablesQuerySchema`.
- Express debe estar instalado.

**Postcondiciones**:
- El endpoint responde con código HTTP `200 OK` cuando la petición es exitosa.
- La respuesta cumple exactamente con el formato especificado en el requerimiento.
- Los errores de validación se manejan apropiadamente con código `400 Bad Request`.
- Los errores internos se manejan con código `500 Internal Server Error`.

---

### 4. `src/routes/submodulos/tables.route.js`

**Ubicación**: `src/routes/submodulos/`

**Estado anterior**: Solo contenía la ruta POST `/` para crear mesas.

**¿Por qué se modificó?**
- Este archivo ya existía y contenía la ruta POST para crear mesas.
- Se añadió una nueva ruta GET `/` para obtener todas las mesas.
- Mantiene la consistencia: todas las rutas relacionadas con mesas están en el mismo archivo.
- Sigue el patrón establecido: las rutas definen los endpoints HTTP y conectan con controladores.

**Cambios realizados**:
- **Añadido**: Ruta `router.get('/', tablesController.getTables)` antes de la ruta POST.
- **Orden de rutas**: GET se coloca antes de POST siguiendo convenciones REST (operaciones de lectura antes de escritura).

**Precondiciones**:
- El controlador `tables.controller.js` debe existir y exportar `getTables`.
- Express debe estar instalado.
- El router debe estar montado en `main.route.js` (ya estaba montado).

**Postcondiciones**:
- La ruta GET `/tables` está disponible cuando se monte el router.
- La ruta completa será: `GET /api/v1/atencion-cliente/tables`.
- El endpoint acepta query parameters: `page`, `limit`, `status`.

---

## 🔄 Flujo Completo de una Petición

```
1. Cliente (Thunder Client/Postman)
   ↓ GET /api/v1/atencion-cliente/tables?page=1&limit=20&status=AVAILABLE
   ↓ Query Params: page=1, limit=20, status=AVAILABLE

2. src/index.js
   ↓ Monta: /api/v1/atencion-cliente → mainAtencionClienteRoutes

3. src/routes/main.route.js
   ↓ Monta: /tables → tablesRoutes

4. src/routes/submodulos/tables.route.js
   ↓ GET / → tablesController.getTables

5. src/controllers/submodulos/tables.controller.js
   ↓ Valida req.query con getTablesQuerySchema (Zod)
   ↓ Si válido → llama a tablesService.getAllTables()
   ↓ Formatea respuesta y responde 200 OK

6. src/services/submodulos/tables.service.js
   ↓ Calcula offset: (page - 1) * limit
   ↓ Construye filtro where (si status está presente)
   ↓ Obtiene total_items con prisma.table.count()
   ↓ Consulta mesas con prisma.table.findMany() + include clientes activos
   ↓ Formatea mesas con active_sessions calculado
   ↓ Calcula metadatos de paginación
   ↓ Retorna { tables, metadata }
```

---

## 📊 Estructura de la Respuesta

### ✅ Caso Exitoso (200 OK)

**Request**:
```http
GET /api/v1/atencion-cliente/tables?page=1&limit=20&status=AVAILABLE
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "table_number": 1,
      "qr_uuid": "qr-mesa-1",
      "capacity": 2,
      "current_status": "AVAILABLE",
      "active_sessions": 0
    },
    {
      "id": 2,
      "table_number": 2,
      "qr_uuid": "qr-mesa-2",
      "capacity": 4,
      "current_status": "OCCUPIED",
      "active_sessions": 3
    }
  ],
  "metadata": {
    "total_items": 25,
    "current_page": 1,
    "per_page": 20,
    "total_pages": 2
  }
}
```

---

### ✅ Caso: Sin Query Params (Valores por Defecto)

**Request**:
```http
GET /api/v1/atencion-cliente/tables
```

**Comportamiento**:
- `page` se establece en `1` (default).
- `limit` se establece en `20` (default).
- `status` se omite (no se aplica filtro).

**Response**: Similar al caso exitoso, pero sin filtro de status.

---

### ✅ Caso: Solo Paginación

**Request**:
```http
GET /api/v1/atencion-cliente/tables?page=2&limit=10
```

**Comportamiento**:
- Muestra la página 2.
- Máximo 10 items por página.
- No aplica filtro de status.

---

### ✅ Caso: Solo Filtro por Status

**Request**:
```http
GET /api/v1/atencion-cliente/tables?status=OCCUPIED
```

**Comportamiento**:
- `page` se establece en `1` (default).
- `limit` se establece en `20` (default).
- Solo muestra mesas con `current_status: "OCCUPIED"`.

---

### ❌ Casos de Error

#### 1. Validación Fallida - Página Inválida (400 Bad Request)

**Request**:
```http
GET /api/v1/atencion-cliente/tables?page=0
```

**Response**:
```json
{
  "errors": {
    "page": {
      "_errors": ["La página debe ser mayor a 0"]
    }
  }
}
```

#### 2. Validación Fallida - Límite Inválido (400 Bad Request)

**Request**:
```http
GET /api/v1/atencion-cliente/tables?limit=-5
```

**Response**:
```json
{
  "errors": {
    "limit": {
      "_errors": ["El límite debe ser mayor a 0"]
    }
  }
}
```

#### 3. Validación Fallida - Status Inválido (400 Bad Request)

**Request**:
```http
GET /api/v1/atencion-cliente/tables?status=INVALID
```

**Response**:
```json
{
  "errors": {
    "status": {
      "_errors": ["El status debe ser AVAILABLE u OCCUPIED"]
    }
  }
}
```

#### 4. Error Interno (500 Internal Server Error)

**Causa**: Error inesperado (BD desconectada, error de Prisma, etc.)

**Response**:
```json
{
  "error": "Error interno del servidor"
}
```

---

## ✅ Validaciones Implementadas

### Schema (Zod) - `getTablesQuerySchema`

1. **`page`**:
   - ✅ Se recibe como string (query params son strings).
   - ✅ Se transforma a número entero.
   - ✅ Debe ser positivo (> 0).
   - ✅ Valor por defecto: `1` si no está presente.

2. **`limit`**:
   - ✅ Se recibe como string (query params son strings).
   - ✅ Se transforma a número entero.
   - ✅ Debe ser positivo (> 0).
   - ✅ Valor por defecto: `20` si no está presente.

3. **`status`**:
   - ✅ Debe ser uno de: `AVAILABLE` u `OCCUPIED`.
   - ✅ Campo opcional (no es requerido).
   - ✅ Si no está presente, no se aplica filtro.

### Servicio - `getAllTables`

1. **Cálculo de offset**:
   - ✅ Usa la fórmula: `(page - 1) * limit`.
   - ✅ Ejemplo: página 2 con límite 10 → offset = 10.

2. **Filtrado condicional**:
   - ✅ Si `status` está presente, aplica `WHERE current_status = status`.
   - ✅ Si `status` no está presente, obtiene todas las mesas sin filtro.

3. **Cálculo de sesiones activas**:
   - ✅ Incluye relación `clientes` filtrada por `status: 'ACTIVE'`.
   - ✅ Cuenta el array de clientes activos para cada mesa.
   - ✅ Retorna `active_sessions` como número entero (puede ser 0 o más).

4. **Metadatos de paginación**:
   - ✅ `total_items`: cuenta total con filtro aplicado.
   - ✅ `current_page`: página actual.
   - ✅ `per_page`: límite de items por página.
   - ✅ `total_pages`: calculado con `Math.ceil(totalItems / limit)`.

---

## 🔧 Dependencias Utilizadas

- **Express**: Framework web (ya instalado).
- **Prisma**: ORM para interactuar con la BD (ya instalado).
- **Zod**: Validación de esquemas (ya instalado).
- **Node.js nativo**: No requiere dependencias adicionales.

---

## 📋 Checklist de Verificación

- [x] Schema de validación para query params añadido (`getTablesQuerySchema`).
- [x] Servicio de negocio `getAllTables` implementado.
- [x] Controlador HTTP `getTables` creado.
- [x] Ruta GET `/tables` añadida en `tables.route.js`.
- [x] Paginación implementada con fórmula `(page - 1) * limit`.
- [x] Filtro opcional por `status` implementado.
- [x] Campo calculado `active_sessions` implementado.
- [x] Metadatos de paginación calculados correctamente.
- [x] Formato de respuesta según especificación.
- [x] Manejo de errores con códigos HTTP apropiados.
- [x] Valores por defecto para `page` (1) y `limit` (20).
- [x] Transformación de query params (strings) a números.

---

## 🚀 Cómo Probar

1. **Levantar el servidor**:
   ```bash
   npm run dev
   ```

2. **Probar con Thunder Client/Postman**:
   - **Método**: GET
   - **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables`
   - **Query Params** (opcionales):
     - `page`: `1`
     - `limit`: `20`
     - `status`: `AVAILABLE` o `OCCUPIED`

3. **Resultado esperado**:
   - Status: `200 OK`
   - Body: JSON con estructura `{ success, data, metadata }`

4. **Casos de prueba recomendados**:
   - Sin query params (valores por defecto).
   - Con paginación (`page=2&limit=10`).
   - Con filtro de status (`status=OCCUPIED`).
   - Combinación de ambos (`page=1&limit=5&status=AVAILABLE`).
   - Validación de errores (`page=0`, `status=INVALID`).

---

## 📝 Notas Adicionales

- **Campo `active_sessions`**: Este campo se calcula contando los registros de `ClienteTemporal` con `status: 'ACTIVE'` asociados a cada mesa. Si no hay clientes activos, el valor será `0`.

- **Paginación**: La paginación funciona correctamente incluso cuando hay filtros aplicados. El `total_items` en los metadatos refleja el total después de aplicar el filtro.

- **Ordenamiento**: Las mesas se ordenan por `tableNumber` ascendente para mantener consistencia en la visualización.

- **Query Params como Strings**: Express recibe los query parameters como strings, por lo que el schema utiliza `z.preprocess()` y `transform()` para convertirlos a números antes de validar.

- **Compatibilidad**: Esta implementación no rompe la funcionalidad existente del endpoint POST `/tables`. Ambos endpoints coexisten en el mismo archivo de rutas.

---

## 🎓 Arquitectura Respetada

Esta implementación sigue estrictamente el patrón arquitectónico del proyecto:

- **Routes**: Definen endpoints HTTP (GET `/tables`).
- **Controllers**: Orquestan peticiones, validan query params y formatean respuestas.
- **Services**: Contienen lógica de negocio pura (paginación, filtrado, cálculo de sesiones activas).
- **Schemas**: Validan estructura y tipos de query parameters (Zod).
- **Prisma**: Interactúa con la base de datos (consultas paginadas, conteos, relaciones).

Cada capa tiene responsabilidades claras y separadas, facilitando el mantenimiento y la escalabilidad del código.

---

## 🔍 Diferencias con POST /tables

| Aspecto | POST /tables | GET /tables |
|---------|--------------|------------|
| **Método HTTP** | POST | GET |
| **Input** | Body (JSON) | Query Params |
| **Validación** | `createTableSchema` | `getTablesQuerySchema` |
| **Servicio** | `createTable()` | `getAllTables()` |
| **Respuesta** | Mesa creada | Lista de mesas + metadatos |
| **Código HTTP** | 201 Created | 200 OK |
| **Lógica** | Crear nueva mesa | Consultar mesas existentes |

---

**Fecha de implementación**: 2024  
**Autor**: Implementación siguiendo especificaciones del requerimiento 1.1.2  
**Versión**: 1.0.0


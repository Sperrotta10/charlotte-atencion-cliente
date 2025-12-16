# 📋 Changelog: Implementación del Endpoint POST /tables/verify-qr (Verificar Código QR)

## 🎯 Objetivo

Implementar el endpoint **POST `/api/v1/atencion-cliente/tables/verify-qr`** para verificar códigos QR escaneados por clientes y determinar si pueden iniciar una nueva sesión o unirse a una sesión existente. Este endpoint es consumido por el Módulo de Interfaces (Vista Cliente - Escaneo Inicial).

---

## 📝 Archivos Modificados

### 1. `src/schemas/submodulos/tables.schema.js`

**Ubicación**: `src/schemas/submodulos/`

**Estado anterior**: Contenía los esquemas `createTableSchema` y `getTablesQuerySchema` para validar la creación de mesas y los query parameters del endpoint GET `/tables`.

**¿Por qué se modificó?**
- Este archivo ya existía y contenía las validaciones para POST `/tables` y GET `/tables`.
- Se añadió un nuevo esquema de validación para el body del endpoint POST `/tables/verify-qr`.
- Mantiene la consistencia: todas las validaciones relacionadas con mesas están en el mismo archivo.
- Sigue la convención del proyecto: los schemas de validación van en `src/schemas/submodulos/`.
- Centraliza todas las validaciones de entrada para los endpoints relacionados con mesas.

**Cambios realizados**:
- **Añadido**: Esquema `verifyQrSchema` que valida el body de la petición:
  - `qr_uuid`: string requerido, no puede estar vacío.
  - Valida que el campo sea de tipo string y tenga al menos 1 carácter.
  - Proporciona mensajes de error descriptivos en español.
- **Técnica utilizada**: Validación con Zod usando `.string()`, `.min(1)` y mensajes personalizados.
- **Mensajes de error**:
  - `required_error`: "El qr_uuid es requerido"
  - `invalid_type_error`: "El qr_uuid debe ser un string"
  - `min(1)`: "El qr_uuid no puede estar vacío"

**Precondiciones**:
- La librería `zod` debe estar instalada (`package.json` ya la incluye).
- El archivo `tables.schema.js` debe existir (ya existía de implementaciones anteriores).
- El esquema debe exportarse correctamente para ser importado en controladores.

**Postcondiciones**:
- El esquema `verifyQrSchema` está disponible para importar en controladores.
- Valida que el body de la petición contenga un `qr_uuid` válido antes de llegar a la lógica de negocio.
- Si el `qr_uuid` falta o es inválido, retorna errores de validación estructurados de Zod.
- El esquema es reutilizable y mantiene consistencia con otros esquemas del proyecto.

---

### 2. `src/services/submodulos/tables.service.js`

**Ubicación**: `src/services/submodulos/`

**Estado anterior**: Contenía las funciones `createTable` y `getAllTables` para crear mesas y obtener todas las mesas con paginación.

**¿Por qué se modificó?**
- Este archivo ya existía y contenía la lógica de negocio para operaciones con mesas.
- Se añadió una nueva función de servicio para verificar códigos QR y determinar la acción del cliente.
- Mantiene la consistencia: toda la lógica de negocio relacionada con mesas está en el mismo archivo.
- Sigue el patrón establecido: los servicios contienen la lógica de negocio pura (sin conocimiento de HTTP).
- Implementa todas las reglas de negocio críticas especificadas en el requerimiento.

**Cambios realizados**:
- **Añadido**: Función `verifyQr({ qr_uuid })` que implementa la lógica de negocio completa:
  - **Paso 1**: Busca la mesa por `qr_uuid` usando `prisma.table.findUnique()`.
    - Incluye la relación `clientes` filtrada por `status: 'ACTIVE'` para contar sesiones activas.
    - Solo selecciona el campo `id` de los clientes para optimizar la consulta.
  - **Paso 2**: Valida si la mesa existe.
    - Si no existe → lanza error con código `TABLE_NOT_FOUND`.
  - **Paso 3**: Valida el estado de la mesa.
    - Si `currentStatus == 'OUT_OF_SERVICE'` → lanza error con código `TABLE_OUT_OF_SERVICE`.
  - **Paso 4**: Evalúa el estado `AVAILABLE`.
    - Si `currentStatus == 'AVAILABLE'` → retorna `action: "NEW_SESSION"`.
  - **Paso 5**: Evalúa el estado `OCCUPIED`.
    - Cuenta las sesiones activas usando `table.clientes.length`.
    - Si `sesiones_activas >= table.capacity` → lanza error con código `TABLE_FULL`.
    - Si hay cupo disponible → retorna `action: "JOIN_SESSION"`.
  - **Retorna**: Objeto con `table_id`, `table_number` y `action` según el caso.
- **Manejo de errores**: Utiliza códigos de error personalizados (`error.code`) para que el controlador pueda mapearlos a códigos HTTP apropiados.
- **Optimización**: La consulta incluye solo los datos necesarios (clientes activos) para evitar cargar información innecesaria.

**Precondiciones**:
- Prisma Client debe estar generado (`npx prisma generate`).
- La tabla `tables` debe existir en la BD (modelo `Table` en `schema.prisma`).
- La tabla `cliente_temporal` debe existir en la BD (modelo `ClienteTemporal` en `schema.prisma`).
- La relación entre `Table` y `ClienteTemporal` debe estar definida en el schema Prisma.
- La conexión a la BD debe estar configurada (`DATABASE_URL` en `.env`).
- El campo `qrUuid` debe ser único en la tabla `tables` (definido en el schema).
- Los enums `TableStatus` y `ClientStatus` deben estar definidos correctamente.

**Postcondiciones**:
- La función retorna un objeto con la estructura:
  ```javascript
  {
    table_id: number,
    table_number: number,
    action: "NEW_SESSION" | "JOIN_SESSION"
  }
  ```
- O lanza errores con códigos específicos:
  - `TABLE_NOT_FOUND`: Mesa no encontrada.
  - `TABLE_OUT_OF_SERVICE`: Mesa fuera de servicio.
  - `TABLE_FULL`: Mesa llena (sin cupo disponible).
- La función calcula correctamente las sesiones activas contando solo clientes con `status: 'ACTIVE'`.
- La lógica respeta la capacidad de la mesa para determinar si hay cupo disponible.
- La función es pura (no tiene efectos secundarios) y no modifica el estado de la base de datos.

---

### 3. `src/controllers/submodulos/tables.controller.js`

**Ubicación**: `src/controllers/submodulos/`

**Estado anterior**: Contenía las funciones `createTable` y `getTables` para manejar peticiones POST y GET relacionadas con mesas.

**¿Por qué se modificó?**
- Este archivo ya existía y contenía los controladores para crear y obtener mesas.
- Se añadió un nuevo controlador para manejar peticiones POST `/tables/verify-qr`.
- Mantiene la consistencia: todos los controladores relacionados con mesas están en el mismo archivo.
- Sigue el patrón establecido: los controladores orquestan las peticiones HTTP (reciben `req`, `res`).
- Implementa el manejo de errores HTTP apropiado según los códigos de error del servicio.

**Cambios realizados**:
- **Añadido**: Importación de `verifyQrSchema` desde el schema.
- **Añadido**: Función `verifyQr(req, res)` que implementa:
  - **Paso 1**: Valida `req.body` con `verifyQrSchema.safeParse()`.
    - Si la validación falla → responde `400 Bad Request` con errores de Zod formateados.
  - **Paso 2**: Llama a `tablesService.verifyQr(validation.data)`.
  - **Paso 3**: Si la operación es exitosa, retorna `200 OK` con el resultado del servicio.
  - **Paso 4**: Manejo de errores específicos:
    - `TABLE_NOT_FOUND` → `404 Not Found` con mensaje "Mesa no encontrada".
    - `TABLE_OUT_OF_SERVICE` → `403 Forbidden` con mensaje "Mesa fuera de servicio".
    - `TABLE_FULL` → `409 Conflict` con mensaje "Mesa llena".
    - Otros errores → `500 Internal Server Error` con log en consola.
- **Formato de respuesta**: Retorna directamente el objeto del servicio sin transformaciones adicionales, ya que el servicio ya formatea la respuesta según la especificación.
- **Manejo de errores**: Mapea códigos de error del servicio a códigos HTTP apropiados según las mejores prácticas REST.

**Precondiciones**:
- El servicio `tables.service.js` debe existir y exportar `verifyQr`.
- El schema `tables.schema.js` debe existir y exportar `verifyQrSchema`.
- Express debe estar instalado.
- El controlador debe estar exportado correctamente para ser importado en las rutas.

**Postcondiciones**:
- El endpoint responde con código HTTP `200 OK` cuando la verificación es exitosa.
- La respuesta cumple exactamente con el formato especificado:
  ```json
  {
    "table_id": number,
    "table_number": number,
    "action": "NEW_SESSION" | "JOIN_SESSION"
  }
  ```
- Los errores de validación se manejan apropiadamente con código `400 Bad Request`.
- Los errores de negocio se manejan con códigos HTTP apropiados:
  - `404` para mesa no encontrada.
  - `403` para mesa fuera de servicio.
  - `409` para mesa llena.
  - `500` para errores internos.
- Los errores se registran en consola para debugging.

---

### 4. `src/routes/submodulos/tables.route.js`

**Ubicación**: `src/routes/submodulos/`

**Estado anterior**: Contenía las rutas GET `/` (obtener todas las mesas) y POST `/` (crear nueva mesa).

**¿Por qué se modificó?**
- Este archivo ya existía y contenía las rutas para operaciones con mesas.
- Se añadió una nueva ruta POST `/verify-qr` para verificar códigos QR.
- Mantiene la consistencia: todas las rutas relacionadas con mesas están en el mismo archivo.
- Sigue el patrón establecido: las rutas definen los endpoints HTTP y conectan con controladores.
- La ruta específica (`/verify-qr`) se coloca antes de la ruta genérica (`/`) para evitar conflictos de enrutamiento.

**Cambios realizados**:
- **Añadido**: Ruta `router.post('/verify-qr', tablesController.verifyQr)`.
- **Orden de rutas**: La ruta específica `/verify-qr` se coloca antes de la ruta genérica `/` para que Express la evalúe primero.
  - Esto es importante porque Express evalúa las rutas en orden y `/verify-qr` podría ser interpretado como un parámetro si estuviera después de `/`.
- **Método HTTP**: POST, siguiendo la especificación del requerimiento.
- **Ruta completa**: Cuando se monta el router, la ruta completa será: `POST /api/v1/atencion-cliente/tables/verify-qr`.

**Precondiciones**:
- El controlador `tables.controller.js` debe existir y exportar `verifyQr`.
- Express debe estar instalado.
- El router debe estar montado en `main.route.js` (ya estaba montado).
- El router principal debe estar montado en `index.js` (ya estaba montado).

**Postcondiciones**:
- La ruta POST `/verify-qr` está disponible cuando se monte el router.
- La ruta completa será: `POST /api/v1/atencion-cliente/tables/verify-qr`.
- El endpoint acepta body JSON con el campo `qr_uuid`.
- La ruta no interfiere con las rutas existentes (GET `/` y POST `/`).

---

## 🔄 Flujo Completo de una Petición

```
1. Cliente (Vista Cliente - Escaneo Inicial)
   ↓ POST /api/v1/atencion-cliente/tables/verify-qr
   ↓ Body: { "qr_uuid": "string-escaneado-del-qr" }

2. src/index.js
   ↓ Monta: /api/v1/atencion-cliente → mainAtencionClienteRoutes

3. src/routes/main.route.js
   ↓ Monta: /tables → tablesRoutes

4. src/routes/submodulos/tables.route.js
   ↓ POST /verify-qr → tablesController.verifyQr

5. src/controllers/submodulos/tables.controller.js
   ↓ Valida req.body con verifyQrSchema (Zod)
   ↓ Si válido → llama a tablesService.verifyQr()
   ↓ Formatea respuesta y responde 200 OK
   ↓ Si error → mapea código de error a HTTP apropiado

6. src/services/submodulos/tables.service.js
   ↓ Busca mesa por qr_uuid con Prisma
   ↓ Incluye clientes activos para contar sesiones
   ↓ Evalúa estado de la mesa:
      - Si no existe → Error TABLE_NOT_FOUND
      - Si OUT_OF_SERVICE → Error TABLE_OUT_OF_SERVICE
      - Si AVAILABLE → Retorna action: "NEW_SESSION"
      - Si OCCUPIED:
        - Cuenta sesiones activas
        - Si sesiones >= capacity → Error TABLE_FULL
        - Si hay cupo → Retorna action: "JOIN_SESSION"
   ↓ Retorna { table_id, table_number, action }
```

---

## 📊 Estructura de la Respuesta

### ✅ Caso Exitoso: Mesa Disponible (200 OK) - NEW_SESSION

**Request**:
```http
POST /api/v1/atencion-cliente/tables/verify-qr
Content-Type: application/json

{
  "qr_uuid": "qr-mesa-1"
}
```

**Response**:
```json
{
  "table_id": 1,
  "table_number": 1,
  "action": "NEW_SESSION"
}
```

**Condiciones**:
- La mesa existe en la base de datos.
- `current_status` es `AVAILABLE`.
- No hay sesiones activas o la mesa está completamente disponible.

---

### ✅ Caso Exitoso: Mesa Ocupada con Cupo (200 OK) - JOIN_SESSION

**Request**:
```http
POST /api/v1/atencion-cliente/tables/verify-qr
Content-Type: application/json

{
  "qr_uuid": "qr-mesa-2"
}
```

**Response**:
```json
{
  "table_id": 2,
  "table_number": 2,
  "action": "JOIN_SESSION"
}
```

**Condiciones**:
- La mesa existe en la base de datos.
- `current_status` es `OCCUPIED`.
- Hay sesiones activas pero `sesiones_activas < capacity`.
- Hay cupo disponible para unirse a la sesión.

---

### ❌ Casos de Error

#### 1. Mesa No Encontrada (404 Not Found)

**Request**:
```http
POST /api/v1/atencion-cliente/tables/verify-qr
Content-Type: application/json

{
  "qr_uuid": "qr-inexistente-999"
}
```

**Response**:
```json
{
  "error": "Mesa no encontrada"
}
```

**Condiciones**:
- El `qr_uuid` proporcionado no existe en la base de datos.
- No se encontró ninguna mesa con ese `qr_uuid`.

---

#### 2. Mesa Fuera de Servicio (403 Forbidden)

**Request**:
```http
POST /api/v1/atencion-cliente/tables/verify-qr
Content-Type: application/json

{
  "qr_uuid": "qr-mesa-3"
}
```

**Response**:
```json
{
  "error": "Mesa fuera de servicio"
}
```

**Condiciones**:
- La mesa existe en la base de datos.
- `current_status` es `OUT_OF_SERVICE`.
- La mesa no está disponible para uso.

---

#### 3. Mesa Llena (409 Conflict)

**Request**:
```http
POST /api/v1/atencion-cliente/tables/verify-qr
Content-Type: application/json

{
  "qr_uuid": "qr-mesa-4"
}
```

**Response**:
```json
{
  "error": "Mesa llena"
}
```

**Condiciones**:
- La mesa existe en la base de datos.
- `current_status` es `OCCUPIED`.
- `sesiones_activas >= capacity`.
- No hay cupo disponible para unirse a la sesión.

---

#### 4. Validación Fallida (400 Bad Request)

**Request**:
```http
POST /api/v1/atencion-cliente/tables/verify-qr
Content-Type: application/json

{
  "qr_uuid": ""
}
```

**Response**:
```json
{
  "errors": {
    "qr_uuid": {
      "_errors": ["El qr_uuid no puede estar vacío"]
    }
  }
}
```

**Condiciones**:
- El campo `qr_uuid` está vacío o no es un string válido.
- El campo `qr_uuid` falta en el body.
- El formato del body no es JSON válido.

---

#### 5. Error Interno del Servidor (500 Internal Server Error)

**Causa**: Error inesperado (BD desconectada, error de Prisma, etc.)

**Response**:
```json
{
  "error": "Error interno del servidor"
}
```

---

## ✅ Validaciones Implementadas

### Schema (Zod) - `verifyQrSchema`

1. **`qr_uuid`**:
   - ✅ Debe ser un string (no número, no objeto, etc.).
   - ✅ Es requerido (no puede estar ausente).
   - ✅ No puede estar vacío (mínimo 1 carácter).
   - ✅ Mensajes de error en español y descriptivos.

### Servicio - `verifyQr`

1. **Búsqueda de mesa**:
   - ✅ Busca por `qrUuid` (campo único en la BD).
   - ✅ Incluye relación con `ClienteTemporal` filtrada por `status: 'ACTIVE'`.
   - ✅ Optimiza la consulta seleccionando solo campos necesarios.

2. **Validación de existencia**:
   - ✅ Verifica que la mesa exista antes de evaluar su estado.
   - ✅ Lanza error `TABLE_NOT_FOUND` si no existe.

3. **Validación de estado**:
   - ✅ Evalúa `OUT_OF_SERVICE` antes que otros estados.
   - ✅ Lanza error `TABLE_OUT_OF_SERVICE` si está fuera de servicio.
   - ✅ Evalúa `AVAILABLE` y retorna `NEW_SESSION`.
   - ✅ Evalúa `OCCUPIED` y verifica cupo disponible.

4. **Cálculo de sesiones activas**:
   - ✅ Cuenta solo clientes con `status: 'ACTIVE'`.
   - ✅ Compara con `capacity` de la mesa.
   - ✅ Lanza error `TABLE_FULL` si no hay cupo.
   - ✅ Retorna `JOIN_SESSION` si hay cupo disponible.

### Controlador - `verifyQr`

1. **Validación de entrada**:
   - ✅ Valida body con `verifyQrSchema` antes de procesar.
   - ✅ Retorna `400 Bad Request` si la validación falla.

2. **Manejo de errores**:
   - ✅ Mapea `TABLE_NOT_FOUND` → `404 Not Found`.
   - ✅ Mapea `TABLE_OUT_OF_SERVICE` → `403 Forbidden`.
   - ✅ Mapea `TABLE_FULL` → `409 Conflict`.
   - ✅ Mapea errores desconocidos → `500 Internal Server Error`.
   - ✅ Registra errores en consola para debugging.

3. **Formato de respuesta**:
   - ✅ Retorna JSON con estructura especificada.
   - ✅ Códigos HTTP apropiados según el caso.

---

## 🔧 Dependencias Utilizadas

- **Express**: Framework web (ya instalado).
- **Prisma**: ORM para interactuar con la BD (ya instalado).
- **Zod**: Validación de esquemas (ya instalado).
- **Node.js nativo**: No requiere dependencias adicionales.

---

## 📋 Checklist de Verificación

- [x] Schema de validación para body añadido (`verifyQrSchema`).
- [x] Servicio de negocio `verifyQr` implementado.
- [x] Controlador HTTP `verifyQr` creado.
- [x] Ruta POST `/verify-qr` añadida en `tables.route.js`.
- [x] Búsqueda de mesa por `qr_uuid` implementada.
- [x] Validación de existencia de mesa (404).
- [x] Validación de estado `OUT_OF_SERVICE` (403).
- [x] Retorno de `NEW_SESSION` para mesas `AVAILABLE`.
- [x] Cálculo de sesiones activas implementado.
- [x] Validación de capacidad (mesa llena) implementada (409).
- [x] Retorno de `JOIN_SESSION` para mesas ocupadas con cupo.
- [x] Formato de respuesta según especificación.
- [x] Manejo de errores con códigos HTTP apropiados.
- [x] Validación de entrada con Zod.
- [x] Mensajes de error descriptivos en español.

---

## 🚀 Cómo Probar

### 1. Preparar Datos de Prueba

Antes de probar, necesitas preparar datos en la base de datos para cubrir todos los casos:

#### Opción A: Usar Prisma Studio (Recomendado)

```bash
npx prisma studio
```

1. Abre la tabla `Table`.
2. Para probar **mesa fuera de servicio**: Cambia `current_status` de una mesa a `OUT_OF_SERVICE`.
3. Para probar **mesa ocupada**: Cambia `current_status` de una mesa a `OCCUPIED`.
4. Para probar **mesa llena**: 
   - Cambia `current_status` a `OCCUPIED`.
   - Abre la tabla `ClienteTemporal`.
   - Crea registros con `status: ACTIVE` y `table_id` igual al ID de la mesa.
   - Asegúrate de crear tantos registros como la `capacity` de la mesa.

#### Opción B: Usar SQL Directo

```sql
-- Mesa fuera de servicio
UPDATE tables SET current_status = 'OUT_OF_SERVICE' WHERE qr_uuid = 'qr-mesa-3';

-- Mesa ocupada (con cupo)
UPDATE tables SET current_status = 'OCCUPIED' WHERE qr_uuid = 'qr-mesa-2';

-- Mesa llena (sin cupo)
UPDATE tables SET current_status = 'OCCUPIED' WHERE qr_uuid = 'qr-mesa-4';
-- Luego inserta clientes activos hasta igualar o superar la capacidad
INSERT INTO cliente_temporal (table_id, session_token, customer_name, customer_dni, status)
VALUES
  (4, 'token-1', 'Cliente 1', '11111111', 'ACTIVE'),
  (4, 'token-2', 'Cliente 2', '22222222', 'ACTIVE');
-- (Continúa hasta igualar la capacity de la mesa)
```

### 2. Obtener qr_uuid para Pruebas

**Request**:
```http
GET /api/v1/atencion-cliente/tables?page=1&limit=5
```

**Response**: Copia los `qr_uuid` de las mesas para usarlos en las pruebas.

### 3. Probar con Thunder Client/Postman

#### Caso 1: Mesa Disponible (NEW_SESSION)

- **Método**: POST
- **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables/verify-qr`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "qr_uuid": "qr-mesa-1"
  }
  ```
- **Resultado esperado**: `200 OK` con `action: "NEW_SESSION"`

#### Caso 2: Mesa Ocupada con Cupo (JOIN_SESSION)

- **Método**: POST
- **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables/verify-qr`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "qr_uuid": "qr-mesa-2"
  }
  ```
- **Resultado esperado**: `200 OK` con `action: "JOIN_SESSION"`

#### Caso 3: Mesa No Encontrada (404)

- **Método**: POST
- **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables/verify-qr`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "qr_uuid": "qr-inexistente-999"
  }
  ```
- **Resultado esperado**: `404 Not Found` con mensaje de error

#### Caso 4: Mesa Fuera de Servicio (403)

- **Método**: POST
- **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables/verify-qr`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "qr_uuid": "qr-mesa-3"
  }
  ```
- **Resultado esperado**: `403 Forbidden` con mensaje de error

#### Caso 5: Mesa Llena (409)

- **Método**: POST
- **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables/verify-qr`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "qr_uuid": "qr-mesa-4"
  }
  ```
- **Resultado esperado**: `409 Conflict` con mensaje "Mesa llena"

#### Caso 6: Validación Fallida (400)

- **Método**: POST
- **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables/verify-qr`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "qr_uuid": ""
  }
  ```
- **Resultado esperado**: `400 Bad Request` con errores de validación

---

## 📝 Notas Adicionales

- **Campo `action`**: Este campo indica al cliente qué acción debe tomar:
  - `"NEW_SESSION"`: El cliente puede iniciar una nueva sesión (mesa disponible).
  - `"JOIN_SESSION"`: El cliente puede unirse a una sesión existente (mesa ocupada con cupo).

- **Sesiones activas**: Se cuentan solo los registros de `ClienteTemporal` con `status: 'ACTIVE'`. Los registros con otros estados (`BILL_REQUESTED`, `CLOSED`) no se consideran para el cálculo de cupo.

- **Capacidad de mesa**: La validación de "mesa llena" compara `sesiones_activas >= capacity`. Si hay exactamente `capacity` sesiones activas, la mesa se considera llena.

- **Orden de evaluación**: La lógica evalúa los estados en este orden:
  1. ¿Existe la mesa? → 404 si no existe.
  2. ¿Está fuera de servicio? → 403 si está fuera de servicio.
  3. ¿Está disponible? → NEW_SESSION si está disponible.
  4. ¿Está ocupada? → Verifica cupo y retorna JOIN_SESSION o 409.

- **Optimización**: La consulta a la base de datos incluye solo los campos necesarios para optimizar el rendimiento. Los clientes se filtran por `status: 'ACTIVE'` directamente en la consulta.

- **Compatibilidad**: Esta implementación no rompe la funcionalidad existente de los endpoints POST `/tables` y GET `/tables`. Todos los endpoints coexisten en el mismo archivo de rutas.

---

## 🎓 Arquitectura Respetada

Esta implementación sigue estrictamente el patrón arquitectónico del proyecto:

- **Routes**: Definen endpoints HTTP (POST `/verify-qr`).
- **Controllers**: Orquestan peticiones, validan body y formatean respuestas.
- **Services**: Contienen lógica de negocio pura (búsqueda, validación de estados, cálculo de cupo).
- **Schemas**: Validan estructura y tipos de datos de entrada (Zod).
- **Prisma**: Interactúa con la base de datos (consultas, relaciones, filtros).

Cada capa tiene responsabilidades claras y separadas, facilitando el mantenimiento y la escalabilidad del código.

---

## 🔍 Diferencias con Otros Endpoints

| Aspecto | POST /tables | GET /tables | POST /tables/verify-qr |
|---------|--------------|-------------|------------------------|
| **Método HTTP** | POST | GET | POST |
| **Input** | Body (JSON) | Query Params | Body (JSON) |
| **Validación** | `createTableSchema` | `getTablesQuerySchema` | `verifyQrSchema` |
| **Servicio** | `createTable()` | `getAllTables()` | `verifyQr()` |
| **Respuesta** | Mesa creada | Lista de mesas + metadatos | Acción del cliente |
| **Código HTTP** | 201 Created | 200 OK | 200 OK / 404 / 403 / 409 |
| **Lógica** | Crear nueva mesa | Consultar mesas existentes | Verificar QR y determinar acción |
| **Consumidor** | Admin | Dashboard Admin / Cocina | Vista Cliente |

---


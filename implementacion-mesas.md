# 📋 Changelog: Implementación del Recurso Mesas (POST /tables)

## 🎯 Objetivo

Implementar el endpoint **POST `/api/v1/atencion-cliente/tables`** para crear nuevas mesas en el sistema de atención al cliente del restaurante, siguiendo el patrón arquitectónico MVC + Services + Schemas establecido en el proyecto.

---

## 📁 Archivos Creados

### 1. `src/schemas/submodulos/tables.schema.js`

**Ubicación**: `src/schemas/submodulos/`

**¿Por qué aquí?**
- Sigue la convención del proyecto: los schemas de validación van en `src/schemas/`.
- Está en `submodulos/` porque pertenece al módulo de atención al cliente (no es un ejemplo genérico).
- Mantiene consistencia con otros schemas como `cliente_temporal.schema.js`, `comandas.schema.js`, etc.

**Contenido**:
- **Esquema Zod**: `createTableSchema` que valida:
  - `table_number`: número entero positivo (requerido).
  - `capacity`: número entero entre 2 y 6 personas (requerido).

**Precondiciones**:
- La librería `zod` debe estar instalada (`package.json` ya la incluye).

**Postcondiciones**:
- El esquema está disponible para importar en controladores.
- Valida estructura y tipos antes de llegar a la lógica de negocio.

---

### 2. `src/services/submodulos/tables.service.js`

**Ubicación**: `src/services/submodulos/`

**¿Por qué aquí?**
- Los servicios contienen la lógica de negocio pura (sin conocimiento de HTTP).
- Está en `submodulos/` porque pertenece al módulo de atención al cliente.
- Sigue el patrón establecido: `example.service.js` → `tables.service.js`.

**Contenido**:
- **Función**: `createTable({ table_number, capacity })`
  - **Paso 1**: Valida unicidad de `table_number` usando Prisma.
  - **Paso 2**: Genera UUID seguro con `crypto.randomUUID()` (simula módulo de seguridad).
  - **Paso 3**: Persiste en BD con estado `AVAILABLE` (default del schema Prisma).
  - **Retorna**: Objeto de la mesa creada.

**Precondiciones**:
- Prisma Client debe estar generado (`npx prisma generate`).
- La tabla `tables` debe existir en la BD (modelo `Table` en `schema.prisma`).
- La conexión a la BD debe estar configurada (`DATABASE_URL` en `.env`).

**Postcondiciones**:
- Si el `table_number` ya existe → lanza error con código `TABLE_NUMBER_ALREADY_EXISTS`.
- Si todo es válido → retorna la mesa creada con `id`, `tableNumber`, `qrUuid`, `capacity`, `currentStatus`.

---

### 3. `src/controllers/submodulos/tables.controller.js`

**Ubicación**: `src/controllers/submodulos/`

**¿Por qué aquí?**
- Los controladores orquestan las peticiones HTTP (reciben `req`, `res`).
- Está en `submodulos/` porque pertenece al módulo de atención al cliente.
- Sigue el patrón: `example.controller.js` → `tables.controller.js`.

**Contenido**:
- **Función**: `createTable(req, res)`
  - **Paso 1**: Valida `req.body` con `createTableSchema.safeParse()`.
  - **Paso 2**: Si la validación falla → responde `400 Bad Request` con errores de Zod.
  - **Paso 3**: Llama a `tablesService.createTable(validation.data)`.
  - **Paso 4**: Formatea la respuesta según especificación:
    ```json
    {
      "id": 10,
      "table_number": 10,
      "qr_uuid": "uuid-generado",
      "capacity": 6
    }
    ```
  - **Paso 5**: Responde `201 Created` con el JSON formateado.
  - **Manejo de errores**:
    - `TABLE_NUMBER_ALREADY_EXISTS` → `409 Conflict`.
    - Otros errores → `500 Internal Server Error`.

**Precondiciones**:
- El servicio `tables.service.js` debe existir.
- El schema `tables.schema.js` debe existir.

**Postcondiciones**:
- El endpoint responde con códigos HTTP apropiados.
- La respuesta cumple exactamente con el formato especificado en el enunciado.

---

### 4. `src/routes/submodulos/tables.route.js`

**Ubicación**: `src/routes/submodulos/`

**¿Por qué aquí?**
- Las rutas definen los endpoints HTTP y conectan con controladores.
- Está en `submodulos/` porque pertenece al módulo de atención al cliente.
- Sigue el patrón: `example.routes.js` → `tables.route.js`.

**Contenido**:
- Crea un `Router` de Express.
- Define: `router.post('/', tablesController.createTable)`.
- Exporta el router como `default`.

**Precondiciones**:
- El controlador `tables.controller.js` debe existir.
- Express debe estar instalado.

**Postcondiciones**:
- El router está listo para ser montado en `main.route.js`.
- La ruta `/tables` (POST) está disponible cuando se monte el router.

---

## 📝 Archivos Modificados

### 5. `src/routes/main.route.js`

**Ubicación**: `src/routes/`

**Estado anterior**: Archivo vacío.

**¿Por qué se modificó?**
- Este archivo es el **router principal** del módulo de atención al cliente.
- Centraliza todos los submódulos bajo el prefijo `/api/v1/atencion-cliente`.
- Permite agregar fácilmente más recursos en el futuro (ej: `/cliente-temporal`, `/comandas`).

**Cambios realizados**:
- Importa `Router` de Express.
- Importa `tablesRoutes` desde `./submodulos/tables.route.js`.
- Crea un router y monta: `router.use('/tables', tablesRoutes)`.
- Exporta el router como `default`.

**Precondiciones**:
- El archivo `tables.route.js` debe existir.

**Postcondiciones**:
- El router principal está listo para ser montado en `index.js`.
- La ruta completa será: `/api/v1/atencion-cliente/tables` (POST).

---

### 6. `src/index.js`

**Ubicación**: `src/`

**Estado anterior**:
```javascript
// Ruta de atención al cliente (route MAIN)
app.use('/api/v1/atencion-cliente', (req, res) => {
  res.json({ message: 'Ruta de atención al cliente' });
});
```

**¿Por qué se modificó?**
- La función directa **bloqueaba** todas las subrutas (cualquier petición a `/api/v1/atencion-cliente/*` respondía siempre con el mismo JSON).
- Para que `/api/v1/atencion-cliente/tables` funcione, necesitamos **delegar** a un router que sepa distribuir las peticiones.

**Cambios realizados**:
- Importa `mainAtencionClienteRoutes` desde `./routes/main.route.js`.
- Reemplaza la función directa por: `app.use('/api/v1/atencion-cliente', mainAtencionClienteRoutes)`.

**Precondiciones**:
- El archivo `main.route.js` debe existir y exportar un router.

**Postcondiciones**:
- Las peticiones a `/api/v1/atencion-cliente/tables` ahora llegan correctamente al controlador.
- El flujo completo funciona: `index.js` → `main.route.js` → `tables.route.js` → `tables.controller.js`.

---

## 🔄 Flujo Completo de una Petición

```
1. Cliente (Postman/Thunder Client)
   ↓ POST /api/v1/atencion-cliente/tables
   ↓ Body: { "table_number": 10, "capacity": 6 }

2. src/index.js
   ↓ Monta: /api/v1/atencion-cliente → mainAtencionClienteRoutes

3. src/routes/main.route.js
   ↓ Monta: /tables → tablesRoutes

4. src/routes/submodulos/tables.route.js
   ↓ POST / → tablesController.createTable

5. src/controllers/submodulos/tables.controller.js
   ↓ Valida con createTableSchema (Zod)
   ↓ Si válido → llama a tablesService.createTable()
   ↓ Formatea respuesta y responde 201 Created

6. src/services/submodulos/tables.service.js
   ↓ Verifica unicidad de table_number
   ↓ Genera qr_uuid con crypto.randomUUID()
   ↓ Persiste en BD con Prisma
   ↓ Retorna mesa creada
```

---

## 📊 Estructura de la Respuesta

### ✅ Caso Exitoso (201 Created)

**Request**:
```http
POST /api/v1/atencion-cliente/tables
Content-Type: application/json

{
  "table_number": 10,
  "capacity": 6
}
```

**Response**:
```json
{
  "id": 10,
  "table_number": 10,
  "qr_uuid": "cbece246-2cbd-48cc-8cc0-aeebba229cda",
  "capacity": 6
}
```

---

### ❌ Casos de Error

#### 1. Validación Fallida (400 Bad Request)

**Causa**: Datos inválidos (ej: `capacity: 1` o `capacity: 7`, `table_number` no es número, etc.)

**Response**:
```json
{
  "errors": {
    "capacity": {
      "_errors": ["La capacidad mínima de la mesa es 2 personas"]
    }
  }
}
```

#### 2. Mesa Duplicada (409 Conflict)

**Causa**: El `table_number` ya existe en la BD.

**Response**:
```json
{
  "error": "El número de mesa ya está registrado"
}
```

#### 3. Error Interno (500 Internal Server Error)

**Causa**: Error inesperado (BD desconectada, error de Prisma, etc.)

**Response**:
```json
{
  "error": "Error interno del servidor"
}
```

---

## ✅ Validaciones Implementadas

### Schema (Zod) - `tables.schema.js`

1. **`table_number`**:
   - ✅ Debe ser un número.
   - ✅ Debe ser entero.
   - ✅ Debe ser positivo (> 0).
   - ✅ Campo requerido.

2. **`capacity`**:
   - ✅ Debe ser un número.
   - ✅ Debe ser entero.
   - ✅ Mínimo: 2 personas.
   - ✅ Máximo: 6 personas.
   - ✅ Campo requerido.

### Servicio - `tables.service.js`

1. **Unicidad de `table_number`**:
   - ✅ Consulta en BD si ya existe una mesa con ese número.
   - ✅ Si existe → lanza error `TABLE_NUMBER_ALREADY_EXISTS`.

2. **Generación de UUID**:
   - ✅ Usa `crypto.randomUUID()` (módulo nativo de Node.js).
   - ✅ Simula la generación de credenciales del módulo de seguridad.

3. **Estado inicial**:
   - ✅ La mesa se crea con `currentStatus: 'AVAILABLE'` (default del schema Prisma).

---

## 🔧 Dependencias Utilizadas

- **Express**: Framework web (ya instalado).
- **Prisma**: ORM para interactuar con la BD (ya instalado).
- **Zod**: Validación de esquemas (ya instalado).
- **crypto** (Node.js nativo): Generación de UUID seguro.

---

## 📋 Checklist de Verificación

- [x] Schema de validación creado (`tables.schema.js`).
- [x] Servicio de negocio creado (`tables.service.js`).
- [x] Controlador HTTP creado (`tables.controller.js`).
- [x] Ruta de submódulo creada (`tables.route.js`).
- [x] Router principal actualizado (`main.route.js`).
- [x] `index.js` actualizado para montar el router principal.
- [x] Validación de unicidad de `table_number` implementada.
- [x] Generación de UUID seguro implementada.
- [x] Estado `AVAILABLE` por defecto (schema Prisma).
- [x] Formato de respuesta según especificación.
- [x] Manejo de errores con códigos HTTP apropiados.
- [x] Validación de capacidad (mínimo 2, máximo 6 personas).

---

## 🚀 Cómo Probar

1. **Levantar el servidor**:
   ```bash
   npm run dev
   ```

2. **Probar con Postman/Thunder Client**:
   - **Método**: POST
   - **URL**: `http://localhost:3000/api/v1/atencion-cliente/tables`
   - **Headers**: `Content-Type: application/json`
   - **Body**:
     ```json
     {
       "table_number": 100,
       "capacity": 4
     }
     ```

3. **Resultado esperado**:
   - Status: `201 Created`
   - Body: JSON con `id`, `table_number`, `qr_uuid`, `capacity`

---

## 📝 Notas Adicionales

- El modelo `Table` en `prisma/schema.prisma` ya existía y no fue modificado.
- El seed `prisma/seeds/tables.js` crea mesas del 1 al 20, por lo que esos números ya están ocupados.
- Para probar con éxito, usar `table_number` mayor a 20 (ej: 21, 100, etc.).
- El UUID generado es único y seguro, cumpliendo con el requisito de "solicitar generación de UUID seguro al módulo de seguridad" (simulado con `crypto.randomUUID()`).

---

## 🎓 Arquitectura Respetada

Esta implementación sigue estrictamente el patrón arquitectónico del proyecto:

- **Routes**: Definen endpoints HTTP.
- **Controllers**: Orquestan peticiones, validan y formatean respuestas.
- **Services**: Contienen lógica de negocio pura (sin conocimiento de HTTP).
- **Schemas**: Validan estructura y tipos de datos (Zod).
- **Prisma**: Interactúa con la base de datos (Modelo).

Cada capa tiene responsabilidades claras y separadas, facilitando el mantenimiento y la escalabilidad del código.

---

**Fecha de implementación**: 2024  
**Autor**: Implementación siguiendo especificaciones del proyecto  
**Versión**: 1.0.0


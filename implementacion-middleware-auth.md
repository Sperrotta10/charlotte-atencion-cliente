# Implementación del Middleware de Autenticación

## 📋 Resumen

Se ha implementado el middleware de autenticación en `src/middlewares/auth.js` siguiendo el protocolo estándar de seguridad del sistema. El middleware incluye dos funciones principales:

1. **`verifyGuest`**: Valida tokens de cliente (Guest/Cliente Temporal)
2. **`verifyStaff`**: Valida permisos de Staff/Admin usando el protocolo de seguridad

---

## 🔧 Funciones Implementadas

### 1. `verifyGuest` - Validación de Tokens de Cliente

**Propósito**: Verifica que el token JWT pertenezca a un cliente temporal (guest) válido.

**Flujo de Validación**:
1. Extrae el token del header `Authorization` (formato: `Bearer <token>`)
2. Decodifica y verifica el token usando `JWT_SECRET`
3. Valida que el token contenga información de cliente temporal (`table_id`)
4. Adjunta la información del usuario al objeto `req.user`

**Estructura de `req.user` después de la validación**:
```javascript
{
  type: 'guest',
  table_id: number,
  customer_name: string,
  customer_dni: string,
  token: string
}
```

**Errores posibles**:
- `401`: Token no proporcionado, expirado o inválido
- `403`: Token no contiene información de cliente temporal
- `500`: Error interno del servidor

---

### 2. `verifyStaff` - Validación de Permisos Staff/Admin

**Propósito**: Verifica que el usuario tenga permisos de staff o admin para realizar una acción específica.

**Flujo de Validación**:
1. Extrae el token del header `Authorization`
2. Decodifica y verifica el token usando `JWT_SECRET`
3. Si el usuario es `isAdmin: true`, permite el acceso inmediatamente
4. Si no es admin:
   - **Opción A (Automática)**: Si se proporcionan `resource` y `method`, usa el endpoint `hasPermission` del módulo de seguridad
   - **Opción B (Básica)**: Solo verifica que el usuario tenga roles asignados

**Uso con validación de permisos específicos**:
```javascript
// Proteger endpoint con validación de permisos específicos
router.post('/tables', verifyStaff({ 
  resource: 'Table_atc', 
  method: 'Create' 
}), controller.createTable);
```

**Uso básico (solo verificar que sea staff)**:
```javascript
// Proteger endpoint solo verificando que sea staff
router.get('/tables', verifyStaff(), controller.getTables);
```

**Estructura de `req.user` después de la validación**:
```javascript
// Para admin:
{
  type: 'admin',
  id: number,
  name: string,
  lastName: string,
  email: string,
  isAdmin: true,
  token: string
}

// Para staff:
{
  type: 'staff',
  id: number,
  name: string,
  lastName: string,
  email: string,
  isAdmin: false,
  roles: number[],
  token: string
}
```

**Errores posibles**:
- `401`: Token no proporcionado, expirado o inválido
- `403`: Permisos insuficientes o usuario sin roles
- `500`: Error interno del servidor o servicio de seguridad no disponible

---

### 3. `checkPermissionViaSecurityModule` - Función Auxiliar (Automática)

**Propósito**: Implementa la "Versión Mejorada" del protocolo de seguridad usando el endpoint `hasPermission`.

**Endpoint del módulo de seguridad**: `POST /api/seguridad/auth/hasPermission`

**Parámetros**:
- `token`: Token JWT del usuario
- `resource`: Recurso a verificar (ej: `"Table_atc"`, `"Comanda_atc"`)
- `method`: Método a verificar (`"Create"`, `"Read"`, `"Update"`, `"Delete"`, `"All"`)

**Respuesta del módulo de seguridad**:
```json
{
  "hasPermission": true
}
```

---

### 4. `checkPermissionManual` - Función Auxiliar (Manual)

**Propósito**: Implementa la "Forma Manual" del protocolo de seguridad consultando roles y permisos directamente.

**Flujo**:
1. Decodifica el token para obtener los IDs de roles
2. Consulta el endpoint `/api/seguridad/auth/rol` con los IDs de roles
3. Itera sobre los permisos de cada rol buscando coincidencia
4. Retorna `true` si encuentra un permiso que coincida con `resource` y `method`

**Endpoint del módulo de seguridad**: `POST /api/seguridad/auth/rol`

**Parámetros**:
- `token`: Token JWT del usuario
- `roles`: Array de IDs de roles (ej: `[10, 15]`)

**Respuesta del módulo de seguridad**:
```json
[
  {
    "id": 10,
    "name": "Mesero",
    "permissions": [
      {
        "id": 101,
        "type": "Resource",
        "resource": "Table_atc",
        "method": "Read"
      },
      {
        "id": 102,
        "type": "Resource",
        "resource": "Comanda_atc",
        "method": "Create"
      }
    ]
  }
]
```

---

## 📝 Convenciones de Nombres (Recursos ATC)

Según el protocolo de seguridad, los recursos del módulo ATC deben seguir esta nomenclatura:

| Valor de "resource" | Tabla que representa |
|---------------------|---------------------|
| `Table_atc` | Table |
| `ClienteTemporal_atc` | ClienteTemporal |
| `Comanda_atc` | Comanda |
| `OrderItem_atc` | OrderItem |
| `ServiceRequest_atc` | ServiceRequest |

---

## 🚀 Cómo Usar el Middleware

### Ejemplo 1: Proteger endpoint para clientes (Guest)

```javascript
import { verifyGuest } from '../middlewares/auth.js';
import { createComanda } from '../controllers/submodulos/comandas.controller.js';

router.post('/comandas', verifyGuest, createComanda);
```

### Ejemplo 2: Proteger endpoint para staff con validación de permisos específicos

```javascript
import { verifyStaff } from '../middlewares/auth.js';
import { createTable } from '../controllers/submodulos/tables.controller.js';

// Solo usuarios con permiso "Create" sobre "Table_atc" pueden crear mesas
router.post('/tables', verifyStaff({ 
  resource: 'Table_atc', 
  method: 'Create' 
}), createTable);
```

### Ejemplo 3: Proteger endpoint para staff (solo verificar que sea staff)

```javascript
import { verifyStaff } from '../middlewares/auth.js';
import { getTables } from '../controllers/submodulos/tables.controller.js';

// Cualquier staff puede listar mesas
router.get('/tables', verifyStaff(), getTables);
```

### Ejemplo 4: Proteger endpoint solo para administradores

```javascript
import { verifyStaff } from '../middlewares/auth.js';
import { deleteTable } from '../controllers/submodulos/tables.controller.js';

// Solo admins pueden eliminar mesas (o staff con permiso Delete)
router.delete('/tables/:id', verifyStaff({ 
  resource: 'Table_atc', 
  method: 'Delete' 
}), deleteTable);
```

---

## 🧪 Cómo Probar el Middleware

### Prerequisitos

1. **Variables de entorno configuradas**:
   ```env
   JWT_SECRET=tu-clave-secreta-jwt
   CHARLOTTE_SECURITY_URL=http://localhost:3001  # URL del módulo de seguridad
   NODE_ENV=development
   ```

2. **Módulo de seguridad funcionando**: El módulo de seguridad debe estar corriendo y accesible en la URL configurada.

3. **Herramientas de prueba**: Postman, Insomnia, curl, o cualquier cliente HTTP.

---

### Prueba 1: Verificar Token de Cliente (verifyGuest)

#### Paso 1: Obtener un token de cliente

**Endpoint**: `POST /api/v1/atencion-cliente/clients/session`

**Request**:
```json
{
  "table_id": 1,
  "customer_name": "Juan Pérez",
  "customer_dni": "12345678"
}
```

**Response esperado**:
```json
{
  "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client": {
    "id": 1,
    "name": "Juan Pérez",
    "status": "ACTIVE"
  }
}
```

#### Paso 2: Usar el token para acceder a un endpoint protegido

**Endpoint**: `POST /api/v1/atencion-cliente/comandas` (ejemplo, si está protegido con `verifyGuest`)

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body**:
```json
{
  "table_id": 1,
  "items": [...]
}
```

**Respuestas esperadas**:
- ✅ **200/201**: Si el token es válido y el endpoint procesa correctamente
- ❌ **401**: Si el token no se proporciona, está expirado o es inválido
- ❌ **403**: Si el token no contiene información de cliente temporal

#### Pruebas de casos de error:

**Caso 1: Sin token**
```bash
curl -X POST http://localhost:3000/api/v1/atencion-cliente/comandas \
  -H "Content-Type: application/json" \
  -d '{"table_id": 1}'
```
**Esperado**: `401 Unauthorized`

**Caso 2: Token inválido**
```bash
curl -X POST http://localhost:3000/api/v1/atencion-cliente/comandas \
  -H "Authorization: Bearer token-invalido" \
  -H "Content-Type: application/json" \
  -d '{"table_id": 1}'
```
**Esperado**: `401 Unauthorized`

**Caso 3: Token expirado**
```bash
# Usar un token que haya expirado
curl -X POST http://localhost:3000/api/v1/atencion-cliente/comandas \
  -H "Authorization: Bearer <token-expirado>" \
  -H "Content-Type: application/json" \
  -d '{"table_id": 1}'
```
**Esperado**: `401 Unauthorized` con mensaje "Token expirado"

---

### Prueba 2: Verificar Permisos de Staff (verifyStaff)

#### Paso 1: Obtener un token de staff/admin

**Endpoint del módulo de seguridad**: `POST /api/seguridad/auth/login`

**Request**:
```json
{
  "email": "mesero@example.com",
  "password": "password123"
}
```

**Response esperado**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Carlos",
    "lastName": "Pérez",
    "email": "mesero@example.com",
    "isAdmin": false,
    "roles": [10]
  }
}
```

#### Paso 2: Usar el token para acceder a un endpoint protegido con permisos específicos

**Endpoint**: `POST /api/v1/atencion-cliente/tables` (ejemplo, si está protegido con `verifyStaff({ resource: 'Table_atc', method: 'Create' })`)

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body**:
```json
{
  "tableNumber": 5,
  "capacity": 4,
  "qrUuid": "uuid-unico-123"
}
```

**Respuestas esperadas**:
- ✅ **200/201**: Si el usuario tiene el permiso necesario o es admin
- ❌ **401**: Si el token no se proporciona, está expirado o es inválido
- ❌ **403**: Si el usuario no tiene los permisos necesarios

#### Pruebas de casos de error:

**Caso 1: Usuario sin permisos**
```bash
# Usar un token de un usuario que no tenga el permiso "Create" sobre "Table_atc"
curl -X POST http://localhost:3000/api/v1/atencion-cliente/tables \
  -H "Authorization: Bearer <token-sin-permisos>" \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 5, "capacity": 4}'
```
**Esperado**: `403 Forbidden` con mensaje "No tiene permisos para realizar esta acción"

**Caso 2: Usuario admin (debe tener acceso)**
```bash
# Usar un token de un usuario con isAdmin: true
curl -X POST http://localhost:3000/api/v1/atencion-cliente/tables \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 5, "capacity": 4}'
```
**Esperado**: `200/201` - El admin tiene acceso completo

**Caso 3: Módulo de seguridad no disponible**
```bash
# Si CHARLOTTE_SECURITY_URL no está configurada o el servicio está caído
curl -X POST http://localhost:3000/api/v1/atencion-cliente/tables \
  -H "Authorization: Bearer <token-valido>" \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 5, "capacity": 4}'
```
**Esperado**: `403 Forbidden` - Por seguridad, se deniega el acceso si el servicio no está disponible

---

### Prueba 3: Verificar que req.user se adjunta correctamente

Puedes crear un endpoint de prueba para verificar que la información del usuario se adjunta correctamente:

```javascript
// En cualquier controlador
export const testAuth = (req, res) => {
  res.json({
    message: 'Autenticación exitosa',
    user: req.user
  });
};
```

**Endpoint de prueba**: `GET /api/v1/atencion-cliente/test-auth`

**Protección**: `verifyGuest` o `verifyStaff()`

**Request**:
```bash
curl -X GET http://localhost:3000/api/v1/atencion-cliente/test-auth \
  -H "Authorization: Bearer <token-valido>"
```

**Response esperado**:
```json
{
  "message": "Autenticación exitosa",
  "user": {
    "type": "guest",
    "table_id": 1,
    "customer_name": "Juan Pérez",
    "customer_dni": "12345678",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 📋 Checklist de Pruebas

### Para `verifyGuest`:
- [ ] ✅ Token válido de cliente permite acceso
- [ ] ❌ Sin token retorna 401
- [ ] ❌ Token inválido retorna 401
- [ ] ❌ Token expirado retorna 401
- [ ] ❌ Token sin `table_id` retorna 403
- [ ] ✅ `req.user` contiene información correcta del cliente

### Para `verifyStaff`:
- [ ] ✅ Token de admin permite acceso (sin verificar permisos específicos)
- [ ] ✅ Token de staff con permisos correctos permite acceso
- [ ] ❌ Token de staff sin permisos retorna 403
- [ ] ❌ Sin token retorna 401
- [ ] ❌ Token inválido retorna 401
- [ ] ❌ Token expirado retorna 401
- [ ] ✅ `req.user` contiene información correcta del staff/admin
- [ ] ❌ Si el módulo de seguridad no está disponible, se deniega acceso (403)

---

## 🔍 Debugging

### Ver logs en consola

El middleware registra errores en la consola. Para ver más detalles, puedes agregar logs adicionales:

```javascript
// En el middleware, después de decodificar el token
console.log('Token decodificado:', decoded);
console.log('Usuario:', req.user);
```

### Verificar comunicación con módulo de seguridad

Si `verifyStaff` con permisos específicos falla, verifica:

1. **Variable de entorno**:
   ```bash
   echo $CHARLOTTE_SECURITY_URL
   # Debe mostrar: http://localhost:3001 (o la URL correcta)
   ```

2. **Conectividad**:
   ```bash
   curl http://localhost:3001/api/seguridad/auth/hasPermission
   # Debe responder (aunque sea con error de autenticación)
   ```

3. **Logs del módulo de seguridad**: Revisa los logs del módulo de seguridad para ver si recibe las peticiones.

---

## 📚 Referencias

- Protocolo de Seguridad: Documento proporcionado por el usuario
- Convención de nombres: Sección 3 del protocolo
- Endpoints del módulo de seguridad:
  - `POST /api/seguridad/auth/hasPermission` (Versión mejorada)
  - `POST /api/seguridad/auth/rol` (Versión manual)

---

## ✅ Estado de Implementación

- ✅ `verifyGuest` implementado y funcional
- ✅ `verifyStaff` implementado y funcional
- ✅ Validación automática usando `hasPermission`
- ✅ Validación manual usando consulta de roles
- ✅ Manejo de errores completo
- ✅ Soporte para usuarios admin
- ✅ Documentación completa

---

## 🎯 Próximos Pasos Sugeridos

1. **Integrar el middleware en las rutas existentes**: Aplicar `verifyGuest` o `verifyStaff` según corresponda a cada endpoint.

2. **Crear tests unitarios**: Implementar tests para verificar el comportamiento del middleware.

3. **Agregar rate limiting**: Considerar agregar límites de tasa para prevenir abuso.

4. **Implementar refresh tokens**: Si es necesario, agregar soporte para renovación de tokens.

---

**Fecha de implementación**: 2024
**Autor**: Implementación basada en protocolo de seguridad del sistema Charlotte


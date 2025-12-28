import jwt from 'jsonwebtoken';
import { envs } from '../config/envs.js';

/**
 * Middleware para verificar tokens de cliente (Guest/Cliente Temporal)
 * Valida que el token JWT sea válido y contenga información de cliente temporal
 * 
 * @param {Object} req - Request object de Express
 * @param {Object} res - Response object de Express
 * @param {Function} next - Next middleware function
 */
export const verifyGuest = async (req, res, next) => {
  try {
    // 1. Extracción del token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token no proporcionado.'
      });
    }

    const token = authHeader.substring(7);

    // 2. Verificación criptográfica (JWT)
    // Nota: Asumimos que compartes el SECRET con el módulo de seguridad o usas clave pública/privada.
    let decoded;
    try {
      decoded = jwt.verify(token, envs.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // 3. VALIDACIÓN DE ESTADO CONTRA BASE DE DATOS (El paso crítico)
    // Buscamos al cliente por el token exacto y verificamos que esté ACTIVO.
    const currentClient = await prisma.clienteTemporal.findUnique({
      where: { 
        sessionToken: token 
      },
      include: {
        table: true // Opcional: si necesitas datos de la mesa
      }
    });

    // 4. Casos de rechazo de sesión
    if (!currentClient) {
      return res.status(403).json({
        error: 'Sesión no encontrada',
        message: 'Esta sesión no existe en nuestros registros.'
      });
    }

    if (currentClient.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Sesión finalizada',
        message: 'Tu sesión en esta mesa ya ha sido cerrada. Por favor escanea el QR nuevamente.'
      });
    }

    // 5. Inyectar el usuario COMPLETO en el request
    // Ahora tus controladores tendrán acceso al ID real de la base de datos (currentClient.id)
    req.guest = {
      id: currentClient.id,             // ESTO ES LO QUE NECESITABAS
      tableId: currentClient.tableId,
      name: currentClient.customerName,
      dni: currentClient.customerDni,
      role: 'guest',
      token: token
    };

    next();

  } catch (error) {
    console.error('Error crítico en verifyGuest:', error);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudo verificar la sesión del invitado.'
    });
  }
};

/**
 * Middleware para proteger endpoints según el Manual de Seguridad.
 * Utiliza la "Versión Mejorada: Forma Automática" descrita en la sección 4.1 del manual.
 * * @param {string} resource - Nombre del recurso según convención (ej: 'Table_atc')
 * @param {string} method - Acción a validar ('Create', 'Read', 'Update', 'Delete')
 */
export const verifyStaff = (resource, method) => {
  return async (req, res, next) => {
    try {
      // 1. Intercepción del Token [cite: 71]
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Token de autenticación no proporcionado.'
        });
      }

      const token = authHeader.substring(7);

      // 2. Decodificación Local Básica [cite: 72]
      let decoded;
      try {
        decoded = jwt.verify(token, envs.JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ 
            error: 'Token inválido', 
            message: 'Su sesión ha expirado o es inválida.' 
        });
      }

      // 3. Verificar si es Administrador
      // Si es admin, tiene pase libre y no consultamos al MS de Seguridad.
      if (decoded.isAdmin === true) {
        req.user = { ...decoded, type: 'admin', token };
        return next();
      }

      // Validación de integridad: El manual exige validar resource y method 
      if (!resource || !method) {
        console.error('❌ Error de implementación: verifyStaff llamado sin resource o method');
        return res.status(500).json({ error: 'Error de configuración de seguridad en el servidor.' });
      }

      // 4. Validación Delegada (S2S) al Módulo de Seguridad [cite: 101]
      const hasPermission = await checkPermissionViaSecurityModule(token, resource, method);

      if (!hasPermission) {
        // [cite: 131] Si hasPermission es false, responder 403.
        return res.status(403).json({
          error: 'Acceso Denegado',
          message: 'No tiene permisos para realizar esta acción sobre este recurso.'
        });
      }

      // 5. Adjuntar usuario y continuar
      req.user = { ...decoded, type: 'staff', token };
      next();

    } catch (error) {
      console.error('🔥 Error crítico en verifyStaff:', error);
      return res.status(500).json({
        error: 'Error interno',
        message: 'No se pudo verificar la autorización con el servicio de seguridad.'
      });
    }
  };
};

/**
 * Middleware para proteger endpoints que solo pueden ser accedidos por Administradores.
 * 
 * @param {Object} req - Request object de Express
 * @param {Object} res - Response object de Express
 * @param {Function} next - Next middleware function
 */
export const verifyAdmin = async (req, res, next) => {
  try {
    // 1. Intercepción del Token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token de autenticación no proporcionado.'
      });
    }

    const token = authHeader.substring(7);

    // 2. Decodificación Local Básica
    let decoded;
    try {
      decoded = jwt.verify(token, envs.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Token inválido', 
        message: 'Su sesión ha expirado o es inválida.' 
      });
    }

    // 3. Verificar que sea Administrador
    if (decoded.isAdmin !== true) {
      return res.status(403).json({
        error: 'Acceso Denegado',
        message: 'Este endpoint solo puede ser accedido por administradores.'
      });
    }

    // 4. Adjuntar usuario y continuar
    req.user = { ...decoded, type: 'admin', token };
    next();

  } catch (error) {
    console.error(' Error crítico en verifyAdmin:', error);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudo verificar la autorización.'
    });
  }
};

/**
 * Middleware para proteger endpoints que pueden ser accedidos por Owner o Staff.
 * Permite acceso a Administradores, Owner y Staff con permisos adecuados.
 * 
 * @param {string} resource - Nombre del recurso según convención (ej: 'ClienteTemporal_atc')
 * @param {string} method - Acción a validar ('Read', 'Create', 'Update', 'Delete')
 */
export const verifyOwnerOrStaff = (resource, method) => {
  return async (req, res, next) => {
    try {
      // 1. Intercepción del Token
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Token de autenticación no proporcionado.'
        });
      }

      const token = authHeader.substring(7);

      // 2. Decodificación Local Básica
      let decoded;
      try {
        decoded = jwt.verify(token, envs.JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ 
          error: 'Token inválido', 
          message: 'Su sesión ha expirado o es inválida.' 
        });
      }

      // 3. Verificar si es Administrador (Admin tiene acceso completo)
      if (decoded.isAdmin === true) {
        req.user = { ...decoded, type: 'admin', token };
        return next();
      }

      // 4. Validar que se proporcionen resource y method
      if (!resource || !method) {
        console.error(' Error de implementación: verifyOwnerOrStaff llamado sin resource o method');
        return res.status(500).json({ 
          error: 'Error de configuración de seguridad en el servidor.' 
        });
      }

      // 5. Verificar si es Owner (puede tener un campo específico o rol)
      // Por ahora, verificamos permisos a través del módulo de seguridad
      // que debería manejar tanto Owner como Staff
      const hasPermission = await checkPermissionViaSecurityModule(token, resource, method);

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Acceso Denegado',
          message: 'No tiene permisos para realizar esta acción. Se requiere rol Owner o Staff.'
        });
      }

      // 6. Adjuntar usuario y continuar
      // El tipo puede ser 'owner' o 'staff' dependiendo del token
      req.user = { ...decoded, type: decoded.isOwner ? 'owner' : 'staff', token };
      next();

    } catch (error) {
      console.error(' Error crítico en verifyOwnerOrStaff:', error);
      return res.status(500).json({
        error: 'Error interno',
        message: 'No se pudo verificar la autorización con el servicio de seguridad.'
      });
    }
  };
};

/**
 * Consulta el endpoint /hasPermission del Módulo de Seguridad.
 * Documentación: Sección 4.1, Paso 2 (Versión Mejorada) [cite: 100-105]
 */
async function checkPermissionViaSecurityModule(token, resource, method) {
  const securityUrl = envs.CHARLOTTE_SECURITY_URL;

  if (!securityUrl) {
    throw new Error('CHARLOTTE_SECURITY_URL no está configurada.');
  }

  try {
    // Petición HTTP POST 
    const response = await fetch(`${securityUrl}/api/seguridad/auth/hasPermission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // [cite: 106]
      },
      body: JSON.stringify({
        resource: resource, // Ej: "Comanda_atc" [cite: 116]
        method: method      // Ej: "Create" [cite: 117]
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ Seguridad respondió status ${response.status}`);
      return false; // Ante la duda, denegar.
    }

    const data = await response.json();
    
    // El endpoint responde: { "hasPermission": true } [cite: 129]
    return data.hasPermission === true;

  } catch (error) {
    console.error(' Error comunicando con Módulo de Seguridad:', error.message);
    return false; // Fail-safe: si el microservicio cae, nadie pasa (excepto admins locales).
  }
}


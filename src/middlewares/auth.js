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
    // 1. Extraer el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token de autenticación no proporcionado. Formato esperado: Bearer <token>'
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // 2. Decodificar y verificar el token usando JWT_SECRET
    let decoded;
    try {
      decoded = jwt.verify(token, envs.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          message: 'El token de sesión ha expirado. Por favor, inicia sesión nuevamente.'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Token inválido',
          message: 'El token proporcionado no es válido.'
        });
      }
      throw error;
    }

    // 3. Verificar que el token contenga información de cliente temporal
    // Los tokens de cliente deben tener al menos table_id
    if (!decoded.table_id) {
      return res.status(403).json({
        error: 'Token inválido para cliente',
        message: 'El token no contiene la información necesaria de cliente temporal.'
      });
    }

    // 4. Adjuntar información del usuario al request para uso en controladores
    req.user = {
      type: 'guest',
      table_id: decoded.table_id,
      customer_name: decoded.customer_name,
      customer_dni: decoded.customer_dni,
      token: token
    };

    next();
  } catch (error) {
    console.error('Error en verifyGuest:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al verificar la autenticación.'
    });
  }
};

/**
 * Middleware para verificar permisos de Staff/Admin
 * Valida que el usuario tenga los permisos necesarios usando el protocolo de seguridad
 * 
 * @param {Object} req - Request object de Express
 * @param {Object} res - Response object de Express
 * @param {Function} next - Next middleware function
 * @param {Object} options - Opciones de validación: { resource, method }
 */
export const verifyStaff = (options = {}) => {
  return async (req, res, next) => {
    try {
      // 1. Extraer el token del header Authorization
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Token de autenticación no proporcionado. Formato esperado: Bearer <token>'
        });
      }

      const token = authHeader.substring(7); // Remover "Bearer "

      // 2. Decodificar y verificar el token usando JWT_SECRET
      let decoded;
      try {
        decoded = jwt.verify(token, envs.JWT_SECRET);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expirado',
            message: 'El token de sesión ha expirado. Por favor, inicia sesión nuevamente.'
          });
        }
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({
            error: 'Token inválido',
            message: 'El token proporcionado no es válido.'
          });
        }
        throw error;
      }

      // 3. Verificar si el usuario es administrador
      if (decoded.isAdmin === true) {
        // Usuario administrador: acceso completo
        req.user = {
          type: 'admin',
          id: decoded.id,
          name: decoded.name,
          lastName: decoded.lastName,
          email: decoded.email,
          isAdmin: true,
          token: token
        };
        return next();
      }

      // 4. Si no es admin, verificar permisos usando el módulo de seguridad
      // Si se proporcionaron opciones (resource y method), usar validación automática
      if (options.resource && options.method) {
        const hasPermission = await checkPermissionViaSecurityModule(
          token,
          options.resource,
          options.method
        );

        if (!hasPermission) {
          return res.status(403).json({
            error: 'Permisos insuficientes',
            message: 'No tiene permisos para realizar esta acción.'
          });
        }
      } else {
        // Si no se proporcionaron opciones, solo verificar que tenga roles (staff básico)
        if (!decoded.roles || !Array.isArray(decoded.roles) || decoded.roles.length === 0) {
          return res.status(403).json({
            error: 'Permisos insuficientes',
            message: 'El usuario no tiene roles asignados.'
          });
        }
      }

      // 5. Adjuntar información del usuario al request
      req.user = {
        type: 'staff',
        id: decoded.id,
        name: decoded.name,
        lastName: decoded.lastName,
        email: decoded.email,
        isAdmin: false,
        roles: decoded.roles || [],
        token: token
      };

      next();
    } catch (error) {
      console.error('Error en verifyStaff:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Ocurrió un error al verificar la autenticación.'
      });
    }
  };
};

/**
 * Función auxiliar para verificar permisos usando el endpoint hasPermission del módulo de seguridad
 * Implementa la "Versión Mejorada" del protocolo de seguridad
 * 
 * @param {string} token - Token JWT del usuario
 * @param {string} resource - Recurso a verificar (ej: "Table_atc", "Comanda_atc")
 * @param {string} method - Método a verificar (Create, Read, Update, Delete, All)
 * @returns {Promise<boolean>} true si tiene permiso, false en caso contrario
 */
async function checkPermissionViaSecurityModule(token, resource, method) {
  const securityUrl = envs.CHARLOTTE_SECURITY_URL;

  if (!securityUrl) {
    console.error('CHARLOTTE_SECURITY_URL no está configurada en variables de entorno');
    throw new Error('Servicio de seguridad no configurado');
  }

  try {
    // Realizar petición POST al endpoint hasPermission del módulo de seguridad
    const response = await fetch(`${securityUrl}/api/seguridad/auth/hasPermission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        resource: resource,
        method: method
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error al verificar permisos con módulo de seguridad: ${response.status} - ${errorText}`);
      
      // Si el servicio de seguridad no está disponible, denegar acceso por seguridad
      return false;
    }

    const data = await response.json();
    
    // El módulo de seguridad responde con { hasPermission: true/false }
    return data.hasPermission === true;

  } catch (error) {
    console.error('Error comunicando con Módulo de Seguridad:', error);
    // En caso de error, denegar acceso por seguridad
    return false;
  }
}

/**
 * Función auxiliar para verificar permisos de forma manual
 * Implementa la "Forma Manual" del protocolo de seguridad
 * Útil cuando se necesita más control sobre la validación
 * 
 * @param {string} token - Token JWT del usuario
 * @param {string} resource - Recurso a verificar (ej: "Table_atc", "Comanda_atc")
 * @param {string} method - Método a verificar (Create, Read, Update, Delete, All)
 * @returns {Promise<boolean>} true si tiene permiso, false en caso contrario
 */
export async function checkPermissionManual(token, resource, method) {
  const securityUrl = envs.CHARLOTTE_SECURITY_URL;

  if (!securityUrl) {
    console.error('CHARLOTTE_SECURITY_URL no está configurada en variables de entorno');
    throw new Error('Servicio de seguridad no configurado');
  }

  try {
    // 1. Decodificar el token para obtener los roles
    const decoded = jwt.verify(token, envs.JWT_SECRET);
    
    if (decoded.isAdmin === true) {
      return true; // Admin tiene acceso completo
    }

    if (!decoded.roles || !Array.isArray(decoded.roles) || decoded.roles.length === 0) {
      return false;
    }

    // 2. Consultar los roles al módulo de seguridad
    const response = await fetch(`${securityUrl}/api/seguridad/auth/rol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        roles: decoded.roles
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error al obtener roles del módulo de seguridad: ${response.status} - ${errorText}`);
      return false;
    }

    const roles = await response.json();

    // 3. Iterar sobre los roles y buscar el permiso correspondiente
    for (const role of roles) {
      if (!role.permissions || !Array.isArray(role.permissions)) {
        continue;
      }

      for (const permission of role.permissions) {
        // Verificar que el permiso coincida con el recurso y método solicitados
        if (
          permission.type === 'Resource' &&
          permission.resource === resource &&
          (permission.method === method || permission.method === 'All')
        ) {
          return true; // Permiso encontrado
        }
      }
    }

    return false; // No se encontró el permiso necesario

  } catch (error) {
    console.error('Error en verificación manual de permisos:', error);
    return false;
  }
}


import jwt from 'jsonwebtoken';
import { envs } from '../config/envs.js';

export const verifyGuestOrStaff = (resource, action) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const token = authHeader.substring(7);

    try {
      // PASO 1: Intentar validar como GUEST (Base de Datos Local)
      // Decodificamos primero para ver si tiene estructura de guest antes de pegar a la BD
      const decoded = jwt.verify(token, envs.JWT_SECRET);
      
      // Buscamos en BD Local
      const guest = await prisma.clienteTemporal.findUnique({
        where: { sessionToken: token }
      });

      if (guest && guest.status === 'ACTIVE') {
        // ✅ ES UN GUEST: Lo inyectamos y pasamos
        req.guest = {
          id: guest.id,
          tableId: guest.tableId,
          name: guest.customerName,
          dni: guest.customerDni,
          role: 'guest'
        };
        req.userType = 'GUEST'; // Flag para el controlador
        return next();
      }

      // PASO 2: Si no es Guest, intentamos validar como STAFF (Microservicio)
      // Reutilizamos la lógica de verifyStaff pero encapsulada
      // Nota: Llamamos a tu función verifyStaff manualmente
      const staffMiddleware = verifyStaff(resource, action);
      
      // Ejecutamos el middleware de staff "manualmente"
      // Si pasa, next() se llamará dentro de verifyStaff.
      // Si falla, verifyStaff responderá el error.
      staffMiddleware(req, res, (err) => {
        if (err) return next(err);
        req.userType = 'STAFF'; // Flag para el controlador
        next();
      });

    } catch (error) {
        // Si el token es inválido para ambos
        return res.status(401).json({ error: 'Token inválido o sesión expirada' });
    }
  };
};



export const ensureOwnership = (model) => {
  return async (req, res, next) => {
    // 1. Si es STAFF, tiene acceso VIP (pase directo)
    if (req.userType === 'STAFF') {
      return next(); 
    }

    // 2. Si es GUEST, verificamos propiedad
    if (req.userType === 'GUEST') {
      const resourceId = req.params.id; // Asumimos que el ID viene en la URL
      
      // Buscamos el recurso para ver de quién es
      // Usamos prisma[model] dinámicamente
      const resource = await prisma[model].findUnique({
        where: { id: resourceId }, // Ojo: Si usas UUID asegúrate que resourceId sea string
        select: { clienteId: true }
      });

      if (!resource) {
        return res.status(404).json({ error: 'Recurso no encontrado' });
      }

      // LA COMPARACIÓN CLAVE 🔐
      if (resource.clienteId !== req.guest.id) {
        return res.status(403).json({ 
          error: 'Acceso Prohibido', 
          message: 'No puedes acceder a datos que no te pertenecen.' 
        });
      }

      return next();
    }

    return res.status(401).json({ error: 'Identidad desconocida' });
  };
};


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


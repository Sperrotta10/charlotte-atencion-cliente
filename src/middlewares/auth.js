import jwt from "jsonwebtoken";
import { envs } from "../config/envs.js";
import { prisma } from "../db/client.js";

// 1. Definimos qué modelos usan ID numérico (Int) en tu schema.prisma
// Agrega aquí cualquier otro modelo que use autoincrement o Int como ID
const NUMERIC_ID_MODELS = ['clienteTemporal', 'table'];

export const verifyGuestOrStaff = () => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    const token = authHeader.substring(7);

    try {
      // 1. Decodificar Token
      let decoded;
      try {
        decoded = jwt.verify(token, envs.JWT_SECRET);
      } catch (jwtError) {
        // Si falla aquí, significa que no era Guest (BD) y tampoco es un JWT válido (Staff)
        console.error("Error JWT:", jwtError.message);
      }
      if (decoded) {
        // ---------------------------------------------------
        // CAMINO A: GUEST (Validar contra BD Local)
        // ---------------------------------------------------
        const guest = await prisma.clienteTemporal.findUnique({
          where: { sessionToken: token },
        });

        if (guest && guest.status === "ACTIVE") {
          req.guest = {
            id: guest.id,
            tableId: guest.tableId,
            name: guest.customerName,
            dni: guest.customerDni,
            role: "guest",
          };
          req.userType = "GUEST"; // Flag para el controlador
          return next(); // ✅ IMPORTANTE: Dejar pasar
        }
      }
      // Si no tiene un token de guest valido, se asume que es una petición del STAFF
      req.userType = "STAFF";
      req.user = { type: "staff", token };
      return next();
    } catch (error) {
      console.error("Error interno middleware:", error);
      return res
        .status(500)
        .json({ error: "Error interno verificando sesión" });
    }
  };
};

export const ensureOwnership = (model) => {
  return async (req, res, next) => {
    // 1. Si es STAFF, tiene acceso VIP
    if (req.userType === "STAFF") {
      return next();
    }

    // 2. Si es GUEST, verificamos propiedad
    if (req.userType === "GUEST") {
      let resourceId = req.params.id; 

      if (NUMERIC_ID_MODELS.includes(model)) {
        const parsedId = parseInt(resourceId, 10);
        if (isNaN(parsedId)) {
          return res.status(400).json({ 
            error: "ID inválido", 
            message: `El ID para ${model} debe ser numérico.` 
          });
        }
        resourceId = parsedId;
      }

      try {
        // --- SELECCIÓN DINÁMICA DEL CAMPO PROPIETARIO ---
        const ownerField = model === 'clienteTemporal' ? 'id' : 'clienteId';

        // Buscamos el recurso seleccionando solo el campo necesario
        const resource = await prisma[model].findUnique({
          where: { id: resourceId },
          select: { [ownerField]: true }, // Usamos corchetes para usar la variable como clave
        });

        if (!resource) {
          return res.status(404).json({ error: "Recurso no encontrado" });
        }

        // --- COMPARACIÓN DINÁMICA 🔐 ---
        // Comparamos el campo dinámico (id o clienteId) con el ID del usuario en sesión
        if (resource[ownerField] !== req.guest.id) {
          return res.status(403).json({
            error: "Acceso Prohibido",
            message: "No puedes acceder a datos que no te pertenecen.",
          });
        }

        return next();

      } catch (error) {
        console.error(`Error en ensureOwnership para modelo ${model}:`, error);
        return res.status(500).json({ error: "Error interno al verificar permisos" });
      }
    }

    return res.status(401).json({ error: "Identidad desconocida" });
  };
};

export const verifyGuest = async (req, res, next) => {
  try {
    // 1. Extracción del token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No autorizado",
        message: "Token no proporcionado.",
      });
    }

    const token = authHeader.substring(7);

    // 2. Verificación criptográfica (JWT)
    // Nota: Asumimos que compartes el SECRET con el módulo de seguridad o usas clave pública/privada.
    let decoded;
    try {
      decoded = jwt.verify(token, envs.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // 3. VALIDACIÓN DE ESTADO CONTRA BASE DE DATOS (El paso crítico)
    // Buscamos al cliente por el token exacto y verificamos que esté ACTIVO.
    const currentClient = await prisma.clienteTemporal.findUnique({
      where: {
        sessionToken: token,
      },
      include: {
        table: true, // Opcional: si necesitas datos de la mesa
      },
    });

    // 4. Casos de rechazo de sesión
    if (!currentClient) {
      return res.status(403).json({
        error: "Sesión no encontrada",
        message: "Esta sesión no existe en nuestros registros.",
      });
    }

    if (currentClient.status !== "ACTIVE") {
      return res.status(403).json({
        error: "Sesión finalizada",
        message:
          "Tu sesión en esta mesa ya ha sido cerrada. Por favor escanea el QR nuevamente.",
      });
    }

    // 5. Inyectar el usuario COMPLETO en el request
    // Ahora tus controladores tendrán acceso al ID real de la base de datos (currentClient.id)
    req.guest = {
      id: currentClient.id, // ESTO ES LO QUE NECESITABAS
      tableId: currentClient.tableId,
      name: currentClient.customerName,
      dni: currentClient.customerDni,
      role: "guest",
      token: token,
    };

    next();
  } catch (error) {
    console.error("Error crítico en verifyGuest:", error);
    return res.status(500).json({
      error: "Error interno",
      message: "No se pudo verificar la sesión del invitado.",
    });
  }
};

export const verifyStaff = (resource, method) => {
  return async (req, res, next) => {
    try {
      // 1. Intercepción del Token [cite: 71]
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "No autorizado",
          message: "Token de autenticación no proporcionado.",
        });
      }

      const token = authHeader.substring(7);

      // 2. Decodificación Local Básica [cite: 72]
      let decoded;
      try {
        decoded = jwt.verify(token, envs.JWT_SECRET);
      } catch (error) {
        return res.status(401).json({
          error: "Token inválido",
          message: "Su sesión ha expirado o es inválida.",
        });
      }

      // 3. Verificar si es Administrador
      // Si es admin, tiene pase libre y no consultamos al MS de Seguridad.
      if (decoded.isAdmin === true) {
        req.user = { ...decoded, type: "admin", token };
        return next();
      }

      // Validación de integridad: El manual exige validar resource y method
      if (!resource || !method) {
        console.error(
          "❌ Error de implementación: verifyStaff llamado sin resource o method"
        );
        return res.status(500).json({
          error: "Error de configuración de seguridad en el servidor.",
        });
      }

      // 4. Validación Delegada (S2S) al Módulo de Seguridad [cite: 101]
      const hasPermission = await checkPermissionViaSecurityModule(
        token,
        resource,
        method
      );

      if (!hasPermission) {
        // [cite: 131] Si hasPermission es false, responder 403.
        return res.status(403).json({
          error: "Acceso Denegado",
          message:
            "No tiene permisos para realizar esta acción sobre este recurso.",
        });
      }

      // 5. Adjuntar usuario y continuar
      req.user = { ...decoded, type: "staff", token };
      next();
    } catch (error) {
      console.error("🔥 Error crítico en verifyStaff:", error);
      return res.status(500).json({
        error: "Error interno",
        message:
          "No se pudo verificar la autorización con el servicio de seguridad.",
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
    throw new Error("CHARLOTTE_SECURITY_URL no está configurada.");
  }

  try {
    // Petición HTTP POST
    const response = await fetch(
      `${securityUrl}/api/seguridad/auth/hasPermission`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // [cite: 106]
        },
        body: JSON.stringify({
          resource: resource, // Ej: "Comanda_atc" [cite: 116]
          method: method, // Ej: "Create" [cite: 117]
        }),
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Seguridad respondió status ${response.status}`);
      return false; // Ante la duda, denegar.
    }

    const data = await response.json();

    // El endpoint responde: { "hasPermission": true } [cite: 129]
    return data.hasPermission === true;
  } catch (error) {
    console.error(" Error comunicando con Módulo de Seguridad:", error.message);
    return false; // Fail-safe: si el microservicio cae, nadie pasa (excepto admins locales).
  }
}

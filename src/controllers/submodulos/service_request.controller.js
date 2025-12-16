
import { prisma } from '../../db/client.js';

// POST /service-requests
export const createServiceRequest = async (req, res) => {
  try {
    const { type, message } = req.body;
    
    // ID Hardcodeado: Simulamos que es el Cliente #1 (requisito de la tarea)
    const clienteIdFijo = 1; 

    const newRequest = await prisma.serviceRequest.create({
      data: {
        clienteId: clienteIdFijo,
        type: type,      // Ejemplo: "CALL_WAITER"
        message: message // Ejemplo: "Traer la cuenta"
      }
    });

    res.status(201).json({
      success: true,
      data: newRequest
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud',
      error: error.message
    });
  }
};


// PATCH /service-requests/:id
export const attendServiceRequest = async (req, res) => {
  try {
    const { id } = req.params; // Obtenemos el ID de la URL

    const updatedRequest = await prisma.serviceRequest.update({
      where: { 
        id: Number(id) // IMPORTANTE: Convertir el string de la URL a número
      },
      data: {
        status: 'ATTENDED',      // Cambiamos el estado
        attendedAt: new Date()   // Guardamos la fecha y hora de atención
      }
    });

    res.json({
      success: true,
      message: 'Solicitud atendida correctamente',
      data: updatedRequest
    });

  } catch (error) {
    console.error(error);
    
    // Si el ID no existe, Prisma suele lanzar un error específico, 
    // pero por ahora manejaremos un error general 500 o 404 según corresponda.
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la solicitud (verifica si el ID existe)',
      error: error.message
    });
  }
};

//GET 
export const getServiceRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.serviceRequest.findUnique({
      where: {
        id: Number(id)
      }
    });

    // Validamos si no se encontró nada
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    res.json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la solicitud',
      error: error.message
    });
  }
};
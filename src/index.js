import express from 'express';
import bodyParser from 'body-parser';
import { envs } from './config/envs.js';
import exampleRoutes from './routes/example/example.routes.js';
import mainAtencionClienteRoutes from './routes/main.route.js';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUI from 'swagger-ui-express';
import swaggerDocument from '../doc/posmant/atencion-cliente.openapi.json' with { type: 'json' };
// Graceful Shutdown: Cerrar conexiones al detener el servidor
import { prisma } from './db/client.js';

const app = express();

// Configurar CORS
const allowedOrigins = (envs.ALLOWED_ORIGINS || '').split(',');

app.use(cors({

  origin: function (origin, callback) {

    // Permitir solicitudes sin origen (como Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'La política de CORS no permite el acceso desde este origen.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Permitir cookies y credenciales
}))

// Middlewares globales
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(morgan('dev'));

// Rutas
app.get('/api', (req, res) => {
  res.json({ up: true });
});

// Montar rutas de ejemplo
app.use('/api/example', exampleRoutes);

// Documentación de la API con Swagger
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// Ruta de atención al cliente (route MAIN)
app.use('/api/v1/atencion-cliente', mainAtencionClienteRoutes);

// Iniciar servidor
const server = app.listen(envs.PORT, () =>
  console.log(`🚀 Server ready at: http://localhost:${envs.PORT}`)
);

const gracefulShutdown = async () => {
  console.log('\nCerrando servidor y desconectando base de datos...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Servidor cerrado correctamente.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);



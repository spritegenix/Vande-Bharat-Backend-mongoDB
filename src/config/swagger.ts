import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerOptions: Parameters<typeof swaggerJSDoc>[0] = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vande Bharat API',
      version: '1.0.0',
      description: 'API documentation for the social media backend',
    },
    servers: [
      {
        url: 'http://localhost:3000/',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/**/*.ts', './src/models/**/*.ts'], 
};

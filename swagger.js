const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CampusTrade API',
      version: '1.0.0'
    },
    servers: [
      { url: 'http://localhost:6778', description: 'Development' }
    ]
  },
  apis: ['./routes/**/*.js']
};

const specs = swaggerJsdoc(options);
module.exports = { specs, swaggerUi };
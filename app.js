const logger = require('./logger');
const { sendError } = require('./utils/responseStruture');
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({
    origin: process.env.frontedURL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

// Body parsing
app.use(express.json());
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ limit: '1mb', extended: true }));

const buyerRoutes = require('./routes/buyer.route');
const vendorRoutes = require('./routes/vendor.route');
const founderRoutes = require('./routes/founder.route');
const notificationRoutes = require('./routes/notification.route');
const chatRoutes = require('./routes/chat.route');
const schoolRoute = require('./routes/school.route')
const supportRoute = require('./routes/support.routes')

app.use('/api/buyer', buyerRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/founder', founderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/schools', schoolRoute);
app.use('/api/support', supportRoute);

const requestLogger = require('./middleware/requestLogger');

app.use(requestLogger);

const { specs, swaggerUi } = require('./swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// 404 handler
app.use((req, res) => {
  sendError(res, 404, 'Route not found')
})

app.use((err, req, res, next) => {
  logger.error(err);

  sendError(res, 500, 'Internal Server Error', process.env.NODE_ENV === 'production' ? null : err.message);
});

module.exports = app
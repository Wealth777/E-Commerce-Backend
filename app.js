// const express = require('express')
// const cors = require('cors')

// const app = express()

// app.use(cors({
//     origin: process.env.frontedURL,
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }))

// // Body parsing
// app.use(express.json());
// app.use(express.json({ limit: '1mb' }))
// app.use(express.urlencoded({ limit: '1mb', extended: true }));

// const buyerRoutes = require('./routes(copy)/buyer.route')
// const vendorRoutes = require('./routes(copy)/vendor.route')
// const founderRoutes = require('./routes(copy)/founder.route');

// app.use('/api/buyer', buyerRoutes)
// app.use('/api/vendor', vendorRoutes)
// app.use('/api/founder', founderRoutes)

// const requestLogger = require('./middleware(copy)/requestLogger');

// app.use(requestLogger);

// const { specs, swaggerUi } = require('./swagger');

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   })
// })

// app.use((err, req, res, next) => {
//   console.error(err);

//   res.status(500).json({
//     success: false,
//     message: "Internal Server Error",
//     error: process.env.NODE_ENV === "production" ? {} : err.message,
//   });
// });

// module.exports = app

const logger = require('./logger');
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({
    origin: process.env.frontedURL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

// Body parsing
app.use(express.json());
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ limit: '1mb', extended: true }));

const buyerRoutes = require('./routes/buyer.route')
const vendorRoutes = require('./routes/vendor.route')
const founderRoutes = require('./routes/founder.route');

app.use('/api/buyer', buyerRoutes)
app.use('/api/vendor', vendorRoutes)
app.use('/api/founder', founderRoutes)

const requestLogger = require('./middleware/requestLogger');

app.use(requestLogger);

const { specs, swaggerUi } = require('./swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

app.use((err, req, res, next) => {
  logger.error(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

module.exports = app
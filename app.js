const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({
    // origin: process.env.frontedURL,
    origin: 'http://localhost:5173',
    credentials: true
}))

// Body parsing
app.use(express.json());
app.use(express.json({ limit: '10mb' }))
// app.use(express.raw({ type: 'application/json' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const buyerRoutes = require('./routes/buyer.route')
const vendorRoutes = require('./routes/vendor.route')
const founderRoutes = require('./routes/founder.route')

app.use('/api/buyer', buyerRoutes)
app.use('/api/vendor', vendorRoutes)
app.use('/api/founder', founderRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

module.exports = app
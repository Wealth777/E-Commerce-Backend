// const app = require('./app')
// const dotenv = require('dotenv')
// const mongoose = require('mongoose')

// dotenv.config()

// const port = process.env.PORT

// async function validateEnvironment() {
//     const required = [
//         'JWT_KEY',
//         'JWT_REFRESH_SECRET',
//         'MONGO_URL',
//         'PORT',
//         'FRONTEND_URL',
//         'cloud_Name',
//         'cloud_API_Key',
//         'cloud_API_Secret',
//         'NODE_ENV'
//     ];

//     const missing = required.filter(key => !process.env[key]);

//     if (missing.length > 0) {
//         throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
//     }

//     // Also validate format
//     if (!process.env.PORT || isNaN(process.env.PORT)) {
//         throw new Error('PORT must be a valid number');
//     }

//     if (!process.env.JWT_KEY || process.env.JWT_KEY.length < 32) {
//         throw new Error('JWT_KEY must be at least 32 characters');
//     }
// }

// async function startServer() {
//     try {

//         await validateEnvironment();

//         await mongoose.connect(process.env.MONGO_URL, {
//             retryWrites: true,
//             serverSelectionTimeoutMS: 5000,
//             socketTimeoutMS: 45000,
//             maxPoolSize: 10,
//             minPoolSize: 2,
//             connectTimeoutMS: 10000,
//             appName: 'CampusTrade'
//         })

//         mongoose.connection.on('error', (err) => {
//             console.error('MongoDB connection error:', err);
//             process.exit(1);
//         });

//         mongoose.connection.on('disconnected', () => {
//             console.warn('MongoDB disconnected');
//         });

//         console.log(`✅ Database Connected Successfully`)

//         app.listen(port, () => {
//             console.log(`🚀 Server running on port ${port}`)
//         })
//     } catch (err) {
//         console.log(process.env.MONGO_URL)
//         console.log(`❌ Failed to start server: ${err.message}`)
//         process.exit(1)
//     }
// }

// startServer()

const logger = require('./logger');
const app = require('./app')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config()

const port = process.env.PORT

async function validateEnvironment() {
    const required = [
        'JWT_KEY',
        'JWT_REFRESH_SECRET',
        'MONGO_URL',
        'PORT',
        'FRONTEND_URL',
        'cloud_Name',
        'cloud_API_Key',
        'cloud_API_Secret',
        'NODE_ENV'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Also validate format
    if (!process.env.PORT || isNaN(process.env.PORT)) {
        throw new Error('PORT must be a valid number');
    }

    if (!process.env.JWT_KEY || process.env.JWT_KEY.length < 32) {
        throw new Error('JWT_KEY must be at least 32 characters');
    }
}

async function startServer() {
    try {

        await validateEnvironment();

        await mongoose.connect(process.env.MONGO_URL, {
            retryWrites: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 2,
            connectTimeoutMS: 10000,
            appName: 'CampusTrade'
        })

        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
            process.exit(1);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        logger.info(`✅ Database Connected Successfully`)

        app.listen(port, () => {
            logger.info(`🚀 Server running on port ${port}`)
        })
    } catch (err) {
        logger.debug('MongoDB URL configured', { configured: Boolean(process.env.MONGO_URL) })
        logger.error(`Failed to start server: ${err.message}`, { stack: err.stack })
        process.exit(1)
    }
}

startServer()
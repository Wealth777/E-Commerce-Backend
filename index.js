const app = require('./app')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config()

const port = process.env.PORT
const mongodb_url = process.env.MONGO_URL

if (!mongodb_url) {
    console.log('❌ MongoDB uri not configured');
    process.exit(1);
}

async function startServer() {
    try{
        await mongoose.connect(mongodb_url, {
            retryWrites: true,
            serverSelectionTimeoutMS: 5000,
        })

        console.log(`✅ Database Connected Successfully`)

        app.listen(port, ()=>{
            console.log(`🚀 Server running on port ${port}`)
        })
    }catch(err){
        console.log(`❌ Failed to start server: ${err.message}`)
        process.exit(1)
    }
}

startServer()
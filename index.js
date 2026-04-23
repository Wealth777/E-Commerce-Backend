const app = require('./app')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config()

const port = process.env.PORT

async function startServer() {
    try{
        await mongoose.connect(process.env.MONGO_URL, {
            retryWrites: true,
            serverSelectionTimeoutMS: 5000,
        })

        // console.log(process.env.MONGO_URL)
        console.log(`✅ Database Connected Successfully`)

        app.listen(port, ()=>{
            console.log(`🚀 Server running on port ${port}`)
        })
    }catch(err){
        console.log(process.env.MONGO_URL)
        console.log(`❌ Failed to start server: ${err.message}`)
        process.exit(1)
    }
}

startServer()
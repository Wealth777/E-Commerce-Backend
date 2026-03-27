const mongoose = require('mongoose')

const founder = new mongoose.Schema({
    serialNumber: { type: String, unique: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    phoneNo: {type: String, required: true, unique: true},
    password: {type: String, required: true},
})

module.exports = mongoose.model('Founder', founder)
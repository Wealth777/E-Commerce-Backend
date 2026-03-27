const mongoose = require('mongoose')

const vendor = new mongoose.Schema({
    serialNumber: { type: String, unique: true},
    fullName: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    phoneNo: {type: String, required: true, unique: true},
    password: {type: String, required: true}
})

module.exports = mongoose.model('Vendor', vendor)
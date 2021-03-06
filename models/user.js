const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
    },
    name: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('User', userSchema)
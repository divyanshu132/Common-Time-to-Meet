const mongoose = require('mongoose')

const userTimingPreferenceSchema = new mongoose.Schema({
    email: {
        type: String
    },
    day_start_time: {
        type: Date,
        required: true
    },
    day_end_time: {
        type: Date,
        required: true
    },
    timezone: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('UserTimingPreference', userTimingPreferenceSchema)
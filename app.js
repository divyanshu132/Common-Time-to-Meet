const express = require('express')
const app = express()

if (!(process.env.NODE_ENV === 'test')) {
    const dbConnect = require('./dbConnect.js')
    dbConnect.connect('open', () => {
        console.log("Connected......")
    })
    .catch(err => {
        console.log("Error in db connection.. " + err)
    })
}

app.use(express.json())

const userRouter = require('./routes/users')
app.use('/users', userRouter)

const userTimingPreferenceRouter = require('./routes/userTimingPreferences')
app.use('/userTimingPreference', userTimingPreferenceRouter)

const suggestTimeRouter = require('./routes/suggestTime')
app.use('/suggested-time', suggestTimeRouter)

app.listen(9000, () => {
    console.log("Server started...")
})

module.exports = app
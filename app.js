const express = require('express')
const mongoose = require('mongoose')
const url = 'mongodb://localhost/Users'

const app = express()

mongoose.connect(url, {useNewUrlParser: true})
const con = mongoose.connection

con.on('open', () => {
    console.log("Connected......")
})

app.use(express.json())

const userRouter = require('./routes/users')
app.use('/users', userRouter)

const userTimingPreferenceRouter = require('./routes/userTimingPreferences')
app.use('/userTimingPreference', userTimingPreferenceRouter)

app.listen(9000, () => {
    console.log("Server started...")
})
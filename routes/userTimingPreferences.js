const { json } = require('express')
const express = require('express')
const { MongoError } = require('mongodb')
const router = express.Router()
const UserTimingPreference = require('../models/userTimingPreference')

// Get time preferences of all the users
router.get('/', async(req, res) => {
    UserTimingPreference.find().then((data) => {
        if (!data) {
            res.status(404).send({ message : "No records found"})
        }
        else {
            res.send(data)
        }
    })
    .catch(err => {
        res.status(500).send({ message: "Error Occurred while retriving records"})
    })
})

// Get time preference of a particular user with id as id
router.get('/:id', (req, res) => {
    const id = req.params.id

    UserTimingPreference.findById(id).then((data) => {
        if (!data) {
            res.status(404).send({ message : "No record found with id "+ id})
        }
        else {
            res.send(data)
        }
    })
    .catch(err => {
        res.status(500).send({ message: "Error retrieving record with id " + id})
    })
})


// Add a time preference for a particular user
router.post('/', async(req, res) => {

    // Validate request
    if (!req.body) {
        return res.status(400).send({ message : "User details are missing"})
    }
    if (!req.body.day_start_time) {
        return res.status(400).send({ message : "day_start_time is missing"})
    }
    if (!req.body.day_end_time) {
        return res.status(400).send({ message : "day_end_time is missing"})
    }

    const startTime = req.body.day_start_time
    const endTime = new Date(req.body.day_end_time)
    const email = req.body.email ? req.body.email.toLowerCase():''

    const user = new UserTimingPreference({
        day_start_time: startTime,
        day_end_time: endTime,
        timezone: req.body.timezone ? req.body.timezone:'Asia/Kolkata',
        email: email
    })

    try {
        const response = await user.save()
        res.json(response)
    }
    catch(err) {
        res.status(500).send({
            message : err.message || "Some error occurred while adding the record"
        });
    }
})

// Update a particular record
router.patch('/:id', (req, res) => {
    const id = req.params.id
    console.log(req.body + "Body")
    if (!req.body) {
        return res.status(400).send({ message : "Data to update can not be empty"})
    }

    UserTimingPreference.findByIdAndUpdate(id).then(async (data) => {
        if (!data) {
            res.status(404).send({ message : `Cannot Update user with ${id}. Maybe user not found!`})
        }
        else {
            for (let key in req.body) {
                data[key] = req.body[key]
            }
            const result = await data.save()
            res.send(result)
        }
    })
    .catch(err => {
        res.status(500).send({message: "Error updating record information with id " + id})
    })
})

router.delete('/:id', async(req, res) => {
    const id = req.params.id

    UserTimingPreference.findById(id).then(async (data) => {
        if (!data) {
            res.status(404).send({ message : `Cannot delete record with id ${id}. Maybe id is wrong`})
        }
        else {
            const result = await data.delete()
            res.send({message: "Record deleted successfully!"})
        }
    })
    .catch(err => {
        res.status(500).send({
            message: err.message || "Could not delete User with id = " + id
        });
    })
})

module.exports = router
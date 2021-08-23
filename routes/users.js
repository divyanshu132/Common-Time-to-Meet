const express = require('express')
const { MongoError } = require('mongodb')
const router = express.Router()
const User = require('../models/user')


// get all the users
router.get('/', (req, res) => {
    User.find().then((users) => {
        if (!users) {
            res.status(404).send({ message : "No users found"})
        }
        else {
            res.send(users)
        }
    })
    .catch(err => {
        res.status(500).send({ message: "Error Occurred while retriving users"})
    })
})

// get a specific user on the basis of id
router.get('/:id', (req, res) => {
    const id = req.params.id

    User.findById(id).then((user) => {
        if (!user) {
            res.status(404).send({ message : "No user found with id "+ id})
        }
        else {
            res.send(user)
        }
    })
    .catch(err => {
        res.status(500).send({ message: "Error retrieving user with id " + id})
    })
})

// add a new user
router.post('/', async(req, res) => {
    // Validate request
    if (!req.body) {
        return res.status(400).send({ message : "Body is missing"})
    }

    // new user
    const user = new User({
        name: req.body.name,
        email: req.body.email ? req.body.email:''
    })

    try {
        const response = await user.save()
        res.json(response)
    }
    catch(err) {
        res.status(500).send({
            message : err.message || "Some error occurred while adding the user"
        });
    }
})


// update an existing user
router.patch('/:id', (req, res) => {
    const id = req.params.id
    if (!req.body) {
        return res.status(400).send({ message : "Data to update can not be empty"})
    }

    User.findByIdAndUpdate(id).then(async (user) => {
        if (!user) {
            res.status(404).send({ message : `Cannot update user with ${id}. Maybe user not found!`})
        }
        else {
            for (let key in req.body) {
                user[key] = req.body[key]
            }
            const result = await user.save()
            res.send(result)
        }
    })
    .catch(err => {
        res.status(500).send({message: "Error updating user information with id " + id})
    })
})


// delete an existing user
router.delete('/:id', (req, res) => {
    const id = req.params.id
    User.findById(id).then(async (data) => {
        if (!data) {
            res.status(404).send({ message : `Cannot delete user with id ${id}. Maybe id is wrong`})
        }
        else {
            const result = await data.delete()
            res.send({message: "User deleted successfully!"})
        }
    })
    .catch(err => {
        res.status(500).send({
            message: err.message || "Could not delete User with id = " + id
        });
    })
})

module.exports = router
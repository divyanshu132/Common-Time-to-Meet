const express = require('express')
const { ReplSet } = require('mongodb')
const { MongoError } = require('mongodb')
const router = express.Router({ mergeParams : true })
const User = require('../models/user')
const UserTimingPreference = require('../models/userTimingPreference')
const timeZone = require('../timeZones')


const performOperation = (op, time, hrs, mins) => {
    /*
        Add or subtract the time differences between two time zones

        op: It represents the operation we need to perform (+/-)
        time: The time object
        hrs: Number of hrs by which time leads or lags
        mins: Number of mins by which time leads or lags
    */

    switch (op) {
        case '-':
            return new Date(time).getTime()-(hrs*60+parseInt(mins))*60*1000
        case '+':
           return new Date(time).getTime()+(hrs*60+parseInt(mins))*60*1000
    }
}

const convertTimeZone = (schedule, timezone1, timezone2) => {
    /*
        Converts the timezone

        schedule: An array of start & end time objects
        timezone1/timezone2: Two timezones
    */

    try {
        if (timeZone.zonesMap[timezone1]) {
            return schedule
        }
        // Make adjustments in one person's schedule
        if (timeZone.zonesMap[timezone2] && timeZone.zonesMap[timezone2][timezone1]) {
            // Get the offset by which one time zone leads the another
            let offset = timeZone.zonesMap[timezone2][timezone1]
            let op = offset[0] && (offset[0] == '+' || offset[0] == '-') ? offset[0]:'+';
            let splits = offset.split(':')
            let hrs = splits && splits.length > 0 ? splits[0].substr(1) : 0
            let mins = splits && splits.length > 0 ? splits[1] : 0

            for (let slot of schedule) {
                slot.start = performOperation(op, slot.start, hrs, mins)
                slot.end = performOperation(op, slot.end, hrs, mins)
            }
        }
    }
    catch (err) {
        console.log(err.message || "Error occured in convertTimeZone function")
    }
    return schedule
}


const getFreeSlots = (schedule, freeSlots) => {
    /*
        Construct a free slots array. It will contain objects with start & end time which
        represents the time slots in which a particular user is free.

        schedule: An array containing all the busy slots of an individual
        freeSlots: Push all the free slots to this. Initially it contains only one entry.
                    Which represents the day_start_time & day_end_time

    */

    try {
        // Pointer to the freeslots array
        let j=0
        for (let i=0;i<schedule.length;i++) {
            let startTime = new Date(schedule[i].start).getTime()
            let endTime = new Date(schedule[i].end).getTime()
            // Get the first free slot interval
            let dayStart =  freeSlots[j].start
            let dayend = freeSlots[j].end

            // [startTime - endTime] slot falls in between the range of first free slot interval [dayStart - dayend]
            // finally 2 free slots will be formed namely -> [dayStart, startTime] and [endTime, dayend]
            if (startTime > freeSlots[j].start) {
                let temp = freeSlots[j].start
                freeSlots[j].start = endTime
                
                // insert before current index so it will maintain the sorted order on the basis of start time
                freeSlots.splice(j, 0, {start: temp, end: startTime})
                j++
            }
            // if startTime == dayStart then we'll have one slot namely -> [endTime, dayend]
            else {
                freeSlots[j].start = endTime
            }
        }
    }
    catch (err) {
        console.log(err.message || "Error occured in getFreeSlots function")
    }
    return freeSlots
}

const userTwoIsFree = (freeSlots, startTime, endTime) => {
    /*
        Checks if user 2 is available at the same time when user 1 is available.
        freeSlots: Available slots of user 2
        [startTime - endTime]: Time interval in which user 1 is available
    
    */

    for (let slot of freeSlots) {
        if (startTime < slot.start) {
            return false
        }
        if (startTime >= slot.start && endTime <= slot.end) {
            return true
        }
    }
    return false
}

// sorts an array of objects on the basis of start time
const customSort = (time1, time2) => {
    if (new Date(time1.start) < new Date(time2.start)) {
        return -1;
    }
    return 0
}

const getFreeTime = (schedule1, schedule2, duration, count, freeSlots1, freeSlots2, timezone1, timezone2) => {
    /*
    
        Returns an array of objects containing count or less than count start & end time of available slots.
        schedule1/schedule2: Busy slots of respective users
        duration: Call duration
        count: Number of free slots needs to be returned
        freeSlots1/freeSlots2: Free slots in a daily calender of respective users
        timezone1/timezone2: Timezone of respective users
    */

    try {
        // Appropriately convert time zones    
        schedule1 = convertTimeZone(schedule1, timezone1, timezone2)
        schedule2 = convertTimeZone(schedule2, timezone2, timezone1)
        freeSlots1 = convertTimeZone(freeSlots1, timezone1, timezone2)
        freeSlots2 = convertTimeZone(freeSlots2, timezone2, timezone1)

        // Sort the existing schedules of both the users in ascending order on the basis of start time
        schedule1.sort(customSort)
        schedule2.sort(customSort)

        // Get the free slots for both the users
        freeSlots1 = getFreeSlots(schedule1, freeSlots1)
        freeSlots2 = getFreeSlots(schedule2, freeSlots2)

        // Res will contain the final result
        let res = {"slots": []}
        for (let i=0;i<freeSlots1.length;i++) {
            let slot = freeSlots1[i]
            if (res.slots.length == count) {
                return res;
            }
            let startTime = slot.start
            // Generate endtime by startTime + time required of meeting
            let endTime = startTime+(duration*60*1000)
        
            // if it falls in the current free slot choose this time as one of the options
            if (endTime <= slot.end && userTwoIsFree(freeSlots2, startTime, endTime)) {
                res.slots.push({
                    "start": new Date(startTime).toLocaleString(), 
                    "end": new Date(endTime).toLocaleString()
                })
                // add the remaining protion of first interval from the free slot to next iteration
                if (endTime != slot.end) {
                    freeSlots1.splice(i+1, 0, {start: endTime, end: slot.end})
                }
            }
        }
        return res
    }
    catch (err) {
        console.log(err.message || "Error occured in getFreeTime function")
    }
    return {}
}

router.post('/', async(req, res) => {
    
    if (!req.body || !(req.body.userId1 && req.body.userId1.calendars
         && req.body.userId1.calendars.primary && req.body.userId1.calendars.primary.busy) || 
         !(req.body.userId2 && req.body.userId2.calendars
            && req.body.userId2.calendars.primary && req.body.userId2.calendars.primary.busy)) {

        return res.status(400).send({ message : "Please verify the request body"})
    }
    if (!req.query) {
        return res.status(400).send({ message : "Query details are missing"})
    }
    if (!req.query.users || req.query.users.split(",").length != 2) {
        return res.status(400).send({ message : "Two user Ids are required"})
    }
    if (!req.query.duration_mins) {
        return res.status(400).send({ message : "duration_mins is missing"})
    }

    // Get query params
    const users = req.query.users.split(",")
    const duration_mins = req.query.duration_mins
    const count = req.query.count ? req.query.count : 1
    const body = req.body

    // Get the busy schedules of both the users from request body
    let schedule1 = req.body.userId1.calendars.primary.busy
    let schedule2 = req.body.userId2.calendars.primary.busy

    let usersArray = []
    for (let id of users) {
        await UserTimingPreference.findById(id).then((user) => {
            if (!user) {
                res.status(404).send({ message : "No user found with id "+ id})
            }
            else {
                usersArray.push(user)
            }
        })
        .catch (err => {
            return res.status(500).send({ message: "Error retrieving user with id " + id})
        })
    }

    let freeSlots1 = [{
        start: usersArray[0].day_start_time.getTime(), 
        end: usersArray[0].day_end_time.getTime()
    }]
    let freeSlots2 = [{
        start: usersArray[1].day_start_time.getTime(), 
        end: usersArray[1].day_end_time.getTime()
    }]
    
    let freeSlots = getFreeTime(schedule1, schedule2, duration_mins, count,
                                freeSlots1, freeSlots2, usersArray[0].timezone, usersArray[1].timezone)
    
    if (freeSlots.length < 1) {
        return res.status(409).send({ message: "No common slots found"})
    }
    else {
        res.json(freeSlots)
    }
})

module.exports = router
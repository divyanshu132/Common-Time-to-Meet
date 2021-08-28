process.env.NODE_ENV = 'test';

const expect = require('chai').expect;
const request = require('supertest');

const app = require('../app.js')
const conn = require('../dbConnect')

// Busy schedule of user1
let userId1 = {
    "calendars":{
       "primary":{
          "busy":[
             {
                "start":"2022-06-04T08:00:00+05:30",
                "end":"2022-06-04T09:00:00+05:30"
             },
             {
                "start":"2022-06-04T10:00:00+05:30",
                "end":"2022-06-04T11:00:00+05:30"
             }
          ]
       }
    }
 }

// Busy schedule of user 2
let userId2 = {
    "calendars":{
        "primary":{
            "busy":[
                {
                "start":"2022-06-04T08:00:00+05:30",
                "end":"2022-06-04T09:00:00+05:30"
                },
                {
                "start":"2022-06-04T10:00:00+05:30",
                "end":"2022-06-04T11:00:00+05:30"
                }
            ]
        }
    }
}

 // Day start & end time of both the users
 const day_start_time_user1 = "2022-06-04T09:00:00+05:30"
 const day_end_time_user1 = "2022-06-04T17:00:00+05:30"

 const day_start_time_user2 = "2022-06-04T09:00:00+05:30"
 const day_end_time_user2 = "2022-06-04T17:00:00+05:30"

 // Tmezones
 const timezone1 = "Asia/Kolkata"
 const timezone2 = "Europe/London"

describe('POST /suggested-time', async() => {
    before((done) => {
        conn.connect()
        .then(() => done())
        .catch((err) => done(err))
    })

    after((done) => {
        conn.close()
        .then(() => done())
        .catch((err) => done(err))
    })


    /*
        TEST CASE - 1
        Suggest time on the basis of free slots available.
        users: user1 & user2 (users we created above)
        duration_mins: 30 mins
        count: Number of slots required i.e 3

        Since we are using mockdatabase we will pass the timepreference body of both the users as
        `user1Details` & `user2Details`

        For this test we are considering both the users to be in same time zone i.e "Asia/Kolkata"

    */
    it('OK, suggest time works', (done) => {
        // Post time preference of 1st user
        request(app).post('/userTimingPreference')
        .send({day_start_time: day_start_time_user1, day_end_time: day_end_time_user1, timezone: timezone1})
        .then(async (timePreference1) => {

            // Post time preference of 2nd user
            request(app).post('/userTimingPreference')
            .send({day_start_time: day_start_time_user2, day_end_time: day_end_time_user2, timezone: timezone1})
            .then((timePreference2) => {
                // Get both the user ids
                const user1 = timePreference1.body._id;
                const user2 = timePreference2.body._id;
                
                request(app).post(`/suggested-time/?users=${user1},${user2}&duration_mins=30&count=3`)
                .send({userId1: userId1, userId2: userId2, user1Details: timePreference1.body, user2Details: timePreference2.body})
                .then((res) => {
                    const body = res.body
                    // console.log(body.slots)

                    // Result should have suggested slots
                    expect(body).to.contain.property('slots')
                    // The length should be equal to the count parameter
                    expect(body.slots.length).to.equal(3)

                    // For all the slots, check if slots are valid or not i.e start time of every slot
                    // should be greater than or equal to the day start time of user same goes for end time.
                    for (let slot of body.slots) {
                        expect(new Date(slot.start)).to.be.greaterThanOrEqual(new Date(day_start_time_user1))
                        expect(new Date(slot.start)).to.be.greaterThanOrEqual(new Date(day_start_time_user2))
                        
                        expect(new Date(slot.end)).to.be.lessThanOrEqual(new Date(day_end_time_user1))
                        expect(new Date(slot.end)).to.be.lessThanOrEqual(new Date(day_end_time_user2))
                    }
                    done()
                })
                .catch(err => {
                    done(err)
                })  
            })
        })
    })


    /*
        TEST CASE - 2
        For this test case we are keeping all everything same except the timezones.
        the timezone of user 2 has been changed to `Europe/London`
    */
    it('OK, suggest time works', (done) => {
        // Post time preference of 1st user
        request(app).post('/userTimingPreference')
        .send({day_start_time: day_start_time_user1, day_end_time: day_end_time_user1, timezone: timezone1})
        .then(async (timePreference1) => {

            // Post time preference of 2nd user
            request(app).post('/userTimingPreference')
            .send({day_start_time: day_start_time_user2, day_end_time: day_end_time_user2, timezone: timezone1})
            .then((timePreference2) => {
                // Get both the user ids
                const user1 = timePreference1.body._id;
                const user2 = timePreference2.body._id;

                timePreference2.body.timezone = timezone2 // chage timezone of 2nd user
                request(app).post(`/suggested-time/?users=${user1},${user2}&duration_mins=60&count=2`)
                .send({userId1: userId1, userId2: userId2, user1Details: timePreference1.body, user2Details: timePreference2.body})
                .then((res) => {
                    const body = res.body
                    // console.log(body.slots)
                    expect(body).to.contain.property('slots')
                    expect(body.slots.length).to.equal(2)
                    for (let slot of body.slots) {
                        expect(new Date(slot.start)).to.be.greaterThanOrEqual(new Date(day_start_time_user1))
                        expect(new Date(slot.start)).to.be.greaterThanOrEqual(new Date(day_start_time_user2))
                        
                        expect(new Date(slot.end)).to.be.lessThanOrEqual(new Date(day_end_time_user1))
                        expect(new Date(slot.end)).to.be.lessThanOrEqual(new Date(day_end_time_user2))
                    }
                    done()
                })
                .catch(err => {
                    done(err)
                })
            })
        })
    })


    /*
        TEST CASE - 3
        Chage start time & end time of users 1 & 2 in such a way that there is no common
        slots between them, then API should return 0 records with an appropriate message
        `No common slots found`
    
    */
    it('OK, suggest time works', (done) => {
        // Post time preference of 1st user
        request(app).post('/userTimingPreference')
        .send({day_start_time: day_start_time_user1, day_end_time: day_end_time_user1, timezone: timezone1})
        .then(async (timePreference1) => {

            // Post time preference of 2nd user
            request(app).post('/userTimingPreference')
            .send({day_start_time: day_start_time_user2, day_end_time: day_end_time_user2, timezone: timezone1})
            .then((timePreference2) => {
                // Get both the user ids
                const user1 = timePreference1.body._id;
                const user2 = timePreference2.body._id;

                timePreference1.body.day_start_time = "2022-06-04T10:00:00+05:30"
                timePreference2.body.day_end_time = "2022-06-04T11:00:00+05:30"
                request(app).post(`/suggested-time/?users=${user1},${user2}&duration_mins=60&count=2`)
                .send({userId1: userId1, userId2: userId2, user1Details: timePreference1.body, user2Details: timePreference2.body})
                .then((res) => {
                    const body = res.body
                    expect(body).to.contain.property('message')
                    expect(body.message).to.equal('No common slots found')
                    done()
                })
                .catch(err => {
                    done(err)
                })
            })
        })
    })
})

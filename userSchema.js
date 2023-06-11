import mongoose from 'mongoose';

const user = new mongoose.Schema({
    usersID: String,
    name: String,
    phoneNumber: String,
    roommatesNumbs: Array,
    roommatesNames: Array,
    initialized: Boolean,
    toDelete: Boolean,
    toUpdate: Boolean,
})

const test = mongoose.model("User", user)

export {test}
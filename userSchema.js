import mongoose from 'mongoose';

const user = new mongoose.Schema({
    usersID: String,
    email: String,
    name: String,
    phoneNumber: String,
    roommatesNumbs: Array,
    roommatesNames: Array,
    initialized: Boolean,
    toDelete: Boolean,
    toUpdate: Boolean,
    electricProvider: String,
    gasProvider: String,
    roommateInfo: Array,
    expoPushToken: String
})

const test = mongoose.model("User", user)

export {test}
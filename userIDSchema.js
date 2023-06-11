import mongoose from 'mongoose';

const currEmail = new mongoose.Schema({
    usersID: String,
    electric: String,
    gas: String,
})

const currInfo = mongoose.model("currEmail", currEmail)

export {currInfo}
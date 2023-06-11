import mongoose from "mongoose";

const tokenInfo = new mongoose.Schema({
    usersID: String,
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
})

const userTokenInfo = mongoose.model("userTokenInfo", tokenInfo)

export {userTokenInfo} 
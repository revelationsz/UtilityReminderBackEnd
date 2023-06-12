import {checkforEmail as checkforEmailEversource, 
  onStart as onStartEversource,
  checknewEmail as checknewEmailEversource,
} from './modules/eversource.js'

import {checkforEmail as checkforEmailnationalGrid, 
  onStart as onStartnationalGrid,
  checknewEmail as checknewEmailnationalGrid,
} from './modules/nationalGrid.js'



import path from 'path'
import process from 'process'
import { google } from 'googleapis';
import mongoose from 'mongoose';
import express from 'express';
import bodyParser from 'body-parser'
import {router} from './routes.js'
import {test as User} from './userSchema.js'
import { currInfo as userInfo } from './userIDSchema.js';
import { userTokenInfo } from './userTokenSchema.js'
import {OAuth2Client} from 'google-auth-library';
import cors from 'cors';
import twilio from 'twilio';
import dotenv from 'dotenv/config';
import { validateExpressRequest } from 'twilio/lib/webhooks/webhooks.js';
    

let USERINFO;
let USERSET;
let serverCredentials;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

async function START_All_Utilities() { //create new OAuth2Client for each user out of tokes stored in db

    for(let [key, value] of USERSET.entries()) {
      console.log(value)
      if(value.initialized) {

        if(value.toDelete == true) return

        const oAuth2Client = new OAuth2Client(
          serverCredentials.client_id,
          serverCredentials.client_secret,
          serverCredentials.redirect_uris[0]
        );
        
        const userID = value.usersID

        const userAuth = await userTokenInfo.findOne({usersID: userID})
        const emailIds = await userInfo.findOne({usersID: userID})
        
        const credentials = {
          refresh_token: userAuth.refresh_token,
          scope: userAuth.scope,
          token_type: userAuth.token_type,
          access_token: userAuth.access_token,
          expiry_date: userAuth.expiry_date
        }
        
        oAuth2Client.setCredentials(credentials)

        let temp = value

        temp.OAuth2Client = oAuth2Client
        temp.electric = emailIds.electric
        temp.gas = emailIds.gas

        // console.log("temp", temp ,temp.OAuth2Client, temp.electric, temp.gas)
        USERSET.set(key, temp)   
    }
  }
}

async function checkforNewUsers() {
  const currentUserList = await User.find({initialized: false});
  if(currentUserList.length > 0) {
    console.log("new users")
    currentUserList.forEach(user =>{
      initialize_Utility(user)
    })
  }
}

async function checkforDeletions() {
  const currentUserList = await User.find({toDelete: true});
  if(currentUserList.length > 0) {
    currentUserList.forEach(async user =>{
      await User.findOneAndDelete({usersID: user.usersID})
      USERSET.delete(user.usersID)
    })
  }
}

async function checkforUpdates(){
  const currentUserList = await User.find({toUpdate: true});
  if(currentUserList.length > 0) {
    currentUserList.forEach(async user =>{
      console.log(user.usersID)
      user.OAuth2Client = USERSET.get(user.usersID).OAuth2Client
      user.electric = JSON.parse(JSON.stringify(USERSET.get(user.usersID).electric))
      user.gas = JSON.parse(JSON.stringify(USERSET.get(user.usersID).gas))
      user.toUpdate = false
      USERSET.set(user.usersID, user)
      await User.findOneAndUpdate({usersID: user.usersID}, {$set:{toUpdate: false}}, {new: true})
    })
  }
}

async function initialize_Utility(e) {
      console.log(e.usersID)
      
      const oAuth2Client = new OAuth2Client(
        serverCredentials.client_id,
        serverCredentials.client_secret,
        serverCredentials.redirect_uris[0]
      );

      const userAuth = await userTokenInfo.findOne({usersID: e.usersID})

      const credentials = {
        access_token: userAuth.access_token,
        refresh_token: userAuth.refresh_token,
        scope: userAuth.scope,
        token_type: userAuth.token_type,
        expiry_date: userAuth.expiry_date}
      
      oAuth2Client.setCredentials(credentials)
      

      // Grab newest email from both catagories
      const eversource = await onStartEversource(oAuth2Client)
      const nationalgrid = await onStartnationalGrid(oAuth2Client)

      await userInfo.findOneAndUpdate({usersID: e.usersID}, {$set: {electric: eversource, gas: nationalgrid}}, {new: true})
      await User.findOneAndUpdate({usersID: e.usersID}, {$set: {initialized: true}}, {new: true})

      e.OAuth2Client = oAuth2Client
      e.electric = eversource
      e.gas = nationalgrid
      e.initialized = true

      USERSET.set(e.usersID, e)   
}



async function check_All_Utilities() {
  for(const [key, e] of  USERSET.entries()) {
    if(e.initialized) {
      // console.log(e.OAuth2Client)
      const usersID = e.usersID

      let x = Date.now()
      if(currentInfo == null ) return
      const ESpayment = await checknewEmailEversource(e.OAuth2Client, e.electric)
      const NGpayment = await checknewEmailnationalGrid(e.OAuth2Client, e.gas)
      

      console.log(Date.now()-x)
      console.log("we have info?" + JSON.stringify(NGpayment) + " " + JSON.stringify(ESpayment) + " ")
      if(NGpayment !== undefined && ESpayment !== undefined) {
        await userInfo.findOneAndUpdate({usersID: e.usersID}, {$set: {electric: ESpayment.id, gas: NGpayment.id}}, {new: true})
        requestMoney(e.phoneNumber, NGpayment.balance + ESpayment.balance, e.roommatesNumbs)
      }
      else if (NGpayment !== undefined && ESpayment === undefined) {
        await userInfo.findOneAndUpdate({usersID: e.usersID}, {$set: {gas: NGpayment.id}}, {new: true})
        requestMoney(e.phoneNumber, NGpayment.balance, e.roommatesNumbs)
      }
      else if (NGpayment === undefined && ESpayment !== undefined) {        
        await userInfo.findOneAndUpdate({usersID: e.usersID}, {$set: {electric: ESpayment.id}}, {new: true})
        requestMoney(e.phoneNumber, ESpayment.balance, e.roommatesNumbs)
      }
    }
  }
}

function requestMoney(usersPhoneNumber, total, roommates){
  console.log("sending text for:" , user)
  const perPerson = Math.ceil(total / roommates.length)

  client.message.create({body:`Total Utiltiies is ${total} with a amount of ${perPerson} per person`, from: '+18339653250',
  to: usersPhoneNumber}).then(message => console.log(message.sid));

  roommates.forEach(e => {
      client.messages
        .create({
          body: `Total Utiltiies is ${total} with a amount of ${perPerson} per person`,
          from: '+18339653250',
          to: e
        })
        .then(message => console.log(message.sid));
  })
}

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,            //access-control-allow-credentials:true
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

//mongoose.connect('mongodb://localhost:27017/UtilitiesAutoPaymentuse', { useNewUrlParser: true })
mongoose.connect(process.env.MONGO_CONNECT, { useNewUrlParser: true })
.then(() => {
  const app = express();
  app.use(bodyParser.json()); // <--- Here
  app.use(cors(corsOptions))
  app.use('', router)

  app.listen(8002, async () => {
      console.log('listening on 8002')

      serverCredentials = JSON.parse(process.env.KEY)

      USERINFO = await User.find()
      USERSET = new Map(USERINFO.map(info => [info.usersID, info]))
      

      START_All_Utilities()
      .then(() => {
        setInterval(() => {
            check_All_Utilities()
            checkforNewUsers()
            checkforDeletions()
            checkforUpdates()
          }
        , 3001)
      })
    
    })
})



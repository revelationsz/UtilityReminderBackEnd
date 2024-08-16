
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


const corsOptions = {
  origin: ['https://www.utilityreminders.com','https://www.utilityreminders.com/createAccount', 'https://utilityreminders.com', 'http://localhost:3000/'],
  credentials: true,            //access-control-allow-credentials:true
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// mongoose.connect('mongodb://localhost:27017/UtilitiesAutoPaymentuse', { useNewUrlParser: true })
mongoose.connect(process.env.MONGO_CONNECT, { useNewUrlParser: true })
.then(() => {
  const app = express();

  app.use(bodyParser.json()); // <--- Here
  app.use(cors(corsOptions))
  app.use('/api', router)


  const PORT = process.env.PORT || 8080;

  app.listen(PORT, async () => {
      console.log('listening on ' + PORT)
      console.log("test")

    
    })
})
import express from 'express';
import {test as User} from './userSchema.js'
import { currInfo } from './userIDSchema.js';
import { userTokenInfo } from './userTokenSchema.js'
import {OAuth2Client} from 'google-auth-library';
import { google } from 'googleapis';
import dotenv from 'dotenv/config';


const key = JSON.parse(process.env.KEY);

const oAuth2Client = new OAuth2Client(
    key.client_id,
    key.client_secret,
    key.redirect_uris[0]
  );

  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.profile',  'https://www.googleapis.com/auth/userinfo.email'],
    include_granted_scopes: true
  });

const router = express.Router()

router.get('/allUserInfo', async (req, res) => {
    try{
        const users = await User.find()
        res.send(users)
        console.log("users")
    } catch {
        res.status(404)
        res.send("No users found")
    }
})

router.get('/userInfo/:userId', async (req, res) => {
    try {
        const user = await User.find({userId: req.params.userId})
        res.send(user)
    } catch {
        res.status(404)
        res.send("User no found")
    }
})

router.get('/getGoogleAuthLink', function (req, res) {
      console.log("check1")
      // Generate the url that will be used for the consent dialog.

      console.log(authorizeUrl);
      res.send(authorizeUrl);

})

router.post('/getGAuthToken', async function(req, res) {
     const code = req.body.code;
     console.log(req.body)
     oAuth2Client.getToken(code, async function(err, tokens) {
        if(err) {
            console.log("Error getting tokens: ", err);
            res.status(400)
            res.redirect('/');
        } else {
            console.log("Saving tokens: ", JSON.stringify(tokens));
            // Save tokens
            oAuth2Client.setCredentials(tokens);

            const people = google.people({version: 'v1', auth: oAuth2Client});
            const {data} = await people.people.get({
                resourceName: 'people/me',
                personFields: 'emailAddresses,names',
            });

            console.log(data)
            const email = data.emailAddresses[0].value;
            const name = data.names[0].displayName;
            const userID = data.resourceName.split('/')[1]

            console.log(email, name, tokens)
            const newUserToken = new userTokenInfo({
                usersID: userID,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date
            })

            const newUser = new User({
                usersID: userID,
                email: email,
                name: name,
                phoneNumber: req.body.userNumber,
                roommateInfo: req.body.roommateInfo,
                initialized: false,
                toDelete: false,
                toUpdate: false,
                electricProvider: req.body.electricProvider,
                gasProvider: req.body.gasProvider,
                expoPushToken: req.body.expoPushToken
            })
        
            const newUserUtilityID = new currInfo({
                usersID: userID,
                electric: '',
                gas: '',
                currentGasPayment: '',
                curentElectricPayment: '',
                gasDate: '',
                electricDate: '',
                gasBillPaymentStatus: "",
                electricBillPaymentStatus: "",
                gasBillRequestStatus: "",
                electricBillRequestStatus: ""  
            })
        
            await newUser.save();
            await newUserUtilityID.save(); 
            await newUserToken.save();
            res.status(200);
            res.send({data: data});
       }
      });
    
})


router.get('/userCurrentEmailID', async (req, res) => {
    try{
        const info = await currInfo.findOne({usersID: req.params.userId})
        res.send(info)
    } catch {
        res.status(404)
        res.send("User no found")
    }
})

router.get('/getUserInfo/:user', async (req, res) => {
    console.log("it work?")
    try{
        const info = await User.findOne({usersID: req.params.user})
        console.log(info)
        console.log(req.params.user)
        res.send(info)
    } catch (err){
        console.log("User no found")
        console.log(err)
        res.status(404)
        res.send("User no found")
    }
})

router.post('/roommateUpdate/:user', async (req, res) => {
    try{
        console.log(req.body.roommates)
        const info = await User.findOneAndUpdate({usersID: req.params.user}, {roommatesArray: req.params.roommatesArray, toUpdate: true})
        console.log(info)
        res.send(info)
    } catch {
        res.send(404)
    }
})

router.post('/updateGas/:user', async (req, res) => {
    try{
        console.log(req.body.roommates)
        const info = await currInfo.findOneAndUpdate({usersID: req.params.user}, {gas: req.params.gas, toUpdate: true})
        console.log(info)
        res.send(info)
    } catch {
        res.send(404)
    }
})

router.post('/updateElectric/:user', async (req, res) => {
    try{
        console.log(req.body.roommates)
        const info = await currInfo.findOneAndUpdate({usersID: req.params.user}, {electric: req.params.electric, toUpdate: true})
        console.log(info)
        res.send(info)
    } catch {
        res.send(404)
    }
})


/* Batch process endpoints */

router.post('/test/:user', async function(req, res) {
    console.log(req.params.user)
    const x = await currInfo.findOneAndDelete({usersID: req.params.user})
    const t = await User.findOneAndUpdate({usersID: req.params.user}, {toDelete: true})
    const y = await userTokenInfo.findOneAndDelete({usersID: req.params.user})
    console.log(x,t,y)

})

router.get('/users', async (req, res) => {
    
    console.log(req.headers)
    if(req.headers.authorization.split(' ')[1] != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }

    try{
        const users = await User.find()
        res.send(users)
    } catch(err){
        res.send(err)
    }
})


router.get('/tokenInfo/:user', async (req, res) => {

    if(req.headers.authorization.split(' ')[1] != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }

    try{
        const userAuth = await userTokenInfo.findOne({usersID: req.params.user})
        res.send(userAuth)
    } catch(err){
        res.send(err)
    }
})

router.get('/emailIdInfo/:user', async (req, res) => {
    try{
        const emailIds = await currInfo.findOne({usersID: req.params.user})
        res.send(emailIds)
    } catch(err){
        res.send(err)
    }
})

router.post('/newEmails/:user', async (req, res) => {

    const key = req.headers.authorization.split(' ')[1]
    if(key != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }
    let resp 
    console.log(req.body.electric, req.body.gas)
    try{
        if(req.body.electric != null && req.body.gas != null){
            console.log("both")
            resp = await currInfo.findOneAndUpdate({usersID: req.params.user}, {$set: {
                electric: req.body.electric, 
                gas: req.body.gas,
                currentGasPayment: req.body.currentGasPayment,
                curentElectricPayment: req.body.curentElectricPayment,
                gasDate: req.body.gasDate,
                electricDate: req.body.electricDate,
                gasBillPaymentStatus: req.body.gasBillPaymentStatus,
                electricBillPaymentStatus: req.body.electricBillPaymentStatus,
                gasBillRequestStatus: req.body.gasBillRequestStatus,
                electricBillRequestStatus: req.body.electricBillRequestStatus
            }}, {new: true})
        } else if (req.body.electric != null && req.body.gas == null){
            console.log("electric " + req.body.electric)
            resp =  await currInfo.findOneAndUpdate({usersID: req.params.user}, {$set: {
                electric: req.body.electric,
                curentElectricPayment: req.body.curentElectricPayment,
                electricDate: req.body.electricDate,
                electricBillPaymentStatus: req.body.electricBillPaymentStatus,
                electricBillRequestStatus: req.body.electricBillRequestStatus
            }}, {new: true})
        } else if (req.body.electric == null && req.body.gas != null){
            console.log("gas")
            resp =  await currInfo.findOneAndUpdate({usersID: req.params.user}, {$set: {
                gas: req.body.gas,
                currentGasPayment: req.body.currentGasPayment,
                gasDate: req.body.gasDate,
                gasBillPaymentStatus: req.body.gasBillPaymentStatus,
                gasBillRequestStatus: req.body.gasBillRequestStatus,
            }}, {new: true})
        }
        console.log(resp)
        res.send(resp)
    } catch(err){
        res.send(err)
    }
})

router.post('/userisInitalized/:user', async(req, res) => {

    if(req.headers.authorization.split(' ')[1] != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }

    try{
        await User.findOneAndUpdate({usersID: req.params.user}, {$set: {initialized: true}}, {new: true})
        res.sendStatus(200)
    } catch(err){
        res.send(err)
    }
})

router.get('/startALL/:user', async (req, res) => {

    if(req.headers.authorization.split(' ')[1] != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }

    try{
        const userAuth = await userTokenInfo.findOne({usersID: req.params.user})
        const emailIds = await currInfo.findOne({usersID: req.params.user})
        console.log(userAuth + emailIds)
        // res.send(emailIds)
        res.send({userAuth: userAuth, emailIds: emailIds})
    } catch(err){
        res.send(err)
    }
})

router.get('/usersToDelete', async (req, res) => {

    console.log("del"+ req.headers)
    if(req.headers.authorization.split(' ')[1] != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }

    try{
        const users = await User.find({toDelete: true});
        if(users.length > 0) {
            users.forEach(async user =>{
              await User.findOneAndDelete({usersID: user.usersID})
            })
            console.log(users)
            res.send(users)
        } else {
            res.send("no users to delete")
        }
    } catch(err){
        res.send(err)
    }
})

router.get('/findNewUsers', async (req, res) => {

    if(req.headers.authorization.split(' ')[1] != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }
    try{
        const users = await User.find({initialized: false});
        res.send(users)
    } catch(err){
        res.send(err)
    }
})

router.get('/usersToUpdate', async (req, res) => {
    console.log("up"+ req.headers)

    if(req.headers.authorization.split(' ')[1] != process.env.SERVICE_KEY) {
        res.sendStatus(404)
        return
    }
    
    try{
        const users = await User.find({toUpdate: true});
        if(users.length > 0) {
            users.forEach(async user =>{
                await User.findOneAndUpdate({usersID: user.usersID}, {$set:{toUpdate: false}}, {new: true})
            })
            console.log(users)
            res.send(users)
        } else {
            res.send("no new users")
        }
      
    } catch(err){
        res.send(err)
    }
})


export {router}
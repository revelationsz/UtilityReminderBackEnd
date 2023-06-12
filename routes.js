import express from 'express';
import {test as User} from './userSchema.js'
import { currInfo } from './userIDSchema.js';
import { userTokenInfo } from './userTokenSchema.js'
import {OAuth2Client} from 'google-auth-library';
import { google } from 'googleapis';
import dotenv from 'dotenv/config';
import { ContentAndApprovalsListInstance } from 'twilio/lib/rest/content/v1/contentAndApprovals.js';


const key = JSON.parse(process.env.KEY);

const oAuth2Client = new OAuth2Client(
    key.client_id,
    key.client_secret,
    key.redirect_uris[0]
  );

  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
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
     oAuth2Client.getToken(code, async function(err, tokens) {
        if(err) {
            console.log("Error getting tokens: ", err);
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

            const email = data.emailAddresses[0].value;
            const name = data.names[0].displayName;

            console.log(email, name, tokens)
            const newUserToken = new userTokenInfo({
                usersID: email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date
            })

            const newUser = new User({
                usersID: email,
                name: name,
                phoneNumber: req.body.userNumber,
                roommatesNumbs: req.body.numbers,
                roommatesNames: req.body.names,
                initialized: false,
                toDelete: false,
                toUpdate: false,
            })
        
            const newUserUtilityID = new currInfo({
                usersID: email,
                electric: '',
                gas: '',
            })
        
            await newUser.save()
            await newUserUtilityID.save()
            await newUserToken.save()
            res.send({data: data})
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
    try{
        console.log(req)
        const info = await User.findOne({usersID: req.params.user})
        console.log(info)
        res.send(info)
    } catch {
        res.status(404)
        res.send("User no found")
    }
})

router.post('/roommateUpdate/:user', async (req, res) => {
    try{
        console.log(req.body.roommates)
        const info = await User.findOneAndUpdate({usersID: req.params.user}, {roommatesNumbs: req.body.roommatesNumbs, roommatesNames: req.body.roommatesNames, toUpdate: true})
        console.log(info)
        res.send(info)
    } catch {
        res.send(404)
    }
})

router.post('/test/:user', async function(req, res) {
    console.log(req.params.user)
    const x = await currInfo.findOneAndDelete({usersID: req.params.user})
    const t = await User.findOneAndUpdate({usersID: req.params.user}, {toDelete: true})
    const y = await userTokenInfo.findOneAndDelete({usersID: req.params.user})
    console.log(x,t,y)

})

router.post('/createAccount', async (req, res) => {
    console.log(req.body)
    const email = req.body.email
    const name = req.body.name

	const newUser = new User({
		usersID: email,
		name: name,
		roommates: ['+19413875069'],
        initialized: false
	})

    const newUserUtilityID = new currInfo({
        usersID: email,
        electric: '',
        gas: '',
    })

	await newUser.save()
    await newUserUtilityID.save()
	res.send(newUser)
})

export {router}
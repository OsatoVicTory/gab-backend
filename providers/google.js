const googleStrategy = require("passport-google-oauth2").Strategy;
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const router = express.Router();
const Users = require("../models/users");
const { sendCookie } = require("../controllers/sendCookie");
const jwt = require("jsonwebtoken");
// const { sendMailEngine } = require("../../controller/mailsController");
require('dotenv').config();

router.use(session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: {
        name: "GAB",
        httpOnly: true,
        maxAge: Date.now() + 86400000,
        sameSite: 'none',
        secure: false
    }
}));
router.use(passport.initialize());
router.use(passport.session());
router.use(express.json());


passport.use(new googleStrategy({
        clientID: process.env.GOOGLE_APP_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true
    },
    async (request, accessToken, refreshToken, profile, cb) => {
        
        try {
            const { email, name, id } = profile;
            const users = await Users.find();
            const user = users.find(user => user.email == email);
            if(user) {
                return cb(null, user._doc);
            }
            const userAccount = new Users({
                email,
                password: id,
                firstName: name.givenName,
                lastName: name.familyName,
                createdWithProvider: "google",
                isVerified: true,
                refId: `#MY_CHAT_${users.length+1}`
            });
    
            await userAccount.save();

            return cb(null, userAccount);
        } catch (err) {
            return cb(err);
        }
    }
))

router.get("/",
    passport.authenticate("google", {
        scope: ['email', 'profile']
    }
));

passport.serializeUser(function (user, cb) {
    cb(null, user);
});
passport.deserializeUser(function (user, cb) {
    cb(null, user);
})

router.get("/success", async (req, res) => {
    const token = await jwt.sign({ id: req.user._id.toString(), refId: req.user.refId }, process.env.MYSECRET);
    sendCookie(res, token);
    res.clearCookie("connect.sid");
    res.redirect(`${process.env.FRONTEND_URL}`);
})

router.get("/fail", function(req, res) {
    res.redirect(`${process.env.FRONTEND_URL}/login`);
})

router.get("/callback", passport.authenticate("google", { 
    successRedirect: `${process.env.SERVER}/auth/google/success`,
    failureRedirect: `${process.env.SERVER}/auth/google/fail`
}));

module.exports = router;
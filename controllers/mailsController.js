const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const catchAsync = require("../utils/catchAsync");
require("dotenv").config();
const Handlebars = require("handlebars");


const { OAUTH_CLIENTID, OAUTH_CLIENT_SECRET, OAUTH_REFRESH_TOKEN, OAUTH_ACCESS_TOKEN } = process.env;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
      clientId: OAUTH_CLIENTID,
      clientSecret: OAUTH_CLIENT_SECRET,
      accessToken: OAUTH_ACCESS_TOKEN,
      refreshToken: OAUTH_REFRESH_TOKEN
    }
});


// const sent = await sendMailEngine('Password Reset', newUserData.email, 'change-password-reset.hbs', {
//     userName: newUserData.firstName +" "+ newUserData.lastName,
//     time: String(new Date()),
//     year: new Date().getFullYear()
// });

// if(sent === "Error") return appError(res, 500, "Sorry. Something Went Wrong. Try Again");

exports.sendMailEngine = async (subject, email, pathname, messageOptions) => {
    
    try {
        const source = fs.readFileSync(path.join(__dirname, "../mailViews/"+pathname), 'utf8');
        const template = Handlebars.compile(source);

        const mailOptions = {
            from: `PRIDE <${process.env.MAIL_USERNAME}>`,
            to: email,
            subject: subject,
            html: template({...messageOptions}),
        };

        await transporter.sendMail(mailOptions);
        return "OK";

    } catch (err) {
        return "Error";
    }
};


// const messageOptions = {
//     userName: req.body.firstName +" "+ req.body.lastName,
//     year: new Date().getFullYear(),
//     link: `${process.env.FRONTEND_BASE_URL}/verify-account/${token}`
// }
// const sent = await sendAccountVerificationMail(email, messageOptions);

// if(sent === "Error") return appError(res, 500, "Sorry Something Went Wrong. Check Internet And Try Again");

exports.sendAccountVerificationMail = async (email, messageOptions) => {
    try {
        const source = fs.readFileSync(path.join(__dirname, '../mailViews/verify-account.hbs'), 'utf8');
        const template = Handlebars.compile(source);

        const mailOptions = {
            from: `PRIDE <${process.env.EMAIL}>`,
            to: email,
            subject: 'Account Verification',
            html: template(messageOptions),
        };

        await transporter.sendMail(mailOptions);
        return "OK";
    } catch (err) {
        console.log(err);
        return "Error";
    }

};

const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MYSECRET } = process.env;

exports.authUser = catchAsync(async (req, res, next) => {
    
    let token;

    console.log('headers=>', req.headers.authorization);
    if(req.headers.authorization) {
        let splittedHeader = req.headers.authorization.split(" ");
        if(splittedHeader[0] !== "Bearer") return appError(res, 401, "No Authorization Tokens");
        token = splittedHeader[1];
    } else if(req.cookies.GAB) {
        token = req.cookies.GAB;
    }
    const message = "Not Logged In. Redirecting to Log In Page";
    if(!token) return appError(res, 400, message);

    const decodedToken = await jwt.verify(token, MYSECRET);

    // console.log("tokendecoded=>", decodedToken);
    if(!decodedToken) return appError(res, 400, "Not Logged In. Redirecting to Log In Page");

    req.user = decodedToken;
    
    next();
});
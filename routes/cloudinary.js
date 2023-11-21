const express = require("express");
const { appError } = require("../utils/errorsHandler");
require('dotenv').config();
const cloudinary = require("cloudinary").v2;

const { CLOUDINARY_CLOUDNAME, CLOUDINARY_API_KEY, CLOUDINARY_SECRET } = process.env;
cloudinary.config({
    cloud_name: CLOUDINARY_CLOUDNAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_SECRET,
})
module.exports = cloudinary;
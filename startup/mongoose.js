const mongoose = require('mongoose');

require("dotenv").config();
const { MONGODB_ATLAS_URI } = process.env;

const connectMongo = async () => {
    try {
        mongoose.set('strictQuery', false);
        mongoose.connect(MONGODB_ATLAS_URI);
        console.log('mongodb connected successfully')
    } catch (err) {
        console.log('error', err);
    }
}

module.exports = connectMongo;
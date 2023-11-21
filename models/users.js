const mongoose = require('mongoose');

const Users = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    userName: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        required: true,
        immutable: true,
        unique: true
    },
    phoneNumber: {
        type: String,
    },
    createdWithProvider: {
        type: String,
        default: "",
    },
    userColor: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    img: {
        type: String,
        default: "",
    },
    cloudinary_id: {
        type: String,
        default: "",
    },
    about: {
        type: String,
        default: 'Hey there I am using Gab',
    },
    admin: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: String,
    },
    aboutUpdate: {
        type: String,
        default: ''
    },
    contacts: {
        type: Array,
        default: [],
    },
    pinned: {
        type: Array,
        default: [],
    },
    blocked_users: {
        type: Array,
        default: [],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Users', Users);
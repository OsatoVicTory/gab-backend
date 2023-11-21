const mongoose = require('mongoose');

const Messages = new mongoose.Schema({
    senderId: {
        type: String,
    },
    receiverId: {
        type: String,
    },
    deletedBy: {
        type: String,
        default: null
    },
    senderPhoneNumber: {
        type: String,
        default: ''
    },
    senderColor: {
        type: String,
    },
    scrappedData: {
        type: Object,
    },
    tagged: {
        type: Object,
    },
    status_tagged: {
        type: Object,
    },
    images: {
        type: Array,
    },
    centerMessage: {
        type: String,
    },
    // no contentId since only missed calls would be centerMessage as per only dm no gc
    // remove aux
    edited: {
        type: String,
    },
    message: {
        type: String,
    },
    link: {
        type: String,
    },
    link_text: {
        type: String,
    },
    isDelivered: {
        type: String,
        default: null,
    },
    isRead: {
        type: String,
        default: null,
    },
    reactions: {
        type: Array,
        default: []
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Messages', Messages);
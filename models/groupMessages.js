const mongoose = require('mongoose');

const GroupMessages = new mongoose.Schema({
    senderId: {
        type: String,
    },
    groupId: {
        type: String,
    },
    images: {
        type: Array,
        default: [],
    },
    tagged: {
        type: Object,
    },
    link: {
        type: String,
    },
    link_text: {
        type: String,
    },
    message: {
        type: String,
    },
    centerMessage: {
        type: String,
    },
    contentId: {
        type: String,
    },
    edited: {
        type: String,
    },
    auxMessageId: {
        type: String,
    },
    messageId: {
        type: String,
    },
    receivers: {
        type: Array,
        default: []
    },
    reactions: {
        type: Array,
        default: []
    },
    deletedBy: {
        type: Array,
        default: []
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('GroupMessages', GroupMessages);
const mongoose = require('mongoose');

const Status = new mongoose.Schema({
    posterId: {
        type: String,
    },
    caption: {
        type: String,
        default: null,
    },
    text: {
        type: String,
    },
    img: {
        type: String,
    },
    public_id: {
        type: String,
    },
    hash: {
        type: String,
    },
    font: {
        type: String,
    },
    viewers: {
        type: Array,
        default: []
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Status', Status);
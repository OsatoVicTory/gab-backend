const mongoose = require('mongoose');

const Groupchats = new mongoose.Schema({
    groupName: {
        type: String,
    },
    description: {
        type: String,
        default: '',
    },
    img: {
        type: String,
        default: '',
    },
    cloudinary_id: {
        type: String,
        default: '',
    },
    participants: {
        type: Array,
        default: [],
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Groupchats', Groupchats);
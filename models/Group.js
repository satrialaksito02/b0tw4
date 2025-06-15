// models/Group.js
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    groupId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: { // <<< TAMBAHKAN FIELD INI
        type: String,
        required: false, // Bisa jadi false jika ada data lama, namun sebaiknya diisi
    },
    expiration: {
        type: Date,
        required: true,
    },
    antilinkEnabled: {
        type: Boolean,
        default: false,
    },
    welcomeMessage: {
        enabled: {
            type: Boolean,
            default: false,
        },
        message: {
            type: String,
            default: null,
        },
    },
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);
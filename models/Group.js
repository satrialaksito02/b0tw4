// models/Group.js
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    groupId: {
        type: String,
        required: true,
        unique: true, // Pastikan setiap groupId unik
        index: true,    // Tambahkan index untuk pencarian cepat
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
}, { timestamps: true }); // Tambahkan timestamps jika perlu (createdAt, updatedAt)

module.exports = mongoose.model('Group', GroupSchema);
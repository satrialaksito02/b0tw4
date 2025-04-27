// models/AntilinkViolation.js
const mongoose = require('mongoose');

const AntilinkViolationSchema = new mongoose.Schema({
    groupId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    violationCount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// Index komposit untuk pencarian cepat berdasarkan groupId dan userId
AntilinkViolationSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AntilinkViolation', AntilinkViolationSchema);
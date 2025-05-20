// models/AutomatedMessage.js
const mongoose = require('mongoose');

const messageDetailSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
    intervalMinutes: { // Interval dalam menit
        type: Number,
        required: true,
        min: 1, // Minimal 1 menit
    },
    // Tidak perlu lastSent dan nextSend per pesan jika kita akan mengirim berurutan
    // nextSend untuk keseluruhan jadwal saja
});

const AutomatedMessageSchema = new mongoose.Schema({
    scheduleName: {
        type: String,
        required: true,
        unique: true, // Pastikan nama jadwal unik
        index: true,
    },
    targetGroupId: {
        type: String,
        required: true,
        index: true,
    },
    targetGroupName: { // Untuk kemudahan identifikasi
        type: String,
        required: true,
    },
    creatorId: { // ID pengguna yang membuat jadwal
        type: String,
        required: true,
    },
    messages: [messageDetailSchema], // Array dari pesan dan intervalnya
    isEnabled: {
        type: Boolean,
        default: true, // Default aktif saat dibuat
    },
    currentMessageIndex: { // Indeks pesan berikutnya yang akan dikirim
        type: Number,
        default: 0,
    },
    lastSentGlobal: { // Timestamp kapan terakhir kali ada pesan dikirim dari jadwal ini
        type: Date,
        default: null,
    },
    // nextScheduledSend akan dihitung oleh scheduler berdasarkan interval pesan saat ini
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true }); // Menggunakan timestamps dari Mongoose

// Middleware untuk update 'updatedAt'
AutomatedMessageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

AutomatedMessageSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
});


module.exports = mongoose.model('AutomatedMessage', AutomatedMessageSchema);
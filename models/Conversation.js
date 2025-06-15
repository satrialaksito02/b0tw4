// wa/models/Conversation.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'tool'], // Menambahkan role 'tool'
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // Bisa ditambahkan detail lain jika perlu, misal tool_calls
}, { _id: false }); // _id tidak perlu untuk sub-dokumen ini

const ConversationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true, // Setiap pengguna hanya punya satu dokumen percakapan
        index: true,
    },
    messages: [messageSchema], // Array dari pesan-pesan
}, { timestamps: true }); // Otomatis menambahkan createdAt dan updatedAt

module.exports = mongoose.model('Conversation', ConversationSchema);
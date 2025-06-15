// wa/models/Pricelist.js
const mongoose = require('mongoose');

const PricelistSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true, // ID produk dari sumber (developer)
        index: true,
    },
    category: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    basePrice: { // Harga asli dari developer
        type: Number,
        required: true,
    },
    finalPrice: { // Harga jual (basePrice + markup)
        type: Number,
        required: true,
    },
    validUntil: { // Kapan harga ini perlu dievaluasi ulang
        type: Date,
        required: true,
    },
}, { timestamps: true }); // timestamps akan memberi kita createdAt dan updatedAt

module.exports = mongoose.model('Pricelist', PricelistSchema);
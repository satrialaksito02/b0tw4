// utils/db.js
const mongoose = require('mongoose');
const config = require('../config'); // Anda mungkin ingin menyimpan string koneksi di config

// Ganti dengan Connection String MongoDB Atlas Anda
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://adilaksito:i2sQLt877qd56Hip@b0tw4.s7vlwih.mongodb.net/?retryWrites=true&w=majority&appName=b0tw4';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            // Opsi useNewUrlParser dan useUnifiedTopology sudah default true di Mongoose 6+
            // useCreateIndex dan useFindAndModify sudah tidak didukung
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;
// models/AdminConfig.js
const mongoose = require('mongoose');

const AdminConfigSchema = new mongoose.Schema({
    // Menggunakan ID statis agar hanya ada satu dokumen konfigurasi
    configId: {
        type: String,
        default: 'main_config',
        unique: true,
    },
    superAdminIds: [{
        type: String,
    }],
}, { timestamps: true });

// Fungsi untuk memastikan dokumen config selalu ada
AdminConfigSchema.statics.getConfig = async function() {
    let config = await this.findOne({ configId: 'main_config' });
    if (!config) {
        console.log('Admin config not found, creating one with defaults...');
        // Ambil default dari file config jika perlu
        const initialAdmins = require('../config').defaultSuperAdmins || [];
        config = await this.create({ superAdminIds: initialAdmins });
        console.log('Default admin config created.');
    }
    return config;
};


module.exports = mongoose.model('AdminConfig', AdminConfigSchema);
// utils/adminUtils.js
const AdminConfig = require('../models/AdminConfig'); // Impor model AdminConfig

async function isSuperAdmin(senderId) {
    if (!senderId) return false;
    try {
        const config = await AdminConfig.getConfig(); // Gunakan static method
        return config.superAdminIds.includes(senderId);
    } catch (error) {
        console.error("Error checking super admin status:", error);
        return false;
    }
}

// Fungsi isGroupAdmin tetap sama karena mengandalkan API WhatsApp
async function isGroupAdmin(chat, senderId) {
    try {
        // Cek apakah chat.participants adalah array atau promise
        const participants = Array.isArray(chat.participants) ? chat.participants : await chat.participants;
        if (!participants) {
            console.error("Participants data is not available for chat:", chat.id._serialized);
            return false;
        }
        const adminIds = participants
            .filter(participant => participant.isAdmin)
            .map(participant => participant.id._serialized);
        return adminIds.includes(senderId);
    } catch (error) {
        console.error("Error checking group admin:", error);
        return false;
    }
}


async function addSuperAdmin(userId) {
    if (!userId) return false;
    try {
        // $addToSet: Menambahkan elemen ke array hanya jika belum ada
        const result = await AdminConfig.updateOne(
            { configId: 'main_config' },
            { $addToSet: { superAdminIds: userId } },
            { upsert: true } // Buat dokumen jika belum ada
        );
        // result.modifiedCount > 0 jika user baru ditambahkan
        // result.matchedCount > 0 && result.modifiedCount === 0 jika user sudah ada
        // result.upsertedCount > 0 jika dokumen baru dibuat
        console.log(`Add super admin result for ${userId}:`, result);
        return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error) {
        console.error(`Error adding super admin ${userId}:`, error);
        return false;
    }
}


async function removeSuperAdmin(userId) {
    if (!userId) return false;
    try {
        // $pull: Menghapus elemen dari array
        const result = await AdminConfig.updateOne(
            { configId: 'main_config' },
            { $pull: { superAdminIds: userId } }
        );
        // result.modifiedCount > 0 jika user berhasil dihapus
        console.log(`Remove super admin result for ${userId}:`, result);
        return result.modifiedCount > 0;
    } catch (error) {
        console.error(`Error removing super admin ${userId}:`, error);
        return false;
    }
}

// Fungsi untuk mendapatkan semua super admin (jika diperlukan)
async function getSuperAdmins() {
    try {
        const config = await AdminConfig.getConfig();
        return config.superAdminIds;
    } catch (error) {
        console.error("Error getting super admins:", error);
        return [];
    }
}


module.exports = {
    isSuperAdmin,
    isGroupAdmin,
    addSuperAdmin,
    removeSuperAdmin,
    getSuperAdmins, // Ekspor fungsi baru jika perlu
};
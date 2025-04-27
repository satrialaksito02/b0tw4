const AntilinkViolation = require('../models/AntilinkViolation'); // Impor model

class AntispamService {
    constructor() {
        // Konstruktor tidak perlu lagi memuat dari file
        console.log("AntispamService initialized using MongoDB.");
    }

    // Hapus: loadViolations()
    // Hapus: saveViolations()

    async addViolation(groupId, senderId) {
        if (!groupId || !senderId) return 0;
        try {
            const result = await AntilinkViolation.findOneAndUpdate(
                { groupId, userId: senderId },
                { $inc: { violationCount: 1 } }, // Tingkatkan count sebesar 1
                { upsert: true, new: true, setDefaultsOnInsert: true } // Buat jika belum ada, kembalikan dokumen baru
            );
            console.log(`Violation added/updated for user ${senderId} in group ${groupId}. Count: ${result.violationCount}`);
            return result.violationCount;
        } catch (error) {
            console.error(`Error adding violation for user ${senderId} in group ${groupId}:`, error);
            return 0; // Kembalikan 0 jika error
        }
    }

    async resetViolation(groupId, senderId){
        if (!groupId || !senderId) return false;
        try {
            const result = await AntilinkViolation.deleteOne({ groupId, userId: senderId });
            console.log(`Violation reset result for user ${senderId} in group ${groupId}:`, result);
            return result.deletedCount > 0; // True jika ada yang dihapus
        } catch (error) {
            console.error(`Error resetting violation for user ${senderId} in group ${groupId}:`, error);
            return false;
        }
    }

    async getViolations(groupId, senderId) {
        if (!groupId || !senderId) return 0;
        try {
            const violation = await AntilinkViolation.findOne({ groupId, userId: senderId });
            return violation ? violation.violationCount : 0;
        } catch (error) {
            console.error(`Error getting violations for user ${senderId} in group ${groupId}:`, error);
            return 0;
        }
    }
}

// Buat instance tanpa path file
const antispamService = new AntispamService();
module.exports = antispamService;


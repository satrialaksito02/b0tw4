// utils/adminUtils.js
const dataService = require('./dataService');
const config = require('../config');

async function isSuperAdmin(senderId) {
    const data = dataService.getData();
    return data.SUPER_ADMIN_IDS.includes(senderId);
}

async function isGroupAdmin(chat, senderId) {
    try {
        const participants = await chat.participants;
        const adminIds = participants
            .filter(participant => participant.isAdmin)
            .map(participant => participant.id._serialized);
        return adminIds.includes(senderId);
    } catch (error) {
        console.error("Error checking group admin:", error);
        return false;
    }
}

function addSuperAdmin(userId) {
    const data = dataService.getData(); // Ambil data
    if (!data.SUPER_ADMIN_IDS.includes(userId)) {
        data.SUPER_ADMIN_IDS.push(userId);
        dataService.updateData({ SUPER_ADMIN_IDS: data.SUPER_ADMIN_IDS }); // Update hanya properti SUPER_ADMIN_IDS
        return true;
    }
    return false;
}


function removeSuperAdmin(userId) {
  const data = dataService.getData();
    const index = data.SUPER_ADMIN_IDS.indexOf(userId);
    if (index > -1) {
      data.SUPER_ADMIN_IDS.splice(index, 1);
      dataService.updateData({ SUPER_ADMIN_IDS: data.SUPER_ADMIN_IDS }); // Update hanya properti SUPER_ADMIN_IDS
      return true;
    }
    return false;
}


module.exports = {
    isSuperAdmin,
    isGroupAdmin,
    addSuperAdmin,
    removeSuperAdmin,
};

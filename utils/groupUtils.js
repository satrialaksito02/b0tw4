// utils/groupUtils.js
const dataService = require('./dataService');

function isGroupSubscribed(groupId) {
    const data = dataService.getData();
    const subscription = data.subscribedGroups[groupId];
    return subscription && new Date(subscription.expiration) > new Date();
}


function addSubscription(groupId, days, startDate = new Date()) {
    const data = dataService.getData();
    if (!groupId || !days || isNaN(days)) {
        console.error("Error: Invalid groupId or days parameter.");
        return false;
    }

    const expirationDate = new Date(startDate);
    expirationDate.setDate(expirationDate.getDate() + parseInt(days));

    // Perbaikan Utama: Pastikan objek subscribedGroups[groupId] ada, dan *jangan* menimpanya
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {
            welcomeMessage: {
                enabled: false,
                message: null
            },
            antilinkEnabled: false, // Inisialisasi antilink di sini.
            // Tambahkan properti lain jika diperlukan di masa mendatang, di sini.
        };
    }

    data.subscribedGroups[groupId].expiration = expirationDate.toISOString();
      // Jangan ubah properti lain yang mungkin sudah ada

    dataService.updateData({ subscribedGroups: data.subscribedGroups }); // Gunakan updateData!
    return true;
}


function isAntilinkEnabled(groupId) {
    const data = dataService.getData();
    const groupData = data.subscribedGroups[groupId];
    return groupData && groupData.antilinkEnabled === true;
}

function setAntilink(groupId, enabled) {
    const data = dataService.getData();
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {
        welcomeMessage: {  //Tambahkan welcomeMessage
            enabled: false,
            message: null
        },
          antilinkEnabled: false,
        }; // Inisialisasi jika grup belum ada
    }
    data.subscribedGroups[groupId].antilinkEnabled = enabled;
    dataService.updateData({ subscribedGroups: data.subscribedGroups }); // Update hanya properti subscribedGroups
}


function getWelcomeMessage(groupId) {
    const data = dataService.getData();
    const groupData = data.subscribedGroups[groupId];
    return groupData?.welcomeMessage?.message;

}

function setWelcomeMessage(groupId, message) {
     const data = dataService.getData();
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {  //Tambahkan welcomeMessage
           welcomeMessage: {
                enabled: false,
                message: null
            },
            antilinkEnabled: false,}; // Buat objek jika belum ada
    }
    // Selalu buat/update objek welcomeMessage
    data.subscribedGroups[groupId].welcomeMessage = {
        message: message,
        enabled: true  // Otomatis aktifkan saat pesan diatur
    };
      dataService.updateData({subscribedGroups: data.subscribedGroups});
}

function isWelcomeEnabled(groupId) {
    const data = dataService.getData();
    const groupData = data.subscribedGroups[groupId];
    return groupData?.welcomeMessage?.enabled === true;
}

function setWelcomeEnabled(groupId, enabled) {
     const data = dataService.getData();
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {  //Tambahkan welcomeMessage
            welcomeMessage: {
                enabled: false,
                message: null
            },
          antilinkEnabled: false,
        };
    }
    if (!data.subscribedGroups[groupId].welcomeMessage) {
        data.subscribedGroups[groupId].welcomeMessage = { message: null, enabled: enabled }; //Set message null
    } else {
        data.subscribedGroups[groupId].welcomeMessage.enabled = enabled;
    }
     dataService.updateData({subscribedGroups: data.subscribedGroups});
}

// --- (rest of cekdata.js remains the same) ---
function getGroupSubscriptionStatus(groupId) {
  const data = dataService.getData();
    const groupData = data.subscribedGroups[groupId];
    if (!groupData) {
        return { subscribed: false };
    }

    const isSubscribed = new Date(groupData.expiration) > new Date();
    return {
        subscribed: isSubscribed,
        expiryDate: groupData.expiration,
        antilinkEnabled: groupData.antilinkEnabled === true,
        welcomeEnabled: groupData.welcomeMessage ? groupData.welcomeMessage.enabled === true : false,
        welcomeMessage: groupData.welcomeMessage? groupData.welcomeMessage.message : null
    };
}

async function checkSubscriptionExpiry() { //Menjadi async
  const data = dataService.getData();
    const now = new Date();
    const oneDayAhead = new Date(now);
    oneDayAhead.setDate(now.getDate() + 1);

    const expiringGroups = [];

    for (const groupId in data.subscribedGroups) {
        const groupData = data.subscribedGroups[groupId];
        const expiryDate = new Date(groupData.expiration);

        // Cek jika expiryDate adalah 1 hari dari sekarang (kurang dari oneDayAhead, tapi lebih dari now)
        if (expiryDate <= oneDayAhead && expiryDate > now) {
            expiringGroups.push({groupId, expiryDate});
        }
    }
    return expiringGroups;
}

module.exports = {
    isGroupSubscribed,
    addSubscription,
    isAntilinkEnabled,
    setAntilink,
    getWelcomeMessage,
    setWelcomeMessage,
    isWelcomeEnabled,
    setWelcomeEnabled,
    getGroupSubscriptionStatus,
    checkSubscriptionExpiry,
};

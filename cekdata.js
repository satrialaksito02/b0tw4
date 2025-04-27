//cekdata.js
const fs = require('fs');
const EventEmitter = require('events');
const DATA_FILE = 'data.json';

const emitter = new EventEmitter();
let data;

function loadDataFromFile() {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        if (!fileData.trim()) { // Handle empty file
           data = {
                subscribedGroups: {},
                SUPER_ADMIN_IDS: ["xxxxxxxx-xxxxxxxx@c.us", "yyyyyyyy-yyyyyyyy@c.us"]
            };
            return data;
        }
        data = JSON.parse(fileData);
        return data;
    } catch (err) {
        console.log("File data tidak ditemukan, menggunakan data default.");
        data = {
            subscribedGroups: {},
            SUPER_ADMIN_IDS: ["xxxxxxxx-xxxxxxxx@c.us", "yyyyyyyy-yyyyyyyy@c.us"]
        };
        return data;
    }
}

data = loadDataFromFile();

function saveData(dataToSave) {
    if (!dataToSave) {
        console.error("Error: Data yang akan disimpan tidak valid.");
        return;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
    // loadDataFromFile();  // Tidak perlu reload di sini
    emitter.emit('dataUpdated', dataToSave); // Emit event dengan data yang baru
}

function getData() {
    return data;
}

// --- Fungsi-fungsi baru ---

function isAntilinkEnabled(groupId) {
    const groupData = data.subscribedGroups[groupId];
    return groupData && groupData.antilinkEnabled === true;
}

function setAntilink(groupId, enabled) {
    // Pastikan objek subscribedGroups[groupId] ada SEBELUM mencoba mengubah propertinya.
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {}; // Buat objek kosong jika belum ada.
    }
    data.subscribedGroups[groupId].antilinkEnabled = enabled;
    saveData(data);
}

// --- Welcome Message Functions (Modified) ---

function getWelcomeMessage(groupId) {
    const groupData = data.subscribedGroups[groupId];
    return groupData?.welcomeMessage?.message; // Optional chaining
}

function setWelcomeMessage(groupId, message) {
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {}; // Buat objek jika belum ada
    }
    // Selalu buat/update objek welcomeMessage
    data.subscribedGroups[groupId].welcomeMessage = {
        message: message,
        enabled: true  // Otomatis aktifkan saat pesan diatur
    };
    saveData(data);
}


function isWelcomeEnabled(groupId) {
    const groupData = data.subscribedGroups[groupId];
    return groupData?.welcomeMessage?.enabled === true; // Optional chaining
}

function setWelcomeEnabled(groupId, enabled) {
    // Pastikan objek welcomeMessage ada sebelum mengubah 'enabled'
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {};
    }
    if (!data.subscribedGroups[groupId].welcomeMessage) {
        data.subscribedGroups[groupId].welcomeMessage = { message: null, enabled: enabled }; //Set message null
    } else {
        data.subscribedGroups[groupId].welcomeMessage.enabled = enabled;
    }
    saveData(data);
}

// --- (rest of cekdata.js remains the same) ---
function getGroupSubscriptionStatus(groupId) {
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

function checkSubscriptionExpiry() {
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


//Fungsi untuk add subscription (reused)
function isGroupSubscribed(groupId) {
    const subscription = data.subscribedGroups[groupId];
    return subscription && new Date(subscription.expiration) > new Date();
}

function addSubscription(groupId, days) {
     if (!groupId || !days || isNaN(days)) {
        console.error("Error: Parameter groupId atau days tidak valid.");
        return false;
    }

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(days));

    // Pastikan struktur data sudah benar
    if (!data.subscribedGroups[groupId]) {
        data.subscribedGroups[groupId] = {
             welcomeMessage: {
                enabled: false,
                message: null
            }
        };
    }
    data.subscribedGroups[groupId].expiration = expirationDate.toISOString();
    data.subscribedGroups[groupId].antilinkEnabled = false; // Default antilink is off


    saveData(data); // Simpan perubahan
    return true;
}

module.exports = {
    loadData: loadDataFromFile,
    saveData,
    getData,
    emitter,
    isAntilinkEnabled,
    setAntilink,
    getWelcomeMessage,
    setWelcomeMessage,
    isWelcomeEnabled,
    setWelcomeEnabled,
    getGroupSubscriptionStatus,
    checkSubscriptionExpiry,
    addSubscription,
    isGroupSubscribed
};
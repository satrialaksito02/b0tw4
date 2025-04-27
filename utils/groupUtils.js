// utils/groupUtils.js
const Group = require('../models/Group'); // Impor model Group
const config = require('../config'); // Impor config jika perlu (misal untuk pesan)

async function getGroupData(groupId) { // <- Fungsi async
    if (!groupId) return null;
    try {
        return await Group.findOne({ groupId }); // <- Query ke MongoDB
    } catch (error) {
        console.error(`Error getting group data for ${groupId}:`, error);
        return null;
    }
}

async function isGroupSubscribed(groupId) {
    const group = await getGroupData(groupId);
    return group && group.expiration && new Date(group.expiration) > new Date();
}

async function addSubscription(groupId, days, startDate = new Date()) {
    if (!groupId || !days || isNaN(days)) {
        console.error("Error: Invalid groupId or days parameter.");
        return false;
    }

    const expirationDate = new Date(startDate);
    expirationDate.setDate(expirationDate.getDate() + parseInt(days));

    try {
        const update = {
            expiration: expirationDate,
            // Set default jika grup baru ditambahkan atau perbarui expiration jika sudah ada
            $setOnInsert: {
                groupId: groupId,
                antilinkEnabled: false,
                'welcomeMessage.enabled': false,
                'welcomeMessage.message': null,
            }
        };
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };
        const updatedGroup = await Group.findOneAndUpdate({ groupId }, update, options);
        console.log(`Subscription added/updated for group ${groupId}. Expires: ${updatedGroup.expiration}`);
        return true;
    } catch (error) {
        console.error(`Error adding/updating subscription for ${groupId}:`, error);
        return false;
    }
}

async function isAntilinkEnabled(groupId) {
    const group = await getGroupData(groupId);
    return group?.antilinkEnabled === true;
}

async function setAntilink(groupId, enabled) {
    try {
        const updatedGroup = await Group.findOneAndUpdate(
            { groupId },
            { antilinkEnabled: enabled },
            { upsert: true, new: true, setDefaultsOnInsert: true } // upsert jika grup belum ada di DB
        );
        console.log(`Antilink for group ${groupId} set to ${enabled}.`);
        return updatedGroup;
    } catch (error) {
        console.error(`Error setting antilink for ${groupId}:`, error);
        return null;
    }
}


async function getWelcomeMessage(groupId) {
    const group = await getGroupData(groupId);
    return group?.welcomeMessage?.message;
}

async function setWelcomeMessage(groupId, message) {
     try {
        const updatedGroup = await Group.findOneAndUpdate(
            { groupId },
            {
                'welcomeMessage.message': message,
                'welcomeMessage.enabled': true // Otomatis aktifkan
            },
            { upsert: true, new: true, setDefaultsOnInsert: true } // upsert jika grup belum ada
        );
         console.log(`Welcome message for group ${groupId} set.`);
        return updatedGroup;
    } catch (error) {
        console.error(`Error setting welcome message for ${groupId}:`, error);
        return null;
    }
}

async function isWelcomeEnabled(groupId) {
    const group = await getGroupData(groupId);
    return group?.welcomeMessage?.enabled === true;
}

async function setWelcomeEnabled(groupId, enabled) {
    try {
        const updatedGroup = await Group.findOneAndUpdate(
            { groupId },
            { 'welcomeMessage.enabled': enabled },
            { upsert: true, new: true, setDefaultsOnInsert: true } // upsert jika grup belum ada
        );
         console.log(`Welcome for group ${groupId} set to ${enabled}.`);
        return updatedGroup;
    } catch (error) {
        console.error(`Error setting welcome enabled for ${groupId}:`, error);
        return null;
    }
}

async function getGroupSubscriptionStatus(groupId) {
    const group = await getGroupData(groupId);
    if (!group) {
        return { subscribed: false };
    }

    const isSubscribed = new Date(group.expiration) > new Date();
    return {
        subscribed: isSubscribed,
        expiryDate: group.expiration,
        antilinkEnabled: group.antilinkEnabled === true,
        welcomeEnabled: group.welcomeMessage?.enabled === true,
        welcomeMessage: group.welcomeMessage?.message
    };
}

async function checkSubscriptionExpiry() {
    const now = new Date();
    const oneDayAhead = new Date(now);
    oneDayAhead.setDate(now.getDate() + 1);

    try {
        // Cari grup yang akan expire dalam 24 jam ke depan tapi belum expire
        const expiringGroups = await Group.find({
            expiration: {
                $lte: oneDayAhead,
                $gt: now
            }
        });
        return expiringGroups.map(group => ({ groupId: group.groupId, expiryDate: group.expiration }));
    } catch (error) {
        console.error("Error checking subscription expiry from DB:", error);
        return [];
    }
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
    getGroupData // Ekspor fungsi ini jika diperlukan di tempat lain
};
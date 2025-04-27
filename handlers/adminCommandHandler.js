// handlers/adminCommandHandler.js
const { isSuperAdmin, addSuperAdmin, removeSuperAdmin } = require('../utils/adminUtils');
const { addSubscription, getGroupSubscriptionStatus } = require('../utils/groupUtils');
const config = require('../config');

async function handleAdminCommand(client, message) {
    const contact = await message.getContact(); // Ambil contact
    const senderId = contact.id._serialized;   // Gunakan ini
    const chat = await message.getChat(); // Get chat object


    if (await isSuperAdmin(senderId)) {
        const messageParts = message.body.split(" ");
        const command = messageParts[0];
        const arg1 = messageParts[1]; // Durasi (untuk 'sewa')


        switch (command) {
            case config.commands.ADD_SUPERADMIN:
                const newAdminId = arg1;
                addSuperAdmin(newAdminId) ?
                    message.reply(config.messages.addSuperAdminSuccess) :
                    message.reply(config.messages.addSuperAdminAlreadyExists);
                break;

            case config.commands.REMOVE_SUPERADMIN:
                const adminIdToRemove = arg1;
                removeSuperAdmin(adminIdToRemove) ?
                    message.reply(config.messages.removeSuperAdminSuccess) :
                    message.reply(config.messages.removeSuperAdminNotFound);
                break;

            case config.commands.SUBSCRIBE:
               if (!chat.isGroup) {
                    message.reply(config.messages.subscribeNotInGroup); // Pesan jika di luar grup
                  return;
                }

                if (!arg1) {

                    message.reply(config.messages.subscribeFormatError);
                    return;
                }
                const groupId = chat.id._serialized; // Ambil Group ID dari chat
                const duration = parseInt(arg1);


                if (isNaN(duration) || duration <= 0) {
                    message.reply(config.messages.subscribeDurationError);
                    return;
                }

                try {
                    // Dapatkan status langganan saat ini
                    const currentStatus = getGroupSubscriptionStatus(groupId);
                    let startDate;

                    if (currentStatus.subscribed) {
                        startDate = new Date(currentStatus.expiryDate);
                    } else {
                        startDate = new Date();
                    }


                    const success = addSubscription(groupId, duration, startDate);

                    if (success) {
                        const newStatus = getGroupSubscriptionStatus(groupId);
                        message.reply(config.messages.subscribeSuccess(groupId, newStatus.expiryDate));

                    } else {
                         message.reply(config.messages.subscribeError);

                    }
                } catch (error) {
                    console.error("Error processing subscription:", error);
                    message.reply(config.messages.subscribeError);
                }

                break;

            default:
            // Tidak melakukan apa-apa
        }
    } else {
       const superAdminOnlyCommands = [config.commands.ADD_SUPERADMIN, config.commands.REMOVE_SUPERADMIN, config.commands.SUBSCRIBE];
        if (superAdminOnlyCommands.some(command => message.body.startsWith(command))) {
            message.reply(config.messages.superAdminOnly);
        }
    }
}

module.exports = { handleAdminCommand };

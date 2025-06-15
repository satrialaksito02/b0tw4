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
                if (await addSuperAdmin(newAdminId)) { // Tambahkan await jika addSuperAdmin async
                    message.reply(config.messages.addSuperAdminSuccess);
                } else {
                    message.reply(config.messages.addSuperAdminAlreadyExists);
                }
                break;

            case config.commands.REMOVE_SUPERADMIN:
                const adminIdToRemove = arg1;
                if (await removeSuperAdmin(adminIdToRemove)) { // Tambahkan await jika removeSuperAdmin async
                    message.reply(config.messages.removeSuperAdminSuccess);
                } else {
                    message.reply(config.messages.removeSuperAdminNotFound);
                }
                break;


                case config.commands.SUBSCRIBE:
                    if (!chat.isGroup) {
                         message.reply(config.messages.subscribeNotInGroup);
                       return;
                     }
     
                     if (!arg1) {
                         message.reply(config.messages.subscribeFormatError);
                         return;
                     }
                     const groupId = chat.id._serialized;
                     const groupName = chat.name; // <<< Ambil nama grup dari objek chat
                     const duration = parseInt(arg1);
     
     
                     if (isNaN(duration) || duration <= 0) {
                         message.reply(config.messages.subscribeDurationError);
                         return;
                     }
     
                     try {
                         const currentStatus = await getGroupSubscriptionStatus(groupId);
                         let startDate;
     
                         if (currentStatus.subscribed && currentStatus.expiryDate && !isNaN(new Date(currentStatus.expiryDate).getTime())) {
                             startDate = new Date(currentStatus.expiryDate);
                         } else {
                             startDate = new Date();
                         }
     
                         if (isNaN(startDate.getTime())) {
                             console.error("Invalid startDate calculated:", currentStatus);
                             message.reply(config.messages.subscribeError);
                             return;
                         }
     
                         // Sertakan groupName saat memanggil addSubscription
                         const success = await addSubscription(groupId, groupName, duration, startDate); // <<< MODIFIKASI DI SINI
     
                         if (success) {
                             const newStatus = await getGroupSubscriptionStatus(groupId);
                             if (newStatus && newStatus.expiryDate && !isNaN(new Date(newStatus.expiryDate).getTime())) {
                                 message.reply(config.messages.subscribeSuccess(groupId, newStatus.expiryDate));
                             } else {
                                  console.error("Failed to get valid new status after subscription for:", groupId);
                                  message.reply("✅ Langganan berhasil diperbarui, tetapi gagal menampilkan tanggal kedaluwarsa baru.");
                             }
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

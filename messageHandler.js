// messageHandler.js
const { handleAdminCommand } = require('./handlers/adminCommandHandler');
const { handleGroupCommand } = require('./handlers/groupCommandHandler');
const { handleYouTubeSubscription } = require('./utils/messageUtils');
const config = require('./config');
const { isSuperAdmin } = require('./utils/adminUtils');

async function onMessage(client, message) {
    try {
        const [chat, contact] = await Promise.all([message.getChat(), message.getContact()]);
        const senderId = contact.id._serialized;

        // --- Handler Perintah Super Admin ---
        await handleAdminCommand(client, message);

        // --- Handler Pesan Non-Grup (Auto-reply) ---
        if (!chat.isGroup && !message.body.toLowerCase().startsWith(config.commands.YOUTUBE)) {

            await message.reply(config.messages.privateAutoReply());
            return;
        }

        // --- Perintah-Perintah Umum (di luar grup)---
        if (message.body === config.commands.GET_MY_ID) {
            message.reply(config.messages.getUserId(senderId));
            return;
        }



        // --- Perintah Grup ---
        if (chat.isGroup) {
            await handleGroupCommand(client, message, chat); // Menangani perintah grup
            return; // Penting agar kode di bawah (YouTube) tidak tereksekusi jika ini dalam grup
        }


        // --- Handler Perpanjangan YouTube (Non-Grup) ---
        if (!chat.isGroup && message.body.toLowerCase().startsWith(config.commands.YOUTUBE)) {
            await handleYouTubeSubscription(message);
        }

    } catch (error) {
        console.error("Error in message handler:", error);
         await message.reply(config.messages.processingError);
    }
}


module.exports = { onMessage };

// messageHandler.js
const { handleAdminCommand } = require('./handlers/adminCommandHandler');
const { handleGroupCommand } = require('./handlers/groupCommandHandler');
const { handleYouTubeSubscription } = require('./utils/messageUtils');
const config = require('./config');
const { isSuperAdmin } = require('./utils/adminUtils');
const { handleAutomatedMessageCommand, userStates } = require('./handlers/automatedMessageCommandHandler'); // Impor juga userStates

async function onMessage(client, message) {
    try {
        const [chat, contact] = await Promise.all([message.getChat(), message.getContact()]);
        const senderId = contact.id._serialized;
        const messageBody = message.body.toLowerCase(); // Konsisten gunakan lowercase untuk perbandingan perintah

        // --- Handler Perintah Super Admin (bisa di grup atau PC) ---
        // Perlu dicek apakah perintah admin ada yang spesifik PC/Grup
        // Untuk saat ini, asumsikan bisa dari mana saja jika Super Admin
        await handleAdminCommand(client, message);

        // Prioritaskan penanganan state konfigurasi !automsg jika ada (HANYA PC)
        const currentUserState = userStates[senderId];
        if (currentUserState && !chat.isGroup) {
            await handleAutomatedMessageCommand(client, message, senderId);
            return; // Penting: Selesaikan di sini jika sedang dalam konfigurasi
        }

        // --- Handler Perintah Automated Message Baru (Hanya PC) ---
        if (messageBody.startsWith(config.commands.AUTOTEXT)) {
            if (chat.isGroup) {
                await message.reply(config.messages.autotextCommandOnlyForPC);
                return;
            }
            await handleAutomatedMessageCommand(client, message, senderId);
            return;
        }

        // --- Handler Pesan Non-Grup (Auto-reply) ---
        // Kondisi ini hanya tercapai jika BUKAN perintah !automsg dan TIDAK ADA state konfigurasi
        if (!chat.isGroup && !messageBody.startsWith(config.commands.YOUTUBE)) {
            await message.reply(config.messages.privateAutoReply());
            return;
        }

        // --- Perintah-Perintah Umum (bisa di PC atau grup, contoh GET_MY_ID)---
        if (message.body === config.commands.GET_MY_ID) { // Gunakan message.body jika case sensitive
            message.reply(config.messages.getUserId(senderId));
            return;
        }

        // --- Perintah Grup ---
        if (chat.isGroup) {
            await handleGroupCommand(client, message, chat);
            return; // Setelah perintah grup, biasanya tidak ada lagi yang perlu diproses untuk pesan yang sama
        }

        // --- Handler Perpanjangan YouTube (Non-Grup) ---
        // Ini juga hanya tercapai jika bukan perintah lain dan tidak ada state konfigurasi
        if (!chat.isGroup && messageBody.startsWith(config.commands.YOUTUBE)) {
            await handleYouTubeSubscription(message);
            // Tidak perlu return di sini jika ini adalah blok terakhir
        }

    } catch (error) {
        console.error("Error in message handler:", error);
         await message.reply(config.messages.processingError);
    }
}

module.exports = { onMessage };
// messageHandler.js
const { handleAdminCommand } = require('./handlers/adminCommandHandler');
const { handleGroupCommand } = require('./handlers/groupCommandHandler');
const { handleYouTubeSubscription } = require('./utils/messageUtils');
const config = require('./config');
const { isSuperAdmin, isGroupAdmin } = require('./utils/adminUtils'); // Tambahkan isGroupAdmin
const { handleAutomatedMessageCommand, userStates } = require('./handlers/automatedMessageCommandHandler'); // Impor juga userStates
const { handleQuotedReply } = require('./handlers/quotedReplyHandler'); // Impor handler baru
const { getAIResponse } = require('./handlers/aiChatHandler'); // <-- Impor handler AI baru
const Conversation = require('./models/Conversation');

async function onMessage(client, message) {
    try {
        const chat = await message.getChat(); // Pindahkan ke atas untuk akses lebih awal
        const contact = await message.getContact();
        const senderId = contact.id._serialized;
        const messageBody = message.body; // Tidak perlu toLowerCase() untuk .p dan .d karena case sensitive
        const messageBodyLower = message.body.toLowerCase();

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
        if (messageBodyLower.startsWith(config.commands.AUTOTEXT)) {
            if (chat.isGroup) {
                await message.reply(config.messages.autotextCommandOnlyForPC);
                return;
            }
            await handleAutomatedMessageCommand(client, message, senderId);
            return;
        }

        // --- Handler untuk Perintah .p dan .d pada Pesan Terkutip ---
        if (message.hasQuotedMsg && (messageBody === config.commands.PROCESS_TRANSACTION || messageBody === config.commands.COMPLETE_TRANSACTION)) {
            if (chat.isGroup) {
                const isAdmin = await isGroupAdmin(chat, senderId);
                const isSuper = await isSuperAdmin(senderId);
                if (isAdmin || isSuper) {
                    await handleQuotedReply(client, message, chat);
                    return;
                } else {
                    await message.reply(config.messages.groupAdminOnly);
                    return;
                }
            } else { // Jika bukan grup, hanya super admin yang boleh (opsional, bisa disesuaikan)
                const isSuper = await isSuperAdmin(senderId);
                if (isSuper) {
                    await handleQuotedReply(client, message, chat); // Bisa juga digunakan di PC oleh SuperAdmin
                    return;
                } else {
                    // Tidak ada balasan jika di PC oleh non-superadmin, atau bisa ditambahkan pesan khusus
                }
            }
        }

        // --- Handler Pesan Non-Grup (Auto-reply) ---
        // Kondisi ini hanya tercapai jika BUKAN perintah !automsg dan TIDAK ADA state konfigurasi
        if (!chat.isGroup) {
            // Pengecualian: jika pengguna memulai perintah youtube lama, biarkan lewat.
            // Anda bisa menghapus ini jika ingin semua ditangani AI.
            if (messageBodyLower.startsWith(config.commands.YOUTUBE)) {
                await handleYouTubeSubscription(message);
                return;
            }


            // Perintah untuk mereset percakapan
            if (message.body.toLowerCase() === '.reset') {
                await Conversation.deleteOne({ userId: senderId });
                await message.reply('🤖 Sesi percakapan telah direset dan dihapus dari database. Silakan mulai dari awal.');
                return;
            }

            // 1. Cari atau buat dokumen percakapan untuk pengguna
            let conversation = await Conversation.findOne({ userId: senderId });
            if (!conversation) {
                conversation = new Conversation({ userId: senderId, messages: [] });
            }

            // 2. Tambahkan pesan pengguna saat ini ke riwayat
            conversation.messages.push({ role: 'user', content: message.body });

            // 3. Batasi panjang riwayat untuk menghemat token
            const maxHistoryLength = 10;
            if (conversation.messages.length > maxHistoryLength) {
                conversation.messages = conversation.messages.slice(-maxHistoryLength);
            }

            // 4. Kirim pesan tunggu dan panggil AI dengan riwayat dari DB
            message.reply("🤖 Asisten Digital LX sedang mengetik...", chat.id._serialized);
            
            // Kirim hanya array 'messages'-nya saja ke AI handler
            const aiReply = await getAIResponse(conversation.messages, client, message);

            // 5. Jika AI memberikan balasan teks, simpan ke riwayat
            if (aiReply) {
                conversation.messages.push({ role: 'assistant', content: aiReply });
            }
            
            // 6. Simpan seluruh percakapan kembali ke database
            try {
                await conversation.save();
            } catch (dbError) {
                console.error("Error saving conversation to DB:", dbError);
                // Tetap kirim balasan meskipun gagal simpan, agar user tidak merasa diabaikan
            }

            // 7. Kirim balasan ke pengguna (jika ada)
            if (aiReply) {
                await message.reply(aiReply);
            }
            
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
        if (!chat.isGroup && messageBodyLower.startsWith(config.commands.YOUTUBE)) {
            await handleYouTubeSubscription(message);
            // Tidak perlu return di sini jika ini adalah blok terakhir
        }

    } catch (error) {
        console.error("Error in message handler:", error);
         await message.reply(config.messages.processingError);
    }
}

module.exports = { onMessage };
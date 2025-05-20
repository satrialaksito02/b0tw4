// handlers/groupCommandHandler.js
const { isGroupAdmin } = require('../utils/adminUtils.js');
const {
    isGroupSubscribed,
    setAntilink,
    setWelcomeEnabled,
    setWelcomeMessage,
    getGroupSubscriptionStatus,
    isAntilinkEnabled
} = require('../utils/groupUtils.js');
const config = require('../config.js');
const antispamService = require('../utils/antispam.js');
const { MessageMedia } = require('whatsapp-web.js');

async function handleGroupCommand(client, message, chat) {
    const groupId = chat.id._serialized;
    const senderId = message.author;
    const isAdmin = await isGroupAdmin(chat, senderId);
    const messageParts = message.body.split(" ");
    const command = messageParts[0];
    const arg = messageParts.slice(1).join(" ");
    const linkRegex = /https?:\/\/[^\s]+|(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/\S*)?/gi;

    // --- PERBAIKAN: Gunakan await saat cek langganan di awal ---
    const groupIsSubscribed = await isGroupSubscribed(groupId);

    switch (command) {
        case config.commands.HIDETAG:
            if (!isAdmin) {
                message.reply(config.messages.groupAdminOnly);
                return;
            }
            if (!groupIsSubscribed) {
                message.reply(config.messages.groupNotSubscribed);
                return;
            }

            try {
                // Use chat.participants directly, which is already an array of participant objects.
                const participants = chat.participants;
                const mentions = participants.map(p => p.id._serialized); // Extract serialized IDs.
                let text = arg;
                const messageOptions = {
                  mentions: mentions
                };

                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    if (media) {
                      messageOptions.caption = text;
                      messageOptions.attachment = media;  // Use 'attachment' key.
                      await chat.sendMessage(media, messageOptions);
                    } else {
                        message.reply(config.messages.noMedia);
                    }
                } else {
                    if (!text)
                    {
                      text = "";
                    }
                    await chat.sendMessage(text, messageOptions);
                }
            } catch (error) {
                console.error('Error sending hidetag message:', error);
                message.reply(config.messages.generalError);
            }
            break;


        case config.commands.ANTILINK:
            if (isAdmin) {
                // --- PERBAIKAN: Gunakan variabel yang sudah di-await ---
                if (!groupIsSubscribed) {
                    message.reply(config.messages.groupNotSubscribed);
                    return;
                }
                const enabled = arg === 'on';
                // --- PERBAIKAN: Tambahkan await ---
                await setAntilink(groupId, enabled);
                message.reply(enabled ? config.messages.antilinkEnabled : config.messages.antilinkDisabled);
            } else {
                message.reply(config.messages.groupAdminOnly);
            }
            break;

        case config.commands.WELCOME:
            if (isAdmin) {
                 // --- PERBAIKAN: Gunakan variabel yang sudah di-await ---
                if (!groupIsSubscribed) {
                    message.reply(config.messages.groupNotSubscribed);
                    return;
                }
                const welcomeEnabled = arg === 'on';
                 // --- PERBAIKAN: Tambahkan await ---
                await setWelcomeEnabled(groupId, welcomeEnabled);
                 message.reply(welcomeEnabled ? config.messages.welcomeEnabled : config.messages.welcomeDisabled);

            } else {
                message.reply(config.messages.groupAdminOnly);
            }
            break;

        case config.commands.SET_WELCOME:
            if (isAdmin) {
                 // --- PERBAIKAN: Gunakan variabel yang sudah di-await ---
                if (!groupIsSubscribed) {
                    message.reply(config.messages.groupNotSubscribed);
                    return;
                }
                const newWelcomeMessage = arg.trim();
                if (newWelcomeMessage) {
                    // --- PERBAIKAN: Tambahkan await ---
                    await setWelcomeMessage(groupId, newWelcomeMessage);
                    message.reply(config.messages.setWelcomeSuccess);
                } else {
                    message.reply(config.messages.setWelcomeFormat);
                }
            } else {
                message.reply(config.messages.groupAdminOnly);
            }
            break;

        case config.commands.STATUS:
                // --- PERBAIKAN: Tambahkan await ---
                const status = await getGroupSubscriptionStatus(groupId);
                 // Pastikan status bukan promise sebelum dikirim ke config
                 if (status) {
                    message.reply(config.messages.groupStatus(status));
                 } else {
                    // Handle kasus jika getGroupSubscriptionStatus gagal (meskipun seharusnya tidak jika error handlingnya baik)
                    message.reply("Gagal mendapatkan status grup.");
                 }
            break;

      default:
            // --- PERBAIKAN: Tambahkan await untuk cek antilink ---
           const antilinkOn = await isAntilinkEnabled(groupId);
           // Cek link hanya jika grup berlangganan DAN antilink aktif
           if (groupIsSubscribed && antilinkOn && linkRegex.test(message.body) && !isAdmin) {
                // --- PERBAIKAN: Tambahkan await jika addViolation async ---
                const violationCount = await antispamService.addViolation(groupId, senderId);
                await message.delete(true); // Hapus pesan pelanggaran

                if (violationCount === 1) {
                    await chat.sendMessage(config.messages.antilinkFirstWarning(senderId), { mentions: [senderId] }); // Mention senderId
                } else if (violationCount > 1) {
                    await chat.sendMessage(config.messages.antilinkKickWarning(senderId), { mentions: [senderId] }); // Mention senderId
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik
                     try {
                        await chat.removeParticipants([senderId]); // Keluarkan pelanggar
                         // --- PERBAIKAN: Tambahkan await jika resetViolation async ---
                        await antispamService.resetViolation(groupId, senderId); // Reset count setelah kick
                     } catch (removeError) {
                         console.error(`Failed to remove participant ${senderId} from group ${groupId}:`, removeError);
                         // Mungkin bot bukan admin lagi? Kirim pesan info jika gagal kick.
                         // await chat.sendMessage(`Gagal mengeluarkan @${senderId.split('@')[0]}.`, { mentions: [senderId] });
                     }
                }
            }
            // Tidak ada perintah yang cocok
    }
}

module.exports = { handleGroupCommand };

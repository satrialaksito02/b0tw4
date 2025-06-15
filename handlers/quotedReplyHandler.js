// handlers/quotedReplyHandler.js
const config = require('../config');

async function handleQuotedReply(client, message, chat) {
    try {
        const quotedMsg = await message.getQuotedMessage();
        if (!quotedMsg) {
            // This check is more of a safeguard, as message.hasQuotedMsg is checked in messageHandler
            return message.reply("❌ Silakan kutip pesan yang ingin direspon.");
        }

        const quotedAuthorContact = await quotedMsg.getContact();
        const quotedAuthorId = quotedAuthorContact.id._serialized;
        const userMention = `@${quotedAuthorId.split('@')[0]}`;

        const note = quotedMsg.body || quotedMsg.caption || "";

        const now = new Date();
        
        // Zona waktu Asia/Jakarta
        const options = { timeZone: 'Asia/Jakarta', hour12: false };
        const dateParts = new Intl.DateTimeFormat('id-ID', { ...options, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).formatToParts(now);
        
        let dayName = "", day = "", monthName = "", year = "";
        dateParts.forEach(part => {
            if (part.type === 'weekday') dayName = part.value;
            else if (part.type === 'day') day = part.value;
            else if (part.type === 'month') monthName = part.value;
            else if (part.type === 'year') year = part.value;
        });
        const formattedDate = `${dayName}, ${day} ${monthName} ${year}`;

        const timeParts = new Intl.DateTimeFormat('id-ID', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now);
        let hour = "", minute = "", second = "";
        timeParts.forEach(part => {
            if (part.type === 'hour') hour = part.value;
            else if (part.type === 'minute') minute = part.value;
            else if (part.type === 'second') second = part.value;
        });
        const formattedTime = `${hour}:${minute}:${second} WIB`;

        const adminMention = `@${config.adminContactId.split('@')[0]}`;
        const mentions = [quotedAuthorId, config.adminContactId];

        let replyText;

        if (message.body === config.commands.PROCESS_TRANSACTION) {
            replyText = config.messages.transactionProcessMessage(formattedDate, formattedTime, note, userMention, adminMention);
        } else if (message.body === config.commands.COMPLETE_TRANSACTION) {
            replyText = config.messages.transactionCompleteMessage(formattedDate, formattedTime, note, userMention, adminMention);
        }

        if (replyText) {
            // Modifikasi di sini: tambahkan quotedMessageId
            await chat.sendMessage(replyText, { 
                mentions, 
                quotedMessageId: quotedMsg.id._serialized // Ini akan membuat balasan mengutip pesan pengguna awal
            });
        }
    } catch (error) {
        console.error("Error in handleQuotedReply:", error);
        await message.reply(config.messages.processingError);
    }
}

module.exports = { handleQuotedReply };
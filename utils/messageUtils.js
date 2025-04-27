// utils/messageUtils.js
const { getSheetData } = require('../googleSheets');
const { generateAndSendQRIS } = require('../sheet_youtube/paymentHandlers');
const config = require('../config');

async function handleYouTubeSubscription(message) {
    const input = message.body.split(" ").slice(1).join(" ");
    const parts = input.split(" ");
    if (parts.length < 2) {
        message.reply(config.messages.youtubeFormatError);
        return;
    }

    const durasi = parts[0];
    const email = parts.slice(1).join(" ");

    if (!(durasi === '1bln' || durasi === '3bln')) {
        message.reply(config.messages.youtubeDurationError);
        return;
    }

    try {
        const sheetData = await getSheetData();
        const userRow = sheetData.find(row => row.email && email && row.email.toLowerCase() === email.toLowerCase());

        if (userRow) {
            let nominal = durasi === '1bln' ? 17000 : 50000;
            await generateAndSendQRIS(nominal, userRow, message); //Harus await
        } else {
            message.reply(config.messages.youtubeEmailNotFound);
        }
    } catch (error) {
        console.error('Error (YouTube Handler):', error);
        message.reply(config.messages.youtubeError);
    }
}
module.exports = {
    handleYouTubeSubscription,
};

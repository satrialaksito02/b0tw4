// bot.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { checkSubscriptionExpiry } = require('./utils/groupUtils');
const { onMessage } = require('./messageHandler');  // Impor handler pesan
const config = require('./config'); // Impor konfigurasi


const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');

    // Cek kadaluarsa subscription saat bot ready dan setiap 24 jam
    const checkAndNotify = async () => {
        try {
            const expiringGroups = await checkSubscriptionExpiry(); //Harus await
            expiringGroups.forEach(({ groupId, expiryDate }) => {
                client.sendMessage(groupId, config.messages.subscriptionExpiryNotification(expiryDate));
            });
        } catch (error) {
            console.error("Error checking subscription expiry:", error);
        }
    };

    checkAndNotify();
    setInterval(checkAndNotify, 24 * 60 * 60 * 1000);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    client.initialize(); // Coba inisialisasi ulang
});

// Event handler untuk pesan masuk
client.on('message', async message => {
    await onMessage(client, message); // Gunakan onMessage terpisah
});

// --- Event untuk Member Baru Bergabung ---
client.on('group_join', async (notification) => {
    try {
        const groupId = notification.chatId;
        const { isGroupSubscribed, isWelcomeEnabled, getWelcomeMessage } = require('./utils/groupUtils');

        if (isGroupSubscribed(groupId) && isWelcomeEnabled(groupId)) {
            let welcomeMessage = getWelcomeMessage(groupId);
            if (welcomeMessage) {
                const chat = await client.getChatById(groupId);
                welcomeMessage = welcomeMessage.replace(/@user/g, `@${notification.recipientIds[0].split('@')[0]}`);
                welcomeMessage = welcomeMessage.replace(/@grup/g, chat.name);
                client.sendMessage(groupId, welcomeMessage, {
                    mentions: [notification.recipientIds[0]]
                });
            }
        }
    } catch (error) {
        console.error("Error in group_join handler:", error);
    }
});

client.initialize();

process.on('SIGINT', () => {
    console.log('Bot shutting down.');
    process.exit();
});

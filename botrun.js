// bot.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const connectDB = require('./utils/db'); // Impor fungsi koneksi DB
const { checkSubscriptionExpiry } = require('./utils/groupUtils');
const { onMessage } = require('./messageHandler');
const config = require('./config');
const { isGroupSubscribed, isWelcomeEnabled, getWelcomeMessage } = require('./utils/groupUtils'); // Pindahkan impor ke atas
const { initializeScheduler, stopScheduler } = require('./services/schedulerService'); 
const kuotaUtils = require('./utils/kuotaUtils'); // <-- Impor modul kuota

// Hubungkan ke MongoDB saat aplikasi dimulai
connectDB();

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
    // Panggil AdminConfig.getConfig() sekali saat ready untuk memastikan dokumen ada
    try {
        const AdminConfig = require('./models/AdminConfig');
        await AdminConfig.getConfig();
        console.log('Admin config check/init complete.');
    } catch(err) {
        console.error('Error initializing admin config:', err);
    }


    // Cek kadaluarsa subscription saat bot ready dan setiap 24 jam
    const checkAndNotify = async () => {
        try {
            const expiringGroups = await checkSubscriptionExpiry();
            expiringGroups.forEach(({ groupId, expiryDate }) => {
                // Gunakan format tanggal yang lebih mudah dibaca jika perlu
                 const formattedDate = new Date(expiryDate).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                 client.sendMessage(groupId, config.messages.subscriptionExpiryNotification(formattedDate));

            });
        } catch (error) {
            console.error("Error checking subscription expiry:", error);
        }
    };

    checkAndNotify();
    setInterval(checkAndNotify, 24 * 60 * 60 * 1000); // Setiap 24 jam

    console.log("Memuat data dan memperbarui pricelist awal...");
    kuotaUtils.loadAreaDatabase(); // Muat DB Area ke memori
    await kuotaUtils.refreshPricelists(); // Jalankan scraper saat start
    // Atur agar scraper berjalan setiap 6 jam (21600000 ms)
    setInterval(() => kuotaUtils.refreshPricelists(), 1800000);
    // -------------------------

    // --- Inisialisasi Scheduler untuk Automated Messages ---
    initializeScheduler(client);
    console.log('Automated message scheduler initialized.');
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    // Pertimbangkan strategi reconnect yang lebih baik jika diperlukan
    stopScheduler();
    client.initialize().catch(err => console.error('Reinitialization failed:', err));
});

// Event handler untuk pesan masuk
client.on('message', async message => {
    // Pastikan client terhubung sebelum memproses
    if (client.info) {
         await onMessage(client, message);
    } else {
        console.log("Client not ready, skipping message.");
    }
});

// --- Event untuk Member Baru Bergabung ---
client.on('group_join', async (notification) => {
    try {
        const groupId = notification.chatId;

        // Cek langganan dan status welcome dari DB
        const subscribed = await isGroupSubscribed(groupId);
        const welcomeEnabled = await isWelcomeEnabled(groupId);

        if (subscribed && welcomeEnabled) {
            let welcomeMsg = await getWelcomeMessage(groupId); // Ambil dari DB
            if (welcomeMsg) {
                const chat = await client.getChatById(groupId);
                 // Gunakan ID partisipan yang valid
                const participantId = notification.recipientIds && notification.recipientIds.length > 0 ? notification.recipientIds[0] : null;

                if (participantId) {
                    welcomeMsg = welcomeMsg.replace(/@user/g, `@${participantId.split('@')[0]}`);
                    welcomeMsg = welcomeMsg.replace(/@grup/g, chat.name);

                    client.sendMessage(groupId, welcomeMsg, {
                        mentions: [participantId] // Kirim mention ke participantId
                    }).catch(err => console.error("Error sending welcome message:", err));
                } else {
                     console.log("Could not get participant ID for welcome message.");
                }
            }
        }
    } catch (error) {
        console.error("Error in group_join handler:", error);
    }
});

client.initialize().catch(err => {
    console.error("Client initialization failed:", err);
    process.exit(1); // Keluar jika inisialisasi gagal total
});

process.on('SIGINT', async () => {
    console.log('Bot shutting down...');
    try {
        await client.destroy(); // Tutup koneksi WhatsApp
        await mongoose.connection.close(); // Tutup koneksi DB
        console.log('Connections closed.');
    } catch (error) {
        console.error('Error during shutdown:', error);
    } finally {
        process.exit(0);
    }

});

// Tangani unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Pertimbangkan untuk keluar atau melakukan recovery di sini
});
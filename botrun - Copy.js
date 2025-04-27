const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { loadData, saveData, emitter } = require('./cekdata');
const { addSubscription } = require('./handlers/adminUserMessages');
const chokidar = require('chokidar');
const { google } = require('googleapis');
const { getSheetData } = require('./googleSheets.js');
const { exec } = require('child_process');
const path = require('path');
const { generateAndSendQRIS } = require('./sheet_youtube/paymentHandlers');

// Konstanta
const DATA_FILE = 'data.json';
const GET_MY_ID_COMMAND = "chuaxz";
const ADD_SUPERADMIN_COMMAND = "tambahdewasuper";
const REMOVE_SUPERADMIN_COMMAND = "hapusdewasuper";
const SUBSCRIPTION_COMMAND = "sewa";
const HIDETAG_COMMAND = "hidetag";

// File watching
const watcher = chokidar.watch('data.json', {
    persistent: true,
    ignoreInitial: true,
    debounce: 1500 // Tambahkan debounce (dalam milidetik, contoh: 500ms)
});

watcher.on('change', (path) => {
    console.log('data.json telah diubah, memuat ulang data...');
    try {
        data = loadData();
        console.log("Data setelah diubah:", data);
        emitter.emit('dataUpdated', data);
    } catch (error) {
        console.error("Error memuat ulang data:", error);
    }
});

// Data aplikasi
let data = loadData(); // Muat data menggunakan fungsi loadData

// Load data dari file
loadData();

// Impor fungsi-fungsi dari handlers
const groupMessages = require('./handlers/groupMessages');
const adminUserMessages = require('./handlers/adminUserMessages');

// Inisialisasi client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    client.initialize(); // Coba inisialisasi ulang
});

// Event listeners
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Client is ready!'));

client.on('message', async message => {
    const [chat, contact] = await Promise.all([message.getChat(), message.getContact()]);
    const groupId = chat.id._serialized;
    const senderId = contact.id._serialized;
	const linkRegex = /https?:\/\/[^\s]+|(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/\S*)?/gi;

    // Cek apakah pesan berasal dari chat pribadi dan tidak dimulai dengan "perpanjang"
    if (!chat.isGroup && !message.body.toLowerCase().startsWith('youtube')) {
        message.reply(`🤖 \`BOT LX DIGITAL\` 🤖\nSemua pesan yang masuk dibalas otomatis oleh bot.\n\n💎 *Perpanjang Akun Youtube*\n👉 Ketik: \`youtube 1bln/3bln email_anda\`\nContoh: youtube 3bln admin@gmail.com\n\n📞 Butuh bantuan?  Hubungi admin di 087829708498\n👍 Terima kasih!`)
        return;
    }

    // Untuk mendapatkan ID user
    if (message.body === GET_MY_ID_COMMAND) {
        message.reply(`User ID Anda: ${senderId}`);
        return;
    }

    // Kontrol akses Super Admin
    if (!await adminUserMessages.isSuperAdmin(senderId)) {
        const superAdminOnlyCommands = [ADD_SUPERADMIN_COMMAND, REMOVE_SUPERADMIN_COMMAND, SUBSCRIPTION_COMMAND];
        if (superAdminOnlyCommands.some(command => message.body.startsWith(command))) {
            message.reply("Maaf, hanya Super Admin yang bisa menggunakan perintah ini.");
            return;
        }
    }

    // Tambah Super Admin
    if (message.body.startsWith(ADD_SUPERADMIN_COMMAND + " ")) {
        const newAdminId = message.body.split(" ")[1];
        const success = adminUserMessages.addSuperAdmin(newAdminId);
        message.reply(success ? 'Super Admin baru telah ditambahkan.' : 'User ini sudah terdaftar sebagai Super Admin.');
        return;
    }

    // Hapus Super Admin
    if (message.body.startsWith(REMOVE_SUPERADMIN_COMMAND + " ")) {
        const adminIdToRemove = message.body.split(" ")[1];
        const success = adminUserMessages.removeSuperAdmin(adminIdToRemove);
        message.reply(success ? 'Super Admin telah dihapus.' : 'User ini tidak terdaftar sebagai Super Admin.');
        return;
    }

    // Contoh penggunaan addSubscription
    if (message.body.startsWith('sewa')) {
		if (chat.isGroup) {
			const days = message.body.split(" ")[1]; // Misalnya: !sewa 30
			if (days && !isNaN(days)) {
				addSubscription(groupId, days); // Panggil fungsi dengan parameter yang valid
				message.reply(`Grup ini telah berhasil diperpanjang ${days} hari`);
			} else {
				message.reply("Mohon masukkan jumlah hari yang valid.");
			}
        } else {
			message.reply('Perintah ini hanya bisa digunakan di dalam grup!');
		}
    }

    // Hidetag message
    if (message.body.startsWith(HIDETAG_COMMAND + " ")) {
        if (chat.isGroup) {
            if (groupMessages.isGroupSubscribed(groupId)) {
                if (await adminUserMessages.isGroupAdmin(chat, senderId)) {
                    const message_text = message.body.slice(HIDETAG_COMMAND.length + 1);
                    const result = await groupMessages.sendHideTagMessage(chat, message_text, message.hasMedia ? await message.downloadMedia() : null);
                    if (typeof result === 'string') message.reply(result);
                } else {
                    message.reply("Maaf, hanya admin grup yang dapat menggunakan fitur ini.");
                }
            } else {
                message.reply('Grup ini belum berlangganan atau masa aktif telah habis. Silakan hubungi admin untuk berlangganan.');
            }
        } else {
            message.reply('Perintah ini hanya bisa digunakan di dalam grup!');
        }
    }

	// Perpanjangan akun YouTube
    if (!chat.isGroup) {
        if (message.body.toLowerCase().startsWith('youtube')) {
            const input = message.body.split(" ").slice(1).join(" ");
            const parts = input.split(" ");
            if (parts.length < 2) {
                message.reply('Format pesan salah. Gunakan format `youtube <durasi> <email>`.\n\n*Informasi durasi*:\n- `1bln` untuk 1 bulan\n- `3bln` untuk 3 bulan.\n*Contoh*: youtube 1bln admin@gmail.com');
                return;
            }
    
            const durasi = parts[0];
            const email = parts.slice(1).join(" "); // Gabungkan sisa bagian menjadi email
    
            if (!(durasi === '1bln' || durasi === '3bln')) {
                message.reply('Durasi tidak valid. Gunakan 1bln (1 bulan) atau 3bln (3 bulan)');
                return;
            }
    
            try {
                const sheetData = await getSheetData();
                const userRow = sheetData.find(row => row.email && email && row.email.toLowerCase() === email.toLowerCase());
    
                if (userRow) {
                    let nominal = durasi === '1bln' ? 17000 : 50000;
                    generateAndSendQRIS(nominal, userRow, message);
                } else {
                    message.reply('Email tidak ditemukan. Pastikan anda mengetikkan email dengan benar.');
                }
            } catch (error) {
                console.error('Error:', error);
                message.reply('Terjadi kesalahan saat mengambil data.');
            }
        }
    }
	
	// Anti Link
	if (chat.isGroup && groupMessages.isGroupSubscribed(groupId) && linkRegex.test(message.body) && !(await adminUserMessages.isGroupAdmin(chat, senderId))) {
		// Muat data pelanggaran
		const violations = groupMessages.loadViolations();

		// Inisialisasi data grup dan pengirim jika belum ada
		if (!violations[groupId]) {
			violations[groupId] = {};
			console.log(`[Anti-Link] Grup ${groupId} belum ada di data pelanggaran. Data dibuat.`);
		}
		if (!violations[groupId][senderId]) {
			violations[groupId][senderId] = 0;
			console.log(`[Anti-Link] Pengirim ${senderId} belum ada di data pelanggaran grup ${groupId}. Data dibuat.`);
		}

		// Tambahkan jumlah pelanggaran
		violations[groupId][senderId]++;
		console.log(`[Anti-Link] Pelanggaran ke-${violations[groupId][senderId]} untuk ${senderId} di grup ${groupId}`);

		// Simpan data pelanggaran
		groupMessages.saveViolations(violations);

		// Hapus pesan link
		await message.delete(true);

		if (violations[groupId][senderId] === 1) {
			// Peringatan pertama
			await chat.sendMessage(`「 \`PESAN ANTILINK\` 」\n\n@${message.author.split('@')[0]}, kamu dilarang mengirimkan link di grup ini! 😡\nLain kali jangan gitu ya, atau nanti kita KICK 🫣.`, { mentions: [message.author] });
			console.log(`[Anti-Link] Peringatan pertama dikirim ke ${senderId} di grup ${groupId}`);
		} else if (violations[groupId][senderId] > 1) {
			// Kirim pesan peringatan *sebelum* mengeluarkan
			await chat.sendMessage(`「 \`PESAN ANTILINK\` 」\n\n@${message.author.split('@')[0]}, dibilang jangan kirim link di grup ini! 😡\nYaudah kalo gitu kita KICK ya 🫣.`, {
				mentions: [message.author]
			});

			// Tunggu sebentar (misalnya, 2 detik) untuk memastikan pesan terkirim
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Kick pengirim setelah pelanggaran kedua
			await chat.removeParticipants([message.author]);

			// Reset pelanggaran pengirim setelah di-kick
			delete violations[groupId][senderId];
			groupMessages.saveViolations(violations);
			console.log(`[Anti-Link] Pengirim ${senderId} di-kick dari grup ${groupId} karena pelanggaran berulang.`);
		}
	}
});

// Memulai client
client.initialize();

// Fungsi untuk menutup watcher saat bot berhenti
process.on('SIGINT', () => {
    watcher.close();
    console.log('File watcher closed.');
    process.exit();
});

process.on('SIGTERM', () => {
    watcher.close();
    console.log('File watcher closed.');
    process.exit();
});

module.exports = {
    saveData,
    data
};

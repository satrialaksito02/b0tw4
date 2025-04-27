const { getYoutubeSheetData, updateYoutubeSheetExpiry } = require('../googleSheets');
const moment = require('moment');
const { exec } = require('child_process');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
let renewalRequests = {}; // Untuk menyimpan sementara permintaan perpanjangan

async function handleCheckSubscription(message, email) {
    const sheetData = await getYoutubeSheetData();
    if (!sheetData) {
        return "Terjadi kesalahan saat mengambil data dari spreadsheet.";
    }

    const account = sheetData.find(item => item.email === email);
    if (account) {
        return `Informasi Akun:\nTanggal Pembelian: ${account.purchaseDate}\nExpired: ${account.expiryDate}`;
    } else {
        return `Email "${email}" tidak ditemukan.`;
    }
}

async function executePythonQRIS(nominal) {
    return new Promise((resolve, reject) => {
        const pythonScriptPath = path.join(__dirname, '../qris.py'); // Path ke script qris.py
        const command = `python ${pythonScriptPath} ${nominal}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error menjalankan script QRIS: ${error}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`Stderr dari script QRIS: ${stderr}`);
                return reject(stderr);
            }

            // Asumsi output dari qris.py adalah:
            // Baris 1: Nominal dengan kode unik
            // Baris 2: Path ke file qrcode.png
            const outputLines = stdout.trim().split('\n');
            const nominalQRIS = outputLines[0];
            const qrCodeImagePath = path.join(__dirname, '..', 'qrcode.png'); // Path ke gambar QR Code

            resolve({ nominalQRIS, qrCodeImagePath });
        });
    });
}

async function handleRenewalRequest(message, email) {
    const sheetData = await getYoutubeSheetData();
    if (!sheetData) {
        return "Terjadi kesalahan saat mengambil data dari spreadsheet.";
    }

    const account = sheetData.find(item => item.email === email);
    if (!account) {
        return `Email "${email}" tidak ditemukan.`;
    }

    renewalRequests[message.from] = { email, requestTime: Date.now() };
    return "Pilih durasi perpanjangan:\n1. 1 Bulan (30 hari)\n2. 3 Bulan (90 hari)";
}

async function handleRenewalOption(message, option) {
    const renewalRequest = renewalRequests[message.from];
    if (!renewalRequest) {
        return "Permintaan perpanjangan tidak valid atau sudah kadaluarsa.";
    }

    const { email, requestTime } = renewalRequest;
    const now = Date.now();
    if (now - requestTime > 5 * 60 * 1000) { // 5 menit
        delete renewalRequests[message.from];
        return "Waktu tunggu pembayaran habis. Silakan ajukan perpanjangan kembali.";
    }

    let days, months, qrisAmount;
    if (option === '1') {
        days = 30;
        months = 1;
        qrisAmount = 1000;
    } else if (option === '2') {
        days = 90;
        months = 3;
        qrisAmount = 3000;
    } else {
        return "Opsi perpanjangan tidak valid.";
    }

    try {
        const { nominalQRIS, qrCodeImagePath } = await executePythonQRIS(qrisBaseAmount);

        // Kirim gambar QRIS
        const media = MessageMedia.fromFilePath(qrCodeImagePath);
        message.reply(media, undefined, { caption: `Silakan lakukan pembayaran sebesar: ${nominalQRIS}` });

        // Simpan informasi permintaan perpanjangan, termasuk nominal QRIS
        renewalRequests[message.from] = { ...renewalRequests[message.from], qrisAmount: nominalQRIS, days, months };

        return `QR Code pembayaran telah dikirim. Lakukan pembayaran sesuai nominal. Ketik 'sukses' setelah membayar.`;

    } catch (error) {
        console.error("Gagal membuat atau mengirim QRIS:", error);
        return "Terjadi kesalahan saat membuat QR Code pembayaran.";
    }
}

module.exports = { handleCheckSubscription, handleRenewalRequest, handleRenewalOption };

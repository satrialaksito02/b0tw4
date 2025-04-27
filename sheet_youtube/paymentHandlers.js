const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { spawn } = require('child_process'); // Gunakan spawn
const { MessageMedia } = require('whatsapp-web.js');
const { addDaysToDate, updateSheetData } = require('../googleSheets');
const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Fungsi untuk membuat dan mengirim QRIS
async function generateAndSendQRIS(nominal, userRow, message) {
    console.log("Current directory __dirname:", __dirname);
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'newqris.py');
        const qrisCommand = `python3 "${scriptPath}" ${nominal}`;

        exec(qrisCommand, async (error, stdout, stderr) => {
            if (error || stderr.trim()) { // Periksa stderr untuk pesan error dari Python
                console.error(`Error executing newqris.py: ${error || stderr.trim()}`);
                reject('Terjadi kesalahan saat membuat QRIS.');
                return;
            }
            // Parsing output Python dengan lebih teliti:
            const outputLines = stdout.trim().split('\n');
            const qrCodeLine = outputLines.find(line => line.startsWith("QR Code Filename:"));

            if (!qrCodeLine) {
                reject("QR code filename not found in python output");
                return;
            }
            
            const output = stdout.trim().split('\n');
            const qrCodeFilename = output.find(line => line.startsWith("QR Code Filename:")).split(': ')[1];

            if (!qrCodeFilename) {
                reject("QR code filename not found in python output");
                return;
            }

            const nominalInput = parseInt(output.find(line => line.startsWith("Nominal:")).split(': ')[1]);
            const kodeUnik = parseInt(output.find(line => line.startsWith("Kode Unik:")).split(': ')[1]);
            const nominalDenganKode = parseInt(output.find(line => line.startsWith("Nominal dengan Kode:")).split(': ')[1]);

            const qrMediaPath = qrCodeLine.split(': ')[1].trim();
            console.log("qrMediaPath:", qrMediaPath);

            let qrFileReady = false;
            const checkFile = () => {
                if (fs.existsSync(qrMediaPath)) {
                    qrFileReady = true;
                } else {
                    setTimeout(checkFile, 100); // Periksa setiap 100ms
                }
            };

            checkFile(); // Mulai periksa file

            await new Promise((resolve, reject) => {
                const intervalId = setInterval(() => {
                    if (qrFileReady) {
                        clearInterval(intervalId);
                        resolve();
                    } else if (Date.now() > Date.now() + 5000){ //tambahkan timeout jika file tidak ditemukan dalam 5 detik
                        clearInterval(intervalId);
                        reject("File QR tidak ditemukan setelah 5 detik")
                    }
                }, 100); // Periksa setiap 100ms
            }).catch(err => reject(err));


            try {
                const qrMedia = MessageMedia.fromFilePath(qrMediaPath);
                const expiredTime = new Date(Date.now() + 5 * 60 * 1000).toLocaleString('id-ID');
                const paymentMessage = `𝗣𝗘𝗠𝗕𝗔𝗬𝗔𝗥𝗔𝗡 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 𝗗𝗜𝗕𝗨𝗔𝗧,\nsilahkan transfer ke 𝗤𝗥𝗜𝗦 tersebut\n\n` +
                    `Informasi:\n` +
                    `› 𝐍𝐨𝐦𝐢𝐧𝐚𝐥: Rp${nominalInput}\n` +
                    `› 𝐊𝐨𝐝𝐞 𝐔𝐧𝐢𝐤: ${kodeUnik}\n` +
                    `› 𝐍𝐨𝐦𝐢𝐧𝐚𝐥 𝐝𝐞𝐧𝐠𝐚𝐧 𝐊𝐨𝐝𝐞: ${nominalDenganKode}\n` +
                    `› 𝐏𝐞𝐫𝐩𝐚𝐧𝐣𝐚𝐧𝐠𝐚𝐧 𝐘𝐨𝐮𝐓𝐮𝐛𝐞: ${nominalInput === 17000 ? '1 bulan' : '3 bulan'}\n` +
                    `› 𝐏𝐞𝐦𝐛𝐚𝐲𝐚𝐫𝐚𝐧 𝐄𝐱𝐩𝐢𝐫𝐞𝐝: ${expiredTime}\n` +
                    `› 𝐄𝐦𝐚𝐢𝐥: ${userRow.email}\n` +
                    `› 𝐈𝐃 𝐓𝐫𝐚𝐧𝐬𝐚𝐤𝐬𝐢: ${nominalDenganKode}`;

                message.reply(qrMedia, undefined, { caption: paymentMessage }).then((sentMessage) => {
                    monitorPayment(nominalInput, userRow, nominalDenganKode, message, sentMessage);
                });
                resolve();
            } catch (mediaError) {
                reject(`Error creating media: ${mediaError.message}`);
            }
        });
    });
}

async function monitorPayment(nominal, userRow, qrisId, message, paymentMessage) {
    const timeout = 5 * 60 * 1000; // 5 Menit
    const timeoutId = setTimeout(() => {
        console.log("Timeout reached. Payment not confirmed.");
        message.reply('Waktu tunggu pembayaran habis.');
        deletePaymentMessage(paymentMessage);
        deleteQRISFile(qrisId);
    }, timeout);

    const checkPath = path.join(__dirname, 'check.py');
    const command = 'python3';
    const args = [checkPath, nominal, qrisId - nominal]; // Pass nominal and kode unik (qrisId - nominal)

    const pythonProcess = spawn(command, args);


    pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log("Check Pembayaran Output:", output);
        if (output.includes('Pembayaran DITEMUKAN!')) {
            clearTimeout(timeoutId);
            processPayment(nominal, userRow, message, paymentMessage, qrisId);
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error("Check Pembayaran Error:", data.toString());
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`check.py exited with code ${code}`);
        }
    });

    pythonProcess.on('error', (err) => {
        console.error(`Error spawning Python process: ${err}`);
    });
}

// Fungsi untuk menulis data ke sheet "Report Youtube"
async function writeToReportSheet(userRow, phoneNumber, nominal, kodeUnik, days) {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'credential.json', // Sesuaikan dengan file credentials Anda
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const client = await auth.getClient();
    const spreadsheetId = '1zO5w3JLCzoK7Scw5TuPleEE7c3-jcdXFpbAKfAEnlHw'; // Ganti dengan ID spreadsheet Anda
    const range = 'Report Youtube!A3:F'; // Range untuk menulis data

    const tanggalTransaksi = new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}); //waktu transaksi
    const tanggalExpired = userRow.expired;
    const nominalPerpanjangan = nominal; // Nominal
    const nominalUnik = nominal + kodeUnik; // Nominal + Kode Unik

    const values = [
        [
            tanggalTransaksi, // Kolom A: Tanggal Transaksi
            phoneNumber,      // Kolom B: Nomor Handphone User
            userRow.email,    // Kolom C: Email yang Diperpanjang
            days,             // Kolom D: Durasi Perpanjangan
            tanggalExpired,   // Kolom E: Tanggal Expired
            nominalPerpanjangan, // Kolom F: Nominal Perpanjangan
            nominalUnik,
        ],
    ];

    try {
        await sheets.spreadsheets.values.append({
            auth: client,
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });
        console.log('Data transaksi berhasil ditulis ke sheet "Report Youtube".');
    } catch (error) {
        console.error('Gagal menulis data transaksi:', error);
    }
}


// Fungsi untuk memproses pembayaran yang berhasil
async function processPayment(nominal, userRow, message, paymentMessage, qrisId) {
    const days = nominal === 17000 ? 30 : 90;
    const newExpiredDate = addDaysToDate(userRow.expired, days);
    userRow.tanggalPembelian = new Date(userRow.expired).toLocaleDateString('id-ID');
    userRow.expired = newExpiredDate;
    userRow.durasi = nominal === 17000 ? '1' : '3';

    await updateSheetData(userRow);

    // Dapatkan nomor handphone user dari pesan
    const phoneNumber = (await message.getContact()).number;

    // Tulis data transaksi ke sheet "Report Youtube"
    await writeToReportSheet(userRow, phoneNumber, nominal, qrisId - nominal, days); 
	
    message.reply(`𝗣𝗘𝗥𝗣𝗔𝗡𝗝𝗔𝗡𝗚𝗔𝗡 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟!\nAkun Anda telah diperpanjang:\n\n✦ 𝐄𝐦𝐚𝐢𝐥: ${userRow.email}\n✦ 𝐄𝐱𝐩𝐢𝐫𝐞𝐝 𝐁𝐚𝐫𝐮: ${userRow.expired}\n\nThank you, happy watching 🍿\n— _LX DIGITAL STORE_—`);
    deletePaymentMessage(paymentMessage);
    deleteQRISFile(qrisId); // Hapus file QRIS setelah pembayaran berhasil
}

// Fungsi untuk menghapus pesan pembayaran
async function deletePaymentMessage(paymentMessage) {
    try {
        await paymentMessage.delete(true); // true untuk menghapus pesan dari kedua sisi (pengirim dan penerima)
        console.log('Pesan pembayaran berhasil dihapus.');
    } catch (error) {
        console.error('Gagal menghapus pesan pembayaran:', error);
    }
}

// Fungsi untuk menghapus file QRIS
function deleteQRISFile(nominalDenganKode) {
    const qrMediaPath = path.join(__dirname, `qris_${nominalDenganKode}.png`);
    fs.unlink(qrMediaPath, (err) => {
        if (err) {
            console.error('Gagal menghapus file QRIS:', err);
        } else {
            console.log(`File QRIS dengan ID ${nominalDenganKode} berhasil dihapus.`);
        }
    });
}

// Ekspor fungsi-fungsi
module.exports = {
    generateAndSendQRIS,
    monitorPayment,
    processPayment,
    deletePaymentMessage,
    deleteQRISFile
};

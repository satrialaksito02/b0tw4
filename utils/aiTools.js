// utils/aiTools.js
const fs = require('fs');
const path = require('path');
const { generateAndSendQRIS } = require('../sheet_youtube/paymentHandlers');
const { getSheetData } = require('../googleSheets');
const kuotaUtils = require('./kuotaUtils'); // <-- Impor modul kuota

// 1. Definisikan struktur "alat" yang akan dipahami oleh OpenRouter
function getToolDefinitions() {
    return [
        {
            type: 'function',
            function: {
                name: 'getYouTubePrice',
                description: 'Mendapatkan informasi harga perpanjangan YouTube Premium.',
                parameters: { type: 'object', properties: {} } // Tidak perlu parameter
            }
        },
        {
            type: 'function',
            function: {
                name: 'startYouTubeRenewal',
                description: 'Memulai proses perpanjangan langganan YouTube Premium untuk pengguna. Ini akan menghasilkan kode QRIS untuk pembayaran.',
                parameters: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', description: 'Alamat email akun YouTube pengguna.' },
                        duration: { type: 'string', enum: ['1bln', '3bln'], description: "Durasi perpanjangan, harus '1bln' atau '3bln'." }
                    },
                    required: ['email', 'duration']
                }
            }
        },
        {
            type: 'function',
            // --- UBAH NAMA DAN DESKRIPSI TOOL ---
            function: {
                name: 'getCombinedPricelist',
                description: 'Mendapatkan daftar harga gabungan dari SEMUA kategori paket kuota (Akrab, Akrab Bekasan, Circle) berdasarkan nama kota atau kabupaten pengguna.',
                parameters: {
                    type: 'object',
                    properties: {
                        // --- HAPUS PARAMETER KATEGORI ---
                        city: { type: 'string', description: 'Nama kota atau kabupaten yang disebutkan oleh pengguna. Contoh: "Jakarta", "Bandung", "Sleman".' }
                    },
                    required: ['city'] // Hanya 'city' yang dibutuhkan
                }
            }
        }
    ];
}

// 2. Buat fungsi untuk mengeksekusi alat yang diminta AI
async function executeTool(tool_call, client, originalMessage) {
    const functionName = tool_call.function.name;
    const args = JSON.parse(tool_call.function.arguments);

    console.log(`AI is calling tool: ${functionName} with args:`, args);

    switch (functionName) {
        case 'getYouTubePrice':
            return "Tentu! Berikut harga perpanjangan YouTube Premium di LX DIGITAL:\n- 1 Bulan: Rp 17.000\n- 3 Bulan: Rp 50.000\nMau perpanjang yang mana?";

        case 'startYouTubeRenewal':
            // Ini adalah titik integrasi dengan sistem Anda yang sudah ada
            const sheetData = await getSheetData();
            const userRow = sheetData.find(row => row.email && args.email && row.email.toLowerCase() === args.email.toLowerCase());

            if (userRow) {
                let nominal = args.duration === '1bln' ? 17000 : 50000;
                await generateAndSendQRIS(nominal, userRow, originalMessage);
                return null; // Tidak perlu mengirim pesan teks tambahan, karena generateAndSendQRIS sudah melakukannya
            } else {
                return `Maaf, email ${args.email} tidak terdaftar di sistem kami. Mohon periksa kembali.`;
            }

        case 'getCombinedPricelist':
            const areaInfo = kuotaUtils.findAreaByCity(args.city);
            if (areaInfo) {
                const { area, matchedCity } = areaInfo;
                await originalMessage.reply(`✅ Oke, saya carikan semua harga untuk daerah *${matchedCity}* (Area ${area}) ya, mohon tunggu sebentar...`);
                // Panggil fungsi baru yang akan kita buat di kuotaUtils
                return await kuotaUtils.getCombinedPricelist(area);
            } else {
                return `Maaf, saya tidak dapat menemukan informasi untuk kota *${args.city}*. Mohon pastikan penulisan nama kota atau kabupaten sudah benar ya.`;
            }
        
        default:
            return "Maaf, terjadi kesalahan saat mencoba menggunakan alat internal.";
    }
}

module.exports = { getToolDefinitions, executeTool };
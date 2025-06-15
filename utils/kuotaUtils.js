// wa/utils/kuotaUtils.js

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Fuse = require('fuse.js');
const Pricelist = require('../models/Pricelist'); // <-- Impor model baru

const AREA_HTML_FILE = path.join(__dirname, '..', 'data', 'area.html');
const PRICELIST_DIR = path.join(__dirname, '..', 'data', 'pricelist');
const SCRAPER_SCRIPT = path.join(__dirname, '..', 'scripts', 'pricelistScraper.js');

/**
 * Mengambil dan menggabungkan pricelist dari semua kategori untuk area tertentu.
 * @param {string} area - Nomor area (misal: '1', '2').
 * @returns {Promise<string>} String gabungan yang sudah diformat untuk balasan WhatsApp.
 */

// Ganti seluruh fungsi getCombinedPricelist dengan yang ini:
async function getCombinedPricelist(area) {
    const categories = ['akrab', 'akrab-bekasan', 'circle'];
    let combinedResponse = `Berikut adalah daftar harga yang tersedia untuk *AREA ${area}*:\n`;
    let foundAny = false;
    const allSections = [];

    for (const category of categories) {
        const sectionData = await getFormattedPricelist(area, category);
        if (sectionData && sectionData.packs.length > 0) {
            allSections.push(sectionData);
            foundAny = true;
        }
    }

    if (!foundAny) {
        return `Maaf, saat ini semua stok untuk semua kategori di AREA ${area} sedang habis.`;
    }

    // Susun respons final dari data terstruktur
    for (const section of allSections) {
        combinedResponse += `\n🏷️ ${section.title}\n`;
        for (const pack of section.packs) {
            combinedResponse += `  📦 *${pack.name}*\n`;
            combinedResponse += `    • Harga: *${pack.price}*\n`;
            combinedResponse += `    • Kuota: ${pack.quota}\n`;
            combinedResponse += `    • Stok: ${pack.stock}\n`;
        }
    }

    return combinedResponse;
}

/**
 * Mengubah string kuota menjadi angka dalam GB.
 * Mengambil angka pertama jika ada rentang.
 * @param {string} quotaString - Contoh: "50 - 52 Gb", "185 GB", "1.5GB"
 * @returns {number} Kuota dalam GB, atau 0 jika tidak dapat diparsing.
 */
function parseQuotaToGB(quotaString) {
    if (!quotaString) return 0;
    // Ambil angka pertama (float atau integer) dari string
    const match = quotaString.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

/**
 * Menghitung markup dinamis berdasarkan harga per GB.
 * @param {number} basePrice - Harga dasar dari developer.
 * @param {number} quotaInGB - Kuota dalam GB.
 * @returns {number} Markup yang akan ditambahkan.
 */
function calculateDynamicMarkup(basePrice, quotaInGB) {
    if (quotaInGB === 0) return 4000; // Markup minimum jika kuota tidak terdefinisi

    const pricePerGB = basePrice / quotaInGB;

    // Semakin 'worth it' (harga/GB rendah), kita bisa ambil untung lebih besar.
    if (pricePerGB < 800) { // Sangat worth it
        return 9000;
    } else if (pricePerGB < 1000) { // Cukup worth it
        return 7000;
    } else if (pricePerGB < 1200) { // Standar
        return 5000;
    } else { // Kurang worth it
        return 4000;
    }
}

let areaDatabase = []; // Simpan database area di memori

/**
 * Memuat database area dari area.html ke memori.
 */
function loadAreaDatabase() {
    try {
        const htmlContent = fs.readFileSync(AREA_HTML_FILE, 'utf8');
        const db = [];
        const tableBodyRegex = /<tbody>([\s\S]*?)<\/tbody>/i;
        const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

        const bodyMatch = htmlContent.match(tableBodyRegex);
        if (!bodyMatch) throw new Error("Tabel <tbody> tidak ditemukan.");

        let rowMatch;
        while ((rowMatch = rowRegex.exec(bodyMatch[1])) !== null) {
            const cells = [];
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                // Membersihkan konten dari tag lain jika ada
                cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
            }

            if (cells.length === 3) {
                const province = cells[0];
                const cities = cells[1].split(',').map(city => city.trim());
                const area = cells[2];
                cities.forEach(city => {
                    if (city) db.push({ province, city, area });
                });
            }
        }
        areaDatabase = db;
        console.log(`[INFO] Database Area berhasil dimuat dengan ${areaDatabase.length} entri kota/kabupaten.`);
    } catch (error) {
        console.error(`[ERROR] Gagal memuat database area: ${error.message}`);
        areaDatabase = [];
    }
}

/**
 * Mencari nomor area berdasarkan nama kota (non-interaktif).
 * @param {string} cityName - Nama kota atau kabupaten dari input pengguna.
 * @returns {{area: string, matchedCity: string} | null} Objek berisi area dan nama kota yang cocok, atau null jika tidak ditemukan.
 */
function findAreaByCity(cityName) {
    if (areaDatabase.length === 0) {
        console.error("[ERROR] Database area kosong. Tidak dapat melakukan pencarian.");
        return null;
    }

    const fuse = new Fuse(areaDatabase, {
        keys: ['city'],
        includeScore: true,
        threshold: 0.4, // Ambang batas toleransi typo
    });

    const results = fuse.search(cityName);

    if (results.length > 0) {
        const bestMatch = results[0].item;
        return {
            area: bestMatch.area,
            matchedCity: bestMatch.city
        };
    }
    return null;
}

/**
 * Mengambil dan memformat pricelist untuk area tertentu dengan harga jual dinamis.
 * @param {string} area - Nomor area (misal: '1', '2').
 * @param {string} category - Kategori (misal: 'akrab', 'circle').
 * @returns {string} String yang sudah diformat untuk balasan WhatsApp.
 */
// Ganti seluruh fungsi getFormattedPricelist dengan yang ini:
async function getFormattedPricelist(area, category) {
    const fileName = `${category.replace(/_/g, '-')}.json`;
    const filePath = path.join(PRICELIST_DIR, fileName);

    if (!fs.existsSync(filePath)) return null;

    const packsFromSource = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const availablePacks = packsFromSource.filter(p => p.stok > 0);

    if (availablePacks.length === 0) return null;

    const processedPacks = [];
    for (const pack of availablePacks) {
        const quotaKey = `AREA ${area}`;
        const quotaString = pack.kuota[quotaKey] || pack.kuota['Nasional'];
        
        if (!quotaString) continue;

        const quotaInGB = parseQuotaToGB(quotaString);
        let finalPrice = 0;

        const cachedPrice = await Pricelist.findOne({ productId: pack.id_produk_sumber });
        const now = new Date();

        if (!cachedPrice || now > cachedPrice.validUntil || cachedPrice.basePrice !== pack.harga) {
            const markup = calculateDynamicMarkup(pack.harga, quotaInGB);
            const calculatedPrice = pack.harga + markup;
            finalPrice = Math.round(calculatedPrice / 500) * 500;
            const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            await Pricelist.findOneAndUpdate(
                { productId: pack.id_produk_sumber },
                { category, name: pack.nama, basePrice: pack.harga, finalPrice, validUntil },
                { upsert: true, new: true }
            );
        } else {
            finalPrice = cachedPrice.finalPrice;
        }

        processedPacks.push({
            name: pack.nama,
            price: `Rp ${finalPrice.toLocaleString('id-ID')}`,
            quota: quotaString,
            stock: pack.stok,
        });
    }

    if (processedPacks.length === 0) return null;

    // Kembalikan objek terstruktur, bukan string
    return {
        title: `*${category.toUpperCase().replace('-', ' ')}*`,
        packs: processedPacks
    };
}

/**
 * Menjalankan scraper untuk memperbarui file JSON pricelist.
 * @returns {Promise<string>} Pesan status.
 */
function refreshPricelists() {
    return new Promise((resolve, reject) => {
        console.log('[INFO] Menjalankan scraper pricelist...');
        exec(`node "${SCRAPER_SCRIPT}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[ERROR] Gagal menjalankan scraper: ${error.message}`);
                return reject('Gagal memperbarui pricelist.');
            }
            if (stderr) {
                console.error(`[ERROR] Stderr dari scraper: ${stderr}`);
            }
            console.log(`[INFO] Scraper selesai:\n${stdout}`);
            resolve('Pricelist berhasil diperbarui.');
        });
    });
}

// Inisialisasi database saat modul di-load
loadAreaDatabase();

module.exports = {
    loadAreaDatabase,
    findAreaByCity,
    getFormattedPricelist, // Tetap ekspor untuk penggunaan internal
    getCombinedPricelist,   // <-- EKSPOR FUNGSI BARU
    refreshPricelists
};
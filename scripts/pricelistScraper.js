// Nama file: pricelist_saver_v3.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * ====================================================================
 * PENTING: Konfigurasi Token dan Kategori
 * ====================================================================
 */
const API_CONFIG = {
    token: 'eyJhcHAiOiIxNTg5MzkiLCJhdXRoIjoiMjAyNDA2MjMiLCJzaWduIjoiU3hDdFQ5bjFwNlNJVG5OYVd3TnU5dz09In0=',
    categories: {
        akrab: '627665',
        akrab_bekasan: '635431',
        circle: '672911'
    },
    headers: {
        'User-Agent': 'com.irstore06 Bukaolshop Mozilla/5.0 (Linux; Android 13; M2007J20CG Build/BAIKAL13-20240119; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/137.0.7151.61 Mobile Safari/537.36',
        'Origin': 'https://irstore06.bukaolshop.site',
        'Referer': 'https://irstore06.bukaolshop.site/',
    }
};

const outputDir = path.join(__dirname, '..', 'data', 'pricelist');


/**
 * Fungsi untuk memformat response dari openapi.bukaolshop.net
 * @param {Array} products - Array produk dari response.data.data
 * @returns {Array} Array produk yang sudah diformat
 */
function formatBukaolshopResponse(products) {
    if (!products || !Array.isArray(products)) return [];

    return products.map(product => {
        const { id_produk, nama_produk, harga_produk, stok, deskripsi_panjang } = product;
        const kuota = {};
        const benefits = [];
        const catatan = [];

        // --- 1. Parsing Kuota ---
        const kuotaRegex = /(?:~?\s*AREA|Area)\s*(\d+)\s*[:=]\s*([\w\s.-]+GB)/gi;
        const kuotaNasionalRegex = /Kuota\s+([\w\s.-]+GB)\s*\(NASIONAL\)/i;
        const kuotaBersamaRegex = /Kuota Bersama\s+([\w\s.-]+GB)/i
        
        let match;
        while ((match = kuotaRegex.exec(deskripsi_panjang)) !== null) {
            kuota[`AREA ${match[1]}`] = match[2].trim();
        }
        const matchNasional = deskripsi_panjang.match(kuotaNasionalRegex);
        if (matchNasional) kuota['Nasional'] = matchNasional[1].trim();
        const matchBersama = deskripsi_panjang.match(kuotaBersamaRegex);
        if (matchBersama) kuota['Kuota Bersama'] = matchBersama[1].trim();

        // --- 2. Parsing Benefits dan Catatan ---
        const lines = deskripsi_panjang.split(/<br\s*\/?>/i);
        let isBenefitSection = false;
        let isNotedSection = false;

        lines.forEach(line => {
            const trimmedLine = line.replace(/~|^\s*|\s*$/g, '').trim();
            
            if (/benefits kuota yang di dapatkan/i.test(trimmedLine)) {
                isBenefitSection = true; isNotedSection = false; return;
            }
            if (/noted\s*:/i.test(trimmedLine)) {
                isNotedSection = true; isBenefitSection = false; return;
            }

            if (!trimmedLine) return;

            if (isBenefitSection) {
                // --- PERBAIKAN LOGIKA DI SINI ---
                // Cek apakah baris ini BUKAN judul area dan BUKAN rincian data area
                const isAreaTitle = /kuota yang di dapat sesuai Area/i.test(trimmedLine);
                const isAreaData = /^(~?\s*AREA|Area)/i.test(trimmedLine);

                if (!isAreaTitle && !isAreaData) {
                    benefits.push(trimmedLine);
                }
            } else if (isNotedSection) {
                catatan.push(trimmedLine);
            }
        });

        // --- 3. Formatting Nama Produk ---
        // Membersihkan emoji
        const clean_nama_produk = nama_produk.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
        // Menambahkan spasi pada PascalCase, contoh: SuperJumbo -> Super Jumbo
        const formatted_nama = clean_nama_produk.replace(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, ' ');

        // --- 4. Menyusun Objek Final ---
        return {
            id_produk_sumber: id_produk,
            nama: formatted_nama,
            harga: harga_produk,
            stok: stok,
            benefits: benefits.filter(b => b), // Filter nilai kosong
            kuota: kuota,
            catatan: catatan.filter(c => c) // Filter nilai kosong
        };
    });
}


/**
 * Fungsi utama untuk fetch, format, dan menyimpan data
 */
async function fetchDataAndSave() {
    console.log("=============================================");
    console.log("Memulai Script Pengambilan & Penyimpanan Pricelist v3");
    console.log("=============================================");

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`[INFO] Folder '${outputDir}' berhasil dibuat.`);
    }
    
    const requests = Object.entries(API_CONFIG.categories).map(([name, categoryId]) => {
        const url = `https://openapi.bukaolshop.net/v1/app/produk`;
        const params = { token: API_CONFIG.token, id_kategori: categoryId, page: 1, total_data: 50 };
        console.log(`[INFO] Menyiapkan request untuk kategori: ${name}`);
        return axios.get(url, { params, headers: API_CONFIG.headers })
            .then(response => ({ name, data: response.data.data }))
            .catch(error => {
                console.error(`[GAGAL] Request untuk kategori '${name}' gagal: ${error.message}`);
                return { name, data: [] };
            });
    });

    const results = await Promise.all(requests);

    results.forEach(result => {
        const { name, data } = result;
        const formattedData = formatBukaolshopResponse(data);
        const fileName = `${name.replace('_', '-')}.json`;
        const filePath = path.join(outputDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(formattedData, null, 2), 'utf8');
        console.log(`[SUKSES] File '${fileName}' berhasil disimpan di folder output.`);
    });
    
    console.log("\n[SELESAI] Semua proses telah selesai.");
    console.log("=============================================");
}

fetchDataAndSave();
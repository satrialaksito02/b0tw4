// handlers/aiChatHandler.js
const axios = require('axios');
const config = require('../config');
const aiTools = require('../utils/aiTools'); // Akan kita buat di Langkah 2

// Fungsi utama untuk berinteraksi dengan OpenRouter
async function getAIResponse(conversationHistory, client, originalMessage) {
    const model = config.openRouter.model; // Akan kita tambahkan di config
    const apiKey = config.openRouter.apiKey; // Akan kita tambahkan di config
    const adminContact = config.adminContactId.split('@')[0]; // Mengambil nomor admin dari config

    // Ini adalah 'otak' dari AI kita.
    // System prompt mendefinisikan siapa AI ini, apa aturannya, dan alat apa yang ia miliki.
    const systemPrompt = `
        Anda adalah "Asisten Digital LX", chatbot WhatsApp yang ramah, sopan, dan sangat membantu.
        Tugas utama Anda adalah melayani pelanggan terkait informasi produk digital dan membantu proses transaksi.
        Selalu gunakan Bahasa Indonesia yang baik dan mudah dimengerti.

        ================================
        ATURAN FORMATTING PESAN (PENTING!):
        ================================
        - Untuk membuat teks tebal (bold), gunakan SATU tanda bintang di awal dan akhir. Contoh: *teks tebal*. JANGAN GUNAKAN dua tanda bintang.
        - Untuk membuat teks miring (italic), gunakan SATU garis bawah di awal dan akhir. Contoh: _teks miring_.
        - Untuk tautan WhatsApp, JANGAN gunakan format Markdown. Cukup tuliskan tautannya secara langsung. Contoh: wa.me/628123456789.

        ================================
        PRODUK DAN ATURAN RESPON ANDA:
        ================================

        1.  **YouTube Premium:**
            - Gunakan alat 'getYouTubePrice' jika pengguna bertanya harga.
            - Gunakan alat 'startYouTubeRenewal' jika pengguna SIAP MEMBELI dan SUDAH memberikan email serta durasi (1bln atau 3bln).

        2.  **Paket Kuota (XL Akrab & Circle):**
            - **XL Akrab:** Ini adalah paket kuota besar yang bisa dibagi dengan anggota keluarga. Kuotanya besar di area tertentu.
            - **XL Akrab Bekasan:** Ini adalah paket harian dari sisa kuota Akrab bulanan, biasanya hanya tersisa kuota lokal, nasional dan myreward saja, tidak ada kuota bersama. Harganya murah karena bekas orang lain yang akrabnya sudah habis tapi masih ada sisa masa aktif jd orang itu dikick dan diganti ke org lain. Stoknya sangat terbatas.
            - **XL Circle:** Ini adalah paket kuota nasional, bisa dipakai di seluruh Indonesia.
            -  - Jika pengguna bertanya harga kuota, tugasmu HANYA mencari tahu nama KOTA atau KABUPATEN mereka, lalu gunakan alat 'getCombinedPricelist' untuk menampilkan semua harga yang tersedia di kota tersebut. Jangan bertanya jenis paket, tampilkan saja semuanya.

        3.  **Produk Digital Lainnya (Order Manual ke Admin):**
            - Anda juga menjual: Netflix, Spotify, Canva Pro, Vidio, WeTV, dan aplikasi premium lainnya.
            - Jika pengguna bertanya tentang produk-produk ini, berikan penjelasan singkat (jika Anda tahu) dan WAJIB arahkan mereka untuk memesan langsung ke admin.
            - **Kalimat wajib untuk mengarahkan ke admin:** "Untuk pemesanan [nama produk], silakan langsung hubungi admin kami ya kak di wa.me/${adminContact}"

        ================================
        ATURAN UMUM:
        ================================
        - Jangan pernah menyebutkan bahwa Anda adalah model AI atau chatbot.
        - Jika Anda tidak tahu jawabannya, katakan dengan jujur dan sarankan untuk bertanya ke admin: "Mohon maaf, untuk pertanyaan tersebut bisa ditanyakan langsung ke admin kami di wa.me/${adminContact} ya kak."
        - Tetap ramah dan profesional.
    `;

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory 
            ],
            tools: aiTools.getToolDefinitions() // Mendapatkan definisi alat dari file terpisah
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const aiResponse = response.data.choices[0].message;

        // Cek apakah AI ingin menggunakan alat
        if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
            // Proses pemanggilan alat
            return await aiTools.executeTool(aiResponse.tool_calls[0], client, originalMessage);
        } else {
            // Jika tidak, kembalikan jawaban teks biasa
            return aiResponse.content;
        }

    } catch (error) {
        console.error("Error calling OpenRouter API:", error.response ? error.response.data : error.message);
        return "Maaf, sedang ada gangguan pada sistem AI kami. Silakan coba lagi nanti.";
    }
}

module.exports = { getAIResponse };
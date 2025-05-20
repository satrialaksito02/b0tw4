// config.js
module.exports = {
    commands: {
        GET_MY_ID: "chuaxz",
        ADD_SUPERADMIN: "tambahdewasuper",
        REMOVE_SUPERADMIN: "hapusdewasuper",
        SUBSCRIBE: "sewa",
        HIDETAG: "hidetag",
        ANTILINK: "antilink",
        SET_WELCOME: "setwelcome",
        WELCOME: "welcome",
        STATUS: "status",
        YOUTUBE: "youtube", // Perintah dasar untuk perpanjangan YouTube
        AUTOTEXT: "!automsg", // Perintah utama untuk automated text
    },
    messages: {
        privateAutoReply: () => "「 \`PESAN BOT LX DIGITAL\` 」\n\n🤖 Ini adalah balasan otomatis BOT.\n\n💎 *Perpanjang Akun Youtube Premium Anda:*\n👉 Ketik: `youtube <durasi> <email Anda>`\n      Contoh: ```youtube 3bln contoh@gmail.com```\n\n📞 *Butuh bantuan?* Hubungi Admin di wa.me/6287829708498\nTerima kasih!",
        getUserId: (userId) => `ID Pengguna Anda: ${userId}`,
        addSuperAdminSuccess: '✅ Super Admin baru berhasil ditambahkan.',
        addSuperAdminAlreadyExists: 'ℹ Pengguna ini sudah terdaftar sebagai Super Admin.',
        removeSuperAdminSuccess: '✅ Super Admin berhasil dihapus.',
        removeSuperAdminNotFound: 'ℹ Pengguna ini tidak terdaftar sebagai Super Admin.',
        superAdminOnly: '⛔ Maaf, perintah ini hanya dapat digunakan oleh Super Admin.',
        groupAdminOnly: '⛔ Perintah ini hanya dapat digunakan oleh Admin Grup.',
        groupNotSubscribed: '⚠️ Grup ini belum terdaftar dalam langganan. Silahkan hubungi admin untuk berlangganan.',
        antilinkEnabled: '✅ Fitur Anti-link telah diaktifkan.',
        antilinkDisabled: '✅ Fitur Anti-link telah dinonaktifkan.',
        antilinkUsage: 'ℹ Gunakan perintah: `antilink on` atau `antilink off`',
        welcomeEnabled: '✅ Pesan Sambutan telah diaktifkan.',
        welcomeDisabled: '✅ Pesan Sambutan telah dinonaktifkan.',
        welcomeUsage: 'ℹ Gunakan perintah: `welcome on` atau `welcome off`',
        setWelcomeSuccess: '✅ Pesan Sambutan berhasil diperbarui.',
        setWelcomeFormat: 'ℹ *Format Penggunaan:* `setwelcome <pesan>`\n\n*Contoh:*\n`setwelcome` Selamat datang @user di grup @grup! Jangan lupa untuk membaca deskripsi grup.\n\n*Variabel yang Tersedia:*\n- `@user`:  Menyebut nama pengguna yang baru bergabung.\n- `@grup`:  Menyebut nama grup.',
        groupStatus: (status) => {
            let message = "「 \`STATUS GRUP\` 」\n\n";
            message += `Berikut adalah status langganan untuk grup ini:\n`;
            message += `- Status Langganan: ${status.subscribed ? 'Aktif' : 'Tidak Aktif'}\n`;
            if (status.subscribed) {
                message += `- Tanggal Kedaluwarsa: ${new Date(status.expiryDate).toLocaleString()}\n`;
                message += `- Anti-link: ${status.antilinkEnabled ? 'Aktif' : 'Tidak Aktif'}\n`;
                message += `- Pesan Sambutan: ${status.welcomeEnabled ? 'Aktif' : 'Tidak Aktif'}\n`;
                if (status.welcomeEnabled) {
                    message += `- Teks Pesan Sambutan: ${status.welcomeMessage || 'Belum diatur'}\n`;
                }
            }
            return message;
        },
        youtubeFormatError: '⚠️ Format perintah tidak valid.  Gunakan: `youtube <durasi> <email>`\n\n*Contoh:*\n- youtube 1bln contoh@gmail.com\n- youtube 3bln contoh@gmail.com',
        youtubeDurationError: '⚠️ Durasi tidak valid.  Pilih `1bln` (1 bulan) atau `3bln` (3 bulan).',
        youtubeEmailNotFound: '⚠️ Alamat email tidak ditemukan.  Pastikan Anda memasukkan alamat email yang valid dan terdaftar.',
        youtubeSuccess: '✅ Permintaan perpanjangan Youtube Premium berhasil diproses.',
        youtubeError: '❌ Terjadi kesalahan saat memproses permintaan perpanjangan Youtube Premium.',
        subscriptionExpiryNotification: (expiryDate) => `「 \`PENGINGAT MASA AKTIF\` 」\n\n🔔 Masa berlangganan grup ini akan berakhir besok pada ${expiryDate.toLocaleString()}.  Segera perpanjang untuk tetap menikmati seluruh fitur!`,
        antilinkFirstWarning: (author) => `「 \`PERINGATAN ANTI-LINK\` 」\n\n@${author.split('@')[0]}, Anda terdeteksi mengirimkan tautan.  \n\n⚠️ Ini adalah peringatan pertama.  Jika Anda mengirim tautan lagi, Anda akan dikeluarkan dari grup.`,
        antilinkKickWarning: (author) => `「 \`PERINGATAN ANTI-LINK\` 」\n\n@${author.split('@')[0]}, Anda telah diperingatkan sebelumnya.  \n\n❌ Karena Anda mengirim tautan lagi, Anda akan dikeluarkan dari grup.`,
        processingError: '❌ Terjadi kesalahan saat memproses pesan.  Silakan coba lagi.',
        noMedia: 'ℹ Sertakan gambar atau video dalam pesan Anda.',
        generalError: '❌ Terjadi kesalahan.',
        messageSent: "✅ Pesan berhasil terkirim.",
        subscribeNotInGroup: "⚠️ Perintah `sewa` hanya dapat digunakan di dalam grup obrolan.",
        subscribeFormatError: "⚠️ Format perintah tidak valid. Gunakan: `sewa <durasi (hari)>`\n\n*Contoh:* `sewa 30`",
        subscribeDurationError: "⚠️ Durasi sewa harus berupa angka dan lebih dari 0 (dalam satuan hari).",
        subscribeSuccess: (groupId, expiryDate) => `✅ Langganan grup berhasil diperbarui! Masa aktif berlaku hingga: ${new Date(expiryDate).toLocaleString()}`,
        subscribeError: "❌ Terjadi kesalahan saat memperbarui langganan. Silakan coba lagi.",
        autotextCommandOnlyForPC: 'ℹ Perintah `!automsg` hanya dapat digunakan melalui pesan pribadi (PC) dengan bot.',
        autotextHelp: () => "「 `AUTO MSG HELPER` 」\n\n" +
                          "Gunakan perintah berikut untuk mengelola pesan otomatis:\n\n" +
                          "`!automsg tambah <nama_jadwal>` - Membuat jadwal baru.\n" +
                          "`!automsg addmsg <nama_jadwal>` - Menambah pesan ke jadwal yang ada.\n" +
                          "`!automsg hapuspesan <nama_jadwal> <nomor_pesan>` - Menghapus pesan tertentu dari jadwal.\n" + // <-- Perintah baru
                          "`!automsg list` - Melihat semua jadwal.\n" +
                          "`!automsg hapus <nama_jadwal>` - Menghapus jadwal.\n" +
                          "`!automsg detail <nama_jadwal>` - Melihat detail jadwal.\n" +
                          "`!automsg <on|off> <nama_jadwal>` - Mengaktifkan/menonaktifkan jadwal.",
        autotextChooseGroup: (groupsList) => `Silakan pilih grup target untuk jadwal ini:\n${groupsList}\nKetik nomor grup:`,
        autotextNoSubscribedGroups: 'ℹ Tidak ada grup berlangganan yang ditemukan untuk dijadikan target.',
        autotextInvalidGroupSelection: '⚠️ Pilihan grup tidak valid.',
        autotextEnterMessage: (scheduleName, messageNumber) => `Masukkan teks untuk pesan ke-${messageNumber} pada jadwal \`${scheduleName}\`:`,
        autotextEnterInterval: (messageNumber) => `Atur interval pengiriman untuk pesan ke-${messageNumber} (contoh: \`30m\` untuk 30 menit, \`2h\` untuk 2 jam, \`1d\` untuk 1 hari):`,
        autotextInvalidIntervalFormat: '⚠️ Format interval tidak valid. Gunakan angka diikuti `m` (menit), `h` (jam), atau `d` (hari). Contoh: `30m`, `1h`, `2d`.',
        autotextAddMoreMessages: (scheduleName) => `Apakah ada pesan lain untuk jadwal \`${scheduleName}\`? (ketik \`ya\` atau \`tidak\`)`,
        autotextScheduleSaved: (scheduleName, groupName) => `✅ Jadwal automated text \`${scheduleName}\` untuk grup \`${groupName}\` berhasil disimpan.`,
        autotextScheduleNotFound: (scheduleName) => `ℹ Jadwal dengan nama \`${scheduleName}\` tidak ditemukan.`,
        autotextScheduleDeleted: (scheduleName) => `✅ Jadwal \`${scheduleName}\` berhasil dihapus.`,
        autotextScheduleEnabled: (scheduleName, status) => `✅ Jadwal \`${scheduleName}\` telah ${status ? 'diaktifkan' : 'dinonaktifkan'}.`,
        autotextListHeader: '🗓️ Daftar Jadwal Automated Text:\n\n',
        autotextDetailHeader: (scheduleName) => `📄 Detail Jadwal: \`${scheduleName}\`\n`,
        autotextNoSchedules: 'ℹ Belum ada jadwal automated text yang dibuat.',
        autotextEnterMessageForExisting: (scheduleName, messageNumber) => `Menambahkan pesan ke jadwal \`${scheduleName}\`.\nMasukkan teks untuk pesan ke-${messageNumber}:`,
        autotextMessageAddedToSchedule: (scheduleName) => `✅ Pesan baru berhasil ditambahkan ke jadwal \`${scheduleName}\`.`,
        autotextAddingMessageCancelled: (scheduleName) => `ℹ Penambahan pesan ke jadwal \`${scheduleName}\` dibatalkan.`,
        autotextDeleteMessageFormatError: (command) => `⚠️ Format perintah salah. Gunakan: \`${command} hapuspesan <nama_jadwal> <nomor_pesan>\`\nContoh: \`${command} hapuspesan PromoPagi 2\``,
        autotextMessageNotFoundOrInvalidNumber: (messageNumber) => `ℹ️ Pesan dengan nomor ${messageNumber} tidak ditemukan atau nomor tidak valid. Gunakan \`!automsg detail <nama_jadwal>\` untuk melihat daftar pesan.`,
        autotextMessageDeleted: (messageNumber, scheduleName) => `✅ Pesan ke-${messageNumber} berhasil dihapus dari jadwal \`${scheduleName}\`.`,
        autotextScheduleEmptyAfterDeletion: (scheduleName) => `ℹ️ Jadwal \`${scheduleName}\` sekarang kosong setelah pesan dihapus. Anda mungkin ingin menambahkan pesan baru atau menghapus jadwal ini.`,
    },
    defaultSuperAdmins: ["62895410219991@c.us", "xxxxxxxx-yyyyyyyy@c.us"],
    mongoURI: 'mongodb+srv://adilaksito:i2sQLt877qd56Hip@b0tw4.s7vlwih.mongodb.net/?retryWrites=true&w=majority&appName=b0tw4',
    workingHours: {
        startHour: 6, // Jam mulai (format 24 jam, contoh: 08:00)
        endHour: 23,   // Jam selesai (format 24 jam, contoh: 17:00)
        // Hari aktif: 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
        activeDays: [0, 1, 2, 3, 4, 5, 6], // Senin sampai Jumat
        timeZone: 'Asia/Jakarta' // Tambahkan timezone
    },
    automatedMessageCheckInterval: 300000, // Interval pengecekan scheduler (ms), contoh: 1 menit
};

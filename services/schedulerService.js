// services/schedulerService.js
const AutomatedMessage = require('../models/AutomatedMessage');
const { isGroupSubscribed } = require('../utils/groupUtils');
const config = require('../config');

let schedulerIntervalId = null;
let whatsappClient = null;

async function checkAndSendMessages() {
    if (!whatsappClient) {
        console.warn("Scheduler: WhatsApp client not available.");
        return;
    }
    console.log("Scheduler: Checking for automated messages to send...");

    try {
        const activeSchedules = await AutomatedMessage.find({ isEnabled: true });

        for (const schedule of activeSchedules) {
            // Periksa apakah grup target masih berlangganan
            const groupStillSubscribed = await isGroupSubscribed(schedule.targetGroupId);
            if (!groupStillSubscribed) {
                console.log(`Scheduler: Group ${schedule.targetGroupName} (${schedule.targetGroupId}) for schedule ${schedule.scheduleName} is no longer subscribed. Skipping.`);
                // Opsional: nonaktifkan jadwal ini
                // schedule.isEnabled = false;
                // await schedule.save();
                continue;
            }

            if (!schedule.messages || schedule.messages.length === 0) {
                console.warn(`Scheduler: Schedule ${schedule.scheduleName} has no messages. Skipping.`);
                continue;
            }

            const messageToSend = schedule.messages[schedule.currentMessageIndex];
            if (!messageToSend) {
                console.warn(`Scheduler: Invalid currentMessageIndex for schedule ${schedule.scheduleName}. Resetting.`);
                schedule.currentMessageIndex = 0;
                await schedule.save();
                continue;
            }

            const intervalMillis = messageToSend.intervalMinutes * 60 * 1000;
            const now = new Date();
            let shouldSend = false;

            if (!schedule.lastSentGlobal) { // Jika belum pernah kirim sama sekali (jadwal baru)
                shouldSend = true;
            } else {
                const nextScheduledTime = new Date(schedule.lastSentGlobal.getTime() + intervalMillis);
                if (now >= nextScheduledTime) {
                    shouldSend = true;
                }
            }

            if (shouldSend) {
                try {
                    console.log(`Scheduler: Sending message "${messageToSend.text}" from schedule "${schedule.scheduleName}" to group "${schedule.targetGroupName}".`);
                    await whatsappClient.sendMessage(schedule.targetGroupId, messageToSend.text);

                    // Update schedule
                    schedule.lastSentGlobal = new Date();
                    schedule.currentMessageIndex = (schedule.currentMessageIndex + 1) % schedule.messages.length; // Berpindah ke pesan berikutnya, kembali ke 0 jika sudah terakhir
                    await schedule.save();
                    console.log(`Scheduler: Message sent and schedule ${schedule.scheduleName} updated.`);

                } catch (sendError) {
                    console.error(`Scheduler: Error sending message for schedule ${schedule.scheduleName} to ${schedule.targetGroupId}:`, sendError);
                    // Pertimbangkan untuk menonaktifkan jadwal jika gagal mengirim beberapa kali
                }
            }
        }
    } catch (error) {
        console.error("Scheduler: Error during message check:", error);
    }
}

function initializeScheduler(client) {
    if (schedulerIntervalId) {
        console.warn("Scheduler: Already initialized.");
        return;
    }
    whatsappClient = client;
    // Jalankan pengecekan pertama kali segera (atau setelah jeda singkat)
    setTimeout(checkAndSendMessages, 5000); // Jeda 5 detik setelah bot ready
    // Atur interval pengecekan
    schedulerIntervalId = setInterval(checkAndSendMessages, config.automatedMessageCheckInterval); // Ambil dari config
    console.log(`Scheduler: Initialized with interval ${config.automatedMessageCheckInterval / 1000} seconds.`);
}

function stopScheduler() {
    if (schedulerIntervalId) {
        clearInterval(schedulerIntervalId);
        schedulerIntervalId = null;
        whatsappClient = null; // Hapus referensi client
        console.log("Scheduler: Stopped.");
    }
}

module.exports = { initializeScheduler, stopScheduler, checkAndSendMessages };
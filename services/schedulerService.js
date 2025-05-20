// services/schedulerService.js
const AutomatedMessage = require('../models/AutomatedMessage');
const { isGroupSubscribed } = require('../utils/groupUtils');
const config = require('../config');

let schedulerIntervalId = null;
let whatsappClient = null;

function isWithinWorkingHours() {
    const now = new Date();
    const options = { timeZone: config.workingHours.timeZone, hour12: false };
    const currentHour = parseInt(now.toLocaleTimeString('en-US', { ...options, hour: '2-digit' }));
    const currentDay = now.getDay(); // 0 (Minggu) - 6 (Sabtu)

    const { startHour, endHour, activeDays } = config.workingHours;

    if (!activeDays.includes(currentDay)) {
        return false; // Tidak dalam hari kerja
    }

    if (currentHour >= startHour && currentHour < endHour) {
        return true; // Dalam jam kerja
    }
    return false; // Di luar jam kerja
}

async function checkAndSendMessages() {
    if (!whatsappClient) {
        console.warn("Scheduler: WhatsApp client not available.");
        return;
    }

    if (!isWithinWorkingHours()) {
        console.log("Scheduler: Currently outside working hours. Skipping automated messages.");
        return;
    }

    console.log("Scheduler: Checking for automated messages to send (within working hours)...");

    try {
        const activeSchedules = await AutomatedMessage.find({ isEnabled: true });

        for (const schedule of activeSchedules) {
            // Periksa apakah grup target masih berlangganan
            const groupStillSubscribed = await isGroupSubscribed(schedule.targetGroupId);
            if (!groupStillSubscribed) {
                console.log(`Scheduler: Group <span class="math-inline">\{schedule\.targetGroupName\} \(</span>{schedule.targetGroupId}) for schedule ${schedule.scheduleName} is no longer subscribed. Skipping.`);
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

            if (!schedule.lastSentGlobal) {
                shouldSend = true;
            } else {
                const nextScheduledTime = new Date(schedule.lastSentGlobal.getTime() + intervalMillis);
                if (now >= nextScheduledTime) {
                    shouldSend = true;
                }
            }

            if (shouldSend) {
                try {
                    console.log(`Scheduler: Sending message "<span class="math-inline">\{messageToSend\.text\}" from schedule "</span>{schedule.scheduleName}" to group "${schedule.targetGroupName}".`);
                    await whatsappClient.sendMessage(schedule.targetGroupId, messageToSend.text);

                    schedule.lastSentGlobal = new Date();
                    schedule.currentMessageIndex = (schedule.currentMessageIndex + 1) % schedule.messages.length;
                    await schedule.save();
                    console.log(`Scheduler: Message sent and schedule ${schedule.scheduleName} updated.`);

                } catch (sendError) {
                    console.error(`Scheduler: Error sending message for schedule ${schedule.scheduleName} to ${schedule.targetGroupId}:`, sendError);
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
    setTimeout(checkAndSendMessages, 5000);
    schedulerIntervalId = setInterval(checkAndSendMessages, config.automatedMessageCheckInterval);
    console.log(`Scheduler: Initialized with interval ${config.automatedMessageCheckInterval / 1000} seconds.`);
}

function stopScheduler() {
    if (schedulerIntervalId) {
        clearInterval(schedulerIntervalId);
        schedulerIntervalId = null;
        whatsappClient = null;
        console.log("Scheduler: Stopped.");
    }
}

module.exports = { initializeScheduler, stopScheduler, checkAndSendMessages };
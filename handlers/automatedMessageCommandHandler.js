// handlers/automatedMessageCommandHandler.js
const config = require('../config');
const { isSuperAdmin } = require('../utils/adminUtils');
const Group = require('../models/Group');
const AutomatedMessage = require('../models/AutomatedMessage');

const userStates = {};

async function handleAutomatedMessageCommand(client, message, senderId) {
    if (!(await isSuperAdmin(senderId))) {
        return message.reply(config.messages.superAdminOnly);
    }

    const parts = message.body.trim().split(" ");
    const subCommand = parts[1] ? parts[1].toLowerCase() : null;
    const argument = parts.slice(2).join(" "); // Ini akan menjadi scheduleName untuk banyak sub-perintah
    const userInput = message.body.trim();

    const currentState = userStates[senderId];

    if (currentState && userInput.toLowerCase() === 'batal') {
        const scheduleName = currentState.scheduleName;
        delete userStates[senderId];
        if (currentState.currentCommand === 'addmsg') {
            return message.reply(config.messages.autotextAddingMessageCancelled(scheduleName || "yang dipilih"));
        }
        return message.reply("Pembuatan/konfigurasi jadwal dibatalkan.");
    }

    if (currentState) {
        await handleOngoingConfiguration(client, message, senderId, currentState, userInput);
    } else {
        switch (subCommand) {
            case 'tambah':
                await startAddNewSchedule(client, message, senderId, argument);
                break;
            case 'addmsg': // Sub-perintah baru
                await startAddMessageToExistingSchedule(client, message, senderId, argument);
                break;
            case 'list':
                await listSchedules(client, message, senderId);
                break;
            case 'hapus':
                await deleteSchedule(client, message, senderId, argument);
                break;
            case 'detail':
                await detailSchedule(client, message, senderId, argument);
                break;
            case 'on':
            case 'off':
                await toggleScheduleStatus(client, message, senderId, argument, subCommand === 'on');
                break;
            default:
                message.reply(config.messages.autotextHelp());
        }
    }
}

async function startAddMessageToExistingSchedule(client, message, senderId, scheduleName) {
    if (!scheduleName) {
        return message.reply("Mohon sebutkan nama jadwal yang ingin ditambahkan pesannya. Contoh: `!automsg addmsg PromoPagi`");
    }

    try {
        const schedule = await AutomatedMessage.findOne({ scheduleName: scheduleName, creatorId: senderId });
        if (!schedule) {
            return message.reply(config.messages.autotextScheduleNotFound(scheduleName) + " atau Anda tidak memiliki izin untuk mengubahnya.");
        }

        userStates[senderId] = {
            currentCommand: 'addmsg',
            currentStep: 'awaiting_message_text_for_existing',
            scheduleName: schedule.scheduleName, // Gunakan nama dari DB untuk konsistensi casing
            scheduleId: schedule._id, // Simpan ID untuk update
            messageBuffer: {},
        };
        // messageNumber akan menjadi jumlah pesan saat ini + 1
        const messageNumber = schedule.messages.length + 1;
        message.reply(config.messages.autotextEnterMessageForExisting(schedule.scheduleName, messageNumber) + "\nKetik `batal` untuk membatalkan.");

    } catch (error) {
        console.error(`Error finding schedule ${scheduleName} for addmsg:`, error);
        message.reply(config.messages.processingError);
    }
}

async function startAddNewSchedule(client, message, senderId, scheduleNameFromCommand) {
    // Jika scheduleName sudah diberikan dari perintah awal (misal: !automsg tambah PromoPagi)
    if (scheduleNameFromCommand) {
        const existingSchedule = await AutomatedMessage.findOne({ scheduleName: scheduleNameFromCommand });
        if (existingSchedule) {
            return message.reply(`Jadwal dengan nama \`${scheduleNameFromCommand}\` sudah ada. Silakan pilih nama lain atau gunakan perintah \`!automsg tambah\` tanpa nama untuk memulai.`);
        }
        userStates[senderId] = {
            currentCommand: 'tambah',
            currentStep: 'awaiting_group_selection', // Langsung ke pemilihan grup
            scheduleName: scheduleNameFromCommand,
            messages: [],
            messageBuffer: {},
        };
        // Lanjutkan ke pemilihan grup
        return requestGroupSelection(client, message, senderId, userStates[senderId]);
    }

    // Jika !automsg tambah (tanpa argumen nama jadwal)
    userStates[senderId] = {
        currentCommand: 'tambah',
        currentStep: 'awaiting_schedule_name',
        messages: [],
        messageBuffer: {},
    };
    return message.reply("Silakan masukkan nama untuk jadwal baru ini (contoh: `PromoPagi`). Ketik `batal` untuk membatalkan.");
}


async function requestGroupSelection(client, message, senderId, currentState) {
    try {
        const subscribedGroups = await Group.find({ expiration: { $gt: new Date() } }).select('groupId name').lean();
        if (!subscribedGroups || subscribedGroups.length === 0) {
            delete userStates[senderId];
            return message.reply(config.messages.autotextNoSubscribedGroups);
        }
        currentState.availableGroups = subscribedGroups;
        let groupListText = "";
        subscribedGroups.forEach((group, index) => {
            groupListText += `${index + 1}. ${group.name} (${group.groupId})\n`;
        });
        message.reply(config.messages.autotextChooseGroup(groupListText) + "\nKetik `batal` untuk membatalkan.");
    } catch (error) {
        console.error("Error fetching subscribed groups:", error);
        delete userStates[senderId];
        message.reply(config.messages.processingError);
    }
}

async function handleOngoingConfiguration(client, message, senderId, currentState, userInput) {
    // Pengecekan 'batal' sudah dilakukan di handleAutomatedMessageCommand,
    // jadi jika sampai sini, userInput bukan 'batal', kecuali di step terakhir.

    switch (currentState.currentStep) {
        case 'awaiting_schedule_name':
            if (!userInput) { // Ini seharusnya tidak terjadi jika 'batal' sudah ditangani
                return message.reply("Nama jadwal tidak boleh kosong. Mohon masukkan nama jadwal atau ketik `batal`.");
            }
            const existingSchedule = await AutomatedMessage.findOne({ scheduleName: userInput });
            if (existingSchedule) {
                return message.reply(`Jadwal dengan nama \`${userInput}\` sudah ada. Silakan pilih nama lain atau ketik \`batal\`.`);
            }
            currentState.scheduleName = userInput;
            currentState.currentStep = 'awaiting_group_selection';
            await requestGroupSelection(client, message, senderId, currentState);
            break;

        case 'awaiting_group_selection':
            const selectionIndex = parseInt(userInput, 10) - 1;
            if (isNaN(selectionIndex) || selectionIndex < 0 || selectionIndex >= currentState.availableGroups.length) {
                return message.reply(config.messages.autotextInvalidGroupSelection + " Mohon pilih nomor yang valid atau ketik `batal`.");
            }
            const selectedGroup = currentState.availableGroups[selectionIndex];
            currentState.targetGroupId = selectedGroup.groupId;
            currentState.targetGroupName = selectedGroup.name;
            currentState.currentStep = 'awaiting_message_text';
            currentState.messageBuffer = {};
            message.reply(config.messages.autotextEnterMessage(currentState.scheduleName, currentState.messages.length + 1) + "\nKetik `batal` untuk membatalkan.");
            break;

        case 'awaiting_message_text':
            if (!userInput) { // Ini seharusnya tidak terjadi jika 'batal' sudah ditangani
                return message.reply("Teks pesan tidak boleh kosong. Mohon masukkan teks pesan atau ketik `batal`.");
            }
            currentState.messageBuffer.text = userInput;
            currentState.currentStep = 'awaiting_interval';
            message.reply(config.messages.autotextEnterInterval(currentState.messages.length + 1) + "\nKetik `batal` untuk membatalkan.");
            break;

        case 'awaiting_interval':
            const intervalMatch = userInput.match(/^(\d+)(m|h|d)$/i);
            if (!intervalMatch) {
                return message.reply(config.messages.autotextInvalidIntervalFormat + " Atau ketik `batal`.");
            }
            let intervalMinutes = parseInt(intervalMatch[1], 10);
            const unit = intervalMatch[2].toLowerCase();

            if (unit === 'h') intervalMinutes *= 60;
            else if (unit === 'd') intervalMinutes *= 60 * 24;

            if (intervalMinutes < 1) {
                 return message.reply("Interval minimal adalah 1 menit. Atau ketik `batal`.");
            }

            currentState.messageBuffer.intervalMinutes = intervalMinutes;
            currentState.messages.push({ ...currentState.messageBuffer });
            currentState.messageBuffer = {};
            currentState.currentStep = 'awaiting_add_more';
            message.reply(config.messages.autotextAddMoreMessages(currentState.scheduleName) + "\nKetik `batal` untuk membatalkan pembuatan jadwal ini dan menghapus pesan yang sudah ditambahkan.");
            break;

        case 'awaiting_add_more':
            // Pengecekan 'batal' di awal fungsi handleAutomatedMessageCommand akan menangani ini
            // sebelum switch case ini jika inputnya adalah 'batal'.
            // Jika sampai sini, userInput bukan 'batal'.
            if (userInput.toLowerCase() === 'ya') {
                currentState.currentStep = 'awaiting_message_text';
                currentState.messageBuffer = {};
                message.reply(config.messages.autotextEnterMessage(currentState.scheduleName, currentState.messages.length + 1) + "\nKetik `batal` untuk membatalkan.");
            } else if (userInput.toLowerCase() === 'tidak') {
                if (currentState.messages.length === 0) {
                    message.reply("Anda belum menambahkan pesan apapun. Jadwal tidak disimpan. Ketik `ya` untuk menambahkan pesan, atau `batal` untuk keluar.");
                    // Biarkan state tetap agar pengguna bisa 'ya' atau 'batal'
                    return;
                }
                try {
                    const newSchedule = new AutomatedMessage({
                        scheduleName: currentState.scheduleName,
                        targetGroupId: currentState.targetGroupId,
                        targetGroupName: currentState.targetGroupName,
                        creatorId: senderId,
                        messages: currentState.messages,
                        isEnabled: true,
                        currentMessageIndex: 0,
                        lastSentGlobal: null,
                    });
                    await newSchedule.save();
                    message.reply(config.messages.autotextScheduleSaved(currentState.scheduleName, currentState.targetGroupName));
                } catch (dbError) {
                    console.error("Error saving schedule to DB:", dbError);
                    message.reply(config.messages.processingError + " (Gagal menyimpan jadwal)");
                }
                delete userStates[senderId]; // Hapus state setelah selesai
            } else {
                // Jika input bukan 'ya', 'tidak', atau 'batal' (batal sudah ditangani di atas)
                message.reply("Mohon jawab dengan `ya` atau `tidak`. Atau ketik `batal` untuk membatalkan pembuatan jadwal ini.");
            }
            break;

        case 'awaiting_message_text_for_existing':
            if (!userInput) {
                return message.reply("Teks pesan tidak boleh kosong. Mohon masukkan teks pesan atau ketik `batal`.");
            }
            currentState.messageBuffer.text = userInput;
            currentState.currentStep = 'awaiting_interval_for_existing';
            // Nomor pesan di sini tidak terlalu krusial karena hanya menambah satu per satu
            message.reply(config.messages.autotextEnterInterval("baru") + "\nKetik `batal` untuk membatalkan.");
            break;

        case 'awaiting_interval_for_existing':
            const intervalMatchExisting = userInput.match(/^(\d+)(m|h|d)$/i);
            if (!intervalMatchExisting) {
                return message.reply(config.messages.autotextInvalidIntervalFormat + " Atau ketik `batal`.");
            }
            let intervalMinutesExisting = parseInt(intervalMatchExisting[1], 10);
            const unitExisting = intervalMatchExisting[2].toLowerCase();

            if (unitExisting === 'h') intervalMinutesExisting *= 60;
            else if (unitExisting === 'd') intervalMinutesExisting *= 60 * 24;
            
            if (intervalMinutesExisting < 1) {
                 return message.reply("Interval minimal adalah 1 menit. Atau ketik `batal`.");
            }

            currentState.messageBuffer.intervalMinutes = intervalMinutesExisting;
            // Tambahkan pesan ke jadwal yang ada di database
            try {
                const scheduleToUpdate = await AutomatedMessage.findById(currentState.scheduleId);
                if (!scheduleToUpdate) {
                    message.reply(config.messages.autotextScheduleNotFound(currentState.scheduleName) + " Mungkin telah dihapus.");
                    delete userStates[senderId];
                    return;
                }
                scheduleToUpdate.messages.push({
                    text: currentState.messageBuffer.text,
                    intervalMinutes: currentState.messageBuffer.intervalMinutes,
                });
                scheduleToUpdate.updatedAt = new Date(); // Update manual jika skema tidak otomatis (atau gunakan $set)
                await scheduleToUpdate.save();
                message.reply(config.messages.autotextMessageAddedToSchedule(currentState.scheduleName));
            } catch (dbError) {
                console.error("Error adding message to existing schedule:", dbError);
                message.reply(config.messages.processingError + " (Gagal menambah pesan)");
            }
            delete userStates[senderId]; // Hapus state setelah selesai
            break;
    }
}

// Fungsi listSchedules, deleteSchedule, detailSchedule, toggleScheduleStatus tetap sama
async function listSchedules(client, message, senderId) {
    try {
        const schedules = await AutomatedMessage.find({ creatorId: senderId }).select('scheduleName targetGroupName isEnabled messages').lean();
        if (!schedules || schedules.length === 0) {
            return message.reply(config.messages.autotextNoSchedules);
        }
        let responseText = config.messages.autotextListHeader;
        schedules.forEach(sch => {
            responseText += `*Nama:* \`${sch.scheduleName}\`\n`;
            responseText += `  Grup Target: ${sch.targetGroupName}\n`;
            responseText += `  Status: ${sch.isEnabled ? 'Aktif' : 'Nonaktif'}\n`;
            responseText += `  Jumlah Pesan: ${sch.messages.length}\n---\n`;
        });
        message.reply(responseText);
    } catch (error) {
        console.error("Error listing schedules:", error);
        message.reply(config.messages.processingError);
    }
}

async function deleteSchedule(client, message, senderId, scheduleName) {
    if (!scheduleName) {
        return message.reply("Mohon sebutkan nama jadwal yang ingin dihapus. Contoh: `!automsg hapus PromoPagi`");
    }
    try {
        const result = await AutomatedMessage.deleteOne({ scheduleName: scheduleName, creatorId: senderId });
        if (result.deletedCount > 0) {
            message.reply(config.messages.autotextScheduleDeleted(scheduleName));
        } else {
            message.reply(config.messages.autotextScheduleNotFound(scheduleName) + " atau Anda tidak memiliki izin.");
        }
    } catch (error) {
        console.error("Error deleting schedule:", error);
        message.reply(config.messages.processingError);
    }
}

async function detailSchedule(client, message, senderId, scheduleName) {
    if (!scheduleName) {
        return message.reply("Mohon sebutkan nama jadwal yang ingin dilihat detailnya. Contoh: `!automsg detail PromoPagi`");
    }
    try {
        const schedule = await AutomatedMessage.findOne({ scheduleName: scheduleName, creatorId: senderId }).lean();
        if (!schedule) {
            return message.reply(config.messages.autotextScheduleNotFound(scheduleName) + " atau Anda tidak memiliki izin.");
        }
        let responseText = config.messages.autotextDetailHeader(schedule.scheduleName);
        responseText += `Grup Target: ${schedule.targetGroupName} (${schedule.targetGroupId})\n`;
        responseText += `Status: ${schedule.isEnabled ? 'Aktif' : 'Nonaktif'}\n`;
        responseText += `Indeks Pesan Berikutnya: ${schedule.currentMessageIndex + 1}\n`;
        responseText += `Terakhir Dikirim (Global): ${schedule.lastSentGlobal ? new Date(schedule.lastSentGlobal).toLocaleString('id-ID') : 'Belum pernah'}\n`;
        responseText += `\nPesan-pesan:\n`;
        schedule.messages.forEach((msg, index) => {
            responseText += `${index + 1}. "${msg.text}" (Interval: ${msg.intervalMinutes} menit)\n`;
        });
        message.reply(responseText);
    } catch (error) {
        console.error("Error fetching schedule detail:", error);
        message.reply(config.messages.processingError);
    }
}

async function toggleScheduleStatus(client, message, senderId, scheduleName, enable) {
     if (!scheduleName) {
        return message.reply(`Mohon sebutkan nama jadwal. Contoh: \`!automsg ${enable ? 'on' : 'off'} PromoPagi\``);
    }
    try {
        const schedule = await AutomatedMessage.findOneAndUpdate(
            { scheduleName: scheduleName, creatorId: senderId },
            { isEnabled: enable, updatedAt: new Date() },
            { new: true }
        );
        if (schedule) {
            message.reply(config.messages.autotextScheduleEnabled(scheduleName, enable));
        } else {
            message.reply(config.messages.autotextScheduleNotFound(scheduleName) + " atau Anda tidak memiliki izin.");
        }
    } catch (error) {
        console.error("Error toggling schedule status:", error);
        message.reply(config.messages.processingError);
    }
}

module.exports = { handleAutomatedMessageCommand, userStates };
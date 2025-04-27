// handlers/groupCommandHandler.js
const { isGroupAdmin } = require('../utils/adminUtils.js');
const {
    isGroupSubscribed,
    setAntilink,
    setWelcomeEnabled,
    setWelcomeMessage,
    getGroupSubscriptionStatus,
    isAntilinkEnabled
} = require('../utils/groupUtils.js');
const config = require('../config.js');
const antispamService = require('../utils/antispam.js');
const { MessageMedia } = require('whatsapp-web.js');

async function handleGroupCommand(client, message, chat) {
    const groupId = chat.id._serialized;
    const senderId = message.author;
    const isAdmin = await isGroupAdmin(chat, senderId);
    const messageParts = message.body.split(" ");
    const command = messageParts[0];
    const arg = messageParts.slice(1).join(" ");
    const linkRegex = /https?:\/\/[^\s]+|(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/\S*)?/gi;

    switch (command) {
        case config.commands.HIDETAG:
            if (!isAdmin) {
                message.reply(config.messages.groupAdminOnly);
                return;
            }
            if (!isGroupSubscribed(groupId)) {
                message.reply(config.messages.groupNotSubscribed);
                return;
            }

            try {
                // Use chat.participants directly, which is already an array of participant objects.
                const participants = chat.participants;
                const mentions = participants.map(p => p.id._serialized); // Extract serialized IDs.
                let text = arg;
                const messageOptions = {
                  mentions: mentions
                };

                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    if (media) {
                      messageOptions.caption = text;
                      messageOptions.attachment = media;  // Use 'attachment' key.
                      await chat.sendMessage(media, messageOptions);
                    } else {
                        message.reply(config.messages.noMedia);
                    }
                } else {
                    if (!text)
                    {
                      text = "";
                    }
                    await chat.sendMessage(text, messageOptions);
                }
            } catch (error) {
                console.error('Error sending hidetag message:', error);
                message.reply(config.messages.generalError);
            }
            break;


        case config.commands.ANTILINK:
            if (isAdmin) {
                if (!isGroupSubscribed(groupId)) {
                    message.reply(config.messages.groupNotSubscribed);
                    return;
                }
                const enabled = arg === 'on';
                setAntilink(groupId, enabled);
                message.reply(enabled ? config.messages.antilinkEnabled : config.messages.antilinkDisabled);
            } else {
                message.reply(config.messages.groupAdminOnly);
            }
            break;

        case config.commands.WELCOME:
            if (isAdmin) {
                if (!isGroupSubscribed(groupId)) {
                    message.reply(config.messages.groupNotSubscribed);
                    return;
                }
                const welcomeEnabled = arg === 'on';
                setWelcomeEnabled(groupId, welcomeEnabled);
                 message.reply(welcomeEnabled ? config.messages.welcomeEnabled : config.messages.welcomeDisabled);

            } else {
                message.reply(config.messages.groupAdminOnly);
            }
            break;

        case config.commands.SET_WELCOME:
            if (isAdmin) {
                if (!isGroupSubscribed(groupId)) {
                    message.reply(config.messages.groupNotSubscribed);
                    return;
                }
                const newWelcomeMessage = arg.trim();
                if (newWelcomeMessage) {
                    setWelcomeMessage(groupId, newWelcomeMessage);
                    message.reply(config.messages.setWelcomeSuccess);
                } else {
                    message.reply(config.messages.setWelcomeFormat);
                }
            } else {
                message.reply(config.messages.groupAdminOnly);
            }
            break;

        case config.commands.STATUS:
                const status = getGroupSubscriptionStatus(groupId);
                 message.reply(config.messages.groupStatus(status));
            break;

      default:
           if (isGroupSubscribed(groupId) && isAntilinkEnabled(groupId)  && linkRegex.test(message.body) && !isAdmin) {
                const violationCount = antispamService.addViolation(groupId, senderId);
                await message.delete(true);

                if (violationCount === 1) {
                    await chat.sendMessage(config.messages.antilinkFirstWarning(message.author), { mentions: [message.author] });
                } else if (violationCount > 1) {

                    await chat.sendMessage(config.messages.antilinkKickWarning(message.author), { mentions: [message.author] });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await chat.removeParticipants([message.author]);

                    antispamService.resetViolation(groupId, senderId);

                }
            }

    }
}

module.exports = { handleGroupCommand };


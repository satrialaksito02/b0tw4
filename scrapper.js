const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
    }
});

client.initialize();

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});


client.on('ready', async () => {
    console.log('Client is ready!');

    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);

        if (groups.length === 0) {
            console.log('No groups found.');
            return;
        }

        console.log('Groups:');
        groups.forEach(group => {
           console.log(`- Name: ${group.name}, Group ID: ${group.id._serialized}`);
        });


    } catch (error) {
        console.error('Error getting groups:', error);
    } finally {
        // Disconnect the client gracefully (optional, but good practice)
        // Leaving this commented out will keep the client connected and
        // listening for new messages, which is probably not what you want
        // for a one-off scraping task.  Uncomment it if you want to disconnect.
        // await client.destroy();
        // console.log('Client disconnected.');
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected!', reason);
});


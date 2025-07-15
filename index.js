const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { google } = require('googleapis');
require('dotenv').config();

// 1. Setup Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// 2. Setup Google Auth
const keyBuffer = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64');
const credentials = JSON.parse(keyBuffer.toString());

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = process.env.SPREADSHEET_ID;
console.log('📄 ENV Spreadsheet ID:', spreadsheetId);

// 3. Load all bot logic
require('./handlers/liteVerificationHandler')(client, auth, spreadsheetId);
require('./handlers/attendanceHandler')(client, auth, spreadsheetId);
require('./handlers/channelCreationLoop')(client, auth, spreadsheetId);
require('./handlers/rewardsPostHandler')(client);
require('./handlers/sendFormHandler')(client);
require('./handlers/sendScrimUpdateHandler')(client);
require('./handlers/exportRolesHandler')(client, auth);
require('./handlers/sendformtest')(client);
const moveInactiveChannels = require('./handlers/moveInactiveChannels');
moveInactiveChannels(client);



// 4. Ready event
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

console.log('🚀 Bot script started...');
client.login(process.env.DISCORD_TOKEN);

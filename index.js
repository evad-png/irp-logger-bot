const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { google } = require('googleapis');

// Google Sheets Setup
const keyBuffer = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64');
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(keyBuffer.toString()),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});


const spreadsheetId = '1qv2iIUqsLCsFbYQzSHlIkVUAH9xHaUK7nHwa7REPhcQ';
const verificationChannelId = '1362523004155723857'; // 🔁 Replace this

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;
    if (reaction.emoji.name !== '✅') return;

    // Only respond if it's in the correct channel
    if (reaction.message.channel.id !== verificationChannelId) return;

    const tag = user.tag;
    const id = user.id;
    const timestamp = new Date().toISOString();

    console.log(`✅ Reaction from ${tag} (${id}) at ${timestamp}`);

    const sheets = google.sheets({ version: 'v4', auth });
    const row = [tag, id, timestamp];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    console.log(`📥 Logged to Google Sheets: ${row.join(', ')}`);
  } catch (error) {
    console.error('❌ Error logging to Google Sheets:', error.message);
  }
});
console.log("🚀 Bot script started...");
client.login(process.env.DISCORD_TOKEN);

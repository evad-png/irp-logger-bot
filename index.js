console.log("🚀 Bot script started...");
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { google } = require('googleapis');
const path = require('path');

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'sheets-credentials.json'), // Make sure this file is in your project folder
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ⬇️ Replace with your real spreadsheet ID (from the Google Sheets URL)
const spreadsheetId = '1qv2iIUqsLCsFbYQzSHlIkVUAH9xHaUK7nHwa7REPhcQ';

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

    const tag = user.tag;
    const id = user.id;
    const timestamp = new Date().toISOString();

    console.log(`✅ Reaction from ${tag} (${id}) at ${timestamp}`);

    const sheets = google.sheets({ version: 'v4', auth });

    const row = [tag, id, timestamp];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:C', // Assumes your Google Sheet tab is named 'Sheet1'
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

client.login(process.env.DISCORD_TOKEN);

// handlers/rewardsReactionHandler.js
const { google } = require('googleapis');
const { Emoji } = require('discord.js');

// === CONFIG ===
const CHANNEL_ID = '1379445381657788436';
const EMOJI = '👊';
const SPREADSHEET_ID = '1wakYHO8e6AvmazbWjGN-9MK5-h67AmFsIkYfWw8aE1c';
const TAB_NAME = 'Opt In';

module.exports = async function rewardsReactionHandler(reaction, user, auth) {
  try {
    if (reaction.message.channelId !== CHANNEL_ID) return;
    if (reaction.emoji.name !== EMOJI) return;
    if (user.bot) return;

    const sheets = google.sheets({ version: 'v4', auth });
    const discordTag = `${user.username}#${user.discriminator}`;
    const discordId = user.id;

    // 1. Fetch existing rows
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A2:B`, // Discord Tag + ID
    });

    const rows = readRes.data.values || [];
    const alreadyExists = rows.some(row => row[1] === discordId);

    if (alreadyExists) {
      console.log(`✅ ${discordTag} already opted in`);
      return;
    }

    // 2. Append to sheet
    const timestamp = new Date().toISOString();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[discordTag, discordId, '', '', timestamp, 'Yes']]
      }
    });

    console.log(`📥 Logged ${discordTag} (${discordId}) to Opt In tab`);

  } catch (err) {
    console.error('❌ Error in rewardsReactionHandler:', err);
  }
};

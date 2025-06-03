// === handlers/liteVerificationHandler.js ===
const { Events } = require('discord.js');
const { google } = require('googleapis');

const verificationChannelId = '1362523004155723857'; // ✅ Replace with your actual verification channel ID
const coachRoleId = '866700390338002944'; // ✅ Only needed for logging/notification purposes
const rewardsReactionHandler = require('./rewardsReactionHandler'); // Adjust path as needed


module.exports = (client, auth, spreadsheetId) => {
  const sheets = google.sheets({ version: 'v4', auth });

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const tag = user.username;
    const id = user.id;
    const timestamp = new Date().toISOString();

    // 👊 Handle IRP Rewards Opt-In
    if (reaction.emoji.name === '👊' && reaction.message.channel.id === '1379445381657788436') {
      await rewardsReactionHandler(reaction, user, auth);
      return;
    }

    // ✅ Handle IRP Lite Verification
    if (reaction.emoji.name !== '✅' || reaction.message.channel.id !== verificationChannelId) return;

    // ✅ Log to Discord Logger
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Discord Logger!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[tag, id, timestamp]] },
    });
    console.log(`📥 Logged to Google Sheets: ${tag} (${id}) at ${timestamp}`);

    // 🔍 Lookup IRP Lite sheet
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'IRP Lite!A2:Z',
    });

    const rows = sheetRes.data.values;
    console.log(`📊 Pulled ${rows.length} rows from IRP Lite sheet`);
    console.log(`🔍 Searching for ID: "${id}", Tag: "${tag}"`);

    const studentRow = rows.find(row => row[2]?.toString().trim() === id)
      || rows.find(row => row[1]?.toLowerCase().trim() === tag.toLowerCase().trim());

    if (!studentRow) {
      console.log(`❌ No matching student found in IRP Lite sheet for tag: "${tag}", id: "${id}"`);
      return;
    }

    const packageType = studentRow[10];
    const isCommunityAccess = packageType === "Community Access";

    if ((!studentRow[14] || !studentRow[16]) && !isCommunityAccess) {
      console.log(`🕒 Coach/category not ready for ${tag}. Your private channel will be created in the next 5 minutes. If your channel does not get created please DM evaD`);
      return;
    }

    console.log(`✅ Student ${tag} logged and ready for channel creation in loop.`);
  } catch (error) {
    console.error('❌ Error in reaction handler:', error.message);
  }
});
};

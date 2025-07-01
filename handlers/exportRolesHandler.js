// === handlers/exportRolesHandler.js ===
const { google } = require('googleapis');

module.exports = (client, auth) => {
  const roleSpreadsheetId = "1Diikg-FppwsnYHjwgyg-wdIo-v8-WNLwIANQJ_U4RXo"; // hardcoded for one-time export

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!exportroles')) return;

    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You do not have permission to use this command.');
    }

    await message.reply('⏳ Starting export, this may take up to a minute for large servers, please wait...');

    const roleMap = [
      { id: '1284096039997018156', tab: '18-22' },
      { id: '1284096580760109150', tab: '23-29' },
      { id: '1284096835576926311', tab: '30-45' },
      { id: '1284096926597513298', tab: '45+' },
    ];

    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const guild = message.guild;

      // Ensure all members are fetched for accurate large server exports
      await guild.members.fetch();

      for (const { id, tab } of roleMap) {
        const role = guild.roles.cache.get(id);
        if (!role) {
          await message.channel.send(`⚠️ Could not find role with ID ${id}. Skipping.`);
          continue;
        }

        const members = role.members.map(m => [m.user.tag, m.user.id, m.displayName]);
        members.unshift(["Username#Tag", "User ID", "Server Nickname"]);

        await sheets.spreadsheets.values.update({
          spreadsheetId: roleSpreadsheetId,
          range: `${tab}!A1`,
          valueInputOption: 'RAW',
          resource: { values: members },
        });

        await message.channel.send(`✅ Exported ${members.length - 1} members for **${role.name}** to tab **${tab}**.`);
      }

      await message.channel.send('✅ All exports completed successfully.');
    } catch (err) {
      console.error(err);
      await message.channel.send(`❌ An error occurred: ${err.message}`);
    }
  });
};

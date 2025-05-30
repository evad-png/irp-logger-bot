// handlers/attendanceHandler.js
const { Events } = require('discord.js');
const { google } = require('googleapis');

module.exports = function (client, auth, spreadsheetId) {
  const coachRoleId = '866700390338002944';
  const sheets = google.sheets({ version: 'v4', auth });
  const activeAttendance = {};

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;

      const isCoach = message.member.roles.cache.has(coachRoleId);
      if (!isCoach) return;

      if (!message.content.toLowerCase().startsWith('!startattendance')) return;

      const args = message.content.trim().split(' ');
      args.shift();
      const className = args.join(' ').trim();

      if (!className.includes('| Week')) {
        await message.reply('❌ Please include the week like `!startattendance Sentinel Masterclass | Week 4`');
        return;
      }

      const [rawClass, rawWeek] = className.split('| Week');
      const parsedClassName = rawClass.trim();
      const currentWeek = parseInt(rawWeek.trim());

      if (!parsedClassName || isNaN(currentWeek)) {
        await message.reply('❌ Invalid format. Use `!startattendance Sentinel Masterclass | Week 4`');
        return;
      }

      const attendanceMsg = await message.channel.send(
        `📋 **Attendance for ${parsedClassName} (Week ${currentWeek})**\nReact with ✅ to confirm you're here.`
      );
      await attendanceMsg.react('✅');

      activeAttendance[attendanceMsg.id] = {
        messageId: attendanceMsg.id,
        channelId: attendanceMsg.channel.id,
        week: currentWeek,
        className: parsedClassName,
        startTime: Date.now(),
      };

      setTimeout(async () => {
        try {
          const channel = await client.channels.fetch(attendanceMsg.channel.id);
          const fetchedMsg = await channel.messages.fetch(attendanceMsg.id);
          const reaction = fetchedMsg.reactions.cache.get("✅");
          if (!reaction) {
            console.log(`⚠️ No ✅ reactions found for ${parsedClassName}`);
            return;
          }

          const users = await reaction.users.fetch();
          const values = [];

          const now = new Date();
          const estOptions = { timeZone: 'America/New_York', hour12: true };
          const dateOnly = now.toLocaleDateString('en-US', estOptions);
          const timeOnly = now.toLocaleTimeString('en-US', estOptions);

          users.forEach((user) => {
            if (user.bot) return;
            values.push([
              dateOnly,
              parsedClassName,
              currentWeek,
              user.tag,
              user.id,
              timeOnly,
              ''
            ]);
          });

          if (values.length > 0) {
            await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: 'Attendance Logger!A:G',
              valueInputOption: 'USER_ENTERED',
              requestBody: { values },
            });
            console.log(`✅ Logged ${values.length} students for ${parsedClassName} Week ${currentWeek}`);
          } else {
            console.log(`⚠️ No students reacted to ${parsedClassName}`);
          }

          await fetchedMsg.delete();
          delete activeAttendance[fetchedMsg.id];
        } catch (err) {
          console.error('⚠️ Error finalizing attendance message:', err.message);
        }
      }, 60 * 60 * 1000); // 1 hour

    } catch (error) {
      console.error('❌ Error in attendance handler:', error.message);
    }
  });
};

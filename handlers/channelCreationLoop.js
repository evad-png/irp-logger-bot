// === handlers/channelCreationLoop.js ===
const { google } = require('googleapis');
const { PermissionsBitField } = require('discord.js');

module.exports = function startChannelCheckLoop(client, auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const coachRoleId = '866700390338002944';

  setInterval(async () => {
    console.log('🔄 Running 5-minute channel check...');

    const guild = client.guilds.cache.first();
    if (!guild) return console.log('❌ Bot not in any guild');

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'IRP Lite!A2:Z',
    });

    const rows = res.data.values || [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const discordTag = row[1];
      const discordId = row[2];
      const packageType = row[10];
      const coachMention = row[14];
      const categoryId = row[16];
      const channelCreated = row[17];
      const isCommunityAccess = packageType === 'Community Access';

      if (!discordId || !categoryId || channelCreated === '✅') continue;

      const baseName = discordTag?.toLowerCase();
      const existing = guild.channels.cache.find(c => c.name.includes(baseName));
      if (existing) {
        console.log(`📛 Channel already exists for ${discordTag}`);
        continue;
      }

      const rawCoachId = coachMention?.replace(/[<@>]/g, '');

      let studentMember, coachMember;
      try {
        studentMember = await guild.members.fetch(discordId);
      } catch (err) {
        console.log(`⚠️ Failed to fetch student member: ${discordTag}`);
        continue;
      }

      if (!isCommunityAccess && rawCoachId) {
        try {
          coachMember = await guild.members.fetch(rawCoachId);
        } catch (err) {
          console.log(`⚠️ Failed to fetch coach member for ${discordTag}`);
        }
      }

      const overwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: studentMember.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: coachMember ? coachMember.id : coachRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: client.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
        },
      ];

      try {
        const channel = await guild.channels.create({
          name: `${baseName} - active`,
          type: 0,
          parent: categoryId,
          permissionOverwrites: overwrites,
        });

        const welcomeMessage = isCommunityAccess
          ? `👋 Welcome <@${discordId}>! This is your personal **Community Access** space inside IRP.

Use this channel to:
- Ask questions about agents, maps, mechanics, IRP Lite as a whole, and more!
- Share clips or ask for feedback from our coaching team
- Stay connected with the IRP community

Remember, Community Access does **not** receive 1-on-1 coaching. All coaches can see your channel and will drop in to answer any questions.

If you'd like to upgrade so you can receive 1-on-1 coaching please DM evaD.

🗓 Check the calendar: <#1338991610221821953>
📚 Watch lesson recordings: <#1341428516415213718>
💬 Say hi in the community chat: <#1340712926809555014>`
          : `🎉 Welcome <@${discordId}> to your private coaching channel with ${coachMention}!

This is your dedicated space to work directly with your coach — all communication should happen here, **not through DMs**. Use this channel to ask questions, request feedback, share clips, and stay on track with your goals. Your coach will always respond in this space.

---

✅ Before Your Assessment Call:

🎯 Complete your Voltaic Benchmarks  
🟢 Platinum or lower: https://forms.gle/oKnww1jr2GSUDiN67  
🔵 Diamond or higher: https://forms.gle/W3JbvXiAJHDrPGGF8  
📄 Instructions: https://docs.google.com/document/d/1hIImct8DrCWM9lgXZBXspNwSADcWfqT6_sxAn29nCs8/edit?usp=sharing

📚 Catch up on past lessons: <#1341428516415213718>  
🗓 Check the Lite calendar: <#1338991610221821953>  
🙋 Introduce yourself to other Lite students: <#1340712926809555014>

🖥️ What to do the day of your assessment meeting?  
Join this channel: <#1336958676698923110> 5 minutes before your scheduled time and your coach will pull you into their coaching terminal!

---

Let’s get to work 💪`;

        await channel.send(welcomeMessage);

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `IRP Lite!R${i + 2}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['✅']] },
        });

        console.log(`✅ Created channel for ${discordTag} and updated sheet`);
      } catch (err) {
        console.error(`❌ Error creating channel for ${discordTag}:`, err.message);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
};

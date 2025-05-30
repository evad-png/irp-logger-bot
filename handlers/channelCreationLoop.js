// handlers/channelCreationLoop.js
const { google } = require('googleapis');
const { PermissionsBitField } = require('discord.js');

module.exports = function startChannelCheckLoop(client, auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const coachRoleId = '866700390338002944';

  setInterval(async () => {
    console.log('🔄 Running 5-minute channel check...');

    const guild = client.guilds.cache.first(); // Adjust if multi-guild
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
      console.log(`🔍 rawCoachId extracted for ${discordTag}: ${rawCoachId}`);

      let coachUser;

      if (!isCommunityAccess && rawCoachId) {
        try {
          console.log(`👤 Attempting to fetch coach member with ID ${rawCoachId} for student ${discordTag}`);

          coachUser = await guild.members.fetch({ user: rawCoachId, force: true });

          console.log(`✅ Successfully fetched coach user ${coachUser.user.tag} (${coachUser.id})`);
        } catch (err) {
          console.error(`❌ Failed to fetch coach user for ${discordTag} (Coach ID: ${rawCoachId})`);
          console.error(`   ➤ Error: ${err.message}`);
          console.error(`   ➤ Is coach ID in cache?`, guild.members.cache.has(rawCoachId));
          console.error(`   ➤ Total cached members: ${guild.members.cache.size}`);
        }
      }

      const overwrites = [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: discordId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        isCommunityAccess
          ? {
              id: coachRoleId,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            }
          : {
              id: coachUser?.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
        {
          id: client.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ];

      console.log(`🔐 Permission overwrites for ${discordTag}:`);
      overwrites.forEach((o, i) => {
        console.log(`   ${i + 1}. ID: ${o.id}, Allow: ${o.allow?.toArray?.()}, Deny: ${o.deny?.toArray?.()}`);
      });

      try {
        const channel = await guild.channels.create({
          name: `${baseName} - active`,
          type: 0,
          parent: categoryId,
          permissionOverwrites: overwrites,
        });

        const welcomeMessage = isCommunityAccess
          ? `👋 Welcome <@${discordId}>! This is your personal **Community Access** space inside IRP.\n\nUse this channel to:\n- Ask questions about agents, maps, mechanics, IRP Lite as a whole, and more!\n- Share clips or ask for feedback from our coaching team\n- Stay connected with the IRP community\n\nRemember, Community Access does **not** receive 1-on-1 coaching. All coaches can see your channel and will drop in to answer any questions.\n\nIf you'd like to upgrade so you can receive 1-on-1 coaching please DM evaD.\n\n🗓 Check the calendar: <#1338991610221821953>\n📚 Watch lesson recordings: <#1341428516415213718>\n💬 Say hi in the community chat: <#1340712926809555014>`
          : `🎉 Welcome <@${discordId}> to your private coaching channel with ${coachMention}!\n\nThis is your dedicated space to work directly with your coach — all communication should happen here, **not through DMs**. Use this channel to ask questions, request feedback, share clips, and stay on track with your goals. Your coach will always respond in this space.\n\n---\n\n✅ Before Your Assessment Call:\n\n🎯 Complete your Voltaic Benchmarks  
🟢 Platinum or lower: https://forms.gle/oKnww1jr2GSUDiN67  
🔵 Diamond or higher: https://forms.gle/W3JbvXiAJHDrPGGF8  
📄 Instructions: https://docs.google.com/document/d/1hIImct8DrCWM9lgXZBXspNwSADcWfqT6_sxAn29nCs8/edit?usp=sharing\n
📚 Catch up on past lessons: <#1341428516415213718>  
🗓 Check the Lite calendar: <#1338991610221821953>  
🙋 Introduce yourself to other Lite students: <#1340712926809555014>\n
🖥️ What to do the day of your assessment meeting?  
Join this channel: <#1336958676698923110> 5 minutes before your scheduled time and your coach will pull you into their coaching terminal!\n
---\n\nLet’s get to work 💪`;

        await channel.send(welcomeMessage);

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `IRP Lite!R${i + 2}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['✅']],
          },
        });

        console.log(`✅ Created channel for ${discordTag} and updated sheet`);
      } catch (err) {
        console.error(`❌ Error creating channel for ${discordTag}:`, err.message);
      }
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
};

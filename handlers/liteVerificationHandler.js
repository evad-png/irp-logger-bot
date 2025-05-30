// === handlers/liteVerificationHandler.js ===
const { Events, PermissionsBitField } = require('discord.js');
const { google } = require('googleapis');

const verificationChannelId = 'YOUR_VERIFICATION_CHANNEL_ID'; // Replace this
const coachRoleId = 'YOUR_COACH_ROLE_ID'; // Replace this

module.exports = (client, auth, spreadsheetId) => {
  const sheets = google.sheets({ version: 'v4', auth });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
      if (reaction.partial) await reaction.fetch();
      if (user.bot || reaction.emoji.name !== '✅' || reaction.message.channel.id !== verificationChannelId) return;

      const tag = user.username;
      const id = user.id;
      const timestamp = new Date().toISOString();

      // Log to Discord Logger
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Discord Logger!A:C',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[tag, id, timestamp]] },
      });
      console.log(`📥 Logged to Google Sheets: ${tag} (${id}) at ${timestamp}`);

      // Get IRP Lite data
      const sheetRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'IRP Lite!A2:Z',
      });

      const rows = sheetRes.data.values;
      console.log(`📊 Pulled ${rows.length} rows from IRP Lite sheet`);
      console.log(`🔍 Searching for ID: "${id}", Tag: "${tag}"`);

      const studentRow = rows.find(row => row[2]?.toString().trim() === id)
        || rows.find(row => row[1]?.toLowerCase().trim() === tag.toLowerCase().trim());

      const rowIndex = rows.findIndex(row =>
        row[2]?.toString().trim() === id || row[1]?.toLowerCase().trim() === tag.toLowerCase().trim()
      );

      if (!studentRow) {
        console.log(`❌ No matching student found in IRP Lite sheet for tag: "${tag}", id: "${id}"`);
        const fallbackRow = rows.find(r => r[1]?.toLowerCase().includes(tag.toLowerCase())) || rows[0];
        console.log('🧪 Sample fallback row for debug:', fallbackRow);
        return;
      }

      console.log(`✅ Found student row for ${tag}:`, studentRow);

      const packageType = studentRow[10];
      const isCommunityAccess = packageType === "Community Access";

      if ((!studentRow[14] || !studentRow[16]) && !isCommunityAccess) {
        console.log(`🛑 Coach or category not assigned yet for ${tag}. Skipping channel creation.`);
        const announcementChannel = reaction.message.guild.channels.cache.get('1340712926809555014');
        if (announcementChannel) {
          await announcementChannel.send(
            `👋 <@${user.id}> We're still assigning your coach! Please wait 2–3 minutes and react again with ✅, and your private channel will be created. (You need to unreact the ✅ and then react again with ✅ so it logs you again)`
          );
        } else {
          console.log('⚠️ Could not find #irp-lite-chat to notify student.');
        }
        return;
      }

      const studentDiscordId = studentRow[2];
      const rawCoachId = studentRow[14]?.replace(/[<@>]/g, '');
      const coachMention = studentRow[14];
      const coachCategoryId = studentRow[16];

      const baseName = tag.toLowerCase();
      const existingChannel = reaction.message.guild.channels.cache.find(c => c.name.toLowerCase().includes(baseName));
      if (existingChannel) {
        console.log(`ℹ️ Channel already exists for ${tag}, skipping creation.`);
        return;
      }

      const channelName = `${baseName} - active`;

      let coachUser;
      if (!isCommunityAccess && rawCoachId) {
        try {
          coachUser = await reaction.message.guild.members.fetch(rawCoachId);
        } catch (e) {
          console.log(`⚠️ Failed to fetch coach user for ${tag}: ${e.message}`);
        }
      }

      const permissionOverwrites = [
        {
          id: reaction.message.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: studentDiscordId,
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
          id: reaction.client.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ];

      const newChannel = await reaction.message.guild.channels.create({
        name: channelName,
        type: 0,
        parent: coachCategoryId,
        permissionOverwrites,
      });

      console.log(`✅ Created new channel: ${channelName} for ${tag}`);

      const welcomeMessage = isCommunityAccess
        ? `👋 Welcome <@${studentDiscordId}>! This is your personal **Community Access** space inside IRP.\n\nUse this channel to:\n- Ask questions about agents, maps, mechanics, IRP Lite as a whole, and more!\n- Share clips or ask for feedback from our coaching team\n- Stay connected with the IRP community\n\nRemember, Community Access does **not** receive 1-on-1 coaching. All coaches can see your channel and will drop in to answer any questions.\n\nIf you'd like to upgrade so you can receive 1-on-1 coaching please DM evaD.\n\n🗓 Check the calendar: <#1338991610221821953>\n📚 Watch lesson recordings: <#1341428516415213718>\n💬 Say hi in the community chat: <#1340712926809555014>`
        : `🎉 Welcome <@${studentDiscordId}> to your private coaching channel with ${coachMention}!\n\nThis is your dedicated space to work directly with your coach — all communication should happen here, **not through DMs**. Use this channel to ask questions, request feedback, share clips, and stay on track with your goals. Your coach will always respond in this space.\n\n---\n\n✅ Before Your Assessment Call:\n\n🎯 Complete your Voltaic Benchmarks\n🟢 Platinum or lower: https://forms.gle/oKnww1jr2GSUDiN67\n🔵 Diamond or higher: https://forms.gle/W3JbvXiAJHDrPGGF8\n📄 Instructions: https://docs.google.com/document/d/1hIImct8DrCWM9lgXZBXspNwSADcWfqT6_sxAn29nCs8/edit?usp=sharing\n\n📚 Catch up on past lessons: <#1341428516415213718>\n🗓 Check the Lite calendar: <#1338991610221821953>\n🙋 Introduce yourself to other Lite students: <#1340712926809555014>\n\n🖥️ What to do the day of your assessment meeting?\nJoin this channel: <#1336958676698923110> 5 minutes before your scheduled time and your coach will pull you into their coaching terminal!\n\n---\n\nLet’s get to work 💪`;

      await newChannel.send(welcomeMessage);

      // ✅ Update "Channel Created" column (Column R)
      if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `IRP Lite!R${rowIndex + 2}`, // +2 because sheet starts at A2
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['✅']],
          },
        });
        console.log(`📝 Marked channel as created for ${tag} (Row ${rowIndex + 2})`);
      }
    } catch (error) {
      console.error('❌ Error in reaction handler:', error.message);
    }
  });
};

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

Remember, your package does **not** receive 1-on-1 coaching. All coaches can see your channel and will drop in to answer any questions.

**Your package includes:**
- Access to the Community
- Weekly group events (Found here: <#1338991610221821953>)
- IRP Video Archive (Found on the Whop)
- The IRP League (Currently on a break)

The Weekly group events are one of your most **valuable** resources, specifically the Sunday Scrims. We host **two** lobbies: one for higher ELO and one for lower ELO. This means you’ll be playing against people of a similar rank to you. You’ll have a coach assigned to your lobby, and they'll pause and provide feedback throughout the scrim. These are primarily hosted on NA servers, but may be hosted on EU servers depending on the student turnout. Hope to see you this weekend! 

If you'd like to upgrade so you can receive 1-on-1 coaching please @ evaD in this channel.


**📚 Additional Resources:**

❗ Weekly announcements channel: <#1338989598591811678>
✏️ Suggest a class you want: <#1383075134364975235>
📚 Watch previous lesson recordings: <#1341428516415213718>
💬 Say hi in the community chat: <#1340712926809555014>`


          : `🎉 Welcome <@${discordId}> to your private coaching channel with ${coachMention}!

This is your dedicated space to work directly with your coach — all communication should happen here, **not through DMs**. Use this channel to ask questions, request feedback, share clips, and stay on track with your goals. Your coach will always respond in this space.

---

✅ Your Next Steps:

1. 📅 Share Your Google Calendar
**This is the most important step and required so you can schedule your first session.**
▶️ How to Share Your Calendar (https://youtube.com/live/KtyKFddVhtw?feature=share)
🔗 Share with: irp-bot-service-account@irp-calendar-bot.iam.gserviceaccount.com		

2. 🎥 Watch the Settings Optimization Guide
Make sure your in-game and out-of-game settings are ready.
▶️ Watch the Video (https://www.youtube.com/watch?v=sn2HsFUh-O4&ab_channel=HieuM)

3. 🗓 Book Your Assessment
Once Step 1 is complete, type /book in this channel and follow the prompts. **Remember you are booking the LITE ASSESSMENT with your Coach who was included in your welcome message.**

4. 🖥️ Join the Right Channel On Time
At your scheduled time, join this channel: <#1336958676698923110>
Your coach will pull you into their coaching terminal.


📚 Additional Resources:
🗓 Weekly Schedule & Announcements: <#1338989598591811678>

📖 Past Lessons Archive: <#1341428516415213718>

📅 Group Events Calendar: <#1338991610221821953>

👋 Introduce Yourself to other Lite Students: <#1340712926809555014>

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

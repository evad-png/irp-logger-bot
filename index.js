// === Discord Bot with Enhanced Logging for IRP Lite Verification ===

const { Client, GatewayIntentBits, Partials, Events, PermissionsBitField } = require('discord.js');
const { google } = require('googleapis');

// Google Sheets Setup
const keyBuffer = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64');
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(keyBuffer.toString()),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = '17ik72Fnb6E0q3Ij_Gt3YQ5u1E1qkYzgaujPlhTa7UsE';
const verificationChannelId = '1362523004155723857';
const coachRoleId = '866700390338002944';

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

const activeAttendance = {};

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!postverify' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    const verifyChannel = await client.channels.fetch(verificationChannelId);
    if (!verifyChannel) return console.log('❌ Could not find verification channel');

    const verifyMessage = await verifyChannel.send(
      `👋 **Welcome to IRP Lite!**\n\nTo begin your setup, please click ✅ below to confirm you're ready.\nThis helps us set up your private channel and complete your onboarding.\n**(DO NOT REACT UNLESS YOU'VE COMPLETED THE GOOGLE FORM THAT WAS INCLUDED IN YOUR WELCOME MESSAGE)**`
    );

    await verifyMessage.react('✅');
    console.log('✅ Posted verification message with ✅');
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.bot || reaction.emoji.name !== '✅' || reaction.message.channel.id !== verificationChannelId) return;

    const tag = user.username;
    const id = user.id;
    const timestamp = new Date().toISOString();
    const sheets = google.sheets({ version: 'v4', auth });

    // Log to Discord Logger tab
    const row = [tag, id, timestamp];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Discord Logger!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    console.log(`📥 Logged to Google Sheets: ${tag} (${id}) at ${timestamp}`);

    // Pull IRP Lite student info
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
  } catch (error) {
    console.error('❌ Error in reaction handler:', error.message);
  }
});



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

    // Store attendance session
    activeAttendance[attendanceMsg.id] = {
      messageId: attendanceMsg.id,
      channelId: attendanceMsg.channel.id,
      week: currentWeek,
      className: parsedClassName,
      startTime: Date.now()
    };

    // Wait 1 hour, then log all reactions
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
        const estOptions = {
          timeZone: 'America/New_York',
          hour12: true,
        };
        const dateOnly = now.toLocaleDateString('en-US', estOptions);
        const timeOnly = now.toLocaleTimeString('en-US', estOptions);

        users.forEach((user) => {
          if (user.bot) return;

          values.push([
            dateOnly,                   // Column A - Date
            parsedClassName,           // Column B - Class Name
            currentWeek,               // Column C - Week
            user.tag,                  // Column D - Discord Tag
            user.id,                   // Column E - Discord ID
            timeOnly,                  // Column F - Time
            ''                         // Column G - Sync Status
          ]);
        });

        if (values.length > 0) {
          const sheets = google.sheets({ version: 'v4', auth });

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
    console.error('❌ Error in messageCreate handler:', error.message);
  }
});





console.log("🚀 Bot script started...");
client.login(process.env.DISCORD_TOKEN);

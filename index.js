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

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;
    if (reaction.emoji.name !== '✅') return;
    if (reaction.message.channel.id !== verificationChannelId) return;

    const tag = user.tag;
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
    console.log(`📥 Logged to Google Sheets: ${row.join(', ')}`);

    // Pull IRP Lite student info
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'IRP Lite!A2:Z',
    });

    const rows = sheetRes.data.values;
    const studentRow = rows.find(row => row[1] === tag); // Column B = Discord Tag

    if (!studentRow) {
      console.log(`❌ No matching student found in IRP Lite sheet for ${tag}`);
      return;
    }

    const studentDiscordId = studentRow[2]; // Column C
    const rawCoachId = studentRow[14].replace(/[<@>]/g, '');
    const coachMention = studentRow[14]; // for welcome message
    const coachCategoryId = studentRow[16]; // Column Q

    const baseName = tag.split('#')[0].toLowerCase();
    const existingChannel = reaction.message.guild.channels.cache.find(c =>
      c.name.toLowerCase().includes(baseName)
    );

    if (existingChannel) {
      console.log(`ℹ️ Channel already exists for ${tag}, skipping creation.`);
      return;
    }

    const channelName = `${baseName} - active`;

    // ✅ Fetch coach user to avoid caching issues
    const coachUser = await reaction.message.guild.members.fetch(rawCoachId);

    console.log("➡️ Creating channel with:");
    console.log("Student ID:", studentDiscordId, "| Type:", typeof studentDiscordId);
    console.log("Coach ID:", coachUser.id, "| Type:", typeof coachUser.id);
    console.log("Bot ID:", reaction.client.user.id, "| Type:", typeof reaction.client.user.id);
    console.log("Category ID:", coachCategoryId, "| Type:", typeof coachCategoryId);

    const newChannel = await reaction.message.guild.channels.create({
      name: channelName,
      type: 0,
      parent: coachCategoryId,
      permissionOverwrites: [
        {
          id: reaction.message.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: studentDiscordId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: coachUser.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: reaction.client.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ],
    });

    await newChannel.send(`🎉 Welcome <@${studentDiscordId}> to your private coaching channel with ${coachMention}!

This is your dedicated space to work directly with your coach — all communication should happen here, **not through DMs**. Use this channel to ask questions, request feedback, share clips, and stay on track with your goals. Your coach will always respond in this space.

---

✅ **Before Your Assessment Call**:
1. 🎯 Complete your [Voltaic Benchmarks](https://docs.google.com/document/d/1hXSO_VrHsnJvRWA6ne1wCEaoIWdseXKX5EaWnJx6UAg/edit?usp=sharing)
2. 📚 Catch up on past lessons: <#1341428516415213718>
3. 🗓 Check the Lite calendar: <#1338991610221821953>
4. 🙋 Introduce yourself to other Lite students: <#1340712926809555014>
5. 🖥️ **What to do the day of your assessment meeting?**  
Join this channel: <#1336958676698923110> **5 minutes before your scheduled time** and your coach will pull you into their coaching terminal!

---

Let’s get to work 💪`);
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

    if (!className) {
      await message.reply('❌ Please provide a class name like `!startattendance Duelist Masterclass`');
      return;
    }

    const attendanceMsg = await message.channel.send(`📋 **Attendance for ${className}**\nReact with ✅ to confirm you're here.`);
    await attendanceMsg.react('✅');

    setTimeout(async () => {
      try {
        await attendanceMsg.delete();
        console.log(`🗑️ Deleted attendance message for ${className}`);
      } catch (err) {
        console.error('⚠️ Error deleting attendance message:', err.message);
      }
    }, 3 * 60 * 60 * 1000);

  } catch (error) {
    console.error('❌ Error in messageCreate handler:', error.message);
  }
});

console.log("🚀 Bot script started...");
client.login(process.env.DISCORD_TOKEN);

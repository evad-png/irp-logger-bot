// handlers/sendFormHandler.js
const { Events } = require('discord.js');

module.exports = function (client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content.trim().toLowerCase() !== '!sendform') return;

    const guild = client.guilds.cache.first();
    if (!guild) return message.reply('❌ Bot not in any guild');

    const raffleMessage = `<@&1336602017275052042>  
🎯 **Help Us Improve IRP Lite + Win Rewards!**

We’re always working to improve IRP Lite, and your honest feedback makes a significant difference.

🔥 As a thank-you, you’ll be entered into our IRP Lite Raffle:

🥇 First 5 students to complete the form = 3 entries  
🥈 Next 10 students = 2 entries  
🥉 Everyone after = 1 entry

🎁 **Prizes include** (You can only win one prize. Winners are chosen via a wheel spin and can select their prize):
- 1-on-1 VOD review session  
- Valorant gift card ($25)  
- 1 week access to IRP Elite group sessions  

⚠️ *Important:*  
Please answer honestly and thoughtfully. Submissions with fake or rushed answers will be excluded from the raffle.

📅 We will do 5 random drawings to select our winners. 1 form submission per user. This form closes on **6/13/25**.

📋 Form Link: https://forms.gle/JPLBX6oTwNbwMGFG6

💬 This takes less than 10 minutes. Be honest, we’re listening.`;

    let sentCount = 0;

    for (const [channelId, channel] of guild.channels.cache) {
      if (channel.type === 0 && channel.name.includes('active')) {
        try {
          await channel.send(raffleMessage);
          sentCount++;
        } catch (err) {
          console.error(`❌ Failed to send in ${channel.name}:`, err.message);
        }
      }
    }

    await message.reply(`✅ Sent the form to ${sentCount} student channels.`);
  });
};

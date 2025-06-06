// handlers/sendFormHandler.js
const { Events } = require('discord.js');

module.exports = function (client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content.trim().toLowerCase() !== '!sendform') return;

    const testChannelId = '1380577629580693514';

    try {
      const testChannel = await client.channels.fetch(testChannelId);

      const raffleMessage = `🎯 **Help Us Improve IRP Lite + Win Rewards!**

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

      await testChannel.send(raffleMessage);
      await message.reply(`✅ Sent the form message to #${testChannel.name}`);
    } catch (err) {
      console.error('❌ Failed to send test form message:', err.message);
      await message.reply('❌ Failed to send test form message.');
    }
  });
};

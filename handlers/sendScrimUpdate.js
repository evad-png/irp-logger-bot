// handlers/sendScrimUpdateHandler.js
const { Events } = require('discord.js');

module.exports = function (client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.content.trim().toLowerCase() !== '!sendscrimupdate') return;

    const guild = client.guilds.cache.first();
    if (!guild) return message.reply('❌ Bot not in any guild');

    const updateMessage = `
👋 **Hey team! Here are this week’s important updates:**  

📅 **The new calendar is out!**  

You can find it here <#1338991610221821953> - make sure to check it so you don’t miss any sessions.  

🧠 **Lite Scrims are getting a major upgrade!**  

Starting **THIS** Sunday, we’re now running **two lobbies** to improve quality:  
- 🔺 **High ELO Scrim Lobby**  
- 🔻 **Low ELO Scrim Lobby**  

This gives everyone a more productive environment to grow. These will **mostly run on NA servers**, but we’re flexible if the majority of attendees are EU.  

⚠️ **We need your turnout to keep this going**, so show up and make it worth running!

📽️ **IMPORTANT: New Booking Process for 1-on-1s (Lite & Lite+ students only)**  

Watch this quick video explaining how we’ve **fully moved to Discord** for scheduling 1-on-1 sessions:  
👉 https://youtube.com/live/-acfJY2pres  

❌ *If you're on the Community Access (Basic) package, this update doesn't apply to you.*  

✅ *If you're Lite or Lite+, you now book straight through Discord - no more Calendly.*  

Let us know if you have any questions - we're here to help 💬`;

    let sentCount = 0;

    for (const [channelId, channel] of guild.channels.cache) {
      if (
        channel.type === 0 &&
        channel.name.includes('active') &&
        !channel.name.includes('inactive')
      ) {
        try {
          await channel.send(updateMessage);
          sentCount++;
        } catch (err) {
          console.error(`❌ Failed to send in ${channel.name}:`, err.message);
        }
      }
    }

    await message.reply(`✅ Sent the update to ${sentCount} student channels.`);
  });
};

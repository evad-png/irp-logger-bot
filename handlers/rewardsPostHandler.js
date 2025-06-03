// handlers/rewardsPostHandler.js
const { Events } = require('discord.js');

module.exports = function (client) {
  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content.trim().toLowerCase() === '!postrewardsverify') {
      const channel = client.channels.cache.get('1379445381657788436');
      if (!channel) {
        await message.reply('❌ Could not find the rewards channel.');
        return;
      }

      const msg = await channel.send(
        `👊 **IRP Rewards Opt-In**

By reacting to this message you are opting into the IRP Rewards system and you agree to the terms and conditions in this Document:
https://docs.google.com/document/d/1CiSbIIuG0jCzHOE3_E0zPL5KlXXB9SZqImEhcH5Mwv8/edit?tab=t.0`
      );

      await msg.react('👊');
      await message.reply('✅ Rewards opt-in message posted!');
    }
  });
};

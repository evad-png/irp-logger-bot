// === handlers/sendformlive.js ===

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!sendformlive')) return;

    const args = message.content.split(' ');
    if (args.length < 2) {
      return message.reply('❌ Please provide a Google Form link like this: `!sendformlive https://forms.gle/xyz`');
    }

    const formLink = args[1];
    const sentChannels = [];

    try {
      client.channels.cache.forEach(async (channel) => {
        if (
          channel.type === 0 && // Type 0 = GuildText
          channel.name.endsWith('active')
        ) {
          await channel.send({
            content: `<@&1336602017275052042>\n\n👋 Hey! We’re trying to schedule group sessions at better times.\n\nPlease take 30 seconds to fill out this quick form:\n${formLink}\n\nYou’ll get more sessions scheduled when you're free!`,
            allowedMentions: { roles: ['1336602017275052042'] }
          });
          sentChannels.push(channel.name);
        }
      });

      await message.reply(`✅ Form message sent to ${sentChannels.length} channels.`);
    } catch (err) {
      console.error(err);
      await message.reply('❌ Something went wrong while sending form messages.');
    }
  });
};

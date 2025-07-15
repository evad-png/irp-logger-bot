// === handlers/sendformtest.js ===

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!sendformtest')) return;

    const args = message.content.split(' ');
    if (args.length < 2) {
      return message.reply('❌ Please provide a Google Form link like this: `!sendformtest https://forms.gle/xyz`');
    }

    const formLink = args[1];
    const testChannelName = 'evad8989-active';

    const testChannel = message.guild.channels.cache.find(
      channel => channel.name === testChannelName && channel.type === 0 // GuildText
    );

    if (!testChannel) {
      return message.reply(`❌ Could not find the test channel \`${testChannelName}\``);
    }

    try {
      await testChannel.send({
        content: `<@&1336602017275052042>\n\n👋 Hey! We’re trying to schedule group sessions at better times.\n\nPlease take 30 seconds to fill out this quick form:\n${formLink}\n\nYou’ll get more sessions scheduled when you're free!`,
        allowedMentions: { roles: ['1336602017275052042'] }
      });

      await message.reply(`✅ Test message sent to #${testChannelName}`);
    } catch (err) {
      console.error(err);
      await message.reply('❌ Something went wrong while sending the test message.');
    }
  });
};

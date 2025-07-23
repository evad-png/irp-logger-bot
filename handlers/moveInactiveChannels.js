const { Events, ChannelType } = require('discord.js');

module.exports = function moveInactiveChannels(client) {
  const archiveCategoryId = '1395431243734192188'; // Archive category ID
  const guildId = '862543387160215602'; // IRP server ID

  const coachCategoryIds = [
    '1366422592537362573',
    '1336601321582624811',
    '1336601384954630186',
    '1336601444790566945',
    '1336601498527862804',
    '1336601558187769868',
    '1336601649564749824',
    '1339973506590576702',
  ];

  // Start after 10 seconds, then run every 24 hours
  setTimeout(() => {
    setInterval(async () => {
      console.log('⏰ Running daily inactive channel check...');

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const archiveCategory = guild.channels.cache.get(archiveCategoryId);
      if (!archiveCategory || archiveCategory.type !== ChannelType.GuildCategory) return;

      for (const categoryId of coachCategoryIds) {
        const category = guild.channels.cache.get(categoryId);
        if (!category || category.type !== ChannelType.GuildCategory) continue;

        const children = guild.channels.cache.filter(
          c => c.parentId === categoryId && (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
        );

        for (const channel of children.values()) {
          if (channel.name.toLowerCase().includes('inactive')) {
            try {
              await channel.setParent(archiveCategoryId, { lockPermissions: false });
            } catch (err) {
              // Silently ignore move failures
            }
          }
        }
      }

      console.log('✅ Inactive channel check complete.');
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }, 10 * 1000); // Initial delay after bot starts (10 seconds)
};

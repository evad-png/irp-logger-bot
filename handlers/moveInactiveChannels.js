const { Events, ChannelType } = require('discord.js');

module.exports = function moveInactiveChannels(client) {
  const archiveCategoryId = '1395431243734192188'; // New archive category ID

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

  setTimeout(async () => {
    console.log('⏳ Starting inactive channel check (after 2-minute delay)...');

    const guild = client.guilds.cache.first();
    if (!guild) return console.log('❌ Bot is not in any guild');

    const archiveCategory = guild.channels.cache.get(archiveCategoryId);
    if (!archiveCategory) return console.log('❌ Archive category not found!');
    if (archiveCategory.type !== ChannelType.GuildCategory) {
      return console.log(`❌ Archive category type is not valid (found type: ${archiveCategory.type})`);
    }

    console.log(`📁 Archive category found: ${archiveCategory.name} (${archiveCategory.id})`);

    for (const categoryId of coachCategoryIds) {
      const category = guild.channels.cache.get(categoryId);
      if (!category) {
        console.log(`⚠️ Coach category not found: ${categoryId}`);
        continue;
      }
      if (category.type !== ChannelType.GuildCategory) {
        console.log(`⚠️ Skipping non-category channel: ${category.name} (${category.id})`);
        continue;
      }

      console.log(`🔍 Scanning category: ${category.name} (${category.id})`);

      const children = guild.channels.cache.filter(
        c => c.parentId === categoryId && (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
      );

      for (const channel of children.values()) {
        console.log(`➡️ Checking channel: ${channel.name} (${channel.id})`);

        if (channel.name.toLowerCase().includes('inactive')) {
          console.log(`📦 Attempting to move inactive channel: ${channel.name}`);

          try {
            await channel.setParent(archiveCategoryId, { lockPermissions: false });
            console.log(`✅ Successfully moved ${channel.name} to archive category`);
          } catch (err) {
            console.error(`❌ Failed to move ${channel.name}:`, err.message);
          }
        }
      }
    }

    console.log('✅ Inactive channel check complete.');

  }, 2 * 60 * 1000); // Run after 2 minutes
};

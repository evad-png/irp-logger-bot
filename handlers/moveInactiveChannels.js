const { Events } = require('discord.js');

module.exports = function moveInactiveChannels(client) {
  const archiveCategoryId = '1378521355900948560'; // ✅ Replace with real archive category ID

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

  setTimeout(() => {
    setInterval(async () => {
      console.log('🕵️ Running inactive channel mover...');

      const guild = client.guilds.cache.first();
      if (!guild) return console.log('❌ Bot not in any guild');

      for (const categoryId of coachCategoryIds) {
        const category = guild.channels.cache.get(categoryId);
        if (!category || category.type !== 4) continue; // Ensure it's a category

        const children = category.children.cache;
        for (const channel of children.values()) {
          if (channel.name.includes('inactive')) {
            try {
              await channel.setParent(archiveCategoryId, { lockPermissions: false });
              console.log(`📦 Moved ${channel.name} to archives`);
            } catch (err) {
              console.error(`❌ Error moving ${channel.name}:`, err.message);
            }
          }
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes for now
  }, 10 * 1000); // Wait 10s after startup just in case
};

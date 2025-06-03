// commands/postRewardsVerify.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postrewardsverify')
    .setDescription('Post the IRP Rewards opt-in verification message'),

  async execute(interaction) {
    const channel = interaction.client.channels.cache.get('1379445381657788436');
    if (!channel) {
      return interaction.reply({ content: '❌ Rewards channel not found.', ephemeral: true });
    }

    const messageText = `👊 **IRP Rewards Opt-In**

By reacting to this message you are opting into the IRP Rewards system and you agree to the terms and conditions in this Document:
https://docs.google.com/document/d/1CiSbIIuG0jCzHOE3_E0zPL5KlXXB9SZqImEhcH5Mwv8/edit?tab=t.0`;

    const message = await channel.send({ content: messageText });
    await message.react('👊');

    // Optional: reply to confirm it posted
    await interaction.reply({ content: '✅ Rewards opt-in message posted!', ephemeral: true });
  }
};

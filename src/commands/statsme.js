const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const cv2 = require('../utils/cv2');
const statsmeHandler = require('../interactions/statsme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statsme')
    .setDescription('Veja suas estatísticas como influencer'),

  async execute(interaction) {
    const influencer = db.influencers.get(interaction.guild.id, interaction.user.id);
    if (!influencer) {
      return interaction.reply({
        ...cv2.reply([
          cv2.container([
            cv2.text('❌ Você não é um influencer neste servidor.'),
          ], cv2.COLORS.RED),
        ], true),
      });
    }

    await statsmeHandler.showStats(interaction, influencer, true);
  },
};

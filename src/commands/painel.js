const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const painelHandler = require('../interactions/painel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o painel administrativo'),

  async execute(interaction) {
    if (!(await isAdmin(interaction))) {
      return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
    }
    await painelHandler.showMain(interaction, true);
  },
};

const painelHandler = require('../interactions/painel');
const statsmeHandler = require('../interactions/statsme');
const feedbackHandler = require('../interactions/feedback');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (cmd) await cmd.execute(interaction, client);
        return;
      }

      const id = interaction.customId ?? '';
      const prefix = id.split(':')[0];

      if (prefix === 'painel') return painelHandler.handle(interaction);
      if (prefix === 'statsme') return statsmeHandler.handle(interaction);
      if (prefix === 'fb') return feedbackHandler.handle(interaction, client);
    } catch (e) {
      console.error('[Interaction] Erro:', e);
      const msg = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};

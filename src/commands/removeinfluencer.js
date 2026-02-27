const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const db = require('../database/db');
const cv2 = require('../utils/cv2');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeinfluencer')
    .setDescription('Remove um membro como influencer')
    .addUserOption(opt =>
      opt.setName('membro').setDescription('O influencer a ser removido').setRequired(true)
    ),

  async execute(interaction) {
    if (!(await isAdmin(interaction))) {
      return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('membro');
    const guild = interaction.guild;

    if (!target) {
      return interaction.editReply({ content: '❌ Membro não encontrado.' });
    }

    const influencer = db.influencers.get(guild.id, target.id);
    if (!influencer) {
      return interaction.editReply({ content: `❌ **${target.user.username}** não é um influencer.` });
    }

    try {
      // Remove Influencer role
      const infRole = guild.roles.cache.get(influencer.influencer_role_id);
      if (infRole && target.roles?.cache.has(infRole.id)) {
        await target.roles.remove(infRole).catch(() => {});
      }

      // Delete channel
      const channel = guild.channels.cache.get(influencer.channel_id);
      if (channel) await channel.delete('Influencer removido').catch(() => {});

      // Delete "Vim pelo X" role
      const memberRole = guild.roles.cache.get(influencer.member_role_id);
      if (memberRole) await memberRole.delete('Influencer removido').catch(() => {});

      // Remove from DB
      db.influencers.delete(guild.id, target.id);

      await interaction.editReply({
        ...cv2.reply([
          cv2.container([
            cv2.text(`## ✅ Influencer Removido`),
            cv2.sep(),
            cv2.text(`👤 **${target.user.tag}** foi removido como influencer.\nCanal e cargos deletados.`),
          ], cv2.COLORS.RED),
        ], true),
      });
    } catch (err) {
      console.error('[RemoveInfluencer] Erro:', err);
      await interaction.editReply({ content: `❌ Erro: ${err.message}` });
    }
  },
};

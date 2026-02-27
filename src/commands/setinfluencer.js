const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const db = require('../database/db');
const cv2 = require('../utils/cv2');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setinfluencer')
    .setDescription('Seta um membro como influencer')
    .addUserOption(opt =>
      opt.setName('membro').setDescription('O membro a ser setado como influencer').setRequired(true)
    ),

  async execute(interaction) {
    if (!(await isAdmin(interaction))) {
      return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('membro');
    const guild = interaction.guild;

    if (!target) {
      return interaction.editReply({ content: '❌ Membro não encontrado no servidor.' });
    }

    if (target.user.bot) {
      return interaction.editReply({ content: '❌ Não é possível setar um bot como influencer.' });
    }

    const existing = db.influencers.get(guild.id, target.id);
    if (existing) {
      return interaction.editReply({ content: `❌ **${target.user.username}** já é um influencer!` });
    }

    const config = db.config.get(guild.id);
    if (!config?.category_id) {
      return interaction.editReply({ content: '❌ Categoria dos influencers não configurada. Use `/painel` para configurar.' });
    }

    const created = { role: null, memberRole: null, channel: null };

    try {
      // 1. Cargo "Influencer"
      let influencerRole = guild.roles.cache.find(r => r.name === 'Influencer');
      if (!influencerRole) {
        influencerRole = await guild.roles.create({
          name: 'Influencer',
          color: 0xEB459E,
          reason: 'Cargo de Influencer criado pelo bot',
        });
        created.role = influencerRole;
      }

      await target.roles.add(influencerRole);

      // 2. Cargo "Vim pelo X"
      const memberRoleName = `Vim pelo ${target.user.username}`;
      let memberRole = guild.roles.cache.find(r => r.name === memberRoleName);
      if (!memberRole) {
        memberRole = await guild.roles.create({
          name: memberRoleName,
          color: 0x5865F2,
          reason: `Cargo de membros do influencer ${target.user.username}`,
        });
        created.memberRole = memberRole;
      }

      // 3. Permissões do canal
      const adminRoles = db.adminRoles.get(guild.id);
      const adminUsers = db.adminUsers.get(guild.id);

      const permOverwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: target.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
      ];

      for (const rid of adminRoles) {
        permOverwrites.push({ id: rid, allow: [PermissionFlagsBits.ViewChannel] });
      }
      for (const uid of adminUsers) {
        permOverwrites.push({ id: uid, allow: [PermissionFlagsBits.ViewChannel] });
      }

      // 4. Canal exclusivo
      const safeName = target.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'influencer';
      const channel = await guild.channels.create({
        name: `🎥-${safeName}`,
        type: ChannelType.GuildText,
        parent: config.category_id,
        permissionOverwrites: permOverwrites,
        reason: `Canal do influencer ${target.user.username}`,
      });
      created.channel = channel;

      // 5. Convite permanente no canal
      const invite = await channel.createInvite({
        maxAge: 0,
        maxUses: 0,
        unique: true,
        reason: `Convite principal do influencer ${target.user.username}`,
      });

      // 6. Salvar no banco
      db.influencers.insert({
        guild_id: guild.id,
        user_id: target.id,
        username: target.user.username,
        influencer_role_id: influencerRole.id,
        member_role_id: memberRole.id,
        channel_id: channel.id,
        invite_code: invite.code,
      });

      const infRecord = db.influencers.get(guild.id, target.id);
      db.invites.insert(guild.id, invite.code, infRecord.id);

      // 7. Mensagem fixa no canal
      const pinMsg = await channel.send({
        ...cv2.reply([
          cv2.container([
            cv2.text(`## 🎥 Canal Exclusivo — ${target.user.username}`),
            cv2.sep(),
            cv2.text(
              `Olá, **${target.user.username}**! Este é o seu canal exclusivo como influencer.\n\n` +
              `🔗 **Seu link de convite principal:**\nhttps://discord.gg/${invite.code}\n\n` +
              `📊 Use \`/statsme\` para ver suas estatísticas a qualquer momento.\n` +
              `✅ Todas as vendas de membros que entraram pelo seu link serão encaminhadas aqui.`
            ),
            cv2.sep(),
            cv2.row(
              cv2.linkBtn(`https://discord.gg/${invite.code}`, '🔗 Meu Link de Convite')
            ),
          ], cv2.COLORS.PINK),
        ]),
      });

      await pinMsg.pin().catch(() => {});

      // Resposta de sucesso
      await interaction.editReply({
        ...cv2.reply([
          cv2.container([
            cv2.text(`## ✅ Influencer Setado!`),
            cv2.sep(),
            cv2.text(
              `👤 **Membro:** ${target.user.tag}\n` +
              `🎭 **Cargo:** \`Influencer\`\n` +
              `🏷️ **Cargo dos convidados:** \`${memberRoleName}\`\n` +
              `📺 **Canal:** ${channel}\n` +
              `🔗 **Convite:** https://discord.gg/${invite.code}`
            ),
          ], cv2.COLORS.GREEN),
        ], true),
      });

    } catch (err) {
      console.error('[SetInfluencer] Erro:', err);

      // Rollback
      if (created.channel) await created.channel.delete().catch(() => {});
      if (created.memberRole) await created.memberRole.delete().catch(() => {});
      if (created.role) await created.role.delete().catch(() => {});

      await interaction.editReply({ content: `❌ Erro ao setar influencer: ${err.message}` });
    }
  },
};

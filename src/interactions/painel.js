const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const cv2 = require('../utils/cv2');

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMainPanel() {
  return cv2.reply([
    cv2.container([
      cv2.text('# ⚙️ Painel Administrativo\nGerencie configurações, influencers e feedbacks do servidor.'),
      cv2.sep(),
      cv2.text('Selecione uma opção abaixo:'),
      cv2.row(
        cv2.btn('painel:config', '⚙️ Configurações', cv2.BS.SECONDARY),
        cv2.btn('painel:stats:influencers', '📊 Stats Influencers', cv2.BS.PRIMARY),
        cv2.btn('painel:stats:feedbacks', '⭐ Stats Feedbacks', cv2.BS.SUCCESS),
      ),
    ], cv2.COLORS.BLURPLE),
  ], true);
}

function buildConfigPanel(guildId) {
  const config = db.config.get(guildId) ?? {};
  const adminRoles = db.adminRoles.get(guildId);
  const adminUsers = db.adminUsers.get(guildId);

  const rolesText = adminRoles.length > 0 ? adminRoles.map(r => `<@&${r}>`).join(', ') : 'Nenhum';
  const usersText = adminUsers.length > 0 ? adminUsers.map(u => `<@${u}>`).join(', ') : 'Nenhum';

  return cv2.reply([
    cv2.container([
      cv2.text('# ⚙️ Configurações'),
      cv2.sep(),
      cv2.text(
        `**📁 Categoria dos Influencers:** ${config.category_id ? `<#${config.category_id}>` : '❌ Não configurada'}\n` +
        `**📦 Canal de Entregas:** ${config.delivery_channel_id ? `<#${config.delivery_channel_id}>` : '❌ Não configurado'}\n` +
        `**⭐ Canal de Feedbacks:** ${config.feedback_channel_id ? `<#${config.feedback_channel_id}>` : '❌ Não configurado'}\n\n` +
        `**👥 Cargos Admin:** ${rolesText}\n` +
        `**🧑‍💼 Usuários Admin:** ${usersText}`
      ),
      cv2.sep(),
      cv2.text('**Canais e Categorias:**'),
      cv2.row(
        cv2.btn('painel:config:cat', '📁 Categoria', cv2.BS.SECONDARY),
        cv2.btn('painel:config:delivery', '📦 Canal de Entregas', cv2.BS.SECONDARY),
        cv2.btn('painel:config:feedback', '⭐ Canal de Feedbacks', cv2.BS.SECONDARY),
      ),
      cv2.sep(),
      cv2.text('**Permissões de Acesso:**'),
      cv2.row(
        cv2.btn('painel:config:addRole', '➕ Add Cargo Admin', cv2.BS.SECONDARY),
        cv2.btn('painel:config:addUser', '➕ Add Usuário Admin', cv2.BS.SECONDARY),
        cv2.btn('painel:config:removeRole', '➖ Rem. Cargo', cv2.BS.DANGER),
        cv2.btn('painel:config:removeUser', '➖ Rem. Usuário', cv2.BS.DANGER),
      ),
      cv2.sep(),
      cv2.row(cv2.btn('painel:main', '← Voltar', cv2.BS.SECONDARY)),
    ], cv2.COLORS.PINK),
  ], true);
}

function buildInfluencerList(guildId) {
  const influencers = db.influencers.getAll(guildId);

  if (influencers.length === 0) {
    return cv2.reply([
      cv2.container([
        cv2.text('# 📊 Estatísticas de Influencers\n\nNenhum influencer cadastrado.'),
        cv2.sep(),
        cv2.row(cv2.btn('painel:main', '← Voltar', cv2.BS.SECONDARY)),
      ], cv2.COLORS.GREEN),
    ], true);
  }

  const lines = influencers.map(inf => {
    const stats = db.members.getStats(inf.id);
    return `> 🎥 **${inf.username}** — 🟢 ${stats.active} | 🔴 ${stats.inactive} | 🟡 ${stats.reassigned} | 🛒 ${stats.total_purchases}`;
  });

  const selectOptions = influencers.map(inf =>
    cv2.option(inf.username, `painel:stats:influencer:${inf.id}`, { emoji: '🎥' })
  );

  return cv2.reply([
    cv2.container([
      cv2.text(`# 📊 Influencers (${influencers.length})\n\n${lines.join('\n')}`),
      cv2.sep(),
      cv2.text('> 🟢 Ativos | 🔴 Inativos | 🟡 Reatribuídos | 🛒 Compras'),
      cv2.sep(),
      cv2.row(
        cv2.select('painel:stats:influencer:select', [
          cv2.option('-- Selecionar Influencer --', 'none', { emoji: '📊' }),
          ...selectOptions,
        ], '👇 Selecionar um influencer...')
      ),
      cv2.row(cv2.btn('painel:main', '← Voltar', cv2.BS.SECONDARY)),
    ], cv2.COLORS.GREEN),
  ], true);
}

function buildInfluencerStats(influencer, guildId) {
  const stats = db.members.getStats(influencer.id);
  const activeInvites = db.invites.getActive(influencer.id);

  const inviteLinks = activeInvites.length > 0
    ? activeInvites.map(i => `🔗 https://discord.gg/${i.code}`).join('\n')
    : 'Nenhum convite ativo.';

  return cv2.reply([
    cv2.container([
      cv2.text(`# 🎥 ${influencer.username}`),
      cv2.sep(),
      cv2.text(
        `**📊 Estatísticas:**\n` +
        `👥 Total de membros: **${stats.total}**\n` +
        `🟢 Ativos: **${stats.active}**\n` +
        `🔴 Inativos: **${stats.inactive}**\n` +
        `🟡 Reatribuídos: **${stats.reassigned}**\n` +
        `🛒 Compras válidas: **${stats.total_purchases}**`
      ),
      cv2.sep(),
      cv2.text(`**🔗 Convites Ativos:**\n${inviteLinks}`),
      cv2.sep(),
      cv2.row(
        cv2.btn(`painel:stats:influencer:members:${influencer.id}:0`, '👥 Ver Membros', cv2.BS.PRIMARY),
        cv2.btn('painel:stats:influencers', '← Voltar', cv2.BS.SECONDARY),
      ),
    ], cv2.COLORS.BLURPLE),
  ], true);
}

function buildMemberList(influencer, page, isAdmin = true) {
  const total = db.members.getCount(influencer.id);
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const offset = page * 10;
  const members = db.members.getPage(influencer.id, offset);

  const lines = members.length > 0
    ? members.map(m => {
        const emoji = cv2.statusEmoji(m.status);
        const joined = cv2.tsDate(m.first_joined_at);
        const left = m.left_at ? ` | Saiu: ${cv2.tsDate(m.left_at)}` : '';
        return `${emoji} **${m.user_tag ?? m.user_id}** — 🛒 ${m.purchases} compras | Entrou: ${joined}${left}`;
      }).join('\n')
    : 'Nenhum membro encontrado.';

  const backId = isAdmin ? 'painel:stats:influencers' : `statsme:back:${influencer.id}`;
  const prevId = isAdmin ? `painel:stats:influencer:members:${influencer.id}:${page - 1}` : `statsme:members:${influencer.id}:${page - 1}`;
  const nextId = isAdmin ? `painel:stats:influencer:members:${influencer.id}:${page + 1}` : `statsme:members:${influencer.id}:${page + 1}`;

  const navBtns = [cv2.btn(backId, '← Voltar', cv2.BS.SECONDARY)];
  if (page > 0) navBtns.push(cv2.btn(prevId, '◀ Anterior', cv2.BS.SECONDARY));
  if (page + 1 < totalPages) navBtns.push(cv2.btn(nextId, 'Próxima ▶', cv2.BS.PRIMARY));

  return cv2.reply([
    cv2.container([
      cv2.text(`# 👥 Membros — ${influencer.username}\nPágina ${page + 1}/${totalPages} (${total} total)`),
      cv2.sep(),
      cv2.text(lines),
      cv2.sep(),
      cv2.row(...navBtns),
    ], cv2.COLORS.BLURPLE),
  ], true);
}

function buildFeedbackStats(guildId) {
  const stats = db.feedbacks.getStats(guildId);

  const bar = n => '█'.repeat(n ?? 0);
  const pct = n => stats.total > 0 ? `(${Math.round(((n ?? 0) / stats.total) * 100)}%)` : '(0%)';

  return cv2.reply([
    cv2.container([
      cv2.text(`# ⭐ Estatísticas de Feedbacks`),
      cv2.sep(),
      cv2.text(
        `📬 **Total:** ${stats.total ?? 0}\n` +
        `⭐ **Média:** ${stats.avg_stars ?? '—'}/5\n\n` +
        `⭐☆☆☆☆ 1 estrela: **${stats.s1 ?? 0}** ${pct(stats.s1)}\n` +
        `⭐⭐☆☆☆ 2 estrelas: **${stats.s2 ?? 0}** ${pct(stats.s2)}\n` +
        `⭐⭐⭐☆☆ 3 estrelas: **${stats.s3 ?? 0}** ${pct(stats.s3)}\n` +
        `⭐⭐⭐⭐☆ 4 estrelas: **${stats.s4 ?? 0}** ${pct(stats.s4)}\n` +
        `⭐⭐⭐⭐⭐ 5 estrelas: **${stats.s5 ?? 0}** ${pct(stats.s5)}`
      ),
      cv2.sep(),
      cv2.row(
        cv2.btn('painel:stats:feedbacks:delete', '🗑️ Apagar Feedbacks', cv2.BS.DANGER),
        cv2.btn('painel:main', '← Voltar', cv2.BS.SECONDARY),
      ),
    ], cv2.COLORS.YELLOW),
  ], true);
}

function buildDeleteFeedbacks(guildId) {
  return cv2.reply([
    cv2.container([
      cv2.text('# 🗑️ Apagar Feedbacks\n\nSelecione quais estrelas deseja apagar:'),
      cv2.sep(),
      cv2.row(
        cv2.select('painel:stats:feedbacks:delete:select', [
          cv2.option('⭐ 1 Estrela', '1', { emoji: '⭐' }),
          cv2.option('⭐⭐ 2 Estrelas', '2', { emoji: '⭐' }),
          cv2.option('⭐⭐⭐ 3 Estrelas', '3', { emoji: '⭐' }),
          cv2.option('⭐⭐⭐⭐ 4 Estrelas', '4', { emoji: '⭐' }),
        ], '🗑️ Selecionar estrelas para apagar...')
      ),
      cv2.row(cv2.btn('painel:stats:feedbacks', '← Voltar', cv2.BS.SECONDARY)),
    ], cv2.COLORS.RED),
  ], true);
}

function buildDeleteConfirm(stars, guildId) {
  const count = db.feedbacks.getByStars(guildId, parseInt(stars)).length;
  return cv2.reply([
    cv2.container([
      cv2.text(`# ⚠️ Confirmar Exclusão\n\nVocê está prestes a apagar **${count} feedbacks** de ${cv2.starsStr(parseInt(stars))} (${stars} estrela${stars > 1 ? 's' : ''}).\n\nEsta ação **não pode ser desfeita**.`),
      cv2.sep(),
      cv2.row(
        cv2.btn(`painel:stats:feedbacks:delete:confirm:${stars}`, '✅ Confirmar', cv2.BS.DANGER),
        cv2.btn('painel:stats:feedbacks:delete', '❌ Cancelar', cv2.BS.SECONDARY),
      ),
    ], cv2.COLORS.RED),
  ], true);
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handle(interaction) {
  if (!(await isAdmin(interaction))) {
    return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
  }

  const id = interaction.customId;
  const parts = id.split(':');

  // ── Modal submits ──────────────────────────────────────────────────────────
  if (interaction.isModalSubmit()) {
    const sub = parts[1];
    const guildId = interaction.guild.id;

    if (sub === 'cat') {
      const val = interaction.fields.getTextInputValue('value').trim();
      const ch = interaction.guild.channels.cache.get(val);
      if (!ch) return interaction.reply({ content: '❌ Categoria não encontrada.', ephemeral: true });
      db.config.upsert({ guild_id: guildId, category_id: val, delivery_channel_id: null, feedback_channel_id: null });
      await interaction.update(buildConfigPanel(guildId));
    } else if (sub === 'delivery') {
      const val = interaction.fields.getTextInputValue('value').trim();
      const ch = interaction.guild.channels.cache.get(val);
      if (!ch) return interaction.reply({ content: '❌ Canal não encontrado.', ephemeral: true });
      db.config.upsert({ guild_id: guildId, category_id: null, delivery_channel_id: val, feedback_channel_id: null });
      await interaction.update(buildConfigPanel(guildId));
    } else if (sub === 'feedback') {
      const val = interaction.fields.getTextInputValue('value').trim();
      const ch = interaction.guild.channels.cache.get(val);
      if (!ch) return interaction.reply({ content: '❌ Canal não encontrado.', ephemeral: true });
      db.config.upsert({ guild_id: guildId, category_id: null, delivery_channel_id: null, feedback_channel_id: val });
      await interaction.update(buildConfigPanel(guildId));
    } else if (sub === 'addRole') {
      const val = interaction.fields.getTextInputValue('value').trim();
      db.adminRoles.add(guildId, val);
      await interaction.update(buildConfigPanel(guildId));
    } else if (sub === 'addUser') {
      const val = interaction.fields.getTextInputValue('value').trim();
      db.adminUsers.add(guildId, val);
      await interaction.update(buildConfigPanel(guildId));
    }
    return;
  }

  // ── Button / Select ────────────────────────────────────────────────────────
  const action = parts[1];

  if (action === 'main') {
    return interaction.update(buildMainPanel());
  }

  if (action === 'config') {
    const sub = parts[2];

    if (!sub) return interaction.update(buildConfigPanel(interaction.guild.id));

    if (sub === 'cat' || sub === 'delivery' || sub === 'feedback' || sub === 'addRole' || sub === 'addUser') {
      const labels = {
        cat: 'ID da Categoria',
        delivery: 'ID do Canal de Entregas',
        feedback: 'ID do Canal de Feedbacks',
        addRole: 'ID do Cargo Admin',
        addUser: 'ID do Usuário Admin',
      };
      const modal = new ModalBuilder()
        .setCustomId(`painel:${sub}`)
        .setTitle('Configuração')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('value')
              .setLabel(labels[sub])
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Cole o ID aqui...')
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    if (sub === 'removeRole') {
      const roles = db.adminRoles.get(interaction.guild.id);
      if (roles.length === 0) {
        return interaction.reply({ content: 'Nenhum cargo admin cadastrado.', ephemeral: true });
      }
      return interaction.update(cv2.reply([
        cv2.container([
          cv2.text('# ➖ Remover Cargo Admin\nSelecione o cargo a remover:'),
          cv2.sep(),
          cv2.row(
            cv2.select('painel:config:doRemoveRole', roles.map(r =>
              cv2.option(`<@&${r}>`, r, { description: r })
            ), 'Selecionar cargo...')
          ),
          cv2.row(cv2.btn('painel:config', '← Voltar', cv2.BS.SECONDARY)),
        ], cv2.COLORS.RED),
      ], true));
    }

    if (sub === 'removeUser') {
      const users = db.adminUsers.get(interaction.guild.id);
      if (users.length === 0) {
        return interaction.reply({ content: 'Nenhum usuário admin cadastrado.', ephemeral: true });
      }
      return interaction.update(cv2.reply([
        cv2.container([
          cv2.text('# ➖ Remover Usuário Admin\nSelecione o usuário a remover:'),
          cv2.sep(),
          cv2.row(
            cv2.select('painel:config:doRemoveUser', users.map(u =>
              cv2.option(`<@${u}>`, u, { description: u })
            ), 'Selecionar usuário...')
          ),
          cv2.row(cv2.btn('painel:config', '← Voltar', cv2.BS.SECONDARY)),
        ], cv2.COLORS.RED),
      ], true));
    }

    if (sub === 'doRemoveRole') {
      const val = interaction.values[0];
      db.adminRoles.remove(interaction.guild.id, val);
      return interaction.update(buildConfigPanel(interaction.guild.id));
    }

    if (sub === 'doRemoveUser') {
      const val = interaction.values[0];
      db.adminUsers.remove(interaction.guild.id, val);
      return interaction.update(buildConfigPanel(interaction.guild.id));
    }

    return interaction.update(buildConfigPanel(interaction.guild.id));
  }

  if (action === 'stats') {
    const sub = parts[2];

    if (sub === 'influencers') {
      return interaction.update(buildInfluencerList(interaction.guild.id));
    }

    if (sub === 'influencer') {
      const subsub = parts[3];

      // Select menu route
      if (subsub === 'select') {
        const val = interaction.values[0];
        if (val === 'none') return interaction.update(buildInfluencerList(interaction.guild.id));
        const [, , , infId] = val.split(':');
        const inf = db.influencers.getById(infId);
        if (!inf) return interaction.reply({ content: '❌ Influencer não encontrado.', ephemeral: true });
        return interaction.update(buildInfluencerStats(inf, interaction.guild.id));
      }

      // Direct ID route: painel:stats:influencer:{id}
      const infId = subsub;

      if (parts[4] === 'members') {
        const page = parseInt(parts[5] ?? '0') || 0;
        const inf = db.influencers.getById(infId);
        if (!inf) return interaction.reply({ content: '❌ Influencer não encontrado.', ephemeral: true });
        return interaction.update(buildMemberList(inf, page, true));
      }

      const inf = db.influencers.getById(infId);
      if (!inf) return interaction.reply({ content: '❌ Influencer não encontrado.', ephemeral: true });
      return interaction.update(buildInfluencerStats(inf, interaction.guild.id));
    }

    if (sub === 'feedbacks') {
      const subsub = parts[3];

      if (!subsub) return interaction.update(buildFeedbackStats(interaction.guild.id));

      if (subsub === 'delete') {
        const action2 = parts[4];

        if (!action2) return interaction.update(buildDeleteFeedbacks(interaction.guild.id));

        if (action2 === 'select') {
          const stars = interaction.values[0];
          return interaction.update(buildDeleteConfirm(stars, interaction.guild.id));
        }

        if (action2 === 'confirm') {
          const stars = parseInt(parts[5]);
          db.feedbacks.deleteByStars(interaction.guild.id, stars);
          return interaction.update(buildFeedbackStats(interaction.guild.id));
        }
      }
    }
  }
}

async function showMain(interaction, asReply = false) {
  const data = buildMainPanel();
  if (asReply) return interaction.reply(data);
  return interaction.update(data);
}

module.exports = { handle, showMain, buildInfluencerStats, buildMemberList };

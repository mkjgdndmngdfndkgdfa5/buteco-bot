const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');
const cv2 = require('../utils/cv2');

// ── Send DM feedback request ──────────────────────────────────────────────────

async function cv2DeliveryForward(client, guildId, user, feedbackChannelId) {
  try {
    // Sistema de feedback "stateless" para evitar erros de expiração.
    // O registro no banco só é criado quando o usuário clica em uma estrela.

    console.log(`[Feedback] Abrindo DM com ${user.tag}...`);
    const dmChannel = await user.createDM().catch(e => {
      console.error(`[Feedback] Erro ao abrir DM: ${e.message}`);
      return null;
    });

    if (!dmChannel) {
      console.log(`[Feedback] DM fechada ou erro ao abrir com ${user.tag}.`);
      return;
    }

    console.log(`[Feedback] Enviando botões de feedback para ${user.tag}...`);
    const ok = await dmChannel.send({
      ...cv2.reply([
        cv2.container([
          cv2.text(
            `## ⭐ Como foi sua compra?\n\n` +
            `Olá, **${user.username}**! Recebemos uma entrega para você.\n` +
            `Nos ajude avaliando sua experiência com uma nota de 1 a 5 estrelas:`
          ),
          cv2.sep(),
          cv2.row(
            cv2.btn(`fb:star:${guildId}:1`, '⭐ 1', cv2.BS.SECONDARY),
            cv2.btn(`fb:star:${guildId}:2`, '⭐⭐ 2', cv2.BS.SECONDARY),
            cv2.btn(`fb:star:${guildId}:3`, '⭐⭐⭐ 3', cv2.BS.SECONDARY),
            cv2.btn(`fb:star:${guildId}:4`, '⭐⭐⭐⭐ 4', cv2.BS.SECONDARY),
          ),
          cv2.row(
            cv2.btn(`fb:star:${guildId}:5`, '⭐⭐⭐⭐⭐ 5', cv2.BS.SUCCESS),
          ),
        ], cv2.COLORS.YELLOW),
      ]),
    }).then(() => {
      console.log(`[Feedback] DM enviada com sucesso para ${user.tag}!`);
      return true;
    }).catch(e => {
      console.error(`[Feedback] Erro ao enviar DM: ${e.message}`);
      return false;
    });

    if (!ok) return;
  } catch (e) {
    console.error('[Feedback] Erro fatal no cv2DeliveryForward:', e.stack);
  }
}

// ── Publish feedback to channel ───────────────────────────────────────────────

async function publishFeedback(client, guildId, user, stars, comment, feedbackChannelId) {
  if (!feedbackChannelId) return;

  try {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const channel = guild.channels.cache.get(feedbackChannelId);
    if (!channel) return;

    const starsDisplay = cv2.starsStr(stars);
    const commentText = comment ? `\n\n💬 *"${comment}"*` : '';
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const msg = await channel.send({
      ...cv2.reply([
        cv2.container([
          cv2.text(
            `## ${starsDisplay} — ${stars}/5 estrelas${commentText}\n\n` +
            `👤 **${user.tag}**\n` +
            `📅 ${now}`
          ),
        ], stars >= 4 ? cv2.COLORS.GREEN : stars === 3 ? cv2.COLORS.YELLOW : cv2.COLORS.RED),
      ]),
    });

    db.feedbacks.insert({
      guild_id: guildId,
      user_id: user.id,
      username: user.tag,
      stars,
      comment: comment ?? null,
      message_id: msg.id,
    });
  } catch (e) {
    console.error('[Feedback] Erro ao publicar feedback:', e.message);
  }
}

// ── Interaction handler ───────────────────────────────────────────────────────

async function handle(interaction, client) {
  const parts = interaction.customId.split(':');
  const action = parts[1];

  // ── Star clicked ──────────────────────────────────────────────────────────
  if (action === 'star') {
    const guildId = parts[2];
    const stars = parseInt(parts[3]);

    console.log(`[Feedback] Usuário ${interaction.user.tag} selecionou ${stars} estrelas.`);

    return interaction.update({
      ...cv2.reply([
        cv2.container([
          cv2.text(`## Você avaliou com ${cv2.starsStr(stars)} (${stars}/5)\n\nDeseja adicionar um comentário?`),
          cv2.sep(),
          cv2.row(
            cv2.btn(`fb:comment:${guildId}:${stars}`, '📝 Adicionar Comentário', cv2.BS.PRIMARY),
          ),
        ], cv2.COLORS.YELLOW),
      ]),
    });
  }

  // ── Comment button ────────────────────────────────────────────────────────
  if (action === 'comment') {
    const guildId = parts[2];
    const stars = parts[3];

    const modal = new ModalBuilder()
      .setCustomId(`fb:modal:${guildId}:${stars}`)
      .setTitle('Comentário (opcional)')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('comment')
            .setLabel('Deixe seu comentário')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Conte como foi sua experiência...')
            .setRequired(false)
            .setMaxLength(500)
        )
      );
    return interaction.showModal(modal);
  }

  // ── Modal submit (comment) ────────────────────────────────────────────────
  if (action === 'modal') {
    const guildId = parts[2];
    const stars = parseInt(parts[3]);
    const comment = interaction.fields.getTextInputValue('comment').trim() || null;

    console.log(`[Feedback] Modal recebido de ${interaction.user.tag}: ${stars} estrelas.`);

    const config = db.config.get(guildId);
    await publishFeedback(client, guildId, interaction.user, stars, comment, config?.feedback_channel_id);

    return interaction.reply({
      ...cv2.reply([
        cv2.container([
          cv2.text(`## ✅ Feedback Enviado!\n\nObrigado pela avaliação, **${interaction.user.username}**!\n${cv2.starsStr(stars)} — ${stars}/5`),
        ], cv2.COLORS.GREEN),
      ]),
    });
  }

  // ── Skip (no comment) ─────────────────────────────────────────────────────
  if (action === 'skip') {
    const guildId = parts[2];
    const stars = parseInt(parts[3]);

    console.log(`[Feedback] Feedback sem comentário de ${interaction.user.tag}: ${stars} estrelas.`);

    const config = db.config.get(guildId);
    await publishFeedback(client, guildId, interaction.user, stars, null, config?.feedback_channel_id);

    return interaction.update({
      ...cv2.reply([
        cv2.container([
          cv2.text(`## ✅ Feedback Enviado!\n\nObrigado pela avaliação, **${interaction.user.username}**!\n${cv2.starsStr(stars)} — ${stars}/5`),
        ], cv2.COLORS.GREEN),
      ]),
    });
  }
}

module.exports = { handle, cv2DeliveryForward, publishFeedback };

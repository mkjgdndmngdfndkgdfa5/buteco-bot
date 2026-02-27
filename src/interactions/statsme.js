const db = require('../database/db');
const cv2 = require('../utils/cv2');

function buildStats(influencer) {
  const stats = db.members.getStats(influencer.id);
  const activeInvites = db.invites.getActive(influencer.id);

  const inviteLinks = activeInvites.length > 0
    ? activeInvites.map(i => `🔗 https://discord.gg/${i.code}`).join('\n')
    : 'Nenhum convite ativo.';

  return cv2.reply([
    cv2.container([
      cv2.text(`# 📊 Minhas Estatísticas\nOlá, **${influencer.username}**!`),
      cv2.sep(),
      cv2.text(
        `**👥 Membros convidados:** ${stats.total}\n` +
        `🟢 Ativos: **${stats.active}**\n` +
        `🔴 Inativos: **${stats.inactive}**\n` +
        `🟡 Reatribuídos: **${stats.reassigned}**\n` +
        `🛒 Compras válidas: **${stats.total_purchases}**`
      ),
      cv2.sep(),
      cv2.text(`**🔗 Seus Convites Ativos:**\n${inviteLinks}`),
      cv2.sep(),
      cv2.row(
        cv2.btn(`statsme:members:${influencer.id}:0`, '👥 Ver Membros', cv2.BS.PRIMARY),
      ),
    ], cv2.COLORS.PINK),
  ], true);
}

function buildMemberList(influencer, page) {
  const total = db.members.getCount(influencer.id);
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const offset = page * 10;
  const members = db.members.getPage(influencer.id, offset);

  const lines = members.length > 0
    ? members.map(m => {
        const emoji = cv2.statusEmoji(m.status);
        const joined = cv2.tsDate(m.first_joined_at);
        const left = m.left_at ? ` | Saiu: ${cv2.tsDate(m.left_at)}` : '';
        return `${emoji} **${m.user_tag ?? m.user_id}** — 🛒 ${m.purchases} | Entrou: ${joined}${left}`;
      }).join('\n')
    : 'Nenhum membro ainda.';

  const navBtns = [cv2.btn(`statsme:back:${influencer.id}`, '← Voltar', cv2.BS.SECONDARY)];
  if (page > 0) navBtns.push(cv2.btn(`statsme:members:${influencer.id}:${page - 1}`, '◀ Anterior', cv2.BS.SECONDARY));
  if (page + 1 < totalPages) navBtns.push(cv2.btn(`statsme:members:${influencer.id}:${page + 1}`, 'Próxima ▶', cv2.BS.PRIMARY));

  return cv2.reply([
    cv2.container([
      cv2.text(`# 👥 Meus Membros\nPágina ${page + 1}/${totalPages} (${total} total)`),
      cv2.sep(),
      cv2.text(lines),
      cv2.sep(),
      cv2.row(...navBtns),
    ], cv2.COLORS.BLURPLE),
  ], true);
}

async function handle(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[1];

  const influencer = db.influencers.get(interaction.guild.id, interaction.user.id);
  if (!influencer) {
    return interaction.update(cv2.reply([
      cv2.container([cv2.text('❌ Você não é um influencer neste servidor.')], cv2.COLORS.RED),
    ], true));
  }

  if (action === 'back') {
    return interaction.update(buildStats(influencer));
  }

  if (action === 'members') {
    const page = parseInt(parts[3] ?? '0') || 0;
    return interaction.update(buildMemberList(influencer, page));
  }
}

async function showStats(interaction, influencer, asReply = false) {
  const data = buildStats(influencer);
  if (asReply) return interaction.reply(data);
  return interaction.update(data);
}

module.exports = { handle, showStats };

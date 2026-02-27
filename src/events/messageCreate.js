const db = require('../database/db');
const { cv2DeliveryForward } = require('../interactions/feedback');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const config = db.config.get(message.guild.id);
    if (!config?.delivery_channel_id) return;
    if (message.channel.id !== config.delivery_channel_id) return;

    const mentions = message.mentions.users;
    if (!mentions || mentions.size === 0) return;

    for (const [, user] of mentions) {
      console.log(`[Delivery] Processando menção para: ${user.tag} (${user.id})`);
      const activeRecord = db.members.getActive(message.guild.id, user.id);
      
      // 1. Encaminhar para o canal do influencer (se existir vínculo)
      if (activeRecord) {
        console.log(`[Delivery] Vínculo encontrado: Influencer ID ${activeRecord.influencer_id}`);
        const influencer = db.influencers.getById(activeRecord.influencer_id);
        if (influencer) {
          const infChannel = message.guild.channels.cache.get(influencer.channel_id);
          if (infChannel) {
            try {
              const attachments = [...message.attachments.values()].map(a => a.url);
              let forwardContent = `**Nova compra!** 🛒\n👤 ${user} (${user.tag})\n\n`;
              if (message.content) forwardContent += message.content + '\n';
              if (attachments.length > 0) forwardContent += attachments.join('\n');

              await infChannel.send({ content: forwardContent });
              console.log(`[Delivery] Mensagem encaminhada para o canal: ${infChannel.name}`);
            } catch (e) {
              console.error('[Delivery] Erro ao encaminhar mensagem:', e.message);
            }
          } else {
            console.log(`[Delivery] Canal do influencer não encontrado: ${influencer.channel_id}`);
          }
        }
        // Incrementar compras apenas se houver registro de membro
        db.members.incrPurchases(message.guild.id, user.id);
        console.log(`[Delivery] Compra incrementada para o membro.`);
      } else {
        console.log(`[Delivery] Nenhum vínculo de influencer encontrado para ${user.tag}.`);
      }

      // 2. SEMPRE enviar DM de feedback (mesmo sem influencer)
      console.log(`[Delivery] Tentando enviar DM de feedback para ${user.tag}...`);
      await cv2DeliveryForward(client, message.guild.id, user, config.feedback_channel_id);
    }
  },
};

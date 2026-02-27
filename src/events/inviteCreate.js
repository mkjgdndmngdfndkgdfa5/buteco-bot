const inviteCache = require('../utils/inviteCache');

module.exports = {
  name: 'inviteCreate',
  async execute(invite) {
    const db = require('../database/db');
    inviteCache.addInvite(invite.guild.id, invite.code, invite.uses, invite.maxUses, invite.inviter?.id);

    if (!invite.inviter) return;

    const guild = invite.guild;
    const creator = await guild.members.fetch(invite.inviter.id).catch(() => null);
    if (!creator) return;

    const influencer = db.influencers.get(guild.id, invite.inviter.id);
    if (!influencer) return;

    db.invites.insert(guild.id, invite.code, influencer.id);
    console.log(`[Invites] Convite manual ${invite.code} associado ao influencer ${invite.inviter.tag}`);
  },
};

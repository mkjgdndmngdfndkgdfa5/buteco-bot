const db = require('../database/db');
const inviteCache = require('../utils/inviteCache');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const guild = member.guild;
    const cached = inviteCache.getGuild(guild.id);

    let usedCode = null;

    try {
      const currentInvites = await guild.invites.fetch();

      // Find invite with increased uses
      for (const [code, inv] of currentInvites) {
        const old = cached.get(code);
        if (old && inv.uses > old.uses) {
          usedCode = code;
          break;
        }
      }

      // Check for invite that disappeared (hit max uses)
      if (!usedCode) {
        for (const [code, old] of cached) {
          if (!currentInvites.has(code) && old.maxUses > 0 && old.uses + 1 >= old.maxUses) {
            usedCode = code;
            break;
          }
        }
      }

      // Update cache
      const newMap = new Map();
      for (const [code, inv] of currentInvites) {
        newMap.set(code, { uses: inv.uses ?? 0, maxUses: inv.maxUses ?? 0, inviterId: inv.inviter?.id });
      }
      inviteCache.setGuild(guild.id, newMap);
    } catch (e) {
      console.error('[MemberAdd] Erro ao buscar convites:', e.message);
      return;
    }

    if (!usedCode) return;

    const inviteRecord = db.invites.getByCode(guild.id, usedCode);
    if (!inviteRecord) return;

    const influencer = db.influencers.getById(inviteRecord.influencer_id);
    if (!influencer) return;

    // Apply "Vim pelo X" role
    try {
      await member.roles.add(influencer.member_role_id);
    } catch (e) {
      console.error('[MemberAdd] Erro ao aplicar cargo:', e.message);
    }

    // Mark other influencer records as REASSIGNED (if they were INACTIVE)
    db.members.setReassigned(guild.id, member.id, influencer.id);

    // Upsert member record for this influencer
    db.members.upsert({
      guild_id: guild.id,
      user_id: member.id,
      user_tag: member.user.tag,
      influencer_id: influencer.id,
    });

    // History
    db.history.insert(guild.id, member.id, influencer.id, 'join');

    console.log(`[MemberAdd] ${member.user.tag} entrou via convite de ${influencer.username}`);
  },
};

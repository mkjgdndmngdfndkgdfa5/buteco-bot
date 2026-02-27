// Invite cache: Map<guildId, Map<code, {uses, maxUses, inviterId}>>
const cache = new Map();

async function loadGuild(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    for (const [code, inv] of invites) {
      map.set(code, { uses: inv.uses ?? 0, maxUses: inv.maxUses ?? 0, inviterId: inv.inviter?.id });
    }
    cache.set(guild.id, map);
  } catch (e) {
    console.error(`[InviteCache] Erro ao carregar convites de ${guild.name}:`, e.message);
  }
}

function getGuild(guildId) {
  return cache.get(guildId) ?? new Map();
}

function setGuild(guildId, map) {
  cache.set(guildId, map);
}

function addInvite(guildId, code, uses, maxUses, inviterId) {
  const map = cache.get(guildId) ?? new Map();
  map.set(code, { uses: uses ?? 0, maxUses: maxUses ?? 0, inviterId });
  cache.set(guildId, map);
}

function removeInvite(guildId, code) {
  const map = cache.get(guildId);
  if (map) map.delete(code);
}

module.exports = { loadGuild, getGuild, setGuild, addInvite, removeInvite };

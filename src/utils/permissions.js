const db = require('../database/db');

async function isAdmin(interaction) {
  const { guild, member } = interaction;
  if (!guild || !member) return false;

  if (member.permissions.has('Administrator')) return true;

  const adminRoles = db.adminRoles.get(guild.id);
  if (member.roles.cache.some(r => adminRoles.includes(r.id))) return true;

  const adminUsers = db.adminUsers.get(guild.id);
  if (adminUsers.includes(member.id)) return true;

  return false;
}

module.exports = { isAdmin };

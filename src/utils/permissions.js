const db = require('../database/db');

function getEnvAdmins() {
  const ids = process.env.ADMIN_USER_IDS || '';
  return ids.split(',').map(id => id.trim()).filter(Boolean);
}

async function isAdmin(interaction) {
  const { guild, member } = interaction;
  if (!guild || !member) return false;

  // Verifica se o usuário está na lista do .env
  const envAdmins = getEnvAdmins();
  if (envAdmins.includes(member.id)) return true;

  // Verifica se o usuário está na lista do banco
  const adminUsers = db.adminUsers.get(guild.id);
  if (adminUsers.includes(member.id)) return true;

  // Verifica se o usuário tem cargo admin do bot
  const adminRoles = db.adminRoles.get(guild.id);
  if (member.roles.cache.some(r => adminRoles.includes(r.id))) return true;

  return false;
}

module.exports = { isAdmin };

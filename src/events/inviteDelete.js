const inviteCache = require('../utils/inviteCache');
const db = require('../database/db');

module.exports = {
  name: 'inviteDelete',
  async execute(invite) {
    inviteCache.removeInvite(invite.guild.id, invite.code);
    db.invites.deactivate(invite.guild.id, invite.code);
  },
};

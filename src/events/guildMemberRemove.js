const db = require('../database/db');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const activeRecord = db.members.getActive(member.guild.id, member.id);
    db.members.setInactive(member.guild.id, member.id);
    if (activeRecord) {
      db.history.insert(member.guild.id, member.id, activeRecord.influencer_id, 'leave');
    }
  },
};

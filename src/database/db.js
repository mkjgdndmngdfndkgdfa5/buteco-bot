const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'bot.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS config (
  guild_id TEXT PRIMARY KEY,
  category_id TEXT,
  delivery_channel_id TEXT,
  feedback_channel_id TEXT
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  UNIQUE(guild_id, role_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  UNIQUE(guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS influencers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  influencer_role_id TEXT,
  member_role_id TEXT,
  channel_id TEXT,
  invite_code TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  code TEXT NOT NULL,
  influencer_id INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
  UNIQUE(guild_id, code)
);

CREATE TABLE IF NOT EXISTS member_influencer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_tag TEXT,
  influencer_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  purchases INTEGER DEFAULT 0,
  first_joined_at INTEGER DEFAULT (strftime('%s', 'now')),
  last_joined_at INTEGER DEFAULT (strftime('%s', 'now')),
  left_at INTEGER,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
  UNIQUE(guild_id, user_id, influencer_id)
);

CREATE TABLE IF NOT EXISTS member_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  influencer_id INTEGER,
  action TEXT,
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  stars INTEGER NOT NULL,
  comment TEXT,
  message_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS feedback_pending (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stars INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  influencer_id INTEGER NOT NULL,
  member_user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
);
`);

const stmts = {
  configGet: db.prepare('SELECT * FROM config WHERE guild_id = ?'),
  configUpsert: db.prepare(`
    INSERT INTO config (guild_id, category_id, delivery_channel_id, feedback_channel_id)
    VALUES (@guild_id, @category_id, @delivery_channel_id, @feedback_channel_id)
    ON CONFLICT(guild_id) DO UPDATE SET
      category_id = COALESCE(@category_id, category_id),
      delivery_channel_id = COALESCE(@delivery_channel_id, delivery_channel_id),
      feedback_channel_id = COALESCE(@feedback_channel_id, feedback_channel_id)
  `),

  adminRolesGet: db.prepare('SELECT role_id FROM admin_roles WHERE guild_id = ?'),
  adminRolesAdd: db.prepare('INSERT OR IGNORE INTO admin_roles (guild_id, role_id) VALUES (?, ?)'),
  adminRolesDel: db.prepare('DELETE FROM admin_roles WHERE guild_id = ? AND role_id = ?'),
  adminUsersGet: db.prepare('SELECT user_id FROM admin_users WHERE guild_id = ?'),
  adminUsersAdd: db.prepare('INSERT OR IGNORE INTO admin_users (guild_id, user_id) VALUES (?, ?)'),
  adminUsersDel: db.prepare('DELETE FROM admin_users WHERE guild_id = ? AND user_id = ?'),

  infGet: db.prepare('SELECT * FROM influencers WHERE guild_id = ? AND user_id = ?'),
  infGetById: db.prepare('SELECT * FROM influencers WHERE id = ?'),
  infGetAll: db.prepare('SELECT * FROM influencers WHERE guild_id = ?'),
  infInsert: db.prepare(`
    INSERT INTO influencers (guild_id, user_id, username, influencer_role_id, member_role_id, channel_id, invite_code)
    VALUES (@guild_id, @user_id, @username, @influencer_role_id, @member_role_id, @channel_id, @invite_code)
  `),
  infDelete: db.prepare('DELETE FROM influencers WHERE guild_id = ? AND user_id = ?'),

  invGetByCode: db.prepare(`
    SELECT i.*, inf.user_id as influencer_user_id
    FROM invites i JOIN influencers inf ON i.influencer_id = inf.id
    WHERE i.guild_id = ? AND i.code = ?
  `),
  invGetActive: db.prepare('SELECT * FROM invites WHERE influencer_id = ? AND is_active = 1'),
  invInsert: db.prepare('INSERT OR IGNORE INTO invites (guild_id, code, influencer_id) VALUES (?, ?, ?)'),
  invDeactivate: db.prepare('UPDATE invites SET is_active = 0 WHERE guild_id = ? AND code = ?'),

  miGet: db.prepare('SELECT * FROM member_influencer WHERE guild_id = ? AND user_id = ? AND influencer_id = ?'),
  miGetActive: db.prepare(`
    SELECT mi.*, inf.user_id as inf_user_id, inf.channel_id as inf_channel_id, inf.member_role_id as inf_member_role_id, inf.username as inf_username
    FROM member_influencer mi
    JOIN influencers inf ON mi.influencer_id = inf.id
    WHERE mi.guild_id = ? AND mi.user_id = ? AND mi.status = 'active'
  `),
  miGetByInfluencer: db.prepare('SELECT * FROM member_influencer WHERE influencer_id = ? ORDER BY last_joined_at DESC'),
  miGetPage: db.prepare('SELECT * FROM member_influencer WHERE influencer_id = ? ORDER BY last_joined_at DESC LIMIT 10 OFFSET ?'),
  miGetCount: db.prepare('SELECT COUNT(*) as count FROM member_influencer WHERE influencer_id = ?'),
  miUpsert: db.prepare(`
    INSERT INTO member_influencer (guild_id, user_id, user_tag, influencer_id, status, last_joined_at, left_at)
    VALUES (@guild_id, @user_id, @user_tag, @influencer_id, 'active', strftime('%s', 'now'), NULL)
    ON CONFLICT(guild_id, user_id, influencer_id) DO UPDATE SET
      status = 'active', last_joined_at = strftime('%s', 'now'), left_at = NULL, user_tag = @user_tag
  `),
  miSetInactive: db.prepare(`
    UPDATE member_influencer SET status = 'inactive', left_at = strftime('%s', 'now')
    WHERE guild_id = ? AND user_id = ? AND status = 'active'
  `),
  miSetReassigned: db.prepare(`
    UPDATE member_influencer SET status = 'reassigned'
    WHERE guild_id = ? AND user_id = ? AND influencer_id != ? AND status = 'inactive'
  `),
  miIncrPurchases: db.prepare(`
    UPDATE member_influencer SET purchases = purchases + 1
    WHERE guild_id = ? AND user_id = ? AND status = 'active'
  `),
  miStats: db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
      SUM(CASE WHEN status = 'reassigned' THEN 1 ELSE 0 END) as reassigned,
      COALESCE(SUM(purchases), 0) as total_purchases
    FROM member_influencer WHERE influencer_id = ?
  `),

  histInsert: db.prepare('INSERT INTO member_history (guild_id, user_id, influencer_id, action) VALUES (?, ?, ?, ?)'),
  histGet: db.prepare('SELECT * FROM member_history WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 20'),

  fbInsert: db.prepare('INSERT INTO feedbacks (guild_id, user_id, username, stars, comment, message_id) VALUES (@guild_id, @user_id, @username, @stars, @comment, @message_id)'),
  fbStats: db.prepare(`
    SELECT COUNT(*) as total, ROUND(AVG(CAST(stars AS REAL)), 2) as avg_stars,
      SUM(CASE WHEN stars=1 THEN 1 ELSE 0 END) as s1,
      SUM(CASE WHEN stars=2 THEN 1 ELSE 0 END) as s2,
      SUM(CASE WHEN stars=3 THEN 1 ELSE 0 END) as s3,
      SUM(CASE WHEN stars=4 THEN 1 ELSE 0 END) as s4,
      SUM(CASE WHEN stars=5 THEN 1 ELSE 0 END) as s5
    FROM feedbacks WHERE guild_id = ?
  `),
  fbGetByStars: db.prepare('SELECT * FROM feedbacks WHERE guild_id = ? AND stars = ?'),
  fbDelByStars: db.prepare('DELETE FROM feedbacks WHERE guild_id = ? AND stars = ?'),
  fbDelById: db.prepare('DELETE FROM feedbacks WHERE id = ?'),

  fpInsert: db.prepare('INSERT INTO feedback_pending (guild_id, user_id) VALUES (?, ?)'),
  fpGet: db.prepare('SELECT * FROM feedback_pending WHERE id = ?'),
  fpGetByUser: db.prepare('SELECT * FROM feedback_pending WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1'),
  fpSetStars: db.prepare('UPDATE feedback_pending SET stars = ? WHERE id = ?'),
  fpDelete: db.prepare('DELETE FROM feedback_pending WHERE id = ?'),
  
  purInsert: db.prepare('INSERT INTO purchases (guild_id, influencer_id, member_user_id, amount) VALUES (?, ?, ?, ?)'),
  purSumByInfluencer: db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM purchases WHERE guild_id = ? AND influencer_id = ?'),
  purListByInfluencer: db.prepare('SELECT * FROM purchases WHERE guild_id = ? AND influencer_id = ? ORDER BY created_at DESC LIMIT 50'),
};

module.exports = {
  raw: db,

  config: {
    get: g => stmts.configGet.get(g),
    upsert: data => stmts.configUpsert.run(data),
  },

  adminRoles: {
    get: g => stmts.adminRolesGet.all(g).map(r => r.role_id),
    add: (g, r) => stmts.adminRolesAdd.run(g, r),
    remove: (g, r) => stmts.adminRolesDel.run(g, r),
  },

  adminUsers: {
    get: g => stmts.adminUsersGet.all(g).map(u => u.user_id),
    add: (g, u) => stmts.adminUsersAdd.run(g, u),
    remove: (g, u) => stmts.adminUsersDel.run(g, u),
  },

  influencers: {
    get: (g, u) => stmts.infGet.get(g, u),
    getById: id => stmts.infGetById.get(id),
    getAll: g => stmts.infGetAll.all(g),
    insert: data => stmts.infInsert.run(data),
    delete: (g, u) => stmts.infDelete.run(g, u),
  },

  invites: {
    getByCode: (g, code) => stmts.invGetByCode.get(g, code),
    getActive: infId => stmts.invGetActive.all(infId),
    insert: (g, code, infId) => stmts.invInsert.run(g, code, infId),
    deactivate: (g, code) => stmts.invDeactivate.run(g, code),
  },

  members: {
    getRecord: (g, u, infId) => stmts.miGet.get(g, u, infId),
    getActive: (g, u) => stmts.miGetActive.get(g, u),
    getByInfluencer: infId => stmts.miGetByInfluencer.all(infId),
    getPage: (infId, offset) => stmts.miGetPage.all(infId, offset),
    getCount: infId => stmts.miGetCount.get(infId).count,
    upsert: data => stmts.miUpsert.run(data),
    setInactive: (g, u) => stmts.miSetInactive.run(g, u),
    setReassigned: (g, u, newInfId) => stmts.miSetReassigned.run(g, u, newInfId),
    incrPurchases: (g, u) => stmts.miIncrPurchases.run(g, u),
    getStats: infId => stmts.miStats.get(infId),
  },

  history: {
    insert: (g, u, infId, action) => stmts.histInsert.run(g, u, infId, action),
    get: (g, u) => stmts.histGet.all(g, u),
  },

  feedbacks: {
    insert: data => stmts.fbInsert.run(data),
    getStats: g => stmts.fbStats.get(g),
    getByStars: (g, s) => stmts.fbGetByStars.all(g, s),
    deleteByStars: (g, s) => stmts.fbDelByStars.run(g, s),
    deleteById: id => stmts.fbDelById.run(id),
  },

  feedbackPending: {
    insert: (g, u) => stmts.fpInsert.run(g, u),
    get: id => stmts.fpGet.get(id),
    getByUser: (g, u) => stmts.fpGetByUser.get(g, u),
    setStars: (id, stars) => stmts.fpSetStars.run(id, stars),
    delete: id => stmts.fpDelete.run(id),
  },
  
  purchases: {
    insert: (g, infId, memberId, amount) => stmts.purInsert.run(g, infId, memberId, amount),
    getSummary: (g, infId) => stmts.purSumByInfluencer.get(g, infId),
    list: (g, infId) => stmts.purListByInfluencer.all(g, infId),
  },
};

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

// ── Setup Database ────────────────────────────────────────────────────────
const db = require('./src/database/db');

// ── Setup Discord Bot ─────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();

// Carregar comandos
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(commandsPath, file));
    client.commands.set(cmd.data.name, cmd);
  }
}

// Carregar eventos
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
  for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

// ── Setup API Interna ─────────────────────────────────────────────────────
const app = express();
const API_PORT = 3001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.status(200).send('ok'));

// API pública para o painel Web consumir
app.get('/api/influencers/:guildId', (req, res) => {
  const { guildId } = req.params;
  try {
    const influencers = db.influencers.getAll(guildId);
    res.json(influencers || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/members/:guildId/:infId', (req, res) => {
  const { guildId, infId } = req.params;
  try {
    const members = db.members.getByInfluencer(infId);
    res.json(members || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/member-stats/:guildId/:infId', (req, res) => {
  const { guildId, infId } = req.params;
  try {
    const stats = db.members.getStats(infId);
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/feedback-stats/:guildId', (req, res) => {
  const { guildId } = req.params;
  try {
    const stats = db.feedbacks.getStats(guildId);
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Token validation
let token = process.env.TOKEN;
if (typeof token === 'string') {
  token = token.trim().replace(/^['"]|['"]$/g, '');
}
process.env.TOKEN = token;

const tokenLooksValid = typeof token === 'string' && /^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(token);
if (!tokenLooksValid) {
  console.error('[Auth] TOKEN ausente ou inválido.');
  process.exit(1);
}

// Login bot
client.login(token);

// Iniciar API
app.listen(API_PORT, '0.0.0.0', () => {
  console.log(`[API] Serviço de API em http://localhost:${API_PORT}`);
});

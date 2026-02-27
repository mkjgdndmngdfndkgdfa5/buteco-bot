module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`[Bot] Online como ${client.user.tag}`);
  },
};

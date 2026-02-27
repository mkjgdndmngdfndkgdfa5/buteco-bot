// Component V2 raw JSON helpers
// IS_COMPONENTS_V2 flag = 1 << 15 = 32768
const IS_CV2 = 1 << 15;
const EPHEMERAL = 1 << 6;

const COLORS = {
  BLURPLE: 0x5865F2,
  GREEN: 0x57F287,
  YELLOW: 0xFEE75C,
  RED: 0xED4245,
  PINK: 0xEB459E,
  TEAL: 0x1ABC9C,
};

const BS = { PRIMARY: 1, SECONDARY: 2, SUCCESS: 3, DANGER: 4, LINK: 5 };

function _wrap(data) {
  return { toJSON: () => data, ...data };
}

function container(components, accentColor) {
  const c = { type: 17, components };
  if (accentColor != null) c.accent_color = accentColor;
  return _wrap(c);
}

function text(content) {
  return _wrap({ type: 10, content });
}

function sep(divider = true, spacing = 1) {
  return _wrap({ type: 14, divider, spacing });
}

function row(...comps) {
  return _wrap({ type: 1, components: comps });
}

function btn(customId, label, style = BS.PRIMARY, opts = {}) {
  const b = { type: 2, custom_id: customId, label, style };
  if (opts.emoji) b.emoji = typeof opts.emoji === 'string' ? { name: opts.emoji } : opts.emoji;
  if (opts.disabled) b.disabled = true;
  return b;
}

function linkBtn(url, label, opts = {}) {
  const b = { type: 2, url, label, style: BS.LINK };
  if (opts.emoji) b.emoji = typeof opts.emoji === 'string' ? { name: opts.emoji } : opts.emoji;
  return b;
}

function select(customId, options, placeholder, opts = {}) {
  return _wrap({
    type: 3,
    custom_id: customId,
    options,
    placeholder,
    min_values: opts.min ?? 1,
    max_values: opts.max ?? 1,
  });
}

function option(label, value, opts = {}) {
  const o = { label, value };
  if (opts.description) o.description = opts.description;
  if (opts.emoji) o.emoji = typeof opts.emoji === 'string' ? { name: opts.emoji } : opts.emoji;
  if (opts.default) o.default = true;
  return o;
}

function section(textComps, accessory) {
  const s = { type: 9, components: textComps };
  if (accessory) s.accessory = accessory;
  return _wrap(s);
}

function thumbnail(url) {
  return _wrap({ type: 11, media: { url } });
}

function reply(components, ephemeral = false) {
  return {
    flags: IS_CV2 | (ephemeral ? EPHEMERAL : 0),
    components,
  };
}

function starsStr(n) {
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}

function statusEmoji(status) {
  return { active: '🟢', inactive: '🔴', reassigned: '🟡' }[status] ?? '⚪';
}

function tsDate(ts) {
  if (!ts) return 'N/A';
  return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

module.exports = { COLORS, BS, container, text, sep, row, btn, linkBtn, select, option, section, thumbnail, reply, starsStr, statusEmoji, tsDate };

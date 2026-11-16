// Kỹ năng: cộng XP khi làm việc, lên cấp mở thêm lợi ích
import { SKILLS, XP_LEVELS, TOOL_SKILL, TOOLS, MAX_HP } from './config.js';
import { state, bus, toast, sfx, changed } from './state.js';

export function skillLv(k) {
  const x = state.skills?.[k] || 0;
  let lv = 1;
  for (let i = 2; i < XP_LEVELS.length; i++) if (x >= XP_LEVELS[i]) lv = i;
  return lv;
}

// Tiến độ tới cấp kế tiếp (0..1)
export function skillProgress(k) {
  const lv = skillLv(k);
  if (lv >= XP_LEVELS.length - 1) return 1;
  const x = state.skills[k] || 0;
  return (x - XP_LEVELS[lv]) / (XP_LEVELS[lv + 1] - XP_LEVELS[lv]);
}

// Xác suất được thêm sản phẩm: per% mỗi cấp trên 1
export const bonusChance = (skill, per = 0.05) => Math.random() < (skillLv(skill) - 1) * per;

// Sức lực tiêu tốn của công cụ (giảm 1 khi kỹ năng tương ứng đạt cấp 5)
export function energyCost(tool) {
  const base = TOOLS[tool].energy;
  const sk = TOOL_SKILL[tool];
  return sk && skillLv(sk) >= 5 ? Math.max(0, base - 1) : base;
}

export const maxHp = () => MAX_HP + (skillLv('combat') - 1) * 5 + ((state.base?.fence || 0) >= 3 ? 30 : 0);

function addXp(skill, n) {
  if (skill === 'cooking') skill = 'farming';
  if (!SKILLS[skill]) return;
  const before = skillLv(skill);
  state.skills[skill] = (state.skills[skill] || 0) + n;
  const after = skillLv(skill);
  if (after > before) {
    sfx('levelup', 0.5);
    toast(`Lên cấp ${SKILLS[skill].name} ${after}!\n${SKILLS[skill].perk}`);
    changed();
  }
}

export function initSkills() {
  bus.on('xp', addXp);
}

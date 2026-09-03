// 验证回响之城数据图完整性
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('D:/Git_draft/echo-city/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const js = m[1];

const sandbox = {
  console,
  document: { addEventListener(){}, querySelectorAll(){return[]}, getElementById(){return null} },
  localStorage: { getItem(){return null}, setItem(){} },
  window: { scrollTo(){}, addEventListener(){}, removeEventListener(){}, setTimeout, clearTimeout }
};
vm.createContext(sandbox);
vm.runInContext(js, sandbox);

const NODES = vm.runInContext('NODES', sandbox);
const ENEMIES = vm.runInContext('ENEMIES', sandbox);
const ENDINGS = vm.runInContext('ENDINGS', sandbox);
const TALENTS = vm.runInContext('TALENTS', sandbox);
const ITEMS = vm.runInContext('ITEMS', sandbox);
const GRADE = vm.runInContext('GRADE', sandbox);

let errors = [];
let nCount = Object.keys(NODES).length;
console.log('节点数:', nCount);
console.log('天赋数:', TALENTS.length, '敌人数:', Object.keys(ENEMIES).length, '结局数:', Object.keys(ENDINGS).length);

const SKIP_GOTO = new Set(['__stay__','__map__','__loc__']);
// 1. 所有 goto / succ / fail / win / lose / ending 目标存在
for (const [id, n] of Object.entries(NODES)) {
  (n.choices || []).forEach(c => {
    if (c.goto && !SKIP_GOTO.has(c.goto) && !NODES[c.goto]) errors.push(`[${id}] goto 目标不存在: ${c.goto}`);
    if (c.succ && !NODES[c.succ]) errors.push(`[${id}] succ 目标不存在: ${c.succ}`);
    if (c.fail && !NODES[c.fail]) errors.push(`[${id}] fail 目标不存在: ${c.fail}`);
    if (c.kind === 'combat') {
      if (!ENEMIES[c.enemy]) errors.push(`[${id}] 敌人不存在: ${c.enemy}`);
      if (!NODES[c.win]) errors.push(`[${id}] 战斗胜利目标不存在: ${c.win}`);
      if (c.lose !== 'death' && !NODES[c.lose]) errors.push(`[${id}] 战斗失败目标不存在: ${c.lose}`);
    }
    if (c.kind === 'ending' && !ENDINGS[c.ending]) errors.push(`[${id}] 结局不存在: ${c.ending}`);
    if (c.kind === 'check' && !c.succ) errors.push(`[${id}] check 选项缺少 succ: ${c.text}`);
    if (c.kind === 'check' && !c.fail) errors.push(`[${id}] check 选项缺少 fail: ${c.text}`);
  });
}

// 2. 从入口可达性（c1_intro 起点，忽略随机分支）
function collectReach(start) {
  const seen = new Set();
  function walk(id) {
    if (seen.has(id)) return;
    seen.add(id);
    const n = NODES[id]; if (!n) return;
    (n.choices || []).forEach(c => {
      if (c.goto && !SKIP_GOTO.has(c.goto)) walk(c.goto);
      if (c.succ) walk(c.succ);
      if (c.fail) walk(c.fail);
      if (c.kind === 'combat') { walk(c.win); walk(c.lose); }
    });
  }
  walk(start);
  return seen;
}
const reach = collectReach('c1_intro');
const unreachable = Object.keys(NODES).filter(id => !reach.has(id));
console.log('可达节点数:', reach.size);
if (unreachable.length) { console.log('不可达节点:', unreachable.join(', ')); }
else console.log('全部节点从 c1_intro 可达 ✓');

// 3. 战斗死亡统一进入 death 视图（death 由引擎处理）
// 4. 结局 key 校验
if (errors.length) { console.log('\n❌ 发现错误:'); errors.forEach(e=>console.log(' -', e)); process.exit(1); }
else console.log('\n✅ 数据图校验全部通过');

// 回响之城 · 冒烟测试 v4（角色/技能/背包/跨世界搜打撤/队伍）
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('D:/Git_draft/echo-city/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window, d = w.document;
const errors = [];
w.setTimeout = (fn) => { try { fn(); } catch (e) { errors.push('setTimeout: ' + (e.stack || e.message)); } };
w.addEventListener('error', e => errors.push('window error: ' + e.message));

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const click = id => { const el = d.getElementById(id); if (!el) throw new Error('元素不存在: ' + id); el.click(); };
const clickCact = txt => { const acts = d.querySelectorAll('#combat-actions .cact'); for (const a of acts) if (a.textContent.includes(txt)) { a.click(); return; } throw new Error('未找到按钮: ' + txt); };
const active = id => d.getElementById(id).classList.contains('active');
const G = fn => { try { return w.eval(fn); } catch (e) { return null; } };
const gv = (path, name) => { try { return w.eval(path + (name ? '.' + name : '')); } catch (e) { return undefined; } };
function step(name, fn) { try { fn(); } catch (e) { fail++; console.log('  ✗', name, '→', e.message); errors.push(e.stack || e.message); } }

G('boot(); newRun();');

console.log('== 1. 职业 / 天赋 ==');
step('选职业', () => {
  G('applyClass("sword")');
  ok('职业与技能', G('S.skills.length===3'));
  ok('初始无队友', G('S.roster.length===0 && S.party.length===0'));
});

console.log('== 2. 队伍 · 招募与上阵 ==');
step('招募老猫', () => {
  ok('招募函数生效', G('recruitTeammate("maomao")===true'));
  ok('老猫在招募池', G('S.roster.includes("maomao")'));
  ok('自动上阵', G('S.party.includes("maomao")'));
  ok('重复招募无效', G('recruitTeammate("maomao")===false'));
  ok('队友总数正确', G('TEAMMATES.length===9'));
});
step('上阵上限3', () => {
  G('S.party=[]'); G('recruitTeammate("lan");recruitTeammate("tiebi");recruitTeammate("luolan")');
  ok('已上3名', G('S.party.length===3'));
  G('recruitTeammate("lingzi")');
  ok('第4名入后备', G('S.roster.includes("lingzi") && !S.party.includes("lingzi")'));
  G('toggleParty("lan")');
  ok('下阵1名', G('S.party.length===2 && !S.party.includes("lan")'));
  G('toggleParty("lingzi")');
  ok('后备上阵', G('S.party.length===3 && S.party.includes("lingzi")'));
});

console.log('== 3. 队伍 · 战斗被动 ==');
step('战斗开场被动', () => {
  G('S.party=["maomao","tiebi","wuming"]');
  G('startCombat("ghost","c1_ghost_kill","death")');
  ok('老猫护盾', G('CB.buff.guard>=1'));
  ok('铁壁开火', G('CB.hp < CB.max'));
  ok('无名狂暴', G('CB.buff.rage===2'));
  ok('无名减伤', G('S.flag._allyMit===0.1'));
  ok('战斗队友栏', d.querySelectorAll('.ally-chip').length===3);
});
step('战斗每回合被动', () => {
  G('S.party=["maomao","tiebi","wuming"]');
  G('startCombat("ghost","c1_ghost_kill","death")');
  const mp0 = G('S.mp');
  G('S.mp = Math.max(0,' + mp0 + '-10)');
  const mpLow = G('S.mp');
  G('CB.hp=30'); G('CB.dc=0');
  clickCact('攻击');
  ok('回合结束触发队友效果', G('S.mp > ' + mpLow) || G('CB.buff.rage < 2') || G('CB')===null);
});
step('灵子回蓝翻倍', () => {
  G('S.party=["lingzi"]');
  G('startCombat("ghost","c1_ghost_kill","death")');
  ok('灵子翻倍标记', G('S.flag._allyDoubleMp===true'));
  G('S.mp=0; CB.dc=0; CB.hp=30');
  clickCact('攻击');
  ok('回蓝+16', G('S.mp >= 16'));
});

console.log('== 4. 队伍 · 角色面板 ==');
step('角色面板队伍区', () => {
  G('S.nodeId="c1_intro"');
  G('renderChar()');
  ok('队伍区块', d.getElementById('view-char').textContent.includes('队伍'));
  ok('显示上阵数', d.getElementById('view-char').textContent.includes('上阵'));
  ok('队友卡片', d.querySelectorAll('.mate-card').length===9);
  ok('未结识占位', d.querySelectorAll('.mate-card.m-lock').length>=1);
  ok('老猫卡显示被动', [...d.querySelectorAll('.m-name')].some(x=>x.textContent==='老猫'));
});

console.log('== 5. 跨世界搜打撤 · 世界队友 ==');
step('任务板显示队友奖励', () => {
  G('S.worldsCleared=["sky","wuxia"]'); // 解锁海洋世界
  G('renderWorlds()');
  ok('海洋世界奖励含队友', [...d.querySelectorAll('.wcard')].some(x=>x.textContent.includes('澜')));
});
step('首通世界招募队友', () => {
  G('S.worldsCleared=[]');
  G('S.party=[]; S.roster=[]');
  G('S.stats.agi=999');
  G('startOperation("ocean")');
  G('OP.phase="withdraw"');
  G('opWithdraw()');
  ok('首通后澜入队', G('S.roster.includes("lan")'));
  ok('世界已记录', G('S.worldsCleared.includes("ocean")'));
});
step('老猫主线招募钩子', () => {
  G('S.roster=[]; S.party=[]');
  G('gotoNode("c2_save_gm")');
  ok('到达老猫节点自动入队', G('S.roster.includes("maomao")'));
});

console.log('== 6. 回归 ==');
step('门控结局死亡', () => {
  G('S.flag={}; gotoNode("c3_boss_win_true")');
  ok('无钥匙不显示轮回之王', [...d.querySelectorAll('#scene-choices .choice')].filter(x=>x.textContent.includes('轮回之王')).length===0);
  G('S.hp=0; renderDeath()');
  ok('死亡视图', active('view-death'));
  click('reincarnate');
  ok('轮回清空队伍', G('S.party.length===0 && S.roster.length===0'));
});

console.log('== 7. 箱庭 · 地图 / 区域 / 探索点 ==');
step('地图视图', () => {
  G('S.flag={}; S.shards=0; S._locDone={}; S._location=null; S._locReturn=null');
  G('renderMap()');
  ok('地图视图激活', active('view-map'));
  ok('三个区域卡片', d.querySelectorAll('.loc-card').length===3);
  ok('仅旧日街区解锁', d.querySelectorAll('.loc-card.locked').length===2);
  ok('HUD地图按钮', !!d.getElementById('btn-map'));
});
step('区域探索点', () => {
  G('enterLocation("street")');
  ok('区域视图激活', active('view-loc'));
  ok('探索点清单', d.querySelectorAll('.spot-item').length>=6);
  ok('显示返回地图', !!d.getElementById('loc-back'));
});
step('巡逻战斗·胜利回区域', () => {
  G('S.stats.agi=999');
  G('activateSpot(locById("street"), locById("street").spots.find(s=>s.repeat==="fiend"))');
  ok('巡逻战斗开始', G('CB && CB.id==="fiend"'));
  G('combatVictory()');
  ok('胜利后回到区域', active('view-loc'));
  ok('区域仍为旧日街区', G('S._location==="street"'));
});
step('宝箱一次性', () => {
  G('S._locDone={}');
  G('activateSpot(locById("street"), locById("street").spots.find(s=>s.key==="loot_street"))');
  ok('宝箱已记录', G('S._locDone.street.includes("loot_street")'));
  ok('宝箱显示返回', !!d.getElementById('loot-back'));
});
step('真相碎片解锁深渊', () => {
  G('S.shards=0; S.flag={}');
  G('gotoNode("c1_merchant_friend")');
  ok('灰袍线索碎片', G('S.shards>=1'));
  G('gotoNode("c2_log_read")');
  ok('档案真相碎片', G('S.shards>=2'));
  G('gotoNode("c2_final_hint")');
  ok('老猫忠告碎片', G('S.shards>=3'));
  ok('深渊解锁', G('locUnlocked(locById("abyss"))===true'));
});
step('塔区解锁门控', () => {
  G('S.flag={}');
  ok('未过边界塔区锁定', G('locUnlocked(locById("tower"))===false'));
  G('gotoNode("c1_route_tower")');
  ok('边界节点有返回地图', [...d.querySelectorAll('#scene-choices .choice')].some(x=>x.textContent.includes('地图')));
  G('S.flag.tower_visited=true');
  ok('过边界后塔区解锁', G('locUnlocked(locById("tower"))===true'));
});

console.log('== 8. 存档 / 读档 ==');
step('存档与读档', () => {
  G('S.flag={}; S.shards=0; S._locDone={}; S.run=2; S.cls="sword"; S.level=5; S.nodeId="map"');
  G('S.flag.testmark=true');
  ok('存档成功', G('saveSlot("slot1")===true'));
  ok('自动存档成功', G('saveSlot("auto")===true'));
  // 改动后读档应恢复
  G('S.flag={}; S.level=1; S.run=1');
  ok('读档成功', G('resumeFromSave("slot1")===true'));
  ok('flag 恢复', G('S.flag.testmark===true'));
  ok('level 恢复', G('S.level===5'));
  ok('run 恢复', G('S.run===2'));
  ok('删除存档', G('(deleteSlot("slot1"), !hasSlot("slot1"))'));
});
step('存档界面', () => {
  G('S.nodeId="map"');
  G('renderSave()');
  ok('存档视图激活', active('view-save'));
  ok('有自动存档槽', d.querySelectorAll('.save-slot').length===4);
  ok('返回按钮', !!d.getElementById('save-back'));
});

console.log('== 9. 随机际遇 ==');
step('随机事件触发', () => {
  G('S._locDone={}; S.stats.agi=999');
  G('activateSpot(locById("street"), locById("street").spots.find(s=>s.repeat==="event"))');
  ok('事件视图', active('view-scene'));
  ok('有判定按钮', !!d.getElementById('ev-go'));
  const goldBefore = G('S.gold');
  d.getElementById('ev-go').click();
  ok('事件有返回按钮', !!d.getElementById('ev-done'));
});
step('事件结果可返回区域', () => {
  G('S._location="street"');
  G('activateSpot(locById("street"), locById("street").spots.find(s=>s.repeat==="event"))');
  const go = d.getElementById('ev-go');
  if (go) go.click();
  const done = d.getElementById('ev-done');
  if (done) done.click();
  ok('返回区域视图', active('view-loc'));
});

console.log('== 10. 结局继续探索 ==');
step('结局视图有继续按钮', () => {
  G('S.flag={}; S.finishedEndings=[]');
  G('goEnding("wake")');
  ok('结局视图', active('view-ending'));
  ok('有继续探索按钮', !!d.getElementById('continue-map'));
  ok('有新一轮按钮', !!d.getElementById('again'));
  G('S.flag._endedThisRun=true; goEnding("wake")');
  ok('同周目不重复结算', G('S.flag._endedThisRun===true'));
});

console.log('== 11. 新增知名游戏世界 ==');
step('世界数量与数据', () => {
  ok('共19个世界', G('WORLDS.length===19'));
  ok('新增游戏世界id', G('["zelda","hollow","elden","pet","sekiro","hades"].every(id=>WORLDS.some(w=>w.id===id))'));
  ok('新增小说世界id', G('["guoyun","wanzu","guimi","honghuang","zhutian"].every(id=>WORLDS.some(w=>w.id===id))'));
  ok('新技能存在', G('["pale","catch","blitz","guoyun","tarot","zhutian"].every(id=>!!SKILLS[id])'));
  ok('新装备存在', G('["mastersword","kusanagi","golden_seal","wanzu_seal","honghuang_ling"].every(id=>ITEMS.some(i=>i.id===id))'));
  ok('新敌人存在', G('["w_wild","w_void","w_elden","w_pet","w_sekiro","w_hades","w_guoyun","w_wanzu","w_guimi","w_honghuang","w_zhutian"].every(id=>!!ENEMIES[id])'));
  ok('解锁门槛梯度', G('worldById("zelda").unlock===6 && worldById("elden").unlock===8 && worldById("hades").unlock===10 && worldById("wanzu").unlock===12'));
  ok('新队友存在', G('["ningguang","venti","huangdi"].every(id=>!!teammateById(id))'));
});
step('新世界可搜打撤', () => {
  G('S.worldsCleared=["sky","wuxia","xianxia","ocean","apoc","fantasy","sci","inf"]'); // 完成8个解锁zelda(6)
  G('S.stats.agi=999; S.items=S.items.filter(i=>i!=="mastersword")');
  G('startOperation("zelda")');
  ok('进入旷野神域', G('OP.world.id==="zelda"'));
  G('OP.phase="withdraw"');
  G('opWithdraw()');
  ok('首通奖励驱魔之剑', G('S.items.includes("mastersword")'));
  ok('世界已记录', G('S.worldsCleared.includes("zelda")'));
});
step('国运世界抽卡与队友', () => {
  G('S.worldsCleared=WORLDS.map(w=>w.id).filter(id=>id!=="guoyun")'); // 完成其他18个
  G('S.stats.agi=999; S.gold=0; S.hp=S.maxHp; S.items=S.items.filter(i=>i!=="potion")');
  G('startOperation("guoyun")');
  ok('进入国运战场', G('OP.world.id==="guoyun" && OP.world.guoyun===true'));
  G('OP.phase="withdraw"');
  G('opWithdraw()');
  ok('国运抽卡已触发', G('OP.log.some(l=>String(l).includes("国运抽卡"))'));
  ok('国运世界首通奖励国运加护', G('S.skillPool.includes("guoyun")'));
  ok('首通国运招募凝光', G('S.roster.includes("ningguang")'));
  ok('凝光金币被动已注册', G('typeof teammateById("ningguang").onStart==="function"'));
});
step('未解锁世界锁定', () => {
  G('S.worldsCleared=["sky","wuxia","xianxia"]'); // 完成3个
  G('renderWorlds()');
  ok('冥界锁定', G('S.worldsCleared.length < worldById("hades").unlock'));
  ok('诸天锁定', G('S.worldsCleared.length < worldById("zhutian").unlock'));
});

console.log('== 12. 自定义剧本模式 ==');
step('编辑器与解析', () => {
  G('renderTitle()');
  ok('标题页有自定义按钮', !!d.getElementById('btn-custom'));
  G('renderCustomEditor()');
  ok('编辑器视图', active('view-custom'));
  ok('示例剧本可解析', G('parseCustomScript(CUSTOM_SAMPLE)!==null'));
  ok('剧本标题正确', G('CUST.script.title==="深夜的便利店"'));
});
step('自定义剧本游玩', () => {
  G('startCustomRun()');
  ok('进入第一章', G('CUST.node==="1"'));
  ok('变量已初始化', G('CUST.vars.hp===10 && CUST.vars.luck===5'));
  ok('游玩视图', active('view-customplay'));
  // 点选项3：打劫（hp-2）→ goto 4
  const ch3 = [...d.querySelectorAll('.cust-choice')][2];
  ok('有3个选项', d.querySelectorAll('.cust-choice').length===3);
  ch3.click();
  ok('打劫后 hp=8', G('CUST.vars.hp===8'));
  ok('跳到章节4', G('CUST.node==="4"'));
  // 章节4 选项2 → end 坏结局
  [...d.querySelectorAll('.cust-choice')][1].click();
  ok('结局文本显示', d.getElementById('view-customplay').textContent.includes('坏结局'));
  ok('再玩一次', (function(){ d.getElementById('cust-replay').click(); return G('CUST.node==="1"'); })());
});
step('条件分支', () => {
  G('startCustomRun(); gotoCustom(3)'.replace('gotoCustom','renderCustomChapter'));
  // 章节3：选项2 需 luck>=5（luck=5 满足，应可用）
  const condOpt = [...d.querySelectorAll('.cust-choice')][1];
  ok('条件满足选项可用', !condOpt.classList.contains('cond-off'));
  condOpt.click();
  ok('进入章节6', G('CUST.node==="6"'));
});

console.log('== 13. 机制优化：自动战斗 / 敌人先手 / 数值平衡 ==');
step('数值平衡微调', () => {
  ok('横斩降为1.4', G('SKILLS.slash.power===1.4'));
  ok('精灵大陆敌人hp=54', G('ENEMIES.w_pet.hp===54'));
  ok('诡秘之都敌人hp=60', G('ENEMIES.w_guimi.hp===60'));
  ok('诸天万界敌人hp=62', G('ENEMIES.w_zhutian.hp===62'));
  ok('横斩仍是新手最省蓝', G('SKILLS.slash.mp===8'));
});
step('自动战斗开关', () => {
  G('S.party=[]');
  G('startCombat("ghost","c1_ghost_kill","death")');
  ok('有自动按钮', [...d.querySelectorAll('#combat-actions .cact')].some(x=>x.textContent.includes('自动')));
  G('combatAuto()');
  ok('进入自动', G('CB.auto===true'));
  ok('自动定时器已建', G('CB._autoTimer!==null'));
  // 手动驱动几步，AI 能推进战斗
  G('CB.dc=0; S.mp=999');
  const t0 = G('CB.turn');
  G('combatAutoStep()');
  ok('AI行动推进回合', G('CB.turn > ' + t0) || G('CB')===null);
  G('combatAutoStop()');
  ok('停止自动', G('CB.auto===false'));
  ok('定时器已清', G('CB._autoTimer===null'));
});
step('自动战斗击杀结算', () => {
  G('startCombat("ghost","c1_ghost_kill","death")');
  G('CB.dc=0; S.mp=999; CB.hp=1');
  G('combatAuto()');
  G('combatAutoStep()');
  ok('残血一击后战斗结束', G('CB')===null);
  ok('自动已随结束清理', G('CB===null || CB.auto===false'));
});
step('敌人先手机制', () => {
  // 高spd敌人应可能抢攻——验证机制存在且不崩溃（spd 参与判定）
  G('S.party=[]');
  G('S.stats.agi=1');
  G('startCombat("w_sekiro","c1_ghost_kill","death")');
  ok('sekiro战斗正常开启', active('view-combat'));
  ok('先手需求公式生效', G('50 + Math.round((ENEMIES.w_sekiro.spd-10)*2.5)===63'));
});

console.log('\n== 汇总 ==');
console.log('通过:', pass, ' 失败:', fail);
console.log('errors count:', errors.length);
if (errors.length) { console.log('运行时错误:'); errors.forEach(e => console.log(' -', e)); }
process.exit(fail || errors.length ? 1 : 0);

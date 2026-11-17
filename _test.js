// Рантайм-проверка собранного index.html без браузера:
//  загрузка данных A -> движки C -> мост -> оверрайды -> индекс поиска -> проверки
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
const blocks = [];
let m;
while ((m = re.exec(html))) { if (m[1].trim()) blocks.push(m[1]); }
if (blocks.length !== 2) throw new Error('ожидалось 2 inline-блока, нашлось ' + blocks.length);

const [part1, part2_3] = blocks;
// вторая часть = мост + вызовы C + поиск + приложение
const bridgeEnd = part2_3.indexOf('/* ================= Search index');
const part2 = part2_3.slice(0, bridgeEnd);       // мост + богатые вызовы
const part3 = part2_3.slice(bridgeEnd);          // приложение
const indexEnd = part3.indexOf('/* ================= State / DOM');
const indexBuild = part3.slice(0, indexEnd);     // только сборка INDEX

const ctx = { window: {} };
vm.createContext(ctx);

vm.runInContext(part1, ctx);
for (const f of ['extra_en.js', 'extra_fr.js', 'extra_es.js', 'extra_de.js', 'english.js', 'french.js', 'spanish.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'data', f), 'utf8'), ctx);
}
vm.runInContext(part2, ctx);
vm.runInContext(indexBuild, ctx);

const VD = ctx.VD, INDEX = ctx.INDEX;
console.log('VD counts:', 'en=' + Object.keys(VD.en).length, 'fr=' + Object.keys(VD.fr).length, 'es=' + Object.keys(VD.es).length);

let errors = 0;
function check(cond, msg) {
  console.log((cond ? '  OK ' : '  FAIL ') + msg);
  if (!cond) errors++;
}

// --- 1. Богатые оверрайды C на месте
function tagless(s) { return String(s).replace(/<[^>]+>/g, ''); }
const etre = VD.fr['être'];
check(etre && tagless(etre.tenses.pres.rows[0][1]) === 'suis', 'fr être Présent je = suis (override C)');
check(etre && !!etre.tenses.pres.ex && etre.tenses.pres.ex[0].t, 'fr être Présent имеет пример с переводом');
const ser = VD.es['ser'];
check(ser && tagless(ser.tenses.pres.rows[0][1]) === 'soy', 'es ser Presente yo = soy (override C)');
const be = VD.en['be'];
check(be && tagless(be.tenses.pres.rows[2][1]) === 'is', 'en be present he = is (override C)');

// --- 2. Глаголы только из A
const accept = VD.en['accept'];
check(accept && tagless(accept.tenses.pres.rows[2][1]) === 'accepts', 'en accept (только A) present he = accepts');
check(accept && !!accept.tenses.cond, 'en accept имеет Conditional (из данных A)');
check(accept && !accept.tenses.goto, 'en accept не имеет going to (нет в A)');
const parler = VD.fr['parler'];
check(parler && tagless(parler.tenses.pres.rows[0][1]) === 'parle', 'fr parler (только A) présent je = parle');
const abrir = VD.es['abrir'];
check(abrir && tagless(abrir.tenses.pres.rows[0][1]) === 'abro', 'es abrir (только A) presente yo = abro');
check(abrir && !!abrir.tenses.imp, 'es abrir имеет Imperativo (из A)');

// --- 3. Строки таблиц: 6 форм; императив — 3 (FR) / 5 (ES) / 6 (EN)
let badTables = 0, totalTenses = 0;
for (const L of ['en', 'fr', 'es']) {
  for (const inf of Object.keys(VD[L])) {
    for (const tid of Object.keys(VD[L][inf].tenses)) {
      totalTenses++;
      const rows = VD[L][inf].tenses[tid].rows;
      const want = (L === 'fr' && tid === 'imp') ? 3 : (L === 'es' && tid === 'imp') ? 5 : 6;
      if (!rows || rows.length !== want) { badTables++; if (badTables < 5) console.log('  плохая таблица', L, inf, tid, rows && rows.length); }
    }
  }
}
check(badTables === 0, 'все таблицы с нужным числом форм (' + totalTenses + ' времён проверено)');

// --- 4. Поиск: инфинитивы, формы, русские глоссы
function search(q) {
  const qn = String(q).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const out = [];
  for (const e of INDEX) {
    if (e.kind === 'form' && qn.length < 2) continue;
    if (e.kind === 'ru' && qn.length < 3) continue;
    const pos = e.formNorm.indexOf(qn);
    if (pos === 0 && e.kind === 'inf') out.unshift(e);
    else if (pos === 0 || (pos > 0 && e.kind === 'inf')) out.push(e);
  }
  return out.slice(0, 9);
}
check(search('went').some(e => e.inf === 'go'), 'поиск "went" находит go');
check(search('allons').some(e => e.inf === 'aller'), 'поиск "allons" находит aller');
check(search('tuviste').some(e => e.inf === 'tener'), 'поиск "tuviste" находит tener');
check(search('быть').some(e => e.inf === 'be'), 'поиск "быть" находит be');
check(search('être').some(e => e.inf === 'être'), 'поиск "être" находит être');
check(search('aceptar').length > 0, 'поиск "aceptar" что-то находит');

// --- 5. Примеры: нет пустых {s}
let emptyEx = 0;
for (const L of ['en', 'fr', 'es']) {
  for (const inf of Object.keys(VD[L])) {
    for (const tid of Object.keys(VD[L][inf].tenses)) {
      const ex = VD[L][inf].tenses[tid].ex;
      if (ex) for (const e of ex) if (!e.s || !String(e.s).trim()) emptyEx++;
    }
  }
}
check(emptyEx === 0, 'пустых примеров нет');

// --- 6. Русские глоссы форм
check(ctx.ruGloss('en', 'pres', 0, VD.en.accept) === 'я принимаю', 'gloss EN accept pres → я принимаю');
check(ctx.ruGloss('fr', 'pres', 0, VD.fr.parler) === 'я разговариваю', 'gloss FR parler pres → я разговариваю');
check(ctx.ruGloss('es', 'pres', 0, VD.es.hablar) === 'я говорю', 'gloss ES hablar pres → я говорю');
check(ctx.ruGloss('es', 'fut', 0, VD.es.hablar) === 'я буду говорить', 'gloss ES hablar fut → я буду говорить');
check(ctx.ruGloss('en', 'past', 0, VD.en.work) === 'я работал', 'gloss EN work past → я работал');
check(ctx.ruGloss('en', 'cond', 0, VD.en.work) === 'я бы работал', 'gloss EN work cond → я бы работал');
check(ctx.ruGloss('es', 'pres', 2, VD.es.abrir) === 'он/она открывает', 'gloss ES abrir (ru из EN) pres → открывает');

// --- 7. Декодирование сущностей и <i> в заметках
check(ctx.decEnt("I don&#39;t go &nbsp; there") === "I don't go   there", 'decEnt: &#39; и &nbsp;');
check(ctx.allowB('<i>decir → dijo</i> <b>dijo</b>') === '<i>decir → dijo</i> <b>dijo</b>', 'allowB сохраняет <i> и <b>');

// --- 8. Imperativo есть у каждого испанского глагола
let noImp = 0;
for (const inf of Object.keys(VD.es)) if (!VD.es[inf].tenses.imp) noImp++;
check(noImp === 0, 'es: Imperativo у всех ' + Object.keys(VD.es).length + ' глаголов');
check(VD.es['poder'] && !!VD.es['poder'].tenses.imp, 'es poder тоже имеет Imperativo (был noImp)');

// --- 9. Регрессия русского спряжения (формы, на которые жаловались/частые паттерны)
function forms6(inf) { const a = []; for (let p = 0; p < 6; p++) a.push(ctx.ruFinite(inf, p)); return a; }
check(forms6('видеть').join('|') === 'вижу|видишь|видит|видим|видите|видят', 'видеть: вижу/видишь/видит/видим/видите/видят');
check(forms6('писать')[0] === 'пишу' && forms6('писать')[1] === 'пишешь', 'писать: пишу/пишешь');
check(forms6('класть')[0] === 'кладу' && forms6('класть')[1] === 'кладёшь', 'класть: кладу/кладёшь');
check(forms6('нести')[0] === 'несу', 'нести: несу');
check(forms6('расти')[0] === 'расту' && forms6('расти')[5] === 'растут', 'расти: расту/растут');
check(forms6('стоять')[0] === 'стою' && forms6('стоять')[5] === 'стоят', 'стоять: стою/стоят');
check(forms6('тонуть')[0] === 'тону' && forms6('тонуть')[5] === 'тонут', 'тонуть: тону/тонут');
check(forms6('мочь')[0] === 'могу', 'мочь: могу');
check(forms6('пытаться')[0] === 'пытаюсь' && forms6('пытаться')[5] === 'пытаются', 'пытаться: пытаюсь/пытаются');
check(forms6('фокусироваться')[0] === 'фокусируюсь', 'фокусироваться: фокусируюсь');
check(forms6('предавать')[0] === 'предаю', 'предавать: предаю');
check(forms6('оставаться')[0] === 'остаюсь' && forms6('оставаться')[3] === 'остаёмся', 'оставаться: остаюсь/остаёмся');
check(forms6('содержать')[0] === 'содержу', 'содержать: содержу');
check(forms6('зависеть')[0] === 'завишу' && forms6('зависеть')[5] === 'зависят', 'зависеть: завишу/зависят');
check(forms6('жевать')[0] === 'жую', 'жевать: жую');
check(forms6('танцевать')[0] === 'танцую', 'танцевать: танцую');
check(ctx.ruPast('заботиться', 0) === 'заботился', 'заботиться прош: заботился');
check(ctx.ruPast('надеяться', 0) === 'надеялся', 'надеяться прош: надеялся');
check(ctx.ruNormInf('начинать(ся)') === 'начинать', 'normInf: начинать(ся) → начинать');
check(ctx.ruNormInf('быть (о сущности, признаке)') === 'быть', 'normInf: быть (…) → быть');
check(ctx.ruNormInf('вести себя') === '', 'normInf: вести себя → пусто');
check(ctx.ruNormInf('говорить, разговаривать') === 'говорить', 'normInf: говориорить, разговаривать → говориорить');
check(ctx.ruNormInf('делать/сделать') === 'делать', 'normInf: делать/сделать → делать');

// --- 10. Расширенная база B2
check(Object.keys(VD.en).length >= 400, 'EN: база расширена (' + Object.keys(VD.en).length + ')');
check(Object.keys(VD.fr).length >= 300, 'FR: база расширена (' + Object.keys(VD.fr).length + ')');
check(Object.keys(VD.es).length >= 300, 'ES: база расширена (' + Object.keys(VD.es).length + ')');
check(VD.en.achieve && tagless(VD.en.achieve.tenses.past.rows[0][1]) === 'achieved', 'EN achieve past = achieved');
check(VD.en.choose && tagless(VD.en.choose.tenses.past.rows[0][1]) === 'chose', 'EN choose past = chose');
check(VD.en.wake && tagless(VD.en.wake.tenses.presperf.rows[0][1]) === 'have woken', 'EN wake pp = woken');
check(VD.fr['réussir'] && tagless(VD.fr['réussir'].tenses.pres.rows[0][1]) === 'réussis', 'FR réussir présent = réussis');
check(VD.fr.apparaître && tagless(VD.fr.apparaître.tenses.pc.rows[0][1]).includes('apparu'), 'FR apparaître pp = apparu');
check(VD.es.alcanzar && tagless(VD.es.alcanzar.tenses.pres.rows[0][1]) === 'alcanzo', 'ES alcanzar presente = alcanzo');
check(VD.es.volver && tagless(VD.es.volver.tenses.pc.rows[0][1]) === 'he vuelto', 'ES volver pp = vuelto');
check(VD.es.reír && tagless(VD.es.reír.tenses.pret.rows[2][1]) === 'rió', 'ES reír pret 3sg = rió');
check(VD.es.seguir && tagless(VD.es.seguir.tenses.subj.rows[0][1]) === 'siga', 'ES seguir subj = siga');

// --- 11. Немецкий язык
check(Object.keys(VD.de).length >= 200, 'DE: база (' + Object.keys(VD.de).length + ')');
check(ctx.TENSES.de && ctx.TENSES.de.length === 8, 'DE: 8 времён');
check(ctx.LANGS.de && ctx.LANGS.de.chip === 'DE', 'DE: язык в LANGS');
const deSein = VD.de.sein;
check(tagless(deSein.tenses.pres.rows[0][1]) === 'bin' && tagless(deSein.tenses.pr.rows[0][1]) === 'war' && tagless(deSein.tenses.perf.rows[0][1]) === 'bin gewesen', 'DE sein: bin / war / bin gewesen');
const deMachen = VD.de.machen;
check(tagless(deMachen.tenses.pres.rows[1][1]) === 'machst' && tagless(deMachen.tenses.pr.rows[0][1]) === 'machte' && tagless(deMachen.tenses.perf.rows[0][1]) === 'habe gemacht', 'DE machen: machst / machte / habe gemacht');
check(tagless(VD.de.anziehen.tenses.perf.rows[0][1]) === 'habe angezogen', 'DE anziehen perf = habe angezogen');
check(ctx.ruGloss('de', 'pres', 0, deSein) === 'я есть', 'DE gloss sein pres = я есть');
check(ctx.ruGloss('de', 'fut', 0, deSein) === 'я буду', 'DE gloss sein fut = я буду');
check(ctx.ruGloss('de', 'perf', 0, deSein) === 'я был', 'DE gloss sein perf = я был');

console.log('\nИТОГ: ' + (errors === 0 ? 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✓' : 'ОШИБОК: ' + errors));
process.exit(errors === 0 ? 0 : 1);

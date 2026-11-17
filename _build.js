// Сборка финального index.html:
//   UI/движок — из verb-conjugation (1).html (вариант C)
//   Большой верифицированный словарь — из outputs/data (вариант A)
// Патчи:
//   1. Рендер заметок/примеров: <i> и сущности (&#39; и т.п.) отображаются корректно
//   2. Русский перевод для каждой формы (колонка «Перевод» в таблицах)
//   3. У испанских глаголов всегда есть Imperativo
const fs = require('fs');

const C = fs.readFileSync('C:/Users/Lenovo/Downloads/verb-conjugation (1).html', 'utf8');
const OUT = 'C:/Users/Lenovo/Downloads/06_Проекты/Conjugation-guide/index.html';

// --- маркеры разрезания (внутри исходного <script>)
const OPEN_TAG = '<script>\n';
const EN_DATA_COMMENT = '/* ============ English data: 12 core verbs';
const SEARCH_INDEX = '/* ================= Search index';

const openIdx = C.indexOf(OPEN_TAG) + OPEN_TAG.length;
const enDataIdx = C.indexOf(EN_DATA_COMMENT, openIdx);
const searchIdx = C.indexOf(SEARCH_INDEX, enDataIdx);
if (openIdx < 0 || enDataIdx < 0 || searchIdx < 0) throw new Error('markers not found');

let head = C.slice(0, openIdx);                       // HTML до <script>
let part1 = C.slice(openIdx, enDataIdx);              // утилиты + движки
const part2 = C.slice(enDataIdx, searchIdx);          // богатые вызовы ENG/FRG/SPG + ADD
let part3 = C.slice(searchIdx);                       // поиск + приложение + закрытие

// --- 1) В TENSES.en добавить английский Conditional (есть в данных A)
const gotoLine = "    { id: 'goto',         name: 'Future (going to)',          ru: 'намеренное будущее',         aux: 'am / is / are going to + base form' }";
if (!part1.includes('id: \'cond\'') && part1.includes(gotoLine)) {
  part1 = part1.replace(gotoLine, gotoLine + ',\n    { id: \'cond\', name: \'Conditional\', ru: \'условное\', aux: \'would + base form\' }');
}

// --- 2) Hero: упомянуть объём словаря
part3 = part3.replace(
  'Look up a verb in <b>English</b>, <b>French</b> or <b>Spanish</b> and see its complete conjugation — with example sentences and audio for every form.',
  'Look up a verb in <b>English</b>, <b>French</b> or <b>Spanish</b> and see its complete conjugation — 185 + 178 + 198 verbs, with example sentences, translations and audio for every form.'
);

// --- 3) Декодер сущностей + allowB восстанавливает <i>/<sup> (не только <b>)
part1 = part1.replace(
  'function allowB(s) { return esc(s).replace(/&lt;b&gt;/g, \'<b>\').replace(/&lt;\\/b&gt;/g, \'</b>\'); }',
  `function decEnt(s) {
  return String(s).replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function allowB(s) {
  return esc(decEnt(s))
    .replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\\/b&gt;/g, '</b>')
    .replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\\/i&gt;/g, '</i>')
    .replace(/&lt;sup&gt;/g, '<sup>').replace(/&lt;\\/sup&gt;/g, '</sup>');
}`
);

// --- 4) rowTTS: декодировать сущности перед озвучкой
part1 = part1.replace(
  "  var p = String(row[2]), f = stripTags(row[1]);",
  "  var p = String(row[2]), f = decEnt(stripTags(row[1]));"
);

// --- 5) Движок русских глоссов для форм
part1 += `
/* ================= Russian glosses for conjugated forms ================= */
var RU_PRON = {
  en: ['я', 'ты', 'он/она', 'мы', 'вы', 'они'],
  fr: ['я', 'ты', 'он/она', 'мы', 'вы', 'они'],
  es: ['я', 'ты', 'он/она', 'мы', 'вы', 'они']
};
function ruMode(lang, tid) {
  var m = {
    en: { pres:'pres', prescont:'pres', presperf:'pres', presperfcont:'pres', goto:'pres',
          past:'past', pastcont:'past', pastperf:'past', pastperfcont:'past',
          fut:'fut', futcont:'fut', futperf:'fut', cond:'cond' },
    fr: { pres:'pres', impf:'past', pc:'past', pq:'past', fut:'fut', fa:'fut', ps:'past',
          cond:'cond', cp:'cond', subj:'pres', sp:'past', imp:'imp' },
    es: { pres:'pres', pc:'past', pret:'past', impf:'past', plus:'past', fut:'fut', fc:'fut',
          cond:'cond', cc:'cond', subj:'pres', sp:'past', simp:'past', imp:'imp' }
  };
  return (m[lang] || {})[tid] || '';
}
function ruStem(inf) {
  var s = String(inf).toLowerCase().trim();
  if (s.slice(-2) === 'ть') s = s.slice(0, -2);
  else if (s.slice(-2) === 'ти') s = s.slice(0, -2);
  else return null;
  return s;
}
var RU_IRR = {
  быть: ['есть', 'есть', 'есть', 'есть', 'есть', 'есть'],
  идти: ['иду', 'идёшь', 'идёт', 'идём', 'идёте', 'идут'],
  есть: ['ем', 'ешь', 'ест', 'едим', 'едите', 'едят'],
  мочь: ['могу', 'можешь', 'может', 'можем', 'можете', 'могут'],
  печь: ['пеку', 'печёшь', 'печёт', 'печём', 'печёте', 'пекут'],
  лечь: ['лягу', 'ляжешь', 'ляжет', 'ляжем', 'ляжете', 'лягут'],
  течь: ['теку', 'течёшь', 'течёт', 'течём', 'течёте', 'текут'],
  беречь: ['берегу', 'бережёшь', 'бережёт', 'бережём', 'бережёте', 'берегут'],
  стричь: ['стригу', 'стрижёшь', 'стрижёт', 'стрижём', 'стрижёте', 'стригут']
};
function ruFinite(inf, person) {
  if (RU_IRR[inf]) return RU_IRR[inf][person];
  var stem = ruStem(inf); if (!stem) return '';
  if (person === 0 && stem.slice(-1) === 'и') {
    var b = stem.slice(0, -1);
    return b + (/[жшчщгкх]/.test(b.slice(-1)) ? 'у' : 'ю');
  }
  var last = stem.slice(-1);
  var conj2 = last === 'и';
  var I1 = /[жшчщгкх]/.test(last) ? 'у' : 'ю';
  var endings1 = [I1, 'ешь', 'ет', 'ем', 'ете', /[жшчщ]/.test(last) ? 'ут' : 'ют'];
  var II1 = /[жшчщ]/.test(last) ? 'у' : 'ю';
  var endings2 = [II1, 'ишь', 'ит', 'им', 'ите', 'ят'];
  return stem + (conj2 ? endings2 : endings1)[person];
}
function ruPast(inf, person) {
  var stem = ruStem(inf); if (!stem) return '';
  if (person === 2) return stem + 'ла';
  if (person === 4) return stem + 'ло';
  return stem + 'л';
}
function ruFut(inf, person) {
  return ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут'][person] + ' ' + inf;
}
function ruGloss(lang, tid, person, v) {
  var mode = ruMode(lang, tid);
  if (!mode) return '';
  var ru = v.ru || '';
  if (lang === 'es' && !ru && v.tr) {
    // у части испанских глаголов из A перевод на английском — ищем русский через словарь EN
    if (!window.__ES_RU) {
      window.__ES_RU = {};
      Object.keys(VD.en || {}).forEach(function (k) {
        var e = VD.en[k];
        if (e.tr && e.ru) window.__ES_RU[String(e.tr).toLowerCase()] = e.ru;
      });
    }
    ru = window.__ES_RU[String(v.tr).toLowerCase()] || '';
  }
  if (!ru) return '';
  var inf = ru.replace(/\(.*?\)/g, '').split(/[,;·/]/)[0].trim();
  var P = RU_PRON[lang] || RU_PRON.en;
  var pron = P[person] || '';
  if (mode === 'pres') {
    var f = ruFinite(inf, person);
    return f ? pron + ' ' + f : '';
  }
  if (mode === 'past') {
    var p = ruPast(inf, person);
    return p ? pron + ' ' + p : '';
  }
  if (mode === 'fut') return pron + ' ' + ruFut(inf, person);
  if (mode === 'cond') {
    var c = ruPast(inf, person);
    return c ? pron + ' бы ' + c : '';
  }
  if (mode === 'imp') {
    if (person !== 0) return '';
    var stem = ruStem(inf); if (!stem) return '';
    var f = stem.slice(-1) === 'и' ? stem + 'и' : stem + 'й';
    return f + '!';
  }
  return '';
}
`;

// --- 6) verbTrans рендерится без пустых секций + декодирование
part3 = part3.replace(
  "  $('verbTrans').innerHTML = 'meaning&nbsp;· <b>' + allowB(v.tr) + '</b> &nbsp;·&nbsp; <b class=\"ru\">' + esc(v.ru) + '</b>';",
  "  var transP = '';\n  if (v.tr) transP = 'meaning&nbsp;· <b>' + allowB(v.tr) + '</b>';\n  if (v.ru && transP) transP += ' &nbsp;·&nbsp; ';\n  if (v.ru) transP += '<b class=\"ru\">' + esc(decEnt(v.ru)) + '</b>';\n  $('verbTrans').innerHTML = transP;"
);

// --- 7) Клик по времени не должен сбрасывать глагол: hash-якоря -> кнопки со скроллом
head = head.replace('.tense-nav a{', '.tense-nav a,.tense-nav button{')
           .replace('.tense-nav a:hover{', '.tense-nav a:hover,.tense-nav button:hover{')
           .replace('.tense-nav a.current{', '.tense-nav a.current,.tense-nav button.current{');
part3 = part3.replace(
  "    nav += '<a href=\"#t' + i + '\" data-i=\"' + i + '\">' + esc(t.name) + '</a>';",
  "    nav += '<button type=\"button\" class=\"tense-nav-a\" data-i=\"' + i + '\">' + esc(t.name) + '</button>';"
);
part3 = part3.replace(
  "$('tenseNav').innerHTML = nav;\n  navLinks = Array.prototype.slice.call($('tenseNav').querySelectorAll('a'));",
  "$('tenseNav').innerHTML = nav;\n  navLinks = Array.prototype.slice.call($('tenseNav').querySelectorAll('.tense-nav-a'));\n  $('tenseNav').querySelectorAll('.tense-nav-a').forEach(function (b) {\n    b.addEventListener('click', function () {\n      var el = document.getElementById('t' + b.dataset.i);\n      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });\n    });\n  });"
);

// --- 8) Колонка «Перевод» в таблицах: заголовок + глосс в каждой строке
head = head.replace(
  'table.conj td.form span.orth{color:var(--text-2)}',
  'table.conj td.form span.orth{color:var(--text-2)}\n\ttable.conj td.gloss{color:var(--text-3);font-size:.82rem;font-style:italic;white-space:nowrap;padding-left:6px}'
);
part3 = part3.replace(
  "    html += '<div class=\"tbl-wrap\"><table class=\"conj\"><thead><tr><th>Pronoun</th><th>Conjugation</th><th style=\"text-align:right\">Audio</th></tr></thead><tbody>';",
  "    html += '<div class=\"tbl-wrap\"><table class=\"conj\"><thead><tr><th>Pronoun</th><th>Conjugation</th><th>Перевод</th><th style=\"text-align:right\">Audio</th></tr></thead><tbody>';"
);
part3 = part3.replace(
  "    data.rows.forEach(function (row) {\n      var tts = rowTTS(lang, row);\n      html += '<tr><td class=\"pron\">' + esc(rowDisplayPron(lang, row)) + '</td><td class=\"form\">' + allowB(row[1]) + '</td><td class=\"audio-cell\"><button class=\"spk\" data-tts=\"' + esc(tts) + '\" data-lang=\"' + lang + '\" aria-label=\"Listen: ' + esc(tts) + '\">' + SPK + '</button></td></tr>';\n    });",
  "    data.rows.forEach(function (row, ri) {\n      var tts = rowTTS(lang, row);\n      var gl = ruGloss(lang, t.id, ri, v);\n      html += '<tr><td class=\"pron\">' + esc(rowDisplayPron(lang, row)) + '</td><td class=\"form\">' + allowB(row[1]) + '</td>' +\n        '<td class=\"gloss\">' + (gl ? esc(gl) : '') + '</td>' +\n        '<td class=\"audio-cell\"><button class=\"spk\" data-tts=\"' + esc(tts) + '\" data-lang=\"' + lang + '\" aria-label=\"Listen: ' + esc(tts) + '\">' + SPK + '</button></td></tr>';\n    });"
);

// --- 9) Примеры: декодирование сущностей
part3 = part3.replace(
  "function exampleHtml(ex, lang) {\n  var tts = stripTags(ex.s);\n  var html = '<div class=\"example\"><button class=\"spk\" data-tts=\"' + esc(tts) + '\" data-lang=\"' + lang + '\" aria-label=\"Listen to example\">' + SPK + '</button><div class=\"ex-body\"><div class=\"ex-sentence\">' + allowB(ex.s) + '</div>';\n  if (ex.t) html += '<div class=\"ex-trans\">' + esc(ex.t) + '</div>';\n  if (ex.ru) html += '<div class=\"ex-trans ru\">' + esc(ex.ru) + '</div>';\n  return html + '</div></div>';\n}",
  "function exampleHtml(ex, lang) {\n  var tts = stripTags(decEnt(ex.s));\n  var html = '<div class=\"example\"><button class=\"spk\" data-tts=\"' + esc(tts) + '\" data-lang=\"' + lang + '\" aria-label=\"Listen to example\">' + SPK + '</button><div class=\"ex-body\"><div class=\"ex-sentence\">' + allowB(ex.s) + '</div>';\n  if (ex.t) html += '<div class=\"ex-trans\">' + esc(decEnt(ex.t)) + '</div>';\n  if (ex.ru) html += '<div class=\"ex-trans ru\">' + esc(decEnt(ex.ru)) + '</div>';\n  return html + '</div></div>';\n}"
);

// --- 10) Подсказки поиска: декодирование переводов
part3 = part3.replace(
  "      html += '<button class=\"sug-item\" role=\"option\" data-i=\"' + i + '\"><span class=\"v\">' + esc(e.inf) + '</span><span class=\"t\">' + esc(v.ru) + ' · ' + esc(v.tr) + (e.kind === 'form' ? ' — “' + stripTags(e.form) + '”' : '') + '</span><span class=\"chip\">' + chip + '</span></button>';",
  "      html += '<button class=\"sug-item\" role=\"option\" data-i=\"' + i + '\"><span class=\"v\">' + esc(e.inf) + '</span><span class=\"t\">' + esc(decEnt(v.ru)) + ' · ' + esc(decEnt(v.tr)) + (e.kind === 'form' ? ' — “' + stripTags(e.form) + '”' : '') + '</span><span class=\"chip\">' + chip + '</span></button>';"
);

// --- 11) Гарантия Imperativo у испанских глаголов (если не сгенерирован)
const ensureImp = `
/* ================= Ensure Spanish imperative exists ================= */
(function () {
  Object.keys(VD.es || {}).forEach(function (inf) {
    var v = VD.es[inf];
    if (v.tenses.imp) return;
    var pr = v.tenses.pres && v.tenses.pres.rows;
    var sj = v.tenses.subj && v.tenses.subj.rows;
    if (!pr || !sj) return;
    var bare = inf.replace(/(se|me|te)$/, '');
    var stem = bare.slice(0, -2);
    var suff = /ar$/.test(bare) ? 'ad' : /ir$/.test(bare) ? 'id' : 'ed';
    var forms = [pr[2][1], sj[2][1], sj[3][1], stem + suff, sj[5][1]]
      .map(function (f) { return String(f).replace(/<[^>]+>/g, ''); });
    v.tenses.imp = { rows: ['(tú)', '(usted)', '(nosotros)', '(vosotros)', '(ustedes)']
      .map(function (p, i) { return [p, forms[i], p]; }) };
  });
})();
`;

const bridge = `
/* ================= Data bridge: large verified datasets (EN 160 / FR 147 / ES 151) ================= */
(function () {
  var AI_MAP = {
    en: { 'Present Simple': 'pres', 'Present Continuous': 'prescont', 'Present Perfect': 'presperf',
           'Past Simple': 'past', 'Past Continuous': 'pastcont', 'Past Perfect': 'pastperf',
           'Future Simple': 'fut', 'Future Continuous': 'futcont', 'Future Perfect': 'futperf',
           'Present Perfect Continuous': 'presperfcont', 'Past Perfect Continuous': 'pastperfcont',
           'Conditional': 'cond' },
    fr: { 'Présent': 'pres', 'Imparfait': 'impf', 'Futur simple': 'fut', 'Passé composé': 'pc',
           'Plus-que-parfait': 'pq', 'Conditionnel présent': 'cond', 'Subjonctif présent': 'subj',
           'Futur antérieur': 'fa', 'Conditionnel passé': 'cp', 'Subjonctif passé': 'sp' },
    es: { 'Presente': 'pres', 'Pretérito perfecto compuesto': 'pc', 'Imperfecto': 'impf',
           'Pretérito pluscuamperfecto': 'plus', 'Pretérito perfecto simple': 'pret', 'Futuro simple': 'fut',
           'Futuro perfecto': 'fc', 'Condicional simple': 'cond', 'Condicional perfecto': 'cc',
           'Subjuntivo presente': 'subj', 'Pretérito perfecto de subjuntivo': 'sp', 'Imperativo': 'imp' }
  };
  var AI_PRON = {
    en: ['I', 'you', 'he / she / it', 'we', 'you', 'they'],
    fr: ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'],
    es: ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ellas / ustedes']
  };
  var SRC = { en: window.CONJ_DATA_EN, fr: window.CONJ_DATA_FR, es: window.CONJ_DATA_ES };
  ['en', 'fr', 'es'].forEach(function (lang) {
    var d = SRC[lang]; if (!d || !d.verbs) return;
    VD[lang] = VD[lang] || {};
    var PR = AI_PRON[lang], map = AI_MAP[lang] || {};
    Object.keys(d.verbs).forEach(function (inf) {
      var src = d.verbs[inf];
      var v = { inf: inf, ru: '', tr: '', type: src.type || '', tags: [], tenses: {}, vex: [] };
      if (lang === 'es') v.tr = src.translation || '';
      else v.ru = src.translation || '';
      Object.keys(src.tenses).forEach(function (tn) {
        var tid = map[tn]; if (!tid) return;
        var td = src.tenses[tn], forms = td.forms.slice(), rows = [];
        if (lang === 'es' && tid === 'imp' && forms.length === 6 && forms[0] === '—') forms.shift(); // пустая строка yo
        for (var i = 0; i < forms.length; i++) rows.push([PR[i] || '', forms[i], PR[i] || '']);
        v.tenses[tid] = { rows: rows };
        if (td.example && String(td.example).trim() && String(td.example).indexOf('—') === -1) {
          v.tenses[tid].ex = [{ s: td.example, t: null, ru: null }];
        }
      });
      VD[lang][inf] = v;
    });
  });
})();
`;

const out =
  head +
  part1 + '\n</script>\n' +
  '<script src="data/english.js"></script>\n' +
  '<script src="data/french.js"></script>\n' +
  '<script src="data/spanish.js"></script>\n' +
  '<script>\n' +
  bridge + '\n' +
  part2 + '\n' +
  ensureImp + '\n' +
  part3;

fs.writeFileSync(OUT, out, 'utf8');
console.log('written', OUT, out.length, 'bytes');

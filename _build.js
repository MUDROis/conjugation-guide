// Сборка финального index.html:
//   UI/движок — из verb-conjugation (1).html (вариант C)
//   Большой верифицированный словарь — из outputs/data (вариант A):
//     EN 160 глаголов, FR 147, ES 151, мост A->VD перед богатыми оверрайдами C
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
let part1 = C.slice(openIdx, enDataIdx);                // утилиты + движки
const part2 = C.slice(enDataIdx, searchIdx);            // богатые вызовы ENG/FRG/SPG + ADD
let part3 = C.slice(searchIdx);                         // поиск + приложение + закрытие

// --- 1) В TENSES.en добавить английский Conditional (есть в данных A)
const gotoLine = "    { id: 'goto',         name: 'Future (going to)',          ru: 'намеренное будущее',         aux: 'am / is / are going to + base form' }";
if (!part1.includes('id: \'cond\'') && part1.includes(gotoLine)) {
  part1 = part1.replace(gotoLine, gotoLine + ',\n    { id: \'cond\', name: \'Conditional\', ru: \'условное\', aux: \'would + base form\' }');
}

// --- 2) Hero: упомянуть объём словаря
part3 = part3.replace(
  'Look up a verb in <b>English</b>, <b>French</b> or <b>Spanish</b> and see its complete conjugation — with example sentences and audio for every form.',
  'Look up a verb in <b>English</b>, <b>French</b> or <b>Spanish</b> and see its complete conjugation — 160 + 147 + 151 verbs, with example sentences and audio for every form.'
);

// --- 3) verbTrans рендерится без пустых секций (у данных A нет tr для EN/FR)
part3 = part3.replace(
  "  $('verbTrans').innerHTML = 'meaning&nbsp;· <b>' + allowB(v.tr) + '</b> &nbsp;·&nbsp; <b class=\"ru\">' + esc(v.ru) + '</b>';",
  "  var transP = '';\n  if (v.tr) transP = 'meaning&nbsp;· <b>' + allowB(v.tr) + '</b>';\n  if (v.ru && transP) transP += ' &nbsp;·&nbsp; ';\n  if (v.ru) transP += '<b class=\"ru\">' + esc(v.ru) + '</b>';\n  $('verbTrans').innerHTML = transP;"
);

// --- 4) Клик по времени не должен сбрасывать глагол: hash-якоря -> кнопки со скроллом
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

// --- 4) Мост: большой словарь A -> формат VD (запускается ДО вызовов C)
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
  part3;

fs.writeFileSync(OUT, out, 'utf8');
console.log('written', OUT, out.length, 'bytes');

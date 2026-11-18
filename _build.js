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

// --- 1) В TENSES.en добавить английский Conditional (есть в данных A); в TENSES.es — Imperativo
const gotoLine = "    { id: 'goto',         name: 'Future (going to)',          ru: 'намеренное будущее',         aux: 'am / is / are going to + base form' }";
if (!part1.includes('id: \'cond\'') && part1.includes(gotoLine)) {
  part1 = part1.replace(gotoLine, gotoLine + ',\n    { id: \'cond\', name: \'Conditional\', ru: \'условное\', aux: \'would + base form\' }');
}
const esSpLine = "'que + haber (subjuntivo) + participle' }";
if (!part1.includes("id: 'imp', name: 'Imperativo'") && part1.includes(esSpLine)) {
  part1 = part1.replace(esSpLine, esSpLine + ',\n    { id: \'imp\', name: \'Imperativo\', ru: \'повелительное наклонение\', aux: \'orders & requests — tú, usted, nosotros, vosotros, ustedes\' }');
}

// --- 2) Hero: упомянуть объём словаря
part3 = part3.replace(
  'Look up a verb in <b>English</b>, <b>French</b> or <b>Spanish</b> and see its complete conjugation — with example sentences and audio for every form.',
  'Look up a verb in <b>English</b>, <b>French</b> or <b>Spanish</b> and see its complete conjugation — hundreds of B2 verbs, with example sentences, translations and audio for every form.'
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

// --- 5) Движок русских глоссов для форм (v3: полноценная модель спряжения)
part1 += `
/* ================= Russian glosses for conjugated forms (v3) ================= */
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
/* Только «чистые» однословные инфинитивы; многословные/скобочные переводы пропускаем */
function ruNormInf(inf) {
  var s = String(inf).toLowerCase().trim().replace(/\\([^)]*\\)\\s*/g, '').replace(/[,;·/].*$/, '').trim();
  if (/[\\s«»]/.test(s)) return '';
  return s;
}
function ruStem(inf) {
  var s = String(inf).toLowerCase().trim();
  if (s.slice(-2) === 'ть') return s.slice(0, -2);
  if (s.slice(-2) === 'ти') return s.slice(0, -2);
  return null;
}
/* II спряжение на -еть / -ать (прочие -еть/-ать — I) */
var RU_II_ET = { видеть:1, смотреть:1, терпеть:1, вертеть:1, обидеть:1, зависеть:1, ненавидеть:1, сидеть:1, глядеть:1, лететь:1, шуметь:1, звенеть:1, свистеть:1, кипеть:1, храпеть:1, висеть:1, гореть:1, сопеть:1, шипеть:1 };
var RU_II_AT = { держать:1, слышать:1, дышать:1, спать:1, лежать:1, молчать:1, кричать:1, стучать:1, визжать:1, дрожать:1, рычать:1, ворчать:1, бренчать:1, звучать:1, стоять:1, содержать:1, принадлежать:1 };
/* I спряжение с изменяемой основой (форма ко всем лицам) */
var RU_I_MUT = {
  писать:'пиш', плакать:'плач', махать:'маш', искать:'ищ', сказать:'скаж',
  резать:'реж', чесать:'чеш', шептать:'шепч', пахать:'паш', прятать:'пряч',
  скакать:'скач', топтать:'топч', хлопотать:'хлопоч', бормотать:'бормоч',
  лепетать:'лепеч', трепетать:'трепеч', рокотать:'рокоч', грохотать:'грохоч',
  хохотать:'хохоч', колебать:'колебл', сыпать:'сыпл', капать:'капл',
  дремать:'дремл', щебетать:'щебеч', клокотать:'клокоч', смеяться:'сме',
  надеяться:'наде', стелить:'стел', зиждиться:'зижд', казаться:'каж',
  танцевать:'танцу', воевать:'вою', плевать:'плю', жевать:'жу', клевать:'клю'
};
var RU_IRR = {
  быть: ['есть', 'есть', 'есть', 'есть', 'есть', 'есть'],
  идти: ['иду', 'идёшь', 'идёт', 'идём', 'идёте', 'идут'],
  есть: ['ем', 'ешь', 'ест', 'едим', 'едите', 'едят'],
  мочь: ['могу', 'можешь', 'может', 'можем', 'можете', 'могут'],
  хотеть: ['хочу', 'хочешь', 'хочет', 'хотим', 'хотите', 'хотят'],
  бежать: ['бегу', 'бежишь', 'бежит', 'бежим', 'бежите', 'бегут'],
  давать: ['даю', 'даёшь', 'даёт', 'даём', 'даёте', 'дают'],
  продавать: ['продаю', 'продаёшь', 'продаёт', 'продаём', 'продаёте', 'продают'],
  вставать: ['встаю', 'встаёшь', 'встаёт', 'встаём', 'встаёте', 'встают'],
  узнавать: ['узнаю', 'узнаёшь', 'узнаёт', 'узнаём', 'узнаёте', 'узнают'],
  признавать: ['признаю', 'признаёшь', 'признаёт', 'признаём', 'признаёте', 'признают'],
  создавать: ['создаю', 'создаёшь', 'создаёт', 'создаём', 'создаёте', 'создают'],
  предавать: ['предаю', 'предаёшь', 'предаёт', 'предаём', 'предаёте', 'предают'],
  удаваться: ['удаюсь', 'удаёшься', 'удаётся', 'удаёмся', 'удаётесь', 'удаются'],
  оставаться: ['остаюсь', 'остаёшься', 'остаётся', 'остаёмся', 'остаётесь', 'остаются'],
  встать: ['встану', 'встанешь', 'встанет', 'встанем', 'встанете', 'встанут'],
  понять: ['пойму', 'поймёшь', 'поймёт', 'поймём', 'поймёте', 'поймут'],
  принять: ['приму', 'примешь', 'примет', 'примем', 'примете', 'примут'],
  снять: ['сниму', 'снимешь', 'снимет', 'снимем', 'снимете', 'снимут'],
  взять: ['возьму', 'возьмёшь', 'возьмёт', 'возьмём', 'возьмёте', 'возьмут'],
  брать: ['беру', 'берёшь', 'берёт', 'берём', 'берёте', 'берут'],
  звать: ['зову', 'зовёшь', 'зовёт', 'зовём', 'зовёте', 'зовут'],
  ждать: ['жду', 'ждёшь', 'ждёт', 'ждём', 'ждёте', 'ждут'],
  гнать: ['гоню', 'гонишь', 'гонит', 'гоним', 'гоните', 'гонят'],
  жить: ['живу', 'живёшь', 'живёт', 'живём', 'живёте', 'живут'],
  плыть: ['плыву', 'плывёшь', 'плывёт', 'плывём', 'плывёте', 'плывут'],
  слыть: ['слыву', 'слывёшь', 'слывёт', 'слывём', 'слывёте', 'слывут'],
  мыть: ['мою', 'моешь', 'моет', 'моем', 'моете', 'моют'],
  петь: ['пою', 'поёшь', 'поёт', 'поём', 'поёте', 'поют'],
  пить: ['пью', 'пьёшь', 'пьёт', 'пьём', 'пьёте', 'пьют'],
  бить: ['бью', 'бьёшь', 'бьёт', 'бьём', 'бьёте', 'бьют'],
  лить: ['лью', 'льёшь', 'льёт', 'льём', 'льёте', 'льют'],
  вить: ['вью', 'вьёшь', 'вьёт', 'вьём', 'вьёте', 'вьют'],
  шить: ['шью', 'шьёшь', 'шьёт', 'шьём', 'шьёте', 'шьют'],
  спать: ['сплю', 'спишь', 'спит', 'спим', 'спите', 'спят'],
  слать: ['шлю', 'шлёшь', 'шлёт', 'шлём', 'шлёте', 'шлют'],
  стлать: ['стелю', 'стелешь', 'стелет', 'стелем', 'стелете', 'стелют'],
  врать: ['вру', 'врёшь', 'врёт', 'врём', 'врёте', 'врут'],
  рвать: ['рву', 'рвёшь', 'рвёт', 'рвём', 'рвёте', 'рвут'],
  ехать: ['еду', 'едешь', 'едет', 'едем', 'едете', 'едут'],
  ездить: ['езжу', 'ездишь', 'ездит', 'ездим', 'ездите', 'ездят'],
  ходить: ['хожу', 'ходишь', 'ходит', 'ходим', 'ходите', 'ходят'],
  носить: ['ношу', 'носишь', 'носит', 'носим', 'носите', 'носят'],
  возить: ['вожу', 'возишь', 'возит', 'возим', 'возите', 'возят'],
  просить: ['прошу', 'просишь', 'просит', 'просим', 'просите', 'просят'],
  красить: ['крашу', 'красишь', 'красит', 'красим', 'красите', 'красят'],
  бросить: ['брошу', 'бросишь', 'бросит', 'бросим', 'бросите', 'бросят'],
  весить: ['вешу', 'весишь', 'весит', 'весим', 'весите', 'весят'],
  чистить: ['чищу', 'чистишь', 'чистит', 'чистим', 'чистите', 'чистят'],
  грустить: ['грущу', 'грустишь', 'грустит', 'грустим', 'грустите', 'грустят'],
  крутить: ['кручу', 'крутишь', 'крутит', 'крутим', 'крутите', 'крутят'],
  платить: ['плачу', 'платишь', 'платит', 'платим', 'платите', 'платят'],
  шутить: ['шучу', 'шутишь', 'шутит', 'шутим', 'шутите', 'шутят'],
  ответить: ['отвечу', 'ответишь', 'ответит', 'ответим', 'ответите', 'ответят'],
  посетить: ['посещу', 'посетишь', 'посетит', 'посетим', 'посетите', 'посетят'],
  любить: ['люблю', 'любишь', 'любит', 'любим', 'любите', 'любят'],
  готовить: ['готовлю', 'готовишь', 'готовит', 'готовим', 'готовите', 'готовят'],
  ставить: ['ставлю', 'ставишь', 'ставит', 'ставим', 'ставите', 'ставят'],
  ловить: ['ловлю', 'ловишь', 'ловит', 'ловим', 'ловите', 'ловят'],
  кормить: ['кормлю', 'кормишь', 'кормит', 'кормим', 'кормите', 'кормят'],
  купить: ['куплю', 'купишь', 'купит', 'купим', 'купите', 'купят'],
  терпеть: ['терплю', 'терпишь', 'терпит', 'терпим', 'терпите', 'терпят'],
  видеть: ['вижу', 'видишь', 'видит', 'видим', 'видите', 'видят'],
  сидеть: ['сижу', 'сидишь', 'сидит', 'сидим', 'сидите', 'сидят'],
  смотреть: ['смотрю', 'смотришь', 'смотрит', 'смотрим', 'смотрите', 'смотрят'],
  лететь: ['лечу', 'летишь', 'летит', 'летим', 'летите', 'летят'],
  вертеть: ['верчу', 'вертишь', 'вертит', 'вертим', 'вертите', 'вертят'],
  держать: ['держу', 'держишь', 'держит', 'держим', 'держите', 'держат'],
  слышать: ['слышу', 'слышишь', 'слышит', 'слышим', 'слышите', 'слышат'],
  дышать: ['дышу', 'дышишь', 'дышит', 'дышим', 'дышите', 'дышат'],
  лежать: ['лежу', 'лежишь', 'лежит', 'лежим', 'лежите', 'лежат'],
  молчать: ['молчу', 'молчишь', 'молчит', 'молчим', 'молчите', 'молчат'],
  кричать: ['кричу', 'кричишь', 'кричит', 'кричим', 'кричите', 'кричат'],
  стучать: ['стучу', 'стучишь', 'стучит', 'стучим', 'стучите', 'стучат'],
  стоять: ['стою', 'стоишь', 'стоит', 'стоим', 'стоите', 'стоят'],
  содержать: ['содержу', 'содержишь', 'содержит', 'содержим', 'содержите', 'содержат'],
  принадлежать: ['принадлежу', 'принадлежишь', 'принадлежит', 'принадлежим', 'принадлежите', 'принадлежат'],
  зависеть: ['завишу', 'зависишь', 'зависит', 'зависим', 'зависите', 'зависят'],
  ненавидеть: ['ненавижу', 'ненавидишь', 'ненавидит', 'ненавидим', 'ненавидите', 'ненавидят'],
  класть: ['кладу', 'кладёшь', 'кладёт', 'кладём', 'кладёте', 'кладут'],
  нести: ['несу', 'несёшь', 'несёт', 'несём', 'несёте', 'несут'],
  вести: ['веду', 'ведёшь', 'ведёт', 'ведём', 'ведёте', 'ведут'],
  расти: ['расту', 'растёшь', 'растёт', 'растём', 'растёте', 'растут'],
  лгать: ['лгу', 'лжёшь', 'лжёт', 'лжём', 'лжёте', 'лгут'],
  бояться: ['боюсь', 'боишься', 'боится', 'боимся', 'боитесь', 'боятся'],
  учиться: ['учусь', 'учишься', 'учится', 'учимся', 'учитесь', 'учатся'],
  смеяться: ['смеюсь', 'смеёшься', 'смеётся', 'смеёмся', 'смеётесь', 'смеются'],
  надеяться: ['надеюсь', 'надеешься', 'надеется', 'надеемся', 'надеетесь', 'надеются'],
  ложиться: ['ложусь', 'ложишься', 'ложится', 'ложимся', 'ложитесь', 'ложатся'],
  садиться: ['сажусь', 'садишься', 'садится', 'садимся', 'садитесь', 'садятся'],
  просыпаться: ['просыпаюсь', 'просыпаешься', 'просыпается', 'просыпаемся', 'просыпаетесь', 'просыпаются'],
  купаться: ['купаюсь', 'купаешься', 'купается', 'купаемся', 'купаетесь', 'купаются'],
  улыбаться: ['улыбаюсь', 'улыбаешься', 'улыбается', 'улыбаемся', 'улыбаетесь', 'улыбаются'],
  заниматься: ['занимаюсь', 'занимаешься', 'занимается', 'занимаемся', 'занимаетесь', 'занимаются'],
  интересоваться: ['интересуюсь', 'интересуешься', 'интересуется', 'интересуемся', 'интересуетесь', 'интересуются'],
  извиняться: ['извиняюсь', 'извиняешься', 'извиняется', 'извиняемся', 'извиняетесь', 'извиняются'],
  возвращаться: ['возвращаюсь', 'возвращаешься', 'возвращается', 'возвращаемся', 'возвращаетесь', 'возвращаются'],
  отправляться: ['отправляюсь', 'отправляешься', 'отправляется', 'отправляемся', 'отправляетесь', 'отправляются'],
  одеваться: ['одеваюсь', 'одеваешься', 'одевается', 'одеваемся', 'одеваетесь', 'одеваются'],
  раздеваться: ['раздеваюсь', 'раздеваешься', 'раздевается', 'раздеваемся', 'раздеваетесь', 'раздеваются'],
  бриться: ['бреюсь', 'бреешься', 'бреется', 'бреемся', 'бреетесь', 'бреются'],
  жениться: ['женюсь', 'женишься', 'женится', 'женимся', 'женитесь', 'женятся'],
  встретиться: ['встречусь', 'встретишься', 'встретится', 'встретимся', 'встретитесь', 'встретятся'],
  остаться: ['останусь', 'останешься', 'останется', 'останемся', 'останетесь', 'останутся'],
  бороться: ['борюсь', 'борешься', 'борется', 'боремся', 'боретесь', 'борются'],
  мчаться: ['мчусь', 'мчишься', 'мчится', 'мчимся', 'мчитесь', 'мчатся'],
  драться: ['дерусь', 'дерёшься', 'дерётся', 'дерёмся', 'дерётесь', 'дерутся'],
  собраться: ['соберусь', 'соберёшься', 'соберётся', 'соберёмся', 'соберётесь', 'соберутся'],
  добраться: ['доберусь', 'доберёшься', 'доберётся', 'доберёмся', 'доберётесь', 'доберутся']
};
var RU_MUT = { д:'ж', з:'ж', т:'ч', с:'ш', ст:'щ', ск:'щ', б:'бл', п:'пл', в:'вл', м:'мл', ф:'фл', г:'ж', к:'ч', х:'ш' };
var RU_REFX = ['сь', 'ся', 'ся', 'ся', 'сь', 'ся'];
var RU_IMP = {
  быть: 'будь', есть: 'ешь', идти: 'иди', ехать: 'поезжай', ездить: 'езди',
  класть: 'клади', нести: 'неси', вести: 'веди', расти: 'расти', лгать: 'лги',
  мочь: 'моги', хотеть: 'хоти', бежать: 'беги', лечь: 'ляг', печь: 'пеки',
  течь: 'теки', беречь: 'береги', стричь: 'стриги', тонуть: 'тони',
  взять: 'возьми', понять: 'пойми', принять: 'прими', снять: 'сними',
  брать: 'бери', звать: 'зови', ждать: 'жди', гнать: 'гони',
  спать: 'спи', слать: 'шли', стлать: 'стели', врать: 'ври', рвать: 'рви',
  мыть: 'мой', петь: 'пой', пить: 'пей', бить: 'бей', лить: 'лей',
  вить: 'вей', шить: 'шей', жить: 'живи', плыть: 'плыви', слыть: 'слыви',
  давать: 'давай', продавать: 'продавай', вставать: 'вставай', узнавать: 'узнавай',
  признавать: 'признавай', создавать: 'создавай', предавать: 'предавай',
  встать: 'встань', сесть: 'сядь', остаться: 'останься', удаваться: 'удавайся', оставаться: 'оставайся',
  бояться: 'бойся', учиться: 'учись', смеяться: 'смейся', надеяться: 'надейся',
  ложиться: 'ложись', садиться: 'садись', просыпаться: 'просыпайся',
  купаться: 'купайся', улыбаться: 'улыбайся', заниматься: 'занимайся',
  интересоваться: 'интересуйся', извиняться: 'извиняйся', возвращаться: 'возвращайся',
  отправляться: 'отправляйся', одеваться: 'одевайся', раздеваться: 'раздевайся',
  бриться: 'брейся', жениться: 'женись', встретиться: 'встреться',
  бороться: 'борись', мчаться: 'мчись', драться: 'дерись', собраться: 'соберись',
  добраться: 'доберись', пытаться: 'пытайся', казаться: 'кажись',
  сомневаться: 'сомневайся', случаться: 'случайся', слушаться: 'слушайся',
  молиться: 'молись', восхищаться: 'восхищайся', сражаться: 'сражайся',
  соглашаться: 'соглашайся', появляться: 'появляйся', подниматься: 'поднимайся',
  становиться: 'становись', заботиться: 'заботься', рождаться: 'рождайся',
  называться: 'называйся', беспокоиться: 'беспокойся', торопиться: 'торопись',
  наслаждаться: 'наслаждайся', проваливаться: 'проваливайся', фокусироваться: 'фокусируйся',
  продвигаться: 'продвигайся', спускаться: 'спускайся', замедляться: 'замедляйся',
  взбираться: 'взбирайся', воссоединяться: 'воссоединяйся', двигаться: 'двигайся',
  писать: 'пиши', сказать: 'скажи', искать: 'ищи', махать: 'маши',
  резать: 'режь', плакать: 'плачь', прятать: 'прячь', шептать: 'шепчи',
  пахать: 'паши', скакать: 'скачи', топтать: 'топчи', хлопотать: 'хлопочи',
  бормотать: 'бормочи', лепетать: 'лепечи', трепетать: 'трепечи',
  рокотать: 'рокочи', грохотать: 'грохочи', хохотать: 'хохочи',
  клокотать: 'клокочи', колебать: 'колебли', сыпать: 'сыпь', капать: 'капай',
  дремать: 'дремли', щебетать: 'щебечи', танцевать: 'танцуй', воевать: 'воюй',
  плевать: 'плюй', жевать: 'жуй', клевать: 'клюй', стелить: 'стели',
  зиждиться: 'зиждись', видеть: 'видь', сидеть: 'сиди', смотреть: 'смотри',
  лететь: 'лети', вертеть: 'верти', держать: 'держи', слышать: 'слыши',
  дышать: 'дыши', лежать: 'лежи', молчать: 'молчи', кричать: 'кричи',
  стучать: 'стучи', стоять: 'стой', содержать: 'содержи', принадлежать: 'принадлежи',
  зависеть: 'зависи', ненавидеть: 'ненавидь', любить: 'люби', готовить: 'готовь',
  ставить: 'ставь', ловить: 'лови', кормить: 'корми', купить: 'купи',
  терпеть: 'терпи', ходить: 'ходи', носить: 'носи', возить: 'вози',
  просить: 'проси', красить: 'крась', бросить: 'брось', весить: 'весь',
  чистить: 'чисти', грустить: 'грусти', крутить: 'крути', платить: 'плати',
  шутить: 'шути', ответить: 'ответь', посетить: 'посети'
};
function ruImper(inf) {
  if (RU_IMP[inf]) return RU_IMP[inf];
  var kind = ruKind(inf);
  if (kind === 'irr') return '';
  var refl = /ться$/.test(inf);
  var p3 = ruFinite(inf, 5);
  if (!p3) return '';
  if (/ят$|ат$/.test(p3)) return p3.slice(0, -2) + 'и' + (refl ? 'сь' : '');
  var b = p3.slice(0, -2);
  if (/[жшчщ]/.test(b.slice(-1))) return b + 'ь' + (refl ? 'ся' : '');
  return b + 'й' + (refl ? 'ся' : '');
}
function ruKind(inf) {
  if (/ться$/.test(inf)) {
    if (RU_IRR[inf]) return 'irr';
    var noSya = inf.slice(0, -2);                         // молиться -> молить
    if (/овать$/.test(noSya)) return 'refIov';            // интересоваться -> интересовать
    if (/ить$/.test(noSya)) return 'refII';               // молиться -> молить
    return 'refI';
  }
  if (/ить$/.test(inf)) return 'II';
  if (/еть$/.test(inf)) return RU_II_ET[inf] ? 'II' : 'I';
  if (/ать$|ять$/.test(inf)) return RU_II_AT[inf] ? 'II' : 'I';
  return 'I';
}
function ruPresStem(inf, kind) {
  if (RU_I_MUT[inf]) return RU_I_MUT[inf];             // писать->пиш, жевать->жу
  if (kind === 'II') return inf.slice(0, -3);          // говорить->говор, видеть->вид, спать->сп
  if (kind === 'refII') return inf.slice(0, -5);       // учиться->уч, молиться->мол
  if (kind === 'refIov') {
    var ns = inf.slice(0, -2);                            // интересоваться -> интересовать
    return ns.slice(0, -5) + 'у';                         // интересовать -> интересу
  }
  if (kind === 'refI') return inf.slice(0, -4);        // пытаться->пыта
  if (/нуть$/.test(inf)) return inf.slice(0, -3);      // тонуть->тон
  if (/овать$/.test(inf)) return inf.slice(0, -5) + 'у'; // требовать->требу
  if (/евать$/.test(inf)) return inf.slice(0, -2);     // сомневать->сомнева
  return inf.slice(0, -2);                              // читать->чита
}
function ruFinite(inf, person) {
  if (RU_IRR[inf]) return RU_IRR[inf][person];
  var refl = /ться$/.test(inf);
  var kind = ruKind(inf);
  var stem = ruPresStem(inf, kind);
  var f;
  if (kind === 'II' || kind === 'refII') {
    if (person === 0) {
      var last = stem.slice(-1);
      var mu = RU_MUT[last] || last;
      f = stem.slice(0, -1) + mu + (/[жшчщ]/.test(mu) ? 'у' : 'ю');
    } else {
      var ends2 = ['', 'ишь', 'ит', 'им', 'ите', /[жшчщ]/.test(stem.slice(-1)) ? 'ат' : 'ят'];
      f = stem + ends2[person];
    }
  } else {
    if (person === 0) {
      f = (kind === 'I' && /нуть$/.test(inf)) ? stem + 'у' : stem + (/[жшчщ]/.test(stem.slice(-1)) ? 'у' : 'ю');
    } else {
      var ends1 = ['', 'ешь', 'ет', 'ем', 'ете', (/нуть$/.test(inf) || /[жшчщ]/.test(stem.slice(-1))) ? 'ут' : 'ют'];
      f = stem + ends1[person];
    }
  }
  return f + (refl ? RU_REFX[person] : '');
}
var RU_PAST_IRR = {
  идти: ['шёл', 'шла', 'шло', 'шли'],
  есть: ['ел', 'ела', 'ело', 'ели'],
  мочь: ['мог', 'могла', 'могло', 'могли'],
  класть: ['клал', 'клала', 'клало', 'клали'],
  нести: ['нёс', 'несла', 'несло', 'несли'],
  вести: ['вёл', 'вела', 'вело', 'вели'],
  расти: ['рос', 'росла', 'росло', 'росли'],
  лгать: ['лгал', 'лгала', 'лгало', 'лгали'],
  лечь: ['лёг', 'легл', 'легло', 'легли'],
  печь: ['пёк', 'пекла', 'пекло', 'пекли'],
  течь: ['тёк', 'текла', 'текло', 'текли'],
  беречь: ['берёг', 'берегла', 'берегло', 'берегли'],
  стричь: ['стриг', 'стригла', 'стригло', 'стригли'],
  взять: ['взял', 'взяла', 'взяло', 'взяли'],
  понять: ['понял', 'поняла', 'поняло', 'поняли'],
  принять: ['принял', 'приняла', 'приняло', 'приняли'],
  снять: ['снял', 'сняла', 'сняло', 'сняли'],
  встать: ['встал', 'встала', 'встало', 'встали'],
  остаться: ['остался', 'осталась', 'осталось', 'остались']
};
function ruPast(inf, person) {
  var refl = /ться$/.test(inf);
  var bare = refl ? inf.slice(0, -2) : inf;              // заботиться -> заботить
  if (RU_PAST_IRR[inf]) return RU_PAST_IRR[inf][person === 3 || person === 4 || person === 5 ? 3 : person === 2 ? 1 : 0];
  var stem = ruStem(bare); if (!stem) return '';
  var f = (person === 3 || person === 4 || person === 5) ? stem + 'ли' : stem + 'л';
  if (refl) f += (person === 3 || person === 4 || person === 5) ? 'сь' : 'ся';
  return f;
}
function ruFut(inf, person) {
  var aux = ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут'][person];
  return aux + ' ' + inf;
}
function ruGloss(lang, tid, person, v) {
  var mode = ruMode(lang, tid);
  if (!mode) return '';
  var ru = v.ru || '';
  if (lang === 'es' && !ru && v.tr) {
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
  var inf = ruNormInf(ru);
  if (!inf) return '';
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
  if (mode === 'fut') {
    if (inf === 'быть') return pron + ' ' + ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут'][person];
    return pron + ' ' + ruFut(inf, person);
  }
  if (mode === 'cond') {
    var c = ruPast(inf, person);
    return c ? pron + ' бы ' + c : '';
  }
  if (mode === 'imp') {
    var imp = ruImper(inf);
    if (!imp) return '';
    if (person === 0) return imp + '!';
    if (person === 2) return (inf === 'быть' ? 'будем!' : 'давайте ' + inf + '!');
    return imp + 'те!';
  }
  return '';
}
`;

// --- 6) verbTrans рендерится без пустых секций + декодирование + 3 формы английских неправильных
part3 = part3.replace(
  "  $('verbTrans').innerHTML = 'meaning&nbsp;· <b>' + allowB(v.tr) + '</b> &nbsp;·&nbsp; <b class=\"ru\">' + esc(v.ru) + '</b>';",
  "  var transP = '';\n  if (v.tr) transP = 'meaning&nbsp;· <b>' + allowB(v.tr) + '</b>';\n  if (v.ru && transP) transP += ' &nbsp;·&nbsp; ';\n  if (v.ru) transP += '<b class=\"ru\">' + esc(decEnt(v.ru)) + '</b>';\n  if (lang === 'en' && /irregular/i.test(String(v.type))) {\n    var pastForms = [];\n    if (v.tenses.past) v.tenses.past.rows.forEach(function (r) { var f = stripTags(r[1]); if (f && pastForms.indexOf(f) < 0) pastForms.push(f); });\n    var ppForms = [];\n    if (v.tenses.presperf) v.tenses.presperf.rows.forEach(function (r) { var f = stripTags(r[1]).replace(/^(have|has)\\s+/i, ''); if (f && ppForms.indexOf(f) < 0) ppForms.push(f); });\n    var pastF = pastForms.join(' / ');\n    var ppF = ppForms.join(' / ');\n    if (pastF && ppF) transP += '<div class=\"verb-principal\">' + esc(v.inf) + ' - ' + esc(pastF) + ' - ' + esc(ppF) + '</div>';\n  }\n  $('verbTrans').innerHTML = transP;"
);

// --- 14) Немецкий язык: движок, времён, язык, глоссы
part1 += `
/* ============ German conjugation engine ============ */
var DE_P = ['ich', 'du', 'er / sie / es', 'wir', 'ihr', 'sie / Sie'];
var DE_T = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
var DE_AUX_H = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
var DE_AUX_S = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];
var DE_AUX_HABEN = ['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten'];
var DE_AUX_SEIN = ['war', 'warst', 'war', 'waren', 'wart', 'waren'];
var DE_WERDEN = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'];
var DE_WUERDE = ['würde', 'würdest', 'würde', 'würden', 'würdet', 'würden'];
function deSep(inf) {
  var i = inf.indexOf(' ');
  return i > 0 ? [inf.slice(0, i), inf.slice(i + 1)] : [inf, ''];
}
function deConn(stem) { return /[td]$/.test(stem) ? 'e' : ''; }
function deStem(bare) {
  if (/en$/.test(bare)) return bare.slice(0, -2);
  return bare.slice(0, -1); // -eln/-ern: lächeln → lächel, wandern → wander
}
function deWeakPresent(stem) {
  var conn = deConn(stem);
  var du = /[sßzx]$/.test(stem) ? stem + 't' : stem + conn + 'st';
  return [stem + 'e', du, stem + conn + 't', stem + 'en', stem + conn + 't', stem + 'en'];
}
function deWeakPast(stem) {
  var conn = deConn(stem);
  return [stem + conn + 'te', stem + conn + 'test', stem + conn + 'te', stem + conn + 'ten', stem + conn + 'tet', stem + conn + 'ten'];
}
function deWeakPP(stem) {
  return 'ge' + stem + (deConn(stem) ? 'et' : 't');
}
function DE(inf, ru, tr, o) {
  o = o || {};
  VD.de = VD.de || {};
  var v = { inf: inf, ru: ru, tr: tr, type: o.type || (o.pres || o.pr || o.pp ? 'irregular' : 'regular'), tags: o.tags || [], tenses: {}, vex: [] };
  var sep = deSep(inf);
  var bare = sep[0], part = sep[1];
  var weakStem = deStem(bare);
  var pres = o.pres || deWeakPresent(weakStem);
  var pr = o.pr || deWeakPast(weakStem);
  var pp = o.pp || deWeakPP(weakStem);
  var auxIsS = o.aux === 's';
  var A = auxIsS ? DE_AUX_S : DE_AUX_H;
  var AS = auxIsS ? DE_AUX_SEIN : DE_AUX_HABEN;
  var auxInf = auxIsS ? 'sein' : 'haben';
  var display = function (forms) { return part ? forms.map(function (f) { return f + ' ' + part; }) : forms; };
  var t = v.tenses;
  t.pres = { rows: frTable(display(pres), DE_P, DE_T) };
  t.pr = { rows: frTable(display(pr), DE_P, DE_T) };
  t.perf = { rows: frTable(A.map(function (a) { return a + ' ' + pp; }), DE_P, DE_T) };
  t.plus = { rows: frTable(AS.map(function (a) { return a + ' ' + pp; }), DE_P, DE_T) };
  t.fut = { rows: frTable(DE_WERDEN.map(function (w) { return w + ' ' + inf; }), DE_P, DE_T) };
  t.fut2 = { rows: frTable(DE_WERDEN.map(function (w) { return w + ' ' + pp + ' ' + auxInf; }), DE_P, DE_T) };
  t.konj = { rows: frTable(DE_WUERDE.map(function (w) { return w + ' ' + inf; }), DE_P, DE_T) };
  var imp = o.imp || [weakStem, (part ? weakStem + ' ' + part : weakStem + deConn(weakStem) + 't'), inf];
  t.imp = { rows: frTable(imp, ['(du)', '(ihr)', '(Sie)'], ['', '', '']) };
  if (o.ex) for (var k in o.ex) t[k].ex = o.ex[k];
  VD.de[inf] = v;
}
TENSES.de = [
  { id: 'pres',  name: 'Präsens',            ru: 'настоящее',                    aux: 'present — now & habits' },
  { id: 'pr',    name: 'Präteritum',         ru: 'простое прошедшее',          aux: 'past simple — weak verbs add -te' },
  { id: 'perf',  name: 'Perfekt',            ru: 'перфект (составное прошедшее)', aux: 'haben / sein (present) + past participle' },
  { id: 'plus',  name: 'Plusquamperfekt',    ru: 'предпрошедшее',              aux: 'hatte / war + past participle' },
  { id: 'fut',   name: 'Futur I',            ru: 'будущее время',              aux: 'werden + infinitive' },
  { id: 'fut2',  name: 'Futur II',           ru: 'предбудущее',                aux: 'werden + participle + haben/sein' },
  { id: 'konj',  name: 'Konjunktiv II',      ru: 'сослагательное наклонение',  aux: 'würde + infinitive' },
  { id: 'imp',   name: 'Imperativ',          ru: 'повелительное наклонение',   aux: 'du / ihr / Sie' }
];
LANGS.de = { name: 'Deutsch', rname: 'немецкий', chip: 'DE', sample: ['sein', 'haben', 'gehen', 'sprechen', 'machen'], placeholder: 'Suchen Sie ein Verb… (z. B. sein, gehe, arbeiten)' };
RU_PRON.de = ['я', 'ты', 'он/она', 'мы', 'вы', 'они'];
(function () {
  var oldRuMode = ruMode;
  ruMode = function (lang, tid) {
    if (lang === 'de') {
      var m = { pres:'pres', pr:'past', perf:'past', plus:'past', fut:'fut', fut2:'fut', konj:'cond', imp:'imp' };
      return m[tid] || '';
    }
    return oldRuMode(lang, tid);
  };
})();
`;
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

// --- 9) Примеры: декодирование сущностей + автогенерация примера под каждым временем
part3 = part3.replace(
  "function exampleHtml(ex, lang) {",
  `var EX_PATTERN = {
  en: { pres: 'I {f} every day.', prescont: 'I am {f} right now.', presperf: 'I have {f} already.',
         presperfcont: 'I have been {f} lately.', past: 'I {f} yesterday.', pastcont: 'I was {f} then.',
         pastperf: 'I had {f} before.', pastperfcont: 'I had been {f}.', fut: 'I will {f} tomorrow.',
         futcont: 'I will be {f}.', futperf: 'I will have {f}.', goto: 'I am going to {f}.', cond: 'I would {f}.' },
  fr: { pres: 'Je {f}.', impf: 'Autrefois, je {f}.', pc: 'J\\'{f}.', pq: 'J\\'{f}.',
         fut: 'Je {f} demain.', fa: 'J\\'{f}.', ps: 'Je {f} tout à coup.',
         cond: 'Je {f} volontiers.', cp: 'J\\'{f}.', subj: 'Il faut que je {f}.',
         sp: 'Je doute que j\\'{f}.', imp: '{f}!' },
  es: { pres: 'Yo {f}.', pc: 'Yo {f}.', pret: 'Ayer yo {f}.', impf: 'Antes yo {f}.',
         plus: 'Yo {f}.', fut: 'Mañana yo {f}.', fc: 'Yo {f}.',
         cond: 'Yo {f} si pudiera.', cc: 'Yo {f}.', subj: 'Espero que yo {f}.',
         simp: 'Si yo {f}, sería mejor.', sp: 'No creo que yo {f}.', imp: '{f}!' }
};
function exampleHtml(ex, lang) {
  var tts = stripTags(decEnt(ex.s));
  var html = '<div class="example"><button class="spk" data-tts="' + esc(tts) + '" data-lang="' + lang + '" aria-label="Listen to example">' + SPK + '</button><div class="ex-body"><div class="ex-sentence">' + allowB(ex.s) + '</div>';
  if (ex.t) html += '<div class="ex-trans">' + esc(decEnt(ex.t)) + '</div>';
  if (ex.ru) html += '<div class="ex-trans ru">' + esc(decEnt(ex.ru)) + '</div>';
  return html + '</div></div>';
}`
);
part3 = part3.replace(
  "    html += '</div>';\n    if (data.ex && data.ex.length) html += '<div class=\"examples\">' + data.ex.map(function (ex) { return exampleHtml(ex, lang); }).join('') + '</div>';\n    html += '</section>';",
  "    html += '</div>';\n    var exList = data.ex || [];\n    if (!exList.length) {\n      var r0 = data.rows[0] || [];\n      var f0 = stripTags(r0[1] || '');\n      if (f0) {\n        var pat = EX_PATTERN[lang] && EX_PATTERN[lang][t.id] || '{p} {f}.';\n        var s = pat.replace('{f}', f0).replace('{p}', rowDisplayPron(lang, r0) || '');\n        exList = [{ s: s.replace(f0, '<b>' + f0 + '</b>'), t: null, ru: ruGloss(lang, t.id, 0, v) || null }];\n      }\n    }\n    if (exList.length) html += '<div class=\"examples\">' + exList.map(function (ex) { return exampleHtml(ex, lang); }).join('') + '</div>';\n    html += '</section>';"
);
/* Удалить осиротевший дубль тела exampleHtml (если остался от старых правок) */
const STRAY_EXAMPLE = "\n  var tts = stripTags(ex.s);\n  var html = '<div class=\"example\"><button class=\"spk\" data-tts=\"' + esc(tts) + '\" data-lang=\"' + lang + '\" aria-label=\"Listen to example\">' + SPK + '</button><div class=\"ex-body\"><div class=\"ex-sentence\">' + allowB(ex.s) + '</div>';\n  if (ex.t) html += '<div class=\"ex-trans\">' + esc(ex.t) + '</div>';\n  if (ex.ru) html += '<div class=\"ex-trans ru\">' + esc(ex.ru) + '</div>';\n  return html + '</div></div>';\n}";
part3 = part3.replace(STRAY_EXAMPLE, '');
/* Примеры глагола (vex) — под таблицами времён, а не над ними */
part3 = part3.replace(
  "$('tenseArea').innerHTML = vexHtml + body;",
  "$('tenseArea').innerHTML = body + vexHtml;"
);

// --- 10) Подсказки поиска: декодирование переводов
part3 = part3.replace(
  "      html += '<button class=\"sug-item\" role=\"option\" data-i=\"' + i + '\"><span class=\"v\">' + esc(e.inf) + '</span><span class=\"t\">' + esc(v.ru) + ' · ' + esc(v.tr) + (e.kind === 'form' ? ' — “' + stripTags(e.form) + '”' : '') + '</span><span class=\"chip\">' + chip + '</span></button>';",
  "      html += '<button class=\"sug-item\" role=\"option\" data-i=\"' + i + '\"><span class=\"v\">' + esc(e.inf) + '</span><span class=\"t\">' + esc(decEnt(v.ru)) + ' · ' + esc(decEnt(v.tr)) + (e.kind === 'form' ? ' — “' + stripTags(e.form) + '”' : '') + '</span><span class=\"chip\">' + chip + '</span></button>';"
);

// --- 13) Подвал: юридическая информация вместо рекламы статики
head = head.replace(
  '.verb-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center}',
  '.verb-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center}\n\t.verb-principal{margin-top:8px;font-size:.9rem;font-weight:600;color:var(--text);letter-spacing:.01em}'
);
head = head.replace(
  '.foot-in b{color:var(--text-2);font-weight:600}',
  '.foot-in b{color:var(--text-2);font-weight:600}\n\t.foot-legal{max-width:1040px;margin:0 auto;padding:0 20px 24px;font-size:.8rem;color:var(--text-3);line-height:1.6;text-align:center}\n\t.foot-legal a{color:var(--text-2);text-decoration:none}\n\t.foot-legal a:hover{text-decoration:underline}'
);
head = head.replace(
  '  <div class="foot-in">\n    <span><b>Conjugate</b> — English · Français · Español verb tables</span>\n    <span>Static page · Audio uses your browser\'s built-in speech synthesis · No account, no tracking</span>\n  </div>\n</footer>',
  '  <div class="foot-legal">\n    © 2019–2026 ИП Громова Анна Александровна, ОГРНИП: 319237500156762, ИНН: 236507001744<br>\n    Лицензия № Л035-01218-23/01091451 · Интерактивная школа «МУДРО» · <a href="https://xn--80aaagnrcpdkofpu2ae0iuf.xn--p1ai">интерактивнаяшкола.рф</a>\n  </div>\n</footer>'
);
head = head.replace(
  '.brand-mark{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--accent) 0%,#7c3aed 100%);display:grid;place-items:center;color:#fff;font-size:.72rem;font-weight:800;flex-shrink:0}',
  '.brand-mark{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--accent) 0%,#7c3aed 100%);display:grid;place-items:center;color:#fff;font-size:.72rem;font-weight:800;flex-shrink:0}\n\t.brand-logo{height:28px;width:auto;border-radius:6px;display:block;flex-shrink:0}'
);
head = head.replace(
  '<span class="brand-mark">C⟫</span>',
  '<img class="brand-logo" src="logo.png" alt="Интерактивная школа">'
);
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
      if (VD[lang][inf] && Object.keys(VD[lang][inf].tenses).length) return; // уже есть из движков
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
          v.tenses[tid].ex = [{ s: td.example, t: null, ru: ruGloss(lang, tid, 0, v) || null }];
        }
      });
      VD[lang][inf] = v;
    });
  });
})();
`;

/* Мета: title + description + Open Graph с кириллическим доменом */
head = head.replace(
  '<title>Conjugation — English · Français · Español</title>',
  '<title>Conjugation — English · Français · Español · Deutsch</title>'
);
var META_OLD_DESC = '<meta name="description" content="Search a verb in English, French or Spanish and see its full conjugation tables with example sentences and audio for every form.">';
var META_NEW_DESC = '<meta name="description" content="Search a verb in English, French, Spanish or German and see its full conjugation tables with example sentences, translations and audio for every form.">';
var OG_TAGS =
  '\n  <meta property="og:type" content="website">' +
  '\n  <meta property="og:title" content="Conjugation Guide — English · Français · Español · Deutsch">' +
  '\n  <meta property="og:description" content="Поиск глаголов и таблицы спряжений по всем временам: английский, французский, испанский, немецкий. Примеры, переводы и озвучка каждой формы.">' +
  '\n  <meta property="og:url" content="https://интерактивнаяшкола.рф/conjugation-guide/">' +
  '\n  <meta property="og:site_name" content="Интерактивная школа «МУДРО»">' +
  '\n  <meta property="og:image" content="https://интерактивнаяшкола.рф/conjugation-guide/logo.png">' +
  '\n  <meta property="og:locale" content="ru_RU">' +
  '\n  <meta name="twitter:card" content="summary">';
if (head.includes(META_OLD_DESC)) head = head.replace(META_OLD_DESC, META_NEW_DESC + OG_TAGS);
else if (head.includes(META_NEW_DESC)) head = head.replace(META_NEW_DESC, META_NEW_DESC + OG_TAGS);
/* Кириллический домен вместо punycode в ссылках */
head = head.split('https://xn--80aaagnrcpdkofpu2ae0iuf.xn--p1ai').join('https://интерактивнаяшкола.рф');

/* Немецкий: вкладка в шапке + цвет маркера */
head = head.replace(
  '<span class="dot"></span>Español</button>',
  '<span class="dot"></span>Español</button>\n      <button class="lang-tab" role="tab" data-lang="de" aria-selected="false"><span class="dot"></span>Deutsch</button>'
);
head = head.replace(
  '.lang-tab[data-lang="es"] .dot{background:var(--chipsc)}',
  '.lang-tab[data-lang="es"] .dot{background:var(--chipsc)}.lang-tab[data-lang="de"] .dot{background:#10b981}'
);
/* Немецкий: поиск, перекрёстные ссылки, роутинг */
part3 = part3.replace(
  "['en', 'fr', 'es'].forEach(function (lang) {",
  "['en', 'fr', 'es', 'de'].forEach(function (lang) {"
);
part3 = part3.replace(
  "['en', 'fr', 'es'].forEach(function (l) {",
  "['en', 'fr', 'es', 'de'].forEach(function (l) {"
);
part3 = part3.replace(
  'location.hash.match(/^#\\/(en|fr|es)\\/(.+)$/)',
  'location.hash.match(/^#\\/(en|fr|es|de)\\/(.+)$/)'
);
part3 = part3.replace(
  'function parseHash() {\n  var m = location.hash.match(/^#\\/(en|fr|es)\\/(.+)$/);',
  'function parseHash() {\n  var m = location.hash.match(/^#\\/(en|fr|es|de)\\/(.+)$/);'
);
/* Немецкий: шаблоны примеров */
part3 = part3.replace(
  "  es: { pres: 'Yo {f}.', pc: 'Yo {f}.', pret: 'Ayer yo {f}.', impf: 'Antes yo {f}.',\n         plus: 'Yo {f}.', fut: 'Mañana yo {f}.', fc: 'Yo {f}.',\n         cond: 'Yo {f} si pudiera.', cc: 'Yo {f}.', subj: 'Espero que yo {f}.',\n         simp: 'Si yo {f}, sería mejor.', sp: 'No creo que yo {f}.', imp: '{f}!' }",
  "  es: { pres: 'Yo {f}.', pc: 'Yo {f}.', pret: 'Ayer yo {f}.', impf: 'Antes yo {f}.',\n         plus: 'Yo {f}.', fut: 'Mañana yo {f}.', fc: 'Yo {f}.',\n         cond: 'Yo {f} si pudiera.', cc: 'Yo {f}.', subj: 'Espero que yo {f}.',\n         simp: 'Si yo {f}, sería mejor.', sp: 'No creo que yo {f}.', imp: '{f}!' },\n  de: { pres: 'Ich {f}.', pr: 'Ich {f}.', perf: 'Ich {f}.', plus: 'Ich {f}.',\n         fut: 'Ich {f}.', fut2: 'Ich {f}.', konj: 'Ich {f}.', imp: '{f}!' }"
);
/* Немецкий: лендинг */
part3 = part3.replace(
  'Look up a verb in <b>English</b>, <b>French</b> or <b>Spanish</b> and see its complete conjugation — hundreds of B2 verbs, with example sentences, translations and audio for every form.',
  'Look up a verb in <b>English</b>, <b>French</b>, <b>Spanish</b> or <b>German</b> and see its complete conjugation — hundreds of B2 verbs, with example sentences, translations and audio for every form.'
);
/* Немецкий: файл данных */
const GERMAN_SCRIPT = '<script src="data/extra_de.js"></script>\n';

const out =
  head +
  part1 + '\n</script>\n' +
  '<script src="data/extra_en.js"></script>\n' +
  '<script src="data/extra_fr.js"></script>\n' +
  '<script src="data/extra_es.js"></script>\n' +
  GERMAN_SCRIPT +
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

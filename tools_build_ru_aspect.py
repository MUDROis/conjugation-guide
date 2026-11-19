# -*- coding: utf-8 -*-
"""Regenerate data/ru_aspect.js — Russian aspect data used for the glosses.

The curated imperfective→perfective pairs live in data/ru_aspect.js itself, so
re-running this script only needs that file plus pymorphy3:

    pip install pymorphy3
    python tools_build_ru_aspect.py

It rewrites the pf / ipf / forms / imper / pres / past / aspect tables from
pymorphy3, keeping the curated pairs (and the override lists below) as the source
of truth for aspect relationships.
"""
import os
import re

import pymorphy3

DATA_FILES = ['data/english.js', 'data/french.js', 'data/spanish.js',
              'data/extra_en.js', 'data/extra_fr.js', 'data/extra_es.js', 'data/extra_de.js']
TARGET = os.path.join('data', 'ru_aspect.js')
INF_OK = re.compile(r'(ть|ться|ти|тись|чь|чься)$')
VOWELS = 'аеёиоуыэюя'

m = pymorphy3.MorphAnalyzer()


def aspects(w):
    return {str(p.tag.aspect) for p in m.parse(w) if p.tag.aspect}


def is_biaspectual(w):
    a = aspects(w)
    return 'perf' in a and 'impf' in a


def is_perf_only(w):
    a = aspects(w)
    return 'perf' in a and 'impf' not in a


def norm(s):
    s = str(s).lower().strip()
    s = re.sub(r'\([^)]*\)\s*', '', s)
    s = re.split(r'[,;·/]', s)[0].strip()
    if re.search(r'[\s«»]', s):
        return ''
    return s


def load_pairs():
    """Read the curated pairs out of the previous build (or start empty)."""
    if not os.path.exists(TARGET):
        return {}
    src = open(TARGET, encoding='utf-8').read()
    block = src.split('  pf: {', 1)[1].split('  },', 1)[0]
    return dict(re.findall(r"'([^']+)': '([^']+)'", block))


# ---------- 1. translation infinitives used by the dictionary ----------
vocab = set()
for f in DATA_FILES:
    src = open(f, encoding='utf-8').read()
    for mt in re.finditer(r"translation:\s*'([^']*)'", src):
        for part in mt.group(1).split(';'):
            n = norm(part)
            if n:
                vocab.add(n)
    for mt in re.finditer(r"\[\s*'[^']*'\s*,\s*'([^']*)'\s*,\s*'[^']*'", src):
        for part in mt.group(1).split(';'):
            n = norm(part)
            if n:
                vocab.add(n)
vocab = {w for w in vocab if INF_OK.search(w)}

# ---------- 2. imperfective → perfective ----------
pf_map = load_pairs()
PF_OVERRIDES = {
    'управлять': 'управлять', 'недоставать': 'недоставать', 'вести': 'повести',
    'выходить': 'выйти', 'идти': 'пойти', 'ходить': 'сходить', 'нападать': 'напасть',
    'попадать': 'попасть', 'резать': 'порезать', 'сбегать': 'сбежать',
    'спешить': 'поспешить', 'угрожать': 'пригрозить', 'тренироваться': 'потренироваться',
    'признаваться': 'признаться', 'влиять': 'повлиять', 'выносить': 'вынести',
    'вынашивать': 'выносить', 'смотреть': 'посмотреть', 'слушать': 'послушать',
    'видеть': 'увидеть', 'слышать': 'услышать', 'брать': 'взять',
    'класть': 'положить', 'ловить': 'поймать', 'искать': 'найти',
}
pf_map.update({k: v for k, v in PF_OVERRIDES.items() if k in vocab})
for w in vocab:
    pf_map.setdefault(w, w)          # unknown verbs simply have no pair
for ipf in list(pf_map):
    if pf_map[ipf] != ipf and 'perf' not in aspects(pf_map[ipf]):
        pf_map[ipf] = ipf

# ---------- 3. perfective → imperfective ----------
IPF_OVERRIDES = {
    'найти': 'находить', 'сказать': 'говорить', 'купить': 'покупать', 'взять': 'брать',
    'дать': 'давать', 'стать': 'становиться', 'сесть': 'садиться', 'лечь': 'ложиться',
    'понять': 'понимать', 'принять': 'принимать', 'снять': 'снимать', 'увидеть': 'видеть',
    'услышать': 'слышать', 'спросить': 'спрашивать', 'ответить': 'отвечать',
    'получить': 'получать', 'закрыть': 'закрывать', 'открыть': 'открывать',
    'потерять': 'терять', 'погибнуть': 'погибать', 'исчезнуть': 'исчезать',
    'вспомнить': 'вспоминать', 'забыть': 'забывать', 'помочь': 'помогать',
    'умереть': 'умирать', 'родиться': 'рождаться', 'вернуться': 'возвращаться',
    'остаться': 'оставаться', 'собраться': 'собираться', 'проснуться': 'просыпаться',
    'заснуть': 'засыпать', 'встать': 'вставать', 'одеть': 'одевать', 'надеть': 'надевать',
    'прийти': 'приходить', 'уйти': 'уходить', 'войти': 'входить', 'выйти': 'выходить',
    'перейти': 'переходить', 'произойти': 'происходить', 'принести': 'приносить',
    'отправить': 'отправлять', 'предложить': 'предлагать', 'положить': 'класть',
    'выбрать': 'выбирать', 'создать': 'создавать', 'узнать': 'узнавать',
    'начать': 'начинать', 'кончить': 'кончать', 'закончить': 'заканчивать',
}

ipf_map = {}
needed_pf = set(vocab) | {v for v in pf_map.values() if v != pf_map.get(v)}
for ipf, pf in pf_map.items():
    if ipf != pf and 'impf' in aspects(ipf):
        ipf_map.setdefault(pf, ipf)
for pf, ipf in IPF_OVERRIDES.items():
    if pf in needed_pf and 'impf' in aspects(ipf):
        ipf_map[pf] = ipf
ipf_map = {k: v for k, v in ipf_map.items() if k in needed_pf}


# ---------- 4. forms ----------
def _present_or_future(inf, order):
    p = next((q for q in m.parse(inf) if q.tag.POS == 'INFN'), None)
    if p is None:
        return None
    out = []
    for num, per in (('sing', '1per'), ('sing', '2per'), ('sing', '3per'),
                     ('plur', '1per'), ('plur', '2per'), ('plur', '3per')):
        w = None
        for g in order:
            try:
                r = p.inflect({g, num, per})
            except Exception:
                r = None
            if r:
                w = r.word
                break
        if not w:
            return None
        out.append(w)
    return out


def future6(inf):
    return _present_or_future(inf, ('futr', 'pres'))


def present6(inf):
    return _present_or_future(inf, ('pres', 'futr'))


def past4(inf):
    p = next((q for q in m.parse(inf) if q.tag.POS == 'INFN'), None)
    if p is None:
        return None
    out = []
    for g in ('masc', 'femn', 'neut', 'plur'):
        try:
            r = p.inflect({'past', g})
        except Exception:
            r = None
        if not r:
            return None
        out.append(r.word)
    return out


IMP_IRR = {
    'быть': ('будь', 'будьте'), 'дать': ('дай', 'дайте'), 'есть': ('ешь', 'ешьте'),
    'взять': ('возьми', 'возьмите'), 'сесть': ('сядь', 'сядьте'), 'лечь': ('ляг', 'лягте'),
    'стать': ('стань', 'станьте'), 'прийти': ('приди', 'придите'), 'уйти': ('уйди', 'уйдите'),
    'войти': ('войди', 'войдите'), 'выйти': ('выйди', 'выйдите'),
    'приехать': ('приезжай', 'приезжайте'), 'уехать': ('уезжай', 'уезжайте'),
    'увидеть': ('увидь', 'увидьте'), 'видеть': ('видь', 'видьте'),
    'ненавидеть': ('ненавидь', 'ненавидьте'), 'зависеть': ('завись', 'зависьте'),
}


def imperative(pf, forms):
    if pf in IMP_IRR:
        return list(IMP_IRR[pf])
    p3 = forms[5]
    refl = p3.endswith(('ся', 'сь'))
    bare = p3[:-2] if refl else p3
    if not bare.endswith(('ут', 'ют', 'ат', 'ят')):
        return None
    stem = bare[:-2]
    if not stem:
        return None
    sg = stem + ('й' if stem[-1] in VOWELS else 'и')
    if refl:
        return [sg + 'сь', sg[:-2] + 'тесь']
    return [sg, sg + 'те']


pforms, pimper = {}, {}
for pf in sorted({v for v in pf_map.values() if 'perf' in aspects(v)}):
    fut, past = future6(pf), past4(pf)
    if not fut or not past:
        continue
    pforms[pf] = fut + past
    imp = imperative(pf, fut)
    if imp:
        pimper[pf] = imp

PRES_IRR = {
    'быть': ['есть', 'есть', 'есть', 'есть', 'есть', 'есть'],
    'дать': ['даю', 'даёшь', 'даёт', 'даём', 'даёте', 'дают'],
    'создать': ['создаю', 'создаёшь', 'создаёт', 'создаём', 'создаёте', 'создают'],
}
ARCHAIC = ('есмь', 'есмы', 'есте', 'суть')
pres_map, past_map = {}, {}
for w in sorted(vocab):
    if not INF_OK.search(w) or is_biaspectual(w):
        continue
    if 'impf' in aspects(w):
        f = PRES_IRR.get(w) or present6(w)
        if f and not any(x in ARCHAIC for x in f):
            pres_map[w] = f
    f = past4(w)
    if f:
        past_map[w] = f
pres_map.update(PRES_IRR)

# ---------- 5. aspect of shipped infinitives ----------
aspect_map = {}
for w in sorted(set(vocab) | needed_pf | set(ipf_map.values())):
    if is_biaspectual(w):
        aspect_map[w] = 'impf'     # двувидовые спрягаются как несовершенные
    elif is_perf_only(w):
        aspect_map[w] = 'perf'
    elif 'impf' in aspects(w):
        aspect_map[w] = 'impf'


# ---------- 6. emit ----------
def jsval(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def block(name, items, fmt):
    out = ['  %s: {' % name]
    items = sorted(items.items())
    for i, (k, v) in enumerate(items):
        comma = ',' if i < len(items) - 1 else ''
        out.append('    %s: %s%s' % (jsval(k), fmt(v), comma))
    out.append('  }')
    return out


def arr(v):
    return '[' + ', '.join(jsval(x) for x in v) + ']'


lines = [
    '/* Russian aspect data for glosses (generated by tools_build_ru_aspect.py — do not edit by hand).',
    '   pf     — imperfective infinitive → perfective infinitive',
    '   ipf    — perfective infinitive → imperfective infinitive',
    '   forms  — perfective infinitive → future, 6 persons',
    '   imper  — perfective infinitive → [imperative sg, imperative pl]',
    '   pres   — imperfective infinitive → present, 6 persons',
    '   past   — infinitive → past (m, f, n, pl)',
    '   aspect — infinitive → "perf" | "impf"',
    '*/',
    'window.RU_ASPECT = {',
]
lines += block('pf', pf_map, jsval)
lines[-1] += ','
lines += block('ipf', ipf_map, jsval)
lines[-1] += ','
lines += block('forms', pforms, arr)
lines[-1] += ','
lines += block('imper', pimper, arr)
lines[-1] += ','
lines += block('pres', pres_map, arr)
lines[-1] += ','
lines += block('past', past_map, arr)
lines[-1] += ','
lines += block('aspect', aspect_map, jsval)
lines.append('};')

out = '\n'.join(lines) + '\n'
open(TARGET, 'w', encoding='utf-8').write(out)
print('pairs', len(pf_map), '| reverse', len(ipf_map), '| forms', len(pforms),
      '| imper', len(pimper), '| pres', len(pres_map), '| past', len(past_map))
print('written', TARGET, len(out.encode('utf-8')), 'bytes')

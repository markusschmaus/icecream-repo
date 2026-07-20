// Data model per docs/data-model.md:
//   Substance — recipe-independent material data (composition per gram)
//   Line      — one use of a substance, with a role: identity | lever | follower
//   Group     — a set of lever lines that OWNS specific metrics
//   Recipe    — ordered steps (fixed procedure) + lines + groups + metric targets
// Line masses are derived state: the spec is batch mass + identity shares +
// follower rules + metric targets, and the cascade materializes grams from it.

// --- Substance library ---
// Composition fractions 0-1 (water+fat+solute+other ~ 1). msnf = milk solids
// non-fat, a subset of solute+other, 0 for non-dairy. pod/pac are per unit
// solute relative to sucrose = 1.

const SUBSTANCES = [
  { id: 'cream30',    name: 'Cream, 30% fat',            density: 0.99, water: 0.646, fat: 0.30,  solute: 0.029, other: 0.025, msnf: 0.054, pod: 0.16, pac: 1.00 },
  { id: 'cream35',    name: 'Cream, 35% fat',            density: 0.99, water: 0.602, fat: 0.35,  solute: 0.026, other: 0.022, msnf: 0.048, pod: 0.16, pac: 1.00 },
  { id: 'milk15',     name: 'Milk, 1.5% fat',            density: 1.03, water: 0.895, fat: 0.015, solute: 0.049, other: 0.041, msnf: 0.090, pod: 0.16, pac: 1.00 },
  { id: 'milk35',     name: 'Milk, 3.5% fat',            density: 1.03, water: 0.878, fat: 0.035, solute: 0.049, other: 0.038, msnf: 0.087, pod: 0.16, pac: 1.00 },
  { id: 'smp',        name: 'Skim milk powder',          density: 1.0,  water: 0.03,  fat: 0.01,  solute: 0.51,  other: 0.45,  msnf: 0.96,  pod: 0.16, pac: 1.00 },
  { id: 'yolkPowder', name: 'Egg yolk powder',           density: 1.0,  water: 0.03,  fat: 0.60,  solute: 0,     other: 0.37,  msnf: 0,     pod: 0,    pac: 0 },
  { id: 'sucrose',    name: 'Sugar (sucrose)',           density: 1.0,  water: 0,     fat: 0,     solute: 1.0,   other: 0,     msnf: 0,     pod: 1.00, pac: 1.00 },
  { id: 'dextrose',   name: 'Dextrose',                  density: 1.0,  water: 0,     fat: 0,     solute: 1.0,   other: 0,     msnf: 0,     pod: 0.74, pac: 1.90 },
  { id: 'fructose',   name: 'Fructose',                  density: 1.0,  water: 0,     fat: 0,     solute: 1.0,   other: 0,     msnf: 0,     pod: 1.73, pac: 1.90 },
  { id: 'invert',     name: 'Invert sugar (dry equiv.)', density: 1.0,  water: 0,     fat: 0,     solute: 1.0,   other: 0,     msnf: 0,     pod: 1.25, pac: 1.90 },
  { id: 'glucoseDE60',name: 'Glucose syrup, DE60',       density: 1.4,  water: 0.20,  fat: 0,     solute: 0.80,  other: 0,     msnf: 0,     pod: 0.60, pac: 0.60 },
  { id: 'honey',      name: 'Honey',                     density: 1.42, water: 0.17,  fat: 0,     solute: 0.80,  other: 0.03,  msnf: 0,     pod: 1.30, pac: 1.90 },
  { id: 'guar',       name: 'Guar gum',                  density: 1.0,  water: 0.09,  fat: 0,     solute: 0,     other: 0.91,  msnf: 0,     pod: 0,    pac: 0 },
  { id: 'xanthan',    name: 'Xanthan gum',               density: 1.0,  water: 0.09,  fat: 0,     solute: 0,     other: 0.91,  msnf: 0,     pod: 0,    pac: 0 },
  { id: 'lbg',        name: 'Locust bean gum',           density: 1.0,  water: 0.09,  fat: 0,     solute: 0,     other: 0.91,  msnf: 0,     pod: 0,    pac: 0 },
  { id: 'salt',       name: 'Salt, fine sea salt',       density: 1.0,  water: 0.002, fat: 0,     solute: 0.998, other: 0,     msnf: 0,     pod: 0,    pac: 32.6 },
  { id: 'strawberry', name: 'Fresh strawberries',        density: 1.0,  water: 0.91,  fat: 0.003, solute: 0.055, other: 0.032, msnf: 0,     pod: 1.10, pac: 1.60 },
  { id: 'fdStrawb',   name: 'Freeze-dried strawberries', density: 1.0,  water: 0.03,  fat: 0.01,  solute: 0.50,  other: 0.46,  msnf: 0,     pod: 1.10, pac: 1.60 },
  { id: 'balsamic',   name: 'Balsamic vinegar',          density: 1.06, water: 0.77,  fat: 0,     solute: 0.15,  other: 0.08,  msnf: 0,     pod: 1.10, pac: 1.60 },
  { id: 'pepper',     name: 'Black pepper, cracked',     density: 1.0,  water: 0.10,  fat: 0.02,  solute: 0,     other: 0.88,  msnf: 0,     pod: 0,    pac: 0 },
  { id: 'water',      name: 'Water',                     density: 1.0,  water: 1.0,   fat: 0,     solute: 0,     other: 0,     msnf: 0,     pod: 0,    pac: 0 },
  { id: 'spirit',     name: 'Spirit / liqueur, 40% ABV', density: 0.95, water: 0.68,  fat: 0,     solute: 0.32,  other: 0,     msnf: 0,     pod: 0,    pac: 5.80 },
];

const SUB = Object.fromEntries(SUBSTANCES.map((s) => [s.id, s]));

// --- Metrics ---
// All linear in line masses. Intensive metrics are fractions internally,
// shown x100 in the UI; 'mass' is grams and doubles as the batch size.

const METRIC_LABELS = {
  fat: 'Fat %', msnf: 'MSNF %', water: 'Water %', pod: 'POD', pac: 'PAC', mass: 'Total mass (g)',
};

function perGram(metric, s) {
  switch (metric) {
    case 'fat': return s.fat;
    case 'msnf': return s.msnf;
    case 'water': return s.water;
    case 'pod': return s.solute * s.pod;
    case 'pac': return s.solute * s.pac;
    case 'mass': return 1;
    default: throw new Error('unknown metric ' + metric);
  }
}

const toDisplay = (metric, v) => (metric === 'mass' ? v : v * 100);
const toInternal = (metric, v) => (metric === 'mass' ? v : v / 100);

// --- Seed recipe: strawberry-balsamic-black pepper ---

let nextLineId = 1;
function line(substanceId, stepId, role, opts = {}) {
  return { id: opts.id || `l${nextLineId++}`, substanceId, stepId, name: opts.name || null, mass: opts.mass ?? 0, role };
}

function seedRecipe() {
  return {
    name: 'Strawberry balsamic, black pepper',
    overrun: 25,
    targets: { mass: 1650 }, // intensive targets are filled from the seed measurement at init
    steps: [
      { id: 'macerate', name: 'Macerate',  instructions: 'Toss berries with the maceration sugar and pepper; rest 2 h at room temperature; stir in balsamic and freeze-dried berries.' },
      { id: 'base',     name: 'Cook base', instructions: 'Heat dairy to 45 °C; whisk in yolk powder, sugars, milk powder and salt; add gums at 70 °C; pasteurize at 85 °C; chill fast.' },
      { id: 'age',      name: 'Age',       instructions: 'Rest the base 12 h at 4 °C.' },
      { id: 'churn',    name: 'Churn',     instructions: 'Blend the maceration into the base; churn to −5 °C.' },
      { id: 'finish',   name: 'Finish',    instructions: 'Fold in cracked pepper; harden at −18 °C.' },
    ],
    // metrics = candidates a group can be responsible for; owns = currently
    // pinned subset. Not every combination is feasible: dairy levers satisfy
    // fat + water + msnf = 1 exactly, so fat/water/msnf/mass are dependent —
    // at most 3 of the 4 can be pinned at once. Water is unpinned by default
    // and reads as an outcome; pin it (and unpin something else) to tune it.
    groups: [
      { id: 'dairy', name: 'Dairy & water', metrics: ['fat', 'msnf', 'water', 'mass'], owns: ['fat', 'msnf', 'mass'] },
      { id: 'sweet', name: 'Sweeteners',    metrics: ['pod', 'pac'],                   owns: ['pod', 'pac'] },
    ],
    lines: [
      // Levers: the solver's variables, scoped to the group that owns their metrics.
      line('cream30',  'base', { kind: 'lever', groupId: 'dairy' }, { mass: 610 }),
      line('milk15',   'base', { kind: 'lever', groupId: 'dairy' }, { mass: 305 }),
      line('smp',      'base', { kind: 'lever', groupId: 'dairy' }, { mass: 20 }),
      line('water',    'base', { kind: 'lever', groupId: 'dairy' }, { mass: 30 }),
      line('sucrose',  'base', { kind: 'lever', groupId: 'sweet' }, { mass: 110 }),
      line('dextrose', 'base', { kind: 'lever', groupId: 'sweet' }, { mass: 55 }),
      // Identity: creative decisions, shares of batch mass. Never solver-adjusted.
      line('strawberry', 'macerate', { kind: 'identity', share: 0.20 },   { id: 'l-strawb' }),
      line('fdStrawb',   'macerate', { kind: 'identity', share: 0.030 }),
      line('balsamic',   'macerate', { kind: 'identity', share: 0.024 }),
      line('yolkPowder', 'base',     { kind: 'identity', share: 0.022 }),
      line('pepper',     'macerate', { kind: 'identity', share: 0.0002 }, { name: 'Black pepper (maceration)' }),
      line('pepper',     'finish',   { kind: 'identity', share: 0.0002 }, { name: 'Black pepper (finishing)' }),
      // Followers: rules, recomputed after every solve, never tuned directly.
      line('sucrose', 'macerate', { kind: 'follower', rule: { basis: 'line', refId: 'l-strawb', fraction: 0.055 } }, { name: 'Sugar (maceration)' }),
      line('guar',    'base',     { kind: 'follower', rule: { basis: 'batch', fraction: 0.0006 } }),
      line('xanthan', 'base',     { kind: 'follower', rule: { basis: 'batch', fraction: 0.0006 } }),
      line('salt',    'base',     { kind: 'follower', rule: { basis: 'batch', fraction: 0.0006 } }),
    ],
  };
}

let recipe = seedRecipe();

// --- Calc engine ---

const sub = (l) => SUB[l.substanceId];
const displayName = (l) => l.name || sub(l).name;
const totalMass = (r) => r.lines.reduce((s, l) => s + l.mass, 0);

function measured(r) {
  let mass = 0, volume = 0;
  const acc = { fat: 0, msnf: 0, water: 0, pod: 0, pac: 0 };
  for (const l of r.lines) {
    const s = sub(l);
    mass += l.mass;
    volume += l.mass / (s.density || 1);
    for (const k in acc) acc[k] += l.mass * perGram(k, s);
  }
  const out = { mass, volume };
  for (const k in acc) out[k] = mass ? acc[k] / mass : 0;
  return out;
}

function solveLinearSystem(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > maxAbs) { maxAbs = Math.abs(M[r][col]); pivotRow = r; }
    }
    if (maxAbs < 1e-9) return null;
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

const groupLevers = (r, gid) => r.lines.filter((l) => l.role.kind === 'lever' && l.role.groupId === gid);

// Materialize identity and follower masses from the spec. Levers are untouched.
function materializeFixed(r) {
  const batch = r.targets.mass;
  for (const l of r.lines) {
    if (l.role.kind === 'identity') l.mass = l.role.share * batch;
  }
  for (const l of r.lines) {
    if (l.role.kind !== 'follower') continue;
    const rule = l.role.rule;
    if (rule.basis === 'batch') l.mass = rule.fraction * batch;
    else if (rule.basis === 'line') l.mass = rule.fraction * (r.lines.find((x) => x.id === rule.refId)?.mass ?? 0);
    else if (rule.basis === 'group') l.mass = rule.fraction * groupLevers(r, rule.refId).reduce((s, x) => s + x.mass, 0);
  }
}

// Solve ONE group's lever masses so its owned metrics hit their targets, holding
// every other line at its current mass. Underdetermined when levers > owned
// metrics; picks the minimum relative change from the current masses (weighted
// least-squares via the Gram matrix, as in the previous global solver — but
// restricted to this group, which is what keeps edits explainable).
function solveGroup(r, group) {
  const levers = groupLevers(r, group.id);
  const k = group.owns.length;
  if (levers.length < k) {
    return { ok: false, reason: `“${group.name}” owns ${k} targets but has only ${levers.length} solver ingredient${levers.length === 1 ? '' : 's'} — add ingredients to the group.` };
  }
  const M0 = totalMass(r);
  const rows = [], c = [];
  for (const metric of group.owns) {
    const t = r.targets[metric];
    if (metric === 'mass') {
      rows.push(levers.map(() => 1));
      c.push(t - M0);
    } else {
      const C0 = r.lines.reduce((s, l) => s + l.mass * perGram(metric, sub(l)), 0);
      rows.push(levers.map((l) => perGram(metric, sub(l)) - t));
      c.push(t * M0 - C0);
    }
  }
  const EPS = 1e-9;
  const scale = levers.map((l) => (Math.abs(l.mass) > EPS ? Math.abs(l.mass) : 1));
  const B = rows.map((row) => row.map((v, i) => v * scale[i]));
  const BBt = B.map((rowJ) => B.map((rowL) => rowJ.reduce((s, v, i) => s + v * rowL[i], 0)));
  const y = solveLinearSystem(BBt, c);
  if (!y) {
    return { ok: false, reason: `“${group.name}” ingredients are not compositionally independent enough to hit ${group.owns.map((m) => METRIC_LABELS[m]).join(', ')} simultaneously — add a compositionally different ingredient.` };
  }
  levers.forEach((l, i) => {
    const z = B.reduce((s, row, j) => s + row[i] * y[j], 0);
    l.mass += z * scale[i];
  });
  const negative = levers.some((l) => l.mass < -1e-6);
  return { ok: true, negative };
}

// The cascade: identity -> followers -> each group solves its owned metrics ->
// repeat until stable. Groups couple only weakly (through the total-mass
// denominator and small cross-contributions), so this settles in a few rounds.
function cascade(r) {
  const status = {};
  let prev = null;
  for (let iter = 0; iter < 40; iter++) {
    materializeFixed(r);
    for (const g of r.groups) status[g.id] = solveGroup(r, g);
    const cur = r.lines.map((l) => l.mass);
    if (prev && Math.max(...cur.map((m, i) => Math.abs(m - prev[i]))) < 1e-7) break;
    prev = cur;
  }
  materializeFixed(r);
  const m = measured(r);
  for (const g of r.groups) {
    const st = status[g.id];
    if (!st.ok) continue;
    const off = g.owns.some((metric) => {
      const tol = metric === 'mass' ? 0.05 : 1e-5;
      return Math.abs(m[metric] - r.targets[metric]) > tol;
    });
    if (off && !st.negative) st.reason = `“${g.name}” did not settle on its targets — they may conflict with the rest of the mix.`;
    if (off) st.ok = st.negative; // negative already carries its own message
  }
  return status;
}

// Fill intensive targets from the seed's own measurement, so the recipe starts
// feasible by construction, then materialize once.
function initTargets(r) {
  materializeFixed(r);
  const m = measured(r);
  for (const g of r.groups) {
    for (const metric of g.metrics) {
      if (metric !== 'mass') r.targets[metric] = m[metric];
    }
  }
  return cascade(r);
}

// --- Rendering ---

const $ = (sel) => document.querySelector(sel);

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function trimNum(n) {
  if (!Number.isFinite(n)) return '';
  return Math.round(n * 10000) / 10000;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function roleCell(l) {
  if (l.role.kind === 'lever') {
    const g = recipe.groups.find((x) => x.id === l.role.groupId);
    return `<span class="badge badge-lever" title="Adjusted by the solver to hit this group's targets">solver · ${escapeHtml(g ? g.name : l.role.groupId)}</span>`;
  }
  if (l.role.kind === 'identity') {
    return `<span class="role-ctl"><input type="number" step="any" data-field="share" value="${trimNum(l.role.share * 100)}"><span class="unit">% of batch</span></span>`;
  }
  const rule = l.role.rule;
  let basis = '% of batch';
  if (rule.basis === 'line') {
    const ref = recipe.lines.find((x) => x.id === rule.refId);
    basis = `% of ${escapeHtml(ref ? displayName(ref) : '?')}`;
  } else if (rule.basis === 'group') {
    const g = recipe.groups.find((x) => x.id === rule.refId);
    basis = `% of ${escapeHtml(g ? g.name : '?')}`;
  }
  return `<span class="role-ctl"><input type="number" step="any" data-field="fraction" value="${trimNum(rule.fraction * 100)}"><span class="unit">${basis}</span></span>`;
}

function massCell(l) {
  if (l.role.kind === 'lever') {
    return `<input type="number" step="any" data-field="mass" value="${trimNum(l.mass)}">`;
  }
  return `<span class="mass-ro" data-massfor="${l.id}">${fmt(l.mass, 2)}</span>`;
}

const ROLE_BADGE = { identity: 'identity', follower: 'follows', lever: '' };

function renderSteps() {
  $('#steps').innerHTML = recipe.steps.map((step) => {
    const lines = recipe.lines.filter((l) => l.stepId === step.id);
    const table = lines.length
      ? `<div class="table-scroll"><table>
          <thead><tr><th>Ingredient</th><th>Role</th><th>Amount</th><th>Mass (g)</th><th></th></tr></thead>
          <tbody>${lines.map((l) => `
            <tr data-line="${l.id}">
              <td><input class="name-input" type="text" data-field="name" value="${escapeHtml(displayName(l))}"></td>
              <td>${l.role.kind === 'lever' ? roleCell(l) : `<span class="badge">${ROLE_BADGE[l.role.kind]}</span>`}</td>
              <td>${l.role.kind === 'lever' ? '<span class="unit">from targets</span>' : roleCell(l)}</td>
              <td>${massCell(l)}</td>
              <td><button class="remove-btn" data-action="remove" title="Remove">&times;</button></td>
            </tr>`).join('')}
          </tbody></table></div>`
      : '<p class="hint step-empty">No ingredients enter at this step.</p>';
    return `<div class="step-block">
      <h3><span class="step-num"></span>${escapeHtml(step.name)}</h3>
      <p class="step-instructions">${escapeHtml(step.instructions)}</p>
      ${table}
    </div>`;
  }).join('');
}

function renderTargets() {
  $('#group-boxes').innerHTML = recipe.groups.map((g) => {
    const levers = groupLevers(recipe, g.id);
    return `<div class="group-box" data-group="${g.id}">
      <h3>${escapeHtml(g.name)}</h3>
      <p class="group-members">solves: ${levers.map((l) => escapeHtml(displayName(l))).join(', ') || '— none —'}</p>
      ${g.metrics.map((metric) => {
        const owned = g.owns.includes(metric);
        return `
        <div class="target-row${owned ? '' : ' target-row-free'}">
          <input type="checkbox" data-pin="${metric}" data-pingroup="${g.id}" ${owned ? 'checked' : ''} title="${owned ? 'Pinned: the group holds this value' : 'Unpinned: shown as measured outcome'}">
          <label>${METRIC_LABELS[metric]}</label>
          <input type="number" step="any" data-target="${metric}" ${owned ? '' : 'disabled'} value="${trimNum(toDisplay(metric, recipe.targets[metric]))}">
          <span class="drift" data-drift="${metric}"></span>
        </div>`;
      }).join('')}
      <div class="group-status" data-status="${g.id}"></div>
    </div>`;
  }).join('');
}

function renderAddBar() {
  $('#add-substance').innerHTML = SUBSTANCES.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  $('#add-step').innerHTML = recipe.steps.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  $('#add-group').innerHTML = recipe.groups.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  $('#add-group').classList.toggle('hidden', $('#add-role').value !== 'lever');
}

function renderLibrary() {
  $('#library-rows').innerHTML = SUBSTANCES.map((s) => {
    const sum = s.water + s.fat + s.solute + s.other;
    const warn = Math.abs(sum - 1) > 0.005
      ? `<span class="row-name-warn" title="Water+Fat+Solute+Other = ${fmt(sum * 100, 1)}%, should be ~100%">&#9888;</span>` : '';
    const num = (field, v) => `<td><input type="number" step="any" data-sub="${s.id}" data-sfield="${field}" value="${trimNum(v)}"></td>`;
    return `<tr>
      <td>${escapeHtml(s.name)}${warn}</td>
      ${num('density', s.density)}
      ${num('water', s.water * 100)}${num('fat', s.fat * 100)}${num('solute', s.solute * 100)}${num('other', s.other * 100)}${num('msnf', s.msnf * 100)}
      ${num('pod', s.pod)}${num('pac', s.pac)}
    </tr>`;
  }).join('');
}

let lastStatus = {};

function updateDynamic(status) {
  if (status) lastStatus = status;
  const m = measured(recipe);

  $('#summary-grid').innerHTML = [
    ['Total mass', `${fmt(m.mass, 1)} g`],
    ['Mix volume', `${fmt(m.volume, 0)} mL`],
    ['Fat %', `${fmt(m.fat * 100, 2)}%`],
    ['MSNF %', `${fmt(m.msnf * 100, 2)}%`],
    ['Total Solids %', `${fmt((1 - m.water) * 100, 2)}%`],
    ['Water %', `${fmt(m.water * 100, 2)}%`],
    ['POD', fmt(m.pod * 100, 2)],
    ['PAC', fmt(m.pac * 100, 2)],
  ].map(([label, value]) => `<div class="summary-tile"><span class="tile-label">${label}</span><span class="tile-value">${value}</span></div>`).join('');

  const overrun = parseFloat($('#overrun').value) || 0;
  $('#sum-churned').textContent = `~${fmt((m.volume * (1 + overrun / 100)) / 1000, 2)} L`;

  // Line masses: rewrite everything except the field being typed in.
  let anyNegative = false;
  for (const l of recipe.lines) {
    if (l.mass < -1e-6) anyNegative = true;
    const tr = document.querySelector(`tr[data-line="${l.id}"]`);
    if (!tr) continue;
    const input = tr.querySelector('input[data-field="mass"]');
    if (input) {
      if (input !== document.activeElement) input.value = trimNum(l.mass);
      input.classList.toggle('infeasible-mass', l.mass < -1e-6);
    } else {
      const span = tr.querySelector(`[data-massfor="${l.id}"]`);
      if (span) span.textContent = fmt(l.mass, 2);
    }
  }

  // Target inputs re-sync to spec; drift hints show measured vs target after
  // hand edits to lever masses (the model accepts the edit instead of fighting it).
  let anyDrift = false;
  for (const g of recipe.groups) {
    for (const metric of g.metrics) {
      const owned = g.owns.includes(metric);
      const input = document.querySelector(`input[data-target="${metric}"]`);
      if (input && input !== document.activeElement) {
        // Unpinned metrics read as measured outcomes; pinned ones show the spec.
        input.value = trimNum(toDisplay(metric, owned ? recipe.targets[metric] : m[metric]));
      }
      const driftEl = document.querySelector(`[data-drift="${metric}"]`);
      if (driftEl) {
        const dv = toDisplay(metric, m[metric]);
        const tv = toDisplay(metric, recipe.targets[metric]);
        const off = owned && Math.abs(dv - tv) > (metric === 'mass' ? 0.5 : 0.05);
        driftEl.textContent = off ? `now ${fmt(dv, metric === 'mass' ? 1 : 2)}` : '';
        if (off) anyDrift = true;
      }
    }
    const statusEl = document.querySelector(`[data-status="${g.id}"]`);
    if (statusEl) {
      const st = lastStatus[g.id];
      statusEl.textContent = !st ? '' : !st.ok ? (st.reason || '') : st.negative
        ? 'Some solved masses are negative — these targets are not reachable with non-negative amounts.' : '';
    }
  }
  $('#resolve-btn').classList.toggle('hidden', !anyDrift);
  $('#global-warn').textContent = anyNegative && !Object.values(lastStatus).some((s) => s && (s.negative || !s.ok))
    ? 'Some masses are negative — check the amounts.' : '';
}

function renderAll(status) {
  $('#recipe-name').textContent = recipe.name;
  renderTargets();
  renderSteps();
  renderAddBar();
  updateDynamic(status);
}

// --- Interaction ---
// All spec inputs (targets, identity shares, follower fractions, substance
// data) use a focus-time snapshot: each keystroke restores the snapshot and
// re-runs the cascade, so the result never depends on the typing path.

let snapshot = null;

function takeSnapshot() {
  snapshot = {
    masses: new Map(recipe.lines.map((l) => [l.id, l.mass])),
    targets: { ...recipe.targets },
  };
}

function restoreSnapshot() {
  if (!snapshot) return;
  for (const l of recipe.lines) {
    const m = snapshot.masses.get(l.id);
    if (m !== undefined) l.mass = m;
  }
  recipe.targets = { ...snapshot.targets };
}

const isSpecInput = (el) => el.matches?.(
  'input[data-target], input[data-field="share"], input[data-field="fraction"], input[data-sfield]'
);

function lineOf(el) {
  const tr = el.closest('tr[data-line]');
  return tr ? recipe.lines.find((l) => l.id === tr.dataset.line) : null;
}

const app = document.querySelector('main');

app.addEventListener('focusin', (e) => {
  if (isSpecInput(e.target)) takeSnapshot();
});

app.addEventListener('focusout', (e) => {
  const el = e.target;
  if (isSpecInput(el)) snapshot = null;
  // Snap fields back to the model on blur (the cascade may have moved them,
  // or the typed value may have been partial/invalid).
  if (el.dataset?.target) {
    el.value = trimNum(toDisplay(el.dataset.target, recipe.targets[el.dataset.target]));
  } else if (el.dataset?.field === 'mass') {
    const l = lineOf(el);
    if (l) el.value = trimNum(l.mass);
  } else if (el.dataset?.field === 'share') {
    const l = lineOf(el);
    if (l) el.value = trimNum(l.role.share * 100);
  } else if (el.dataset?.field === 'fraction') {
    const l = lineOf(el);
    if (l) el.value = trimNum(l.role.rule.fraction * 100);
  }
});

app.addEventListener('input', (e) => {
  const el = e.target;

  if (el.dataset.target) {
    const metric = el.dataset.target;
    const v = parseFloat(el.value);
    if (!Number.isFinite(v)) return; // mid-typing
    restoreSnapshot();
    recipe.targets[metric] = toInternal(metric, v);
    updateDynamic(cascade(recipe));
    return;
  }

  if (el.dataset.sfield) {
    const s = SUB[el.dataset.sub];
    const v = parseFloat(el.value);
    if (!s || !Number.isFinite(v)) return;
    restoreSnapshot();
    const f = el.dataset.sfield;
    s[f] = ['water', 'fat', 'solute', 'other', 'msnf'].includes(f) ? v / 100 : v;
    updateDynamic(cascade(recipe));
    return;
  }

  const l = lineOf(el);
  if (!l) return;
  const field = el.dataset.field;
  if (field === 'name') {
    l.name = el.value;
  } else if (field === 'share') {
    const v = parseFloat(el.value);
    if (!Number.isFinite(v)) return;
    restoreSnapshot();
    l.role.share = v / 100;
    updateDynamic(cascade(recipe));
  } else if (field === 'fraction') {
    const v = parseFloat(el.value);
    if (!Number.isFinite(v)) return;
    restoreSnapshot();
    l.role.rule.fraction = v / 100;
    updateDynamic(cascade(recipe));
  } else if (field === 'mass') {
    // Hand edit of a lever: accept it, update followers and drift — do not
    // fight the user. "Re-solve to targets" snaps back to spec.
    const v = parseFloat(el.value);
    if (!Number.isFinite(v)) return;
    l.mass = v;
    materializeFixed(recipe);
    updateDynamic();
  }
});

// Pin/unpin a metric for its group. Pinning adopts the current measured value
// as the target so nothing jumps; unpinning turns the metric into a readout.
app.addEventListener('change', (e) => {
  const el = e.target;
  if (!el.dataset.pin) return;
  const g = recipe.groups.find((x) => x.id === el.dataset.pingroup);
  const metric = el.dataset.pin;
  if (!g) return;
  if (el.checked) {
    if (!g.owns.includes(metric)) {
      recipe.targets[metric] = measured(recipe)[metric];
      g.owns = g.metrics.filter((mId) => g.owns.includes(mId) || mId === metric);
    }
  } else {
    g.owns = g.owns.filter((mId) => mId !== metric);
  }
  renderTargets();
  updateDynamic(cascade(recipe));
});

app.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'remove') {
    const tr = e.target.closest('tr[data-line]');
    recipe.lines = recipe.lines.filter((l) => l.id !== tr.dataset.line);
    renderAll(cascade(recipe));
  }
});

$('#resolve-btn').addEventListener('click', () => {
  updateDynamic(cascade(recipe));
});

$('#add-role').addEventListener('change', () => {
  $('#add-group').classList.toggle('hidden', $('#add-role').value !== 'lever');
});

$('#add-btn').addEventListener('click', () => {
  const substanceId = $('#add-substance').value;
  const stepId = $('#add-step').value;
  const roleKind = $('#add-role').value;
  let role;
  if (roleKind === 'lever') role = { kind: 'lever', groupId: $('#add-group').value };
  else if (roleKind === 'identity') role = { kind: 'identity', share: 0.01 };
  else role = { kind: 'follower', rule: { basis: 'batch', fraction: 0.001 } };
  recipe.lines.push(line(substanceId, stepId, role, { mass: roleKind === 'lever' ? 50 : 0 }));
  renderAll(cascade(recipe));
});

$('#reset-btn').addEventListener('click', () => {
  recipe = seedRecipe();
  renderAll(initTargets(recipe));
});

$('#overrun').addEventListener('input', () => updateDynamic());

// --- Init ---
$('#overrun').value = recipe.overrun;
renderLibrary();
renderAll(initTargets(recipe));

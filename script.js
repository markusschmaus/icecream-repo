// --- Data model ---
// Every ingredient composition fraction (water/fat/solute/other) is stored 0-1 internally,
// shown as 0-100 in the UI. "solute" = dissolved sugars/salts that drive sweetness (POD) and
// freezing-point depression (PAC); "other" = protein/fiber/ash/stabilizer, counted in Total
// Solids but not in Fat, POD or PAC. pod/pac coefficients are relative to sucrose = 1.00.

let nextId = 1;
function makeIngredient(o) {
  return {
    id: nextId++,
    name: o.name,
    mass: o.mass,
    density: o.density ?? 1.0,
    water: o.water,
    fat: o.fat,
    solute: o.solute,
    other: o.other,
    pod: o.pod,
    pac: o.pac,
  };
}

// Which ingredient (by id) each metric currently solves for, or null if unassigned.
const METRICS = ['fat', 'ts', 'pod', 'pac', 'mass'];
const assignments = { fat: null, ts: null, pod: null, pac: null, mass: null };

const PRESETS = [
  { name: 'Cream, 30% fat', mass: 610, density: 0.99, water: 0.646, fat: 0.30, solute: 0.029, other: 0.025, pod: 0.16, pac: 1.00 },
  { name: 'Milk, 1.5% fat', mass: 305, density: 1.03, water: 0.895, fat: 0.015, solute: 0.049, other: 0.041, pod: 0.16, pac: 1.00 },
  { name: 'Milk, 3.5% fat', mass: 100, density: 1.03, water: 0.878, fat: 0.035, solute: 0.049, other: 0.038, pod: 0.16, pac: 1.00 },
  { name: 'Cream, 35% fat', mass: 100, density: 0.99, water: 0.602, fat: 0.35, solute: 0.026, other: 0.022, pod: 0.16, pac: 1.00 },
  { name: 'Skim milk powder', mass: 20, density: 1.0, water: 0.03, fat: 0.01, solute: 0.51, other: 0.45, pod: 0.16, pac: 1.00 },
  { name: 'Egg yolk powder', mass: 37, density: 1.0, water: 0.03, fat: 0.60, solute: 0, other: 0.37, pod: 0, pac: 0 },
  { name: 'Sugar (sucrose)', mass: 100, density: 1.0, water: 0, fat: 0, solute: 1.0, other: 0, pod: 1.00, pac: 1.00 },
  { name: 'Dextrose', mass: 100, density: 1.0, water: 0, fat: 0, solute: 1.0, other: 0, pod: 0.74, pac: 1.90 },
  { name: 'Fructose', mass: 100, density: 1.0, water: 0, fat: 0, solute: 1.0, other: 0, pod: 1.73, pac: 1.90 },
  { name: 'Invert sugar (dry equiv.)', mass: 100, density: 1.0, water: 0, fat: 0, solute: 1.0, other: 0, pod: 1.25, pac: 1.90 },
  { name: 'Glucose syrup, DE60', mass: 100, density: 1.4, water: 0.20, fat: 0, solute: 0.80, other: 0, pod: 0.60, pac: 0.60 },
  { name: 'Honey', mass: 50, density: 1.42, water: 0.17, fat: 0, solute: 0.80, other: 0.03, pod: 1.30, pac: 1.90 },
  { name: 'Guar gum', mass: 1, density: 1.0, water: 0.09, fat: 0, solute: 0, other: 0.91, pod: 0, pac: 0 },
  { name: 'Xanthan gum', mass: 1, density: 1.0, water: 0.09, fat: 0, solute: 0, other: 0.91, pod: 0, pac: 0 },
  { name: 'Locust bean gum', mass: 1, density: 1.0, water: 0.09, fat: 0, solute: 0, other: 0.91, pod: 0, pac: 0 },
  { name: 'Salt, fine sea salt', mass: 1, density: 1.0, water: 0.002, fat: 0, solute: 0.998, other: 0, pod: 0, pac: 32.6 },
  { name: 'Fresh strawberries', mass: 330, density: 1.0, water: 0.91, fat: 0.003, solute: 0.055, other: 0.032, pod: 1.10, pac: 1.60 },
  { name: 'Freeze-dried strawberries', mass: 50, density: 1.0, water: 0.03, fat: 0.01, solute: 0.50, other: 0.46, pod: 1.10, pac: 1.60 },
  { name: 'Balsamic vinegar', mass: 39, density: 1.06, water: 0.77, fat: 0, solute: 0.15, other: 0.08, pod: 1.10, pac: 1.60 },
  { name: 'Black pepper, cracked', mass: 0.3, density: 1.0, water: 0.10, fat: 0.02, solute: 0, other: 0.88, pod: 0, pac: 0 },
  { name: 'Water', mass: 50, density: 1.0, water: 1.0, fat: 0, solute: 0, other: 0, pod: 0, pac: 0 },
  { name: 'Spirit / liqueur, 40% ABV', mass: 30, density: 0.95, water: 0.68, fat: 0, solute: 0.32, other: 0, pod: 0, pac: 5.80 },
  { name: 'Custom ingredient', mass: 100, density: 1.0, water: 0.5, fat: 0, solute: 0, other: 0.5, pod: 0, pac: 0 },
];

function recipeDefaults() {
  const byName = Object.fromEntries(PRESETS.map((p) => [p.name, p]));
  const use = (name, mass) => makeIngredient({ ...byName[name], mass });
  return [
    use('Cream, 30% fat', 610),
    use('Milk, 1.5% fat', 305),
    use('Egg yolk powder', 37),
    use('Sugar (sucrose)', 110),
    use('Dextrose', 55),
    use('Guar gum', 1),
    use('Xanthan gum', 1),
    use('Salt, fine sea salt', 1),
    use('Fresh strawberries', 330),
    { ...use('Sugar (sucrose)', 18), name: 'Sugar (maceration)' },
    use('Freeze-dried strawberries', 50),
    use('Balsamic vinegar', 39),
    { ...use('Black pepper, cracked', 0.3), name: 'Black pepper (maceration)' },
    { ...use('Black pepper, cracked', 0.3), name: 'Black pepper (finishing)' },
  ];
}

let ingredients = recipeDefaults();

// --- Calc engine ---

function metricCoef(metric, ing) {
  switch (metric) {
    case 'fat': return ing.fat;
    case 'ts': return 1 - ing.water;
    case 'pod': return ing.solute * ing.pod;
    case 'pac': return ing.solute * ing.pac;
    case 'mass': return 1;
    default: throw new Error('unknown metric ' + metric);
  }
}

function computeMetrics(list) {
  let mass = 0, fatMass = 0, waterMass = 0, podMass = 0, pacMass = 0, volume = 0;
  for (const ing of list) {
    mass += ing.mass;
    fatMass += ing.mass * ing.fat;
    waterMass += ing.mass * ing.water;
    podMass += ing.mass * ing.solute * ing.pod;
    pacMass += ing.mass * ing.solute * ing.pac;
    volume += ing.mass / (ing.density || 1);
  }
  return {
    mass,
    volume,
    fatPct: mass ? (fatMass / mass) * 100 : 0,
    tsPct: mass ? (1 - waterMass / mass) * 100 : 0,
    pod: mass ? (podMass / mass) * 100 : 0,
    pac: mass ? (pacMass / mass) * 100 : 0,
  };
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

function solveForTargets(list, freeIds, activeTargets) {
  const freeList = list.filter((i) => freeIds.has(i.id));
  const lockedList = list.filter((i) => !freeIds.has(i.id));
  const k = freeList.length;

  if (k === 0) return { success: false, reason: 'Tick "Free" on at least one ingredient above.' };
  if (activeTargets.length !== k) {
    return {
      success: false,
      reason: `${k} free ingredient(s) selected but ${activeTargets.length} target(s) ticked — these counts must match.`,
    };
  }

  const Cmass = lockedList.reduce((s, i) => s + i.mass, 0);
  const A = [];
  const b = [];

  for (const t of activeTargets) {
    if (t.metric === 'mass') {
      A.push(freeList.map(() => 1));
      b.push(t.value - Cmass);
    } else {
      const Cm = lockedList.reduce((s, i) => s + i.mass * metricCoef(t.metric, i), 0);
      A.push(freeList.map((f) => metricCoef(t.metric, f) - t.value));
      b.push(t.value * Cmass - Cm);
    }
  }

  const x = solveLinearSystem(A, b);
  if (!x) {
    return {
      success: false,
      reason: 'No unique solution — the chosen free ingredients and targets are not independent of each other. Try different free ingredients or targets.',
    };
  }

  const result = freeList.map((f, idx) => ({ id: f.id, name: f.name, oldMass: f.mass, newMass: x[idx] }));
  const infeasible = result.some((r) => r.newMass < -1e-6);
  return { success: true, result, infeasible };
}

// --- Rendering ---

const rowsEl = document.getElementById('ingredient-rows');
const presetSelect = document.getElementById('preset-select');

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function pct(f, d = 2) { return fmt(f * 100, d); }

function renderPresetOptions() {
  presetSelect.innerHTML = PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
}

function renderTable() {
  const solvedIds = new Set(Object.values(assignments).filter((v) => v != null));
  rowsEl.innerHTML = ingredients.map((ing) => {
    const sum = ing.water + ing.fat + ing.solute + ing.other;
    const warn = Math.abs(sum - 1) > 0.005
      ? `<span class="row-name-warn" title="Water+Fat+Solute+Other = ${fmt(sum * 100, 1)}%, should be ~100%">&#9888;</span>`
      : '';
    const isSolved = solvedIds.has(ing.id);
    const badge = isSolved ? '<span class="solved-badge" title="Mass is computed from a target">solved</span>' : '';
    return `
      <tr data-id="${ing.id}">
        <td><input class="name-input" type="text" data-field="name" value="${escapeHtml(ing.name)}">${warn}${badge}</td>
        <td><input type="number" step="any" data-field="mass" value="${trimNum(ing.mass)}" ${isSolved ? 'readonly' : ''}></td>
        <td><input type="number" step="any" data-field="density" value="${trimNum(ing.density)}"></td>
        <td><input type="number" step="any" data-field="water" value="${trimNum(ing.water * 100)}"></td>
        <td><input type="number" step="any" data-field="fat" value="${trimNum(ing.fat * 100)}"></td>
        <td><input type="number" step="any" data-field="solute" value="${trimNum(ing.solute * 100)}"></td>
        <td><input type="number" step="any" data-field="other" value="${trimNum(ing.other * 100)}"></td>
        <td><input type="number" step="any" data-field="pod" value="${trimNum(ing.pod)}"></td>
        <td><input type="number" step="any" data-field="pac" value="${trimNum(ing.pac)}"></td>
        <td><button class="remove-btn" data-action="remove" title="Remove">&times;</button></td>
      </tr>`;
  }).join('');
  refreshAssignmentSelects();
}

function refreshAssignmentSelects() {
  for (const metric of METRICS) {
    const sel = document.getElementById(`assign-${metric}`);
    const current = assignments[metric];
    const stillValid = current != null && ingredients.some((i) => i.id === current);
    sel.innerHTML = '<option value="">—</option>' + ingredients.map((i) => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');
    if (stillValid) {
      sel.value = String(current);
    } else {
      assignments[metric] = null;
      sel.value = '';
    }
  }
}

function trimNum(n) {
  if (!Number.isFinite(n)) return '';
  return Math.round(n * 10000) / 10000;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function updateSummary() {
  const m = computeMetrics(ingredients);
  document.getElementById('sum-mass').textContent = `${fmt(m.mass, 1)} g`;
  document.getElementById('sum-volume').textContent = `${fmt(m.volume, 0)} mL`;
  document.getElementById('sum-fat').textContent = `${fmt(m.fatPct, 2)}%`;
  document.getElementById('sum-ts').textContent = `${fmt(m.tsPct, 2)}%`;
  document.getElementById('sum-pod').textContent = fmt(m.pod, 2);
  document.getElementById('sum-pac').textContent = fmt(m.pac, 2);

  document.getElementById('cur-fat').textContent = `${fmt(m.fatPct, 2)}%`;
  document.getElementById('cur-ts').textContent = `${fmt(m.tsPct, 2)}%`;
  document.getElementById('cur-pod').textContent = fmt(m.pod, 2);
  document.getElementById('cur-pac').textContent = fmt(m.pac, 2);
  document.getElementById('cur-mass').textContent = `${fmt(m.mass, 1)} g`;

  const overrun = parseFloat(document.getElementById('overrun').value) || 0;
  document.getElementById('sum-churned').textContent = `~${fmt((m.volume * (1 + overrun / 100)) / 1000, 2)} L`;
}

// --- Live solve ---
// Every keystroke (on an ingredient field or a target value) re-solves instantly: build the
// k-equation/k-unknown linear system from whichever ingredients are currently assigned to an
// active target, and hand it to solveLinearSystem (Gauss-Jordan == applying the inverted matrix).

function runSolve() {
  rowsEl.querySelectorAll('input.infeasible-mass').forEach((el) => el.classList.remove('infeasible-mass'));

  const active = [];
  for (const metric of METRICS) {
    const ingredientId = assignments[metric];
    if (ingredientId == null) continue;
    const raw = parseFloat(document.getElementById(`target-${metric}`).value);
    if (!Number.isFinite(raw)) continue;
    // fat/ts/pod/pac are displayed as "times 100" of their internal fraction; mass is grams as-is.
    active.push({ metric, ingredientId, value: metric === 'mass' ? raw : raw / 100 });
  }

  if (active.length === 0) return '';

  const ids = active.map((a) => a.ingredientId);
  if (new Set(ids).size !== ids.length) {
    return 'Each target must be assigned to a different ingredient.';
  }

  const freeIds = new Set(ids);
  const targets = active.map(({ metric, value }) => ({ metric, value }));
  const result = solveForTargets(ingredients, freeIds, targets);
  if (!result.success) return result.reason;

  for (const r of result.result) {
    const ing = ingredients.find((i) => i.id === r.id);
    if (!ing) continue;
    ing.mass = r.newMass;
    const input = rowsEl.querySelector(`tr[data-id="${r.id}"] input[data-field="mass"]`);
    if (input) {
      input.value = trimNum(r.newMass);
      input.classList.toggle('infeasible-mass', r.newMass < -1e-6);
    }
  }

  return result.infeasible
    ? 'One or more solved masses are negative — not physically achievable with this combination.'
    : '';
}

function recomputeAll() {
  const message = runSolve();
  updateSummary();
  const statusEl = document.getElementById('solve-status');
  statusEl.textContent = message;
  statusEl.classList.toggle('has-error', Boolean(message));
}

// --- Event wiring ---

rowsEl.addEventListener('input', (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = Number(tr.dataset.id);
  const ing = ingredients.find((i) => i.id === id);
  if (!ing) return;
  const field = e.target.dataset.field;
  if (field === 'name') {
    ing.name = e.target.value;
    refreshAssignmentSelects();
    recomputeAll();
    return;
  }
  const v = parseFloat(e.target.value);
  const val = Number.isFinite(v) ? v : 0;
  if (['water', 'fat', 'solute', 'other'].includes(field)) {
    ing[field] = val / 100;
  } else {
    ing[field] = val;
  }
  recomputeAll();
  // re-render only to refresh the row-sum warning icon, without losing focus elsewhere
  const warnEl = tr.querySelector('.row-name-warn');
  const sum = ing.water + ing.fat + ing.solute + ing.other;
  const isOff = Math.abs(sum - 1) > 0.005;
  if (isOff && !warnEl) {
    tr.children[0].insertAdjacentHTML('beforeend', `<span class="row-name-warn" title="Water+Fat+Solute+Other = ${fmt(sum * 100, 1)}%, should be ~100%">&#9888;</span>`);
  } else if (!isOff && warnEl) {
    warnEl.remove();
  } else if (isOff && warnEl) {
    warnEl.title = `Water+Fat+Solute+Other = ${fmt(sum * 100, 1)}%, should be ~100%`;
  }
});

rowsEl.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'remove') {
    const tr = e.target.closest('tr');
    const id = Number(tr.dataset.id);
    ingredients = ingredients.filter((i) => i.id !== id);
    for (const metric of METRICS) {
      if (assignments[metric] === id) assignments[metric] = null;
    }
    renderTable();
    recomputeAll();
  }
});

document.getElementById('add-preset-btn').addEventListener('click', () => {
  const p = PRESETS[Number(presetSelect.value)];
  ingredients.push(makeIngredient({ ...p }));
  renderTable();
  recomputeAll();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  ingredients = recipeDefaults();
  for (const metric of METRICS) assignments[metric] = null;
  document.querySelectorAll('#target-table input[type="number"]').forEach((el) => { el.value = ''; });
  renderTable();
  recomputeAll();
});

document.getElementById('overrun').addEventListener('input', updateSummary);

for (const metric of METRICS) {
  document.getElementById(`assign-${metric}`).addEventListener('change', (e) => {
    assignments[metric] = e.target.value ? Number(e.target.value) : null;
    renderTable();
    recomputeAll();
  });
  document.getElementById(`target-${metric}`).addEventListener('input', recomputeAll);
}

// --- Init ---
renderPresetOptions();
renderTable();
recomputeAll();

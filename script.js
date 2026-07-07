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

const METRICS = ['fat', 'ts', 'pod', 'pac', 'mass'];

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

// Solves for ALL ingredient masses at once — nothing is held fixed on the ingredient side.
// Called with all 5 metrics as constraints (4 pinned at current values + 1 at its new value),
// so k=5 equations against n ingredients (k <= n): the system is underdetermined and there are
// infinitely many mixes that hit the constraints exactly. We pick the one closest to the
// current recipe in a weighted least-squares sense: minimize the sum of squared *relative*
// changes (sum((Δmass_i / mass_i)^2)), which is the standard minimum-norm least-squares
// solution once each ingredient's row is rescaled by its own current mass. That reduces to
// solving a small k x k system (the Gram matrix B*B^T) with the same Gauss-Jordan solver as a
// plain inverse — "applying the inverted matrix," generalized to a non-square system via its
// Moore-Penrose pseudo-inverse. Change concentrates on whichever ingredients actually move the
// edited metric while the pinned constraints keep everything else in place.
function solveAllIngredients(list, activeTargets) {
  const n = list.length;
  const k = activeTargets.length;
  if (k === 0) return { success: true, result: [] };
  if (k > n) {
    return {
      success: false,
      reason: `Solving needs at least ${k} ingredients (one per constrained metric) but the mix only has ${n}.`,
    };
  }

  const EPS = 1e-9;
  const m0 = list.map((ing) => ing.mass);
  const M0 = m0.reduce((s, m) => s + m, 0);
  const scale = m0.map((m) => (Math.abs(m) > EPS ? m : 1));

  const rawCoef = []; // k x n, coefficient of ingredient i's *absolute* mass change in target j's equation
  const c = []; // k, required total shift in target j's equation given the current mix
  for (const t of activeTargets) {
    if (t.metric === 'mass') {
      rawCoef.push(list.map(() => 1));
      c.push(t.value - M0);
    } else {
      const C0 = list.reduce((s, ing) => s + ing.mass * metricCoef(t.metric, ing), 0);
      rawCoef.push(list.map((ing) => metricCoef(t.metric, ing) - t.value));
      c.push(t.value * M0 - C0);
    }
  }

  // B rescales each ingredient's column by its current mass, so solving for minimum-norm z in
  // B*z=c and converting back (Δ_i = z_i * scale[i]) is equivalent to minimum relative change.
  const B = rawCoef.map((row) => row.map((v, i) => v * scale[i]));
  const BBt = B.map((rowJ) => B.map((rowL) => rowJ.reduce((s, v, i) => s + v * rowL[i], 0)));

  const y = solveLinearSystem(BBt, c);
  if (!y) {
    return {
      success: false,
      reason: 'No solution — the ingredients are not compositionally diverse enough to move this metric while holding the others fixed.',
    };
  }

  const result = list.map((ing, i) => {
    const z = B.reduce((s, row, j) => s + row[i] * y[j], 0);
    const newMass = ing.mass + z * scale[i];
    return { id: ing.id, name: ing.name, oldMass: ing.mass, newMass };
  });

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

function renderPresetOptions() {
  presetSelect.innerHTML = PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
}

function renderTable() {
  rowsEl.innerHTML = ingredients.map((ing) => {
    const sum = ing.water + ing.fat + ing.solute + ing.other;
    const warn = Math.abs(sum - 1) > 0.005
      ? `<span class="row-name-warn" title="Water+Fat+Solute+Other = ${fmt(sum * 100, 1)}%, should be ~100%">&#9888;</span>`
      : '';
    return `
      <tr data-id="${ing.id}">
        <td><input class="name-input" type="text" data-field="name" value="${escapeHtml(ing.name)}">${warn}</td>
        <td><input type="number" step="any" data-field="mass" value="${trimNum(ing.mass)}"></td>
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
}

function trimNum(n) {
  if (!Number.isFinite(n)) return '';
  return Math.round(n * 10000) / 10000;
}

// Escapes for both text and attribute-value contexts (renderTable interpolates names
// into value="..." attributes, so quotes must be escaped too).
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// Current value of each metric in its *display* units (fat/ts/pod/pac as x100, mass in grams).
function metricDisplayValues() {
  const m = computeMetrics(ingredients);
  return { fat: m.fatPct, ts: m.tsPct, pod: m.pod, pac: m.pac, mass: m.mass };
}

function updateSummary() {
  const m = computeMetrics(ingredients);
  document.getElementById('sum-mass').textContent = `${fmt(m.mass, 1)} g`;
  document.getElementById('sum-volume').textContent = `${fmt(m.volume, 0)} mL`;
  document.getElementById('sum-fat').textContent = `${fmt(m.fatPct, 2)}%`;
  document.getElementById('sum-ts').textContent = `${fmt(m.tsPct, 2)}%`;
  document.getElementById('sum-pod').textContent = fmt(m.pod, 2);
  document.getElementById('sum-pac').textContent = fmt(m.pac, 2);

  const overrun = parseFloat(document.getElementById('overrun').value) || 0;
  document.getElementById('sum-churned').textContent = `~${fmt((m.volume * (1 + overrun / 100)) / 1000, 2)} L`;

  refreshMetricInputs();
}

// The metric boxes are editable outputs: they always show the mix's current values, except
// the one the user is typing in, which re-syncs on blur.
function refreshMetricInputs() {
  const vals = metricDisplayValues();
  for (const metric of METRICS) {
    const input = document.getElementById(`target-${metric}`);
    if (input !== document.activeElement) input.value = trimNum(vals[metric]);
  }
}

// --- Live solve ---
// Editing one metric re-solves with ALL five metrics as constraints: the edited one at its new
// value, the other four pinned at their current values. Ingredient masses redistribute to
// satisfy all five simultaneously, so changing Fat% leaves TS%, POD, PAC and total mass intact.

// Masses snapshotted when a metric box gains focus. Each keystroke solves relative to this
// baseline instead of the previous keystroke's result — otherwise typing "12" would solve at
// "1" first and then re-solve from that shifted mix, making the outcome depend on typing path.
let editBaseline = null;

function solveForMetricEdit(editedMetric) {
  const raw = parseFloat(document.getElementById(`target-${editedMetric}`).value);
  if (!Number.isFinite(raw)) return ''; // mid-typing (empty/partial) — wait for a number

  if (editBaseline) {
    for (const ing of ingredients) {
      const saved = editBaseline.get(ing.id);
      if (saved !== undefined) ing.mass = saved;
    }
  }

  const current = metricDisplayValues();
  // Convert display units to internal: fat/ts/pod/pac are fractions internally, mass is grams.
  const toInternal = (metric, v) => (metric === 'mass' ? v : v / 100);
  const targets = METRICS.map((metric) => ({
    metric,
    value: toInternal(metric, metric === editedMetric ? raw : current[metric]),
  }));

  const result = solveAllIngredients(ingredients, targets);
  if (!result.success) return result.reason;

  rowsEl.querySelectorAll('input.infeasible-mass').forEach((el) => el.classList.remove('infeasible-mass'));
  for (const r of result.result) {
    const ing = ingredients.find((i) => i.id === r.id);
    if (!ing) continue;
    ing.mass = r.newMass;
    const input = rowsEl.querySelector(`tr[data-id="${r.id}"] input[data-field="mass"]`);
    if (input) {
      // Never overwrite a field the user is typing in; it re-syncs on blur (change event).
      if (input !== document.activeElement) input.value = trimNum(r.newMass);
      input.classList.toggle('infeasible-mass', r.newMass < -1e-6);
    }
  }

  return result.infeasible
    ? 'One or more solved masses are negative — this value is not reachable while holding the other metrics fixed.'
    : '';
}

function setStatus(message) {
  document.getElementById('solve-status').textContent = message;
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
    return;
  }
  const v = parseFloat(e.target.value);
  const val = Number.isFinite(v) ? v : 0;
  if (['water', 'fat', 'solute', 'other'].includes(field)) {
    ing[field] = val / 100;
  } else {
    ing[field] = val;
  }
  updateSummary();
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

// On blur, sync a mass field to the model — the solver may have moved it away from the typed
// value while the field was focused (runSolve skips rewriting the active element).
rowsEl.addEventListener('change', (e) => {
  if (e.target.dataset.field !== 'mass') return;
  const tr = e.target.closest('tr');
  const ing = tr && ingredients.find((i) => i.id === Number(tr.dataset.id));
  if (ing) e.target.value = trimNum(ing.mass);
});

rowsEl.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'remove') {
    const tr = e.target.closest('tr');
    const id = Number(tr.dataset.id);
    ingredients = ingredients.filter((i) => i.id !== id);
    renderTable();
    setStatus('');
    updateSummary();
  }
});

document.getElementById('add-preset-btn').addEventListener('click', () => {
  const p = PRESETS[Number(presetSelect.value)];
  ingredients.push(makeIngredient({ ...p }));
  renderTable();
  updateSummary();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  ingredients = recipeDefaults();
  renderTable();
  setStatus('');
  updateSummary();
});

document.getElementById('overrun').addEventListener('input', updateSummary);

for (const metric of METRICS) {
  const input = document.getElementById(`target-${metric}`);
  input.addEventListener('focus', () => {
    editBaseline = new Map(ingredients.map((i) => [i.id, i.mass]));
  });
  input.addEventListener('input', () => {
    setStatus(solveForMetricEdit(metric));
    updateSummary();
  });
  // On blur, snap the edited box back to the mix's actual value (identical to the typed value
  // after a successful solve; the real current value after an invalid/incomplete edit).
  input.addEventListener('blur', () => {
    editBaseline = null;
    input.value = trimNum(metricDisplayValues()[metric]);
  });
}

// --- Init ---
renderPresetOptions();
renderTable();
updateSummary();

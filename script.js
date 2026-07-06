const volumeInput = document.getElementById('volume');
const unitInput = document.getElementById('unit');
const targetFatInput = document.getElementById('target-fat');
const creamFatInput = document.getElementById('cream-fat');
const milkFatInput = document.getElementById('milk-fat');

const errorEl = document.getElementById('error');
const resultEl = document.getElementById('result');
const creamAmountEl = document.getElementById('cream-amount');
const milkAmountEl = document.getElementById('milk-amount');

function formatAmount(value, unit) {
  return `${value.toFixed(1)} ${unit}`;
}

function calculate() {
  const volume = parseFloat(volumeInput.value);
  const unit = unitInput.value;
  const targetFat = parseFloat(targetFatInput.value);
  const creamFat = parseFloat(creamFatInput.value);
  const milkFat = parseFloat(milkFatInput.value);

  const inputsValid = [volume, targetFat, creamFat, milkFat].every(Number.isFinite) && volume > 0;

  if (!inputsValid) {
    showError('Enter a positive volume and valid fat percentages.');
    return;
  }

  if (creamFat <= milkFat) {
    showError('Cream fat % must be greater than milk fat %.');
    return;
  }

  if (targetFat < milkFat || targetFat > creamFat) {
    showError(`Target fat % must be between ${milkFat}% and ${creamFat}% to be achievable with this mix.`);
    return;
  }

  const creamVolume = volume * (targetFat - milkFat) / (creamFat - milkFat);
  const milkVolume = volume - creamVolume;

  hideError();
  creamAmountEl.textContent = formatAmount(creamVolume, unit);
  milkAmountEl.textContent = formatAmount(milkVolume, unit);
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  resultEl.style.opacity = '0.4';
}

function hideError() {
  errorEl.hidden = true;
  resultEl.style.opacity = '1';
}

[volumeInput, unitInput, targetFatInput, creamFatInput, milkFatInput].forEach((el) => {
  el.addEventListener('input', calculate);
});

calculate();

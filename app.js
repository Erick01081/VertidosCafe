const fields = {
  coffee: document.querySelector('#coffee'),
  ratio: document.querySelector('#ratio'),
  pours: document.querySelector('#pours'),
  bloom: document.querySelectorAll('input[name="bloom"]'),
};
const list = document.querySelector('#pour-list');
const total = document.querySelector('#total-water');
const summary = document.querySelector('#recipe-summary');

const clean = (value, fallback, min) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number >= min ? number : fallback;
};
const display = (number) => Number.isInteger(number) ? number : number.toFixed(1).replace(/\.0$/, '');

function render() {
  const coffee = clean(fields.coffee.value, 15, 1);
  const ratio = clean(fields.ratio.value, 16, 1);
  const pours = Math.round(clean(fields.pours.value, 5, 1));
  const bloomRatio = Number(document.querySelector('input[name="bloom"]:checked').value);
  const water = coffee * ratio;
  const bloom = Math.min(coffee * bloomRatio, water);
  const perPour = (water - bloom) / pours;

  total.innerHTML = `${display(water)} <small>ml</small>`;
  summary.textContent = `${display(coffee)} g · ratio 1:${display(ratio)} · ${pours} vertido${pours === 1 ? '' : 's'}`;
  const rows = [{ tag: 'Bloom', name: `Bloom 1:${bloomRatio}`, amount: bloom }];
  for (let index = 1; index <= pours; index += 1) {
    rows.push({ tag: String(index).padStart(2, '0'), name: `Vertido ${index}`, amount: bloom + perPour * index });
  }
  list.innerHTML = rows.map((row, index) => `
    <div class="pour" style="animation-delay:${index * 35}ms">
      <span class="pour-tag">${row.tag}</span>
      <span class="pour-name">${row.name}</span>
      <span class="pour-amount">${display(row.amount)} <small>ml</small></span>
    </div>`).join('');
}

[fields.coffee, fields.ratio, fields.pours].forEach((field) => field.addEventListener('input', render));
fields.bloom.forEach((field) => field.addEventListener('change', render));
render();

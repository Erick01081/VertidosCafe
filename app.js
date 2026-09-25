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

// The static app keeps its coffee notebook in this browser's local storage.
const storageKey = 'ritual-coffee-notebook-v1';
const readNotebook = () => {
  try { return JSON.parse(localStorage.getItem(storageKey)) || { coffees: [], brews: [] }; }
  catch { return { coffees: [], brews: [] }; }
};
let notebook = readNotebook();
const saveNotebook = () => localStorage.setItem(storageKey, JSON.stringify(notebook));
const coffeeForm = document.querySelector('#coffee-form');
const brewForm = document.querySelector('#brew-form');
const photoInput = document.querySelector('#label-photo');
const ocrStatus = document.querySelector('#ocr-status');
const coffeeSelect = document.querySelector('#brew-coffee');
const history = document.querySelector('#brew-history');
const fieldIds = ['name', 'variety', 'region', 'farm', 'process', 'notes'];
const valueOf = (key) => document.querySelector(`#coffee-${key}`).value.trim();
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

function refreshNotebook() {
  const selected = coffeeSelect.value;
  coffeeSelect.innerHTML = notebook.coffees.length
    ? notebook.coffees.map((coffee) => `<option value="${escapeHTML(coffee.id)}">${escapeHTML(coffee.name || coffee.region || 'Café sin nombre')}</option>`).join('')
    : '<option value="">Primero guarda un café</option>';
  if (notebook.coffees.some((coffee) => coffee.id === selected)) coffeeSelect.value = selected;
  document.querySelector('#history-count').textContent = `${notebook.brews.length} preparación${notebook.brews.length === 1 ? '' : 'es'}`;
  history.innerHTML = notebook.brews.length ? notebook.brews.map((brew) => {
    const coffee = notebook.coffees.find((item) => item.id === brew.coffeeId);
    return `<article class="brew-entry"><div class="brew-entry-top"><div><p class="entry-date">${escapeHTML(brew.date)}</p><h4>${escapeHTML(coffee?.name || 'Café')}</h4></div><span class="dripper-chip">${escapeHTML(brew.dripper)}</span></div><p class="entry-meta">${escapeHTML(coffee?.region || '')}${coffee?.variety ? ` · ${escapeHTML(coffee.variety)}` : ''}</p><p class="entry-recipe">${escapeHTML(brew.recipe)} · ${escapeHTML(brew.grind || 'Molienda sin registrar')}${brew.temperature ? ` · ${escapeHTML(brew.temperature)} °C` : ''}</p>${brew.notes ? `<p class="entry-notes">“${escapeHTML(brew.notes)}”</p>` : ''}</article>`;
  }).join('') : '<p class="empty-state">Tus preparaciones aparecerán aquí.</p>';
}

coffeeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const coffee = Object.fromEntries(fieldIds.map((key) => [key, valueOf(key)]));
  if (!coffee.name && !coffee.region && !coffee.farm) { document.querySelector('#coffee-name').focus(); return; }
  coffee.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  coffee.photo = coffeeForm.dataset.photo || '';
  notebook.coffees.unshift(coffee);
  try { saveNotebook(); } catch { ocrStatus.textContent = 'No se pudo guardar: el almacenamiento del navegador está lleno. Prueba con una imagen más pequeña.'; return; }
  coffeeForm.reset(); delete coffeeForm.dataset.photo;
  ocrStatus.textContent = 'Café guardado. Completa una preparación cuando quieras.';
  refreshNotebook(); coffeeSelect.value = coffee.id;
});

photoInput.addEventListener('change', async () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (!window.Tesseract) { ocrStatus.textContent = 'No se pudo cargar el reconocimiento. Revisa tu conexión e inténtalo de nuevo.'; return; }
  ocrStatus.textContent = 'Leyendo la etiqueta… puede tardar unos segundos.';
  try {
    const result = await Tesseract.recognize(file, 'spa+eng');
    const text = result.data.text;
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    // Use label cues where possible and the first useful line as a name suggestion.
    const patterns = [
      ['variety', /(?:variedad|variety|cultivar)\s*[:\-]?\s*(.+)/i],
      ['region', /(?:regi[oó]n|region|origen|origin|municipio)\s*[:\-]?\s*(.+)/i],
      ['farm', /(?:finca|farm|productor|producer)\s*[:\-]?\s*(.+)/i],
      ['process', /(?:proceso|process|beneficio)\s*[:\-]?\s*(.+)/i],
      ['notes', /(?:notas? de cata|tasting notes|perfil)\s*[:\-]?\s*(.+)/i],
    ];
    for (const [key, pattern] of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) document.querySelector(`#coffee-${key}`).value = match[1].split('\n')[0].trim().slice(0, 120);
    }
    const name = lines.find((line) => line.length > 2 && !/^(variedad|variety|regi[oó]n|region|finca|farm|proceso|process)\b/i.test(line));
    if (name && !valueOf('name')) document.querySelector('#coffee-name').value = name.slice(0, 80);
    // Keep a resized thumbnail so the notebook remains within localStorage limits.
    const image = await createImageBitmap(file);
    const scale = Math.min(1, 640 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    coffeeForm.dataset.photo = canvas.toDataURL('image/jpeg', .68);
    ocrStatus.textContent = 'Etiqueta leída. Revisa y corrige los campos antes de guardar.';
  } catch (error) {
    console.error(error);
    ocrStatus.textContent = 'No logramos leer la etiqueta. Puedes completar la ficha manualmente.';
  }
});

brewForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const coffeeId = coffeeSelect.value;
  if (!coffeeId) { coffeeSelect.focus(); return; }
  const coffee = clean(fields.coffee.value, 15, 1);
  const ratio = clean(fields.ratio.value, 16, 1);
  const pours = Math.round(clean(fields.pours.value, 5, 1));
  const bloom = document.querySelector('input[name="bloom"]:checked').value;
  const brew = {
    coffeeId, date: new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    dripper: document.querySelector('#dripper').value, grind: document.querySelector('#grind').value.trim(),
    temperature: document.querySelector('#temperature').value, notes: document.querySelector('#brew-notes').value.trim(),
    recipe: `${display(coffee)} g · 1:${display(ratio)} · bloom 1:${bloom} · ${pours} vertidos`,
  };
  notebook.brews.unshift(brew);
  try { saveNotebook(); } catch { notebook.brews.shift(); ocrStatus.textContent = 'No se pudo guardar. El almacenamiento del navegador está lleno.'; return; }
  document.querySelector('#brew-notes').value = ''; document.querySelector('#grind').value = ''; document.querySelector('#temperature').value = '';
  refreshNotebook();
});

refreshNotebook();

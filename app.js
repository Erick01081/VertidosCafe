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
const fieldIds = ['name', 'roaster', 'variety', 'region', 'farm', 'process', 'notes'];
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
    return `<article class="brew-entry"><div class="brew-entry-top"><div><p class="entry-date">${escapeHTML(brew.date)}</p><h4>${escapeHTML(coffee?.name || 'Café')}</h4></div><span class="dripper-chip">${escapeHTML(brew.dripper)}</span></div><p class="entry-meta">${escapeHTML([coffee?.roaster, coffee?.region, coffee?.variety].filter(Boolean).join(' · '))}</p><p class="entry-recipe">${escapeHTML(brew.recipe)} · ${escapeHTML(brew.grind || 'Molienda sin registrar')}${brew.temperature ? ` · ${escapeHTML(brew.temperature)} °C` : ''}</p>${brew.notes ? `<p class="entry-notes">“${escapeHTML(brew.notes)}”</p>` : ''}</article>`;
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
    const normalized = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const cleanLine = (line) => line.replace(/[|•#]/g, ' ').replace(/\s+/g, ' ').trim();
    const usableLines = lines.map(cleanLine).filter((line) => line.length > 2);
    const allText = normalized(usableLines.join('\n'));
    // Some roasters print values as headings without field names. Try explicit cues first.
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
    const varietyNames = ['sudan rume', 'red bourbon', 'pink bourbon', 'yellow bourbon', 'castillo', 'pacamara', 'maragesha', 'gesha', 'geisha', 'caturra', 'typica', 'chiroso', 'tabi'];
    const variety = varietyNames.find((candidate) => allText.includes(candidate.trim()));
    if (variety && !valueOf('variety')) document.querySelector('#coffee-variety').value = variety.trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
    const processTerms = ['anaerobic natural', 'anaerobico natural', 'anaerobic', 'anaerobico', 'washed', 'lavado', 'natural', 'honey', 'miel', 'fermentado'];
    const process = processTerms.find((candidate) => allText.includes(candidate));
    if (process && !valueOf('process')) document.querySelector('#coffee-process').value = process.replace(/\b\w/g, (letter) => letter.toUpperCase());
    const regionTerms = ['huila', 'narino', 'risaralda', 'cauca', 'tolima', 'quindio', 'caldas', 'santander', 'pichincha', 'antioquia', 'acevedo', 'pitalito', 'buesaco', 'bruselas', 'el bolio'];
    const locationLine = usableLines.find((line) => regionTerms.some((term) => normalized(line).includes(term)));
    if (locationLine && !valueOf('region')) document.querySelector('#coffee-region').value = locationLine.slice(0, 120);
    const altitude = usableLines.find((line) => /\b\d{3,4}\s*(?:m\s*.?\s*s\s*.?\s*n\s*.?\s*m\s*\.?|msnm)\b/i.test(line));
    if (locationLine && altitude && !normalized(locationLine).includes('msnm')) document.querySelector('#coffee-region').value = `${locationLine} · ${altitude}`.slice(0, 120);
    const roasterLine = usableLines.find((line) => /\b(cafe|coffee)\b/i.test(line));
    if (roasterLine && !valueOf('roaster')) document.querySelector('#coffee-roaster').value = roasterLine.slice(0, 80);
    const producerMatch = text.match(/#\s*([^\n]+)/);
    const producerLine = producerMatch?.[1]?.trim() || usableLines.find((line) => /(?:productor|producer|cultivado por)\s*[:\-]?/i.test(line));
    if (producerLine && !valueOf('farm')) document.querySelector('#coffee-farm').value = producerLine.replace(/^(?:productor|producer)\s*[:\-]?\s*/i, '').slice(0, 100);
    const farmCue = usableLines.find((line) => /\b(finca|farm|hacienda)\b/i.test(line));
    if (farmCue && !valueOf('farm')) document.querySelector('#coffee-farm').value = farmCue.slice(0, 100);
    if (!valueOf('farm') && locationLine) {
      const locationIndex = usableLines.indexOf(locationLine);
      const candidates = usableLines.slice(0, locationIndex).map((line) => line.replace(/\b\d{3,4}\s*(?:m\s*\.?\s*s\s*\.?\s*n\s*\.?\s*m\s*\.?|msnm)\b/i, '').trim()).filter((line) => {
        const normalizedLine = normalized(line);
        return line.length > 2 && !/\b(msnm|m\.s\.n\.m|cafe|coffee|drop\s+\d+)\b/i.test(line)
          && !varietyNames.some((item) => normalizedLine.includes(item.trim()))
          && !processTerms.some((item) => normalizedLine.includes(item))
          && !/\b(limon|limoncillo|toronja|cardamomo|canela|anis|cereza|frambuesa|cacao|chocolate|floral|afrutado|frutal|panela|durazno)\b/i.test(line);
      });
      if (candidates.length) document.querySelector('#coffee-farm').value = candidates[candidates.length - 1].slice(0, 100);
    }
    const tastingCue = text.match(/(?:perfil|notas? de cata|tasting notes)\s*[:\-]?\s*([^\n]+)/i);
    const fruitLine = usableLines.find((line) => /\b(limon|limoncillo|toronja|cardamomo|canela|anis|cereza|frambuesa|cacao|chocolate|floral|afrutado|frutal|panela|durazno)\b/i.test(line));
    if (!valueOf('notes') && (tastingCue?.[1] || fruitLine)) document.querySelector('#coffee-notes').value = (tastingCue?.[1] || fruitLine).slice(0, 140);
    const ignored = /^(variedad|variety|regi[oó]n|region|finca|farm|proceso|process|natural|washed|lavado|soare|lohas|cafe|coffee|drop\s+\d+)/i;
    const name = usableLines.find((line) => line.length > 2 && !ignored.test(line) && !/\b(msnm|m\.s\.n\.m)\b/i.test(line));
    if (name && !valueOf('name')) document.querySelector('#coffee-name').value = variety ? variety.trim().replace(/\b\w/g, (letter) => letter.toUpperCase()) : name.slice(0, 80);
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

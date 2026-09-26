import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRecipe, makeRecipe } from '../.test-dist/types.js';
import { proposeLabelData } from '../.test-dist/label-parser.js';

test('calculates bloom and cumulative pour weights from coffee, ratio and pour count', () => {
  assert.deepEqual(makeRecipe(15, 16, 3, 3), {
    coffeeGrams: 15, ratio: 16, bloomRatio: 3, pours: 3, water: [45, 110, 175, 240],
  });
});

test('supports configurable 1:2 bloom and two pours after bloom', () => {
  assert.deepEqual(makeRecipe(20, 15, 2, 2).water, [40, 170, 300]);
});

test('starts with five pours after bloom and supports decimal coffee amounts', () => {
  const initial=initialRecipe();
  assert.equal(initial.pours,5);
  assert.deepEqual(initial.water,[45,84,123,162,201,240]);
  const decimal=makeRecipe(15.5,16,3,5);
  assert.equal(decimal.coffeeGrams,15.5);
  assert.equal(decimal.water.at(-1),248);
  assert.deepEqual(decimal.water,[46.5,86.8,127.1,167.4,207.7,248]);
  assert.deepEqual(makeRecipe(15,16.5,3,4).water,[45,95.625,146.25,196.875,247.5]);
});

test('keeps the total water at or above the chosen bloom and limits pour count', () => {
  assert.equal(makeRecipe(15,1,4,5).ratio,4);
  assert.equal(makeRecipe(15,16,3,99).water.length,13);
});

test('parses Spanish and English labels and leaves unknown values empty', () => {
  const found = proposeLabelData([
    'Variety: Pink Bourbon', 'Proceso: Lavado', 'Grown by: Ana Ríos',
    'Finca: La Esperanza', 'Origin: Pitalito, Huila, Colombia',
    'Tasting notes: guava, cocoa, panela', '1,850 msnm',
  ].join('\n'));
  assert.equal(found.variety, 'Pink Bourbon');
  assert.equal(found.process, 'Lavado');
  assert.equal(found.producer, 'Ana Ríos');
  assert.equal(found.farm, 'La Esperanza');
  assert.equal(found.municipality, 'Pitalito');
  assert.equal(found.region, 'Huila');
  assert.equal(found.country, 'Colombia');
  assert.equal(found.altitude, '1850');
  assert.equal(found.notes, 'guava, cocoa, panela');
});

test('proposes unlabeled variety, process, tasting profile and a standalone producer name', () => {
  const found = proposeLabelData('SIDRA\nAna María Ortiz\nAnaerobic natural\nFrambuesa, limoncillo, cacao');
  assert.equal(found.variety, 'SIDRA');
  assert.equal(found.producer, 'Ana María Ortiz');
  assert.equal(found.process, 'Anaerobic natural');
  assert.equal(found.notes, 'Frambuesa, limoncillo, cacao');
});

test('does not populate fields when OCR contains no recognizable value', () => {
  const found = proposeLabelData('Organic coffee\nSpecialty grade');
  assert.equal(found.variety, '');
  assert.equal(found.process, '');
  assert.equal(found.producer, '');
  assert.equal(found.farm, '');
  assert.equal(found.altitude, '');
});

test('reference package text confirms the same general extraction rules across five origins', () => {
  const examples = [
    ['Lohas Café\nLAVADO\nPacamara\nTropical Fruit Forward Lush\nPerfil\nNotas de Limoncillo, toronja y cardamomo. Acidez brillante y cuerpo medio. Sabor residual prolongado con notas de canela y anís.\nJhonatan Gasca', ['Pacamara','lavado','Jhonatan Gasca']],
    ['Lohas Café\nRed Bourbon\nCreamy Cultured Brilliance\nNatural\nAcevedo, Huila\n#Jhoan Vergara\nAlmíbar de cereza y frambuesa, nips de cacao, syrup de canela y banana', ['Red Bourbon','Natural','Jhoan Vergara']],
    ['Soare Coffee\nSUDAN RUME\nAnaeróbico natural\nJosé Uribe Lasso\nEl Triunfo\nBruselas, Pitalito, Huila\n1800 msnm\nFrutos rojos, chocolate', ['SUDAN RUME','Anaeróbico natural','José Uribe Lasso']],
    ['Soare Coffee\nMARAGESHA | WASHED\nCAROLINA CHALAPUD\nALTOS DE QUITUPAMBA\nFLORAL | AFRUTADO\nBUESACO, NARIÑO\n2200 MSNM', ['MARAGESHA','Washed','CAROLINA CHALAPUD']],
    ['SOARE Coffee\nCASTILLO NATURAL\nJOHN MARÍN\nEL BOHÍO\n1750 MSNM\nMISTRATÓ, RISARALDA\nNIPS DE CACAO, LICORADO', ['CASTILLO','Natural','JOHN MARÍN']],
  ];
  for (const [text,[variety,process,producer]] of examples) {
    const found=proposeLabelData(text);
    assert.equal(found.variety.toLowerCase(), variety.toLowerCase());
    assert.equal(found.process.toLowerCase(), process.toLowerCase());
    assert.equal(found.producer, producer);
  }
  const soare=proposeLabelData('CASTILLO NATURAL\nJOHN MARÍN\nEL BOHÍO\n1750 MSNM\nMISTRATÓ, RISARALDA\nNIPS DE CACAO, LICORADO');
  assert.equal(soare.name,'CASTILLO NATURAL');
  assert.equal(soare.farm,'EL BOHÍO');
  assert.equal(soare.altitude,'1750');
  assert.equal(soare.municipality,'MISTRATÓ');
  assert.equal(soare.region,'Risaralda');
  const unlabeledLocation=proposeLabelData('Acevedo, Huila\nColombia');
  assert.equal(unlabeledLocation.municipality,'Acevedo');
  assert.equal(unlabeledLocation.region,'Huila');
  assert.equal(unlabeledLocation.country,'Colombia');
});

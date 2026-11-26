const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ExcelJS = require('exceljs');

for (const file of ['campos', 'validacao', 'storage', 'exportacao']) require(`../js/${file}.js`);
const app = globalThis.Veiculos;
const root = join(__dirname, '..');
const officialHeaders = readFileSync(join(root, 'README_LEVANTAMENTO_TECNICO_VEICULOS.md'), 'utf8')
  .split('\n')
  .filter((line) => /^\| \d+ \|/.test(line))
  .map((line) => line.split('|')[2].trim());
const validVehicle = (fields = {}) => ({
  ...app.createVehicle(),
  idReferencia: '000012',
  marca: 'Marca',
  modelo: 'Modelo',
  versao: 'Versão',
  ...fields,
});

test('33 cabeçalhos na sequência literal do documento e do modelo Excel', async () => {
  assert.equal(officialHeaders.length, 33);
  assert.deepEqual(
    app.fieldDefinitions.map((field) => field.label),
    officialHeaders,
  );
  assert.equal(new Set(app.fieldDefinitions.map((field) => field.key)).size, 33);
  const model = new ExcelJS.Workbook();
  await model.xlsx.readFile(join(root, 'modelos_excel/VEICULO.xlsx'));
  const headerRow = model.worksheets[0].findRow(4);
  assert.deepEqual(headerRow.values.slice(1, 34), officialHeaders);
});

test('obrigatoriedade somente nos quatro identificadores, com validação de espaços', () => {
  const empty = app.createVehicle();
  assert.deepEqual(Object.keys(app.validateVehicle(empty)), [
    'idReferencia',
    'marca',
    'modelo',
    'versao',
  ]);
  assert.deepEqual(app.validateVehicle(validVehicle()), {});
  assert.ok(app.validateVehicle(validVehicle({ marca: '  ' })).marca);
  assert.ok(app.vehicleProgress(validVehicle()).incomplete);
});

test('decimais, inteiros, Sim/Não e pressão com unidade: válidos e inválidos', () => {
  const cases = [
    ['massaTotal', '0', true],
    ['massaTotal', '23,5', true],
    ['massaTotal', '23.5', true],
    ['massaTotal', '-1', false],
    ['massaTotal', '1.234,56', false],
    ['massaTotal', 'Infinity', false],
    ['massaTotal', 'NaN', false],
    ['massaTotal', '1e3', false],
    ['numeroMarchas', '12', true],
    ['numeroMarchas', '0', false],
    ['numeroMarchas', '2,5', false],
    ['numeroEixos', '-2', false],
    ['numeroEixos', '9007199254740992', false],
    ['temArrefecimento', 'Sim', true],
    ['temArrefecimento', 'Não', true],
    ['temArrefecimento', 'Talvez', false],
    ['pressaoFreio', '10,5 bar', true],
    ['pressaoFreio', '0 psi', true],
    ['pressaoFreio', '200 kPa', true],
    ['pressaoFreio', '1 kgf/cm²', true],
    ['pressaoFreio', '-3 bar', false],
    ['pressaoFreio', '10', false],
    ['pressaoFreio', 'texto', false],
  ];
  for (const [key, value, valid] of cases) {
    const vehicle = validVehicle({ [key]: value, temFreioCompressor: 'Sim' });
    assert.equal(
      !app.validateField(app.fieldsByKey[key], value, vehicle),
      valid,
      `${key}: ${value}`,
    );
  }
});

test('campos condicionais são apagados ao responder Não ou retirar a resposta', () => {
  for (const answer of ['Não', '']) {
    const vehicle = validVehicle({
      temArrefecimento: answer,
      temFreioCompressor: answer,
      descricaoArrefecimento: 'Antigo',
      descricaoVentilacao: 'Antigo',
      componentesArrefecimento: 'Antigo',
      localizacaoLinhaPP: 'Antigo',
      pressaoFreio: '10 bar',
    });
    app.clearInapplicable(vehicle);
    for (const field of app.fieldDefinitions.filter((item) => item.condition))
      assert.equal(vehicle[field.key], '');
    assert.equal(app.vehicleProgress(vehicle).total, 28);
  }
  assert.equal(
    app.vehicleProgress(validVehicle({ temArrefecimento: 'Sim', temFreioCompressor: 'Sim' })).total,
    33,
  );
});

test('pesquisa normaliza acentos e consulta ID, marca, modelo e fabricante', () => {
  const vehicles = [
    validVehicle({ fabricante: 'Indústria São José', marca: 'Caterpillar' }),
    validVehicle({ idReferencia: '0002', modelo: 'FH 540' }),
  ];
  for (const query of ['000012', 'CATERPILLAR', 'industria sao jose', 'modelo'])
    assert.equal(app.searchVehicles(vehicles, query).length, 1);
  assert.equal(app.searchVehicles(vehicles, 'fh 540')[0].idReferencia, '0002');
  assert.equal(app.searchVehicles(vehicles, 'inexistente').length, 0);
  assert.equal(app.searchVehicles(vehicles, '', 'pendentes').length, 2);
  assert.equal(app.searchVehicles(vehicles, '', 'completos').length, 0);
});

test('persistência recupera edição, veículo selecionado, etapa e aba', () => {
  const vehicle = validVehicle({ massaTotal: 'inválido', idReferencia: '000012' });
  const state = { vehicles: [vehicle], selectedUid: vehicle.uid, step: 3, tab: 'planilha' };
  const storage = {
    value: null,
    setItem(key, value) {
      this.value = value;
    },
    getItem() {
      return this.value;
    },
    removeItem() {
      this.value = null;
    },
  };
  assert.equal(app.persistState(state, storage), '');
  assert.deepEqual(app.loadState(storage).state, state);
  assert.equal(app.removeStoredState(storage), '');
  assert.equal(app.loadState(storage).state.vehicles.length, 0);
});

test('storage corrompido, versão desconhecida e falta de espaço não apagam conteúdo', (context) => {
  context.mock.method(console, 'error', () => {});
  for (const raw of [
    '{bad',
    JSON.stringify({ version: 99, vehicles: [] }),
    JSON.stringify({ version: 1, vehicles: [{ uid: 'a', marca: {} }] }),
  ]) {
    const storage = { getItem: () => raw };
    const loaded = app.loadState(storage);
    assert.ok(loaded.blocked);
    assert.equal(loaded.raw, raw);
    assert.ok(loaded.error);
  }
  const unavailable = {
    getItem() {
      throw Error('bloqueado');
    },
    setItem() {
      throw Error('quota');
    },
    removeItem() {
      throw Error('bloqueado');
    },
  };
  assert.ok(app.loadState(unavailable).error);
  assert.ok(app.persistState(app.emptyState(), unavailable));
  assert.ok(app.removeStoredState(unavailable));
});

test('XLSX real: reabertura, cabeçalhos, tipos, vazios, estilos, filtro e congelamento', async () => {
  const first = validVehicle({
    massaTotal: '23,5',
    massaCombinada: '0',
    capacidadeTanque: '600.25',
    numeroMarchas: '12',
    numeroEixos: '3',
    temArrefecimento: 'Não',
    descricaoArrefecimento: 'Não exportar',
    temFreioCompressor: 'Sim',
    pressaoFreio: '10,5 bar',
    fabricante: '=HYPERLINK("https://example.org")',
    descricaoEscapamento: '<script>alert(1)</script> & "texto"',
    controlesEmissoes: '+SUM(1,2)',
  });
  const second = validVehicle({
    idReferencia: '000013',
    marca: '@comando',
    fabricante: '-123texto',
  });
  const workbook = app.buildWorkbook([first, second], ExcelJS);
  const buffer = await workbook.xlsx.writeBuffer();
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(buffer);
  assert.equal(reopened.worksheets.length, 1);
  const sheet = reopened.getWorksheet('Veículos');
  assert.equal(sheet.rowCount, 3);
  assert.equal(sheet.columnCount, 33);
  assert.deepEqual(sheet.getRow(1).values.slice(1), officialHeaders);
  assert.equal(sheet.getCell('A2').value, '000012');
  assert.equal(sheet.getCell('A2').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('H2').value, 23.5);
  assert.equal(sheet.getCell('I2').value, 0);
  assert.equal(sheet.getCell('X2').value, 600.25);
  assert.equal(sheet.getCell('R2').value, 12);
  assert.equal(sheet.getCell('V2').value, 3);
  assert.equal(sheet.getCell('K2').value, null);
  assert.equal(sheet.getCell('P2').value, '10,5 bar');
  assert.equal(sheet.getCell('E2').value, first.fabricante);
  assert.equal(sheet.getCell('E2').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('AA2').value, first.descricaoEscapamento);
  assert.equal(sheet.getCell('AC2').value, '+SUM(1,2)');
  assert.equal(sheet.getCell('B3').value, '@comando');
  assert.equal(sheet.getCell('E3').value, '-123texto');
  assert.equal(sheet.getCell('A1').fill.fgColor.argb, 'FF17324D');
  assert.equal(sheet.getCell('A1').font.color.argb, 'FFFFFFFF');
  assert.ok(sheet.getCell('A1').font.bold);
  assert.ok(sheet.getCell('A1').alignment.wrapText);
  assert.equal(sheet.autoFilter, 'A1:AG1');
  assert.equal(sheet.views[0].state, 'frozen');
  assert.equal(sheet.views[0].ySplit, 1);
  assert.equal(sheet.views[0].xSplit, 1);
  assert.ok(sheet.getColumn(6).width >= 32);
});

test('exportação impede arquivo vazio, obrigatórios ausentes e números inválidos', () => {
  assert.throws(() => app.buildWorkbook([], ExcelJS));
  assert.throws(() => app.buildWorkbook([app.createVehicle()], ExcelJS));
  assert.throws(() => app.buildWorkbook([validVehicle({ massaTotal: '-1' })], ExcelJS));
  assert.throws(() => app.buildWorkbook([validVehicle()], null));
});

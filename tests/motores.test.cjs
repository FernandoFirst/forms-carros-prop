const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
for (const file of ['motor-campos', 'motor-dados', 'motor-arquivos', 'motor-exportacao'])
  require(`../js/${file}.js`);
const m = globalThis.Motores;
const record = (values = {}) => {
  const item = m.createRecord();
  Object.assign(item.values, { marcaMotor: 'TESTE', modeloMotor: 'DIESEL', ...values });
  return item;
};

test('motor diesel MAR1: campos condicionais, aninhamento e preservação do rascunho', () => {
  const item = record({
    importado: 'Sim',
    nomeImportador: 'Empresa',
    tipoAlimentacao: 'Outros',
    tipoAspiracao: 'Sobrealimentado',
    catalisador: 'Sim',
    quantidadeCatalisadores: '2',
  });
  for (const key of [
    'nomeImportador',
    'descOutrosTiposAlimentacao',
    'sobrealimentador',
    'catalisadoresIguais',
  ])
    assert.equal(m.applicable(m.byKey[key], item), true, key);
  item.values.importado = 'Não';
  item.values.catalisador = 'Não';
  assert.equal(m.applicable(m.byKey.nomeImportador, item), false);
  assert.equal(m.applicable(m.byKey.catalisadoresIguais, item), false);
  assert.equal(item.values.nomeImportador, 'Empresa');
  assert.equal(new Set(m.fields.map((f) => f.key)).size, m.fields.length);
  assert.ok(m.fields.length > 120);
});

test('valida limites do HTML, números locais, zero, códigos e relações entre temperaturas', () => {
  const item = record({
    numeroCilindros: '0',
    diametroCilindros: '123,45',
    rotacaoMarchaLenta: '0',
    temperaturaMinimaOleoLubrificante: '90',
    temperaturaMaximaOleoLubrificante: '80',
    creaEngenheiro: '000123',
  });
  assert.ok(m.fieldError(m.byKey.numeroCilindros, item));
  assert.equal(m.fieldError(m.byKey.diametroCilindros, item), '');
  assert.equal(m.fieldError(m.byKey.rotacaoMarchaLenta, item), '');
  assert.ok(
    m.issues(item, false).some((issue) => issue.key === 'temperaturaMaximaOleoLubrificante'),
  );
  for (const invalid of ['1234,5', '1.234,5', '1e2', '-1', '12.345', 'Infinity']) {
    item.values.diametroCilindros = invalid;
    assert.ok(m.fieldError(m.byKey.diametroCilindros, item), invalid);
  }
  item.values.marcaMotor = 'a'.repeat(21);
  assert.ok(m.fieldError(m.byKey.marcaMotor, item));
});

test('massas: diferença decimal exata, secundário opcional e entradas inconsistentes', () => {
  const item = record({
    gcPwMassaInicialFiltroPrincipal: '10,1234',
    gcPwMassaFinalFiltroPrincipal: '10,2235',
  });
  m.calculate(item);
  assert.equal(item.values.gcPwMassaFiltroPrincipal, '0.1001');
  assert.equal(item.values.gcPwMassaTotalMp, '0.1001');
  item.values.gcPwMassaInicialFiltroSecundario = '1';
  m.calculate(item);
  assert.equal(item.values.gcPwMassaTotalMp, '');
  assert.ok(m.issues(item, false).some((issue) => issue.key === 'gcPwMassaFinalFiltroSecundario'));
  item.values.gcPwMassaFinalFiltroSecundario = '1,0001';
  m.calculate(item);
  assert.equal(item.values.gcPwMassaTotalMp, '0.1002');
  item.values.gcPwMassaFinalFiltroPrincipal = '9';
  assert.ok(m.issues(item, false).some((issue) => issue.key === 'gcPwMassaFinalFiltroPrincipal'));
});

test('persistência valida o esquema e recalcula dados derivados sem aceitar campos desconhecidos', () => {
  const item = record({
    creaEngenheiro: '000123',
    gcPwMassaTotalMp: 'inventado',
    fase: 'ADULTERADO',
  });
  const decoded = m.decode(
    JSON.stringify({ version: 1, records: [item], selectedUid: item.uid, tab: 'emissao' }),
  );
  assert.equal(decoded.records[0].values.creaEngenheiro, '000123');
  assert.equal(decoded.records[0].values.gcPwMassaTotalMp, '');
  assert.equal(decoded.records[0].values.fase, 'MAR1');
  assert.equal(decoded.tab, 'emissao');
  assert.deepEqual(decoded.steps, { cadastro: 'identificacao', emissao: 'ensaio' });
  assert.throws(() => m.decode(JSON.stringify({ version: 2, records: [] })));
  assert.throws(() => m.decode(JSON.stringify({ version: 1, records: [item, item] })));
  item.values.modeloMotor = {};
  assert.throws(() => m.decode(JSON.stringify({ version: 1, records: [item] })));
  item.values = [];
  assert.throws(() => m.decode(JSON.stringify({ version: 1, records: [item] })));
});

test('etapas cobrem cada seção uma vez e retomam o rascunho antigo ou a posição salva', () => {
  const keys = m.steps.flatMap((step) => step.sections);
  assert.deepEqual([...keys].sort(), m.sections.map((section) => section.key).sort());
  assert.equal(new Set(keys).size, keys.length);
  for (const section of m.sections) assert.equal(m.stepForSection(section.key).tab, section.tab);
  const item = record({ idReferencia: '000012', diametroCilindros: '90,25' });
  const raw = {
    version: 1,
    records: [item],
    selectedUid: item.uid,
    tab: 'cadastro',
    steps: { cadastro: 'injecao', emissao: 'particulado' },
  };
  const decoded = m.decode(JSON.stringify(raw));
  assert.deepEqual(decoded.steps, raw.steps);
  assert.equal(decoded.records[0].values.diametroCilindros, '90,25');
  raw.steps = { cadastro: 'particulado', emissao: 'inexistente' };
  assert.deepEqual(m.decode(JSON.stringify(raw)).steps, m.initialSteps());
});

test('XLSX de motores reabre com vínculos, zeros à esquerda, unidades, números e texto seguro', async () => {
  const item = record({
    idReferencia: '000012',
    moduloInjecaoIgnicao: '=1+1',
    numeroCilindros: '4',
    diametroCilindros: '90,25',
    importado: 'Não',
    nomeImportador: 'NÃO EXPORTAR',
    creaEngenheiro: '000555',
  });
  item.fabricantes.push({ nome: '+Fábrica', endereco: 'Rua 1' });
  item.componentes.push({
    componente: 'Sensor',
    atuacao: 'Admissão',
    item: 'Temperatura',
    quantidade: '2',
    codigo: '00009',
    obd: 'Sim',
  });
  item.anexos.esquemaAdmissao = { id: 'pdf-id', name: 'desenho.pdf', size: 14 };
  const second = record({ idReferencia: '000012', modeloMotor: 'OUTRO' });
  const workbook = m.buildWorkbook([item, second], ExcelJS);
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.deepEqual(
    reopened.worksheets.map((s) => s.name),
    ['Motores', 'Pré-emissão', 'Fabricantes', 'Componentes', 'Anexos', 'Pendências'],
  );
  const sheet = reopened.getWorksheet('Motores');
  const column = (fragment) =>
    sheet
      .getRow(1)
      .values.findIndex((value) => typeof value === 'string' && value.startsWith(fragment));
  assert.equal(sheet.getCell(2, 2).value, '000012');
  assert.equal(sheet.getCell(2, column('Diâmetro dos cilindros')).value, 90.25);
  assert.equal(sheet.getCell(2, column('Marca, tipo, denominação')).value, '=1+1');
  assert.equal(sheet.getCell(2, column('Importador')).value, null);
  assert.equal(reopened.getWorksheet('Componentes').getCell(2, 9).value, '00009');
  assert.equal(reopened.getWorksheet('Fabricantes').getCell(2, 1).value, item.uid);
  assert.notEqual(sheet.getCell(2, 1).value, sheet.getCell(3, 1).value);
  assert.match(
    reopened.getWorksheet('Anexos').getCell(2, 9).value,
    /esquemaAdmissao\/desenho.pdf$/,
  );
  assert.ok(reopened.getWorksheet('Pendências').rowCount > 1);
  item.values.diametroCilindros = 'errado';
  assert.throws(() => m.buildWorkbook([item], ExcelJS));
});

test('PDFs e ZIP: tamanho, extensão, assinatura e recuperação byte a byte com nomes Unicode', async () => {
  const contents = '%PDF-1.4\nconteúdo teste\n%%EOF';
  const file = new File([contents], 'admissão.pdf', { type: 'application/pdf' });
  await m.checkPdf(file);
  await assert.rejects(m.checkPdf(new File(['não PDF'], 'falso.pdf')));
  await assert.rejects(m.checkPdf(new File([contents], 'documento.txt')));
  await assert.rejects(m.checkPdf(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf')));
  const zip = await m.zip([
    { name: 'motor-1/admissão.pdf', blob: file },
    { name: 'motor-2/admissão.pdf', blob: file },
  ]);
  const reopened = await JSZip.loadAsync(await zip.arrayBuffer(), { checkCRC32: true });
  assert.equal(await reopened.file('motor-1/admissão.pdf').async('string'), contents);
  assert.equal(await reopened.file('motor-2/admissão.pdf').async('string'), contents);
});

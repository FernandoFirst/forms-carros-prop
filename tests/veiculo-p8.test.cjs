const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
for (const file of [
  'campos',
  'validacao',
  'veiculo-p8-campos',
  'veiculo-p8-dados',
  'veiculo-p8-exportacao',
  'storage',
  'exportacao',
  'motor-campos',
  'motor-arquivos',
])
  require(`../js/${file}.js`);
const app = globalThis.Veiculos;
const p = app.p8;
const vehicle = () => ({
  ...app.createVehicle(),
  idReferencia: '0007',
  marca: 'MARCA',
  modelo: 'MODELO',
  versao: 'P8',
  p8: p.empty(),
});
const set = (record, key, value) => p.set(record, p.byKey[key], value);

test('ficha P8 cobre dados, documentos e ensaios sem alterar as 33 colunas originais', () => {
  assert.equal(app.fieldDefinitions.length, 33);
  assert.deepEqual(
    app.fieldDefinitions.map((field) => field.key).sort(),
    p.fields
      .filter((field) => field.base)
      .map((field) => field.key)
      .sort(),
  );
  assert.equal(new Set(p.fields.map((field) => field.key)).size, p.fields.length);
  assert.ok(p.fields.length > 200);
  assert.equal(new Set(p.steps.map((step) => step.key)).size, p.steps.length);
  for (const field of p.fields)
    assert.ok(
      p.steps.some((step) => step.key === field.step),
      field.key,
    );
  for (const key of [
    'numeroDePassageiros',
    'familiaIsc',
    'esquemaTransmissao',
    'categoriaVeiculo',
    'printOutEnsaioParado',
    'resultadoLVent',
    'descargaServicoPosicaoSeisResultadoR',
    'validacaoFinalEnsaioCompressorFreios',
    'creaEngenheiro',
  ])
    assert.ok(p.byKey[key], key);
  assert.equal(p.categories.length, 10);
  assert.deepEqual(
    p.lists.map((list) => list.key),
    ['versoes', 'componentes', 'resultadoAceleracao', 'resultadoVelocidadeConstante'],
  );
});

test('cadastro único recupera a etapa dos dois formulários anteriores e mantém descrições antigas acessíveis', () => {
  const legacy = { ...vehicle(), materialFibroso: 'Lã mineral no silenciador' };
  delete legacy.p8;
  const expected = ['identificacao', 'origem', 'configuracao', 'configuracao', 'escapamento'];
  for (const [step, key] of expected.entries()) {
    const restored = app.decodeState(
      JSON.stringify({
        version: 1,
        vehicles: [legacy],
        selectedUid: legacy.uid,
        step,
        tab: 'formulario',
      }),
    );
    assert.equal(p.initialStep(restored.vehicles[0], restored.step), key);
    assert.equal(restored.vehicles[0].materialFibroso, legacy.materialFibroso);
    assert.equal(restored.vehicles[0].uid, legacy.uid);
  }
  assert.equal(p.applicable(legacy, p.byKey.materialFibroso), true);
  assert.equal(p.value(legacy, p.byKey.materialFibrosoContatoGasesEscape), '');
  set(legacy, 'materialFibrosoContatoGasesEscape', 'Não');
  assert.equal(p.applicable(legacy, p.byKey.materialFibroso), false);
  assert.equal(legacy.materialFibroso, 'Lã mineral no silenciador');
  legacy.p8.step = 'compressorMedicoes';
  const restored = app.decodeState(
    JSON.stringify({ version: 1, vehicles: [legacy], selectedUid: legacy.uid, step: 2, tab: 'p8' }),
  );
  assert.equal(restored.tab, 'formulario');
  assert.equal(p.initialStep(restored.vehicles[0], restored.step), 'compressorMedicoes');
  assert.equal(app.emptyState().tab, 'formulario');
});

test('uma fonte de dados para a ficha P8, o formulário original e a planilha', () => {
  const record = vehicle();
  set(record, 'marca', 'OUTRA');
  assert.equal(record.marca, 'OUTRA');
  assert.equal(record.p8.values.marca, undefined);
  record.marca = 'PLANILHA';
  assert.equal(p.value(record, p.byKey.marca), 'PLANILHA');
  set(record, 'temArrefecimento', 'Sim');
  set(record, 'descricaoArrefecimento', 'Radiador');
  set(record, 'resultadoLVent', '70,15');
  assert.ok(p.applicable(record, p.byKey.resultadoLVent));
  set(record, 'temArrefecimento', 'Não');
  assert.equal(record.descricaoArrefecimento, '');
  assert.equal(record.p8.values.resultadoLVent, '70,15');
  assert.equal(p.applicable(record, p.byKey.resultadoLVent), false);
  assert.equal(
    p.issues(record).some((issue) => issue.key === 'resultadoLVent'),
    false,
  );
  set(record, 'temArrefecimento', 'Sim');
  assert.equal(p.value(record, p.byKey.resultadoLVent), '70,15');
});

test('importação, transmissão e compressor condicionam requisitos sem perder os detalhes novos', () => {
  const record = vehicle();
  for (const [parent, child, value] of [
    ['importadoVeiculo', 'paisVeiculo', 'China'],
    ['temFreioCompressor', 'numeroEnsaioCompressorFreios', '0002'],
    ['materialFibrosoContatoGasesEscape', 'esquemaMaterialFibroso', null],
  ]) {
    set(record, parent, 'Sim');
    assert.equal(p.applicable(record, p.byKey[child]), true);
    if (value) set(record, child, value);
    set(record, parent, 'Não');
    assert.equal(p.error(record, p.byKey[child]), '');
    if (value) assert.equal(p.value(record, p.byKey[child]), value);
  }
  set(record, 'tipoTransmissao', 'Automática');
  assert.ok(p.error(record, p.byKey.caracteristicasTransAutomatica));
  set(record, 'tipoTransmissao', 'Manual');
  assert.equal(p.error(record, p.byKey.caracteristicasTransAutomatica), '');
});

test('valida números locais, zero passageiros, datas, comprimento de textos e códigos', () => {
  const record = vehicle();
  for (const [key, value] of [
    ['numeroDePassageiros', '0'],
    ['pesoBrutoTotal', '23,125'],
    ['temperaturaAr', '-5,25'],
    ['umidadeRelativaAr', '100'],
    ['anoFabricacao', '2026'],
    ['chassi', '00000000000000001'],
    ['dataEnsaio', '2024-02-29'],
    ['creaEngenheiro', '0000123'],
  ]) {
    set(record, key, value);
    assert.equal(p.error(record, p.byKey[key]), '', key);
  }
  for (const [key, value] of [
    ['numeroDePassageiros', '-1'],
    ['pesoBrutoTotal', '1.234,5'],
    ['pesoBrutoTotal', '1e2'],
    ['pesoBrutoTotal', '23,1234'],
    ['umidadeRelativaAr', '100,01'],
    ['dataEnsaio', '2025-02-29'],
    ['chassi', 'ABC-123'],
    ['marca', 'A'.repeat(24)],
  ]) {
    set(record, key, value);
    assert.ok(p.error(record, p.byKey[key]), `${key}: ${value}`);
    assert.equal(p.value(record, p.byKey[key]), value);
  }
});

test('média é aritmética; resultados e validações oficiais permanecem declarados', () => {
  const record = vehicle();
  for (const [key, value] of [
    ['primeiraMedicao', '70,10'],
    ['segundaMedicao', '70,20'],
    ['terceiraMedicao', '70,30'],
  ])
    set(record, key, value);
  record.p8.values.mediaMedicoes = '999';
  assert.equal(p.value(record, p.byKey.mediaMedicoes), '70.2');
  assert.equal(p.value(record, p.byKey.resultadoFinalEnsaioParado), '');
  assert.equal(p.value(record, p.byKey.valorFiscalizacao), '');
  set(record, 'resultadoFinalEnsaioParado', '71,2');
  assert.equal(p.value(record, p.byKey.resultadoFinalEnsaioParado), '71,2');
  set(record, 'primeiraMedicao', 'inválido');
  assert.equal(p.value(record, p.byKey.mediaMedicoes), '');
});

test('rascunhos antigos permanecem válidos; complementos, versões e anexos sobrevivem à recarga', () => {
  const record = vehicle();
  record.p8.step = 'paradoResultados';
  set(record, 'creaEngenheiro', '0000123');
  record.p8.values.unknown = 'não aceitar';
  record.p8.values.mediaMedicoes = '999';
  record.p8.lists.versoes = [{ uid: 'extra', versao: 'V2' }];
  set(record, 'idVersaoVeiculo', 'extra');
  record.p8.attachments.esquemaTransmissao = { id: 'pdf1', name: 'transmissão.pdf', size: 20 };
  const restored = app.decodeState(
    JSON.stringify({ version: 1, vehicles: [record], selectedUid: record.uid, tab: 'p8', step: 0 }),
  );
  const copy = restored.vehicles[0];
  assert.equal(restored.tab, 'formulario');
  assert.equal(copy.p8.step, 'paradoResultados');
  assert.equal(copy.p8.values.creaEngenheiro, '0000123');
  assert.equal(copy.p8.values.unknown, undefined);
  assert.equal(copy.p8.values.mediaMedicoes, undefined);
  assert.equal(p.error(copy, p.byKey.idVersaoVeiculo), '');
  copy.p8.lists.versoes = [];
  assert.ok(p.error(copy, p.byKey.idVersaoVeiculo));
  assert.equal(copy.p8.attachments.esquemaTransmissao.name, 'transmissão.pdf');
  const legacy = { ...record };
  delete legacy.p8;
  assert.equal(
    app.decodeState(JSON.stringify({ version: 1, vehicles: [legacy] })).vehicles[0].p8,
    undefined,
  );
  assert.throws(() => p.decode({ ...p.empty(), version: 999 }));
  assert.throws(() =>
    p.decode({ ...p.empty(), lists: { componentes: [{ uid: '1' }, { uid: '1' }] } }),
  );
  assert.throws(() =>
    p.decode({
      ...p.empty(),
      attachments: { esquemaTransmissao: { id: 'pdf', name: 'arquivo.exe', size: 10 } },
    }),
  );
});

test('XLSX reabre preservando 33 colunas e relaciona versões, resultados, PDFs e pendências por uid', async () => {
  const record = vehicle();
  set(record, 'numeroDePassageiros', '0');
  set(record, 'creaEngenheiro', '0000123');
  set(record, 'resultadoFinalEnsaioAcelerado', '72,25');
  set(record, 'nomeEngenheiro', '=SUM(A1:A2)');
  set(record, 'resultadoLVent', '88'); // Inaplicável: não exportar.
  record.p8.lists.versoes = [{ uid: 'version2', versao: '0002' }];
  record.p8.attachments.esquemaTransmissao = { id: 'file1', name: '../transmissão.pdf', size: 20 };
  const workbook = app.buildWorkbook([record], ExcelJS);
  const copy = new ExcelJS.Workbook();
  await copy.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.deepEqual(
    copy.getWorksheet('Veículos').getRow(1).values.slice(1),
    app.fieldDefinitions.map((field) => field.label),
  );
  assert.equal(copy.getWorksheet('Veículos').columnCount, 33);
  assert.equal(copy.getWorksheet('Veículos').getCell('A2').value, '0007');
  const rows = (name) => copy.getWorksheet(name).getSheetValues().slice(2);
  const passengers = rows('Dados P8').find((row) => row[4] === 'Número de passageiros');
  assert.equal(passengers[5], 0);
  const result = rows('Pré-ruído').find((row) => row[4] === 'Resultado final do ensaio acelerado');
  assert.equal(result[5], 72.25);
  assert.equal(result[7], 'Transcrito do relatório técnico');
  assert.equal(
    rows('Pré-ruído').some((row) => row[4] === 'Lvent'),
    false,
  );
  assert.equal(rows('Responsável técnico').find((row) => row[4] === 'CREA')[5], '0000123');
  assert.equal(
    rows('Responsável técnico').find(
      (row) => row[4] === 'Nome do engenheiro técnico responsável',
    )[5],
    '=SUM(A1:A2)',
  );
  assert.equal(copy.getWorksheet('Versões').getCell('D2').value, '0002');
  assert.equal(copy.getWorksheet('Versões').getCell('A2').value, record.uid);
  const file = record.p8.attachments.esquemaTransmissao;
  assert.equal(
    copy.getWorksheet('Anexos P8').getCell('F2').value,
    p.filePath(record, p.byKey.esquemaTransmissao, file),
  );
  assert.ok(copy.getWorksheet('Pendências P8').rowCount > 1);
  const legacy = { ...record };
  delete legacy.p8;
  assert.equal(app.buildWorkbook([legacy], ExcelJS).worksheets.length, 1);
  record.p8.lists.componentes = [{ uid: 'c1', componente: 'Teste' }];
  assert.throws(() => app.buildWorkbook([record], ExcelJS), /itens incompletos/);
});

test('ficha completa valida todos os grupos e mantém resultados oficiais como texto informado', () => {
  const record = vehicle();
  for (const field of p.fields) {
    if (field.type === 'pdf') {
      record.p8.attachments[field.key] = { id: field.key, name: `${field.key}.pdf`, size: 20 };
      continue;
    }
    if (field.type === 'calculated') continue;
    const value =
      field.key === 'tipoTransmissao'
        ? 'Automática'
        : field.type === 'boolean'
          ? 'Sim'
          : field.type === 'select'
            ? field.choices[0]
            : field.type === 'version'
              ? record.uid
              : field.type === 'year'
                ? '2026'
                : field.type === 'date'
                  ? '2026-11-26'
                  : field.type === 'pressure'
                    ? '100 kPa'
                    : ['number', 'integer', 'decimal'].includes(field.type)
                      ? '1'
                      : field.vin
                        ? '00000000000000001'
                        : 'Informado';
    set(record, field.key, value);
  }
  for (const list of p.lists)
    record.p8.lists[list.key] = [
      {
        uid: list.key,
        ...Object.fromEntries(
          list.columns.map((column) => [column.key, column.type === 'number' ? '1' : 'Informado']),
        ),
      },
    ];
  assert.deepEqual(p.issues(record), []);
  const restored = app.decodeState(JSON.stringify({ version: 1, vehicles: [record] })).vehicles[0];
  assert.deepEqual(p.issues(restored), []);
  assert.equal(p.value(restored, p.byKey.mediaMedicoes), '1');
});

test('exportação verifica cada PDF aplicável e recusa ausência, tamanho divergente ou armazenamento bloqueado', async () => {
  const record = vehicle();
  const blob = new Blob(['%PDF-fixture']);
  record.p8.attachments.esquemaTransmissao = { id: 'file', name: 'arquivo.pdf', size: blob.size };
  record.p8.attachments.esquemaMaterialFibroso = {
    id: 'hidden',
    name: 'oculto.pdf',
    size: blob.size,
  };
  const calls = [];
  const entries = await p.attachmentEntries([record], {
    get: async (id) => {
      calls.push(id);
      return blob;
    },
  });
  assert.deepEqual(calls, ['file']);
  assert.equal(entries.length, 1);
  assert.equal(
    entries[0].name,
    p.filePath(record, p.byKey.esquemaTransmissao, record.p8.attachments.esquemaTransmissao),
  );
  await assert.rejects(
    () => p.attachmentEntries([record], { get: async () => undefined }),
    /Anexe-o novamente/,
  );
  await assert.rejects(
    () => p.attachmentEntries([record], { get: async () => new Blob(['curto']) }),
    /incompleto/,
  );
  await assert.rejects(
    () =>
      p.attachmentEntries([record], {
        get: async () => {
          throw new Error('bloqueado');
        },
      }),
    /Não foi possível acessar/,
  );
});

test('armazenamentos de PDF são isolados e ZIP mantém arquivos e caminhos sem alteração', async (context) => {
  context.mock.method(console, 'error', () => {});
  const m = globalThis.Motores;
  const one = m.createFileStore('teste-veiculos');
  const two = m.createFileStore('teste-motores');
  const file = new File(['%PDF-1.4\nfixture\n%%EOF'], 'teste.pdf');
  const result = await one.put(file);
  assert.equal(result.persistent, false); // IndexedDB indisponível no Node: fallback em memória.
  assert.equal(await one.get(result.metadata.id), file);
  await assert.rejects(() => two.get(result.metadata.id));
  const zip = await m.zip([{ name: 'veiculo/documento/teste.pdf', blob: file }]);
  const restored = await JSZip.loadAsync(await zip.arrayBuffer());
  assert.deepEqual(
    await restored.file('veiculo/documento/teste.pdf').async('uint8array'),
    new Uint8Array(await file.arrayBuffer()),
  );
  await assert.rejects(() => one.put(new File(['não é PDF'], 'teste.pdf')));
});

const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const ExcelJS = require('exceljs');
const { field, visit, start, identify, savedData } = require('./veiculos-helpers.cjs');
const storageKey = 'levantamento-tecnico-veiculos:v1';
const cell = (page, key, row = 0) =>
  page.locator('#sheet-body tr').nth(row).locator(`[data-key="${key}"]`);
async function action(page, name) {
  const menu = page.locator('.p8-actions-menu');
  if ((await menu.getAttribute('open')) === null) await menu.locator('summary').click();
  await menu.getByRole('button', { name, exact: true }).click();
}

test('cadastro único reúne dados, ensaios e documentos; sincroniza grade, condicionais e múltiplos veículos', async ({
  page,
}, info) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  await expect(page.locator('#workspace [role="tab"]')).toHaveCount(2);
  await expect(page.getByRole('tab', { name: /Ficha P8/ })).toHaveCount(0);
  await expect(page.locator('#panel-formulario form')).toHaveCount(1);
  await expect(page.locator('[data-p8-area]')).toHaveCount(4);
  await identify(page);
  await visit(page, 'origem');
  await field(page, 'fabricante').fill('Indústria São José');
  await field(page, 'enderecoFabricante').fill('Rua das Indústrias, 100 — Curitiba, PR, Brasil');
  await visit(page, 'configuracao');
  await field(page, 'massaTotal').fill('-1');
  await expect(field(page, 'massaTotal')).toHaveAttribute('aria-invalid', 'true');
  await field(page, 'massaTotal').fill('23,5');
  await field(page, 'temArrefecimento').selectOption('Sim');
  for (const [key, value] of [
    ['descricaoArrefecimento', 'Circuito fechado'],
    ['descricaoVentilacao', 'Ventilação mecânica'],
    ['componentesArrefecimento', 'Radiador, bomba'],
    ['localizacaoLinhaPP', 'Dianteira'],
  ])
    await field(page, key).fill(value);
  await field(page, 'temFreioCompressor').selectOption('Sim');
  await field(page, 'pressaoFreio').fill('-3 bar');
  await expect(field(page, 'pressaoFreio')).toHaveAttribute('aria-invalid', 'true');
  await field(page, 'pressaoFreio').fill('10,5 bar');
  await visit(page, 'transmissao');
  await field(page, 'numeroMarchas').fill('12');
  await field(page, 'numeroEixos').fill('3');
  await field(page, 'maisEixoTrator').selectOption('Sim');
  await visit(page, 'reservatorio');
  await field(page, 'capacidadeTanque').fill('600,25');
  await visit(page, 'escapamento');
  await field(page, 'descricaoEscapamento').fill('Catalisador e filtro de partículas');
  await visit(page, 'veiculoEnsaio');
  await field(page, 'anoFabricacao').fill('2026');
  await visit(page, 'nomeEngenheiro');
  await field(page, 'nomeEngenheiro').fill('Engenheiro de teste');
  await visit(page, 'revisao');
  await page.getByRole('button', { name: 'Salvar veículo', exact: true }).click();
  expect((await savedData(page)).vehicles[0].savedAt).toBeTruthy();
  await page.screenshot({ path: info.outputPath('cadastro-unificado.png'), fullPage: true });
  await page.locator('#tab-planilha').click();
  await expect(page.locator('#sheet-head th')).toHaveCount(33);
  await expect(cell(page, 'massaTotal')).toHaveValue('23,5');
  await cell(page, 'marca').fill('Volvo editada');
  await cell(page, 'massaCombinada').fill('74,5');
  await cell(page, 'numeroEixos').fill('0');
  await expect(cell(page, 'numeroEixos')).toHaveAttribute('aria-invalid', 'true');
  await cell(page, 'numeroEixos').fill('4');
  await cell(page, 'temArrefecimento').selectOption('Não');
  await expect(cell(page, 'descricaoArrefecimento')).toBeDisabled();
  await cell(page, 'temFreioCompressor').selectOption('Não');
  await expect(cell(page, 'pressaoFreio')).toBeDisabled();
  const first = (await savedData(page)).vehicles[0];
  for (const key of [
    'descricaoArrefecimento',
    'descricaoVentilacao',
    'componentesArrefecimento',
    'localizacaoLinhaPP',
    'pressaoFreio',
  ])
    expect(first[key]).toBe('');
  expect(first.p8.values.anoFabricacao).toBe('2026');
  await page.locator('#tab-formulario').click();
  await visit(page, 'identificacao');
  await expect(field(page, 'marca')).toHaveValue('Volvo editada');
  await visit(page, 'configuracao');
  await expect(field(page, 'massaCombinada')).toHaveValue('74,5');
  await expect(field(page, 'descricaoArrefecimento')).toHaveCount(0);
  await field(page, 'temArrefecimento').selectOption('Sim');
  await expect(field(page, 'descricaoArrefecimento')).toHaveValue('');
  await page.getByRole('button', { name: 'Novo veículo', exact: true }).first().click();
  await identify(page, '0002', 'Caterpillar', '320');
  await page.locator('#tab-planilha').click();
  await expect(page.locator('#sheet-body tr')).toHaveCount(2);
  await page.locator('#sheet-search').fill('industria sao jose');
  await expect(page.locator('#sheet-body tr')).toHaveCount(1);
  await expect(cell(page, 'idReferencia')).toHaveValue('0001');
  await page.locator('#sheet-search').fill('320');
  await expect(cell(page, 'idReferencia')).toHaveValue('0002');
  await page.locator('#sheet-search').fill('INEXISTENTE');
  await expect(page.locator('#sheet-empty-title')).toHaveText('Nenhum veículo encontrado.');
  await page.locator('#sheet-search').fill('');
  await page.locator('#sheet-filter').selectOption('completos');
  await expect(page.locator('#sheet-body tr')).toHaveCount(0);
  await page.locator('#sheet-filter').selectOption('pendentes');
  await expect(page.locator('#sheet-body tr')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('#tab-planilha')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#sheet-body tr')).toHaveCount(2);
  await page.locator('#tab-formulario').click();
  await page.locator('#mobile-vehicle-select').selectOption(first.uid);
  await visit(page, 'identificacao');
  await expect(field(page, 'idReferencia')).toHaveValue('0001');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('exportação inclui todos os veículos apesar do filtro e mantém números, códigos e texto seguro', async ({
  page,
}, info) => {
  await start(page);
  await identify(page);
  await visit(page, 'origem');
  await field(page, 'fabricante').fill('=HYPERLINK("https://example.org")');
  await visit(page, 'configuracao');
  await field(page, 'massaTotal').fill('23,5');
  await page.getByRole('button', { name: 'Novo veículo', exact: true }).first().click();
  await page.locator('#export-button').click();
  await expect(field(page, 'idReferencia')).toHaveAttribute('aria-invalid', 'true');
  await identify(page, '0002', 'Scania', 'R 500');
  await page.locator('#tab-planilha').click();
  await page.locator('#sheet-search').fill('Scania');
  await expect(page.locator('#sheet-body tr')).toHaveCount(1);
  const pending = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(
    /^levantamento_tecnico_veiculos_\d{4}-\d{2}-\d{2}\.xlsx$/,
  );
  const path = info.outputPath(download.suggestedFilename());
  await download.saveAs(path);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFile(path));
  const sheet = workbook.getWorksheet('Veículos');
  expect(sheet.rowCount).toBe(3);
  expect(sheet.columnCount).toBe(33);
  expect(sheet.getCell('A2').value).toBe('0001');
  expect(sheet.getCell('A3').value).toBe('0002');
  expect(sheet.getCell('H2').value).toBe(23.5);
  expect(sheet.getCell('E2').type).toBe(ExcelJS.ValueType.String);
  expect(sheet.getCell('E2').value).toBe('=HYPERLINK("https://example.org")');
  expect(sheet.views[0].ySplit).toBe(1);
  expect(workbook.getWorksheet('Pré-ruído')).toBeTruthy();
  expect(workbook.getWorksheet('Pendências P8')).toBeTruthy();
});

test('exclusão e limpeza no cadastro único exigem confirmação e persistem após recarga', async ({
  page,
}) => {
  await start(page);
  await identify(page);
  await action(page, 'Excluir este veículo');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await savedData(page)).vehicles).toHaveLength(1);
  await action(page, 'Excluir este veículo');
  await page.locator('#confirm-accept').click();
  await expect(
    page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await identify(page);
  await action(page, 'Limpar todos os veículos');
  await page.keyboard.press('Escape');
  expect((await savedData(page)).vehicles).toHaveLength(1);
  await action(page, 'Limpar todos os veículos');
  await page.locator('#confirm-accept').click();
  expect(await savedData(page)).toBeNull();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }),
  ).toBeVisible();
});

test('recupera os 33 campos antigos no formulário unificado e mantém edição inválida sem perda', async ({
  page,
}) => {
  await start(page);
  await identify(page);
  await visit(page, 'configuracao');
  await field(page, 'massaTotal').fill('valor inválido');
  await page.reload();
  await expect(field(page, 'massaTotal')).toHaveValue('valor inválido');
  await page.locator('#export-button').click();
  await expect(field(page, 'massaTotal')).toHaveAttribute('aria-invalid', 'true');
  const legacy = await page.evaluate(() => {
    const a = globalThis.Veiculos;
    const vehicle = a.createVehicle();
    for (const field of a.fieldDefinitions)
      vehicle[field.key] =
        field.type === 'boolean'
          ? 'Sim'
          : field.type === 'integer'
            ? '3'
            : field.type === 'decimal'
              ? '12,5'
              : field.type === 'pressure'
                ? '10 bar'
                : `Texto ${field.key}`;
    localStorage.setItem(
      a.STORAGE_KEY,
      JSON.stringify({
        version: 1,
        vehicles: [vehicle],
        selectedUid: vehicle.uid,
        step: 3,
        tab: 'formulario',
      }),
    );
    return vehicle;
  });
  await page.reload();
  await expect(field(page, 'massaTotal')).toHaveValue('12,5');
  await visit(page, 'materialFibroso');
  await expect(field(page, 'materialFibroso')).toHaveValue(legacy.materialFibroso);
  await page.locator('#tab-planilha').click();
  for (const [key, value] of Object.entries(legacy).filter(
    ([key]) => !['uid', 'savedAt'].includes(key),
  ))
    await expect(cell(page, key)).toHaveValue(value);
  await expect(page.locator('#stat-pending')).toHaveText('00');
  await page.locator('#sheet-filter').selectOption('completos');
  await expect(page.locator('#sheet-body tr')).toHaveCount(1);
  await expect(page.locator('#sheet-body [aria-invalid="true"]')).toHaveCount(0);
});

test('rascunho corrompido é preservado e não sobrescrito pelo cadastro único', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, '{conteudo-invalido'), storageKey);
  await page.reload();
  await expect(page.locator('#storage-warning')).toBeVisible();
  await expect(page.locator('#backup-button')).toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await identify(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(
    '{conteudo-invalido',
  );
});

test('cadastro e salvamento funcionam diretamente pelo index.html, sem rede externa', async ({
  page,
}) => {
  const requests = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await page.goto(pathToFileURL(join(__dirname, '../../index.html')).href);
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await identify(page);
  await visit(page, 'revisao');
  await page.getByRole('button', { name: 'Salvar veículo', exact: true }).click();
  expect((await savedData(page)).vehicles[0].savedAt).toBeTruthy();
  await page.reload();
  expect((await savedData(page)).vehicles[0].savedAt).toBeTruthy();
  const pending = page.waitForEvent('download');
  await page.locator('#export-button').click();
  expect(await (await pending).failure()).toBeNull();
  expect(requests).toEqual([]);
});

test('rascunho da antiga aba P8 abre no formulário com ensaios e anexos preservados', async ({
  page,
}) => {
  await page.goto('/');
  const uid = await page.evaluate(() => {
    const a = globalThis.Veiculos;
    const record = a.createVehicle();
    Object.assign(record, {
      idReferencia: '0009',
      marca: 'MARCA',
      modelo: 'MODELO',
      versao: 'V1',
      p8: a.p8.empty(),
    });
    record.p8.step = 'paradoResultados';
    record.p8.values.primeiraMedicao = '70,1';
    record.p8.attachments.esquemaTransmissao = {
      id: 'pdf-anterior',
      name: 'transmissao.pdf',
      size: 20,
    };
    localStorage.setItem(
      a.STORAGE_KEY,
      JSON.stringify({
        version: 1,
        vehicles: [record],
        selectedUid: record.uid,
        tab: 'p8',
        step: 0,
      }),
    );
    return record.uid;
  });
  await page.reload();
  await expect(page.locator('#workspace [role="tab"]')).toHaveCount(2);
  await expect(page.locator('#tab-formulario')).toHaveAttribute('aria-selected', 'true');
  await expect(field(page, 'primeiraMedicao')).toHaveValue('70,1');
  await field(page, 'segundaMedicao').fill('70,2');
  const state = await savedData(page);
  expect(state.tab).toBe('formulario');
  expect(state.vehicles[0].uid).toBe(uid);
  expect(state.vehicles[0].p8.attachments.esquemaTransmissao.id).toBe('pdf-anterior');
  await visit(page, 'identificacao');
  await expect(field(page, 'idReferencia')).toHaveValue('0009');
});

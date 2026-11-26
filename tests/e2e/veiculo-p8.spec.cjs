const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { readFile } = require('node:fs/promises');
const storageKey = 'levantamento-tecnico-veiculos:v1';
const { field, reveal, visit: step } = require('./veiculos-helpers.cjs');
async function start(page) {
  await page.goto('/');
  await page.locator('[data-action="new"]').first().click();
  for (const [key, value] of [
    ['idReferencia', '00017'],
    ['marca', 'MARCA'],
    ['modelo', 'MODELO'],
    ['versao', 'V1'],
  ])
    await field(page, key).fill(value);
}

test('P8: condições, dados compartilhados, listas, medições, recarga e navegação completa', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  await field(page, 'importadoVeiculo').selectOption('Sim');
  await step(page, 'origem');
  await field(page, 'paisVeiculo').fill('China');
  await field(page, 'fabricante').fill('Fabricante técnico');
  await step(page, 'configuracao');
  await field(page, 'numeroDePassageiros').fill('0');
  await field(page, 'temArrefecimento').selectOption('Sim');
  await field(page, 'descricaoArrefecimento').fill('Radiador');
  await field(page, 'temFreioCompressor').selectOption('Sim');
  await step(page, 'ventiladorLigado');
  await field(page, 'rotacaoMotorVentiladorLigadoPrimeiraMedicao').fill('1500');
  await step(page, 'paradoResultados');
  for (const [key, value] of [
    ['primeiraMedicao', '70,10'],
    ['segundaMedicao', '70,20'],
    ['terceiraMedicao', '70,30'],
  ])
    await field(page, key).fill(value);
  await expect(field(page, 'mediaMedicoes')).toHaveValue('70.2');
  await expect(field(page, 'resultadoFinalEnsaioParado')).toHaveValue('');
  await page.reload();
  await expect(page.locator('#tab-formulario')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#p8-step-select')).toHaveValue('paradoResultados');
  await expect(field(page, 'mediaMedicoes')).toHaveValue('70.2');
  await step(page, 'identificacao');
  await page.locator('.p8-complement > summary').filter({ hasText: 'Versões adicionais' }).click();
  await page.getByRole('button', { name: 'Adicionar versão', exact: true }).click();
  await page.locator('input[id^="p8-versoes-"]').fill('V2');
  await step(page, 'veiculoEnsaio');
  await field(page, 'idVersaoVeiculo').selectOption({ label: 'MARCA / MODELO / V2' });
  await step(page, 'componentes');
  await page.getByRole('button', { name: 'Adicionar componente', exact: true }).click();
  const values = ['Sensor', 'Escape', 'Temperatura', '1', '0002', 'Sim'];
  const controls = page.locator('.p8-row input');
  for (let index = 0; index < values.length; index++) await controls.nth(index).fill(values[index]);
  await page.locator('#tab-planilha').click();
  await expect(page.locator('#sheet-body input[data-key="fabricante"]')).toHaveValue(
    'Fabricante técnico',
  );
  await page.locator('#sheet-body input[data-key="marca"]').fill('GRADE');
  await step(page, 'identificacao');
  await expect(field(page, 'marca')).toHaveValue('GRADE');
  const keys = await page
    .locator('#p8-step-select option')
    .evaluateAll((options) => options.map((option) => option.value));
  for (const key of keys) {
    await step(page, key);
    await expect(page.locator('#panel-formulario h2')).toBeVisible();
  }
  await expect(page.locator('#panel-formulario')).toContainText('Revisão do cadastro');
  await step(page, 'configuracao');
  await field(page, 'temArrefecimento').selectOption('Não');
  await expect(page.locator('#p8-step-select option[value="ventiladorLigado"]')).toHaveCount(0);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(saved.vehicles[0].p8.values.rotacaoMotorVentiladorLigadoPrimeiraMedicao).toBe('1500');
  expect(saved.vehicles[0].p8.values.numeroDePassageiros).toBe('0');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('veiculo-p8.png'), fullPage: true });
});

test('P8: PDFs locais, Excel complementar e ZIP com caminhos correspondentes', async ({
  page,
}, testInfo) => {
  await start(page);
  await step(page, 'transmissao');
  const pdf = {
    name: 'transmissão.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nfixture\n%%EOF'),
  };
  await reveal(field(page, 'esquemaTransmissao'));
  await field(page, 'esquemaTransmissao').setInputFiles(pdf);
  await expect(page.locator('#panel-formulario .p8-file-name')).toHaveText(pdf.name);
  await page.reload();
  await expect(page.locator('#panel-formulario')).toContainText('guardado localmente');
  const xlsxEvent = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const xlsx = await xlsxEvent;
  const xlsxPath = testInfo.outputPath('p8.xlsx');
  await xlsx.saveAs(xlsxPath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  expect(workbook.getWorksheet('Veículos').columnCount).toBe(33);
  expect(workbook.getWorksheet('Pendências P8').rowCount).toBeGreaterThan(1);
  const path = workbook.getWorksheet('Anexos P8').getCell('F2').value;
  const zipEvent = page.waitForEvent('download');
  await page.locator('.p8-actions-menu > summary').click();
  await page.getByRole('button', { name: 'Baixar anexos dos veículos (.zip)' }).click();
  const zipDownload = await zipEvent;
  const zipPath = testInfo.outputPath('p8.zip');
  await zipDownload.saveAs(zipPath);
  const zip = await JSZip.loadAsync(await readFile(zipPath));
  expect(await zip.file(path).async('nodebuffer')).toEqual(pdf.buffer);
  await page.screenshot({ path: testInfo.outputPath('veiculo-p8-documentos.png'), fullPage: true });
});

test('P8: áreas, informações recolhidas, foco e troca de veículo mantêm o preenchimento', async ({
  page,
}, testInfo) => {
  await start(page);
  await expect(page.locator('.p8-area-button')).toHaveCount(4);
  await expect(page.locator('#vehicle-workspace .overview')).toBeHidden();
  await expect(page.locator('#vehicle-list')).toBeHidden();
  await expect(page.locator('#mobile-vehicle-select')).toBeVisible();
  await expect(field(page, 'configuracaoBaseVeiculo')).toBeHidden();
  await expect(
    page.locator('.p8-complement').filter({ hasText: 'Versões adicionais' }),
  ).not.toHaveAttribute('open');
  await field(page, 'marca').focus();
  await expect(
    field(page, 'marca')
      .locator('xpath=ancestor::*[contains(@class,"field")][1]')
      .locator('.p8-field-counter'),
  ).toBeVisible();
  await page.locator('#panel-formulario h2').click();
  await expect(
    field(page, 'marca')
      .locator('xpath=ancestor::*[contains(@class,"field")][1]')
      .locator('.p8-field-counter'),
  ).toBeHidden();
  await step(page, 'aceleradoLocal');
  await field(page, 'empresaPistaProvas').fill('Pista local');
  await expect(field(page, 'medidorNivelSonoro')).toBeHidden();
  await reveal(field(page, 'medidorNivelSonoro'));
  await field(page, 'medidorNivelSonoro').fill('Medidor A');
  await page.screenshot({ path: testInfo.outputPath('p8-minimalista.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('[data-p8-area="Pré-ruído"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(field(page, 'empresaPistaProvas')).toHaveValue('Pista local');
  await step(page, 'revisao');
  await expect(page.locator('.p8-review[open]')).toHaveCount(0);
  await page
    .locator('.p8-review')
    .filter({ hasText: 'Medidor de nível sonoro' })
    .first()
    .locator('summary')
    .click();
  const issue = page.locator('.p8-review[open] .p8-review-link').first();
  await issue.click();
  await expect(
    page.locator(
      '#panel-formulario [aria-invalid="true"]:focus, #panel-formulario input:focus, #panel-formulario select:focus',
    ),
  ).toBeVisible();
  const uid = await page.locator('#mobile-vehicle-select').inputValue();
  await page.locator('[data-action="new"]').first().click();
  await expect(page.locator('#tab-formulario')).toHaveAttribute('aria-selected', 'true');
  await field(page, 'idReferencia').fill('00018');
  await page.locator('#mobile-vehicle-select').selectOption(uid);
  await expect(page.locator('#tab-formulario')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.p8-footer [data-p8-save-status]')).toContainText('Rascunho salvo');
});

test('P8 abre diretamente por file sem serviços externos', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  await page.goto(pathToFileURL(join(__dirname, '../../index.html')).href);
  await page.locator('[data-action="new"]').first().click();
  await expect(field(page, 'marca')).toBeVisible();
  expect(external).toEqual([]);
});

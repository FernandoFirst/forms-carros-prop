const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const key = 'levantamento-tecnico-motores:v1';
const pdf = {
  name: 'admissão.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\nfixture\n%%EOF'),
};
const field = (page, name) => page.locator(`#motor-${name}`);
const data = (page) =>
  page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key);
async function visitStep(page, step) {
  const tab = page.locator(`#motor-tab-${step.tab}`);
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  const select = page.locator(`#motor-step-select-${step.tab}`);
  if (await select.isVisible()) await select.selectOption(step.key);
  else await page.locator(`#motor-step-${step.key}`).click();
}
async function visit(page, name) {
  const step = await page.evaluate((keyName) => {
    const m = globalThis.Motores;
    return m.stepForSection(m.byKey[keyName]?.section || keyName.split('-')[0]);
  }, name);
  await visitStep(page, step);
}
async function reveal(page, name) {
  await visit(page, name);
  // Os documentos e referências extras ficam em disclosures nativos.
  const ancestors = await field(page, name).locator('xpath=ancestor::details').all();
  for (const ancestor of ancestors) {
    if ((await ancestor.getAttribute('open')) === null)
      await ancestor.locator('summary').first().click();
  }
}
async function start(page) {
  await page.goto('/');
  await page.locator('#domain-motores').click();
  await page.locator('#motor-new').click();
  await field(page, 'marcaMotor').fill('Marca');
  await field(page, 'modeloMotor').fill('Diesel');
}
async function attach(page, name, file = pdf) {
  await reveal(page, name);
  await field(page, name).setInputFiles(file);
  await expect(page.locator(`#motor-${name}-files`)).toContainText(file.name);
  await expect(page.locator('#motor-workspace')).toHaveAttribute('aria-busy', 'false');
}

test('etapas mostram um grupo por vez, preservam dados ao voltar e retomam a posição após recarga', async ({
  page,
}, info) => {
  await start(page);
  await expect(page.locator('#motor-panel-cadastro .motor-stage:visible')).toHaveCount(1);
  await expect(field(page, 'numeroCilindros')).toBeHidden();
  await expect(field(page, 'configuracaoBaseMotor')).toBeHidden();
  await page.locator('#motor-next').click();
  await expect(field(page, 'numeroCilindros')).toBeVisible();
  await field(page, 'numeroCilindros').fill('4');
  await expect(field(page, 'desenhoCamaraCombustao')).toBeHidden();
  await expect(page.locator('#motor-documents-status-configuracao')).toContainText('pendente');
  await page.locator('#motor-next').click();
  await expect(field(page, 'rotacaoMarchaLenta')).toBeVisible();
  await page.locator('#motor-back').click();
  await expect(field(page, 'numeroCilindros')).toHaveValue('4');
  await page.reload();
  await expect(field(page, 'numeroCilindros')).toHaveValue('4');
  await expect(page.locator('#motor-stage-status')).toContainText('Etapa 2 de 7');
  await expect(page.locator('#motor-panel-cadastro .motor-stage:visible')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('motor-etapas.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#motor-tab-revisao').click();
  await page.getByRole('button', { name: 'Continuar pela primeira pendência' }).click();
  await expect(field(page, 'importado')).toBeFocused();
  await expect(page.locator('#motor-stage-identificacao')).toBeVisible();
});

test('motor e veículos coexistem; condicionais, listas, múltiplos motores e rascunho sobrevivem à recarga', async ({
  page,
}, info) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await page.locator('#field-idReferencia').fill('0007');
  await page.locator('#domain-motores').click();
  await page.locator('#motor-new').click();
  await field(page, 'marcaMotor').fill('Marca');
  await field(page, 'modeloMotor').fill('D4');
  await field(page, 'importado').selectOption('Sim');
  await field(page, 'nomeImportador').fill('Empresa teste');
  await field(page, 'importado').selectOption('Não');
  await expect(field(page, 'nomeImportador')).toBeHidden();
  await field(page, 'importado').selectOption('Sim');
  await expect(field(page, 'nomeImportador')).toHaveValue('Empresa teste');
  for (const [trigger, value, dependent] of [
    ['tipoAspiracao', 'Sobrealimentado', 'sobrealimentador'],
    ['tipoAlimentacao', 'Outros', 'descOutrosTiposAlimentacao'],
    ['bombaTransferencia', 'Sim', 'localizacaoBomba'],
    ['possuiSistemaVariacaoGeometriaIgnicao', 'Sim', 'geometriaAdmissao'],
    ['filtroParticulas', 'Sim', 'descricaoFiltroParticulasMotor'],
    ['catalisador', 'Sim', 'quantidadeCatalisadores'],
  ]) {
    await visit(page, trigger);
    await expect(field(page, dependent)).toBeHidden();
    await field(page, trigger).selectOption(value);
    await expect(field(page, dependent)).toBeVisible();
  }
  await field(page, 'quantidadeCatalisadores').fill('2');
  await expect(field(page, 'catalisadoresIguais')).toBeVisible();
  await field(page, 'catalisador').selectOption('Não');
  await expect(field(page, 'catalisadoresIguais')).toBeHidden();
  await visit(page, 'fabricantes');
  await page.getByRole('button', { name: 'Adicionar fabricante', exact: true }).click();
  await field(page, 'fabricantes-0-nome').fill('Fábrica A');
  await field(page, 'fabricantes-0-endereco').fill('Rua 1');
  await page.getByRole('button', { name: 'Adicionar fabricante', exact: true }).click();
  await field(page, 'fabricantes-1-nome').fill('Fábrica B');
  await field(page, 'fabricantes-1-endereco').fill('Rua 2');
  await visit(page, 'componentes');
  await page.getByRole('button', { name: 'Adicionar componente', exact: true }).click();
  await field(page, 'componentes-0-codigo').fill('00001');
  const firstUid = (await data(page)).selectedUid;
  await page.locator('#motor-new').click();
  await field(page, 'marcaMotor').fill('Segunda');
  await page.locator('#motor-select').selectOption(firstUid);
  await expect(field(page, 'modeloMotor')).toHaveValue('D4');
  await page.locator('#motor-save').click();
  await expect(page.locator('#motor-message')).toContainText('Rascunho salvo');
  await page.reload();
  await expect(page.locator('#motor-workspace')).toBeVisible();
  await visit(page, 'componentes');
  await expect(field(page, 'componentes-0-codigo')).toHaveValue('00001');
  await visit(page, 'fabricantes');
  await expect(field(page, 'fabricantes-1-nome')).toHaveValue('Fábrica B');
  await page.screenshot({ path: info.outputPath('motor-cadastro.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#domain-veiculos').click();
  await expect(page.locator('#field-idReferencia')).toHaveValue('0007');
  await page.getByRole('tab', { name: 'Visualizar Planilha' }).click();
  await expect(page.locator('#sheet-head th')).toHaveCount(33);
  expect(errors).toEqual([]);
});

test('PDF persiste, ZIP preserva o arquivo e XLSX contém os vínculos e pendências', async ({
  page,
}) => {
  await start(page);
  await field(page, 'idReferencia').fill('000012');
  await attach(page, 'esquemaAdmissao');
  await field(page, 'esquemaAdmissao').setInputFiles({
    name: 'falso.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('não PDF'),
  });
  await expect(page.locator('#motor-message')).toContainText('cabeçalho PDF válido');
  await expect(page.locator('#motor-esquemaAdmissao-files')).toContainText('admissão.pdf');
  await page.reload();
  await expect(page.locator('#motor-esquemaAdmissao-files')).toContainText('admissão.pdf');
  let downloadPromise = page.waitForEvent('download');
  await page.locator('#motor-zip').click();
  let download = await downloadPromise;
  const zip = await JSZip.loadAsync(await readFile(await download.path()), { checkCRC32: true });
  const paths = Object.keys(zip.files).filter((name) => name.endsWith('.pdf'));
  expect(paths).toHaveLength(1);
  expect(await zip.file(paths[0]).async('nodebuffer')).toEqual(pdf.buffer);
  downloadPromise = page.waitForEvent('download');
  await page.locator('#motor-export').click();
  download = await downloadPromise;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFile(await download.path()));
  expect(workbook.getWorksheet('Motores').getCell(2, 2).value).toBe('000012');
  expect(workbook.getWorksheet('Anexos').getCell(2, 9).value).toBe(paths[0]);
  expect(workbook.getWorksheet('Pendências').rowCount).toBeGreaterThan(1);
  await page.locator('#motor-delete').click();
  await page.locator('#motor-confirm-dialog button[value="cancel"]').click();
  expect((await data(page)).records).toHaveLength(1);
  await page.locator('#motor-delete').click();
  await page.locator('#motor-confirm-dialog button[value="confirm"]').click();
  await expect(page.locator('#motor-empty')).toBeVisible();
});

test('pré-emissão calcula as massas e revisão leva ao campo com erro', async ({ page }) => {
  await start(page);
  await page.locator('#motor-tab-cadastro').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#motor-tab-emissao')).toBeFocused();
  await field(page, 'gcMeNumeroMotor').fill('000000001');
  await visit(page, 'gcPwMassaInicialFiltroPrincipal');
  await field(page, 'gcPwMassaInicialFiltroPrincipal').fill('10,1234');
  await field(page, 'gcPwMassaFinalFiltroPrincipal').fill('10,2235');
  await expect(field(page, 'gcPwMassaTotalMp')).toHaveValue('0.1001');
  await field(page, 'gcPwMassaFinalFiltroPrincipal').fill('9');
  await field(page, 'gcPwMassaFinalFiltroPrincipal').blur();
  await expect(field(page, 'gcPwMassaFinalFiltroPrincipal')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.locator('#motor-tab-revisao').click();
  await page
    .locator('.motor-pending-group')
    .filter({ hasText: 'A massa final não pode' })
    .locator('summary')
    .click();
  await page.locator('.motor-pending button').filter({ hasText: 'A massa final não pode' }).click();
  await expect(field(page, 'gcPwMassaFinalFiltroPrincipal')).toBeFocused();
  await field(page, 'gcPwMassaFinalFiltroPrincipal').fill('11');
  await page.reload();
  await visit(page, 'gcMeNumeroMotor');
  await expect(field(page, 'gcMeNumeroMotor')).toHaveValue('000000001');
  await visit(page, 'gcPwMassaTotalMp');
  await expect(field(page, 'gcPwMassaTotalMp')).toHaveValue('0.8766');
});

test('cadastro completo percorre todos os requisitos, salva conferido e exporta sem pendências', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  const definitions = await page.evaluate(() => globalThis.Motores.fields);
  const steps = await page.evaluate(() => globalThis.Motores.steps);
  for (const step of steps) {
    await visitStep(page, step);
    for (const f of definitions.filter(
      (item) => item.required && step.sections.includes(item.section),
    )) {
      const control = field(page, f.key);
      if (
        !(await page.evaluate((name) => {
          const m = globalThis.Motores;
          const state = JSON.parse(localStorage.getItem(m.STORAGE_KEY));
          return m.applicable(
            m.byKey[name],
            state.records.find((record) => record.uid === state.selectedUid),
          );
        }, f.key))
      )
        continue;
      if (f.type === 'pdf') await attach(page, f.key);
      else if (f.type === 'select')
        await control.selectOption(f.choices.includes('Não') ? 'Não' : f.choices[0]);
      else if (f.type === 'date') await control.fill('2026-11-25');
      else if (f.type === 'year') await control.fill('2026');
      else if (f.type === 'number')
        await control.fill(f.key.startsWith('gcPwMassaFinal') ? '2' : '1');
      else await control.fill(f.key === 'creaEngenheiro' ? '000123' : 'Teste');
    }
    for (const collection of ['fabricantes', 'componentes'].filter((keyName) =>
      step.sections.includes(keyName),
    )) {
      await page
        .getByRole('button', {
          name: collection === 'fabricantes' ? 'Adicionar fabricante' : 'Adicionar componente',
          exact: true,
        })
        .click();
      const fields = await page.evaluate(
        (name) => globalThis.Motores.collections[name].fields,
        collection,
      );
      for (const [name, , type] of fields) {
        if (type === 'select') await field(page, `${collection}-0-${name}`).selectOption('Não');
        else await field(page, `${collection}-0-${name}`).fill(type === 'integer' ? '1' : 'Teste');
      }
    }
  }
  await page.locator('#motor-save').click();
  await expect(page.locator('#motor-message')).toContainText('Motor conferido');
  await page.locator('#motor-tab-revisao').click();
  await expect(page.locator('#motor-panel-revisao')).toContainText(
    'Todos os requisitos foram preenchidos',
  );
  await page.screenshot({ path: info.outputPath('motor-revisao.png') });
  const pending = page.waitForEvent('download');
  await page.locator('#motor-export').click();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFile(await (await pending).path()));
  expect(workbook.getWorksheet('Pendências').rowCount).toBe(1);
  expect(workbook.getWorksheet('Anexos').rowCount).toBeGreaterThan(5);
});

test('conflito entre abas pausa o salvamento de motores e permite exportar a edição em memória', async ({
  page,
  context,
}) => {
  await start(page);
  const other = await context.newPage();
  await other.goto('/');
  await other.locator('#domain-motores').click();
  await field(other, 'modeloMotor').fill('Outra aba');
  await expect(page.locator('#motor-storage-status')).toContainText('não salvo');
  await field(page, 'modeloMotor').fill('Minha edição');
  expect((await data(page)).records[0].values.modeloMotor.toUpperCase()).toBe('OUTRA ABA');
  const pending = page.waitForEvent('download');
  await page.locator('#motor-export').click();
  expect(await (await pending).failure()).toBeNull();
});

test('file:// funciona sem requisições externas e dados corrompidos são preservados', async ({
  page,
}) => {
  await page.addInitScript((storageKey) => localStorage.setItem(storageKey, '{corrompido'), key);
  const external = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  await page.goto(pathToFileURL(join(__dirname, '../../index.html')).href);
  await page.locator('#domain-motores').click();
  await expect(page.locator('#motor-workspace')).toContainText('rascunho de motores');
  await page.locator('#motor-new').click();
  await field(page, 'marcaMotor').fill('Teste');
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
    '{corrompido',
  );
  expect(external).toEqual([]);
});

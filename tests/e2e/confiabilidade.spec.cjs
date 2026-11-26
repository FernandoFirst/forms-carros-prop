const { test, expect } = require('@playwright/test');

const storageKey = 'levantamento-tecnico-veiculos:v1';

test('corrigir um erro na grade também remove o erro no formulário', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await page.locator('#field-marca').focus();
  await page.locator('#field-modelo').focus();
  await expect(page.locator('#field-marca')).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('tab', { name: 'Visualizar Planilha' }).click();
  for (const key of ['idReferencia', 'marca', 'modelo', 'versao']) {
    await page.locator(`#sheet-body [data-key="${key}"]`).fill(`Valor ${key}`);
  }
  await page.getByRole('tab', { name: 'Formulário', exact: true }).click();
  await expect(page.locator('#field-marca')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#field-marca-error')).toBeHidden();
});

test('falha de escrita no localStorage informa a limitação e mantém a edição em memória', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await page.locator('#field-idReferencia').fill('0007');
  await page.locator('#field-marca').fill('Teste');
  await page.locator('#field-modelo').fill('Modelo');
  await page.locator('#field-versao').fill('V1');
  await expect(page.locator('#storage-warning')).toContainText('Não foi possível salvar');
  await expect(page.locator('#autosave-text')).toHaveText('Rascunho não salvo');
  await page.getByRole('tab', { name: 'Visualizar Planilha' }).click();
  await expect(page.locator('#sheet-body [data-key="idReferencia"]')).toHaveValue('0007');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-button').click();
  expect(await (await downloadPromise).failure()).toBeNull();
});

test('outra aba não pode sobrescrever silenciosamente a edição atual', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await page.locator('#field-idReferencia').fill('0001');
  const other = await context.newPage();
  await other.goto('/');
  await other.locator('#field-idReferencia').fill('0002');
  await expect(page.locator('#storage-warning')).toContainText('outra aba');
  await page.locator('#field-idReferencia').fill('0003');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).vehicles[0].idReferencia,
      storageKey,
    ),
  ).toBe('0002');
  await expect(page.locator('#field-idReferencia')).toHaveValue('0003');
  await page.reload();
  await expect(page.locator('#field-idReferencia')).toHaveValue('0002');
  await other.evaluate(() => localStorage.clear());
  await expect(page.locator('#storage-warning')).toContainText('outra aba');
});

test('entradas HTML são texto e a grade mantém a rolagem dentro do seu contêiner', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  const payload = '<img src=x onerror="window.injected=true">';
  await page.locator('#field-marca').fill(payload);
  await expect(page.locator('#mobile-vehicle-select option:checked')).toContainText(payload);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await page.getByRole('tab', { name: 'Visualizar Planilha' }).click();
  const sizes = await page.evaluate(() => ({
    pageFits: document.documentElement.scrollWidth <= innerWidth,
    sheetScrolls:
      document.getElementById('table-scroll').scrollWidth >
      document.getElementById('table-scroll').clientWidth,
  }));
  expect(sizes).toEqual({ pageFits: true, sheetScrolls: true });
});

test('navegação entre abas funciona por teclado e respeita redução de movimento', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#tab-formulario').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-planilha')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-planilha')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('#tab-formulario')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-formulario')).toBeFocused();
  await expect(page.locator('#workspace [role="tab"]')).toHaveCount(2);
});

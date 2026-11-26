const { expect } = require('@playwright/test');
const field = (page, key) => page.locator(`#field-${key}`);
async function reveal(locator) {
  const ancestors = await locator.locator('xpath=ancestor::details').all();
  for (const ancestor of ancestors.reverse())
    if ((await ancestor.getAttribute('open')) === null)
      await ancestor.locator('summary').first().click();
}
async function visit(page, key) {
  const target = await page.evaluate((value) => {
    const p = globalThis.Veiculos.p8;
    const step = p.steps.find((item) => item.key === (p.byKey[value]?.step || value));
    return value === 'revisao' ? { key: 'revisao', area: 'Revisão' } : step;
  }, key);
  const select = page.locator('#p8-step-select');
  if (await select.isVisible()) await select.selectOption(target.key);
  else {
    const area = page.locator(`[data-p8-area="${target.area}"]`);
    if ((await area.getAttribute('aria-pressed')) !== 'true') await area.click();
    if (target.key !== 'revisao') {
      const step = page.locator(`[data-p8-stage="${target.key}"]`);
      await reveal(step);
      await step.click();
    }
  }
  if (await field(page, key).count()) await reveal(field(page, key));
}
async function identify(page, id = '0001', marca = 'Volvo', modelo = 'FH 540') {
  await visit(page, 'identificacao');
  for (const [key, value] of [
    ['idReferencia', id],
    ['marca', marca],
    ['modelo', modelo],
    ['versao', '6×4 — 2026'],
  ])
    await field(page, key).fill(value);
}
async function start(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cadastrar primeiro veículo', exact: true }).click();
  await expect(page.locator('#tab-formulario')).toHaveAttribute('aria-selected', 'true');
}
const savedData = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem(globalThis.Veiculos.STORAGE_KEY)));
module.exports = { field, reveal, visit, identify, start, savedData };

(function () {
  'use strict';
  const app = globalThis.Veiculos;
  const byId = (id) => document.getElementById(id);
  const loaded = app.loadState();
  let state = loaded.state;
  let writesBlocked = loaded.blocked;
  let storageIssue = loaded.error;
  let originalBackup = loaded.raw;
  let toastTimer;
  let exporting = false;
  const selected = () => state.vehicles.find((vehicle) => vehicle.uid === state.selectedUid);

  app.mountIcons();

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    const toast = byId('toast');
    toast.replaceChildren(app.icon(isError ? 'info' : 'check'), app.el('span', {}, message));
    toast.classList.toggle('toast-error', isError);
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 6500);
  }

  function storageFeedback() {
    byId('storage-warning').hidden = !storageIssue;
    byId('storage-warning-text').textContent = storageIssue;
    byId('backup-button').hidden = !originalBackup || !writesBlocked;
    byId('autosave-text').textContent = storageIssue
      ? 'Rascunho não salvo'
      : state.vehicles.length
        ? 'Rascunho salvo'
        : 'Pronto para começar';
    byId('autosave-status').classList.toggle('unsaved', !!storageIssue);
    byId('persistence-note').textContent = storageIssue
      ? 'Rascunho apenas nesta sessão. Exporte o Excel antes de fechar.'
      : 'Rascunho salvo neste navegador. Exporte o Excel para manter uma cópia.';
    app.p8.updateSaveStatus?.();
  }

  function persist() {
    if (!writesBlocked) storageIssue = app.persistState(state);
    storageFeedback();
  }

  function renderFleet() {
    const total = state.vehicles.length;
    byId('fleet-count').textContent = total;
    byId('stat-total').textContent = String(total).padStart(2, '0');
    byId('stat-pending').textContent = String(
      state.vehicles.filter((vehicle) => app.vehicleProgress(vehicle).incomplete).length,
    ).padStart(2, '0');
    byId('export-button').disabled = !total || exporting;
    byId('export-button').setAttribute('aria-busy', exporting ? 'true' : 'false');
    byId('export-label').textContent = exporting ? 'Gerando Excel…' : 'Exportar Excel';
    byId('clear-button').disabled = !total && !originalBackup;
    byId('mobile-vehicle-select').replaceChildren(
      ...(total
        ? state.vehicles.map((vehicle) =>
            app.el(
              'option',
              { value: vehicle.uid },
              `${vehicle.idReferencia || 'Sem referência'} · ${app.vehicleTitle(vehicle)}`,
            ),
          )
        : [app.el('option', { value: '' }, 'Nenhum veículo')]),
    );
    byId('mobile-vehicle-select').value = state.selectedUid || '';
    byId('vehicle-list').replaceChildren(
      ...(total
        ? state.vehicles.map((vehicle, index) => {
            const progress = app.vehicleProgress(vehicle);
            const button = app.el(
              'button',
              {
                type: 'button',
                class: `vehicle-item ${state.selectedUid === vehicle.uid ? 'selected' : ''}`,
                'aria-pressed': state.selectedUid === vehicle.uid ? 'true' : 'false',
              },
              app.el(
                'span',
                { class: 'vehicle-item-top' },
                app.el(
                  'span',
                  { class: 'vehicle-reference' },
                  vehicle.idReferencia || `Veículo ${String(index + 1).padStart(2, '0')}`,
                ),
                app.el('span', {
                  class: `vehicle-dot ${progress.incomplete ? '' : 'complete'}`,
                  title: progress.incomplete
                    ? 'Informações pendentes'
                    : 'Todos os campos preenchidos',
                }),
              ),
              app.el('strong', {}, app.vehicleTitle(vehicle)),
              app.el(
                'span',
                { class: 'vehicle-version' },
                vehicle.versao || 'Versão não informada',
              ),
              app.el(
                'span',
                { class: 'vehicle-item-bottom' },
                vehicle.savedAt ? 'Salvo' : 'Rascunho',
                app.el('span', {}, `${progress.percent}%`),
              ),
              app.el(
                'span',
                { class: 'mini-progress', 'aria-hidden': 'true' },
                app.el('span', { style: `width:${progress.percent}%` }),
              ),
            );
            button.addEventListener('click', () => selectVehicle(vehicle.uid));
            return button;
          })
        : [
            app.el(
              'div',
              { class: 'fleet-empty' },
              app.icon('truck'),
              app.el('p', {}, 'Sua lista de veículos aparecerá aqui.'),
              app.el('span', {}, 'Adicione um veículo para começar.'),
            ),
          ]),
    );
  }

  function renderForm() {
    app.p8.render?.(selected());
  }

  function renderSheet() {
    app.renderSheet({
      vehicles: state.vehicles,
      query: byId('sheet-search').value,
      filter: byId('sheet-filter').value,
      onEdit: editSheet,
      onBlur: blurSheet,
    });
  }

  function renderTabs() {
    byId('vehicle-workspace').classList.toggle('vehicle-form-mode', state.tab === 'formulario');
    document.querySelector('#vehicle-workspace .overview').hidden = state.tab === 'formulario';
    for (const name of ['formulario', 'planilha']) {
      const active = state.tab === name;
      const button = byId(`tab-${name}`);
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      byId(`panel-${name}`).hidden = !active;
    }
  }

  function renderAll() {
    renderTabs();
    renderFleet();
    renderForm();
    if (state.tab === 'planilha') renderSheet();
    storageFeedback();
  }

  function setTab(tab) {
    state.tab = tab;
    renderTabs();
    if (tab === 'planilha') renderSheet();
    else if (tab === 'formulario') renderForm();
    persist();
  }

  function newVehicle() {
    const vehicle = app.createVehicle();
    vehicle.p8 = app.p8.empty();
    state.vehicles.push(vehicle);
    state.selectedUid = vehicle.uid;
    state.step = 0;
    state.tab = 'formulario';
    persist();
    renderAll();
    byId('field-idReferencia')?.focus();
  }

  function selectVehicle(uid) {
    state.selectedUid = uid;
    state.tab = 'formulario';
    state.step = 0;
    persist();
    renderAll();
  }

  function updateVehicle(vehicle, key, value) {
    vehicle[key] = value;
    vehicle.savedAt = null;
    app.clearInapplicable(vehicle);
    persist();
    renderFleet();
  }

  function editSheet(uid, key, value, conditionalChange = false) {
    const vehicle = state.vehicles.find((item) => item.uid === uid);
    updateVehicle(vehicle, key, value);
    app.updateSheetCell(vehicle, key);
    if (conditionalChange) app.updateSheetConditions(vehicle);
  }

  function blurSheet(uid, key) {
    const vehicle = state.vehicles.find((item) => item.uid === uid);
    if (vehicle) app.updateSheetCell(vehicle, key);
    // Não recriar a grade enquanto a pessoa está editando outra célula.
    setTimeout(() => {
      if (
        state.tab === 'planilha' &&
        !byId('sheet-body').contains(document.activeElement) &&
        (byId('sheet-search').value || byId('sheet-filter').value !== 'todos')
      )
        renderSheet();
    }, 0);
  }

  function showVehicleErrors(vehicle) {
    state.selectedUid = vehicle.uid;
    const errors = app.validateVehicle(vehicle);
    const first = app.fieldDefinitions.find((field) => errors[field.key]);
    app.p8.ensure(vehicle).step = app.p8.byKey[first.key].step;
    state.tab = 'formulario';
    persist();
    renderAll();
    app.p8.focusField?.(first.key);
  }

  function saveVehicle(event) {
    event?.preventDefault();
    const vehicle = selected();
    if (!vehicle) return;
    app.clearInapplicable(vehicle);
    if (Object.keys(app.validateVehicle(vehicle)).length) {
      showVehicleErrors(vehicle);
      showToast('Revise os campos indicados para salvar o veículo.', true);
      return;
    }
    if (app.p8.issues(vehicle, false).length) {
      app.p8.ensure(vehicle).step = 'revisao';
      renderForm();
      persist();
      showToast('Revise os formatos e os registros incompletos antes de salvar.', true);
      return;
    }
    vehicle.savedAt = new Date().toISOString();
    persist();
    renderAll();
    const total = state.vehicles.length;
    showToast(
      storageIssue
        ? 'Veículo mantido nesta sessão. Exporte o Excel para guardar uma cópia.'
        : `Veículo salvo. ${total} ${total === 1 ? 'veículo no levantamento' : 'veículos no levantamento'}.`,
    );
  }

  async function confirmAction(title, description, label) {
    const dialog = byId('confirm-dialog');
    if (dialog.open) return false;
    byId('confirm-title').textContent = title;
    byId('confirm-description').textContent = description;
    byId('confirm-accept').textContent = label;
    dialog.returnValue = 'cancel';
    dialog.showModal();
    return new Promise((resolve) =>
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {
        once: true,
      }),
    );
  }

  async function deleteVehicle() {
    const vehicle = selected();
    if (
      !vehicle ||
      !(await confirmAction(
        'Excluir este veículo?',
        `${app.vehicleTitle(vehicle)}${vehicle.idReferencia ? ` · ${vehicle.idReferencia}` : ''} será removido deste navegador. Essa ação não pode ser desfeita.`,
        'Excluir veículo',
      ))
    )
      return;
    const index = state.vehicles.indexOf(vehicle);
    state.vehicles.splice(index, 1);
    state.selectedUid = state.vehicles[Math.min(index, state.vehicles.length - 1)]?.uid || null;
    state.step = 0;
    persist();
    renderAll();
    showToast('Veículo excluído do levantamento.');
  }

  async function clearData() {
    if (
      !(await confirmAction(
        'Limpar todos os dados?',
        'Todos os veículos e rascunhos deste navegador serão apagados. Exporte o Excel antes de continuar se quiser guardar uma cópia. Essa ação não pode ser desfeita.',
        'Sim, limpar todos os dados',
      ))
    )
      return;
    const error = app.removeStoredState();
    if (error) {
      showToast(error, true);
      return;
    }
    state = app.emptyState();
    writesBlocked = false;
    storageIssue = '';
    originalBackup = null;
    byId('sheet-search').value = '';
    byId('sheet-filter').value = 'todos';
    byId('sheet-feedback').textContent = '';
    renderAll();
    showToast('Dados e rascunhos removidos deste navegador.');
  }

  async function exportExcel() {
    if (exporting || !state.vehicles.length) return;
    if (app.p8.busy) {
      showToast('Aguarde o armazenamento do PDF antes de exportar.', true);
      return;
    }
    const invalidP8 = state.vehicles.find(
      (vehicle) => vehicle.p8 && app.p8.issues(vehicle, false).length,
    );
    if (invalidP8) {
      state.selectedUid = invalidP8.uid;
      const issue = app.p8.issues(invalidP8, false)[0];
      invalidP8.p8.step = issue.step;
      setTab('formulario');
      renderFleet();
      app.p8.focusField?.(issue.key);
      showToast('Revise os formatos e os itens incompletos no cadastro do veículo.', true);
      return;
    }
    const invalid = state.vehicles.find(
      (vehicle) => Object.keys(app.validateVehicle(vehicle)).length,
    );
    if (invalid) {
      showVehicleErrors(invalid);
      showToast(
        'Antes de exportar, preencha os quatro campos obrigatórios de cada veículo e corrija os formatos indicados.',
        true,
      );
      return;
    }
    exporting = true;
    renderFleet();
    // A cópia é somente um retrato da exportação; não é um segundo estado de edição.
    const snapshot = structuredClone(state.vehicles);
    try {
      if (app.p8.verifyAttachments) {
        try {
          await app.p8.verifyAttachments(snapshot);
        } catch (error) {
          showToast(error.message, true);
          return;
        }
      }
      await app.exportVehicles(snapshot);
      showToast(
        `Excel gerado com ${snapshot.length} ${snapshot.length === 1 ? 'veículo' : 'veículos'} e os 33 cabeçalhos oficiais.`,
      );
    } catch (error) {
      console.error('Falha na exportação XLSX:', error);
      showToast(
        'Não foi possível gerar o Excel. Confira se a pasta vendor acompanha a aplicação e tente novamente. Seus dados continuam disponíveis.',
        true,
      );
    } finally {
      exporting = false;
      renderFleet();
    }
  }

  document
    .querySelectorAll('[data-action="new"]')
    .forEach((button) => button.addEventListener('click', newVehicle));
  byId('tab-formulario').addEventListener('click', () => setTab('formulario'));
  byId('tab-planilha').addEventListener('click', () => setTab('planilha'));
  document.querySelector('.tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['formulario', 'planilha'];
    const tab =
      event.key === 'Home'
        ? tabs[0]
        : event.key === 'End'
          ? 'planilha'
          : tabs[
              (tabs.indexOf(state.tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) %
                tabs.length
            ];
    setTab(tab);
    byId(`tab-${tab}`).focus();
  });
  byId('mobile-vehicle-select').addEventListener('change', (event) =>
    selectVehicle(event.target.value),
  );
  byId('clear-button').addEventListener('click', clearData);
  byId('export-button').addEventListener('click', exportExcel);
  byId('sheet-search').addEventListener('input', renderSheet);
  byId('sheet-filter').addEventListener('change', renderSheet);
  byId('backup-button').addEventListener('click', () =>
    app.downloadBlob(
      new Blob([originalBackup], { type: 'application/json' }),
      'rascunho-veiculos-recuperacao.json',
    ),
  );
  window.addEventListener('storage', (event) => {
    if (
      (event.key === app.STORAGE_KEY || event.key === null) &&
      (event.key === null || event.newValue !== event.oldValue)
    ) {
      writesBlocked = true;
      storageIssue =
        'Os dados foram alterados em outra aba. Exporte sua edição atual antes de recarregar esta página para ver a versão mais recente. O salvamento local foi pausado para evitar sobrescrever dados.';
      storageFeedback();
    }
  });
  app.vehicleSession = {
    selected,
    vehicles: () => state.vehicles,
    persist,
    confirm: confirmAction,
    notify: showToast,
    setTab,
    createVehicle: newVehicle,
    deleteVehicle,
    clearData,
    saveVehicle,
    legacyStep: () => state.step,
    changed(vehicle) {
      vehicle.savedAt = null;
      persist();
      renderFleet();
    },
  };
  renderAll();
})();

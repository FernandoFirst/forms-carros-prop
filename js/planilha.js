(function () {
  'use strict';
  const app = globalThis.Veiculos;
  const byId = (id) => document.getElementById(id);
  app.renderSheet = ({ vehicles, query, filter, onEdit, onBlur }) => {
    const matches = app.searchVehicles(vehicles, query, filter);
    byId('sheet-head').replaceChildren(
      app.el(
        'tr',
        {},
        app.fieldDefinitions.map((field, index) =>
          app.el(
            'th',
            { scope: 'col', title: field.label, class: index === 0 ? 'sticky-column' : '' },
            app.el(
              'span',
              { class: 'column-number', 'aria-hidden': 'true' },
              String(index + 1).padStart(2, '0'),
            ),
            field.label,
          ),
        ),
      ),
    );
    byId('sheet-body').replaceChildren(
      ...matches.map((vehicle, rowIndex) =>
        app.el(
          'tr',
          { 'data-uid': vehicle.uid },
          app.fieldDefinitions.map((field, columnIndex) => {
            const control = app.createControl(field, vehicle, {
              id: `cell-${rowIndex}-${field.key}`,
              grid: true,
            });
            const message = app.validateField(field, vehicle[field.key], vehicle);
            const error = app.el(
              'span',
              { class: 'cell-error', id: `${control.id}-error`, hidden: !message },
              message,
            );
            control.setAttribute('aria-describedby', error.id);
            control.setAttribute('aria-invalid', message ? 'true' : 'false');
            control.addEventListener('input', () => onEdit(vehicle.uid, field.key, control.value));
            control.addEventListener('blur', () => onBlur(vehicle.uid, field.key));
            if (field.type === 'boolean')
              control.addEventListener('change', () =>
                onEdit(vehicle.uid, field.key, control.value, true),
              );
            return app.el(
              'td',
              { class: columnIndex === 0 ? 'sticky-column' : '' },
              control,
              error,
            );
          }),
        ),
      ),
    );
    byId('sheet-empty').hidden = matches.length > 0;
    byId('table-scroll').hidden = matches.length === 0;
    byId('sheet-empty-title').textContent = vehicles.length
      ? 'Nenhum veículo encontrado.'
      : 'Ainda não há veículos por aqui.';
    byId('sheet-empty-description').textContent = vehicles.length
      ? 'Tente outra busca ou escolha “Todos os veículos” no filtro.'
      : 'Cadastre seu primeiro veículo para conferir os dados na planilha.';
    byId('sheet-empty-action').hidden = !!vehicles.length;
    byId('sheet-result-count').textContent =
      `${matches.length} de ${vehicles.length} ${vehicles.length === 1 ? 'veículo' : 'veículos'}`;
  };

  app.updateSheetCell = (vehicle, key) => {
    const control = [...byId('sheet-body').querySelectorAll('[data-key]')].find(
      (node) => node.dataset.uid === vehicle.uid && node.dataset.key === key,
    );
    if (!control) return;
    const field = app.fieldsByKey[key];
    const error = app.validateField(field, vehicle[key], vehicle);
    control.setAttribute('aria-invalid', error ? 'true' : 'false');
    const message = byId(`${control.id}-error`);
    message.textContent = error;
    message.hidden = !error;
    const feedback = byId('sheet-feedback');
    feedback.textContent = error
      ? `${field.short || field.label}: ${error}`
      : 'Alteração aplicada ao formulário e ao rascunho.';
    feedback.classList.toggle('has-error', !!error);
  };

  // Atualiza apenas dependências da linha: mantém foco e rolagem ao trocar Sim/Não.
  app.updateSheetConditions = (vehicle) => {
    for (const control of byId('sheet-body').querySelectorAll('[data-key]')) {
      if (control.dataset.uid !== vehicle.uid) continue;
      const field = app.fieldsByKey[control.dataset.key];
      if (field.condition) {
        control.disabled = !app.isApplicable(field, vehicle);
        control.value = vehicle[field.key];
        control.title = control.disabled
          ? 'Não se aplica: responda Sim à pergunta correspondente para habilitar.'
          : '';
        app.updateSheetCell(vehicle, field.key);
      }
    }
  };
})();

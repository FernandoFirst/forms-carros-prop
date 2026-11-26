(function () {
  'use strict';
  const app = globalThis.Veiculos;
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>',
    form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    truck:
      '<path d="M3 6h12v11H3zM15 10h4l3 4v3h-7M3 17H1M7 6V3h6"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M15 14h7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z"/>',
    arrowLeft: '<path d="m10 5-7 7 7 7M3 12h18"/>',
    arrowRight: '<path d="m14 5 7 7-7 7M3 12h18"/>',
    arrowLeftRight: '<path d="m7 3-4 4 4 4M3 7h18M17 13l4 4-4 4M3 17h18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V3h14l4 4v12a2 2 0 0 1-2 2ZM7 3v6h9V3M7 21v-8h10v8"/>',
    building: '<path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-3h4v3"/>',
    settings:
      '<path d="M4 7h16M4 17h16M8 3v8M16 13v8"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    systems:
      '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/><circle cx="12" cy="12" r="5"/>',
    leaf: '<path d="M20 3C9 2 2 7 5 15s16 7 15-12ZM4 21l11-11"/>',
  };
  app.el = (tag, attributes = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (value != null && value !== false)
        node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child != null && child !== false)
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  };
  app.icon = (name) => {
    const span = app.el('span', { class: 'icon', 'aria-hidden': 'true' });
    // O SVG vem exclusivamente desta lista estática, nunca dos dados do formulário.
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.form}</svg>`;
    return span;
  };
  app.mountIcons = (root = document) =>
    root
      .querySelectorAll('[data-icon]')
      .forEach((node) => node.replaceChildren(app.icon(node.dataset.icon)));
  app.vehicleTitle = (vehicle) =>
    [vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || 'Novo veículo';

  app.createControl = (field, vehicle, { id, grid = false } = {}) => {
    const attributes = {
      id,
      'data-key': field.key,
      'data-uid': vehicle.uid,
      'aria-required': field.required ? 'true' : null,
      maxlength: 32767,
      autocomplete: 'off',
    };
    let control;
    if (field.type === 'boolean') {
      control = app.el(
        'select',
        attributes,
        app.el('option', { value: '' }, grid ? '—' : 'Selecione uma resposta'),
        ['Sim', 'Não'].map((value) => app.el('option', { value }, value)),
      );
    } else if (field.type === 'long') {
      control = app.el('textarea', {
        ...attributes,
        rows: grid ? 2 : 3,
        placeholder: grid ? '—' : 'Descreva aqui',
      });
    } else {
      control = app.el('input', {
        ...attributes,
        type: 'text',
        inputmode:
          field.type === 'decimal' ? 'decimal' : field.type === 'integer' ? 'numeric' : null,
        placeholder: grid ? '—' : field.placeholder || 'Informe aqui',
      });
    }
    control.value = String(vehicle[field.key] ?? '');
    if (grid)
      control.setAttribute(
        'aria-label',
        `${field.label} — ${vehicle.idReferencia || 'veículo sem referência'}`,
      );
    if (!app.isApplicable(field, vehicle)) {
      control.disabled = true;
      control.setAttribute(
        'title',
        'Não se aplica: responda Sim à pergunta correspondente para habilitar.',
      );
    }
    return control;
  };
})();

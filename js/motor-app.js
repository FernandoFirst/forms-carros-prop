(function () {
  'use strict';
  const m = globalThis.Motores;
  const { el, icon, downloadBlob } = globalThis.Veiculos;
  const byId = (id) => document.getElementById(id);
  const root = byId('motor-workspace');
  const loaded = m.load();
  let state = loaded.state;
  let blocked = loaded.blocked;
  let storageError = loaded.error;
  let showErrors = false;
  let pendingOperations = 0;
  const touched = new Set();
  const controls = new Map();
  const wrappers = new Map();
  const transientFiles = new Set();
  const missingFiles = new Set();
  const stagePanels = new Map();
  const stepButtons = new Map();
  const stepSelects = new Map();
  const active = () => state.records.find((record) => record.uid === state.selectedUid);
  const button = (label, action, className = 'button button-outline', attributes = {}) => {
    const node = el('button', { type: 'button', class: className, ...attributes }, label);
    node.addEventListener('click', action);
    return node;
  };
  const message = el('div', {
    id: 'motor-message',
    class: 'banner motor-message',
    role: 'status',
    hidden: true,
  });
  const storageMessage = el('div', { class: 'banner banner-warning', role: 'alert', hidden: true });
  const status = el('p', { id: 'motor-storage-status', class: 'motor-status', role: 'status' });
  const selectRecord = el('select', { id: 'motor-select', class: 'motor-select' });
  const title = el('h2', { id: 'motor-title' });
  const progressText = el('span', { id: 'motor-progress-text' });
  const progress = el('progress', {
    max: 100,
    value: 0,
    'aria-label': 'Preenchimento obrigatório do motor',
  });
  const editor = el('div', { class: 'motor-body', id: 'motor-editor', hidden: true });
  const empty = el(
    'div',
    { class: 'empty-state', id: 'motor-empty' },
    icon('settings'),
    el('h2', {}, 'Os dados do motor, do cadastro ao ensaio.'),
    el(
      'p',
      {},
      'Cadastre motores diesel MAR1, reúna os PDFs e confira as pendências antes de exportar.',
    ),
    button('Cadastrar primeiro motor', create, 'button button-primary'),
  );
  const tabs = [
    ['cadastro', 'Dados do motor'],
    ['emissao', 'Ensaios e responsável'],
    ['revisao', 'Revisão'],
  ];
  const tablist = el('div', {
    class: 'motor-tabs',
    role: 'tablist',
    'aria-label': 'Etapas do motor',
  });
  for (const [key, label] of tabs)
    tablist.append(
      button(label, () => setTab(key), '', {
        id: `motor-tab-${key}`,
        role: 'tab',
        'aria-controls': `motor-panel-${key}`,
        'aria-selected': 'false',
        tabindex: -1,
      }),
    );
  tablist.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex(([key]) => key === state.tab);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next][0]);
    byId(`motor-tab-${state.tab}`).focus();
  });
  const panels = Object.fromEntries(
    tabs.map(([key]) => [
      key,
      el('div', {
        id: `motor-panel-${key}`,
        role: 'tabpanel',
        'aria-labelledby': `motor-tab-${key}`,
        hidden: true,
      }),
    ]),
  );
  const form = el(
    'form',
    { id: 'motor-form', novalidate: true },
    el(
      'p',
      { class: 'motor-heading-note' },
      'Preencha uma etapa por vez. Os campos com * são necessários para concluir a conferência; você pode continuar depois.',
    ),
    el(
      'p',
      { class: 'motor-heading-note' },
      'Seu rascunho é salvo automaticamente. Os documentos de cada etapa podem ser anexados depois.',
    ),
    Object.values(panels),
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });
  const newButton = button('Novo motor', create, 'button button-primary', { id: 'motor-new' });
  const exportButton = button('Exportar motores (.xlsx)', exportExcel, 'button button-dark', {
    id: 'motor-export',
  });
  const zipButton = button('Baixar anexos (.zip)', exportZip, 'button button-outline', {
    id: 'motor-zip',
  });
  const deleteButton = button('Excluir motor', removeRecord, 'button button-outline', {
    id: 'motor-delete',
  });
  const clearButton = button('Limpar motores', clearRecords, 'text-button', { id: 'motor-clear' });
  const saveButton = button('Salvar rascunho', save, 'button button-outline', { id: 'motor-save' });
  const backButton = button('Voltar', () => moveStep(-1), 'button button-outline', {
    id: 'motor-back',
  });
  const nextButton = button('Próximo', () => moveStep(1), 'button button-primary', {
    id: 'motor-next',
  });
  const stageStatus = el('span', { id: 'motor-stage-status', class: 'motor-stage-status' });
  const backupButton = button(
    'Baixar rascunho original',
    () =>
      downloadBlob(
        new Blob([loaded.raw], { type: 'application/json' }),
        'rascunho-motores-recuperacao.json',
      ),
    'text-button',
  );
  const confirmDialog = el('dialog', {
    id: 'motor-confirm-dialog',
    'aria-labelledby': 'motor-confirm-title',
    'aria-describedby': 'motor-confirm-description',
  });
  confirmDialog.append(
    el(
      'form',
      { method: 'dialog' },
      el('h2', { id: 'motor-confirm-title' }),
      el('p', { id: 'motor-confirm-description' }),
      el(
        'div',
        { class: 'dialog-actions' },
        el(
          'button',
          { class: 'button button-outline', value: 'cancel', autofocus: true },
          'Cancelar',
        ),
        el('button', { class: 'button button-danger', value: 'confirm' }, 'Confirmar'),
      ),
    ),
  );
  editor.append(
    el(
      'div',
      { class: 'motor-record-heading' },
      el('label', { for: 'motor-select' }, 'Motor em edição', selectRecord),
      title,
      deleteButton,
    ),
    el(
      'div',
      { class: 'motor-overall-progress' },
      el('div', {}, el('strong', {}, 'Preenchimento do motor'), progressText),
      progress,
    ),
    tablist,
    form,
    el(
      'footer',
      { class: 'motor-footer motor-navigation' },
      el('div', {}, backButton, stageStatus),
      el('div', { class: 'motor-actions' }, saveButton, nextButton),
    ),
  );
  root.append(
    el(
      'div',
      { class: 'motor-toolbar' },
      el(
        'div',
        {},
        el('h2', {}, 'Motores · MAR1'),
        el(
          'p',
          { class: 'motor-context' },
          'Diesel · Ignição por compressão · Máquinas agrícolas e rodoviárias',
        ),
      ),
      el('div', { class: 'motor-actions' }, newButton, exportButton, zipButton),
    ),
    storageMessage,
    status,
    message,
    empty,
    editor,
    el(
      'div',
      { class: 'motor-footer' },
      el('span', {}, 'Sem envio ao Infoserv. Este é um levantamento local para conferência.'),
      clearButton,
    ),
    confirmDialog,
  );

  function feedback(text, error = false) {
    message.textContent = text;
    message.className = `banner motor-message ${error ? 'banner-error' : ''}`;
    message.setAttribute('role', error ? 'alert' : 'status');
    message.hidden = !text;
  }
  function persist() {
    if (!blocked) {
      try {
        localStorage.setItem(m.STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
        storageError = '';
      } catch (error) {
        console.error('Falha ao salvar motores:', error);
        storageError =
          'Não foi possível salvar os motores neste navegador. Exporte o Excel e baixe os PDFs antes de fechar.';
      }
    }
    updateStatus();
    return !blocked && !storageError;
  }
  function updateStatus() {
    const fileWarning = transientFiles.size
      ? 'Há PDFs apenas nesta sessão. Baixe os anexos antes de fechar.'
      : missingFiles.size
        ? 'Há PDFs não encontrados neste navegador. Selecione os arquivos novamente.'
        : '';
    storageMessage.hidden = !storageError && !fileWarning;
    storageMessage.replaceChildren(
      el('span', {}, [storageError, fileWarning].filter(Boolean).join(' ')),
    );
    if (blocked && loaded.raw) storageMessage.append(backupButton);
    status.textContent = storageError
      ? 'Rascunho de motores não salvo neste navegador.'
      : transientFiles.size
        ? 'Dados salvos; alguns PDFs estão apenas nesta sessão.'
        : missingFiles.size
          ? 'Dados salvos; há anexos que precisam ser selecionados novamente.'
          : state.records.length
            ? 'Rascunho de motores salvo neste navegador.'
            : 'Pronto para cadastrar motores.';
  }
  function busy(change) {
    pendingOperations += change;
    for (const node of [
      newButton,
      deleteButton,
      selectRecord,
      clearButton,
      saveButton,
      nextButton,
      backButton,
    ])
      node.disabled = pendingOperations > 0;
    exportButton.disabled = zipButton.disabled = pendingOperations > 0 || !state.records.length;
    root.setAttribute('aria-busy', String(pendingOperations > 0));
    for (const [key, control] of controls) {
      if (m.byKey[key]?.type === 'pdf')
        control.disabled = pendingOperations > 0 || !m.applicable(m.byKey[key], active());
    }
    updateNavigation();
  }
  async function perform(action) {
    if (pendingOperations) return;
    busy(1);
    try {
      await action();
    } catch (error) {
      console.error('Falha na operação de motores:', error);
      feedback(error.message || 'Não foi possível concluir. Tente novamente.', true);
    } finally {
      busy(-1);
    }
  }
  async function confirm(titleText, description) {
    byId('motor-confirm-title').textContent = titleText;
    byId('motor-confirm-description').textContent = description;
    confirmDialog.returnValue = 'cancel';
    confirmDialog.showModal();
    return new Promise((resolve) =>
      confirmDialog.addEventListener(
        'close',
        () => resolve(confirmDialog.returnValue === 'confirm'),
        { once: true },
      ),
    );
  }
  function changed() {
    active().savedAt = null;
    m.calculate(active());
    persist();
    sync();
  }
  function create() {
    if (pendingOperations) return;
    const record = m.createRecord();
    state.records.push(record);
    state.selectedUid = record.uid;
    state.tab = 'cadastro';
    state.steps = m.initialSteps();
    showErrors = false;
    touched.clear();
    feedback('');
    persist();
    render();
    controls.get('marcaMotor')?.focus();
  }
  selectRecord.addEventListener('change', () => {
    state.selectedUid = selectRecord.value;
    showErrors = false;
    touched.clear();
    feedback('');
    persist();
    render();
  });
  function setTab(key) {
    state.tab = key;
    persist();
    for (const [name] of tabs) {
      const selected = name === key;
      byId(`motor-tab-${name}`).setAttribute('aria-selected', String(selected));
      byId(`motor-tab-${name}`).tabIndex = selected ? 0 : -1;
      panels[name].hidden = !selected;
    }
    displayStep();
    if (key === 'revisao') renderReview();
  }
  function selectedStep(tab = state.tab) {
    return m.steps.find((step) => step.tab === tab && step.key === state.steps[tab]);
  }
  function goStep(key, focus = true) {
    const step = m.steps.find((item) => item.key === key);
    state.steps[step.tab] = key;
    setTab(step.tab);
    sync();
    if (focus) byId(`motor-stage-heading-${key}`)?.focus({ preventScroll: true });
    if (focus) byId(`motor-stage-${key}`)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function displayStep() {
    for (const step of m.steps) {
      const selected = state.steps[step.tab] === step.key;
      const panel = stagePanels.get(step.key);
      if (panel) panel.hidden = !selected;
      const control = stepButtons.get(step.key);
      if (control) {
        control.setAttribute('aria-current', selected ? 'step' : 'false');
        control.classList.toggle('current', selected);
      }
    }
    for (const [tab, select] of stepSelects) select.value = state.steps[tab];
    updateNavigation();
  }
  function updateNavigation() {
    const step = selectedStep();
    const index = step ? m.steps.indexOf(step) : m.steps.length;
    backButton.disabled = pendingOperations > 0 || index === 0;
    nextButton.disabled = pendingOperations > 0;
    nextButton.textContent =
      state.tab === 'revisao'
        ? 'Conferir e salvar'
        : index === m.steps.length - 1
          ? 'Revisar dados'
          : m.steps[index + 1]?.tab !== state.tab
            ? 'Ir para ensaios'
            : 'Próximo';
    if (!step) {
      stageStatus.textContent = 'Revisão do levantamento';
      return;
    }
    const group = m.steps.filter((item) => item.tab === step.tab);
    const count = active()
      ? allIssues(active()).filter((issue) => step.sections.includes(issue.section)).length
      : 0;
    stageStatus.textContent = `Etapa ${group.indexOf(step) + 1} de ${group.length} · ${count ? `${count} pendência(s)` : 'Preenchida'}`;
  }
  function moveStep(direction) {
    if (!active() || pendingOperations) return;
    if (state.tab === 'revisao' && direction > 0) {
      save();
      return;
    }
    const step = selectedStep();
    const index = step ? m.steps.indexOf(step) : m.steps.length;
    if (direction > 0 && step) {
      // Exibir os erros da etapa visitada, preservando a navegação de rascunhos.
      for (const field of m.fields.filter((f) => step.sections.includes(f.section)))
        touched.add(field.key);
    }
    const next = m.steps[index + direction];
    if (next) goStep(next.key);
    else if (direction > 0) {
      setTab('revisao');
      byId('motor-tab-revisao').focus();
    }
  }
  function fieldNode(field) {
    const record = active();
    const id = `motor-${field.key}`;
    const attributes = {
      id,
      name: field.key,
      autocomplete: 'off',
      maxlength: field.maxLength,
      'aria-required': field.required ? 'true' : null,
      'aria-describedby': `${id}-help ${id}-error${field.unit ? ` ${id}-unit` : ''}`,
    };
    let control;
    if (field.type === 'select') {
      control = el(
        'select',
        attributes,
        el('option', { value: '' }, 'Selecione'),
        field.choices.map((value) => el('option', { value }, value)),
      );
    } else if (field.type === 'long') control = el('textarea', { ...attributes, rows: 3 });
    else if (field.type === 'pdf')
      control = el('input', { ...attributes, type: 'file', accept: '.pdf,application/pdf' });
    else
      control = el('input', {
        ...attributes,
        type: field.type === 'date' ? 'date' : 'text',
        inputmode: ['number', 'year'].includes(field.type)
          ? field.decimals
            ? 'decimal'
            : 'numeric'
          : null,
        readonly: ['fixed', 'calculated'].includes(field.type),
      });
    if (field.type !== 'pdf') control.value = record.values[field.key] || '';
    controls.set(field.key, control);
    const error = el('span', { id: `${id}-error`, class: 'field-error', hidden: true });
    const helper = el(
      'span',
      { id: `${id}-help`, class: 'field-help' },
      field.type === 'pdf'
        ? 'PDF · até 10 MB'
        : field.type === 'calculated'
          ? 'Calculado a partir das massas informadas.'
          : field.type === 'fixed'
            ? ''
            : field.type === 'long'
              ? `${control.value.length} / ${field.maxLength} caracteres`
              : '',
    );
    const wrapper = el(
      'div',
      {
        class: `field ${['long', 'pdf'].includes(field.type) ? 'field-wide' : ''} ${field.type === 'pdf' ? 'motor-upload' : ''} ${field.condition ? 'motor-dependent' : ''}`,
      },
      el(
        'label',
        { for: id },
        field.label,
        field.required
          ? el('span', { class: 'required-mark', 'aria-hidden': true }, ' *')
          : el('span', { class: 'motor-optional' }, 'Opcional'),
      ),
      field.unit
        ? el(
            'div',
            { class: 'motor-input-unit' },
            control,
            el('span', { id: `${id}-unit` }, field.unit),
          )
        : control,
      helper,
      error,
    );
    wrappers.set(field.key, wrapper);
    if (field.type === 'pdf') {
      const files = el('div', { id: `${id}-files` });
      wrapper.append(files);
      control.addEventListener('change', () => {
        const file = control.files[0];
        if (!file) return;
        perform(async () => {
          const previous = record.anexos[field.key];
          const result = await m.files.put(file);
          record.anexos[field.key] = result.metadata;
          if (!result.persistent) transientFiles.add(result.metadata.id);
          if (previous) {
            transientFiles.delete(previous.id);
            missingFiles.delete(previous.id);
          }
          changed();
          renderFile(field);
          // Só eliminar a versão antiga depois de persistir a nova referência.
          if (previous && !storageError && !blocked) await discardFile(previous.id);
          feedback(
            result.persistent
              ? 'PDF anexado e salvo neste navegador.'
              : 'PDF anexado apenas nesta sessão. Baixe os anexos antes de fechar.',
            !result.persistent,
          );
        }).finally(() => {
          control.value = '';
        });
      });
      renderFile(field);
    } else if (!['fixed', 'calculated'].includes(field.type)) {
      control.addEventListener(
        field.type === 'select' || field.type === 'date' ? 'change' : 'input',
        () => {
          record.values[field.key] = control.value;
          if (field.type === 'long')
            helper.textContent = `${control.value.length} / ${field.maxLength} caracteres`;
          changed();
        },
      );
      control.addEventListener('blur', () => {
        if (field.uppercase) {
          record.values[field.key] = control.value.trim().toUpperCase();
          control.value = record.values[field.key];
          persist();
        }
        touched.add(field.key);
        sync();
      });
    }
    return wrapper;
  }
  async function discardFile(id) {
    try {
      await m.files.remove(id);
    } catch (error) {
      console.error('Falha na limpeza do PDF antigo:', error);
      feedback(
        'Os dados foram atualizados, mas não foi possível liberar o espaço do PDF anterior.',
        true,
      );
    }
  }
  function renderFile(field) {
    const record = active();
    const target = byId(`motor-${field.key}-files`);
    if (!target) return;
    const metadata = record.anexos[field.key];
    target.replaceChildren();
    if (!metadata) return;
    target.append(
      el(
        'p',
        { class: 'motor-pdf-name' },
        `${metadata.name} · ${(metadata.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`,
        missingFiles.has(metadata.id) ? ' · Não encontrado' : '',
      ),
      el(
        'div',
        { class: 'motor-pdf-actions' },
        button(
          'Baixar PDF',
          () =>
            perform(async () => {
              const blob = await m.files.get(metadata.id);
              if (!blob) {
                missingFiles.add(metadata.id);
                sync();
                throw new Error('PDF não encontrado. Selecione o arquivo novamente.');
              }
              downloadBlob(blob, metadata.name);
            }),
          'text-button',
        ),
        button(
          'Remover PDF',
          async () => {
            if (pendingOperations || !(await confirm('Remover este PDF?', metadata.name))) return;
            delete record.anexos[field.key];
            transientFiles.delete(metadata.id);
            missingFiles.delete(metadata.id);
            changed();
            renderFile(field);
            if (!storageError && !blocked) await discardFile(metadata.id);
          },
          'text-button',
        ),
      ),
    );
  }
  function collectionNode(key) {
    const collection = m.collections[key];
    const host = el('div', { id: `motor-${key}`, class: 'motor-collection', tabindex: -1 });
    const paint = () => {
      const record = active();
      for (const name of controls.keys()) if (name.startsWith(`${key}-`)) controls.delete(name);
      host.replaceChildren();
      if (!record[key].length)
        host.append(el('p', { class: 'field-help' }, `Nenhum ${collection.singular} cadastrado.`));
      record[key].forEach((row, index) => {
        const fields = el('div', { class: 'form-fields' });
        for (const [name, label, type, limit] of collection.fields) {
          const id = `motor-${key}-${index}-${name}`;
          const attributes = {
            id,
            maxlength: type === 'text' ? limit : type === 'integer' ? 2 : null,
            'aria-required': 'true',
            'aria-describedby': `${id}-error`,
          };
          const control =
            type === 'select'
              ? el(
                  'select',
                  attributes,
                  el('option', { value: '' }, 'Selecione'),
                  limit.map((value) => el('option', { value }, value)),
                )
              : el('input', {
                  ...attributes,
                  type: 'text',
                  inputmode: type === 'integer' ? 'numeric' : null,
                });
          control.value = row[name];
          const keyName = `${key}-${index}-${name}`;
          controls.set(keyName, control);
          control.addEventListener(type === 'select' ? 'change' : 'input', () => {
            row[name] = control.value;
            changed();
          });
          control.addEventListener('blur', () => {
            touched.add(keyName);
            sync();
          });
          fields.append(
            el(
              'div',
              { class: 'field' },
              el('label', { for: id }, `${label} *`),
              control,
              el('span', { id: `${id}-error`, class: 'field-error', hidden: true }),
            ),
          );
        }
        host.append(
          el(
            'div',
            { class: 'motor-row' },
            el(
              'div',
              { class: 'motor-row-heading' },
              el(
                'strong',
                {},
                `${collection.singular === 'fabricante' ? 'Fabricante' : 'Componente'} ${index + 1}`,
              ),
              button(
                `Remover ${collection.singular} ${index + 1}`,
                async () => {
                  if (
                    pendingOperations ||
                    !(await confirm(
                      `Remover ${collection.singular}?`,
                      'Este item será removido do motor em edição.',
                    ))
                  )
                    return;
                  record[key].splice(index, 1);
                  paint();
                  changed();
                },
                'text-button',
              ),
            ),
            fields,
          ),
        );
      });
      host.prepend(
        button(`Adicionar ${collection.singular}`, () => {
          record[key].push(Object.fromEntries(collection.fields.map(([name]) => [name, ''])));
          paint();
          changed();
          byId(`motor-${key}-${record[key].length - 1}-${collection.fields[0][0]}`).focus();
        }),
      );
    };
    paint();
    return host;
  }
  function allIssues(record) {
    const issues = m.issues(record);
    for (const field of m.fields.filter((f) => f.type === 'pdf' && m.applicable(f, record))) {
      const file = record.anexos[field.key];
      if (file && missingFiles.has(file.id))
        issues.push({
          key: field.key,
          section: field.section,
          label: field.label,
          message: 'PDF não encontrado. Selecione novamente.',
        });
    }
    return issues;
  }
  function completion(record, sections, issues) {
    const fields = m.fields.filter((f) => sections.includes(f.section) && m.applicable(f, record));
    const required = fields.filter((f) => f.required);
    const collections = Object.keys(m.collections).filter((key) => sections.includes(key));
    const keys = new Set(issues.map((issue) => issue.key));
    const total = required.length + collections.length;
    const done =
      required.filter((f) => !keys.has(f.key)).length +
      collections.filter(
        (key) => record[key].length && !issues.some((issue) => issue.section === key),
      ).length;
    const pending = issues.filter((issue) => sections.includes(issue.section)).length;
    const started =
      fields.some(
        (f) =>
          !['fixed', 'calculated'].includes(f.type) &&
          (f.type === 'pdf' ? record.anexos[f.key] : String(record.values[f.key] || '').trim()),
      ) || collections.some((key) => record[key].length);
    return {
      done,
      total,
      pending,
      started,
      percent: total ? Math.round((done / total) * 100) : 100,
    };
  }
  function sync() {
    const record = active();
    if (!record) return;
    const issues = allIssues(record);
    const errors = new Map(issues.map((issue) => [issue.key, issue.message]));
    for (const [key, control] of controls) {
      const field = m.byKey[key];
      const applicable = !field || m.applicable(field, record);
      if (field) {
        wrappers.get(key).hidden = !applicable;
        control.disabled = !applicable || (field.type === 'pdf' && pendingOperations > 0);
        if (field.type === 'calculated') control.value = record.values[key];
      }
      const error = applicable && (showErrors || touched.has(key)) ? errors.get(key) : '';
      control.setAttribute('aria-invalid', error ? 'true' : 'false');
      const target = byId(`motor-${key}-error`);
      if (target) {
        target.textContent = error || '';
        target.hidden = !error;
      }
    }
    title.textContent = `${m.title(record)} · ${record.savedAt && !issues.length ? 'Conferido' : 'Rascunho'}`;
    const option = [...selectRecord.options].find((item) => item.value === record.uid);
    if (option)
      option.textContent = `${record.values.idReferencia || 'Sem referência'} · ${m.title(record)}`;
    const overall = completion(
      record,
      m.sections.map((section) => section.key),
      issues,
    );
    progress.value = overall.percent;
    progressText.textContent = `${overall.percent}% · ${overall.done} de ${overall.total} requisitos preenchidos`;
    for (const step of m.steps) {
      const result = completion(record, step.sections, issues);
      const control = stepButtons.get(step.key);
      if (control) {
        control.classList.toggle('complete', !result.pending);
        control.querySelector('.motor-step-index').textContent = result.pending
          ? String(m.steps.filter((s) => s.tab === step.tab).indexOf(step) + 1)
          : '✓';
        control.querySelector('.motor-step-count').textContent = !result.started
          ? 'A preencher'
          : !result.pending
            ? 'Preenchida'
            : `${result.done} de ${result.total} requisitos`;
      }
      const option = stepSelects.get(step.tab)?.querySelector(`option[value="${step.key}"]`);
      if (option)
        option.textContent = `${m.steps.filter((s) => s.tab === step.tab).indexOf(step) + 1}. ${step.title} · ${result.pending ? `${result.done}/${result.total}` : 'Preenchida'}`;
      const documents = m.fields.filter(
        (f) => f.type === 'pdf' && step.sections.includes(f.section) && m.applicable(f, record),
      );
      const disclosure = byId(`motor-documents-${step.key}`);
      if (disclosure) {
        disclosure.hidden = !documents.length;
        const missing = documents.filter((f) => errors.has(f.key)).length;
        const attached = documents.filter((f) => record.anexos[f.key]).length;
        byId(`motor-documents-status-${step.key}`).textContent = missing
          ? `${missing} pendente(s)`
          : attached
            ? `${attached} anexado(s)`
            : 'Opcionais';
      }
    }
    updateNavigation();
    if (state.tab === 'revisao') renderReview();
    updateStatus();
  }
  function jump(issue) {
    goStep(m.stepForSection(issue.section).key, false);
    const control = byId(`motor-${issue.key}`) || byId(`motor-${issue.section}`);
    let parent = control?.parentElement;
    while (parent && parent !== root) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
    control?.focus();
    control?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  function renderReview() {
    const record = active();
    if (!record) return;
    const issues = allIssues(record);
    const review = panels.revisao;
    review.replaceChildren(
      ...[
        el(
          'h3',
          {},
          issues.length
            ? `${issues.length} pendência(s) para conferir`
            : 'Todos os requisitos foram preenchidos.',
        ),
        el(
          'p',
          { class: 'motor-heading-note' },
          'Confira os dados antes de compartilhar. As pendências estão agrupadas por etapa; selecione um campo para corrigi-lo.',
        ),
        issues.length
          ? button(
              'Continuar pela primeira pendência',
              () => {
                showErrors = true;
                jump(issues[0]);
              },
              'button button-primary motor-resume',
            )
          : null,
      ].filter((node) => node != null),
    );
    for (const step of m.steps) {
      const pending = issues.filter((issue) => step.sections.includes(issue.section));
      if (!pending.length) continue;
      review.append(
        el(
          'details',
          { class: 'motor-section motor-pending-group' },
          el('summary', {}, step.title, el('span', { class: 'count' }, String(pending.length))),
          el(
            'ul',
            { class: 'motor-pending' },
            pending.map((issue) =>
              el(
                'li',
                {},
                button(
                  `${issue.label}: ${issue.message}`,
                  () => {
                    showErrors = true;
                    jump(issue);
                  },
                  '',
                ),
              ),
            ),
          ),
        ),
      );
    }
    review.append(el('h3', { class: 'motor-review-heading' }, 'Dados do levantamento'));
    for (const section of m.sections) {
      const lines = m.fields
        .filter((f) => f.section === section.key && m.applicable(f, record))
        .map((f) => {
          const value = f.type === 'pdf' ? record.anexos[f.key]?.name : record.values[f.key];
          return el(
            'div',
            {},
            el('dt', {}, `${f.label}${f.unit ? ` (${f.unit})` : ''}`),
            el('dd', { class: value ? '' : 'pending' }, value || 'Não informado'),
          );
        });
      if (m.collections[section.key])
        record[section.key].forEach((row, i) => {
          lines.push(
            el(
              'div',
              {},
              el('dt', {}, `${m.collections[section.key].singular} ${i + 1}`),
              el(
                'dd',
                {},
                m.collections[section.key].fields
                  .map(([key, label]) => `${label}: ${row[key] || 'Não informado'}`)
                  .join('\n'),
              ),
            ),
          );
        });
      review.append(
        el(
          'details',
          { class: 'motor-section' },
          el('summary', {}, section.title),
          button(
            'Editar esta etapa',
            () => goStep(m.stepForSection(section.key).key),
            'text-button motor-review-edit',
          ),
          el('dl', { class: 'motor-review-list' }, lines),
        ),
      );
    }
  }
  function renderFlow(tab) {
    const steps = m.steps.filter((step) => step.tab === tab);
    const select = el(
      'select',
      { id: `motor-step-select-${tab}` },
      steps.map((step) => el('option', { value: step.key }, step.title)),
    );
    // Manter o foco no seletor permite trocar etapas com as setas do teclado.
    select.addEventListener('change', () => goStep(select.value, false));
    stepSelects.set(tab, select);
    const navigation = el('nav', {
      class: 'motor-step-nav',
      'aria-label': `Etapas: ${tab === 'cadastro' ? 'dados do motor' : 'ensaios'}`,
    });
    const list = el('ol', {});
    steps.forEach((step, index) => {
      const control = button('', () => goStep(step.key), 'motor-step-button', {
        id: `motor-step-${step.key}`,
        'aria-controls': `motor-stage-${step.key}`,
      });
      control.append(
        el('span', { class: 'motor-step-index', 'aria-hidden': 'true' }, String(index + 1)),
        el(
          'span',
          {},
          el('strong', {}, step.title),
          el('span', { class: 'motor-step-count' }, 'A preencher'),
        ),
      );
      stepButtons.set(step.key, control);
      list.append(el('li', {}, control));
    });
    navigation.append(el('p', { class: 'eyebrow' }, 'ETAPAS DE PREENCHIMENTO'), list);
    const content = el('div', { class: 'motor-step-content' });
    steps.forEach((step, index) => {
      const stage = el(
        'section',
        {
          id: `motor-stage-${step.key}`,
          'data-motor-step': step.key,
          class: 'motor-stage',
          'aria-labelledby': `motor-stage-heading-${step.key}`,
          hidden: true,
        },
        el(
          'header',
          { class: 'motor-stage-heading' },
          el('p', { class: 'eyebrow' }, `ETAPA ${index + 1} DE ${steps.length}`),
          el('h3', { id: `motor-stage-heading-${step.key}`, tabindex: -1 }, step.title),
          el('p', {}, step.description),
        ),
      );
      for (const key of step.sections) {
        let definitions = m.fields.filter(
          (f) => f.section === key && !['pdf', 'fixed'].includes(f.type),
        );
        if (key === 'identificacao') {
          const order = [
            'marcaMotor',
            'modeloMotor',
            'idReferencia',
            'importado',
            'configuracaoBaseMotor',
          ];
          definitions = definitions.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
        }
        const fields = el('div', { class: 'form-fields' });
        for (const field of definitions) {
          const node = fieldNode(field);
          if (field.key === 'configuracaoBaseMotor')
            fields.append(
              el(
                'details',
                {
                  class: 'motor-extra-reference field-wide',
                  open: !!active().values[field.key],
                },
                el('summary', {}, 'Referência de configuração base (opcional)'),
                node,
              ),
            );
          else fields.append(node);
        }
        if (m.collections[key]) fields.prepend(collectionNode(key));
        const group = el(
          'fieldset',
          { class: 'motor-step-section' },
          el(
            'legend',
            {
              class:
                step.sections.length > 1 && key !== 'referencias' ? 'motor-group-title' : 'sr-only',
            },
            m.sectionByKey[key].title,
          ),
          fields,
        );
        if (key === 'referencias')
          stage.append(
            el(
              'details',
              {
                class: 'motor-extra-reference',
                open: definitions.some((f) => active().values[f.key]),
              },
              el('summary', {}, 'Famílias OBD Diesel e Ki (opcional)'),
              group,
            ),
          );
        else stage.append(group);
      }
      const pdfs = m.fields.filter((f) => f.type === 'pdf' && step.sections.includes(f.section));
      if (pdfs.length)
        stage.append(
          el(
            'details',
            {
              id: `motor-documents-${step.key}`,
              class: 'motor-documents',
              open: pdfs.some((f) => active().anexos[f.key]),
            },
            el(
              'summary',
              {},
              el('span', {}, 'Documentos desta etapa'),
              el('span', {
                id: `motor-documents-status-${step.key}`,
                class: 'motor-document-count',
              }),
            ),
            el(
              'p',
              { class: 'motor-document-hint' },
              'Anexe PDFs de até 10 MB por arquivo. Você pode deixar os documentos para depois.',
            ),
            el('div', { class: 'form-fields' }, pdfs.map(fieldNode)),
          ),
        );
      stagePanels.set(step.key, stage);
      content.append(stage);
    });
    panels[tab].replaceChildren(
      el(
        'div',
        { class: 'motor-flow' },
        navigation,
        el(
          'label',
          { class: 'motor-mobile-step', for: `motor-step-select-${tab}` },
          'Etapa de preenchimento',
          select,
        ),
        content,
      ),
    );
  }
  function render() {
    const record = active();
    empty.hidden = !!record;
    editor.hidden = !record;
    exportButton.disabled = zipButton.disabled = !state.records.length || pendingOperations > 0;
    clearButton.disabled = !state.records.length && !loaded.raw;
    controls.clear();
    wrappers.clear();
    stagePanels.clear();
    stepButtons.clear();
    stepSelects.clear();
    if (!record) {
      updateStatus();
      return;
    }
    selectRecord.replaceChildren(
      ...state.records.map((item) =>
        el(
          'option',
          { value: item.uid },
          `${item.values.idReferencia || 'Sem referência'} · ${m.title(item)}`,
        ),
      ),
    );
    selectRecord.value = record.uid;
    panels.cadastro.replaceChildren();
    panels.emissao.replaceChildren();
    renderFlow('cadastro');
    renderFlow('emissao');
    for (const field of m.fields.filter((f) => f.type === 'pdf')) renderFile(field);
    setTab(state.tab);
    sync();
  }
  function save() {
    if (!active() || pendingOperations) return;
    showErrors = true;
    const issues = allIssues(active());
    active().savedAt = issues.length ? null : new Date().toISOString();
    const saved = persist();
    sync();
    feedback(
      !saved
        ? 'Rascunho mantido apenas nesta sessão. Exporte os dados antes de fechar.'
        : issues.length
          ? `Rascunho salvo com ${issues.length} pendência(s). Abra Revisão para conferir.`
          : 'Motor conferido e salvo neste navegador.',
      !saved,
    );
  }
  async function removeRecord() {
    const record = active();
    if (
      !record ||
      pendingOperations ||
      !(await confirm(
        'Excluir este motor?',
        `${m.title(record)} e seus anexos serão removidos deste levantamento. Baixe uma cópia antes de confirmar.`,
      ))
    )
      return;
    state.records = state.records.filter((item) => item.uid !== record.uid);
    state.selectedUid = state.records[0]?.uid || null;
    const saved = persist();
    render();
    for (const file of Object.values(record.anexos)) {
      transientFiles.delete(file.id);
      missingFiles.delete(file.id);
      if (saved) await discardFile(file.id);
    }
    updateStatus();
    feedback(
      saved
        ? 'Motor excluído.'
        : 'Motor removido apenas desta sessão; o armazenamento não pôde ser atualizado.',
      !saved,
    );
  }
  async function clearRecords() {
    if (
      pendingOperations ||
      !(await confirm(
        'Limpar os motores?',
        'Todos os motores e anexos deste levantamento serão removidos. Os veículos ficam preservados. Baixe uma cópia antes de confirmar.',
      ))
    )
      return;
    const files = state.records.flatMap((record) => Object.values(record.anexos));
    try {
      localStorage.removeItem(m.STORAGE_KEY);
    } catch (error) {
      console.error('Falha ao limpar motores:', error);
      feedback('Não foi possível limpar os dados. O levantamento foi preservado.', true);
      return;
    }
    state = m.emptyState();
    blocked = false;
    storageError = '';
    loaded.raw = null;
    transientFiles.clear();
    missingFiles.clear();
    render();
    for (const file of files) await discardFile(file.id);
    updateStatus();
    feedback('Motores removidos deste navegador.');
  }
  async function verifyFiles(records) {
    for (const record of records)
      for (const [key, metadata] of Object.entries(record.anexos)) {
        if (!m.applicable(m.byKey[key], record)) continue;
        try {
          const file = await m.files.get(metadata.id);
          if (!file || file.size !== metadata.size) missingFiles.add(metadata.id);
          else missingFiles.delete(metadata.id);
        } catch (error) {
          console.error('Falha ao verificar PDF:', error);
          missingFiles.add(metadata.id);
        }
      }
    sync();
  }
  async function exportExcel() {
    await perform(async () => {
      const records = structuredClone(state.records);
      if (!records.length) return;
      await verifyFiles(records);
      const missing = records.some((record) =>
        Object.entries(record.anexos).some(
          ([key, file]) => m.applicable(m.byKey[key], record) && missingFiles.has(file.id),
        ),
      );
      if (missing)
        throw new Error(
          'Há PDFs não encontrados. Selecione-os novamente ou remova a referência antes de exportar.',
        );
      const invalid = records.find(
        (record) =>
          !record.values.marcaMotor.trim() ||
          !record.values.modeloMotor.trim() ||
          m.issues(record, false).length,
      );
      if (invalid) {
        state.selectedUid = invalid.uid;
        showErrors = true;
        state.tab = 'revisao';
        render();
        throw new Error(
          'Preencha marca e modelo e corrija os formatos e itens incompletos antes de exportar. Os demais requisitos podem permanecer pendentes.',
        );
      }
      await m.exportExcel(records);
      feedback(
        `Excel gerado com ${records.length} motor(es). Consulte a aba Pendências e baixe os PDFs separadamente.`,
      );
    });
  }
  async function exportZip() {
    await perform(async () => {
      await m.exportAttachments(structuredClone(state.records));
      feedback('Anexos baixados em ZIP. Os caminhos correspondem à aba Anexos do Excel.');
    });
  }
  function domain(name) {
    const motors = name === 'motores';
    root.hidden = !motors;
    byId('vehicle-workspace').hidden = motors;
    byId('export-button').hidden = motors;
    byId('storage-warning').hidden = motors || !byId('storage-warning-text').textContent;
    byId('vehicle-persistence').hidden = motors;
    byId('page-title').textContent = motors
      ? 'Levantamento Técnico de Motores'
      : 'Levantamento Técnico de Veículos';
    byId('domain-veiculos').setAttribute('aria-pressed', String(!motors));
    byId('domain-motores').setAttribute('aria-pressed', String(motors));
    document.querySelector('.skip-link').href = motors ? '#motor-workspace' : '#workspace';
    try {
      sessionStorage.setItem('levantamento-dominio', name);
    } catch (error) {
      console.info('Não foi possível lembrar a área selecionada:', error);
    }
  }
  root.tabIndex = -1;
  byId('domain-veiculos').addEventListener('click', () => domain('veiculos'));
  byId('domain-motores').addEventListener('click', () => domain('motores'));
  window.addEventListener('storage', (event) => {
    if (
      (event.key === m.STORAGE_KEY || event.key === null) &&
      (event.key === null || event.newValue !== event.oldValue)
    ) {
      blocked = true;
      storageError =
        'Os motores foram alterados em outra aba. O salvamento foi pausado. Exporte sua edição antes de recarregar para evitar sobrescrever dados.';
      updateStatus();
    }
  });
  render();
  verifyFiles(state.records);
  try {
    if (sessionStorage.getItem('levantamento-dominio') === 'motores') domain('motores');
  } catch (error) {
    console.info('Área inicial de veículos selecionada:', error);
  }
})();

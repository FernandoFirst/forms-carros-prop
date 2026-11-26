(function () {
  'use strict';
  const app = globalThis.Veiculos;
  const p = app.p8;
  const session = app.vehicleSession;
  const el = app.el;
  const files = globalThis.Motores.createFileStore('levantamento-tecnico-veiculos-p8');
  p.verifyAttachments = (vehicles) => p.attachmentEntries(vehicles, files);
  const root = document.getElementById('panel-formulario');
  const missingFiles = new Set();
  let generation = 0;
  let exporting = false;
  let fileWarning = '';
  const disclosures = new Map();
  const areas = ['Veículo', 'Pré-ruído', 'Documentos', 'Revisão'];
  const descriptions = {
    identificacao: 'Comece pelos dados que identificam esta configuração.',
    origem: 'Informe quem fabrica o veículo e, quando aplicável, quem o importa.',
    configuracao: 'Detalhe a carroçaria, as massas e os sistemas do veículo.',
    familias: 'Informe as referências das famílias, quando disponíveis.',
    transmissao: 'Preencha os dados da transmissão e do conjunto de tração.',
    reservatorio: 'Descreva o armazenamento de combustível.',
    escapamento: 'Informe as saídas, os materiais e os controles de emissões.',
    outras: 'Complete as informações sobre materiais e ar-condicionado.',
    componentes: 'Adicione os componentes que fazem parte desta configuração.',
    veiculoEnsaio: 'Identifique o veículo utilizado nos ensaios de ruído.',
    responsavel: 'Reúna os documentos e identifique o responsável técnico.',
  };
  const disclosure = (id, title, content, open = false, className = 'p8-disclosure') => {
    const node = el(
      'details',
      { class: className, open: disclosures.get(id) ?? open },
      el('summary', {}, title),
      content,
    );
    node.addEventListener('toggle', () => disclosures.set(id, node.open));
    return node;
  };
  p.busy = 0;
  const button = (label, action, primary = false) => {
    const node = el(
      'button',
      { type: 'button', class: `button ${primary ? 'button-primary' : 'button-outline'}` },
      label,
    );
    node.addEventListener('click', action);
    return node;
  };
  const belongs = (vehicle) => session.vehicles().includes(vehicle);
  const changed = (vehicle) => session.changed(vehicle);
  const applicableSteps = (vehicle) => p.steps.filter((item) => p.applicable(vehicle, item));
  const go = (vehicle, key, focus = true) => {
    p.ensure(vehicle).step = key;
    session.persist();
    p.render(vehicle);
    if (focus) {
      const heading = root.querySelector('h2');
      heading?.focus({ preventScroll: true });
      const rect = heading?.getBoundingClientRect();
      if (rect && (rect.top < 16 || rect.bottom > innerHeight))
        heading.scrollIntoView({ block: 'start' });
    }
  };
  const format = (vehicle, field) => {
    if (field.type === 'pdf') return vehicle.p8?.attachments[field.key]?.name || 'Não informado';
    const value = p.value(vehicle, field);
    if (field.type === 'version')
      return p.versions(vehicle).find((item) => item.value === value)?.label || 'Não informado';
    return value ? `${value}${field.unit ? ` ${field.unit}` : ''}` : 'Não informado';
  };
  const completion = (vehicle) => {
    const fields = p.fields.filter(
      (field) => field.required && field.type !== 'calculated' && p.applicable(vehicle, field),
    );
    const lists = p.lists.filter((item) => item.required && p.applicable(vehicle, item));
    const issues = p.issues(vehicle);
    const answered =
      fields.filter((field) => !p.error(vehicle, field)).length +
      lists.filter(
        (list) =>
          (vehicle.p8?.lists[list.key]?.length || 0) > 0 &&
          !issues.some((issue) => issue.key === list.key || issue.key.startsWith(`${list.key}-`)),
      ).length;
    return Math.round((answered / Math.max(1, fields.length + lists.length)) * 100);
  };
  const summary = (vehicle) => `${completion(vehicle)}% preenchido`;
  const updateSummary = (vehicle) => {
    const node = root.querySelector('[data-p8-summary]');
    if (node) node.textContent = summary(vehicle);
    const progress = root.querySelector('#p8-progress');
    if (progress) progress.value = completion(vehicle);
    const issues = p.issues(vehicle);
    root.querySelectorAll('[data-p8-stage]').forEach((item) => {
      const complete = !issues.some((issue) => issue.step === item.dataset.p8Stage);
      item.classList.toggle('is-complete', complete);
      item.querySelector('.p8-nav-state').textContent = complete ? 'Concluída' : '';
    });
  };
  const showError = (vehicle, field, control, error) => {
    error.textContent = p.error(vehicle, field);
    error.hidden = !error.textContent;
    control.setAttribute('aria-invalid', String(!!error.textContent));
  };
  const retainFocus = (key) => {
    const target = document.getElementById(`field-${key}`) || document.getElementById(`p8-${key}`);
    for (
      let parent = target?.parentElement;
      parent && parent !== root;
      parent = parent.parentElement
    )
      if (parent.tagName === 'DETAILS') parent.open = true;
    target?.focus({ preventScroll: true });
  };

  function controlField(vehicle, field) {
    const id = `field-${field.key}`;
    const wrapper = el('div', {
      class: `field ${['long', 'calculated'].includes(field.type) ? 'field-wide' : ''}`,
    });
    const label = el(
      'label',
      { for: id },
      field.label,
      field.required
        ? el('span', { class: 'required-mark', 'aria-hidden': 'true' }, ' *')
        : el('span', { class: 'p8-optional' }, 'Opcional'),
    );
    const attrs = {
      id,
      'data-p8-key': field.key,
      'aria-required': String(field.required),
      'aria-describedby': `${id}-help ${id}-error`,
      autocomplete: 'off',
    };
    let control;
    if (field.type === 'select' || field.type === 'boolean' || field.type === 'version') {
      const choices =
        field.type === 'version'
          ? p.versions(vehicle)
          : (field.choices || ['Sim', 'Não']).map((value) => ({
              value,
              label:
                field.key === 'categoriaVeiculo'
                  ? `${value} — ${p.categories.find(([code]) => code === value)[1]}`
                  : value,
            }));
      control = el(
        'select',
        attrs,
        el('option', { value: '' }, 'Selecione'),
        choices.map((item) => el('option', { value: item.value }, item.label)),
      );
      const value = p.value(vehicle, field);
      if (value && !choices.some((item) => item.value === value))
        control.append(el('option', { value }, `${value} (revise a referência)`));
    } else if (field.type === 'long') control = el('textarea', { ...attrs, rows: 3 });
    else
      control = el('input', {
        ...attrs,
        type: field.type === 'date' ? 'date' : 'text',
        inputmode: ['number', 'decimal', 'integer', 'year'].includes(field.type) ? 'decimal' : null,
        readonly: field.type === 'calculated',
        placeholder: field.placeholder || '',
      });
    control.value = p.value(vehicle, field);
    const helper = el(
      'span',
      { class: 'field-help p8-field-hint', id: `${id}-help` },
      field.report
        ? ''
        : field.type === 'calculated'
          ? 'Calculada a partir das três medições válidas, arredondada para duas casas.'
          : field.help ||
            (field.type === 'version'
              ? 'As opções vêm da identificação e das versões adicionais deste veículo.'
              : ''),
    );
    const error = el('span', { class: 'field-error', id: `${id}-error`, hidden: true });
    const counter =
      ['text', 'long', 'year'].includes(field.type) && field.maxLength < 32767
        ? el(
            'span',
            { class: 'field-help p8-field-counter' },
            `${control.value.length}/${field.maxLength} caracteres`,
          )
        : null;
    if (field.suggestions) {
      control.setAttribute('list', `${id}-suggestions`);
      wrapper.append(
        el(
          'datalist',
          { id: `${id}-suggestions` },
          field.suggestions.map((value) => el('option', { value })),
        ),
      );
    }
    const conditional =
      p.fields.some((item) => item.condition?.[0] === field.key) ||
      p.steps.some((item) => item.condition?.[0] === field.key);
    const edit = () => {
      let value = control.value;
      if (field.uppercase) {
        value = value.toUpperCase();
        control.value = value;
      }
      p.set(vehicle, field, value);
      changed(vehicle);
      if (counter) {
        counter.textContent = `${value.length}/${field.maxLength} caracteres`;
        counter.classList.toggle('near-limit', value.length >= field.maxLength * 0.9);
      }
      showError(vehicle, field, control, error);
      updateSummary(vehicle);
      const average = document.getElementById('field-mediaMedicoes');
      if (average) average.value = p.value(vehicle, p.byKey.mediaMedicoes);
    };
    if (control.tagName === 'SELECT')
      control.addEventListener('change', () => {
        edit();
        if (conditional) {
          p.render(vehicle);
          retainFocus(field.key);
        }
      });
    else {
      control.addEventListener('input', edit);
      if (conditional)
        control.addEventListener('change', () => {
          p.render(vehicle);
          retainFocus(field.key);
        });
    }
    control.addEventListener('blur', () => showError(vehicle, field, control, error));
    if (p.value(vehicle, field)) showError(vehicle, field, control, error);
    wrapper.append(
      label,
      field.unit ? el('div', { class: 'p8-unit' }, control, el('span', {}, field.unit)) : control,
      helper,
      counter,
      error,
    );
    return wrapper;
  }

  function collection(vehicle, list) {
    const data = p.ensure(vehicle);
    const rows = (data.lists[list.key] ||= []);
    const section = el(
      'section',
      { class: 'p8-collection', 'aria-labelledby': `p8-${list.key}` },
      el('h3', { id: `p8-${list.key}`, tabindex: '-1' }, list.title),
    );
    section.append(
      el(
        'p',
        { class: 'field-help' },
        list.key === 'versoes'
          ? 'A versão principal continua na identificação. Inclua aqui outras versões da mesma configuração.'
          : list.key.startsWith('resultado')
            ? 'Transcreva as colunas do relatório, mantendo as unidades usadas no ensaio. Os resultados não são calculados aqui.'
            : 'Preencha os seis dados de cada componente conforme o cadastro de referência.',
      ),
    );
    if (!rows.length)
      section.append(el('p', { class: 'p8-empty-list' }, 'Nenhum registro adicionado.'));
    for (const [index, row] of rows.entries()) {
      const fields = el('div', { class: 'form-fields' });
      for (const column of list.columns) {
        const key = `${list.key}-${row.uid}-${column.key}`;
        const id = `p8-${key}`;
        const input = el('input', {
          id,
          type: 'text',
          inputmode: column.type === 'number' ? 'decimal' : null,
          'aria-describedby': `${id}-error`,
          autocomplete: 'off',
        });
        input.value = row[column.key] || '';
        const error = el('span', { id: `${id}-error`, class: 'field-error', hidden: true });
        const validate = () => {
          const issue = p.issues(vehicle).find((item) => item.key === key);
          error.textContent = issue?.message || '';
          error.hidden = !issue;
          input.setAttribute('aria-invalid', String(!!issue));
        };
        input.addEventListener('input', () => {
          row[column.key] = input.value;
          changed(vehicle);
          updateSummary(vehicle);
          validate();
        });
        input.addEventListener('blur', validate);
        fields.append(
          el('div', { class: 'field' }, el('label', { for: id }, column.label, ' *'), input, error),
        );
      }
      const remove = button('Remover registro', async () => {
        if (
          !(await session.confirm(
            'Remover este registro?',
            'Os dados deste item serão removidos da ficha do veículo.',
            'Remover',
          ))
        )
          return;
        const at = rows.indexOf(row);
        if (at >= 0 && belongs(vehicle)) {
          rows.splice(at, 1);
          changed(vehicle);
          p.render(vehicle);
        }
      });
      remove.classList.add('p8-subtle-button');
      section.append(
        disclosure(
          `${vehicle.uid}:row:${row.uid}`,
          `${row[list.columns[0].key] || 'Novo registro'} · ${index + 1}`,
          el('div', { class: 'p8-disclosure-content' }, fields, remove),
          list.columns.some((column) => !String(row[column.key] || '').trim()),
          'p8-row',
        ),
      );
    }
    section.append(
      button(
        `Adicionar ${list.key === 'versoes' ? 'versão' : list.key === 'componentes' ? 'componente' : 'resultado'}`,
        () => {
          for (const row of rows) disclosures.set(`${vehicle.uid}:row:${row.uid}`, false);
          const row = {
            uid: crypto.randomUUID(),
            ...Object.fromEntries(list.columns.map((column) => [column.key, ''])),
          };
          rows.push(row);
          changed(vehicle);
          p.render(vehicle);
          retainFocus(`${list.key}-${row.uid}-${list.columns[0].key}`);
        },
      ),
    );
    return list.required
      ? section
      : disclosure(
          `${vehicle.uid}:list:${list.key}`,
          `${list.title} · ${rows.length}`,
          section,
          false,
          'p8-complement',
        );
  }

  async function upload(vehicle, field, file, input) {
    if (!file) return;
    p.busy++;
    input.disabled = true;
    try {
      const result = await files.put(file);
      if (!belongs(vehicle)) return;
      p.ensure(vehicle).attachments[field.key] = result.metadata;
      changed(vehicle);
      if (!result.persistent)
        fileWarning = 'Há PDFs apenas nesta sessão. Baixe os anexos antes de fechar o navegador.';
      session.notify(
        result.persistent ? 'PDF guardado neste navegador.' : fileWarning,
        !result.persistent,
      );
    } catch (error) {
      session.notify(error.message, true);
    } finally {
      p.busy--;
      if (belongs(vehicle) && session.selected() === vehicle && !root.hidden) p.render(vehicle);
    }
  }

  function documentField(vehicle, field, token) {
    const file = vehicle.p8?.attachments[field.key];
    const status = el(
      'span',
      { class: 'field-help', role: 'status' },
      file ? 'Verificando arquivo…' : 'PDF de até 10 MB.',
    );
    const id = `field-${field.key}`;
    const input = el('input', {
      id,
      type: 'file',
      accept: '.pdf,application/pdf',
      'aria-describedby': `${id}-help`,
      disabled: p.busy > 0,
    });
    input.addEventListener('change', () => upload(vehicle, field, input.files[0], input));
    const wrapper = el(
      'div',
      { class: 'field field-wide p8-file' },
      el('label', { for: id }, field.label, field.required ? ' *' : ' (opcional)'),
      file ? el('p', { class: 'p8-file-name' }, file.name) : null,
      input,
      el(
        'span',
        { id: `${id}-help`, class: 'field-help' },
        field.help || 'Anexe o documento correspondente.',
      ),
      status,
    );
    if (file) {
      files
        .get(file.id)
        .then((blob) => {
          if (blob) missingFiles.delete(file.id);
          else missingFiles.add(file.id);
          if (token === generation)
            status.textContent = blob
              ? `${(file.size / 1024).toFixed(1)} KB · guardado localmente`
              : 'Arquivo não encontrado. Anexe o PDF novamente.';
        })
        .catch(() => {
          missingFiles.add(file.id);
          if (token === generation)
            status.textContent =
              'Não foi possível acessar o arquivo. Anexe o PDF novamente ou tente reabrir o navegador.';
        });
      wrapper.append(
        el(
          'div',
          { class: 'p8-actions' },
          button('Baixar PDF', async () => {
            try {
              const blob = await files.get(file.id);
              if (!blob) throw new Error('Arquivo não encontrado. Anexe o PDF novamente.');
              app.downloadBlob(blob, file.name);
            } catch (error) {
              session.notify(error.message, true);
            }
          }),
          button('Remover PDF', async () => {
            if (
              !(await session.confirm(
                'Remover o PDF?',
                'O documento será desvinculado desta ficha.',
                'Remover PDF',
              ))
            )
              return;
            if (!belongs(vehicle) || vehicle.p8.attachments[field.key]?.id !== file.id) return;
            delete vehicle.p8.attachments[field.key];
            changed(vehicle);
            p.render(vehicle);
          }),
        ),
      );
    }
    return wrapper;
  }

  async function exportZip() {
    if (exporting || p.busy) {
      session.notify('Aguarde a operação de arquivos em andamento.', true);
      return;
    }
    exporting = true;
    const snapshot = structuredClone(session.vehicles());
    try {
      const entries = await p.attachmentEntries(snapshot, files);
      if (!entries.length) throw new Error('Não há PDFs aplicáveis para baixar.');
      const manifest = snapshot
        .filter((vehicle) => vehicle.p8)
        .map((vehicle) => ({
          uid: vehicle.uid,
          referencia: vehicle.idReferencia,
          anexos: p.fields
            .filter(
              (field) =>
                field.type === 'pdf' &&
                p.applicable(vehicle, field) &&
                vehicle.p8.attachments[field.key],
            )
            .map((field) => ({
              documento: field.label,
              caminho: p.filePath(vehicle, field, vehicle.p8.attachments[field.key]),
            })),
        }));
      entries.push({
        name: 'indice.json',
        blob: new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
      });
      app.downloadBlob(await globalThis.Motores.zip(entries), 'anexos-veiculos-p8.zip');
      session.notify('Anexos dos veículos baixados.');
    } catch (error) {
      session.notify(error.message || 'Não foi possível gerar o ZIP.', true);
    } finally {
      exporting = false;
    }
  }

  function review(vehicle, issues) {
    const content = el('div', {});
    content.append(
      el(
        'p',
        {},
        'Confira as respostas antes de compartilhar. Abra uma etapa para revisar ou completar os dados.',
      ),
    );
    if (!issues.length)
      content.append(
        el(
          'p',
          { class: 'p8-notice' },
          'Todos os requisitos da ficha foram preenchidos. Confira os PDFs e os resultados com o relatório técnico.',
        ),
      );
    for (const step of applicableSteps(vehicle)) {
      const pending = issues.filter((issue) => issue.step === step.key);
      const details = el(
        'details',
        { class: 'p8-review' },
        el(
          'summary',
          {},
          el('span', {}, step.title),
          el(
            'span',
            { class: `p8-review-count ${pending.length ? '' : 'complete'}` },
            pending.length ? `${pending.length} a completar` : 'Concluída',
          ),
        ),
      );
      for (const issue of pending) {
        const link = button(`${issue.label}: ${issue.message}`, () => {
          go(vehicle, step.key, false);
          retainFocus(issue.key);
        });
        link.classList.add('p8-review-link');
        details.append(link);
      }
      const values = el('dl', { class: 'p8-values' });
      for (const field of p.fields.filter(
        (item) => item.step === step.key && p.applicable(vehicle, item),
      ))
        values.append(el('dt', {}, field.label), el('dd', {}, format(vehicle, field)));
      for (const list of p.lists.filter((item) => item.step === step.key)) {
        values.append(el('dt', {}, list.title));
        const rows = vehicle.p8?.lists[list.key] || [];
        values.append(
          el(
            'dd',
            {},
            rows.length
              ? rows
                  .map((row) =>
                    list.columns
                      .map((column) => `${column.label}: ${row[column.key] || '—'}`)
                      .join(' · '),
                  )
                  .join('\n')
              : 'Nenhum registro',
          ),
        );
      }
      details.append(
        values,
        button('Editar esta etapa', () => go(vehicle, step.key)),
      );
      content.append(details);
    }
    return content;
  }

  const areaMemory = new Map();
  function stageNavigation(vehicle, area, current, issues) {
    const nav = el('nav', { class: 'p8-stage-nav', 'aria-label': 'Etapas da área' });
    const steps = applicableSteps(vehicle).filter((item) => item.area === area);
    const groupFor = (item) =>
      area !== 'Pré-ruído'
        ? ''
        : /^(arrefecimento|ventilador)/.test(item.key)
          ? 'Arrefecimento'
          : /^(compressor|descarga)/.test(item.key)
            ? 'Compressor de freios'
            : item.key.startsWith('parado')
              ? 'Ensaio parado'
              : item.key.startsWith('acelerado')
                ? 'Ensaio acelerado'
                : '';
    for (const group of [...new Set(steps.map(groupFor))]) {
      const items = steps.filter((item) => groupFor(item) === group);
      const list = el('ul', {});
      for (const item of items) {
        const complete = !issues.some((issue) => issue.step === item.key);
        const control = button(item.title, () => go(vehicle, item.key));
        control.className = `p8-nav-item ${item.key === current ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`;
        control.dataset.p8Stage = item.key;
        if (item.key === current) control.setAttribute('aria-current', 'step');
        control.append(el('span', { class: 'p8-nav-state' }, complete ? 'Concluída' : ''));
        list.append(el('li', {}, control));
      }
      if (group) {
        const node = disclosure(
          `${vehicle.uid}:nav:${group}`,
          group,
          list,
          items.some((item) => item.key === current),
          'p8-nav-group',
        );
        if (items.some((item) => item.key === current)) node.open = true;
        nav.append(node);
      } else nav.append(list);
    }
    return nav;
  }

  p.updateSaveStatus = () => {
    const node = root.querySelector('[data-p8-save-status]');
    if (!node) return;
    const original = document.getElementById('autosave-text');
    node.textContent = original.textContent;
    node.classList.toggle(
      'is-unsaved',
      document.getElementById('autosave-status').classList.contains('unsaved'),
    );
  };

  p.render = (vehicle) => {
    const token = ++generation;
    root.replaceChildren();
    if (!vehicle) {
      root.append(
        el(
          'div',
          { class: 'empty-state' },
          el('h2', {}, 'Cadastre seu primeiro veículo'),
          el('p', {}, 'Dados do veículo, ensaios e documentos em um único cadastro.'),
          button('Cadastrar primeiro veículo', session.createVehicle, true),
        ),
      );
      return;
    }
    const steps = applicableSteps(vehicle);
    const migrating = !vehicle.p8;
    let key = p.initialStep(vehicle, session.legacyStep());
    if (key !== 'revisao' && !steps.some((item) => item.key === key)) key = steps[0].key;
    p.ensure(vehicle).step = key;
    if (migrating) session.persist();
    const index = steps.findIndex((item) => item.key === key);
    const step = steps[index];
    const issues = p.issues(vehicle);
    const area = step?.area || 'Revisão';
    if (step) areaMemory.set(`${vehicle.uid}:${area}`, key);
    const areaSteps = steps.filter((item) => item.area === area);
    const areaIndex = areaSteps.findIndex((item) => item.key === key);
    const nav = el('select', {
      id: 'p8-step-select',
      'aria-label': 'Etapa do cadastro do veículo',
    });
    for (const area of ['Veículo', 'Pré-ruído', 'Documentos'])
      nav.append(
        el(
          'optgroup',
          { label: area },
          steps
            .filter((item) => item.area === area)
            .map((item) => el('option', { value: item.key }, item.title)),
        ),
      );
    nav.append(el('option', { value: 'revisao' }, 'Revisão do cadastro'));
    nav.value = key;
    nav.addEventListener('change', () => {
      go(vehicle, nav.value, false);
      document.getElementById('p8-step-select').focus();
    });
    const areaNav = el('nav', {
      class: 'p8-area-nav',
      'aria-label': 'Áreas do cadastro do veículo',
    });
    for (const [position, name] of areas.entries()) {
      const control = button(name, () => {
        const remembered = areaMemory.get(`${vehicle.uid}:${name}`);
        const target =
          steps.find((item) => item.key === remembered && item.area === name) ||
          steps.find((item) => item.area === name);
        go(vehicle, name === 'Revisão' ? 'revisao' : target.key);
      });
      control.className = 'p8-area-button';
      control.dataset.p8Area = name;
      control.setAttribute('aria-pressed', String(area === name));
      control.prepend(app.icon(['truck', 'systems', 'form', 'check'][position]));
      areaNav.append(control);
    }
    const save = button('Salvar rascunho', () => {
      p.ensure(vehicle);
      changed(vehicle);
      session.notify('Rascunho mantido. Confira o indicador de salvamento do navegador.');
    });
    const menu = el(
      'details',
      { class: 'p8-actions-menu' },
      el('summary', {}, 'Mais ações'),
      el(
        'div',
        { class: 'p8-menu-content' },
        save,
        button('Baixar anexos dos veículos (.zip)', exportZip),
        button('Excluir este veículo', session.deleteVehicle),
        button('Limpar todos os veículos', session.clearData),
      ),
    );
    menu.addEventListener('click', (event) => {
      if (event.target.closest('button')) menu.open = false;
    });
    const progress = el(
      'div',
      { class: 'p8-overall-progress' },
      el('span', { 'data-p8-summary': '' }, summary(vehicle)),
      el('progress', {
        id: 'p8-progress',
        max: '100',
        value: completion(vehicle),
        'aria-label': 'Preenchimento do cadastro do veículo',
      }),
    );
    const header = el(
      'header',
      { class: 'p8-heading' },
      el(
        'p',
        { class: 'p8-step-caption' },
        step ? `${area} · Etapa ${areaIndex + 1} de ${areaSteps.length}` : 'Conferência final',
      ),
      el('h2', { tabindex: '-1' }, step?.title || 'Revisão do cadastro'),
      descriptions[key] ? el('p', { class: 'p8-description' }, descriptions[key]) : null,
    );
    const body = el('div', { class: 'p8-body' });
    const stage = el(
      'form',
      { class: 'p8-stage', id: 'vehicle-form', novalidate: true },
      header,
      body,
    );
    stage.addEventListener('submit', (event) => {
      event.preventDefault();
      session.saveVehicle();
    });
    const layout = el(
      'div',
      { class: `p8-layout ${key === 'revisao' ? 'p8-layout-review' : ''}` },
      key !== 'revisao' ? stageNavigation(vehicle, area, key, issues) : null,
      stage,
    );
    root.append(
      el(
        'div',
        { class: 'p8-shell' },
        el(
          'div',
          { class: 'p8-topline' },
          el('span', { class: 'p8-context' }, 'Cadastro do veículo'),
          progress,
          menu,
        ),
        areaNav,
        el('div', { class: 'p8-mobile-nav' }, el('label', { for: 'p8-step-select' }, 'Etapa'), nav),
        fileWarning ? el('p', { class: 'p8-file-warning', role: 'status' }, fileWarning) : null,
        layout,
      ),
    );
    if (key === 'revisao') body.append(review(vehicle, issues));
    else {
      const fields = p.fields.filter((field) => field.step === key && p.applicable(vehicle, field));
      const extras = fields.filter(
        (field) => !field.required && field.type !== 'pdf' && key !== 'familias',
      );
      const mainFields = fields.filter((field) => field.type !== 'pdf' && !extras.includes(field));
      const groups = [...new Set(mainFields.map((field) => field.group))];
      body.append(
        el(
          'p',
          { class: 'p8-required-note' },
          '* Obrigatório. Você pode continuar e completar depois.',
        ),
      );
      if (fields.some((field) => field.report))
        body.append(
          el(
            'p',
            { class: 'p8-report-note' },
            app.icon('info'),
            'Informe os resultados e as validações conforme o relatório técnico.',
          ),
        );
      for (const [groupIndex, group] of groups.entries()) {
        const grid = el(
          'div',
          { class: 'form-fields' },
          mainFields
            .filter((field) => field.group === group)
            .map((field) => controlField(vehicle, field)),
        );
        body.append(
          group
            ? disclosure(
                `${vehicle.uid}:group:${key}:${group}`,
                group,
                el('div', { class: 'p8-disclosure-content' }, grid),
                groupIndex === 0,
                'p8-group',
              )
            : grid,
        );
      }
      if (extras.length)
        body.append(
          disclosure(
            `${vehicle.uid}:extras:${key}`,
            'Informações complementares',
            el(
              'div',
              { class: 'form-fields p8-disclosure-content' },
              extras.map((field) => controlField(vehicle, field)),
            ),
            false,
            'p8-complement',
          ),
        );
      const documents = fields.filter((field) => field.type === 'pdf');
      if (documents.length) {
        const pending = documents.filter(
          (field) =>
            field.required &&
            (!vehicle.p8?.attachments[field.key] ||
              missingFiles.has(vehicle.p8.attachments[field.key]?.id)),
        ).length;
        body.append(
          disclosure(
            `${vehicle.uid}:documents:${key}`,
            el(
              'span',
              { class: 'p8-document-summary' },
              'Documentos desta etapa',
              el(
                'span',
                { class: 'p8-review-count' },
                pending ? `${pending} a anexar` : `${documents.length} documentos`,
              ),
            ),
            el(
              'div',
              { class: 'form-fields p8-disclosure-content' },
              documents.map((field) => documentField(vehicle, field, token)),
            ),
            false,
            'p8-documents',
          ),
        );
      }
      for (const list of p.lists.filter((item) => item.step === key))
        body.append(collection(vehicle, list));
    }
    const actions = el('footer', { class: 'p8-actions p8-footer' });
    const previous = button('Voltar', () =>
      go(vehicle, key === 'revisao' ? steps.at(-1).key : steps[index - 1].key),
    );
    previous.disabled = index === 0;
    actions.append(
      previous,
      el('span', { class: 'p8-save-status', 'data-p8-save-status': '', role: 'status' }),
      button(
        key === 'revisao'
          ? 'Salvar veículo'
          : index === steps.length - 1
            ? 'Revisar ficha'
            : 'Próximo',
        () =>
          key === 'revisao'
            ? session.saveVehicle()
            : go(vehicle, steps[index + 1]?.key || 'revisao'),
        true,
      ),
    );
    stage.append(actions);
    p.updateSaveStatus();
  };

  p.focusField = (key) => {
    retainFocus(key);
    const control = document.getElementById(`field-${key}`);
    const error = document.getElementById(`field-${key}-error`);
    if (control && error && p.byKey[key])
      showError(session.selected(), p.byKey[key], control, error);
  };
  document.addEventListener('pointerdown', (event) => {
    const menu = root.querySelector('.p8-actions-menu[open]');
    if (menu && !menu.contains(event.target)) menu.open = false;
  });
  root.addEventListener('keydown', (event) => {
    const menu = root.querySelector('.p8-actions-menu[open]');
    if (event.key === 'Escape' && menu && !document.getElementById('confirm-dialog').open) {
      menu.open = false;
      menu.querySelector('summary').focus();
      event.preventDefault();
    }
  });
  if (!root.hidden) p.render(session.selected());
})();

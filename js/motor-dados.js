(function () {
  'use strict';
  const m = globalThis.Motores;
  m.STORAGE_KEY = 'levantamento-tecnico-motores:v1';
  m.emptyState = () => ({
    records: [],
    selectedUid: null,
    tab: 'cadastro',
    steps: m.initialSteps(),
  });
  m.createRecord = () => ({
    uid: crypto.randomUUID(),
    savedAt: null,
    values: Object.fromEntries(
      m.fields.filter((f) => f.type !== 'pdf').map((f) => [f.key, f.default || '']),
    ),
    fabricantes: [],
    componentes: [],
    anexos: {},
  });
  m.title = (record) =>
    [record.values.marcaMotor, record.values.modeloMotor].filter(Boolean).join(' ') || 'Novo motor';
  m.applicable = (field, record) => {
    if (!field.condition) return true;
    const [key, value] = field.condition;
    if (!m.applicable(m.byKey[key], record)) return false;
    return value === '>1' ? Number(record.values[key]) > 1 : record.values[key] === value;
  };
  m.numeric = (value) => Number(String(value).replace(',', '.'));
  m.fieldError = (field, record, required = true) => {
    if (!m.applicable(field, record) || ['fixed', 'calculated'].includes(field.type)) return '';
    if (field.type === 'pdf')
      return required && field.required && !record.anexos[field.key] ? 'Anexe o PDF.' : '';
    const value = String(record.values[field.key] ?? '').trim();
    if (!value) return required && field.required ? 'Campo obrigatório.' : '';
    if (value.length > field.maxLength) return `Use até ${field.maxLength} caracteres.`;
    if (field.type === 'number') {
      const sign = field.signed ? '-?' : '';
      const decimal = field.decimals ? `(?:[.,]\\d{1,${field.decimals}})?` : '';
      if (!new RegExp(`^${sign}\\d{1,${field.digits}}${decimal}$`).test(value))
        return `Informe ${field.decimals ? `um número com até ${field.decimals} casas decimais` : 'um inteiro'} (${field.digits} dígitos antes da vírgula).`;
      if (field.positive && m.numeric(value) <= 0) return 'Informe um valor maior que zero.';
    }
    if (field.type === 'select' && !field.choices.includes(value))
      return 'Selecione uma opção da lista.';
    if (field.type === 'year' && !/^[1-9]\d{3}$/.test(value))
      return 'Informe o ano com quatro dígitos.';
    if (field.type === 'date') {
      const date = new Date(`${value}T12:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      )
        return 'Informe uma data válida.';
    }
    return '';
  };
  // Valores derivados são sempre recalculados; nunca confiar no rascunho ou no DOM.
  m.calculate = (record) => {
    const values = record.values;
    const difference = (start, end) => {
      if (
        !String(values[start]).trim() ||
        !String(values[end]).trim() ||
        m.fieldError(m.byKey[start], record, false) ||
        m.fieldError(m.byKey[end], record, false)
      )
        return '';
      return String(
        Math.round((m.numeric(values[end]) - m.numeric(values[start])) * 10000) / 10000,
      );
    };
    values.gcPwMassaFiltroPrincipal = difference(
      'gcPwMassaInicialFiltroPrincipal',
      'gcPwMassaFinalFiltroPrincipal',
    );
    values.gcPwMassaFiltroSecundario = difference(
      'gcPwMassaInicialFiltroSecundario',
      'gcPwMassaFinalFiltroSecundario',
    );
    const secondaryEntered = !!(
      values.gcPwMassaInicialFiltroSecundario || values.gcPwMassaFinalFiltroSecundario
    );
    values.gcPwMassaTotalMp =
      values.gcPwMassaFiltroPrincipal === '' ||
      (secondaryEntered && values.gcPwMassaFiltroSecundario === '')
        ? ''
        : String(
            Math.round(
              (Number(values.gcPwMassaFiltroPrincipal) +
                Number(values.gcPwMassaFiltroSecundario || 0)) *
                10000,
            ) / 10000,
          );
    return record;
  };
  m.issues = (record, required = true) => {
    m.calculate(record);
    const issues = [];
    for (const field of m.fields) {
      const message = m.fieldError(field, record, required);
      if (message)
        issues.push({ key: field.key, section: field.section, label: field.label, message });
    }
    const add = (key, section, label, message) => {
      if (!issues.some((issue) => issue.key === key)) issues.push({ key, section, label, message });
    };
    const min = 'temperaturaMinimaOleoLubrificante',
      max = 'temperaturaMaximaOleoLubrificante';
    if (
      record.values[min] &&
      record.values[max] &&
      m.numeric(record.values[min]) > m.numeric(record.values[max])
    )
      add(
        max,
        'funcionamento',
        'Temperatura máxima do óleo',
        'A máxima deve ser igual ou maior que a mínima.',
      );
    for (const name of ['Principal', 'Secundario']) {
      const first = `gcPwMassaInicialFiltro${name}`,
        last = `gcPwMassaFinalFiltro${name}`;
      const hasFirst = !!record.values[first],
        hasLast = !!record.values[last];
      if (hasFirst !== hasLast)
        add(
          hasFirst ? last : first,
          'particulado',
          `Filtro ${name.toLowerCase()}`,
          'Informe as duas massas para calcular o particulado.',
        );
      if (hasFirst && hasLast && m.numeric(record.values[last]) < m.numeric(record.values[first]))
        add(
          last,
          'particulado',
          `Massa final do filtro ${name.toLowerCase()}`,
          'A massa final não pode ser menor que a inicial.',
        );
    }
    for (const [key, collection] of Object.entries(m.collections)) {
      if (required && !record[key].length)
        add(key, key, collection.title, `Cadastre pelo menos um ${collection.singular}.`);
      record[key].forEach((item, index) => {
        for (const [name, label, type, limit] of collection.fields) {
          const value = String(item[name] ?? '').trim();
          let message = '';
          if (!value) message = 'Campo obrigatório.';
          else if (type === 'integer' && (!/^\d{1,2}$/.test(value) || Number(value) < 1))
            message = 'Informe uma quantidade inteira de 1 a 99.';
          else if (type === 'select' && !limit.includes(value))
            message = 'Selecione uma opção da lista.';
          else if (type === 'text' && value.length > limit)
            message = `Use até ${limit} caracteres.`;
          if (message)
            add(
              `${key}-${index}-${name}`,
              key,
              `${collection.singular} ${index + 1}: ${label}`,
              message,
            );
        }
      });
    }
    return issues;
  };
  m.decode = (raw) => {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.records))
      throw new Error('Rascunho de motores incompatível.');
    const ids = new Set();
    const scalar = (value) => {
      if (value != null && !['string', 'number'].includes(typeof value))
        throw new Error('Campo inválido.');
      return value == null ? '' : String(value);
    };
    const records = data.records.map((item) => {
      if (
        !item ||
        typeof item.uid !== 'string' ||
        !/^[\w-]+$/.test(item.uid) ||
        ids.has(item.uid) ||
        !item.values ||
        typeof item.values !== 'object' ||
        Array.isArray(item.values)
      )
        throw new Error('Identificação de motor inválida.');
      ids.add(item.uid);
      const record = m.createRecord();
      record.uid = item.uid;
      record.savedAt = typeof item.savedAt === 'string' ? item.savedAt : null;
      for (const f of m.fields.filter(
        (field) => !['pdf', 'fixed', 'calculated'].includes(field.type),
      ))
        record.values[f.key] = scalar(item.values[f.key]);
      for (const [key, collection] of Object.entries(m.collections)) {
        if (!Array.isArray(item[key])) throw new Error('Lista inválida.');
        record[key] = item[key].map((row) => {
          if (!row || typeof row !== 'object') throw new Error('Item inválido.');
          return Object.fromEntries(collection.fields.map(([name]) => [name, scalar(row[name])]));
        });
      }
      for (const f of m.fields.filter((field) => field.type === 'pdf')) {
        const file = item.anexos?.[f.key];
        if (file) {
          if (
            typeof file.id !== 'string' ||
            typeof file.name !== 'string' ||
            !Number.isInteger(file.size) ||
            file.size <= 0 ||
            file.size > 10 * 1024 * 1024
          )
            throw new Error('Anexo inválido.');
          record.anexos[f.key] = { id: file.id, name: file.name, size: file.size };
        }
      }
      return m.calculate(record);
    });
    return {
      records,
      selectedUid: ids.has(data.selectedUid) ? data.selectedUid : records[0]?.uid || null,
      tab: ['cadastro', 'emissao', 'revisao'].includes(data.tab) ? data.tab : 'cadastro',
      steps: m.decodeSteps(data.steps),
    };
  };
  m.load = () => {
    let raw = null;
    try {
      raw = localStorage.getItem(m.STORAGE_KEY);
      return { state: raw ? m.decode(raw) : m.emptyState(), raw, error: '', blocked: false };
    } catch (error) {
      console.error('Falha ao recuperar motores:', error);
      return {
        state: m.emptyState(),
        raw,
        blocked: !!raw,
        error: raw
          ? 'Não foi possível ler o rascunho de motores. Baixe o original antes de limpar; ele foi preservado.'
          : 'O armazenamento está indisponível. Exporte os dados antes de fechar esta sessão.',
      };
    }
  };
})();

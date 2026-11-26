(function () {
  'use strict';
  const app = globalThis.Veiculos;
  const p = app.p8;
  p.empty = () => ({ version: 1, step: 'identificacao', values: {}, lists: {}, attachments: {} });
  p.ensure = (vehicle) => (vehicle.p8 ||= p.empty());
  // Recuperar a etapa de ambos os formulários anteriores sem copiar seus valores.
  p.initialStep = (vehicle, legacyStep = 0) =>
    vehicle.p8?.step ||
    ['identificacao', 'origem', 'configuracao', 'configuracao', 'escapamento'][legacyStep] ||
    'identificacao';
  p.value = (vehicle, field) => {
    if (field.type === 'calculated') {
      const values = ['primeiraMedicao', 'segundaMedicao', 'terceiraMedicao'].map((key) => {
        const item = p.byKey[key];
        const text = p.value(vehicle, item);
        return text.trim() && !p.error(vehicle, item, false) ? p.numeric(text) : null;
      });
      return values.includes(null)
        ? ''
        : String(Math.round((values.reduce((sum, n) => sum + n, 0) / 3) * 100) / 100);
    }
    return String((field.base ? vehicle[field.key] : vehicle.p8?.values[field.key]) ?? '');
  };
  p.resolve = (vehicle, key) =>
    p.byKey[key] ? p.value(vehicle, p.byKey[key]) : String(vehicle[key] ?? '');
  p.applicable = (vehicle, item) => {
    if (!item.condition) return true;
    const answer = p.resolve(vehicle, item.condition[0]);
    // A V1 não perguntava Sim/Não para material fibroso. Manter a descrição antiga
    // acessível até que o usuário confirme a resposta, sem presumir Sim ou Não.
    if (item.key === 'materialFibroso' && !answer && String(vehicle.materialFibroso || '').trim())
      return true;
    return answer === item.condition[1];
  };
  p.versions = (vehicle) => [
    {
      value: vehicle.uid,
      label: [vehicle.marca, vehicle.modelo, vehicle.versao].filter(Boolean).join(' / '),
    },
    ...(vehicle.p8?.lists.versoes || []).map((row) => ({
      value: row.uid,
      label: [vehicle.marca, vehicle.modelo, row.versao].filter(Boolean).join(' / '),
    })),
  ];
  p.numeric = (value) => Number(String(value).trim().replace(',', '.'));
  p.numberError = (value, field) => {
    const decimal = field.decimals ? `(?:[.,]\\d{1,${field.decimals}})?` : '';
    if (!new RegExp(`^${field.signed ? '-?' : ''}\\d{1,${field.digits}}${decimal}$`).test(value))
      return `Use até ${field.digits} dígitos e ${field.decimals} casas decimais, sem separador de milhar.`;
    if (field.positive && p.numeric(value) <= 0) return 'Informe um valor maior que zero.';
    if (field.max != null && p.numeric(value) > field.max) return `O valor máximo é ${field.max}.`;
    return '';
  };
  p.error = (vehicle, field, required = true) => {
    if (!p.applicable(vehicle, field) || field.type === 'calculated') return '';
    if (field.type === 'pdf')
      return required && field.required && !vehicle.p8?.attachments[field.key]
        ? 'Anexe o PDF.'
        : '';
    const value = p.value(vehicle, field).trim();
    if (!value) return required && field.required ? 'Campo obrigatório.' : '';
    if (value.length > field.maxLength)
      return `Use até ${field.maxLength} caracteres. O texto original foi mantido.`;
    if (field.base)
      return app.validateField({ ...app.fieldsByKey[field.key], required: false }, value, vehicle);
    if (field.type === 'number') return p.numberError(value, field);
    if (field.type === 'select' && !field.choices.includes(value))
      return 'Selecione uma opção da lista.';
    if (field.type === 'version' && !p.versions(vehicle).some((item) => item.value === value))
      return 'Selecione uma versão deste veículo.';
    if (field.type === 'year' && !/^[1-9]\d{3}$/.test(value))
      return 'Informe o ano com quatro dígitos.';
    if (field.vin && !/^[A-Z0-9]+$/.test(value))
      return 'Use letras maiúsculas e números, sem símbolos.';
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
  p.issues = (vehicle, required = true) => {
    const issues = [];
    for (const field of p.fields) {
      const message = p.error(vehicle, field, required);
      if (message) issues.push({ key: field.key, step: field.step, label: field.label, message });
    }
    for (const list of p.lists.filter((item) => p.applicable(vehicle, item))) {
      const rows = vehicle.p8?.lists[list.key] || [];
      if (required && list.required && !rows.length)
        issues.push({
          key: list.key,
          step: list.step,
          label: list.title,
          message: 'Inclua pelo menos um registro.',
        });
      for (const [index, row] of rows.entries())
        for (const column of list.columns) {
          const value = String(row[column.key] || '').trim();
          const message = !value
            ? 'Preencha o campo ou remova este registro.'
            : value.length > (column.maxLength || 500)
              ? `Use até ${column.maxLength || 500} caracteres.`
              : column.type === 'number'
                ? p.numberError(value, column)
                : '';
          if (message)
            issues.push({
              key: `${list.key}-${row.uid}-${column.key}`,
              step: list.step,
              label: `${list.title} · ${index + 1} · ${column.label}`,
              message,
            });
        }
    }
    return issues;
  };
  p.set = (vehicle, field, value) => {
    const data = p.ensure(vehicle);
    if (field.base) {
      vehicle[field.key] = value;
      app.clearInapplicable(vehicle);
    } else data.values[field.key] = value;
    vehicle.savedAt = null;
  };
  // Complementos pertencem ao mesmo uid do veículo; nunca copiar os 33 valores para outro estado.
  p.decode = (data) => {
    if (
      !data ||
      data.version !== 1 ||
      typeof data.values !== 'object' ||
      !data.values ||
      Array.isArray(data.values) ||
      typeof data.lists !== 'object' ||
      !data.lists ||
      Array.isArray(data.lists) ||
      typeof data.attachments !== 'object' ||
      !data.attachments ||
      Array.isArray(data.attachments)
    )
      throw new Error('Ficha P8 incompatível.');
    const result = p.empty();
    if (p.steps.some((item) => item.key === data.step) || data.step === 'revisao')
      result.step = data.step;
    const string = (value) => {
      if (value != null && typeof value !== 'string' && typeof value !== 'number')
        throw new Error('Valor inválido na ficha P8.');
      return value == null ? '' : String(value);
    };
    for (const field of p.fields.filter(
      (item) => !item.base && !['calculated', 'pdf'].includes(item.type),
    ))
      result.values[field.key] = string(data.values[field.key]);
    for (const list of p.lists) {
      if (data.lists[list.key] != null && !Array.isArray(data.lists[list.key]))
        throw new Error('Lista P8 inválida.');
      const uids = new Set();
      result.lists[list.key] = (data.lists[list.key] || []).map((row) => {
        if (!row || typeof row.uid !== 'string' || !row.uid || uids.has(row.uid))
          throw new Error('Identificador de item P8 inválido.');
        uids.add(row.uid);
        return {
          uid: row.uid,
          ...Object.fromEntries(
            list.columns.map((column) => [column.key, string(row[column.key])]),
          ),
        };
      });
    }
    const fileIds = new Set();
    for (const field of p.fields.filter((item) => item.type === 'pdf')) {
      const file = data.attachments[field.key];
      if (file == null) continue;
      if (
        !file ||
        typeof file.id !== 'string' ||
        !file.id ||
        fileIds.has(file.id) ||
        typeof file.name !== 'string' ||
        !/\.pdf$/i.test(file.name) ||
        !Number.isInteger(file.size) ||
        file.size <= 0 ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error('Anexo P8 inválido.');
      fileIds.add(file.id);
      result.attachments[field.key] = { id: file.id, name: file.name, size: file.size };
    }
    return result;
  };
  p.filePath = (vehicle, field, file) =>
    `${vehicle.uid}/${field.key}/${file.name.replace(/[^\p{L}\p{N}._-]/gu, '_').replace(/^\.+/, '_')}`;
})();

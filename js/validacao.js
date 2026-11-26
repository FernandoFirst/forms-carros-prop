(function () {
  'use strict';
  const app = globalThis.Veiculos;

  app.parseDecimal = (value) => {
    const text = String(value).trim();
    if (!/^\d+(?:[.,]\d+)?$/.test(text)) return null;
    const number = Number(text.replace(',', '.'));
    return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER ? number : null;
  };

  app.validateField = (field, value, vehicle) => {
    if (!app.isApplicable(field, vehicle)) return '';
    const text = String(value ?? '').trim();
    if (!text) return field.required ? 'Preencha este campo para salvar ou exportar.' : '';
    if (text.length > 32767) return 'Use até 32.767 caracteres por campo.';
    if (field.type === 'boolean' && !['Sim', 'Não'].includes(text)) return 'Selecione Sim ou Não.';
    if (field.type === 'decimal' && app.parseDecimal(text) === null) {
      return 'Informe um número não negativo, sem separador de milhar. Ex.: 23,5.';
    }
    if (
      field.type === 'integer' &&
      (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) <= 0)
    ) {
      return 'Informe um número inteiro maior que zero.';
    }
    if (field.type === 'pressure') {
      const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(bar|kpa|mpa|pa|psi|kgf\/cm[²2])$/i);
      if (!match || app.parseDecimal(match[1]) === null)
        return 'Informe uma pressão não negativa com unidade. Ex.: 10,5 bar.';
    }
    return '';
  };

  app.validateVehicle = (vehicle, section) =>
    Object.fromEntries(
      app.fieldDefinitions
        .filter((field) => !section || field.section === section)
        .map((field) => [field.key, app.validateField(field, vehicle[field.key], vehicle)])
        .filter(([, error]) => error),
    );

  app.vehicleProgress = (vehicle) => {
    const applicable = app.fieldDefinitions.filter((field) => app.isApplicable(field, vehicle));
    const answered = applicable.filter(
      (field) =>
        String(vehicle[field.key] ?? '').trim() &&
        !app.validateField(field, vehicle[field.key], vehicle),
    );
    return {
      answered: answered.length,
      total: applicable.length,
      percent: Math.round((answered.length / applicable.length) * 100),
      incomplete: answered.length !== applicable.length,
    };
  };

  app.searchVehicles = (vehicles, query, status = 'todos') => {
    const normalize = (value) =>
      String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    return vehicles.filter((vehicle) => {
      const searchable = normalize(
        [vehicle.idReferencia, vehicle.marca, vehicle.modelo, vehicle.fabricante].join(' '),
      );
      const incomplete = app.vehicleProgress(vehicle).incomplete;
      return (
        terms.every((term) => searchable.includes(term)) &&
        (status === 'todos' || (status === 'pendentes' ? incomplete : !incomplete))
      );
    });
  };
})();

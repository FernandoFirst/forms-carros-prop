(function () {
  'use strict';
  const app = globalThis.Veiculos;
  app.STORAGE_KEY = 'levantamento-tecnico-veiculos:v1';
  app.emptyState = () => ({ vehicles: [], selectedUid: null, step: 0, tab: 'formulario' });

  // Armazenamento é uma fronteira de confiança: aceitar somente o esquema conhecido.
  app.decodeState = (raw) => {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.vehicles))
      throw new Error('Formato de rascunho incompatível.');
    const uids = new Set();
    const vehicles = data.vehicles.map((record) => {
      if (!record || typeof record.uid !== 'string' || !record.uid || uids.has(record.uid))
        throw new Error('Identificador de veículo inválido.');
      uids.add(record.uid);
      const vehicle = {
        uid: record.uid,
        savedAt: typeof record.savedAt === 'string' ? record.savedAt : null,
      };
      for (const field of app.fieldDefinitions) {
        const value = record[field.key];
        if (value != null && typeof value !== 'string' && typeof value !== 'number')
          throw new Error('Campo de rascunho inválido.');
        vehicle[field.key] = value == null ? '' : String(value);
      }
      if (record.p8 != null) vehicle.p8 = app.p8.decode(record.p8);
      return app.clearInapplicable(vehicle);
    });
    return {
      vehicles,
      selectedUid: uids.has(data.selectedUid) ? data.selectedUid : vehicles[0]?.uid || null,
      step:
        Number.isInteger(data.step) && data.step >= 0 && data.step < app.sections.length
          ? data.step
          : 0,
      // A antiga aba P8 agora é o próprio formulário; preservar o conteúdo e a etapa.
      tab: data.tab === 'planilha' ? 'planilha' : 'formulario',
    };
  };

  app.loadState = (storage) => {
    let raw = null;
    try {
      raw = (storage || globalThis.localStorage).getItem(app.STORAGE_KEY);
      return {
        state: raw ? app.decodeState(raw) : app.emptyState(),
        error: '',
        raw,
        blocked: false,
      };
    } catch (error) {
      console.error('Não foi possível recuperar o rascunho local:', error);
      return {
        state: app.emptyState(),
        raw,
        blocked: !!raw,
        error: raw
          ? 'O rascunho local não pôde ser lido. Baixe uma cópia de segurança antes de limpar os dados. O conteúdo original foi preservado.'
          : 'O armazenamento local está indisponível. As alterações ficam apenas nesta sessão; exporte o Excel antes de fechar.',
      };
    }
  };

  app.persistState = (state, storage) => {
    try {
      (storage || globalThis.localStorage).setItem(
        app.STORAGE_KEY,
        JSON.stringify({ version: 1, ...state }),
      );
      return '';
    } catch (error) {
      console.error('Não foi possível salvar o rascunho local:', error);
      return 'Não foi possível salvar neste navegador. O espaço pode estar cheio ou bloqueado. Exporte o Excel antes de fechar.';
    }
  };

  app.removeStoredState = (storage) => {
    try {
      (storage || globalThis.localStorage).removeItem(app.STORAGE_KEY);
      return '';
    } catch (error) {
      console.error('Não foi possível limpar o rascunho local:', error);
      return 'Não foi possível limpar o armazenamento. Os dados foram mantidos. Verifique as permissões do navegador.';
    }
  };
})();

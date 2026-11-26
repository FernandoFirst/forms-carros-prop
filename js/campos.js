(function () {
  'use strict';
  const app = (globalThis.Veiculos = globalThis.Veiculos || {});

  app.sections = [
    {
      key: 'identificacao',
      title: 'Identificação',
      short: 'Identificação',
      description: 'Comece com as informações que identificam esta configuração do veículo.',
      tip: 'Uma linha, uma configuração',
      help: 'Cadastre versões diferentes como veículos separados. Use uma referência que facilite a conferência com sua equipe.',
    },
    {
      key: 'fabricante',
      title: 'Dados do fabricante',
      short: 'Fabricante',
      description: 'Informe a empresa responsável pela fabricação do veículo.',
      tip: 'Use os dados do fabricante',
      help: 'Informe a razão social e o endereço da empresa fabricante, mesmo que a marca comercial seja diferente.',
    },
    {
      key: 'especificacoes',
      title: 'Especificações técnicas',
      short: 'Especificações',
      description: 'Detalhe a estrutura, as massas e o conjunto de transmissão.',
      tip: 'Confira as unidades',
      help: 'Massas em toneladas. Use vírgula ou ponto para decimais, sem separador de milhar. Marchas e eixos devem ser inteiros positivos.',
    },
    {
      key: 'sistemas',
      title: 'Sistemas do veículo',
      short: 'Sistemas',
      description: 'Descreva arrefecimento, freios e armazenamento de combustível.',
      tip: 'Responda somente o que se aplica',
      help: 'Ao selecionar “Não” ou remover a resposta, os detalhes relacionados são apagados. Se ainda não souber uma informação, deixe o campo em branco.',
    },
    {
      key: 'emissoes',
      title: 'Escapamento e emissões',
      short: 'Emissões',
      description: 'Finalize com as informações de escapamento, materiais e ventilação.',
      tip: 'Revise antes de exportar',
      help: 'Se um item não se aplicar ao veículo, descreva “Não se aplica”. Na aba da planilha você pode conferir e editar todos os veículos.',
    },
  ];

  // A posição neste dicionário é o contrato de exportação. Não ordenar pela etapa.
  app.fieldDefinitions = [
    {
      key: 'idReferencia',
      label: 'ID/Referência',
      short: 'ID / Referência',
      section: 'identificacao',
      required: true,
      placeholder: 'Ex.: 0001',
      help: 'Seu código de identificação. Os zeros à esquerda serão mantidos.',
    },
    {
      key: 'marca',
      label: 'Marca',
      section: 'identificacao',
      required: true,
      placeholder: 'Ex.: Volvo',
    },
    {
      key: 'modelo',
      label: 'Modelo',
      section: 'identificacao',
      required: true,
      placeholder: 'Ex.: FH 540',
    },
    {
      key: 'versao',
      label: 'Versão',
      section: 'identificacao',
      required: true,
      placeholder: 'Ex.: 6×4, ano-modelo 2026',
      help: 'Diferencie a configuração ou versão deste veículo.',
    },
    {
      key: 'fabricante',
      label: 'Fabricante — razão social',
      section: 'fabricante',
      placeholder: 'Razão social completa',
      wide: true,
    },
    {
      key: 'enderecoFabricante',
      label: 'Endereço completo do fabricante',
      section: 'fabricante',
      type: 'long',
      placeholder: 'Logradouro, número, cidade, estado, CEP e país',
      wide: true,
    },
    {
      key: 'tipoMaquina',
      label: 'Tipo de máquina/carroçaria',
      section: 'especificacoes',
      placeholder: 'Ex.: caminhão, escavadeira, trator',
      suggestions: [
        'Escavadeira',
        'Pá-carregadeira',
        'Trator de esteira',
        'Motoniveladora',
        'Retroescavadeira',
        'Rolo compactador',
        'Caminhão',
        'Outra',
      ],
    },
    {
      key: 'massaTotal',
      label: 'Massa total máxima indicada/autorizada (t)',
      short: 'Massa total máxima (t)',
      section: 'especificacoes',
      type: 'decimal',
      placeholder: 'Ex.: 23,5',
      help: 'Massa máxima indicada ou autorizada, em toneladas.',
    },
    {
      key: 'massaCombinada',
      label: 'Massa máxima combinada (t)',
      section: 'especificacoes',
      type: 'decimal',
      placeholder: 'Ex.: 74',
    },
    {
      key: 'temArrefecimento',
      label: 'O Veículo possui Sistema de Arrefecimento?',
      short: 'Possui sistema de arrefecimento?',
      section: 'sistemas',
      type: 'boolean',
      wide: true,
    },
    {
      key: 'descricaoArrefecimento',
      label: 'Se sim, informar descrição do sistema de arrefecimento',
      short: 'Descrição do arrefecimento',
      section: 'sistemas',
      type: 'long',
      condition: 'temArrefecimento',
    },
    {
      key: 'descricaoVentilacao',
      label: 'Se sim, Descrição do Sistema de Ventilação',
      short: 'Descrição da ventilação',
      section: 'sistemas',
      type: 'long',
      condition: 'temArrefecimento',
    },
    {
      key: 'componentesArrefecimento',
      label: 'Se sim, informar de Componentes do Sistema de Arrefecimento',
      short: 'Componentes do arrefecimento',
      section: 'sistemas',
      type: 'long',
      condition: 'temArrefecimento',
    },
    {
      key: 'localizacaoLinhaPP',
      label: 'Se sim, informar a localização no Veículo em relação à Linha PP',
      short: 'Localização em relação à Linha PP',
      section: 'sistemas',
      type: 'long',
      condition: 'temArrefecimento',
    },
    {
      key: 'temFreioCompressor',
      label: 'O Veículo possui Freio com Compressor?',
      short: 'Possui freio com compressor?',
      section: 'sistemas',
      type: 'boolean',
      wide: true,
    },
    {
      key: 'pressaoFreio',
      label: 'Se sim, informar a pressão maxima do sistema de freios',
      short: 'Pressão máxima dos freios',
      section: 'sistemas',
      type: 'pressure',
      condition: 'temFreioCompressor',
      placeholder: 'Ex.: 10,5 bar',
      help: 'Informe valor e unidade: bar, kPa, MPa, Pa, psi ou kgf/cm².',
    },
    {
      key: 'tipoTransmissao',
      label: 'Tipo de transmissão',
      section: 'especificacoes',
      placeholder: 'Selecione ou digite',
      suggestions: ['Manual', 'Automática', 'Automatizada', 'Hidráulica', 'Hidrostática', 'Outra'],
    },
    {
      key: 'numeroMarchas',
      label: 'Nº de marchas',
      section: 'especificacoes',
      type: 'integer',
      placeholder: 'Ex.: 12',
    },
    {
      key: 'relacaoConversor',
      label: 'Relação máxima do conversor de torque',
      section: 'especificacoes',
      placeholder: 'Ex.: 2,5:1',
    },
    {
      key: 'relacaoEixo',
      label: 'Relação do eixo traseiro',
      section: 'especificacoes',
      placeholder: 'Ex.: 3,08:1',
    },
    {
      key: 'tipoTracao',
      label: 'Tipo de tração',
      section: 'especificacoes',
      placeholder: 'Ex.: 4×2, 6×4',
    },
    {
      key: 'numeroEixos',
      label: 'Número de eixos',
      section: 'especificacoes',
      type: 'integer',
      placeholder: 'Ex.: 3',
    },
    {
      key: 'maisEixoTrator',
      label: 'O veiculo possui mais de um eixo trator?',
      short: 'Possui mais de um eixo trator?',
      section: 'especificacoes',
      type: 'boolean',
    },
    {
      key: 'capacidadeTanque',
      label: 'Capacidade do tanque (L)',
      section: 'sistemas',
      type: 'decimal',
      placeholder: 'Ex.: 600',
    },
    {
      key: 'posicaoReservatorio',
      label: 'Posição do reservatório',
      section: 'sistemas',
      placeholder: 'Ex.: lateral direita do chassi',
    },
    {
      key: 'materialReservatorio',
      label: 'Material Construtivo do reservatório',
      short: 'Material do reservatório',
      section: 'sistemas',
      placeholder: 'Ex.: alumínio',
    },
    {
      key: 'descricaoEscapamento',
      label: 'Descrição do sistema de escapamento',
      section: 'emissoes',
      type: 'long',
      wide: true,
    },
    {
      key: 'posicaoEscapamento',
      label: 'Posição das saídas de Escapamento',
      short: 'Posição das saídas de escapamento',
      section: 'emissoes',
      placeholder: 'Ex.: lateral, após o eixo traseiro',
    },
    {
      key: 'controlesEmissoes',
      label: 'Outros controles de emissões no escapamento',
      section: 'emissoes',
      type: 'long',
    },
    {
      key: 'gasArCondicionado',
      label: 'Tipo do Gás Utilizado no Ar Condicionado',
      short: 'Gás do ar-condicionado',
      section: 'emissoes',
      placeholder: 'Ex.: R-134a',
    },
    {
      key: 'componentesAmianto',
      label: 'Quais Componentes Utilizam Amianto em sua Composição',
      short: 'Componentes que utilizam amianto',
      section: 'emissoes',
      type: 'long',
    },
    {
      key: 'materialFibroso',
      label: 'Material fibroso em contato com gases do escapamento',
      section: 'emissoes',
      type: 'long',
    },
    {
      key: 'ventiladores',
      label: 'Ventilador(es): tipo/diâmetro/nº pás',
      section: 'emissoes',
      placeholder: 'Ex.: axial / 600 mm / 9 pás',
    },
  ].map((field) => Object.freeze({ type: 'text', required: false, ...field }));
  Object.freeze(app.fieldDefinitions);
  app.fieldsByKey = Object.fromEntries(app.fieldDefinitions.map((field) => [field.key, field]));

  app.isApplicable = (field, vehicle) => !field.condition || vehicle[field.condition] === 'Sim';

  app.clearInapplicable = (vehicle) => {
    for (const field of app.fieldDefinitions) {
      if (!app.isApplicable(field, vehicle)) vehicle[field.key] = '';
    }
    return vehicle;
  };

  app.createVehicle = () => ({
    uid:
      globalThis.crypto.randomUUID?.() ||
      Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join(''),
    ...Object.fromEntries(app.fieldDefinitions.map((field) => [field.key, ''])),
    savedAt: null,
  });
})();

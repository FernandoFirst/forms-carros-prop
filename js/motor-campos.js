(function () {
  'use strict';
  const motor = (globalThis.Motores = {});
  const sections = (motor.sections = [
    ['identificacao', 'Identificação', 'cadastro'],
    ['fabricantes', 'Fabricante / importador', 'cadastro'],
    ['configuracao', 'Configuração do motor', 'cadastro'],
    ['funcionamento', 'Características de funcionamento', 'cadastro'],
    ['eletronica', 'Gerenciamento eletrônico', 'cadastro'],
    ['mistura', 'Formação de mistura', 'cadastro'],
    ['admissao', 'Admissão e escapamento', 'cadastro'],
    ['antipoluicao', 'Dispositivos antipoluição', 'cadastro'],
    ['componentes', 'Relação de componentes', 'cadastro'],
    ['referencias', 'Referências complementares', 'cadastro'],
    ['ensaio', 'Motor do ensaio', 'emissao'],
    ['laboratorio', 'Laboratório e operadores', 'emissao'],
    ['normas', 'Normas utilizadas', 'emissao'],
    ['gases', 'Ensaio de emissão de gás de escapamento', 'emissao'],
    ['particulado', 'Ensaio de material particulado', 'emissao'],
    ['resultados', 'Resultados', 'emissao'],
    ['responsavel', 'Responsável técnico', 'emissao'],
  ].map(([key, title, tab]) => ({ key, title, tab })));
  // A organização de preenchimento é independente das seções do XLSX e das regras.
  motor.steps = [
    [
      'identificacao',
      'cadastro',
      'Identificação e origem',
      'Identifique o motor e informe quem fabrica ou importa.',
      ['identificacao', 'fabricantes'],
    ],
    [
      'configuracao',
      'cadastro',
      'Configuração do motor',
      'Informe cilindros, dimensões, arrefecimento e alimentação.',
      ['configuracao'],
    ],
    [
      'funcionamento',
      'cadastro',
      'Funcionamento',
      'Reúna rotações, temperaturas, torque e potência.',
      ['funcionamento'],
    ],
    [
      'injecao',
      'cadastro',
      'Injeção e controle',
      'Descreva os módulos eletrônicos e o sistema de combustível.',
      ['eletronica', 'mistura'],
    ],
    [
      'admissao',
      'cadastro',
      'Admissão e escape',
      'Detalhe o caminho do ar, as válvulas e seus comandos.',
      ['admissao'],
    ],
    [
      'antipoluicao',
      'cadastro',
      'Controle de emissões',
      'Informe os dispositivos antipoluição que o motor utiliza.',
      ['antipoluicao'],
    ],
    [
      'componentes',
      'cadastro',
      'Componentes',
      'Relacione os componentes. As referências de famílias são opcionais.',
      ['componentes', 'referencias'],
    ],
    [
      'ensaio',
      'emissao',
      'Motor do ensaio',
      'Identifique a unidade utilizada no ensaio.',
      ['ensaio'],
    ],
    [
      'laboratorio',
      'emissao',
      'Laboratório e normas',
      'Informe a equipe responsável e as normas utilizadas.',
      ['laboratorio', 'normas'],
    ],
    [
      'gases',
      'emissao',
      'Ensaio de gases',
      'Registre a data, as médias e as emissões medidas.',
      ['gases'],
    ],
    [
      'particulado',
      'emissao',
      'Material particulado',
      'Informe as massas inicial e final. Os resultados são calculados.',
      ['particulado'],
    ],
    [
      'resultados',
      'emissao',
      'Resultados',
      'Preencha as emissões específicas e anexe o print out.',
      ['resultados'],
    ],
    [
      'responsavel',
      'emissao',
      'Responsável técnico',
      'Informe o engenheiro, o CREA e o agente técnico.',
      ['responsavel'],
    ],
  ].map(([key, tab, title, description, sections]) => ({ key, tab, title, description, sections }));
  motor.stepForSection = (key) => motor.steps.find((step) => step.sections.includes(key));
  motor.initialSteps = () => ({ cadastro: 'identificacao', emissao: 'ensaio' });
  motor.decodeSteps = (steps) =>
    Object.fromEntries(
      ['cadastro', 'emissao'].map((tab) => [
        tab,
        motor.steps.some((step) => step.tab === tab && step.key === steps?.[tab])
          ? steps[tab]
          : motor.initialSteps()[tab],
      ]),
    );
  const fields = (motor.fields = []);
  let section;
  const group = (key) => {
    section = key;
  };
  const add = (key, label, type = 'text', options = {}) =>
    fields.push({ key, label, type, section, maxLength: 200, ...options });
  const text = (key, label, maxLength, options = {}) =>
    add(key, label, 'text', { maxLength, required: true, ...options });
  const long = (key, label, options = {}) =>
    add(key, label, 'long', { required: true, ...options });
  const number = (key, label, digits, decimals = 0, unit = '', options = {}) =>
    add(key, label, 'number', { digits, decimals, unit, required: true, ...options });
  const select = (key, label, choices, options = {}) =>
    add(key, label, 'select', { choices, required: true, ...options });
  const yes = (key, label) => select(key, label, ['Sim', 'Não']);
  const pdf = (key, label, options = {}) => add(key, label, 'pdf', { required: true, ...options });
  const when = (key, value = 'Sim') => ({ condition: [key, value] });

  group('identificacao');
  text('idReferencia', 'ID / referência do motor', 80, { required: false });
  text('configuracaoBaseMotor', 'Configuração base (referência)', 200, { required: false });
  text('marcaMotor', 'Marca', 20, { uppercase: true });
  text('modeloMotor', 'Modelo', 20, { uppercase: true });
  yes('importado', 'Motor importado?');
  for (const [key, label, value] of [
    ['tipoMotor', 'Tipo de motor', 'Combustão'],
    ['ignicao', 'Ignição', 'Compressão'],
    ['combustivel', 'Combustível', 'Diesel'],
    ['fase', 'Fase de atendimento', 'MAR1'],
    ['tipoAplicacao', 'Tipo de aplicação veicular', 'Máquina Agrícola / Rodoviária'],
  ])
    add(key, label, 'fixed', { default: value });

  group('fabricantes');
  text('nomeImportador', 'Importador', 200, when('importado'));
  text('enderecoImportador', 'Endereço do importador', 500, when('importado'));
  text('pais', 'País de procedência', 80, when('importado'));

  group('configuracao');
  number('numeroCilindros', 'Número de cilindros', 2, 0, '', { positive: true });
  number('valvulasCilindros', 'Número de válvulas por cilindro', 2, 0, '', { positive: true });
  text('disposicaoCilindros', 'Disposição dos cilindros', 30);
  number('diametroCilindros', 'Diâmetro dos cilindros', 3, 2, 'mm');
  number('cursoPistoes', 'Curso dos pistões', 3, 2, 'mm');
  number('deslocamentoVolumetrico', 'Deslocamento volumétrico', 5, 2, 'cm³');
  text('relacaoCompressao', 'Relação de compressão', 30);
  text('fluidoArrefecimento', 'Fluido de arrefecimento', 40);
  select('tipoAspiracao', 'Tipo de aspiração', ['Natural', 'Sobrealimentado']);
  select('tipoAlimentacao', 'Tipo de alimentação', ['Bomba Injetora', 'Common Rail', 'Outros']);
  long('descOutrosTiposAlimentacao', 'Descrição de outros tipos de alimentação', {
    maxLength: 100,
    ...when('tipoAlimentacao', 'Outros'),
  });
  pdf(
    'esquemaOutrosTiposAlimentacao',
    'Esquema de outros tipos de alimentação',
    when('tipoAlimentacao', 'Outros'),
  );
  number(
    'debitoCombustivelTorque',
    'Débito de combustível por curso à velocidade de torque máximo declarado',
    3,
    2,
    'mm³/ciclo',
  );
  number(
    'debitoCombustivelPotencia',
    'Débito de combustível mais elevado por curso à velocidade de potência máxima declarada',
    3,
    2,
    'mm³/ciclo',
  );
  pdf('desenhoCamaraCombustao', 'Desenhos da câmara de combustão e da cabeça do pistão');

  group('funcionamento');
  number('rotacaoMarchaLenta', 'Rotação da marcha lenta', 5, 0, 'RPM');
  number('varRotacaoMarchaLenta', 'Tolerância da marcha lenta', 4, 0, '± RPM');
  number('rotacaoCorteCarga', 'Rotação de corte em carga', 4, 0, 'RPM');
  number('rotacaoCorteSemCarga', 'Rotação de corte sem carga', 4, 0, 'RPM');
  number(
    'temperaturaMinimaOleoLubrificante',
    'Temperatura mínima do óleo lubrificante',
    3,
    0,
    '°C',
    { signed: true },
  );
  number(
    'temperaturaMaximaOleoLubrificante',
    'Temperatura máxima do óleo lubrificante',
    3,
    0,
    '°C',
    { signed: true },
  );
  number('depressaoMaximaAdmissao', 'Depressão máxima admissível na admissão', 4, 2, 'kPa');
  number('contrapressaoMaximaEscapamento', 'Contrapressão máxima no escapamento', 4, 2, 'kPa');
  number(
    'momentoForcaNmDiesel',
    'Momento de força efetivo líquido máximo — 100% Diesel',
    4,
    2,
    'Nm',
  );
  number('momentoForcaRpmDiesel', 'Rotação do momento de força máximo — 100% Diesel', 5, 0, 'RPM');
  number('potenciaEfetivaKwDiesel', 'Potência efetiva líquida máxima — 100% Diesel', 4, 2, 'kW');
  number('potenciaEfetivaRpmDiesel', 'Rotação da potência máxima — 100% Diesel', 5, 0, 'RPM');
  long(
    'procedimentoEstabilizacaoTemperatura',
    'Procedimento para estabilização da temperatura de funcionamento',
  );
  long('dispositivoAuxPartidaFrio', 'Dispositivo auxiliar de partida a frio', { required: false });

  group('eletronica');
  long(
    'moduloInjecaoIgnicao',
    'Marca, tipo, denominação e versão do software do módulo de controle da injeção e ignição',
  );
  long(
    'moduloControleTransmissao',
    'Marca, tipo e denominação do módulo de controle da transmissão',
    { required: false },
  );

  group('mistura');
  long('descricaoBombaInjetora', 'Marca, tipo e denominação da bomba injetora ou equivalente');
  text('codigoFuncaoControleInjecao', 'Código da função de controle de injeção', 20);
  number('vazaoMaximaBomba', 'Vazão máxima da bomba', 3, 2, 'mm³/ciclo');
  number('rotacaoMedidaVazaoMaxBomba', 'Rotação medida na vazão máxima da bomba', 6, 0, 'RPM');
  long('pontoInjecaoEstatico', 'Ponto de injeção estático');
  number('pressaoBicosInjetores', 'Pressão de abertura dos bicos injetores', 3, 2, 'MPa');
  pdf('esquemaAberturaBicos', 'Esquema de abertura dos bicos');
  long('marcaTipoRegulador', 'Marca, tipo e denominação do regulador ou equivalente');
  long('descricaoRegulador', 'Descrição do funcionamento do regulador');
  yes('bombaTransferencia', 'Possui bomba de transferência de combustível?');
  select(
    'tipoBombaTransferencia',
    'Tipo da bomba de transferência',
    ['Elétrica', 'Mecânica'],
    when('bombaTransferencia'),
  );
  long(
    'localizacaoBomba',
    'Localização da bomba de transferência de combustível',
    when('bombaTransferencia'),
  );
  number(
    'pressaoTrabalhoBomba',
    'Pressão de trabalho da bomba de transferência',
    3,
    2,
    'kPa',
    when('bombaTransferencia'),
  );
  pdf(
    'esquemaBomba',
    'Esquema da bomba de transferência de combustível',
    when('bombaTransferencia'),
  );

  group('admissao');
  text('filtroAr', 'Filtro de ar', 50);
  const turbo = when('tipoAspiracao', 'Sobrealimentado');
  select(
    'tipoSobrealimentador',
    'Tipo de sobrealimentador',
    ['Supercharger', 'Turbo Compressor'],
    turbo,
  );
  text('sobrealimentador', 'Sobrealimentador', 30, turbo);
  number(
    'pressaoMaximaSobrealimentador',
    'Pressão máxima de funcionamento do sobrealimentador',
    3,
    4,
    'kPa',
    turbo,
  );
  text('resfriadorAr', 'Resfriador de ar', 50);
  long('sistemaAdmissao', 'Descrição do sistema de admissão');
  pdf('esquemaAdmissao', 'Esquema do sistema de admissão');
  yes(
    'possuiSistemaVariacaoGeometriaIgnicao',
    'Possui sistema de variação da geometria da admissão?',
  );
  long(
    'geometriaAdmissao',
    'Sistema de variação da geometria da admissão',
    when('possuiSistemaVariacaoGeometriaIgnicao'),
  );
  pdf(
    'esquemaGeometriaAdmissao',
    'Esquema do sistema de variação da geometria da admissão',
    when('possuiSistemaVariacaoGeometriaIgnicao'),
  );
  number('valvulasAdmissao', 'Número de válvulas de admissão', 2);
  number('aberturaAdmissao', 'Abertura máxima de admissão', 3, 2, 'mm');
  number('valvulasEscape', 'Número de válvulas de escape', 2);
  number('aberturaEscape', 'Abertura máxima de escape', 3, 2, 'mm');
  number('arvoresComando', 'Número de árvores de comando de válvulas por carreira de cilindros', 2);
  long('sistemaControleValvulas', 'Localização e descrição do sistema de controle de válvulas');
  pdf('esquemaDiagramaComandosValvulas', 'Diagrama dos comandos de válvulas');

  group('antipoluicao');
  for (const [key, label, limit] of [
    ['gasesCarter', 'Recirculação dos gases do cárter', 200],
    ['gasesEscape', 'Recirculação dos gases do escape', 200],
    ['injecaoArEscape', 'Injeção de ar no escape', 200],
    ['outrosSistemasEmissoes', 'Outros sistemas de controle de emissões no escapamento', 50],
    ['outros', 'Outros dispositivos antipoluição', 200],
  ]) {
    add(key, label, limit === 50 ? 'text' : 'long', { maxLength: limit });
    const pdfKey = `esquema${key[0].toUpperCase()}${key.slice(1)}`;
    pdf(pdfKey, `Esquema: ${label.toLowerCase()}`, { required: false });
  }
  yes('filtroParticulas', 'Possui filtro de partículas?');
  text(
    'descricaoFiltroParticulasMotor',
    'Descrição do filtro de partículas',
    100,
    when('filtroParticulas'),
  );
  pdf('esquemaFiltroParticulasMotor', 'Esquema do filtro de partículas', when('filtroParticulas'));
  yes('catalisador', 'Possui catalisador?');
  number('quantidadeCatalisadores', 'Quantidade de catalisadores', 2, 0, '', {
    positive: true,
    ...when('catalisador'),
  });
  select('catalisadoresIguais', 'Catalisadores iguais?', ['Sim', 'Não'], {
    condition: ['quantidadeCatalisadores', '>1'],
  });

  group('referencias');
  text('familiaObdDiesel', 'Família OBD Diesel (se aplicável)', 200, { required: false });
  text('familiaKiMotor', 'Família Ki (se aplicável)', 200, { required: false });

  group('ensaio');
  add('gcMeAnoFabricacao', 'Ano de fabricação', 'year', { required: true, maxLength: 4 });
  text('gcMeNumeroMotor', 'Número do motor do ensaio', 17);
  select('gcMeCombustivelEnsaio', 'Combustível do ensaio', ['Diesel']);
  group('laboratorio');
  text('gcLoLaboratorio', 'Laboratório de emissões', 200);
  text('gcLoAnalista', 'Analista', 50);
  text('gcLoResponsavelEnsaio', 'Responsável pelo ensaio', 50);
  group('normas');
  text('gcNuEmissoesGasesEscapamento', 'Emissões de gases de escapamento', 40);
  text('gcNuConsumoCombustivel', 'Consumo de combustível', 40);
  text('gcNuEmissaoMaterialParticulado', 'Emissão de material particulado', 40);
  group('gases');
  add('gcCwData', 'Data do ensaio', 'date', { required: true });
  for (const [suffix, label, digits, decimals, unit] of [
    ['MediaVelocidadeAngular', 'Média da velocidade angular', 5, 0, 'RPM'],
    ['MediaCargaObservada', 'Média da carga observada', 5, 2, 'Nm'],
    ['MediaPressaoBarometrica', 'Média da pressão barométrica', 2, 2, 'kPa'],
    ['MediaDepressaoAdmissao', 'Média da depressão na admissão', 3, 2, 'kPa'],
    ['MediaVazaoArAdmissao', 'Média da vazão de ar na admissão', 3, 2, 'm³/h'],
    ['MediaConsumoCombustivel', 'Média do consumo de combustível', 3, 2, 'kg/min'],
    ['MediaContrapressaoEscape', 'Média da contrapressão no escape', 3, 2, 'kPa'],
    ['MediaConcentracaoCo2', 'Média da concentração medida de CO2', 3, 2, '%'],
    ['MediaConcentracaoCo', 'Média da concentração medida de CO', 3, 2, 'ppm'],
    ['MediaConcentracaoHc', 'Média da concentração medida de HC', 3, 2, 'ppm'],
    ['MediaConcentracaoNox', 'Média da concentração medida de NOx', 3, 2, 'ppm'],
    ['ConsumoEspecifico', 'Consumo específico', 3, 2, 'kg/kWh'],
    ['EmissaoEspecificaCo2', 'Emissão específica de CO2 no ensaio', 3, 2, 'mg/kWh'],
    ['MediaTempBulboSeco', 'Média da temperatura de bulbo seco', 3, 2, '°C'],
    ['MediaTempBulboUmido', 'Média da temperatura de bulbo úmido', 3, 2, '°C'],
    ['MediaTempArAdmissao', 'Média da temperatura do ar na admissão', 3, 2, '°C'],
    ['MediaTempCombustivelBureta', 'Média da temperatura do combustível na bureta', 3, 2, '°C'],
  ])
    number(`gcCw${suffix}`, label, digits, decimals, unit, {
      required: ['ConsumoEspecifico', 'EmissaoEspecificaCo2'].includes(suffix),
      signed: suffix.startsWith('MediaTemp'),
    });
  group('particulado');
  number('gcPwMassaInicialFiltroPrincipal', 'Massa inicial do filtro principal', 3, 4, 'mg');
  number('gcPwMassaFinalFiltroPrincipal', 'Massa final do filtro principal', 3, 4, 'mg');
  add('gcPwMassaFiltroPrincipal', 'Massa do particulado principal', 'calculated', { unit: 'mg' });
  number('gcPwMassaInicialFiltroSecundario', 'Massa inicial do filtro secundário', 3, 4, 'mg', {
    required: false,
  });
  number('gcPwMassaFinalFiltroSecundario', 'Massa final do filtro secundário', 3, 4, 'mg', {
    required: false,
  });
  add('gcPwMassaFiltroSecundario', 'Massa do particulado secundário', 'calculated', { unit: 'mg' });
  add('gcPwMassaTotalMp', 'Massa total de material particulado', 'calculated', { unit: 'mg' });
  pdf('gcPwPrintOut', 'Print out do ensaio de material particulado');
  group('resultados');
  for (const [suffix, label] of [
    ['Co', 'CO'],
    ['Co2', 'CO2'],
    ['Thc', 'THC'],
    ['Nox', 'NOx'],
    ['Mp', 'MP'],
  ])
    number(`gcRwEmissao${suffix}`, `Emissão específica de ${label}`, 3, 2, 'mg/kW.h');
  pdf('gcRwPrintOut', 'Print out do ensaio de resultados');
  group('responsavel');
  text('nomeEngenheiro', 'Nome do engenheiro técnico responsável', 80);
  text('creaEngenheiro', 'CREA', 15);
  select('atc', 'Agente técnico', ['IMT', 'CETESB']);
  text('quantidadeUnidades', 'Quantidade de unidades da solicitação', 80, { required: false });

  motor.byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
  motor.sectionByKey = Object.fromEntries(sections.map((item) => [item.key, item]));
  motor.collections = {
    fabricantes: {
      title: 'Fabricantes',
      singular: 'fabricante',
      fields: [
        ['nome', 'Fabricante', 'text', 200],
        ['endereco', 'Endereço do fabricante', 'text', 500],
      ],
    },
    componentes: {
      title: 'Componentes',
      singular: 'componente',
      fields: [
        ['componente', 'Componente', 'text', 200],
        ['atuacao', 'Atuação / localização', 'text', 200],
        ['item', 'Item', 'text', 200],
        ['quantidade', 'Quantidade', 'integer', 2],
        ['codigo', 'Código', 'text', 100],
        ['obd', 'OBD', 'select', ['Sim', 'Não', 'Não se aplica']],
      ],
    },
  };
})();

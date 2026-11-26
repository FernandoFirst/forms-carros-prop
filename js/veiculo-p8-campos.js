(function () {
  'use strict';
  const app = globalThis.Veiculos;
  const p = (app.p8 = { fields: [], steps: [], lists: [] });
  let step;
  let group = '';
  let condition;
  const stage = (key, title, area = 'Veículo', when) => {
    step = key;
    group = '';
    condition = when;
    p.steps.push({ key, title, area, condition });
  };
  const field = (key, label, type = 'text', options = {}) => {
    p.fields.push({
      key,
      label,
      type,
      step,
      group,
      condition,
      required: true,
      maxLength: 32767,
      ...options,
    });
  };
  const text = (key, label, maxLength = 100, options = {}) =>
    field(key, label, 'text', { maxLength, ...options });
  const long = (key, label, maxLength = 200, options = {}) =>
    field(key, label, 'long', { maxLength, ...options });
  const number = (key, label, digits, decimals, unit = '', options = {}) =>
    field(key, label, 'number', { digits, decimals, unit, ...options });
  const select = (key, label, choices, options = {}) =>
    field(key, label, 'select', { choices, ...options });
  const yesNo = (key, label, options = {}) => select(key, label, ['Sim', 'Não'], options);
  const pdf = (key, label, options = {}) => field(key, label, 'pdf', options);
  const base = (key, options = {}) => {
    const original = app.fieldsByKey[key];
    field(key, original.short || original.label, original.type, {
      ...original,
      step,
      group,
      condition: original.condition ? [original.condition, 'Sim'] : condition,
      base: true,
      required: true,
      ...options,
    });
  };
  const list = (key, title, columns, options = {}) =>
    p.lists.push({ key, title, columns, step, condition, required: true, ...options });
  const report = (key, label, options = {}) =>
    number(key, label, 3, 2, 'dB(A)', { report: true, ...options });
  const validation = (key, label, options = {}) =>
    text(key, label, 100, { report: true, ...options });

  stage('identificacao', 'Identificação');
  text('configuracaoBaseVeiculo', 'Configuração base', 100, { required: false });
  base('idReferencia');
  for (const key of ['marca', 'modelo', 'versao']) base(key, { maxLength: 23 });
  yesNo('importadoVeiculo', 'Veículo importado?');
  list('versoes', 'Versões adicionais', [{ key: 'versao', label: 'Versão', maxLength: 23 }], {
    required: false,
  });

  stage('origem', 'Fabricante e importador');
  base('fabricante');
  base('enderecoFabricante');
  for (const [key, label] of [
    ['nomeImportadorVeiculo', 'Importador'],
    ['enderecoImportadorVeiculo', 'Endereço do importador'],
    ['paisVeiculo', 'País de procedência'],
  ])
    text(key, label, 500, { condition: ['importadoVeiculo', 'Sim'] });

  stage('configuracao', 'Configuração do veículo');
  base('tipoMaquina', { label: 'Tipo da carroçaria', maxLength: 70 });
  number('numeroDePassageiros', 'Número de passageiros', 2, 0);
  base('massaTotal');
  base('massaCombinada');
  base('temArrefecimento');
  for (const key of ['descricaoArrefecimento', 'descricaoVentilacao'])
    base(key, { maxLength: 100 });
  base('componentesArrefecimento', { maxLength: 200 });
  base('localizacaoLinhaPP', {
    suggestions: [
      'Ventilador e Motor dianteiros',
      'Ventilador e Motor entre-eixos próximos ao eixo traseiro',
      'Ventilador e Motor traseiros',
      'Ventilador e motor entre-eixos próximos ao eixo dianteiro',
    ],
  });
  base('temFreioCompressor');
  base('pressaoFreio');

  stage('familias', 'Famílias');
  for (const [key, label] of [
    ['familiaKi', 'Família Ki'],
    ['familiaRde', 'Família RDE'],
    ['familiaDurabilidade', 'Família Durabilidade'],
    ['familiaIsc', 'Família ISC'],
  ])
    text(key, label, 100, { required: false });

  stage('transmissao', 'Transmissão');
  base('tipoTransmissao', { suggestions: ['Automática', 'CVT', 'Manual'] });
  base('numeroMarchas');
  long('caracteristicasTransAutomatica', 'Características da transmissão automática', 500, {
    condition: ['tipoTransmissao', 'Automática'],
  });
  pdf('esquemaTransmissao', 'Esquema da transmissão');
  base('relacaoConversor', { maxLength: 20 });
  base('relacaoEixo', { maxLength: 20 });
  base('tipoTracao', { maxLength: 20 });
  base('numeroEixos');
  base('maisEixoTrator');

  stage('reservatorio', 'Reservatório de combustível');
  base('capacidadeTanque');
  base('posicaoReservatorio', { maxLength: 50 });
  base('materialReservatorio', { maxLength: 50 });
  pdf('esquemaReservatorioCombustivel', 'Esquema do reservatório de combustível', {
    required: false,
  });

  stage('escapamento', 'Sistema de escapamento');
  number('numeroSaidasEscape', 'Número de saídas de escapamento', 2, 0, '', { positive: true });
  base('posicaoEscapamento', { type: 'long', maxLength: 200 });
  base('descricaoEscapamento', { maxLength: 100 });
  pdf('esquemaSistemaEscapamento', 'Esquema do sistema de escapamento');
  yesNo(
    'materialFibrosoContatoGasesEscape',
    'Material fibroso em contato com gases do escapamento?',
  );
  base('materialFibroso', {
    label: 'Descrição do material fibroso',
    maxLength: 200,
    condition: ['materialFibrosoContatoGasesEscape', 'Sim'],
  });
  pdf('esquemaMaterialFibroso', 'Esquema do material fibroso', {
    condition: ['materialFibrosoContatoGasesEscape', 'Sim'],
  });
  base('controlesEmissoes', { maxLength: 100, required: false });
  pdf(
    'esquemaOutrosSistControleEmissoesEscape',
    'Esquema dos outros sistemas de controle de emissões',
    { required: false },
  );

  stage('outras', 'Outras informações');
  base('gasArCondicionado', { maxLength: 100 });
  base('componentesAmianto', { maxLength: 100 });
  base('ventiladores', { required: false });

  stage('componentes', 'Relação de componentes');
  list('componentes', 'Componentes do veículo', [
    { key: 'componente', label: 'Componente' },
    { key: 'localizacao', label: 'Atuação/localização' },
    { key: 'item', label: 'Item' },
    {
      key: 'quantidade',
      label: 'Quantidade',
      type: 'number',
      digits: 6,
      decimals: 0,
      positive: true,
    },
    { key: 'codigo', label: 'Código' },
    { key: 'obd', label: 'OBD' },
  ]);

  stage('veiculoEnsaio', 'Veículo do ensaio', 'Pré-ruído');
  text('combustivelEnsaioRuido', 'Combustível utilizado no ensaio');
  field('idVersaoVeiculo', 'Marca/modelo/versão do ensaio', 'version');
  field('anoFabricacao', 'Ano de fabricação', 'year', { maxLength: 4 });
  text('chassi', 'Chassi (VIN)', 17, { uppercase: true, vin: true });
  number('pesoBrutoTotal', 'Peso bruto total', 2, 3, 't');
  number('comprimento', 'Comprimento', 2, 2, 'm');
  number('maximaPotencia', 'Máxima potência', 4, 2, 'kW');
  number('rotacaoMaximaPotencia', 'Rotação da máxima potência', 5, 0, 'RPM');
  yesNo('veicEnsaioPossuiMaisUmEixoTrator', 'Veículo do ensaio possui mais de um eixo trator?');
  long(
    'especificacaoPneus',
    'Pneu: tipo/designação/quantidade/pressão/profundidade do sulco/composto/nível de ruído (menor valor encontrado)',
  );

  p.categories = [
    ['M2E', 'Passageiros · PBT > 3.850 até 5.000 kg · Pn até 135 kW'],
    ['M2F', 'Passageiros · PBT > 3.850 até 5.000 kg · Pn > 135 kW'],
    ['M3A', 'Passageiros · PBT > 5.000 kg · Pn até 150 kW'],
    ['M3B', 'Passageiros · PBT > 5.000 kg · Pn > 150 até 250 kW'],
    ['M3C', 'Passageiros · PBT > 5.000 kg · Pn > 250 kW'],
    ['N2C', 'Carga · PBT > 3.850 até 12.000 kg · Pn até 135 kW'],
    ['N2D', 'Carga · PBT > 3.850 até 12.000 kg · Pn > 135 kW'],
    ['N3A', 'Carga · PBT > 12.000 kg · Pn até 150 kW'],
    ['N3B', 'Carga · PBT > 12.000 kg · Pn > 150 até 250 kW'],
    ['N3C', 'Carga · PBT > 12.000 kg · Pn > 250 kW'],
  ];
  // Somente perguntas e opções presentes no HTML. Resultados oficiais são transcritos do relatório.
  const testData = (key, title, suffix, when, print) => {
    stage(key, title, 'Pré-ruído', when);
    text(`numeroEnsaio${suffix}`, 'Número do ensaio', 20);
    field(`dataEnsaio${suffix}`, 'Data do ensaio', 'date');
    if (print) pdf(print, 'Print out do ensaio');
  };
  const locationData = (key, title, suffix, when, stationary = false) => {
    stage(key, title, 'Pré-ruído', when);
    group = 'Pista de provas';
    text(`empresaPistaProvas${suffix}`, 'Empresa da pista de provas', 200);
    text(`enderecoEmpresaPistaProvas${suffix}`, 'Endereço da empresa', 500);
    long(
      stationary ? 'descricaoPistaProvaEnsaioParado' : `descricaoPistaProvas${suffix}`,
      'Descrição da pista de provas',
    );
    long(
      stationary
        ? 'caracSuperficiePistaEnsaioParado'
        : suffix
          ? `caractSuperficiePistaProvas${suffix}`
          : 'caracteristicasSuperficiePista',
      'Características da superfície da pista de provas',
    );
    pdf(
      stationary ? 'esquemaPistaProvaEnsaioParado' : `esquemaPistaProvas${suffix}`,
      'Esquema da pista de provas',
      { required: false },
    );
    group = 'Instrumentação';
    text(`medidorNivelSonoro${suffix}`, 'Medidor de nível sonoro', 40);
    if (when) text(`numeroSerieMedidorSonoro${suffix}`, 'Número de série', 40);
    text(when ? `descricaoCalibrador${suffix}` : `calibrador${suffix}`, 'Calibrador', 40);
    if (when) text(`medidorVelocidadeAngular${suffix}`, 'Medidor de velocidade angular', 40);
    long(
      suffix ? `descricaoOutrosInstrumUtilizados${suffix}` : 'outrosInstrumentosUtilizados',
      'Outros instrumentos utilizados, inclusive meteorológicos',
      200,
      { required: !when },
    );
    group = 'Condições climáticas';
    number(`velocidadeVento${suffix}`, 'Velocidade do vento', 2, 2, 'm/s');
    text(`direcaoVento${suffix}`, 'Direção do vento', 40);
    number(`temperaturaAr${suffix}`, 'Temperatura do ar', 2, 2, '°C', { signed: true });
    number(`pressaoBarometrica${suffix}`, 'Pressão barométrica', 3, 3, 'kPa');
    number(`umidadeRelativa${suffix || 'Ar'}`, 'Umidade relativa do ar', 3, 2, '%', { max: 100 });
    if (!stationary && suffix !== 'EnsaioCompressorFreios')
      number(
        `temperaturaSuperficiePista${suffix}`,
        'Temperatura da superfície da pista',
        2,
        2,
        '°C',
        { signed: true },
      );
    if (stationary) text('posicaoMicrofoneEnsaioParado', 'Posicionamento do microfone', 100);
    group = 'Responsável pelo ensaio';
    text(`nomeResponsavelEnsaio${suffix.replace('Ensaio', '')}`, 'Nome do responsável', 80);
    text(`cargoResponsavelEnsaio${suffix.replace('Ensaio', '')}`, 'Cargo do responsável', 40);
    text(`empresaResponsavelEnsaio${suffix.replace('Ensaio', '')}`, 'Empresa do responsável', 200);
  };

  testData('acelerado', 'Ensaio acelerado', '', null, 'printOutEnsaioAcelerado');
  select(
    'categoriaVeiculo',
    'Categoria do veículo',
    p.categories.map(([code]) => code),
  );
  locationData('aceleradoLocal', 'Acelerado: pista e condições', '');
  stage('aceleradoResultados', 'Acelerado: resultados', 'Pré-ruído');
  number('ruidoFundoAntes', 'Ruído de fundo antes do ensaio', 3, 2, 'dB(A)');
  number('ruidoFundoDepois', 'Ruído de fundo depois do ensaio', 3, 2, 'dB(A)');
  const resultColumns = [
    { key: 'marcha', label: 'Marcha' },
    { key: 'velocidadeEntrada', label: 'Vel. entrada' },
    { key: 'velocidadeAngularEntrada', label: 'Vel. angular entrada' },
    { key: 'velocidadeSaida', label: 'Vel. saída' },
    { key: 'velocidadeAngularSaida', label: 'Vel. angular saída' },
    { key: 'mediaLD', label: 'Média LD' },
    { key: 'mediaLE', label: 'Média LE' },
    { key: 'resultadoIntermediario', label: 'Resultado intermediário' },
  ].map((column, index) =>
    index ? { type: 'number', digits: 8, decimals: 3, ...column } : column,
  );
  list('resultadoAceleracao', 'Resultados em aceleração', resultColumns);
  list('resultadoVelocidadeConstante', 'Resultados em velocidade constante', resultColumns);
  report('resultadoFinalEnsaioAcelerado', 'Resultado final do ensaio acelerado');

  testData('parado', 'Ensaio parado', 'Parado', null, 'printOutEnsaioParado');
  locationData('paradoLocal', 'Parado: pista e condições', 'EnsaioParado', null, true);
  stage('paradoResultados', 'Parado: medições e resultados', 'Pré-ruído');
  number('velocidadeAngular', 'Velocidade angular', 5, 2, 'RPM');
  number('nivelRuidoFundoEnsaioParado', 'Nível de ruído de fundo', 3, 2, 'dB(A)');
  for (const [ordinal, label] of [
    ['primeira', '1ª'],
    ['segunda', '2ª'],
    ['terceira', '3ª'],
  ])
    number(`${ordinal}Medicao`, `${label} medição`, 3, 2, 'dB(A)');
  field('mediaMedicoes', 'Média aritmética das três medições', 'calculated', { unit: 'dB(A)' });
  report('resultadoFinalEnsaioParado', 'Resultado final do ensaio parado');
  report('valorFiscalizacao', 'Valor para fiscalização');

  const cooling = ['temArrefecimento', 'Sim'];
  testData('arrefecimento', 'Arrefecimento: ensaio', 'Arrefecimento', cooling);
  locationData(
    'arrefecimentoLocal',
    'Arrefecimento: pista e condições',
    'EnsaioArrefecimento',
    cooling,
  );
  for (const state of ['Desligado', 'Ligado']) {
    stage(`ventilador${state}`, `Ventilador ${state.toLowerCase()}`, 'Pré-ruído', cooling);
    for (const [prefix, label, unit, digits, decimals] of [
      ['rotacaoMotorVentilador', 'Rotação do motor', 'RPM', 5, 0],
      ['rotacaoDoVentiladorComVentilador', 'Rotação do ventilador', 'RPM', 5, 0],
      ['ruidoLadoEsquerdoVentilador', 'Ruído — lado esquerdo', 'dB(A)', 3, 2],
      ['ruidoLadoDireitoVentilador', 'Ruído — lado direito', 'dB(A)', 3, 2],
    ]) {
      group = label;
      for (const [ordinal, count] of [
        ['Primeira', '1ª'],
        ['Segunda', '2ª'],
        ['Terceira', '3ª'],
      ])
        number(`${prefix}${state}${ordinal}Medicao`, `${count} medição`, digits, decimals, unit);
      if (prefix.startsWith('ruido')) {
        validation(`${prefix}${state}Valido`, 'Validação informada no relatório');
        report(
          `resultado${prefix[0].toUpperCase()}${prefix.slice(1)}${state}`,
          'Resultado informado no relatório',
        );
      }
    }
  }
  stage('arrefecimentoResultados', 'Arrefecimento: resultados', 'Pré-ruído', cooling);
  report('resultadoRuidoVentiladorDesligado', 'Ventilador desligado');
  report('resultadoRuidoVentiladorLigado', 'Ventilador ligado');
  number('ruidoFundoEnsaioArrefecimento', 'Ruído de fundo', 3, 2, 'dB(A)');
  report('resultadoLVent', 'Lvent');

  const brakes = ['temFreioCompressor', 'Sim'];
  testData('compressor', 'Compressor de freios: ensaio', 'CompressorFreios', brakes);
  locationData(
    'compressorLocal',
    'Compressor: pista e condições',
    'EnsaioCompressorFreios',
    brakes,
  );
  stage('compressorMedicoes', 'Compressor: rotação e pressão', 'Pré-ruído', brakes);
  for (const [prefix, label, digits, decimals, unit] of [
    ['rotacaoMarchaLenta', 'Rotação em marcha lenta', 5, 0, 'RPM'],
    ['maximaPressao', 'Máxima pressão', 3, 3, 'kPa'],
  ]) {
    group = label;
    for (const [ordinal, count] of [
      ['Primeira', '1ª'],
      ['Segunda', '2ª'],
      ['Terceira', '3ª'],
      ['Quarta', '4ª'],
    ])
      number(`${prefix}${ordinal}Medicao`, `${count} medição`, digits, decimals, unit);
  }
  for (const [position, count] of [
    ['Dois', '2'],
    ['Seis', '6'],
  ]) {
    stage(`descarga${position}`, `Descarga de serviço: posição ${count}`, 'Pré-ruído', brakes);
    const prefix = `descargaServicoPosicao${position}`;
    for (const [ordinal, label] of [
      ['Primeira', '1ª'],
      ['Segunda', '2ª'],
      ['Terceira', '3ª'],
      ['Quarta', '4ª'],
    ])
      number(`${prefix}${ordinal}Medicao`, `${label} medição`, 3, 2, 'dB(A)', {
        required: ['Primeira', 'Segunda'].includes(ordinal),
      });
    validation(`${prefix}PrimeiraValidacao`, '1ª validação');
    validation(`${prefix}SegundaValidacao`, '2ª validação', { required: false });
    for (const [ordinal, label] of [
      ['Primeiro', '1º'],
      ['Segundo', '2º'],
      ['Terceiro', '3º'],
      ['Quarto', '4º'],
    ])
      report(`${prefix}${ordinal}Resultado`, `${label} resultado`, {
        required: ['Primeiro', 'Segundo'].includes(ordinal),
      });
    report(`${prefix}ResultadoR`, 'Resultado R');
    report(`${prefix}ResultadoParcial`, 'Resultado parcial');
  }
  stage('compressorResultados', 'Compressor: resultado final', 'Pré-ruído', brakes);
  report('resultadoFinalEnsaioCompressorFreios', 'Resultado final');
  validation('validacaoFinalEnsaioCompressorFreios', 'Validação final');

  stage('responsavel', 'Documentos e responsável técnico', 'Documentos');
  text('referenciaMotor', 'Referência / LCVM do motor utilizado', 100);
  pdf('contratoAutorizacaoMotor', 'Contrato ou autorização para uso do motor', {
    help: 'Carta da detentora da LCVM, em papel timbrado e com assinatura digital, informando a LCVM e autorizando a aplicação.',
  });
  pdf('procuracaoContratoSocial', 'Procuração ou contrato social da empresa cedente do motor');
  text('nomeEngenheiro', 'Nome do engenheiro técnico responsável', 80);
  text('creaEngenheiro', 'CREA', 15);
  select('atc', 'Agente técnico', ['IMT', 'CETESB']);
  p.byKey = Object.fromEntries(p.fields.map((item) => [item.key, item]));
})();

# Levantamento Técnico de Veículos — V1

> Documento de escopo e implementação para o Codex. Idioma da aplicação: português brasileiro.

## 1. Visão geral

Criar uma aplicação web simples, responsiva e intuitiva para coletar dados técnicos de veículos junto a clientes, substituindo o preenchimento manual de uma planilha extensa. A solução deverá permitir **cadastrar vários veículos**, preencher seus dados em **formulário por etapas**, **visualizar e editar os mesmos dados em uma aba no formato de planilha** e **exportar um arquivo Excel `.xlsx` padronizado**.

**Prioridade da V1:** concluir o fluxo de dados gerais do veículo (34 colunas). O cadastro dinâmico de componentes por localização, inspirado nas telas do sistema de origem, deve ser previsto na arquitetura e implementado posteriormente (V1.1/V2), sem bloquear a V1.

### Objetivo

- Reduzir erros e atrito no preenchimento pelo cliente.
- Padronizar campos, respostas, validações e ordem das colunas.
- Permitir revisão e correção antes do envio.
- Gerar um XLSX pronto para uso pela equipe interna, sem exigir backend.

### Usuários

- **Cliente:** cadastra e revisa um ou mais veículos; exporta a planilha preenchida.
- **Equipe interna:** recebe o XLSX e utiliza os dados na rotina de cadastro/conferência.

## 2. Tecnologias e restrições

- HTML5, CSS3 e JavaScript vanilla (sem framework obrigatório).
- Aplicação estática, executável localmente no navegador ou hospedável em servidor estático.
- Usar biblioteca apropriada para gerar XLSX, como **SheetJS (`xlsx`)**; se a versão escolhida não oferecer os recursos de estilo necessários, avaliar **ExcelJS** no build da V1. A exportação deve gerar um **arquivo XLSX de verdade**, não apenas CSV renomeado.
- Não exigir login, banco de dados ou API na V1.
- Persistir rascunho com `localStorage` (deixar claro que é local a este navegador/dispositivo, não sincronizado e não é armazenamento definitivo).
- Não enviar dados para serviços externos; se bibliotecas vierem de CDN, documentar a dependência de internet e preferir uma distribuição local para operação offline.

## 3. Experiência visual (UX/UI)

Visual corporativo, moderno e minimalista, sem excesso de efeitos:

- Topo com título **Levantamento Técnico de Veículos** e subtítulo explicativo.
- Abas principais: **Formulário** | **Visualizar Planilha**.
- No formulário, navegação guiada com progresso por etapas (ex.: `Etapa 2 de 5`).
- Campos agrupados por assunto, bem espaçados, com textos de ajuda quando necessário.
- Indicar campos obrigatórios, informações faltantes e erros de formato.
- Botões claros: **Voltar**, **Próximo**, **Salvar veículo**, **Novo veículo**, **Exportar Excel**.
- Layout responsivo: formulário em uma coluna no celular; planilha com rolagem horizontal.
- Usar barra de ferramentas fixa ou visível para troca de veículo e exportação quando adequado.

### Abas e responsabilidades

#### Aba 1 — Formulário

- Selecionar veículo existente ou clicar em **Novo veículo**.
- Preencher as informações em etapas temáticas.
- Salvar veículo na lista de registros.
- Voltar às etapas anteriores sem perder dados.
- Ao escolher **Não** em perguntas condicionais, ocultar os campos correspondentes e garantir que não sejam exportados valores antigos desses campos.
- Mostrar confirmação de salvamento e quantidade total de veículos cadastrados.
- Permitir editar e excluir veículos, com confirmação na exclusão.

#### Aba 2 — Visualizar Planilha

- Mostrar uma tabela com **uma linha por veículo** e **as 34 colunas exatamente na ordem definida na seção 5**.
- Cabeçalhos longos com quebra de linha e `title`/tooltip, sem cortar informação de forma irreversível.
- Rolagem horizontal sem esmagar colunas; congelar visualmente as colunas de referência/identificação se for viável.
- Permitir **edição direta das células**, sincronizando imediatamente com o formulário.
- Para valores Sim/Não, usar dropdown; para numéricos, validar formato; preservar códigos como texto.
- Filtros/pesquisa por ID/Referência, marca, modelo e fabricante.
- Exibir indicadores: total de veículos e quantidade de registros incompletos.
- Botão **Exportar Excel** disponível nesta aba.
- Exibir estado vazio com orientação para cadastrar o primeiro veículo.

**Regra de ouro:** formulário, tabela e exportação devem compartilhar **a mesma fonte de dados no JavaScript**. Não duplicar estado ou manter tabelas independentes.

## 4. Fluxo principal

1. Cliente abre `index.html` (ou URL hospedada).
2. Clica em **Novo veículo** e preenche o formulário em cinco etapas.
3. Salva o registro e pode adicionar quantos veículos precisar.
4. Abre **Visualizar Planilha** para conferir o conjunto.
5. Corrige alguma célula; a alteração aparece no formulário do mesmo veículo.
6. Clica em **Exportar Excel**.
7. Recebe um `.xlsx` contendo todos os veículos, com uma linha por veículo e a ordem original de colunas.

## 5. Dicionário oficial de campos — ordem exata de exportação

**Atenção:** não alterar, resumir ou reordenar os cabeçalhos na exportação. Utilizar os títulos abaixo como strings oficiais. No formulário, é permitido mostrar rótulos curtos, desde que o mapeamento para exportação seja inequívoco.

| Nº | Cabeçalho oficial de exportação | Etapa | Tipo sugerido |
|---:|---|---|---|
| 1 | ID/Referência | Identificação | Texto |
| 2 | Marca | Identificação | Texto |
| 3 | Modelo | Identificação | Texto |
| 4 | Versão | Identificação | Texto |
| 5 | Fabricante — razão social | Fabricante | Texto |
| 6 | Endereço completo do fabricante | Fabricante | Texto longo |
| 7 | Tipo de máquina/carroçaria | Especificações | Texto |
| 8 | Massa total máxima indicada/autorizada (t) | Especificações | Número decimal |
| 9 | Massa máxima combinada (t) | Especificações | Número decimal |
| 10 | O Veículo possui Sistema de Arrefecimento? | Sistemas | Sim/Não |
| 11 | Se sim, informar descrição do sistema de arrefecimento | Sistemas | Texto longo, condicional |
| 12 | Se sim, Descrição do Sistema de Ventilação | Sistemas | Texto longo, condicional |
| 13 | Se sim, informar de Componentes do Sistema de Arrefecimento | Sistemas | Texto longo, condicional |
| 14 | Se sim, informar a localização no Veículo em relação à Linha PP | Sistemas | Texto longo, condicional |
| 15 | O Veículo possui Freio com Compressor? | Sistemas | Sim/Não |
| 16 | Se sim, informar a pressão maxima do sistema de freios | Sistemas | Texto com valor e unidade, condicional |
| 17 | Tipo de transmissão | Especificações | Texto/seleção |
| 18 | Nº de marchas | Especificações | Inteiro |
| 19 | Relação máxima do conversor de torque | Especificações | Texto |
| 20 | Relação do eixo traseiro | Especificações | Texto |
| 21 | Tipo de tração | Especificações | Texto |
| 22 | Número de eixos | Especificações | Inteiro |
| 23 | O veiculo possui mais de um eixo trator? | Especificações | Sim/Não |
| 24 | Capacidade do tanque (L) | Sistemas | Número decimal |
| 25 | Posição do reservatório | Sistemas | Texto |
| 26 | Material Construtivo do reservatório | Sistemas | Texto |
| 27 | Descrição do sistema de escapamento | Emissões | Texto longo |
| 28 | Posição das saídas de Escapamento | Emissões | Texto |
| 29 | Outros controles de emissões no escapamento | Emissões | Texto longo |
| 30 | Tipo do Gás Utilizado no Ar Condicionado | Emissões | Texto |
| 31 | Quais Componentes Utilizam Amianto em sua Composição | Emissões | Texto longo |
| 32 | Material fibroso em contato com gases do escapamento | Emissões | Texto longo |
| 33 | Ventilador(es): tipo/diâmetro/nº pás | Emissões | Texto |

**Nota de consistência:** a tabela original enviada contém **33 cabeçalhos**, não 34. A contagem exata acima foi feita campo a campo. Toda a implementação deverá considerar **33 campos**, salvo inclusão expressa de uma coluna nova no futuro. Não inventar uma 34ª coluna.

### Etapas sugeridas (ordem da interface, independente da ordem do XLSX)

1. **Identificação:** campos 1–4.
2. **Fabricante:** campos 5–6.
3. **Especificações técnicas:** campos 7–9 e 17–23.
4. **Sistemas do veículo:** campos 10–16 e 24–26.
5. **Escapamento e emissões:** campos 27–33.

### Regras condicionais

- Campo 10 = **Sim** → mostrar campos 11–14. Campo 10 = **Não** → ocultar, limpar e exportar campos 11–14 vazios.
- Campo 15 = **Sim** → mostrar campo 16. Campo 15 = **Não** → ocultar, limpar e exportar campo 16 vazio.
- Validar números não negativos para massas, capacidade do tanque e pressão quando aplicável; números inteiros positivos para marchas e eixos.
- Para a pressão do freio, preservar unidade no texto ou criar subcampos `valor` e `unidade` e consolidá-los **em uma única célula** no XLSX.
- Campos de código/referência são strings, inclusive zeros à esquerda.
- Adotar uma política clara de campos obrigatórios: inicialmente tornar **ID/Referência, Marca, Modelo e Versão** obrigatórios no salvamento final; os demais podem ficar pendentes, com indicação de incompletude, até validação com a equipe de negócio. Os campos condicionais devem ser exigidos apenas quando aplicáveis, se essa regra for habilitada no futuro.

## 6. Modelo de dados

Preferir uma definição única `fieldDefinitions` para renderização, validação, tabela e exportação:

```js
const fieldDefinitions = [
  {
    key: 'idReferencia',
    label: 'ID/Referência',
    section: 'identificacao',
    type: 'text',
    required: true,
  },
  // ...todos os outros 32 campos, na ordem oficial de exportação.
];

const vehicle = {
  uid: crypto.randomUUID(), // identificador interno; NÃO exportar como coluna extra
  idReferencia: '',
  marca: '',
  modelo: '',
  versao: '',
  // ...campos restantes
};
```

As telas e a exportação devem ser geradas a partir das mesmas definições, evitando divergência na nomenclatura e sequência. `uid` é identificador técnico interno, não substituir `ID/Referência`.

## 7. Exportação para Excel

**Nome sugerido:** `levantamento_tecnico_veiculos_YYYY-MM-DD.xlsx`.

**Aba:** `Veículos`.

Requisitos:

- Criar **uma linha por veículo**.
- Usar **os 33 cabeçalhos oficiais** e exatamente a sequência da seção 5.
- Cabeçalho com fundo azul-escuro e texto branco em negrito, com quebra de linha.
- AutoFilter na linha de cabeçalho.
- Congelar primeira linha, quando suportado pela biblioteca escolhida.
- Colunas com larguras adequadas (sem torná-las absurdamente largas; possibilitar quebra de linha).
- Massas e litros exportados como números; códigos e referências como texto.
- Nenhuma coluna técnica interna (`uid`, estado da interface etc.) no XLSX.
- Campos sem resposta como células vazias (não gravar `undefined`, `null` ou `NaN`).
- Escapar textos de maneira segura; não permitir que conteúdo preenchido gere execução de fórmulas não intencionais.
- Se a biblioteca não permitir estilo/congelamento, **não simular que permite**: usar biblioteca que suporte ou registrar a limitação de forma explícita.

## 8. Persistência e confiabilidade

- Autosave em `localStorage` para os veículos e edição em andamento.
- Mostrar aviso discreto: **“Rascunho salvo neste navegador. Exporte o Excel para manter uma cópia.”**
- Adicionar opção **Limpar dados**, com confirmação explícita.
- Validar dados tanto no formulário quanto na edição em grade.
- Manter conteúdo do formulário ao navegar entre abas.
- Garantir que atualizar a página não apague registros, salvo limpeza manual.
- Não armazenar informações sensíveis desnecessárias nem inserir analytics por padrão.

## 9. Estrutura de arquivos sugerida

```text
levantamento-tecnico-veiculos/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── campos.js       # Dicionário único dos 33 campos
│   ├── app.js          # Estado, abas e CRUD dos veículos
│   ├── formulario.js   # Etapas e condicionais
│   ├── planilha.js     # Grade editável, busca e filtros
│   ├── validacao.js    # Regras de validação
│   ├── storage.js      # Persistência local
│   └── exportacao.js   # Geração do XLSX
├── vendor/             # Bibliotecas locais, se necessário
└── README.md
```

## 10. Backlog futuro — componentes dinâmicos por localização

As telas do sistema de origem mostram um cadastro de componente associado a **Atuação/Localização** e **Item**. Planejar uma terceira aba futura, **Componentes**, com possibilidade de repetir registros para cada veículo.

Campos inicialmente desejados por componente:

- **Veículo vinculado** (identificador interno).
- **Atuação/Localização** (lista controlada; exemplo conhecido: `Admissão`, `Dispositivo Auxiliar de Partida a Frio`; lista completa ainda precisa ser confirmada no sistema de origem).
- **Item** (lista do sistema: `Filtro`, `Resfriador de Ar`, `Sobrealimentador`, `Sensor`, `Válvula`, `Outros`).
- **Componente** (nome/descrição).
- **Quantidade**.
- **Código** (texto; preservar zeros à esquerda).
- **Fabricante**.
- Possível flag **É OBD?**, se confirmada como necessária para o processo.

Comportamento futuro: botão **Adicionar componente**, lista repetível, edição/remoção, filtros por localização, e segunda aba no XLSX chamada `Componentes` com **uma linha por componente**. Não misturar essa estrutura com as 33 colunas dos dados gerais.

**Importante:** não inventar a lista completa de localizações sem uma fonte confiável. Definir opções em configuração editável para expansão posterior.

## 11. Critérios de aceite da V1

- [ ] O formulário apresenta cinco etapas, com navegação funcional.
- [ ] Todos os **33 campos oficiais** estão presentes e mapeados corretamente.
- [ ] Perguntas condicionais de arrefecimento e freio funcionam e limpam dados inaplicáveis.
- [ ] É possível cadastrar, alternar, editar e excluir múltiplos veículos.
- [ ] Existe uma aba **Visualizar Planilha** com 33 colunas, rolagem horizontal e edição em células.
- [ ] Alterações feitas na tabela aparecem no formulário e vice-versa.
- [ ] A busca por ID, marca, modelo e fabricante funciona.
- [ ] Existe validação de obrigatórios e formatos numéricos.
- [ ] O rascunho é preservado após recarregar a página.
- [ ] O arquivo `.xlsx` contém uma linha por veículo e os 33 cabeçalhos exatos, na ordem.
- [ ] XLSX abre normalmente no Microsoft Excel e mantém os dados esperados.
- [ ] A interface funciona em desktop e mobile.
- [ ] Há um README com instruções para executar e testar.

## 12. Instrução para o Codex

Implemente a V1 descrita neste README como um projeto funcional, não apenas um mockup visual. Priorize o fluxo ponta a ponta: cadastro de múltiplos veículos → edição no formulário e na planilha → persistência local → exportação XLSX. Use CSS moderno, componentes visuais consistentes, responsividade e mensagens de validação úteis. Crie os arquivos previstos, configure as dependências e documente como executar. Evite backend desnecessário. **Não implemente ainda a aba Componentes**; apenas mantenha a arquitetura preparada. Faça testes manuais ou automatizados dos fluxos críticos e verifique que a exportação preserva exatamente os 33 cabeçalhos fornecidos.

# Levantamento Técnico de Veículos e Motores

Aplicação estática em **HTML, CSS e JavaScript vanilla** para coletar dados técnicos de vários veículos e motores diesel MAR1, revisar os registros e exportar Excel formatado. Sem backend, login ou envio de informações para terceiros. Os motores também permitem anexar PDFs guardados localmente no navegador.

A interface segue a identidade do **Portal de Emails FIRST** (`auto-mail-master`): cabeçalho e rodapé em azul-marinho `#1D2D45`, ações em azul `#2563EB`, superfícies claras e faixa institucional verde, amarela, azul e vermelha. O símbolo FIRST está em arquivo local, e a tipografia usa Segoe UI/system UI, mantendo o funcionamento offline.

## Executar

**Para usar:** abra `index.html` em um navegador atual, mantendo as pastas `assets`, `css`, `js` e `vendor` ao lado do arquivo. Não precisa instalar Node.js nem ter internet. A distribuição local do ExcelJS e sua licença já estão em `vendor/`.

**Para desenvolver:** use Node.js 22 ou superior e npm. O ambiente foi validado com Node.js 24 e Google Chrome.

```sh
npm ci
npm start
```

Abra **http://127.0.0.1:4173**. Encerre com `Ctrl+C`. O servidor de desenvolvimento escuta somente no computador local. Não existe etapa de build da aplicação. A variável opcional `PORT` altera a porta; nenhum segredo ou `.env` é necessário.

Caso o cache global do npm esteja bloqueado no Windows, use `npm ci --cache .npm-cache`.

Para hospedar, os mesmos arquivos públicos podem ser servidos por qualquer servidor estático. As ferramentas, testes, `node_modules` e modelo de referência não precisam ser publicados.

## Publicar no Vercel pelo GitHub

O projeto está configurado para publicação estática com `vercel.json`. A publicação usa somente `index.html`, `assets/`, `css/`, `js/` e `vendor/`, incluindo a licença do ExcelJS. Modelos Excel, testes, documentação, caches e arquivos de desenvolvimento ficam fora do site.

Para gerar a pasta de publicação localmente:

```sh
npm run build
```

Esse comando recria **somente `dist/`** e confere as referências do HTML. Usa apenas recursos nativos do Node.js; a instalação de dependências é necessária para desenvolvimento/testes, mas não para gerar a publicação. O uso direto de `index.html` e o servidor `npm start` continuam funcionando sem build.

Depois de enviar o projeto ao repositório GitHub desejado:

1. No Vercel, use **Add New → Project** e importe o repositório.
2. Mantenha a pasta raiz do projeto (`./`) e o preset **Other**. O `vercel.json` já define **Build Command: `npm run build`**, **Output Directory: `dist`** e dispensa o Install Command.
3. Não são necessárias variáveis de ambiente, banco de dados ou execução de `npm start` no Vercel.
4. Publique e use a URL retornada para compartilhar a aplicação. A integração Git permite gerar novas publicações a partir dos próximos commits.

Referências: [configuração do Vercel](https://vercel.com/docs/project-configuration/vercel-json) e [integração com GitHub](https://vercel.com/docs/git/vercel-for-github).

O repositório deve conter o código, `package-lock.json`, a distribuição local de `vendor/`, os testes e os modelos usados na validação. `.gitignore` exclui dependências instaladas, `dist/`, caches, resultados de testes, `.env` e configurações locais do Vercel. Prefira um repositório privado para compartilhar este projeto corporativo.

O link publicado abre a aplicação para cada pessoa. Os preenchimentos e PDFs continuam no navegador de quem preencheu; não são enviados ao GitHub ou ao Vercel e não aparecem automaticamente para outras pessoas. Para compartilhar um levantamento preenchido, baixe o Excel e os anexos ZIP. Os rascunhos da versão aberta pelo computador não são migrados automaticamente para o novo endereço hospedado.

## Como usar

1. Clique em **Novo veículo** ou **Cadastrar primeiro veículo**.
2. Em **Formulário**, preencha o cadastro completo: **Veículo**, **Pré-ruído**, **Documentos** e **Revisão**. Todas essas informações pertencem ao mesmo veículo.
3. Em **Revisão**, clique em **Salvar veículo**. Os quatro identificadores são obrigatórios; outros requisitos podem ficar pendentes, mas formatos inválidos e itens iniciados incompletos precisam ser corrigidos.
4. Adicione outros veículos. Use o seletor acima do formulário para alternar entre eles.
5. Abra **Visualizar Planilha**. Edite as próprias células, use a busca por ID, marca, modelo ou fabricante e filtre pelo preenchimento.
6. Clique em **Exportar Excel**. O arquivo inclui **todos os veículos da lista**, independentemente dos filtros, e tem nome `levantamento_tecnico_veiculos_YYYY-MM-DD.xlsx`.

As etapas podem ser abertas diretamente, e **Voltar** mantém o conteúdo. **Próximo** permite continuar o rascunho com pendências. Os erros aparecem junto aos campos, e salvar/exportar verificam os identificadores, formatos e registros iniciados. Os demais requisitos pendentes acompanham o Excel.

O menu de etapas usa um pequeno ponto amarelo para pendências e um visto verde para etapas concluídas. Campos obrigatórios vazios recebem o mesmo ponto, mantendo bordas neutras. A quantidade aparece no cabeçalho da etapa e no seletor do celular, atualizada durante o preenchimento; também está disponível para leitores de tela e ao passar o mouse nos símbolos do menu. Essa sinalização não antecipa mensagens de erro nos campos ainda não editados.

## Regras e integridade

- A aba **Veículos** do Excel mantém os **33 campos**, exatamente na ordem e com os textos da seção 5 do [levantamento original](README_LEVANTAMENTO_TECNICO_VEICULOS.md). Eles também fazem parte do formulário completo. Os testes comparam os cabeçalhos com a linha 4 de `modelos_excel/VEICULO.xlsx`.
- `ID/Referência`, `Marca`, `Modelo` e `Versão` são obrigatórios para salvar e exportar. Os demais campos são opcionais na V1, mas deixam o veículo sinalizado como incompleto quando não respondidos.
- Uma resposta vazia continua pendente. Para textos que não se aplicam, o cliente pode escrever **Não se aplica**.
- A contagem de preenchimento considera somente campos aplicáveis e válidos. Os cinco detalhes condicionais só entram na contagem quando a respectiva resposta é **Sim**.
- Selecionar **Não** ou limpar a pergunta de arrefecimento apaga seus quatro detalhes; fazer isso na pergunta de freio apaga a pressão. O comportamento é igual no formulário e na grade. A exportação também elimina valores inaplicáveis defensivamente.
- Massas e litros aceitam valores não negativos, com vírgula ou ponto decimal, sem separadores de milhar. Marchas e eixos exigem inteiros positivos. A pressão aceita valor não negativo e unidade: `bar`, `kPa`, `MPa`, `Pa`, `psi` ou `kgf/cm²` (`kgf/cm2` também é aceito).
- Códigos permanecem strings, inclusive zeros à esquerda. O identificador interno `uid` diferencia os registros mesmo quando as referências são iguais; é usado nas abas complementares, sem alterar as 33 colunas da aba **Veículos**.
- **Uma única fonte de dados:** `state.vehicles`. Cada edição altera esse estado; formulário, grade, persistência e exportação usam o mesmo dicionário de campos. Não há uma cópia separada da planilha para edição.
- Um veículo novo entra como rascunho na lista e na grade. As alterações são salvas localmente a cada edição, inclusive valores temporariamente inválidos. **Salvar veículo** registra que a validação foi concluída; uma nova edição volta a indicar rascunho.
- A exportação inclui também rascunhos que tenham os quatro obrigatórios e formatos válidos. Se existir um veículo vazio ou inválido, é necessário completá-lo ou excluí-lo antes de exportar. Campos opcionais em branco não impedem a exportação.
- Exclusão e limpeza de todos os dados exigem confirmação. Cancelar ou pressionar `Esc` mantém os registros.

## Arquivo Excel

O XLSX é gerado com **ExcelJS 4.4.0**, na aba `Veículos`, com uma linha por veículo e nenhuma coluna técnica adicional nessa aba. Fichas P8 também geram abas complementares, descritas abaixo:

- Cabeçalho azul-escuro, texto branco em negrito e quebra de linha.
- AutoFilter nas 33 colunas; primeira linha e primeira coluna congeladas.
- Larguras controladas, textos com quebra de linha, linhas alternadas e altura ajustada ao conteúdo até o limite do Excel.
- Massas/litros numéricos com duas casas na exibição; marchas/eixos numéricos inteiros. O valor original de decimais é mantido, mesmo quando há mais de duas casas.
- Códigos, respostas e pressão com unidade como texto; respostas ausentes como células vazias.
- Textos que começam com `=`, `+`, `-` ou `@` são gravados como **strings**, sem criar fórmulas. O conteúdo é inserido na interface com APIs de texto do DOM, sem interpretar HTML do usuário.

O modelo original é referência de colunas; a exportação não replica suas linhas de título, linhas vazias numeradas ou fórmulas auxiliares. O cabeçalho do arquivo gerado fica na primeira linha, conforme o contrato da V1.

Documentação da biblioteca: [ExcelJS 4.4.0](https://github.com/exceljs/exceljs/tree/v4.4.0#readme). Para atualizar a cópia local a partir da versão travada no projeto:

```sh
npm ci
npm run vendor
```

O script copia `dist/exceljs.min.js` e a licença MIT do pacote, sem modificá-los. A aplicação não usa CDN, fontes remotas ou analytics.

## Rascunhos e privacidade

Os dados são guardados na chave `levantamento-tecnico-veiculos:v1` do `localStorage`, com esquema versionado. São preservados os veículos, seleção, aba e etapa atual, inclusive edições em andamento.

Esse armazenamento pertence ao **navegador, perfil e endereço** usados para abrir a aplicação. Não sincroniza entre dispositivos. Limpar os dados do navegador, trocar de perfil/endereço ou usar uma janela privada pode fazer o rascunho desaparecer. O comportamento de `localStorage` em `file://` depende do navegador; mantenha o arquivo no mesmo local ou use o servidor local para um endereço estável. O Excel é a cópia durável para compartilhar com a equipe.

Se o navegador bloquear o armazenamento ou sua cota acabar, a interface informa que os dados estão apenas na sessão e mantém a possibilidade de exportar. Um rascunho corrompido ou incompatível é preservado sem sobrescrita e pode ser baixado como JSON para recuperação técnica, antes de uma limpeza confirmada. A V1 não oferece importação de JSON/XLSX.

Se outra aba alterar os dados, esta aba pausa o salvamento para evitar sobrescrita, avisa o cliente e mantém sua edição em memória para exportação antes de recarregar. A limpeza manual também é detectada. Os arquivos Excel já baixados não são removidos pela opção **Limpar dados**.

## Estrutura

```text
index.html                    Estrutura semântica e carregamento local dos scripts
assets/first-symbol.png       Símbolo FIRST e favicon locais
css/style.css                 Tema, componentes, estados e responsividade
js/campos.js                  Dicionário oficial, etapas e regras de aplicabilidade
js/validacao.js               Validação, completude e pesquisa
js/storage.js                 Esquema e persistência com tratamento de falhas
js/ui.js                      Controles compartilhados e ícones locais
js/veiculo-p8-app.js           Formulário único: dados, ensaios, documentos e revisão
js/planilha.js                Grade editável e seus estados
js/exportacao.js              Workbook XLSX, formatação e download
js/app.js                     Estado único, navegação, CRUD e eventos
vendor/                       ExcelJS local e licença
scripts/                      Servidor local, cópia da biblioteca e validação no Excel
tests/core.test.cjs            Regras e verificação binária do XLSX
tests/e2e/fluxos.spec.cjs      Fluxos reais em navegador desktop e mobile
modelos_excel/VEICULO.xlsx     Referência original, preservada
```

Os scripts clássicos com `defer` e namespace `Veiculos` permitem abrir pelo sistema de arquivos sem as restrições de módulos ES em `file://`. A ordem de carregamento está explícita no HTML. A separação entre campos, regras, interface e exportação permite evoluir o domínio sem duplicar estado.

## Validação

```sh
npm run lint           # ESLint
npm run format:check   # Prettier
npm test               # Testes com node:test e reabertura do XLSX
npm run test:e2e       # Playwright: desktop e celular
npm run check          # Todas as verificações acima
```

O Playwright usa Google Chrome instalado e inicia/encerra um servidor local de testes na porta **4174** automaticamente, sem interferir no `npm start` da porta 4173. Se não houver Chrome, instale o navegador para os testes com `npx playwright install chrome`. Essa instalação requer rede e permissões do sistema; não é necessária para utilizar a aplicação.

Os testes de navegador cobrem o cadastro único, recuperação dos dois formatos anteriores de rascunho, obrigatórios e números inválidos, múltiplos veículos, alternância de registros, todos os 33 campos da grade, sincronização bidirecional, condicionais, buscas e filtros, recarga do rascunho, exclusão e limpeza confirmadas, rascunho corrompido e download real. Executam também o uso direto de `index.html` sem solicitações HTTP externas. Capturas e XLSX de teste ficam em `test-results/` (não versionado).

Os cenários de confiabilidade também exercitam cota de armazenamento indisponível, conflitos entre abas, entradas HTML tratadas como texto, correção de erros entre as duas telas, navegação por teclado e contenção da rolagem horizontal.

**Resultado da validação da V1:** `npm run check` aprovado, com ESLint, Prettier, **9 testes de regras/persistência/XLSX** e **22 testes de navegador** (11 cenários em desktop e 11 em celular). A distribuição local do ExcelJS e sua licença também foram comparadas byte a byte com o pacote oficial instalado.

Para conferir um arquivo no **Microsoft Excel para Windows** instalado, em uma instância invisível, somente leitura e sem habilitar macros ou atualizar links:

```powershell
.\scripts\validate-excel.ps1 -WorkbookPath 'caminho\levantamento_tecnico_veiculos_YYYY-MM-DD.xlsx'
```

O script verifica abertura, aba única, os 33 cabeçalhos literais, AutoFilter e painéis congelados. Não altera o arquivo e encerra somente a instância que criou.

Neste ambiente, a tentativa de automação do Excel foi bloqueada pela sessão de logon do Windows (`0x80070520`). A abertura e a conferência visual no Excel ficam como verificação manual no computador do cliente. A estrutura binária, os dados e os estilos do XLSX foram verificados por gravação e reabertura automatizadas com ExcelJS.

### Conferência manual sugerida

1. Preencha identificação e deixe alguns opcionais vazios; confirme o indicador de pendências.
2. Preencha os detalhes de arrefecimento/freio e responda **Não** na grade. Volte ao formulário e confirme a limpeza.
3. Recarregue no meio de uma edição e confira conteúdo, veículo e etapa.
4. Cadastre dois veículos, filtre um e exporte; o Excel deve conter os dois e exatamente 33 colunas.
5. Confira a legibilidade no Excel, a rolagem horizontal da grade e a navegação por teclado em seu dispositivo.

## Limites e próxima versão

As limitações abaixo se referem ao módulo original de veículos. O módulo de motores é descrito na seção seguinte.

- O formulário reúne dados gerais, componentes, ensaios e anexos em um cadastro por veículo. As coleções são relacionadas por `uid`, preservando as 33 colunas da grade e da aba **Veículos**.
- Sem importação, histórico de alterações, sincronização, envio de e-mails ou cadastro em servidor.
- Armazenamento e geração XLSX usam a memória do navegador; a V1 é voltada a levantamentos usuais, sem virtualização para grandes frotas.
- A interface foi projetada para navegadores atuais, com suporte a `dialog`, `localStorage`, `crypto` e downloads de arquivos. Em smartphones, a experiência de download depende do navegador e do sistema operacional.
- A auditoria de dependências reporta o aviso moderado [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) na dependência transitiva `uuid` do ExcelJS. Ele afeta as APIs `v3/v5/v6` com buffers externos; a integração do ExcelJS utiliza `v4`, e a aplicação usa `crypto` nativo para identificar veículos. Não há importação de arquivos nem entrada de buffers do usuário nesse caminho. A distribuição oficial foi preservada; acompanhar a atualização upstream antes de ampliar os recursos da biblioteca.

## Formulário de motores diesel MAR1

Selecione **Motores MAR1** no início da página. O levantamento de motores é independente dos veículos: alternar entre as áreas preserva os rascunhos e mantém as 33 colunas oficiais da exportação de veículos.

**Motores MAR1** aparece antes de **Veículos** na navegação. A área utilizada continua sendo lembrada durante a sessão. No formulário de veículos, a barra compacta de seleção acompanha a rolagem normal da página, sem sobrepor os campos; a posição fixa fica restrita à lista lateral da planilha no desktop.

1. Clique em **Novo motor** e preencha a identificação.
2. Em **Dados do motor**, avance pelas sete etapas: identificação/origem, configuração, funcionamento, injeção/controle, admissão/escape, emissões e componentes. Fabricantes e componentes aceitam vários itens.
3. Em **Ensaios e responsável**, avance pelas seis etapas: motor do ensaio, laboratório/normas, gases, material particulado, resultados e responsável técnico (engenheiro, CREA e agente técnico).
4. Abra **Revisão** para conferir todos os valores e acessar os campos com pendências. **Salvar rascunho** permite continuar depois; o registro aparece como **Conferido** somente quando todos os requisitos aplicáveis estiverem preenchidos e válidos.
5. Use **Exportar motores (.xlsx)** e **Baixar anexos (.zip)** para compartilhar os dados e PDFs. A exportação inclui todos os motores cadastrados, inclusive os que ainda têm requisitos pendentes.

O formulário mostra **uma etapa por vez**. O menu lateral no desktop e o seletor no celular permitem ir direto a qualquer etapa; **Voltar** e **Próximo** mantêm o rascunho. A etapa atual de cada área é recuperada após recarregar, inclusive para rascunhos anteriores à reorganização. A navegação permite deixar requisitos pendentes para continuar depois; a validação para exportar continua a mesma.

O progresso geral e o estado de cada etapa consideram os campos aplicáveis e as listas de fabricantes/componentes. Os PDFs ficam recolhidos em **Documentos desta etapa**, com a quantidade de pendências visível; referências opcionais também ficam recolhidas. As unidades aparecem junto aos inputs e os textos longos têm contagem de caracteres. A **Revisão** agrupa as pendências por etapa e abre o campo ou documento correspondente ao selecionar uma delas.

### Escopo e validação

O dicionário em `js/motor-campos.js` foi baseado no HTML do cadastro Infoserv fornecido pelo usuário, no contexto **Combustão / Compressão / Diesel / Máquina Agrícola ou Rodoviária / MAR1**. Inclui os campos de pré-emissão e de responsável técnico presentes no mesmo HTML. Não representa uma integração com o sistema oficial nem valida conformidade regulatória.

Os detalhes de importação, alimentação **Outros**, bomba de transferência, sobrealimentação, variação da geometria da admissão, filtro de partículas e catalisadores aparecem conforme as respostas. Ao ocultar um detalhe, seu rascunho é preservado; ele deixa de ser validado e exportado enquanto não for aplicável. A igualdade entre catalisadores só é solicitada quando existem pelo menos dois. As referências OBD Diesel e Ki ficam em um grupo explicitamente opcional.

Os limites de tamanho, casas decimais e unidades seguem os campos fornecidos. Números aceitam vírgula ou ponto decimal, sem separadores de milhar ou notação científica. As massas de particulado são calculadas por diferença (final menos inicial), com quatro casas de precisão; o filtro secundário é opcional, mas suas duas massas devem ser informadas juntas. A temperatura máxima do óleo não pode ser inferior à mínima. Códigos, números de motor e CREA permanecem texto para preservar zeros à esquerda.

Para exportar, todos os motores precisam de marca e modelo, formatos válidos e itens de fabricantes/componentes sem campos incompletos. Os demais requisitos podem ficar pendentes e são discriminados na aba **Pendências**; a exportação não equivale à conclusão de uma solicitação no Infoserv.

O HTML não continha o conteúdo dos modais de cadastro de componentes, catálogos de fabricantes/laboratórios/configurações base ou detalhes individuais dos catalisadores. Por isso, as referências são digitadas manualmente, os componentes usam as seis colunas visíveis no HTML (componente, atuação/localização, item, quantidade, código e OBD), e os catalisadores coletam quantidade e igualdade. Não foram inventados campos internos desses modais. Campos de outros combustíveis que estavam ocultos e fora do contexto diesel não foram ativados.

### PDFs, rascunhos e exportação

- Cada campo de documento aceita **PDF de até 10 MB**, com extensão e assinatura inicial verificadas. Os arquivos podem ser baixados individualmente, substituídos ou removidos com confirmação.
- Os dados ficam em `localStorage`, na chave `levantamento-tecnico-motores:v1`; os PDFs ficam no **IndexedDB** `levantamento-tecnico-motores`, na coleção `anexos`. Não há alteração ou migração dos rascunhos de veículos.
- O rascunho salva automaticamente a cada edição. Se houver falha de cota/permissão, a interface avisa; PDFs mantidos apenas em memória devem ser baixados antes de fechar. Referências a arquivos não encontrados são sinalizadas e impedem uma exportação enganosa de anexos.
- Rascunhos inválidos são preservados para download de recuperação. Mudanças em outra aba pausam o salvamento para evitar sobrescritas. Os botões **Limpar motores** e **Excluir motor** exigem confirmação.
- O Excel de motores contém as abas **Motores**, **Pré-emissão**, **Fabricantes**, **Componentes**, **Anexos** e **Pendências**. O identificador interno está presente nessas abas para relacionar os registros mesmo quando referências, marcas ou modelos são repetidos.
- O Excel inclui nomes/caminhos dos documentos; os PDFs **não estão incorporados** no XLSX. O ZIP contém os PDFs aplicáveis, com os mesmos caminhos da aba **Anexos**. O ZIP é gerado localmente, sem compressão, com CRC32 e nomes UTF-8, sem dependências adicionais na aplicação.
- O arquivo gerado tem nome `levantamento_tecnico_motores_YYYY-MM-DD.xlsx`. Limpar os dados do navegador também apaga os anexos; baixe Excel e ZIP como cópia durável.
- Os arquivos `js/motor-dados.js`, `motor-arquivos.js`, `motor-exportacao.js` e `motor-app.js` separam regras/persistência, PDFs/ZIP, workbook e interface. `css/motores.css` complementa o tema existente.

Os novos testes em `tests/motores.test.cjs` e `tests/e2e/motores.spec.cjs` cobrem regras, XLSX/ZIP reais, anexos, recarga, condicionais, múltiplos motores, cadastro completo, conflitos entre abas e funcionamento offline, em desktop e celular. Execute os mesmos comandos de validação apresentados acima.

**Validação do módulo de motores em 25/11/2026:** os 15 testes de regras, persistência, XLSX e ZIP passaram. Os testes de interface foram adicionados, mas a execução neste ambiente foi bloqueada antes de abrir a página: o Chrome encerra na inicialização do processo de Crashpad. A tentativa de preparar o navegador do Playwright também não pôde concluir porque o ambiente não resolve `cdn.playwright.dev`. A execução dos fluxos em desktop/celular e as capturas de tela ficam pendentes em um ambiente com navegador de automação disponível.

**Reorganização de UX validada em 26/11/2026:** os 16 testes de regras/persistência/arquivos, lint e formatação passaram, incluindo a cobertura de todas as seções pelas etapas e a recuperação de rascunhos antigos. Os testes de navegador foram adaptados para a navegação por etapas, documentos recolhidos e revisão agrupada. A tentativa do fluxo de UX foi bloqueada antes de abrir a página pelo mesmo erro de inicialização do Chrome/Crashpad; a conferência visual em desktop e celular permanece pendente. Para evitar a limpeza de artefatos antigos bloqueados pelo Windows, essa tentativa usou `--output=test-results/ux-20261126`.

## Cadastro do veículo: dados, ensaios e documentos

Selecione um veículo e abra **Formulário**. O cadastro contém **230 campos**, **13 tipos de documento PDF** e quatro coleções: versões adicionais, componentes, resultados em aceleração e resultados em velocidade constante. Mostra uma etapa por vez, com navegação por área, botões de navegação e revisão com links para as pendências. As 28 etapas incluem as condicionais; as etapas de arrefecimento e compressor só aparecem quando o veículo possui esses sistemas.

Existem apenas os modos **Formulário** e **Planilha**. O formulário reúne **Veículo**, **Pré-ruído**, **Documentos** e **Revisão** como partes do mesmo cadastro. No desktop, o menu mostra as etapas da área atual; os tipos de ensaio ficam agrupados. No celular, um seletor mantém o acesso a todas as etapas. O seletor compacto de veículos libera espaço para o formulário, e criar ou alternar veículos mantém esse modo de edição.

Documentos, versões adicionais e informações complementares começam recolhidos. Etapas extensas mostram grupos que podem ser abertos individualmente; os registros de coleções também podem ser recolhidos. Contadores e orientações de campo aparecem durante a edição, enquanto erros permanecem visíveis. A revisão abre inicialmente com as etapas recolhidas e mantém links que abrem todos os grupos necessários antes de focar a pendência. **Mais ações** reúne o salvamento manual, download de anexos, exclusão do veículo e limpeza confirmada. O rodapé mostra o estado real do salvamento e as ações Voltar/Próximo. A reorganização mantém os dados e as regras de exportação.

Foram incluídas as perguntas do HTML Infoserv fornecido, no contexto **Veículo pesado / Combustão / Fase P8**: identificação/importação, fabricante/importador, carroçaria e passageiros, massas, arrefecimento e freios, famílias Ki/RDE/Durabilidade/ISC, transmissão, reservatório, escapamento, materiais, componentes, veículo do ensaio, ensaios acelerado/parado/arrefecimento/compressor, pista, instrumentos, clima, medições, resultados, documentos e responsável técnico. Os dados pessoais do solicitante, mensagens e scripts do portal não foram copiados.

Os 33 campos gerais aparecem uma única vez no formulário e usam os mesmos valores da grade. Os demais dados ficam em `vehicle.p8`, na mesma chave de armazenamento e no mesmo registro do veículo; esse nome interno foi mantido para compatibilidade. A antiga seleção da aba P8 passa a abrir o formulário, preservando sua etapa, coleções e referências dos PDFs. Rascunhos do formulário de cinco etapas também retomam a seção correspondente. Descrições antigas de material fibroso permanecem acessíveis até a confirmação da nova pergunta Sim/Não, sem presumir uma resposta. Campos novos ocultos mantêm o rascunho, mas deixam de ser validados e exportados enquanto inaplicáveis. Os cinco detalhes condicionais originais continuam seguindo a regra anterior de limpeza.

Os asteriscos indicam requisitos da ficha P8, sem impedir a navegação ou o salvamento de rascunhos. As pendências seguem no Excel. Formatos inválidos e registros iniciados com colunas vazias impedem a exportação. Textos acima do limite são sinalizados, sem truncamento automático de dados antigos. País, fabricante, famílias, combustível, pista e empresas são digitados manualmente, pois os catálogos do portal não foram fornecidos. A versão do ensaio é selecionada entre a principal e as adicionais, com identificador estável; remover uma versão usada exige revisar essa referência.

A média das três medições do ensaio parado é aritmética e arredondada para duas casas. **Resultados finais, valores de fiscalização, Lvent e validações oficiais são transcritos do relatório técnico**: o HTML não fornece suas fórmulas ou critérios. O formulário não calcula aprovação regulatória nem classifica automaticamente o veículo. O módulo de motores MAR1 permanece independente e não comprova atendimento do motor à fase P8.

As categorias do ensaio reproduzem as dez opções fornecidas (M2E, M2F, M3A/B/C, N2C/D e N3A/B/C). Umidade aceita de 0 a 100%, temperaturas aceitam negativos e passageiros aceitam zero. As 3ª e 4ª medições de descarga e seus resultados ficam opcionais, pois estavam ocultos sem a regra de ativação no HTML. O esquema do reservatório fica disponível como opcional: a referência tinha marcação visual de obrigatório, mas o controle estava válido sem anexo e não aparecia na lista de pendências. Essas decisões não substituem conferência no sistema oficial.

**Exportar Excel** preserva a aba **Veículos** com as 33 colunas na ordem original. Quando houver complementos P8, acrescenta **Dados P8**, **Pré-ruído**, **Responsável técnico**, **Versões**, **Componentes**, **Resultados aceleração**, **Velocidade constante**, **Anexos P8** e **Pendências P8**. Perguntas extensas são organizadas em linhas por etapa; respostas numéricas novas são números e códigos continuam texto. As abas adicionais contêm o UID para relacionar os dados mesmo com referências repetidas.

Os PDFs ficam no IndexedDB `levantamento-tecnico-veiculos-p8`, separado dos motores. Cada arquivo aceita até 10 MB, com extensão e assinatura inicial verificadas. O armazenamento usa o mesmo mecanismo local dos motores, com fallback em memória e aviso quando indisponível. **Baixar anexos dos veículos (.zip)** gera os arquivos aplicáveis e um `indice.json`; os caminhos correspondem à aba **Anexos P8**. O XLSX contém referências, sem incorporar os PDFs. Arquivos referenciados que não possam ser recuperados impedem o download enganoso de Excel/ZIP. Desvincular/substituir PDFs ou excluir fichas não purga automaticamente os blobs antigos do IndexedDB; limpar os dados do navegador remove esse armazenamento. Guarde Excel e ZIP antes de limpar.

Os arquivos `js/veiculo-p8-campos.js`, `veiculo-p8-dados.js`, `veiculo-p8-exportacao.js` e `veiculo-p8-app.js` separam o dicionário, regras, exportação e interface. `css/veiculo-p8.css` complementa o tema. Os testes ficam em `tests/veiculo-p8.test.cjs` e `tests/e2e/veiculo-p8.spec.cjs`.

**Validação em 26/11/2026:** regras, persistência, reabertura do XLSX, isolamento dos anexos e ZIP foram testados localmente. A tentativa dos fluxos Playwright foi bloqueada antes de abrir a página pelo Chrome/Crashpad (`TransactNamedPipe`, erro 0x6D). A conferência visual, a execução em desktop/celular e as capturas permanecem pendentes. A tentativa utilizou `--output=test-results/p8-revisao-20261126`.

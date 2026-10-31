# Controle Financeiro

Aplicativo pessoal, simples e mobile-first para registrar despesas e rendas e entender, mês a mês, onde o dinheiro está indo. É uma PWA instalável no Android pelo Chrome, funciona offline e guarda os dados **apenas no aparelho** (IndexedDB). Não tem login, backend nem integração bancária.

## O que o app faz

- **Cartões** (tela inicial): cartões empilhados, como na Samsung Wallet. Ficam à mostra a faixa do **Cartão 1** e a do **Cartão 2** (com o final), e na frente o cartão **Conta**, com o saldo do mês.
- **Cartão aberto**: o cartão com o total e o vencimento da fatura, setas para ver outras faturas, os lançamentos da fatura e um botão **+** com duas opções: **Despesa no cartão** e **Pix / transferência**.
- **Conta aberta**: o saldo do mês e a sua composição (renda, faturas dos cartões e Pix), mais a lista de entradas e saídas. O **+** oferece **Renda** e **Pix / transferência**.
- **Despesa**: valor, descrição (com sugestões recentes), categoria e subcategoria, cartão ou Pix / transferência, à vista ou parcelado (2 a 24x) e data. Antes de salvar, o app mostra em qual fatura a compra vai entrar.
- **Renda**: valor, descrição, data de recebimento e tipo opcional (salário, extra ou outro). A renda é **da conta**: não pertence a nenhum cartão e vale para os dois.
- **Pix / transferência**: dinheiro que sai direto da conta (Pix, transferência, débito). Não entra em fatura e conta no mês da data.
- **Resumo**: abre sempre no **ano atual**, com renda, despesas e saldo do ano (positivo ou déficit), o saldo **mês a mês** e o total por cartão e Pix / transferência. Em **Mês** (ou tocando num mês da lista), mostra só aquele mês.
- **Categorias**: gráfico de barras horizontais do ano (ou do mês escolhido em **Mês**), do maior gasto para o menor, e detalhamento de cada categoria por cartão e por subcategoria.
- **Data sugerida**: ao lançar olhando outro mês ou outra fatura, a data já vem nele. Na Conta, o mesmo dia de hoje no mês que está na tela. No cartão, o dia do fechamento da fatura que está na tela, para a compra cair nela. Na fatura aberta e no mês atual, vem a data de hoje.
- **Histórico**: busca (ignora acentos) e filtros por mês, cartão/Pix/rendas e categoria. Toque em um lançamento para editar ou excluir.
- **Configurações**: fechamento e vencimento (únicos para os dois cartões); final e cores de cada cartão; categorias e subcategorias (adicionar, renomear, ocultar); exportação e importação de backup JSON.

## Regras de cálculo

| Regra | Como funciona |
|---|---|
| Mesma conta | Os dois cartões são da mesma conta e usam a regra do cartão 1: **fecham dia 24 e vencem dia 2**. A regra é alterada num lugar só e vale para os dois. |
| Fatura de uma compra | Compra feita até o dia do fechamento (inclusive) entra na fatura que vence no próximo dia de vencimento após o fechamento. Compra feita depois do fechamento vai para a fatura seguinte. |
| Exemplo (fecha 24, vence 2) | Compra em 24/11 → fatura de 02/12. Compra em 25/11 → fatura de **02/01**. Vale para os dois cartões. |
| Meses mais curtos | Fechamento ou vencimento em dia inexistente (ex.: 31 em abril) usa o último dia do mês. |
| Parcelas | O valor total é dividido igualmente e os centavos que sobram vão para a última parcela (R$ 100,00 em 3x = 33,33 + 33,33 + 33,34). A 1ª parcela segue a regra de fechamento e as demais vão para as faturas seguintes. A compra continua sendo uma só no histórico. |
| Renda | É da conta, não de um cartão. Entra no Resumo do mês em que foi recebida. |
| Mês de referência no Resumo e em Categorias | Cartão: mês de **vencimento** da fatura (cada parcela no mês da sua fatura). Pix / transferência e rendas: mês da data. Saldo do mês = renda − (faturas dos dois cartões + Pix / transferência). O ano é a soma dos seus doze meses, com as mesmas regras. |
| Mudança de fechamento | A fatura de cada lançamento é sempre calculada a partir da regra atual. Ao mudar o fechamento ou o vencimento, todos os lançamentos, inclusive os antigos, são reatribuídos automaticamente. |

Toda essa lógica fica em `src/domain/` (funções puras, sem interface) e é coberta pelos testes em `tests/`.

## Onde configurar fechamento e vencimento

**Cartões → ícone de engrenagem (Configurações) → Fatura**. A alteração vale para os dois cartões. O final e a cor de cada cartão ficam logo abaixo, em **Cartões**.

## Como executar no computador

Requisito: [Node.js](https://nodejs.org/) LTS (testado com a versão 26).

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:5173. No Chrome, use as ferramentas de desenvolvedor (F12) com o modo de dispositivo móvel para ver o layout de celular.

## Como testar

```bash
npm test
```

Os testes cobrem a regra de fechamento (fecha 24, vence 2, nos dois cartões), a atribuição de fatura, meses de 28 a 31 dias, anos bissextos, a virada de ano, o parcelamento com ajuste de centavos, o resumo mensal e anual, as categorias, a data sugerida ao lançar e a validação de backup.

```bash
npm run typecheck
```

## Como gerar o build

```bash
npm run build
```

O resultado fica em `dist/`. Para ver o build com o service worker funcionando (instalação e modo offline):

```bash
npm run preview
```

Abra http://localhost:4173.

## Instalar no Android

O Chrome só instala uma PWA (e ativa o modo offline) quando o site é servido por **HTTPS** ou por **localhost**. Há dois caminhos:

### Opção A: pelo GitHub Pages (recomendado, uso definitivo)

1. No celular, abra https://pzuim.github.io/controle-financeiro/ no Chrome.
2. Toque no menu **⋮ → Instalar e criar atalho → Instalar** (em outras versões: **Instalar app** ou **Adicionar à tela inicial**).
3. O ícone laranja se chama **Controle Financeiro**. Se ele não aparecer na tela inicial, procure na gaveta de apps (deslize para cima) e segure o ícone para adicioná-lo.
4. Depois do primeiro acesso, o app funciona sem internet.

> A setinha de download do menu do Chrome **não instala** o app: ela só salva uma cópia da página para ler offline.
>
> **"Esse app já está instalado", mas ele não existe e não abre:** é um bug do Chrome para Android nas versões **154 a 156**. Nessas versões, se outro app do mesmo site (`pzuim.github.io`, como o Meu Setup ou o Reembolso) já estiver instalado, o Chrome acha que este também está e não instala. A correção vem no **Chrome 157** ([bug 568841400](https://issues.chromium.org/issues/568841400)). Veja a versão em **Chrome → ⋮ → Configurações → Sobre o Chrome**, atualize pela Play Store e instale de novo.
>
> Não desinstale os outros apps para contornar: ao desinstalar, o Chrome oferece apagar os dados do site, e isso apagaria os dados dos três apps, que ficam no mesmo endereço.
>
> **Criar atalho** não instala o app: o ícone fica com o selo do Chrome e abre numa aba do navegador. Os dados são os mesmos do app instalado.

### Opção B: teste local via cabo USB, antes de publicar

1. No celular, ative **Opções do desenvolvedor → Depuração USB** e conecte o cabo.
2. No computador, rode `npm run build` e depois `npm run preview`.
3. No Chrome do computador, abra `chrome://inspect/#devices`, clique em **Port forwarding** e adicione `4173` → `localhost:4173`.
4. No Chrome do celular, abra `http://localhost:4173` e instale pelo menu **⋮ → Instalar app**.

> Pela rede Wi-Fi (`npm run preview:lan` e o IP do computador), o app abre, mas o Chrome não permite instalar nem usar offline, porque o endereço não é HTTPS.

## Backup dos dados

Os dados ficam só no navegador do aparelho. Se você limpar os dados do Chrome, desinstalar o app ou trocar de celular, perde os lançamentos, a menos que tenha um backup.

- **Exportar**: Configurações → **Exportar backup**. É gerado o arquivo `controle-financeiro-backup-AAAA-MM-DD.json`. Guarde-o no Drive, no e-mail etc.
- **Importar**: Configurações → **Importar backup**, ou "Trocou de aparelho? Importar backup" na tela de boas-vindas. O app valida o arquivo, compara a quantidade de lançamentos do backup com a do aparelho e pede confirmação explícita antes de substituir.
- **Desfazer**: antes de cada importação, o app guarda uma cópia automática dos dados atuais. Configurações → **Desfazer última importação** restaura essa cópia.

## Publicar e atualizar pelo GitHub

O workflow `.github/workflows/deploy.yml` já está pronto: a cada `push` na branch `main`, ele roda os testes, gera o build com o caminho correto do repositório e publica no GitHub Pages.

Primeira publicação (manual, quando você decidir):

1. Crie um repositório no GitHub (pode ser privado, se o seu plano permitir Pages privado; senão, público). Exemplo: `controle-financeiro`.
2. Nesta pasta:
   ```bash
   git init
   ```
   ```bash
   git add .
   ```
   ```bash
   git commit -m "Primeira versão do Controle Financeiro"
   ```
   ```bash
   git branch -M main
   ```
   ```bash
   git remote add origin https://github.com/<seu-usuario>/controle-financeiro.git
   ```
   ```bash
   git push -u origin main
   ```
3. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Acompanhe na aba **Actions**. Ao terminar, o endereço aparece em Settings → Pages.

Para atualizar: faça as alterações, rode `npm test`, depois `git commit` e `git push`. O app instalado no celular detecta a nova versão ao ser aberto e mostra **"Nova versão disponível · Atualizar"**. Os dados não são afetados.

> Se o repositório se chamar `<seu-usuario>.github.io`, o site fica na raiz: troque `BASE_PATH` no workflow por `/`.

O `.gitignore` já impede que arquivos de backup (`*backup*.json`) sejam enviados ao repositório. Nunca coloque backups com seus lançamentos no GitHub.

## Estrutura do projeto

```
src/
  domain/          Lógica pura e testada (sem interface)
    billing.ts       Fechamento, vencimento e situação da fatura
    cards.ts         Garante que todos os cartões sigam a regra do cartão 1
    installments.ts  Divisão das parcelas em centavos
    ledger.ts        Parcelas por mês, resumo mensal, categorias e faturas
    backup.ts        Criação e validação do arquivo de backup
    dates.ts         Datas de calendário (AAAA-MM-DD), sem fuso horário
    format.ts        Reais, datas e meses em português
    defaults.ts      Cartões e categorias iniciais
    types.ts         Tipos do modelo de dados
  data/
    db.ts            IndexedDB (biblioteca idb)
    store.ts         Estado do app e ações (gravar, excluir, importar)
  ui/
    App.tsx          Navegação, painéis, diálogos, avisos e atualização do PWA
    screens/         Cartões (pilha), Resumo (ano ou mês) e Categorias
    sheets/          Cartão aberto, Conta, Despesa, Renda, Histórico, Configurações, Fatura e Categorias
    rows.tsx         Linhas de lançamento usadas nas listas
    Onboarding.tsx   Configuração inicial
  styles.css         Visual (mobile-first)
tests/             Testes (Vitest)
public/            Ícones e favicon
scripts/           Gerador dos ícones (Python + Pillow: npm run icons)
0_MODELOS/         Especificação e imagens de referência (não fazem parte do app)
```

Tecnologias: Vite, TypeScript (modo estrito), Preact, vite-plugin-pwa (Workbox), idb e Vitest. Os valores são guardados em centavos (números inteiros) para evitar erros de arredondamento.

# Escala Paróquia

Aplicação simples para organizar coroinhas, horários de missa, eventos e escalas. A versão online usa Supabase para login e armazenamento compartilhado; a interface continua sendo HTML, CSS e JavaScript.

## Configuração inicial

1. Crie um projeto no Supabase.
2. No **SQL Editor**, execute o arquivo `supabase-schema.sql`.
3. Em **Authentication → Users**, crie uma conta para cada responsável. O cadastro público não existe; somente contas que você criar poderão entrar.
4. Copie a **Project URL** e a chave **Publishable** (`sb_publishable_...`) para `config.js`. Nunca use a `service_role`/secret key no navegador.
5. Abra `index.html` localmente ou publique a pasta como site estático. `config.js` contém apenas configuração pública; as políticas RLS no banco protegem os dados.

As contas autenticadas podem gerenciar os cadastros. Somente as escalas geradas ficam públicas para qualquer visitante, inclusive na tela de login.

## Publicação

- **Vercel:** importe o repositório e publique como projeto estático, sem comando de build e com a pasta raiz como diretório de saída. Configure `config.js` antes do deploy.
- **Render:** não é necessário nesta arquitetura. Supabase já fornece autenticação e banco; Vercel pode servir diretamente estes arquivos estáticos. Usar Render também exigiria manter uma API separada.

## Dados existentes no navegador

Os cadastros antigos ficam no `localStorage` do navegador e não são transferidos automaticamente. Antes de trocar a versão publicada, anote ou exporte os dados antigos e recadastre-os no app conectado ao Supabase. A partir daí, todos os responsáveis autenticados compartilham os dados online.

## Limites atuais

- Cada missa precisa de ao menos 9 coroinhas para as funções principais; os excedentes recebem Patena.
- A disponibilidade escrita no cadastro ainda não restringe automaticamente a geração.
- As escalas geradas são públicas; os cadastros de coroinhas, missas e eventos continuam privados.
- A conexão ao Supabase depende de internet.
Após atualizar o schema para esta versão, execute `supabase-schema.sql` novamente: as vagas antigas abaixo de 9 serão ajustadas para 9 e a leitura pública das escalas será habilitada.

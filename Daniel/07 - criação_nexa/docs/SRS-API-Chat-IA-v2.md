# Especificação de Requisitos de Software (SRS)

## API do Chat de IA via Web

| Campo | Valor |
|---|---|
| **Projeto** | Chat de IA via Web: Backend (API) |
| **Documento** | SRS: Especificação de Requisitos de Software |
| **Versão** | 1.1 (rascunho) |
| **Data** | 28/10/2026 |
| **Padrões de referência** | IEEE Std 830-1998, ISO/IEC/IEEE 29148:2018 |
| **Documentos de origem** | `levantamento-chat-ia-web.md`, `database.md` (v1.1) |

### Histórico de revisões

| Versão | Data | Descrição |
|---|---|---|
| 1.0 | 26/10/2026 | Primeira versão do SRS da API |
| 1.1 | 28/10/2026 | Modelo de dados alinhado ao banco `ai_chat` (`database.md` v1.1): IDs UUID, nomes de campos em inglês, tabela `sessions`, `status` de usuário e de mensagem, exclusão lógica, `parent_id`, fixar/arquivar conversas, feedback de mensagens, verificação de e-mail e recuperação de senha, `audit_logs`. Ver seção 5.5 |

> **Legenda de marcação (v1.1):** 🆕 requisito novo · ✏️ requisito alterado em relação à v1.0. Requisitos sem marcação não mudaram.

---

## Sumário

1. [Introdução](#1-introdução)
2. [Descrição geral](#2-descrição-geral)
3. [Requisitos específicos](#3-requisitos-específicos)
   - 3.1 [Interfaces externas](#31-interfaces-externas)
   - 3.2 [Requisitos funcionais](#32-requisitos-funcionais)
   - 3.3 [Requisitos de dados](#33-requisitos-de-dados)
   - 3.4 [Requisitos não funcionais](#34-requisitos-não-funcionais)
   - 3.5 [Regras de negócio](#35-regras-de-negócio)
   - 3.6 [Restrições de projeto](#36-restrições-de-projeto)
   - 3.7 [Catálogo de endpoints](#37-catálogo-de-endpoints)
   - 3.8 [Padrão de erros](#38-padrão-de-erros)
4. [Critérios de aceitação](#4-critérios-de-aceitação)
5. [Apêndices](#5-apêndices)

---

## 1. Introdução

### 1.1 Propósito

Este documento especifica os requisitos da **API de backend** de um sistema de chat de IA via web. Ele se destina a desenvolvedores, testadores e demais envolvidos no projeto, e serve de base para o projeto técnico, a implementação, os testes e a validação da API.

### 1.2 Escopo

O produto especificado é a **API REST** (em Python/FastAPI) que:

- cadastra e autentica usuários, com sessões renováveis, verificação de e-mail e recuperação de senha;
- gerencia o perfil do usuário e suas sessões ativas;
- recebe perguntas e devolve respostas de um modelo de IA, com **streaming**;
- armazena e consulta o histórico de conversas e mensagens (inclusive fixar, arquivar e avaliar respostas);
- oferece funções administrativas (gestão de usuários, monitoramento e auditoria);
- abstrai o provedor de IA, de modo que a troca de **modelo local (Ollama)** para **nuvem** seja feita apenas por configuração.

**Fora do escopo deste documento:** o frontend React, a infraestrutura de hospedagem (VPS, Railway, Render etc.), a escolha e o treinamento dos modelos de IA, e o faturamento/cobrança de usuários.

### 1.3 Definições, siglas e abreviações

| Termo | Definição |
|---|---|
| **API** | Interface de programação de aplicações |
| **REST** | Estilo arquitetural para APIs sobre HTTP |
| **SRS** | Software Requirements Specification |
| **JWT** | JSON Web Token, token assinado usado para autenticação |
| **SSE** | Server-Sent Events, fluxo de eventos do servidor para o cliente sobre HTTP |
| **ORM** | Mapeamento objeto-relacional (SQLAlchemy) |
| **Provedor de IA** | Implementação concreta que fala com um modelo (Ollama ou nuvem) |
| **Strategy** | Padrão de projeto que permite trocar algoritmos/implementações via interface comum |
| **Token (IA)** | Unidade de texto processada pelo modelo; base de cobrança em nuvem |
| **Admin** | Usuário com papel administrativo |
| **UUID** | Identificador universal único (v4), usado como chave primária de todas as tabelas, em `CHAR(36)` |
| **Sessão** | Linha da tabela `sessions`; representa um refresh token ativo em um dispositivo |
| **Exclusão lógica (soft delete)** | Marcação do registro como excluído (`deleted_at`/`status`) sem removê-lo imediatamente do banco |
| **Expurgo** | Remoção física, após o prazo de retenção, dos registros excluídos logicamente |
| **Folha de ramificação (leaf)** | Mensagem mais recente de uma conversa, usada como pai padrão da próxima mensagem |
| **RF / RNF / RN / RD** | Requisito Funcional / Não Funcional / Regra de Negócio / Requisito de Dados |

**Prioridades (MoSCoW):** **M** = Deve (Must), **S** = Deveria (Should), **C** = Poderia (Could).

### 1.4 Referências

- `levantamento-chat-ia-web.md`: documento de planejamento do projeto.
- `database.md` (v1.1): documentação e script SQL do banco `ai_chat`. É a **fonte normativa do esquema**; este SRS não duplica o DDL.
- IEEE Std 830-1998: *Recommended Practice for Software Requirements Specifications*.
- ISO/IEC/IEEE 29148:2018: *Requirements engineering*.
- RFC 7519 (JWT), RFC 6750 (Bearer Token), RFC 9457 (Problem Details for HTTP APIs).
- Documentação do FastAPI, SQLAlchemy, Alembic e Ollama.

### 1.5 Visão geral do documento

A seção 2 descreve o produto e seu contexto. A seção 3 traz os requisitos detalhados (interfaces, funcionais, dados, não funcionais, regras de negócio e catálogo de endpoints). A seção 4 define os critérios de aceitação e a seção 5 reúne apêndices, incluindo o mapa de alterações em relação à v1.0 e ao banco de dados.

---

## 2. Descrição geral

### 2.1 Perspectiva do produto

A API é o componente central do sistema e fica entre o frontend e os serviços de apoio:

```
[Frontend React] ⇄ [API Python (FastAPI)] ⇄ [MySQL 8 · banco ai_chat]
                          │
                          ├──⇄ [Provedor de IA: Local (Ollama) ou Nuvem (API)]
                          └──⇒ [Servidor SMTP] (verificação de e-mail e recuperação de senha)
```

O frontend **nunca** se comunica diretamente com a IA. Somente a API o faz, o que garante: proteção da chave da API de nuvem, controle de login, limites de uso e histórico, e independência do frontend em relação ao modelo usado.

### 2.2 Funções do produto (resumo)

| Módulo | Funções principais |
|---|---|
| **Autenticação** | Cadastro, login, renovação de sessão (com rotação), logout, verificação de e-mail, recuperação de senha |
| **Perfil** | Consultar, editar, trocar senha, gerenciar sessões, exportar dados e excluir a própria conta |
| **Chat** | Enviar mensagens e receber resposta completa ou em streaming, com persistência opcional e ramificação (editar/regenerar) |
| **Conversas** | Criar, listar, consultar, renomear, fixar, arquivar e excluir conversas; listar mensagens |
| **Feedback** | Avaliar respostas da IA com positivo ou negativo |
| **Administração** | Gerir usuários, consultar estatísticas de uso, status do provedor de IA e log de auditoria |
| **Sistema** | Health check, documentação automática e rotinas de manutenção |

### 2.3 Classes de usuários e características

| Classe | Descrição | Permissões |
|---|---|---|
| **Visitante** | Não autenticado | Cadastro, login, verificação de e-mail, recuperação de senha, health check, documentação |
| **Usuário** | Autenticado, papel `user`, `status = active` | Perfil próprio, chat, suas conversas, mensagens e feedbacks |
| **Administrador** | Autenticado, papel `admin` | Tudo do usuário + endpoints `/admin/*` |
| **Cliente de API (frontend)** | Aplicação React que consome a API em nome do usuário | Mesmas permissões do usuário autenticado |

### 2.4 Ambiente operacional

- **Linguagem/runtime:** Python 3.11 ou superior.
- **Framework:** FastAPI (ASGI, executado com Uvicorn).
- **Banco de dados:** MySQL 8.x (InnoDB, `utf8mb4`/`utf8mb4_unicode_ci`), banco `ai_chat`, com SQLAlchemy (ORM) e Alembic (migrações).
- **IA local:** Ollama (padrão `http://localhost:11434`).
- **IA em nuvem (futuro):** provedor via SDK/HTTP (Anthropic, OpenAI, Google, entre outros).
- **E-mail:** servidor SMTP (necessário para verificação de e-mail e recuperação de senha).
- **Sistemas operacionais:** Linux (produção); Windows, macOS e Linux (desenvolvimento).

### 2.5 Restrições gerais

- Banco de dados obrigatoriamente **MySQL**, com o esquema definido em `database.md`.
- Backend obrigatoriamente em **Python/FastAPI**.
- Todos os identificadores de recursos são **UUID**, gerados pela API.
- Troca de provedor de IA **somente por variável de ambiente**, sem alteração de código nos endpoints.
- Modelos de IA **não possuem memória**: o contexto é enviado a cada requisição.
- Desempenho da IA local depende do hardware (CPU/GPU/VRAM) disponível.

### 2.6 Premissas e dependências

- O Ollama (ou provedor de nuvem) está instalado, acessível pela rede e com o modelo configurado já baixado.
- O frontend consome a API via HTTPS em produção.
- O frontend envia a **lista completa de mensagens** da conversa a cada requisição de chat (decisão do levantamento).
- O servidor MySQL está disponível e com as migrações aplicadas.
- Um servidor SMTP está disponível quando a verificação de e-mail ou a recuperação de senha estiverem habilitadas.
- Em produção, modelo local exige servidor com GPU, o que pode tornar a nuvem mais econômica.

---

## 3. Requisitos específicos

### 3.1 Interfaces externas

#### 3.1.1 Interface com o cliente (API HTTP)

| Aspecto | Especificação |
|---|---|
| Protocolo | HTTP/1.1 ou superior; HTTPS obrigatório em produção |
| Estilo | REST, JSON (`application/json`, UTF-8), campos em `snake_case` e em inglês, iguais às colunas do banco ✏️ |
| Streaming | SSE (`text/event-stream`) no endpoint de chat |
| Autenticação | Header `Authorization: Bearer <token>` |
| Prefixo e versão | `/api/v1` |
| Documentação | OpenAPI/Swagger em `/docs` e ReDoc em `/redoc` |
| Identificadores ✏️ | UUID v4 em formato texto (ex.: `7c9e6679-7425-40de-944b-e07fc1f90ae7`) |
| Datas e horas | ISO 8601 em UTC (ex.: `2026-10-28T14:30:00Z`) |
| Paginação | Parâmetros `page` (padrão 1) e `page_size` (padrão 20, máx. 100) |

#### 3.1.2 Interface com o banco de dados ✏️

- Acesso via SQLAlchemy ao MySQL 8, banco `ai_chat`, com pool de conexões.
- Esquema definido em `database.md` (v1.1) e versionado por Alembic; a migração inicial deve reproduzir esse esquema.
- Cada conexão deve configurar o fuso horário da sessão para UTC (`SET time_zone = '+00:00'`), pois as colunas `DATETIME` não guardam fuso (ver RD-03).
- A API deve conectar com um usuário MySQL de **privilégios mínimos** (sem `DROP`/`ALTER` em runtime); migrações usam credencial separada.

#### 3.1.3 Interface com provedores de IA

- Toda comunicação com IA passa pela interface abstrata `AIProvider` (métodos `generate` e `stream`).
- **OllamaProvider:** `POST {OLLAMA_URL}/api/chat` (JSON; streaming por linhas JSON).
- **CloudProvider:** SDK/HTTP do provedor escolhido (implementação futura).
- Formato de mensagens padrão: `[{"role": "user" | "assistant" | "system", "content": "..."}]`.

#### 3.1.4 Interfaces de hardware

Não há interface direta de hardware. O desempenho da IA local depende de CPU (16 GB de RAM para modelos de 1B a 8B parâmetros) e, preferencialmente, de GPU.

#### 3.1.5 Interface de e-mail (SMTP) 🆕

- A API envia e-mails transacionais (verificação de e-mail e recuperação de senha) via SMTP, de forma assíncrona e sem bloquear a resposta HTTP.
- Os e-mails contêm um link para o frontend no formato `{FRONTEND_URL}/verify-email?token=<token>` e `{FRONTEND_URL}/reset-password?token=<token>`.
- Falha no envio não deve impedir o cadastro nem revelar ao cliente se o e-mail existe; deve ser registrada em log.

#### 3.1.6 Configuração (variáveis de ambiente) ✏️

| Variável | Descrição | Exemplo |
|---|---|---|
| `AI_PROVIDER` | Provedor ativo (`ollama` ou `cloud`) | `ollama` |
| `OLLAMA_URL` | URL do servidor Ollama | `http://localhost:11434` |
| `OLLAMA_MODEL` | Modelo local | `llama3.1` |
| `CLOUD_API_KEY` | Chave do provedor de nuvem | (vazio até uso) |
| `CLOUD_MODEL` | Modelo de nuvem | (vazio até uso) |
| `DATABASE_URL` | String de conexão MySQL | `mysql+pymysql://user:pass@host/ai_chat?charset=utf8mb4` |
| `JWT_SECRET` | Segredo de assinatura do JWT | (valor aleatório forte) |
| `JWT_ALGORITHM` | Algoritmo de assinatura | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Validade do access token (padrão reduzido de 30 para 15) ✏️ | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Validade do refresh token (`sessions.expires_at`) | `7` |
| `REQUIRE_EMAIL_VERIFICATION` 🆕 | Exige e-mail verificado para login | `false` |
| `EMAIL_VERIFICATION_EXPIRE_HOURS` 🆕 | Validade do token de verificação | `24` |
| `PASSWORD_RESET_EXPIRE_MINUTES` 🆕 | Validade do token de recuperação de senha | `30` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` 🆕 | Servidor de e-mail | (conforme provedor) |
| `FRONTEND_URL` 🆕 | URL base do frontend, usada nos links dos e-mails | `http://localhost:5173` |
| `SOFT_DELETE_RETENTION_DAYS` 🆕 | Dias até o expurgo de registros excluídos logicamente | `30` |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` 🆕 | Tentativas de login antes do bloqueio / duração do bloqueio | `5` / `15` |
| `ALLOW_CLIENT_SYSTEM_MESSAGES` 🆕 | Aceita mensagens `system` enviadas pelo cliente (RN-06) | `false` |
| `DEFAULT_SYSTEM_PROMPT` 🆕 | Prompt de sistema padrão do servidor | (texto) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` 🆕 | Dados do primeiro administrador (seed, RN-03) | (definir no deploy) |
| `CORS_ORIGINS` | Origens permitidas | `http://localhost:5173` |
| `RATE_LIMIT_CHAT_PER_MIN` | Limite de requisições de chat por usuário | `20` |
| `MAX_MESSAGES_PER_REQUEST` | Máx. de mensagens no contexto | `100` |
| `MAX_MESSAGE_CHARS` | Máx. de caracteres por mensagem | `8000` |

---

### 3.2 Requisitos funcionais

#### 3.2.1 Autenticação (RF-AUT)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-AUT-01** ✏️ | A API deve permitir o **cadastro** de usuário informando `name`, `email` e `password`. O usuário é criado com `role = user` e `status = active`. | M |
| **RF-AUT-02** ✏️ | O e-mail deve ser único (sem diferenciar maiúsculas/minúsculas, garantido pela normalização e pela collation `utf8mb4_unicode_ci`) e ter formato válido; em caso de duplicidade, inclusive com conta excluída logicamente ainda não expurgada, retornar `409 Conflict`. | M |
| **RF-AUT-03** | A senha deve ser armazenada somente como **hash** (`argon2` ou `bcrypt`), nunca em texto puro. | M |
| **RF-AUT-04** ✏️ | A API deve permitir **login** com `email` e `password`, retornando um **access token JWT**, um **refresh token** e o tempo de expiração. A cada login bem-sucedido, a API deve criar uma linha em `sessions` (guardando o SHA-256 do refresh token, `user_agent`, `ip_address` e `expires_at`) e atualizar `users.last_login_at`. | M |
| **RF-AUT-05** | Credenciais inválidas devem retornar `401 Unauthorized` com mensagem genérica, sem revelar se o e-mail existe. | M |
| **RF-AUT-06** ✏️ | Usuários com `status = suspended` não devem conseguir fazer login (`403 Forbidden`, `user_suspended`). Usuários com `status = deleted` (ou `deleted_at` preenchido) devem receber o mesmo `401` de credenciais inválidas. | M |
| **RF-AUT-07** | Todos os endpoints, exceto os públicos (cadastro, login, refresh, verificação de e-mail, recuperação de senha, health, documentação), devem exigir token válido e não expirado. | M |
| **RF-AUT-08** ✏️ | A API deve oferecer endpoint para **renovar o access token** a partir do refresh token. Ela calcula o SHA-256 do token recebido e aceita apenas uma sessão com `revoked_at IS NULL AND expires_at > NOW()` e usuário ativo. A cada renovação, o refresh token deve ser **rotacionado**: a sessão antiga recebe `revoked_at` e uma nova sessão é criada. | S |
| **RF-AUT-09** ✏️ | A API deve oferecer **logout**, preenchendo `sessions.revoked_at` da sessão atual. Com o parâmetro `all_devices = true`, todas as sessões ativas do usuário são revogadas. | S |
| **RF-AUT-10** ✏️ | O access token JWT deve conter, no mínimo, `sub` (id do usuário), `sid` (id da sessão), `role`, `iat` e `exp`. | M |
| **RF-AUT-11** 🆕 | Após o cadastro, a API deve gerar um token de verificação (guardando só o hash em `email_verifications`), enviar o e-mail de confirmação e, ao receber o token válido em `POST /auth/verify-email`, preencher `users.email_verified_at` e `email_verifications.used_at`. | S |
| **RF-AUT-12** 🆕 | A API deve permitir ao usuário autenticado com e-mail não verificado **solicitar novo e-mail de verificação**. Tokens anteriores ainda não usados devem ser invalidados (`used_at` preenchido). | S |
| **RF-AUT-13** 🆕 | A API deve oferecer **recuperação de senha** em duas etapas: (1) `POST /auth/forgot-password` com o e-mail, que sempre responde `202 Accepted`, exista ou não a conta, e, se existir, cria linha em `password_resets` e envia o e-mail; (2) `POST /auth/reset-password` com `token` e `new_password`. | S |
| **RF-AUT-14** 🆕 | Na redefinição de senha, a API deve validar hash do token, `expires_at` e `used_at IS NULL`; atualizar `users.password_hash`; marcar `used_at`; e **revogar todas as sessões** do usuário. | S |
| **RF-AUT-15** 🆕 | Se `REQUIRE_EMAIL_VERIFICATION = true`, o login de usuário com `email_verified_at IS NULL` deve retornar `403 Forbidden` (`email_not_verified`). | S |
| **RF-AUT-16** 🆕 | Se um refresh token já revogado for apresentado, a API deve tratar como possível roubo de token: revogar todas as sessões do usuário e retornar `401`. | C |

#### 3.2.2 Perfil do usuário (RF-PER)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-PER-01** ✏️ | A API deve permitir ao usuário **consultar seus próprios dados** (`id`, `name`, `email`, `avatar_url`, `role`, `status`, `email_verified_at`, `created_at`), sem nunca expor `password_hash`. | M |
| **RF-PER-02** ✏️ | A API deve permitir **editar** `name`, `email` e `avatar_url` do próprio perfil, respeitando a unicidade de e-mail. A troca de e-mail exige a senha atual (`current_password`), zera `email_verified_at` e, se a verificação estiver habilitada, dispara novo e-mail de verificação. | M |
| **RF-PER-03** ✏️ | A API deve permitir **trocar a senha**, exigindo a senha atual e uma nova senha válida. Todas as outras sessões do usuário devem ser revogadas, mantendo a atual. | M |
| **RF-PER-04** ✏️ | A API deve permitir ao usuário **excluir a própria conta**, exigindo confirmação da senha. A exclusão é **lógica**: `status = deleted`, `deleted_at` preenchido e todas as sessões revogadas. Os dados (conversas, mensagens, feedbacks) são removidos em cascata no **expurgo** (RN-11). | S |
| **RF-PER-05** ✏️ | O usuário não pode alterar o próprio `role` nem o próprio `status`. | M |
| **RF-PER-06** 🆕 | A API deve permitir **listar as próprias sessões ativas** (`id`, `user_agent`, `ip_address`, `created_at`, `expires_at` e indicação da sessão atual), sem expor `token_hash`. | C |
| **RF-PER-07** 🆕 | A API deve permitir **revogar uma sessão específica** do próprio usuário (por exemplo, "sair de outro dispositivo"). | C |
| **RF-PER-08** 🆕 | A API deve permitir **exportar os dados do usuário** (perfil, conversas, mensagens e feedbacks) em JSON, atendendo ao direito de portabilidade previsto na LGPD. | C |

#### 3.2.3 Chat (RF-CHAT)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-CHAT-01** | A API deve expor endpoint de chat que recebe a **lista completa de mensagens** (`messages`) da conversa e devolve a resposta do modelo de IA. | M |
| **RF-CHAT-02** | O endpoint deve suportar dois modos, controlados pelo campo `stream` (padrão `true`): **streaming via SSE** e **resposta completa em JSON**. | M |
| **RF-CHAT-03** | No modo streaming, a resposta deve ser enviada em eventos SSE incrementais (pedaços de texto), com evento final de conclusão e evento de erro quando aplicável (ver 3.7.4). | M |
| **RF-CHAT-04** ✏️ | O endpoint chat deve validar a entrada: `messages` não vazio; cada item com `role` ∈ {`system`, `user`, `assistant`} e `content` não vazio; a última mensagem deve ter `role = user`; `conversation_id`, `parent_id` e `user_message_id`, quando informados, devem ser UUIDs válidos; respeitar os limites `MAX_MESSAGES_PER_REQUEST` e `MAX_MESSAGE_CHARS`. | M |
| **RF-CHAT-05** | O endpoint de chat não deve conhecer o provedor concreto: deve usar apenas a interface `AIProvider`, obtida via *factory* a partir de `AI_PROVIDER`. | M |
| **RF-CHAT-06** ✏️ | Se o campo opcional `conversation_id` for informado, a API deve verificar que a conversa pertence ao usuário autenticado e não está excluída, e **persistir**, em uma única transação ao final da geração: (a) a última mensagem do usuário (`role = user`) e (b) a resposta do assistente (`role = assistant`, com `model` e `status`). | M |
| **RF-CHAT-07** | Se `conversation_id` não for informado, a requisição deve ser tratada como **efêmera** (nada é persistido). | M |
| **RF-CHAT-08** ✏️ | Se o cliente interromper a conexão durante o streaming, a API deve cancelar a requisição ao provedor de IA e liberar recursos. Com `conversation_id`, a resposta parcial deve ser persistida com `status = stopped`. | S |
| **RF-CHAT-09** | A API deve aplicar **limite de uso** (rate limit) por usuário no endpoint de chat, retornando `429 Too Many Requests` com `Retry-After`. | M |
| **RF-CHAT-10** ✏️ | Falhas do provedor de IA (indisponível, timeout, erro de modelo) devem ser tratadas e traduzidas para `502 Bad Gateway` ou `504 Gateway Timeout` (ou evento SSE de erro, se o streaming já iniciou). Com `conversation_id`, a API deve persistir a mensagem do usuário e uma mensagem do assistente com `status = error`, `content` parcial (ou vazio) e `error_message` resumido (máx. 500 caracteres, sem dados internos ou segredos). | M |
| **RF-CHAT-11** | A API deve permitir, opcionalmente, um parâmetro `system_prompt` (ou mensagem `system`) para orientar o comportamento do modelo, conforme política definida em RN-06. | C |
| **RF-CHAT-12** ✏️ | Ao persistir a primeira troca de uma conversa cujo título ainda é o padrão (`Nova conversa`), a API deve gerar um título provisório (ex.: primeiros 50 caracteres da pergunta). | S |
| **RF-CHAT-13** 🆕 | Ao persistir, a API deve preencher `messages.parent_id` formando uma cadeia: a mensagem do usuário aponta para a mensagem mais recente da conversa com `status` diferente de `error` (ou `NULL` se a conversa estiver vazia), e a resposta do assistente aponta para a mensagem do usuário. | S |
| **RF-CHAT-14** 🆕 | **Editar pergunta:** se o campo opcional `parent_id` for informado, a nova mensagem do usuário é gravada com esse `parent_id`, criando um ramo alternativo. O `parent_id` deve pertencer à mesma conversa. | C |
| **RF-CHAT-15** 🆕 | **Regenerar resposta:** se o campo opcional `user_message_id` for informado (mensagem do usuário já persistida na conversa, que deve ser a última de `messages`), a API não cria nova mensagem do usuário; grava apenas uma nova resposta do assistente com `parent_id = user_message_id`. | C |
| **RF-CHAT-16** 🆕 | Ao persistir uma troca, a API deve atualizar explicitamente `conversations.updated_at` (e `conversations.model`, se ainda vazio) com o modelo do provedor ativo. | M |
| **RF-CHAT-17** 🆕 | As mensagens `system` recebidas do cliente e o prompt de sistema padrão são usados apenas no contexto enviado à IA e **não são persistidos** em `messages`. | M |

#### 3.2.4 Conversas e mensagens (RF-CONV)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-CONV-01** ✏️ | A API deve permitir **criar** uma conversa (com `title` opcional; padrão `Nova conversa`). O campo `model` é preenchido com o modelo do provedor ativo. | M |
| **RF-CONV-02** ✏️ | A API deve **listar** as conversas do usuário autenticado que não estejam excluídas, ordenadas por `is_pinned` (fixadas primeiro) e depois por `updated_at` decrescente, com paginação. Por padrão, conversas arquivadas ficam fora da lista; o filtro `archived=true` lista somente as arquivadas. | M |
| **RF-CONV-03** | A API deve **consultar** uma conversa específica do usuário. | M |
| **RF-CONV-04** ✏️ | A API deve permitir **atualizar** uma conversa: renomear (`title`, 1 a 200 caracteres), fixar (`is_pinned`) e arquivar (`is_archived`), por `PATCH`. | M |
| **RF-CONV-05** ✏️ | A API deve permitir **excluir** uma conversa por exclusão lógica (`deleted_at`). Suas mensagens são removidas em cascata no expurgo (RN-11). | M |
| **RF-CONV-06** ✏️ | A API deve **listar as mensagens** de uma conversa em ordem cronológica (`created_at` crescente), com paginação, retornando `id`, `parent_id`, `role`, `content`, `model`, `status`, `error_message`, `created_at` e o `feedback` do próprio usuário, quando houver. Todos os ramos são retornados; o cliente monta a árvore por `parent_id`. | M |
| **RF-CONV-07** ✏️ | Um usuário não pode acessar, alterar ou excluir conversas de outro usuário, nem conversas já excluídas; o acesso indevido deve retornar `404 Not Found` (para não revelar a existência do recurso). | M |
| **RF-CONV-08** | A listagem de conversas deve aceitar filtro de busca por título (`q`). | C |
| **RF-CONV-09** ✏️ | A API deve permitir **excluir todas** as conversas do usuário de uma só vez (exclusão lógica). | C |

#### 3.2.5 Feedback de mensagens (RF-FDB) 🆕

| ID | Requisito | Prior. |
|---|---|---|
| **RF-FDB-01** 🆕 | A API deve permitir ao usuário **avaliar** uma resposta da IA com `rating` ∈ {`up`, `down`} e `comment` opcional (até 500 caracteres). Reenviar a avaliação atualiza a anterior (um voto por usuário por mensagem). | S |
| **RF-FDB-02** 🆕 | A API deve permitir **remover** a própria avaliação. | S |
| **RF-FDB-03** 🆕 | Só podem ser avaliadas mensagens com `role = assistant` pertencentes a conversas do próprio usuário e não excluídas; caso contrário, `404` (conversa de outro usuário) ou `422` (mensagem que não é do assistente). | S |

#### 3.2.6 Administração (RF-ADM)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-ADM-01** | Todos os endpoints `/admin/*` devem ser acessíveis somente por usuários com `role = admin`; outros recebem `403 Forbidden`. | M |
| **RF-ADM-02** ✏️ | A API deve permitir ao administrador **listar usuários** com paginação e filtros (`q` por nome/e-mail, `role`, `status`). Por padrão, usuários com `status = deleted` ficam fora da lista. | M |
| **RF-ADM-03** ✏️ | A API deve permitir **consultar** os dados de um usuário específico, incluindo `status`, `email_verified_at` e `last_login_at`. | M |
| **RF-ADM-04** ✏️ | A API deve permitir **alterar** `name`, `email`, `role` e `status` (`active` ou `suspended`) de qualquer usuário. | M |
| **RF-ADM-05** ✏️ | A API deve permitir **suspender/reativar** um usuário (`status`); ao suspender, todas as sessões do usuário são revogadas e os tokens existentes passam a ser rejeitados (ver RN-04). | M |
| **RF-ADM-06** ✏️ | A API deve permitir **excluir** um usuário por exclusão lógica (`status = deleted`, `deleted_at`); seus dados são removidos em cascata no expurgo. | S |
| **RF-ADM-07** | Um administrador não pode excluir, suspender nem remover o próprio papel de admin se for o **último administrador ativo** do sistema. | M |
| **RF-ADM-08** | A API deve permitir ao administrador **redefinir a senha** de um usuário (senha temporária ou nova senha informada), revogando suas sessões. | S |
| **RF-ADM-09** ✏️ | A API deve fornecer **estatísticas de uso**: total de usuários, usuários ativos, total de conversas, total de mensagens, mensagens por período e total de feedbacks positivos e negativos. Registros excluídos logicamente não entram na contagem. | S |
| **RF-ADM-10** | A API deve informar o **status do provedor de IA** ativo (nome, modelo configurado e disponibilidade), sem expor chaves ou segredos. | S |
| **RF-ADM-11** ✏️ | Ações administrativas sensíveis (alteração de papel, suspensão, exclusão, redefinição de senha, criação de usuário) devem ser registradas na tabela `audit_logs`. | S |
| **RF-ADM-12** ✏️ | A API deve permitir ao administrador **criar usuários** diretamente, definindo o papel; o `email_verified_at` é preenchido na criação. | C |
| **RF-ADM-13** 🆕 | A API deve permitir ao administrador **consultar o log de auditoria** com paginação e filtros (`action`, `actor_id`, `target_type`, `target_id`, período). | S |

#### 3.2.7 Sistema (RF-SIS)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-SIS-01** | A API deve expor `GET /health` (público) indicando se o serviço está no ar e se o banco responde. | M |
| **RF-SIS-02** | A API deve expor documentação interativa OpenAPI automática. | M |
| **RF-SIS-03** | A API deve incluir um identificador de requisição (`X-Request-ID`) em todas as respostas, para rastreabilidade. | S |
| **RF-SIS-04** | O health check deve poder incluir a disponibilidade do provedor de IA (`GET /health/ready`). | C |
| **RF-SIS-05** 🆕 | A API deve fornecer uma **rotina de manutenção** (comando CLI ou tarefa agendada, nunca endpoint público) que: (a) apaga `sessions` vencidas há mais de 30 dias e `password_resets`/`email_verifications` vencidos há mais de 7 dias; (b) executa o **expurgo** de usuários e conversas excluídos logicamente há mais que `SOFT_DELETE_RETENTION_DAYS`. | S |
| **RF-SIS-06** 🆕 | Na inicialização, a API deve criar o primeiro administrador a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`, se ainda não existir nenhum (seed, RN-03). | M |

---

### 3.3 Requisitos de dados

#### 3.3.1 Modelo lógico ✏️

O modelo de dados é o do banco `ai_chat`, definido em `database.md` (v1.1), que é a **fonte normativa** de colunas, tipos, índices e chaves estrangeiras. Todos os IDs são `CHAR(36)` (UUID v4 gerado pela API). A tabela abaixo resume as entidades e os requisitos que as utilizam.

| Tabela | Função | Requisitos |
|---|---|---|
| `users` | Cadastro, papel e situação da conta | RF-AUT, RF-PER, RF-ADM |
| `sessions` | Refresh tokens ativos, um por dispositivo (substitui `refresh_tokens` da v1.0) | RF-AUT-04, 08, 09, 16, RF-PER-06, 07 |
| `password_resets` | Tokens de recuperação de senha | RF-AUT-13, 14 |
| `email_verifications` | Tokens de confirmação de e-mail | RF-AUT-11, 12, 15 |
| `conversations` | Conversas do usuário (histórico) | RF-CONV, RF-CHAT |
| `messages` | Mensagens, em árvore por `parent_id` | RF-CHAT, RF-CONV-06 |
| `message_feedback` | Avaliação `up`/`down` das respostas | RF-FDB |
| `audit_logs` | Auditoria de ações administrativas (criada na v1.1 do banco) | RF-ADM-11, 13 |

```
users ─┬─< sessions
       ├─< password_resets
       ├─< email_verifications
       ├─< conversations ─< messages ─< message_feedback
       ├─< message_feedback
       └─< audit_logs (actor_id, ON DELETE SET NULL)
```

#### 3.3.2 Mapa de campos (v1.0 → banco) ✏️

| Entidade | Campo no SRS v1.0 | Coluna no banco / campo da API (v1.1) |
|---|---|---|
| Todas | `id` BIGINT | `id` CHAR(36), UUID |
| `users` | `nome` | `name` |
| `users` | `senha_hash` | `password_hash` (nunca exposto) |
| `users` | `ativo` BOOLEAN | `status` ENUM(`active`,`suspended`,`deleted`) |
| `users` | `criado_em` / `atualizado_em` | `created_at` / `updated_at` |
| `users` | (não existia) | `avatar_url`, `email_verified_at`, `last_login_at`, `deleted_at` |
| `conversations` | `titulo` | `title` |
| `conversations` | (não existia) | `model`, `is_pinned`, `is_archived`, `deleted_at` |
| `messages` | `conteudo` | `content` |
| `messages` | `incompleta` BOOLEAN | `status` ENUM(`complete`,`error`,`stopped`); interrompida = `stopped` |
| `messages` | `role` (`user`,`assistant`) | `role` (`system`,`user`,`assistant`); `system` não é persistido nesta versão |
| `messages` | (não existia) | `parent_id`, `model`, `error_message` |
| `refresh_tokens` | tabela inteira | `sessions` (`revogado` → `revoked_at`; `expira_em` → `expires_at`; `token_hash` passa a ser SHA-256 em `CHAR(64)`) |
| `audit_logs` | `acao`, `alvo_tipo`, `alvo_id`, `detalhes` | `action`, `target_type`, `target_id` (CHAR(36)), `details` |

#### 3.3.3 Requisitos de dados

| ID | Requisito |
|---|---|
| **RD-01** ✏️ | Todas as alterações de esquema devem ser feitas por **migrações Alembic** versionadas. A migração inicial deve reproduzir o esquema de `database.md` v1.1. |
| **RD-02** ✏️ | A remoção física de usuário deve apagar em cascata sessões, tokens, conversas, mensagens e feedbacks; a remoção física de conversa apaga suas mensagens. Ela ocorre no **expurgo** (RF-SIS-05), não no momento da exclusão. |
| **RD-03** ✏️ | Datas devem ser armazenadas em UTC. Como `DATETIME` não guarda fuso, toda conexão deve executar `SET time_zone = '+00:00'`, e a API deve gerar em UTC os valores de data que ela mesma preenche. |
| **RD-04** ✏️ | Os campos `password_hash` e `token_hash` nunca devem ser retornados em nenhuma resposta nem escritos em logs. |
| **RD-05** | O e-mail deve ser normalizado (minúsculas, sem espaços nas pontas) antes de gravar e comparar. |
| **RD-06** | O banco deve usar charset `utf8mb4` (collation `utf8mb4_unicode_ci`) para suportar emojis e todos os idiomas. |
| **RD-07** 🆕 | Os IDs são UUID v4 gerados pela API; IDs sequenciais não são expostos. |
| **RD-08** 🆕 | Toda consulta a `users` (exceto a verificação de unicidade de e-mail e o expurgo) e a `conversations` deve filtrar registros excluídos logicamente (`deleted_at IS NULL`). |
| **RD-09** 🆕 | Refresh tokens e tokens de verificação/recuperação devem ser gerados com gerador criptograficamente seguro, enviados ao cliente uma única vez e armazenados apenas como **SHA-256 em hexadecimal** (`CHAR(64)`). |
| **RD-10** 🆕 | `messages.created_at` tem precisão de milissegundos (`DATETIME(3)`). A API deve preencher explicitamente `created_at` da mensagem do usuário (instante do recebimento) e do assistente (instante da conclusão), garantindo a ordem cronológica. |
| **RD-11** 🆕 | `conversations.updated_at` deve ser atualizado explicitamente a cada nova troca de mensagens. |
| **RD-12** 🆕 | `audit_logs.details` não deve conter dados sensíveis (senhas, tokens, conteúdo de mensagens). `audit_logs.actor_id` usa `ON DELETE SET NULL`, para que o log sobreviva ao expurgo do administrador. |

---

### 3.4 Requisitos não funcionais

#### 3.4.1 Desempenho

| ID | Requisito |
|---|---|
| **RNF-DES-01** | Endpoints sem IA (auth, perfil, conversas, admin) devem responder em até **300 ms** no percentil 95, em condições normais de carga. |
| **RNF-DES-02** | O overhead da API sobre o provedor de IA no início do streaming deve ser inferior a **200 ms**; o tempo até o primeiro token depende do provedor/hardware. |
| **RNF-DES-03** | A API deve ser assíncrona (`async`) e não bloquear o *event loop* em chamadas de IA ou de rede. |
| **RNF-DES-04** | A API deve suportar no mínimo **50 conexões de streaming simultâneas** em um único nó, limitada pela capacidade do provedor de IA. |
| **RNF-DES-05** ✏️ | Listagens devem usar paginação e os índices do banco (`idx_conv_user_updated`, `idx_msg_conv_created`, `idx_sessions_user`), sem varredura completa de tabela. |

#### 3.4.2 Segurança

| ID | Requisito |
|---|---|
| **RNF-SEG-01** | Senhas com hash **argon2** (preferencial) ou **bcrypt**, com *salt* individual. |
| **RNF-SEG-02** | Política de senha: mínimo de 8 caracteres, com ao menos uma letra e um número. |
| **RNF-SEG-03** ✏️ | Access token com validade curta (padrão 15 min); refresh token com validade configurável, armazenado apenas como hash em `sessions` e rotacionado a cada uso. |
| **RNF-SEG-04** | Em produção, todo o tráfego deve ocorrer sobre **HTTPS/TLS**. |
| **RNF-SEG-05** | **CORS** restrito às origens configuradas em `CORS_ORIGINS`. |
| **RNF-SEG-06** | Proteção contra força bruta: limite de tentativas de login por IP/e-mail (`LOGIN_MAX_ATTEMPTS`), com bloqueio temporário (`LOGIN_LOCK_MINUTES`) e resposta `429`. |
| **RNF-SEG-07** | Acesso ao banco exclusivamente por ORM/consultas parametrizadas (prevenção de SQL Injection). |
| **RNF-SEG-08** | Validação rigorosa de entrada com Pydantic; rejeitar campos desconhecidos nos corpos sensíveis. |
| **RNF-SEG-09** | Segredos (`JWT_SECRET`, `CLOUD_API_KEY`, `SMTP_PASSWORD`, credenciais do banco) somente em variáveis de ambiente ou cofre de segredos; nunca no repositório. |
| **RNF-SEG-10** | A chave da API de nuvem nunca deve ser exposta ao cliente nem aparecer em logs ou respostas. |
| **RNF-SEG-11** ✏️ | Autorização por recurso: verificação de propriedade (`conversations.user_id`) e de `deleted_at IS NULL` em todo acesso a conversas, mensagens e feedbacks. |
| **RNF-SEG-12** | Limite de tamanho do corpo da requisição (padrão 1 MB) para evitar abuso. |
| **RNF-SEG-13** | Cabeçalhos de segurança básicos nas respostas (ex.: `X-Content-Type-Options: nosniff`). |
| **RNF-SEG-14** | O conteúdo gerado pela IA deve ser tratado como dado não confiável; a API não deve executá-lo nem interpretá-lo como instruções. |
| **RNF-SEG-15** 🆕 | Tokens de verificação de e-mail e de recuperação de senha são de **uso único** (`used_at`), expiram (`expires_at`) e têm entropia mínima de 256 bits. |
| **RNF-SEG-16** 🆕 | Os endpoints de recuperação de senha e de reenvio de verificação não devem permitir enumeração de contas: resposta e tempo de resposta equivalentes para e-mails existentes e inexistentes. |
| **RNF-SEG-17** 🆕 | O papel (`role`) e a situação (`status`) usados na autorização vêm sempre do banco, nunca apenas do JWT. |

#### 3.4.3 Confiabilidade e disponibilidade

| ID | Requisito |
|---|---|
| **RNF-CON-01** | Timeout configurável nas chamadas ao provedor de IA (padrão 120 s para resposta completa); no streaming, sem limite total, mas com detecção de inatividade (padrão 60 s sem dados). |
| **RNF-CON-02** | Falhas do provedor de IA não devem derrubar a API nem afetar endpoints que não dependem dela. |
| **RNF-CON-03** ✏️ | Transações de banco devem garantir consistência: mensagem do usuário, mensagem do assistente e atualização de `conversations` são gravadas de forma atômica ao final da geração. |
| **RNF-CON-04** | Disponibilidade-alvo de **99%** mensal para a API (excluindo indisponibilidade do provedor de IA). |
| **RNF-CON-05** | Encerramento gracioso (*graceful shutdown*): permitir a conclusão de requisições em andamento antes de parar. |
| **RNF-CON-06** 🆕 | Indisponibilidade do SMTP não deve afetar login, chat nem demais endpoints; o envio de e-mail deve ter tentativas de reenvio limitadas. |

#### 3.4.4 Manutenibilidade e extensibilidade

| ID | Requisito |
|---|---|
| **RNF-MAN-01** | Adoção do padrão **Strategy** para provedores de IA: interface `AIProvider` com `generate` e `stream`; implementações `OllamaProvider` e `CloudProvider`; escolha via `factory.py`. |
| **RNF-MAN-02** | Adicionar um novo provedor de IA deve exigir apenas: nova classe que implemente `AIProvider`, novo ramo na *factory* e novas variáveis no `.env`. |
| **RNF-MAN-03** ✏️ | Estrutura modular do projeto: `api/` (rotas), `core/` (segurança), `db/` (modelos e sessão), `ai/` (provedores), `services/` (e-mail e rotinas de manutenção), `config.py` (configuração). |
| **RNF-MAN-04** | Cobertura mínima de testes automatizados de **80%** nas camadas de serviço e rotas. |
| **RNF-MAN-05** | Código aderente à PEP 8, com *linter* e formatador (ex.: Ruff/Black) e tipagem estática (mypy) no CI. |
| **RNF-MAN-06** | Dependências com versões fixadas em `requirements.txt`. |
| **RNF-MAN-07** 🆕 | Os modelos SQLAlchemy devem espelhar exatamente o esquema de `database.md`; divergência entre modelo e banco deve ser detectada no CI (`alembic check`). |

#### 3.4.5 Portabilidade

| ID | Requisito |
|---|---|
| **RNF-POR-01** ✏️ | A API deve poder ser executada em contêiner (Docker) e fornecer `Dockerfile` e `docker-compose` (API + MySQL 8 com o banco `ai_chat`) para desenvolvimento. |
| **RNF-POR-02** | Toda configuração deve vir de variáveis de ambiente (12-factor app). |

#### 3.4.6 Observabilidade

| ID | Requisito |
|---|---|
| **RNF-OBS-01** | Logs estruturados (JSON) com nível, data/hora, `request_id`, rota, status e latência. |
| **RNF-OBS-02** | Logs não devem conter senhas, tokens, chaves de API nem o conteúdo integral das mensagens (apenas metadados, salvo modo de depuração explícito). |
| **RNF-OBS-03** ✏️ | Registro de métricas por requisição de chat **em log**: provedor, modelo, duração e, quando disponível, quantidade de tokens. O banco não guarda tokens nesta versão. |

#### 3.4.7 Usabilidade da API

| ID | Requisito |
|---|---|
| **RNF-USA-01** | Respostas de erro padronizadas e legíveis (ver 3.8). |
| **RNF-USA-02** ✏️ | Nomes de recursos e campos consistentes; campos em inglês e `snake_case`, idênticos às colunas do banco (`name`, `title`, `content`, `created_at`). |
| **RNF-USA-03** | Documentação OpenAPI com descrição e exemplos para todos os endpoints. |

---

### 3.5 Regras de negócio

| ID | Regra |
|---|---|
| **RN-01** | O e-mail identifica unicamente o usuário. |
| **RN-02** ✏️ | Todo usuário novo é criado com `role = user` e `status = active`; somente um administrador pode conceder o papel `admin`. |
| **RN-03** | O primeiro administrador é criado por *seed*/script de inicialização (variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD`), não por cadastro público. |
| **RN-04** ✏️ | Usuário suspenso ou excluído tem o acesso bloqueado imediatamente: a cada requisição autenticada a API verifica `users.status = active`, `deleted_at IS NULL` e que a sessão do token (`sid`) não foi revogada. |
| **RN-05** | Cada conversa pertence a exatamente um usuário; mensagens pertencem a uma única conversa. |
| **RN-06** ✏️ | Mensagens com `role = system` enviadas pelo cliente são aceitas somente se `ALLOW_CLIENT_SYSTEM_MESSAGES = true`; caso contrário, são rejeitadas com `422`. O `DEFAULT_SYSTEM_PROMPT` do servidor, se definido, é prefixado ao contexto. |
| **RN-07** | O modelo de IA não possui memória; o contexto que o cliente envia é encaminhado integralmente ao provedor (após validação e limites). |
| **RN-08** | A persistência no chat ocorre somente quando `conversation_id` é informado (RF-CHAT-06/07). |
| **RN-09** | O histórico persistido é a fonte para consulta posterior (`GET /conversations/{id}/messages`); o cliente é responsável por reenviar o contexto desejado ao usar o chat. |
| **RN-10** | Deve existir ao menos um administrador ativo em todos os momentos (RF-ADM-07). |
| **RN-11** ✏️ | Excluir um usuário ou uma conversa é **lógico** e imediato do ponto de vista do cliente (o recurso some e responde `404`). A remoção física, irreversível, ocorre após `SOFT_DELETE_RETENTION_DAYS` pelo expurgo. Não há endpoint de restauração nesta versão. |
| **RN-12** | O limite de uso por usuário (RF-CHAT-09) é contado por janela deslizante de 1 minuto. |
| **RN-13** 🆕 | Enviar mensagem a uma conversa arquivada é permitido e não a desarquiva. |
| **RN-14** 🆕 | Cada usuário tem no máximo uma avaliação por mensagem (`UNIQUE (message_id, user_id)`), e apenas respostas do assistente podem ser avaliadas. |
| **RN-15** 🆕 | Transições de `users.status`: `active` ⇄ `suspended` (somente admin); `active` ou `suspended` → `deleted` (usuário ou admin). `deleted` é terminal. |
| **RN-16** 🆕 | Enquanto a conta excluída não for expurgada, seu e-mail permanece reservado (RF-AUT-02). |
| **RN-17** 🆕 | Significado de `messages.status`: `complete` (finalizada), `stopped` (usuário interrompeu a geração; conteúdo parcial) e `error` (falha do provedor). Respostas `error` não são usadas como pai padrão de novas mensagens nem devem entrar em contexto montado pelo servidor (alternativa futura, ponto em aberto nº 6). |
| **RN-18** 🆕 | Alterar o e-mail invalida a verificação anterior; trocar ou redefinir a senha revoga as demais sessões. |

---

### 3.6 Restrições de projeto

| ID | Restrição |
|---|---|
| **RP-01** | Linguagem Python; framework FastAPI. |
| **RP-02** ✏️ | Persistência em MySQL 8 (InnoDB, `utf8mb4`) com SQLAlchemy e Alembic, seguindo o esquema de `database.md`. |
| **RP-03** | Autenticação baseada em JWT (`PyJWT` ou `python-jose`), com suporte nativo OAuth2 do FastAPI. |
| **RP-04** | Comunicação com Ollama via `httpx` ou biblioteca `ollama`. |
| **RP-05** | Streaming de respostas via SSE com `StreamingResponse`. |
| **RP-06** | Padrão Strategy obrigatório para provedores de IA (RNF-MAN-01). |
| **RP-07** | A troca de provedor de IA deve ocorrer **apenas** pela variável `AI_PROVIDER` (e variáveis correlatas). |
| **RP-08** 🆕 | IDs em UUID v4 (`CHAR(36)`), gerados na aplicação (`uuid.uuid4()`). |
| **RP-09** 🆕 | Contadores de rate limit e de tentativas de login ficam em memória (nó único) ou em Redis (vários nós); não usam tabelas do banco. |
| **RP-10** 🆕 | Envio de e-mail via SMTP (ex.: `aiosmtplib`), de forma assíncrona. |

---

### 3.7 Catálogo de endpoints

Prefixo comum: `/api/v1`. **Auth:** 🔓 público · 🔐 usuário autenticado · 🛡️ somente admin. Todos os `{id}` são UUID.

#### 3.7.1 Autenticação ✏️

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | Cadastra usuário | RF-AUT-01 a 03, 11 |
| POST | `/auth/login` | 🔓 | Autentica, cria sessão e retorna tokens | RF-AUT-04 a 06, 10, 15 |
| POST | `/auth/refresh` | 🔓 | Renova o access token e rotaciona o refresh token | RF-AUT-08, 16 |
| POST | `/auth/logout` | 🔐 | Revoga a sessão atual (ou todas, com `all_devices`) | RF-AUT-09 |
| POST | `/auth/verify-email` 🆕 | 🔓 | Confirma o e-mail com o token recebido | RF-AUT-11 |
| POST | `/auth/resend-verification` 🆕 | 🔐 | Reenvia o e-mail de verificação | RF-AUT-12 |
| POST | `/auth/forgot-password` 🆕 | 🔓 | Solicita e-mail de recuperação (sempre `202`) | RF-AUT-13 |
| POST | `/auth/reset-password` 🆕 | 🔓 | Define nova senha com o token e revoga sessões | RF-AUT-14 |

**Resposta do login (`200 OK`)** ✏️

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "q3Xk...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Maria Silva",
    "email": "maria@exemplo.com",
    "role": "user"
  }
}
```

#### 3.7.2 Perfil ✏️

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| GET | `/users/me` | 🔐 | Dados do próprio perfil | RF-PER-01 |
| PATCH | `/users/me` | 🔐 | Edita `name`, `email`, `avatar_url` | RF-PER-02, 05 |
| POST | `/users/me/password` | 🔐 | Troca a senha | RF-PER-03 |
| DELETE | `/users/me` | 🔐 | Exclui (logicamente) a própria conta | RF-PER-04 |
| GET | `/users/me/sessions` 🆕 | 🔐 | Lista sessões ativas | RF-PER-06 |
| DELETE | `/users/me/sessions/{id}` 🆕 | 🔐 | Revoga uma sessão | RF-PER-07 |
| GET | `/users/me/export` 🆕 | 🔐 | Exporta os dados do usuário em JSON | RF-PER-08 |

#### 3.7.3 Conversas, mensagens e feedback ✏️

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| POST | `/conversations` | 🔐 | Cria conversa | RF-CONV-01 |
| GET | `/conversations` | 🔐 | Lista conversas (paginação; filtros `q` e `archived`) | RF-CONV-02, 08 |
| GET | `/conversations/{id}` | 🔐 | Consulta conversa | RF-CONV-03, 07 |
| PATCH | `/conversations/{id}` | 🔐 | Altera `title`, `is_pinned`, `is_archived` | RF-CONV-04, 07 |
| DELETE | `/conversations/{id}` | 🔐 | Exclui conversa (exclusão lógica) | RF-CONV-05, 07 |
| DELETE | `/conversations` | 🔐 | Exclui todas as conversas do usuário | RF-CONV-09 |
| GET | `/conversations/{id}/messages` | 🔐 | Lista mensagens (todos os ramos, com `parent_id`) | RF-CONV-06, 07 |
| PUT | `/messages/{id}/feedback` 🆕 | 🔐 | Cria ou atualiza avaliação (`up`/`down`, `comment`) | RF-FDB-01, 03 |
| DELETE | `/messages/{id}/feedback` 🆕 | 🔐 | Remove a própria avaliação | RF-FDB-02, 03 |

#### 3.7.4 Chat

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| POST | `/chat` | 🔐 | Envia mensagens e recebe a resposta (JSON ou SSE) | RF-CHAT-01 a 17 |

**Corpo da requisição** ✏️

```json
{
  "messages": [
    {"role": "user", "content": "Olá!"},
    {"role": "assistant", "content": "Olá! Como posso ajudar?"},
    {"role": "user", "content": "Explique o que é SSE."}
  ],
  "conversation_id": "3f2b8c1e-9a47-4d3e-8b1a-5c6d7e8f9a0b",
  "stream": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `messages` | array | Sim | Lista completa do contexto; a última deve ser `role = user` |
| `conversation_id` | UUID | Não | Se informado, persiste a pergunta e a resposta nessa conversa |
| `stream` | booleano | Não | `true` (padrão): SSE; `false`: JSON completo |
| `parent_id` 🆕 | UUID | Não | Mensagem à qual a nova pergunta se liga (editar pergunta, cria ramo). Exige `conversation_id` |
| `user_message_id` 🆕 | UUID | Não | Mensagem do usuário já salva cuja resposta será regenerada. Exige `conversation_id` |

**Resposta com `stream = false` (`200 OK`)** ✏️

```json
{
  "message": {
    "id": "a1b2c3d4-0000-4000-8000-000000000001",
    "role": "assistant",
    "content": "SSE é ...",
    "status": "complete"
  },
  "user_message_id": "a1b2c3d4-0000-4000-8000-000000000000",
  "conversation_id": "3f2b8c1e-9a47-4d3e-8b1a-5c6d7e8f9a0b",
  "provider": "ollama",
  "model": "llama3.1"
}
```

Sem `conversation_id`, `message.id`, `user_message_id` e `conversation_id` são `null`, pois nada é persistido.

**Resposta com `stream = true` (`200 OK`, `text/event-stream`)** ✏️

Cada pedaço é enviado como JSON dentro de `data:`. Isso evita quebras de protocolo quando o texto contém novas linhas, uma melhoria em relação ao esboço do levantamento (`data: {chunk}`).

```
data: {"content": "SSE é "}

data: {"content": "um mecanismo ..."}

event: done
data: {"conversation_id": "3f2b8c1e-...", "user_message_id": "a1b2c3d4-...0000", "message_id": "a1b2c3d4-...0001", "status": "complete"}

```

Em caso de falha após o início do fluxo:

```
event: error
data: {"code": "ai_provider_unavailable", "detail": "O provedor de IA não respondeu."}

```

#### 3.7.5 Administração ✏️

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| GET | `/admin/users` | 🛡️ | Lista usuários (paginação; filtros `q`, `role`, `status`) | RF-ADM-02 |
| POST | `/admin/users` | 🛡️ | Cria usuário com papel definido | RF-ADM-12 |
| GET | `/admin/users/{id}` | 🛡️ | Consulta usuário | RF-ADM-03 |
| PATCH | `/admin/users/{id}` | 🛡️ | Altera `name`, `email`, `role`, `status` | RF-ADM-04, 05, 07 |
| POST | `/admin/users/{id}/reset-password` | 🛡️ | Redefine senha | RF-ADM-08 |
| DELETE | `/admin/users/{id}` | 🛡️ | Exclui (logicamente) o usuário | RF-ADM-06, 07 |
| GET | `/admin/stats` | 🛡️ | Estatísticas de uso (inclui feedbacks) | RF-ADM-09 |
| GET | `/admin/ai/status` | 🛡️ | Status do provedor de IA | RF-ADM-10 |
| GET | `/admin/audit-logs` | 🛡️ | Consulta o log de auditoria (paginação e filtros) | RF-ADM-11, 13 |

#### 3.7.6 Sistema

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| GET | `/health` | 🔓 | Saúde da API e do banco | RF-SIS-01 |
| GET | `/health/ready` | 🔓 | Prontidão (inclui provedor de IA) | RF-SIS-04 |
| GET | `/docs`, `/redoc` | 🔓 | Documentação OpenAPI | RF-SIS-02 |

> `/health` e `/docs` ficam fora do prefixo `/api/v1`. A rotina de manutenção (RF-SIS-05) não é exposta como endpoint.

---

### 3.8 Padrão de erros

Os erros seguem uma estrutura inspirada na RFC 9457 (Problem Details):

```json
{
  "type": "about:blank",
  "title": "Conflito",
  "status": 409,
  "code": "email_already_registered",
  "detail": "Já existe um usuário com este e-mail.",
  "request_id": "b1f4c7e2-..."
}
```

Para erros de validação (`422`), incluir o campo `errors` com a lista de campos inválidos e motivos.

| HTTP | Quando ocorre | Exemplo de `code` |
|---|---|---|
| 400 | Requisição malformada; token de verificação/recuperação inválido, expirado ou já usado ✏️ | `bad_request`, `invalid_token` |
| 401 | Token ausente/inválido/expirado; credenciais inválidas; refresh token revogado ✏️ | `invalid_credentials`, `token_expired`, `session_revoked` |
| 403 | Sem permissão (não admin), usuário suspenso, e-mail não verificado ✏️ | `forbidden`, `user_suspended`, `email_not_verified` |
| 404 | Recurso inexistente, excluído ou de outro usuário ✏️ | `not_found` |
| 409 | Conflito (e-mail duplicado, último admin) | `email_already_registered`, `last_admin` |
| 413 | Corpo acima do limite | `payload_too_large` |
| 422 | Falha de validação (inclui UUID malformado e avaliação de mensagem que não é do assistente) ✏️ | `validation_error` |
| 429 | Limite de uso ou de tentativas de login excedido | `rate_limited` |
| 500 | Erro interno | `internal_error` |
| 502 | Erro retornado pelo provedor de IA | `ai_provider_error` |
| 504 | Timeout do provedor de IA | `ai_provider_timeout` |

---

## 4. Critérios de aceitação

A API será considerada aceita quando:

| ID | Critério |
|---|---|
| **CA-01** | Um visitante consegue se cadastrar, fazer login e acessar `/users/me` com o token recebido. |
| **CA-02** ✏️ | Senhas e refresh tokens aparecem apenas como hash no banco (`password_hash`, `sessions.token_hash`) e nunca em respostas ou logs. |
| **CA-03** | `POST /chat` com `stream = true` entrega a resposta incrementalmente e finaliza com o evento `done`. |
| **CA-04** | `POST /chat` com `stream = false` retorna a resposta completa em JSON. |
| **CA-05** ✏️ | Com `conversation_id`, a pergunta e a resposta ficam salvas, ligadas por `parent_id`, em ordem cronológica, e aparecem em `GET /conversations/{id}/messages`. |
| **CA-06** | Sem `conversation_id`, nenhuma mensagem é persistida. |
| **CA-07** ✏️ | Um usuário não consegue ler, editar ou excluir conversas de outro, nem conversas excluídas (resposta `404`). |
| **CA-08** | Trocar `AI_PROVIDER` (`ollama` → `cloud`, após implementar o `CloudProvider`) não exige nenhuma alteração em `api/chat.py`. |
| **CA-09** ✏️ | Com o Ollama parado, `POST /chat` retorna `502`/`504` (ou evento `error`), a mensagem do assistente é gravada com `status = error` quando há `conversation_id`, e os demais endpoints continuam funcionando. |
| **CA-10** | Usuário comum recebe `403` em qualquer `/admin/*`; admin gerencia usuários com sucesso. |
| **CA-11** ✏️ | Usuário suspenso pelo admin perde o acesso imediatamente (access token rejeitado e sessões revogadas). |
| **CA-12** | A API impede a exclusão/suspensão/rebaixamento do último administrador ativo. |
| **CA-13** | O limite de uso do chat é aplicado e retorna `429` com `Retry-After`. |
| **CA-14** | A documentação OpenAPI lista todos os endpoints com exemplos. |
| **CA-15** ✏️ | Todas as migrações Alembic aplicam e revertem sem erro em banco vazio, e o esquema resultante é idêntico ao de `database.md` v1.1. |
| **CA-16** | Cobertura de testes automatizados ≥ 80% e pipeline de lint/tipagem sem falhas. |
| **CA-17** 🆕 | O refresh token é rotacionado a cada renovação; reapresentar um token já usado revoga todas as sessões (quando RF-AUT-16 estiver implementado). |
| **CA-18** 🆕 | Fluxo de recuperação de senha: o e-mail é enviado, o token funciona uma única vez, expira no prazo e, após a troca, todas as sessões antigas deixam de funcionar. |
| **CA-19** 🆕 | Fluxo de verificação de e-mail preenche `email_verified_at`; com `REQUIRE_EMAIL_VERIFICATION = true`, usuário não verificado recebe `403` no login. |
| **CA-20** 🆕 | Excluir conversa ou conta torna o recurso inacessível imediatamente, mantém o registro marcado no banco e o expurgo remove-o fisicamente após o prazo de retenção, em cascata. |
| **CA-21** 🆕 | A listagem de conversas coloca as fixadas no topo, oculta as arquivadas por padrão e as exibe com `archived=true`. |
| **CA-22** 🆕 | O usuário avalia uma resposta do assistente com `up` ou `down`, altera e remove a avaliação; avaliar mensagem de usuário retorna `422`. |
| **CA-23** 🆕 | Ações administrativas sensíveis geram registros consultáveis em `/admin/audit-logs`. |
| **CA-24** 🆕 | Todas as datas gravadas e retornadas estão em UTC, independentemente do fuso do servidor MySQL. |

---

## 5. Apêndices

### 5.1 Itens fora do escopo (versão 1.1) ✏️

- Frontend React e seus requisitos.
- Cobrança, planos pagos, cotas e controle de custo por tokens (o banco não guarda tokens nesta versão).
- Login social (Google, GitHub etc.) e autenticação multifator.
- Upload de arquivos/imagens (inclusive de avatar, que é apenas uma URL) e RAG (busca em documentos).
- Restauração de conversas ou contas excluídas (a exclusão é lógica no banco, mas não há endpoint de lixeira).
- Compartilhamento de conversas entre usuários.
- Projetos/pastas de conversas e memória do usuário.
- Implementação efetiva do `CloudProvider` (somente o contrato e o esqueleto estão no escopo).

> Saíram desta lista, por já terem suporte no banco: verificação de e-mail e recuperação de senha por e-mail.

### 5.2 Decisões e premissas adotadas neste SRS ✏️

| # | Decisão | Motivo |
|---|---|---|
| 1 | Escopo da API inclui cadastro, login, chat, histórico, perfil e administração. | Definido pelo solicitante. |
| 2 | O `/chat` recebe a **lista completa de mensagens** do cliente. | Definido pelo solicitante (conforme o levantamento). |
| 3 | A persistência no chat é opcional e controlada por `conversation_id`. | Compatibiliza o contexto enviado pelo cliente com o salvamento de histórico previsto no levantamento. |
| 4 | Eventos SSE carregam JSON em `data:`. | Evita problemas com quebras de linha no texto. |
| 5 | O banco `ai_chat` (`database.md`) é a fonte normativa do esquema; campos da API usam os nomes das colunas (inglês, `snake_case`) e IDs são UUID. | Elimina o mapeamento entre português/inglês e entre BIGINT/UUID. |
| 6 | `sessions` substitui `refresh_tokens`; `users.status` substitui `ativo`; `messages.status` substitui `incompleta`. | O banco já cobre essas necessidades com mais detalhe. |
| 7 | Exclusão de usuário e de conversa é lógica, com expurgo após `SOFT_DELETE_RETENTION_DAYS`. | O banco usa `deleted_at`; atende ao desfazer e à LGPD. Substitui a exclusão definitiva imediata da v1.0. |
| 8 | Mensagens `system` não são persistidas e o contexto continua vindo do cliente; o fluxo 4.6 do banco, em que a API monta o contexto, fica como alternativa futura. | Mantém a decisão nº 2. A consulta "últimas N mensagens" do banco permanece disponível. |
| 9 | Foram acrescentadas ao banco a tabela `audit_logs` e a precisão de milissegundos em `messages.created_at`. | Necessárias para RF-ADM-11 e para a ordenação confiável das mensagens (ver 5.6). |
| 10 | O access token padrão passa de 30 para 15 minutos. | Alinhado à recomendação do `database.md` (10 a 15 minutos). |
| 11 | Valores numéricos (limites, prazos, metas de desempenho) são padrões iniciais e configuráveis. | Devem ser validados com testes reais, sobretudo com IA local. |

### 5.3 Pontos em aberto

| # | Questão | Impacto |
|---|---|---|
| 1 | Qual o modelo e o hardware finais da IA local? | Define metas realistas de latência e concorrência (RNF-DES-02/04). |
| 2 | Cadastro público será aberto ou por convite/aprovação? | Afeta RF-AUT-01 e a carga de administração. |
| 3 | Mensagens `system` do cliente serão permitidas? | Define RN-06 e RF-CHAT-11 (padrão: não). |
| 4 | Qual a política final de retenção de dados e conformidade com a **LGPD**? | O prazo de 30 dias e a exportação (RF-PER-08) são propostas iniciais. |
| 5 | Haverá limite diário/mensal de mensagens além do limite por minuto? | Exigiria tabela de uso e novas regras de negócio (hoje fora do banco). |
| 6 | O servidor deve passar a montar o contexto a partir do histórico salvo (cliente enviaria só a nova mensagem)? | Mudaria RF-CHAT-01/04, RN-07 e RN-09; o banco já suporta. |
| 7 | Qual provedor SMTP será usado, e a verificação de e-mail será obrigatória no lançamento? | Define `REQUIRE_EMAIL_VERIFICATION` e a infraestrutura de e-mail. |
| 8 | Renomear ou fixar uma conversa deve alterar a posição dela na lista? | Hoje `updated_at` muda em qualquer alteração (`ON UPDATE`); separar "última atividade" exigiria nova coluna. |

### 5.4 Resumo de rastreabilidade (módulo → endpoints) ✏️

| Módulo | Requisitos | Endpoints |
|---|---|---|
| Autenticação | RF-AUT-01 a 16 | `/auth/*` |
| Perfil | RF-PER-01 a 08 | `/users/me*` |
| Chat | RF-CHAT-01 a 17 | `/chat` |
| Conversas | RF-CONV-01 a 09 | `/conversations*` |
| Feedback | RF-FDB-01 a 03 | `/messages/{id}/feedback` |
| Administração | RF-ADM-01 a 13 | `/admin/*` |
| Sistema | RF-SIS-01 a 06 | `/health*`, `/docs`, `/redoc`, rotina de manutenção |

### 5.5 Resumo das alterações da v1.1 em relação à v1.0

| Área | Alteração |
|---|---|
| Dados | IDs `BIGINT` → UUID; campos em português → inglês; `ativo` → `status`; `incompleta` → `status` da mensagem; `refresh_tokens` → `sessions` (3.3). |
| Autenticação | Sessão por dispositivo, rotação do refresh token, claim `sid`, verificação de e-mail, recuperação de senha, detecção de reuso (RF-AUT-04, 08, 09, 11 a 16). |
| Perfil | `avatar_url`, gestão de sessões, exportação de dados, exclusão lógica (RF-PER-01, 02, 04, 06 a 08). |
| Chat | Persistência atômica com `parent_id`, `model` e `status`; erro e interrupção persistidos; editar e regenerar; `system` não persistido (RF-CHAT-06, 08, 10, 13 a 17). |
| Conversas | Fixar, arquivar, exclusão lógica, ordenação por fixadas (RF-CONV-01, 02, 04, 05, 06). |
| Feedback | Módulo novo (RF-FDB). |
| Administração | Filtro por `status`, suspensão com revogação de sessões, `audit_logs` e consulta (RF-ADM-02 a 06, 11, 13). |
| Sistema | Rotina de manutenção e expurgo, seed do administrador (RF-SIS-05, 06). |
| Configuração | Novas variáveis de ambiente e access token padrão de 15 min (3.1.6). |
| Regras | RN-02, 04, 06, 11 alteradas; RN-13 a 18 novas. |

### 5.6 Alterações feitas no banco de dados (`database.md` v1.1)

Para o banco se comportar conforme este SRS, foram feitas as seguintes mudanças, detalhadas no `database.md` v1.1:

| # | Alteração | Motivo |
|---|---|---|
| 1 | Nova tabela `audit_logs` (`id`, `actor_id`, `action`, `target_type`, `target_id`, `details` JSON, `ip_address`, `created_at`). | O banco não previa auditoria; exigida por RF-ADM-11 e 13. |
| 2 | `messages.created_at` passa de `DATETIME` para `DATETIME(3)`. | Com precisão de segundos, mensagem do usuário e resposta gravadas juntas empatam, e o `ORDER BY created_at` fica instável (IDs UUID não servem de desempate). |
| 3 | Documentada a exigência de fuso UTC na conexão. | `DEFAULT CURRENT_TIMESTAMP` e `NOW()` usam o fuso da sessão MySQL; sem UTC, viola RD-03. |
| 4 | Documentada a política de exclusão lógica e expurgo, com consultas. | Conciliar `deleted_at`/`status = deleted` com a cascata de LGPD. |
| 5 | Fluxo "Enviar mensagem" revisado (contexto vindo do cliente, gravação atômica, `parent_id` em cadeia, `error` e `stopped`). | Alinhar ao RF-CHAT-06, 08, 10 e 13. |
| 6 | Esclarecimentos: collation torna o e-mail case-insensitive; `system` não é persistido; rotação de sessões; `updated_at` atualizado explicitamente. | Evitar ambiguidades na implementação. |
| 7 | "Auditoria" removida da lista de evolução futura. | Passou a fazer parte do esquema. |
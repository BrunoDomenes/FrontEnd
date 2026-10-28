# Especificação de Requisitos de Software (SRS)

## API do Chat de IA via Web

| Campo | Valor |
|---|---|
| **Projeto** | Chat de IA via Web: Backend (API) |
| **Documento** | SRS: Especificação de Requisitos de Software |
| **Versão** | 1.0 (rascunho) |
| **Data** | 28/10/2026 |
| **Padrões de referência** | IEEE Std 830-1998, ISO/IEC/IEEE 29148:2018 |
| **Documento de origem** | `levantamento-chat-ia-web.md` |

### Histórico de revisões

| Versão | Data | Descrição |
|---|---|---|
| 1.0 | 28/10/2026 | Primeira versão do SRS da API, **sem banco de dados**. Existe um único usuário salvo (**ADMIN**, com senha, vindo da configuração) e usuários **ghost** (anônimos) com limite de uso. A persistência fica para a próxima versão da API (seção 5.5) |

> **Resumo da v1.0:** a API é **stateless e sem banco**. O chat é efêmero (nada é gravado), o administrador é definido por variáveis de ambiente e o visitante anônimo (ghost) usa o chat dentro de limites de uso. Cadastro público, perfil, histórico de conversas, feedback, verificação de e-mail, recuperação de senha e gestão de usuários **ficam para a próxima versão**, junto com o banco (seção 5.5).

---

## Sumário

1. [Introdução](#1-introdução)
2. [Descrição geral](#2-descrição-geral)
3. [Requisitos específicos](#3-requisitos-específicos)
   - 3.1 [Interfaces externas](#31-interfaces-externas)
   - 3.2 [Requisitos funcionais](#32-requisitos-funcionais)
   - 3.3 [Requisitos de estado e configuração](#33-requisitos-de-estado-e-configuração)
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

Este documento especifica os requisitos da **API de backend** de um sistema de chat de IA via web, na sua primeira etapa **sem banco de dados**. Destina-se a desenvolvedores, testadores e demais envolvidos no projeto, e serve de base para o projeto técnico, a implementação, os testes e a validação da API.

### 1.2 Escopo

O produto especificado é a **API REST** (em Python/FastAPI) que:

- autentica o **administrador** (único usuário salvo, definido na configuração);
- permite o uso do chat por **usuários ghost** (anônimos), com **limites de uso**;
- recebe perguntas e devolve respostas de um modelo de IA, com **streaming**;
- oferece ao administrador consultas simples de monitoramento (estatísticas em memória e status do provedor de IA);
- abstrai o provedor de IA, de modo que a troca de **modelo local (Ollama)** para **nuvem** seja feita apenas por configuração.

**Fora do escopo deste documento:** o frontend React, a infraestrutura de hospedagem, a escolha e o treinamento dos modelos de IA, o faturamento e **todo o armazenamento persistente** (banco de dados, histórico de conversas, cadastro de usuários), que ficam para a próxima versão da API.

### 1.3 Definições, siglas e abreviações

| Termo | Definição |
|---|---|
| **API** | Interface de programação de aplicações |
| **REST** | Estilo arquitetural para APIs sobre HTTP |
| **SRS** | Software Requirements Specification |
| **JWT** | JSON Web Token, token assinado usado para autenticação |
| **SSE** | Server-Sent Events, fluxo de eventos do servidor para o cliente sobre HTTP |
| **Provedor de IA** | Implementação concreta que fala com um modelo (Ollama ou nuvem) |
| **Strategy** | Padrão de projeto que permite trocar algoritmos/implementações via interface comum |
| **Admin** | Único usuário salvo; credenciais definidas por variáveis de ambiente |
| **Ghost** | Usuário anônimo, sem cadastro nem senha, identificado por um token de convidado |
| **Token de convidado** | JWT emitido a um ghost por `POST /auth/guest` |
| **Cota** | Quantidade de mensagens que um ghost pode enviar em uma janela de tempo |
| **Stateless** | Sem estado persistido no servidor; o que existe fica apenas em memória e se perde ao reiniciar |
| **RF / RNF / RN / RD** | Requisito Funcional / Não Funcional / Regra de Negócio / Requisito de Dados (estado e configuração) |

**Prioridades (MoSCoW):** **M** = Deve (Must), **S** = Deveria (Should), **C** = Poderia (Could).

### 1.4 Referências

- `levantamento-chat-ia-web.md`: documento de planejamento do projeto.
- IEEE Std 830-1998: *Recommended Practice for Software Requirements Specifications*.
- ISO/IEC/IEEE 29148:2018: *Requirements engineering*.
- RFC 7519 (JWT), RFC 6750 (Bearer Token), RFC 9457 (Problem Details for HTTP APIs).
- Documentação do FastAPI e do Ollama.

### 1.5 Visão geral do documento

A seção 2 descreve o produto e seu contexto. A seção 3 traz os requisitos detalhados. A seção 4 define os critérios de aceitação e a seção 5 reúne apêndices, incluindo o mapa do que foi removido e o que retorna na próxima versão.

---

## 2. Descrição geral

### 2.1 Perspectiva do produto

A API é o componente central do sistema e fica entre o frontend e o provedor de IA:

```
[Frontend React] ⇄ [API Python (FastAPI)] ⇄ [Provedor de IA: Local (Ollama) ou Nuvem (API)]
                          │
                          └─ estado somente em memória (contadores de uso)
```

O frontend **nunca** se comunica diretamente com a IA. Somente a API o faz, o que garante proteção da chave da API de nuvem, controle de acesso, limites de uso e independência do frontend em relação ao modelo usado.

**Não há banco de dados.** O único dado "salvo" é a credencial do administrador, lida das variáveis de ambiente na inicialização. O histórico da conversa é responsabilidade do frontend, que reenvia o contexto a cada requisição.

### 2.2 Funções do produto (resumo)

| Módulo | Funções principais |
|---|---|
| **Autenticação** | Login do admin; emissão de token de convidado (ghost) |
| **Chat** | Enviar mensagens e receber resposta completa ou em streaming (efêmero, sem persistência) |
| **Limites de uso** | Cota diária e limite por minuto para ghost; consulta do uso restante |
| **Administração** | Estatísticas de uso em memória e status do provedor de IA |
| **Sistema** | Health check e documentação automática |

### 2.3 Classes de usuários e características

| Classe | Descrição | Permissões |
|---|---|---|
| **Ghost** | Visitante anônimo com token de convidado | Chat, consulta do próprio uso, **sujeito a limites de uso** |
| **Administrador** | Autenticado com usuário e senha, papel `admin` | Tudo do ghost, **sem cota diária** (mantém limites técnicos de proteção) + endpoints `/admin/*` |
| **Cliente de API (frontend)** | Aplicação React que consome a API em nome do usuário | Mesmas permissões de quem representa |

### 2.4 Ambiente operacional

- **Linguagem/runtime:** Python 3.11 ou superior.
- **Framework:** FastAPI (ASGI, executado com Uvicorn).
- **IA local:** Ollama (padrão `http://localhost:11434`).
- **IA em nuvem (futuro):** provedor via SDK/HTTP (Anthropic, OpenAI, Google, entre outros).
- **Armazenamento:** nenhum. Contadores de uso ficam em memória (nó único) ou em Redis (vários nós, ver RP-07).
- **Sistemas operacionais:** Linux (produção); Windows, macOS e Linux (desenvolvimento).

### 2.5 Restrições gerais

- Backend obrigatoriamente em **Python/FastAPI**.
- **Nenhum banco de dados** nesta versão.
- Troca de provedor de IA **somente por variável de ambiente**, sem alteração de código nos endpoints.
- Modelos de IA **não possuem memória**: o contexto é enviado a cada requisição.
- Desempenho da IA local depende do hardware (CPU/GPU/VRAM) disponível.
- Contadores em memória são **voláteis**: reiniciar a API zera os limites de uso (ver RN-12).

### 2.6 Premissas e dependências

- O Ollama (ou provedor de nuvem) está instalado, acessível pela rede e com o modelo configurado já baixado.
- O frontend consome a API via HTTPS em produção.
- O frontend envia a **lista completa de mensagens** da conversa a cada requisição de chat e guarda o histórico por conta própria.
- As credenciais do administrador e o segredo do JWT são fornecidos por variáveis de ambiente no deploy.
- Em produção, modelo local exige servidor com GPU, o que pode tornar a nuvem mais econômica.

---

## 3. Requisitos específicos

### 3.1 Interfaces externas

#### 3.1.1 Interface com o cliente (API HTTP)

| Aspecto | Especificação |
|---|---|
| Protocolo | HTTP/1.1 ou superior; HTTPS obrigatório em produção |
| Estilo | REST, JSON (`application/json`, UTF-8), campos em `snake_case` e em inglês |
| Streaming | SSE (`text/event-stream`) no endpoint de chat |
| Autenticação | Header `Authorization: Bearer <token>` |
| Prefixo e versão | `/api/v1` |
| Documentação | OpenAPI/Swagger em `/docs` e ReDoc em `/redoc` |
| Datas e horas | ISO 8601 em UTC (ex.: `2026-10-28T14:30:00Z`) |

#### 3.1.2 Interface com provedores de IA

- Toda comunicação com IA passa pela interface abstrata `AIProvider` (métodos `generate` e `stream`).
- **OllamaProvider:** `POST {OLLAMA_URL}/api/chat` (JSON; streaming por linhas JSON).
- **CloudProvider:** SDK/HTTP do provedor escolhido (implementação futura).
- Formato de mensagens padrão: `[{"role": "user" | "assistant" | "system", "content": "..."}]`.

#### 3.1.3 Interfaces de hardware

Não há interface direta de hardware. O desempenho da IA local depende de CPU (16 GB de RAM para modelos de 1B a 8B parâmetros) e, preferencialmente, de GPU.

#### 3.1.4 Configuração (variáveis de ambiente)

| Variável | Descrição | Exemplo |
|---|---|---|
| `AI_PROVIDER` | Provedor ativo (`ollama` ou `cloud`) | `ollama` |
| `OLLAMA_URL` | URL do servidor Ollama | `http://localhost:11434` |
| `OLLAMA_MODEL` | Modelo local | `llama3.1` |
| `CLOUD_API_KEY` | Chave do provedor de nuvem | (vazio até uso) |
| `CLOUD_MODEL` | Modelo de nuvem | (vazio até uso) |
| `ADMIN_USERNAME` | Nome de usuário do administrador | `admin` |
| `ADMIN_PASSWORD_HASH` | Hash (argon2 ou bcrypt) da senha do administrador | (gerado no deploy) |
| `JWT_SECRET` | Segredo de assinatura do JWT | (valor aleatório forte) |
| `JWT_ALGORITHM` | Algoritmo de assinatura | `HS256` |
| `ADMIN_TOKEN_EXPIRE_MINUTES` | Validade do token do admin | `60` |
| `GUEST_TOKEN_EXPIRE_HOURS` | Validade do token de convidado | `24` |
| `GUEST_DAILY_MESSAGES` | Cota diária de mensagens por ghost | `10` |
| `GUEST_RATE_PER_MIN` | Limite de mensagens por minuto por ghost | `3` |
| `GUEST_MAX_MESSAGES_PER_REQUEST` | Máx. de mensagens no contexto (ghost) | `20` |
| `GUEST_MAX_MESSAGE_CHARS` | Máx. de caracteres por mensagem (ghost) | `2000` |
| `GUEST_IP_DAILY_MESSAGES` | Cota diária somada por IP (impede burlar a cota trocando de token) | `30` |
| `GUEST_TOKENS_PER_IP_PER_HOUR` | Tokens de convidado emitidos por IP por hora | `10` |
| `RATE_LIMIT_ADMIN_CHAT_PER_MIN` | Limite técnico de chat por minuto do admin | `60` |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` | Tentativas de login antes do bloqueio / duração do bloqueio | `5` / `15` |
| `MAX_MESSAGES_PER_REQUEST` | Máx. de mensagens no contexto (admin) | `100` |
| `MAX_MESSAGE_CHARS` | Máx. de caracteres por mensagem (admin) | `8000` |
| `ALLOW_CLIENT_SYSTEM_MESSAGES` | Aceita mensagens `system` enviadas pelo cliente (RN-06) | `false` |
| `DEFAULT_SYSTEM_PROMPT` | Prompt de sistema padrão do servidor | (texto) |
| `CORS_ORIGINS` | Origens permitidas | `http://localhost:5173` |
| `REDIS_URL` | (Opcional) Redis para contadores compartilhados entre vários nós | (vazio) |

---

### 3.2 Requisitos funcionais

#### 3.2.1 Autenticação (RF-AUT)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-AUT-01** | Na inicialização, a API deve carregar `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH` da configuração e **recusar-se a iniciar** se qualquer um estiver ausente ou se o hash não for válido. Esse é o único usuário salvo do sistema. | M |
| **RF-AUT-02** | A API deve permitir **login do administrador** com `username` e `password`, retornando um **access token JWT**, o tipo do token e o tempo de expiração. | M |
| **RF-AUT-03** | A senha do administrador nunca deve ser mantida em texto puro: a verificação compara a senha recebida com o hash (`argon2` ou `bcrypt`) da configuração, em tempo constante. | M |
| **RF-AUT-04** | Credenciais inválidas devem retornar `401 Unauthorized` com mensagem genérica, sem revelar se o usuário existe. O tempo de resposta deve ser equivalente para usuário inexistente e senha incorreta. | M |
| **RF-AUT-05** | A API deve oferecer **emissão de token de convidado** (`POST /auth/guest`), sem credenciais. Cada chamada gera um identificador de convidado (`gid`, UUID v4) e um JWT com papel `guest`. | M |
| **RF-AUT-06** | O access token JWT deve conter, no mínimo, `sub` (nome do admin ou `gid`), `role` (`admin` ou `guest`), `iat` e `exp`. | M |
| **RF-AUT-07** | Todos os endpoints, exceto os públicos (login, token de convidado, health, documentação), devem exigir token válido e não expirado. | M |
| **RF-AUT-08** | A emissão de tokens de convidado deve ser limitada por IP (`GUEST_TOKENS_PER_IP_PER_HOUR`), retornando `429` ao exceder. | M |
| **RF-AUT-09** | Nesta versão não há refresh token nem revogação no servidor: o **logout** é feito pelo cliente descartando o token. O token do admin tem validade curta e configurável. | S |
| **RF-AUT-10** | Tokens com assinatura inválida, expirados ou com papel desconhecido devem retornar `401`. | M |

#### 3.2.2 Chat (RF-CHAT)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-CHAT-01** | A API deve expor endpoint de chat que recebe a **lista completa de mensagens** (`messages`) da conversa e devolve a resposta do modelo de IA. | M |
| **RF-CHAT-02** | O endpoint deve suportar dois modos, controlados pelo campo `stream` (padrão `true`): **streaming via SSE** e **resposta completa em JSON**. | M |
| **RF-CHAT-03** | No modo streaming, a resposta deve ser enviada em eventos SSE incrementais (pedaços de texto), com evento final de conclusão e evento de erro quando aplicável (ver 3.7.3). | M |
| **RF-CHAT-04** | O endpoint deve validar a entrada: `messages` não vazio; cada item com `role` ∈ {`system`, `user`, `assistant`} e `content` não vazio; a última mensagem deve ter `role = user`; respeitar os limites de mensagens e de caracteres do papel do chamador (3.1.4). | M |
| **RF-CHAT-05** | O endpoint de chat não deve conhecer o provedor concreto: deve usar apenas a interface `AIProvider`, obtida via *factory* a partir de `AI_PROVIDER`. | M |
| **RF-CHAT-06** | O chat é **efêmero**: nenhuma mensagem, pergunta ou resposta é gravada pela API (nem em arquivo, nem em banco). O conteúdo existe apenas durante o processamento da requisição. | M |
| **RF-CHAT-07** | Se o cliente interromper a conexão durante o streaming, a API deve cancelar a requisição ao provedor de IA e liberar recursos. | S |
| **RF-CHAT-08** | Falhas do provedor de IA (indisponível, timeout, erro de modelo) devem ser tratadas e traduzidas para `502 Bad Gateway` ou `504 Gateway Timeout` (ou evento SSE de erro, se o streaming já iniciou). | M |
| **RF-CHAT-09** | A API deve permitir, opcionalmente, um parâmetro `system_prompt` (ou mensagem `system`) para orientar o comportamento do modelo, conforme política definida em RN-06. | C |
| **RF-CHAT-10** | As mensagens `system` recebidas do cliente e o prompt de sistema padrão são usados apenas no contexto enviado à IA. | M |
| **RF-CHAT-11** | Antes de chamar o provedor de IA, o endpoint deve aplicar os limites de uso do chamador (seção 3.2.3). Requisição barrada pelo limite **não** chega ao provedor. | M |

#### 3.2.3 Limites de uso (RF-USO)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-USO-01** | O ghost deve ter uma **cota diária** de mensagens (`GUEST_DAILY_MESSAGES`). Ao esgotá-la, `POST /chat` retorna `429` com o código `guest_daily_limit_reached` e o instante de reinício da cota. | M |
| **RF-USO-02** | O ghost deve ter um **limite por minuto** (`GUEST_RATE_PER_MIN`), em janela deslizante. Ao excedê-lo, retornar `429` com `Retry-After` e código `rate_limited`. | M |
| **RF-USO-03** | O ghost deve ter limites de **tamanho de contexto** menores que os do admin (`GUEST_MAX_MESSAGES_PER_REQUEST`, `GUEST_MAX_MESSAGE_CHARS`). Ao excedê-los, retornar `422`. | M |
| **RF-USO-04** | Além da cota por `gid`, a API deve aplicar uma **cota diária por IP** (`GUEST_IP_DAILY_MESSAGES`), somando todos os ghosts do mesmo IP. Vale a regra mais restritiva. Isso impede burlar a cota pedindo novos tokens. | M |
| **RF-USO-05** | Uma mensagem é contabilizada **ao iniciar** a geração. Se o provedor de IA falhar antes de enviar o primeiro trecho de resposta, a contagem deve ser **devolvida** à cota. | S |
| **RF-USO-06** | O administrador não possui cota diária, mas mantém um limite técnico por minuto (`RATE_LIMIT_ADMIN_CHAT_PER_MIN`) para proteger o provedor de IA. | M |
| **RF-USO-07** | A API deve oferecer `GET /usage`, que retorna ao chamador seus limites e o uso restante (`daily_limit`, `daily_remaining`, `per_minute_limit`, `resets_at`). Para o admin, `daily_limit` é `null`. | S |
| **RF-USO-08** | Toda resposta de `POST /chat` deve incluir os cabeçalhos `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`, referentes à cota diária do ghost. | S |
| **RF-USO-09** | A cota diária reinicia à 00:00 UTC (janela fixa). | M |
| **RF-USO-10** | O administrador deve poder **zerar a cota** de um ghost (`gid`) ou de um IP, por endpoint administrativo. | C |

#### 3.2.4 Administração (RF-ADM)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-ADM-01** | Todos os endpoints `/admin/*` devem ser acessíveis somente com token de papel `admin`; ghost recebe `403 Forbidden`. | M |
| **RF-ADM-02** | A API deve fornecer **estatísticas de uso em memória**, desde a última inicialização: total de requisições de chat, quantidade de ghosts distintos, mensagens barradas por limite, erros do provedor e média de duração das respostas. | S |
| **RF-ADM-03** | A API deve informar o **status do provedor de IA** ativo (nome, modelo configurado e disponibilidade), sem expor chaves ou segredos. | S |
| **RF-ADM-04** | A API deve permitir ao administrador **zerar a cota** de um ghost ou IP (RF-USO-10). | C |

> Gestão de usuários, suspensão, redefinição de senha, log de auditoria persistente e estatísticas históricas **não existem** nesta versão: dependem de banco de dados (seção 5.5).

#### 3.2.5 Sistema (RF-SIS)

| ID | Requisito | Prior. |
|---|---|---|
| **RF-SIS-01** | A API deve expor `GET /health` (público) indicando se o serviço está no ar. | M |
| **RF-SIS-02** | A API deve expor documentação interativa OpenAPI automática. | M |
| **RF-SIS-03** | A API deve incluir um identificador de requisição (`X-Request-ID`) em todas as respostas, para rastreabilidade. | S |
| **RF-SIS-04** | O health check deve poder incluir a disponibilidade do provedor de IA (`GET /health/ready`). | C |

---

### 3.3 Requisitos de estado e configuração

Sem banco de dados, o "dado" da API se resume à **configuração** e ao **estado volátil em memória**.

| ID | Requisito |
|---|---|
| **RD-01** | A API não deve criar, ler nem escrever em nenhum banco de dados nesta versão. Não há ORM, migrações nem string de conexão. |
| **RD-02** | A única credencial de usuário é a do administrador, vinda de `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH`. Nunca deve ser escrita em logs nem retornada em respostas. |
| **RD-03** | Os contadores de uso (por `gid`, por IP, por minuto) e de tentativas de login ficam **em memória** (ou em Redis, quando `REDIS_URL` estiver definido) e **expiram sozinhos** ao fim da janela, para não crescer indefinidamente. |
| **RD-04** | O conteúdo das mensagens não é armazenado. Logs e métricas guardam apenas metadados (papel, duração, tamanho, status). |
| **RD-05** | O `gid` do ghost é um UUID v4 gerado pela API e embutido no token; o servidor não mantém lista de tokens emitidos. |
| **RD-06** | IPs usados nos contadores devem ser obtidos corretamente atrás de proxy reverso (cabeçalho `X-Forwarded-For` confiável apenas de proxies configurados) e descartados ao fim da janela. |
| **RD-07** | Datas devem ser geradas e retornadas em UTC. |

---

### 3.4 Requisitos não funcionais

#### 3.4.1 Desempenho

| ID | Requisito |
|---|---|
| **RNF-DES-01** | Endpoints sem IA (login, token de convidado, uso, admin) devem responder em até **100 ms** no percentil 95, em condições normais de carga (sem banco, o custo é só computacional). |
| **RNF-DES-02** | O overhead da API sobre o provedor de IA no início do streaming deve ser inferior a **200 ms**; o tempo até o primeiro token depende do provedor/hardware. |
| **RNF-DES-03** | A API deve ser assíncrona (`async`) e não bloquear o *event loop* em chamadas de IA ou de rede. A verificação de hash de senha (custosa por projeto) deve rodar fora do *event loop*. |
| **RNF-DES-04** | A API deve suportar no mínimo **50 conexões de streaming simultâneas** em um único nó, limitada pela capacidade do provedor de IA. |
| **RNF-DES-05** | A checagem de limites de uso deve ter custo O(1) por requisição. |

#### 3.4.2 Segurança

| ID | Requisito |
|---|---|
| **RNF-SEG-01** | Hash da senha do admin com **argon2** (preferencial) ou **bcrypt**, com *salt*. |
| **RNF-SEG-02** | Access token com validade curta e configurável (`ADMIN_TOKEN_EXPIRE_MINUTES`, `GUEST_TOKEN_EXPIRE_HOURS`). |
| **RNF-SEG-03** | Em produção, todo o tráfego deve ocorrer sobre **HTTPS/TLS**. |
| **RNF-SEG-04** | **CORS** restrito às origens configuradas em `CORS_ORIGINS`. |
| **RNF-SEG-05** | Proteção contra força bruta no login do admin: limite de tentativas por IP (`LOGIN_MAX_ATTEMPTS`), com bloqueio temporário (`LOGIN_LOCK_MINUTES`) e resposta `429`. |
| **RNF-SEG-06** | Validação rigorosa de entrada com Pydantic; rejeitar campos desconhecidos nos corpos sensíveis. |
| **RNF-SEG-07** | Segredos (`JWT_SECRET`, `ADMIN_PASSWORD_HASH`, `CLOUD_API_KEY`) somente em variáveis de ambiente ou cofre de segredos; nunca no repositório. |
| **RNF-SEG-08** | A chave da API de nuvem nunca deve ser exposta ao cliente nem aparecer em logs ou respostas. |
| **RNF-SEG-09** | Limite de tamanho do corpo da requisição (padrão 1 MB) para evitar abuso. |
| **RNF-SEG-10** | Cabeçalhos de segurança básicos nas respostas (ex.: `X-Content-Type-Options: nosniff`). |
| **RNF-SEG-11** | O conteúdo gerado pela IA deve ser tratado como dado não confiável; a API não deve executá-lo nem interpretá-lo como instruções. |
| **RNF-SEG-12** | O `JWT_SECRET` deve ter no mínimo 32 bytes de entropia; a API deve recusar-se a iniciar em produção com segredo fraco ou de exemplo. |
| **RNF-SEG-13** | Como o ghost é anônimo e seu token é facilmente descartável, **nenhum recurso privilegiado** pode ser acessível com token de convidado. A defesa contra abuso é a cota por IP (RF-USO-04) somada ao limite de emissão de tokens (RF-AUT-08). |

#### 3.4.3 Confiabilidade e disponibilidade

| ID | Requisito |
|---|---|
| **RNF-CON-01** | Timeout configurável nas chamadas ao provedor de IA (padrão 120 s para resposta completa); no streaming, sem limite total, mas com detecção de inatividade (padrão 60 s sem dados). |
| **RNF-CON-02** | Falhas do provedor de IA não devem derrubar a API nem afetar endpoints que não dependem dela (login, `/usage`, `/health`). |
| **RNF-CON-03** | Disponibilidade-alvo de **99%** mensal para a API (excluindo indisponibilidade do provedor de IA). |
| **RNF-CON-04** | Encerramento gracioso (*graceful shutdown*): permitir a conclusão de requisições em andamento antes de parar. |
| **RNF-CON-05** | A API deve iniciar sem nenhuma dependência externa além do provedor de IA (e do Redis, se configurado). |

#### 3.4.4 Manutenibilidade e extensibilidade

| ID | Requisito |
|---|---|
| **RNF-MAN-01** | Adoção do padrão **Strategy** para provedores de IA: interface `AIProvider` com `generate` e `stream`; implementações `OllamaProvider` e `CloudProvider`; escolha via `factory.py`. |
| **RNF-MAN-02** | Adicionar um novo provedor de IA deve exigir apenas: nova classe que implemente `AIProvider`, novo ramo na *factory* e novas variáveis no `.env`. |
| **RNF-MAN-03** | Estrutura modular do projeto: `api/` (rotas), `core/` (segurança e limites de uso), `ai/` (provedores), `config.py` (configuração). |
| **RNF-MAN-04** | O armazenamento de contadores deve ficar atrás de uma interface (ex.: `UsageStore`) com implementação em memória e, opcionalmente, Redis, para trocar sem alterar as rotas. |
| **RNF-MAN-05** | A camada de autenticação deve ser isolada em um módulo (ex.: `core/auth.py`), de modo que a troca da fonte do usuário (configuração → banco) na próxima versão não altere as rotas. |
| **RNF-MAN-06** | Cobertura mínima de testes automatizados de **80%** nas camadas de serviço e rotas. |
| **RNF-MAN-07** | Código aderente à PEP 8, com *linter* e formatador (ex.: Ruff/Black) e tipagem estática (mypy) no CI. |
| **RNF-MAN-08** | Dependências com versões fixadas em `requirements.txt`. |

#### 3.4.5 Portabilidade

| ID | Requisito |
|---|---|
| **RNF-POR-01** | A API deve poder ser executada em contêiner (Docker) e fornecer `Dockerfile` (e `docker-compose` opcional, com Ollama) para desenvolvimento. |
| **RNF-POR-02** | Toda configuração deve vir de variáveis de ambiente (12-factor app). |

#### 3.4.6 Observabilidade

| ID | Requisito |
|---|---|
| **RNF-OBS-01** | Logs estruturados (JSON) com nível, data/hora, `request_id`, rota, status e latência. |
| **RNF-OBS-02** | Logs não devem conter senhas, tokens, chaves de API nem o conteúdo das mensagens (apenas metadados, salvo modo de depuração explícito). |
| **RNF-OBS-03** | Registro em **log** de métricas por requisição de chat: papel (`admin`/`guest`), provedor, modelo, duração e, quando disponível, quantidade de tokens. |
| **RNF-OBS-04** | Eventos de segurança (login do admin com falha, bloqueio por força bruta, limite de uso atingido) devem ser registrados em log, já que não há trilha de auditoria persistente. |

#### 3.4.7 Usabilidade da API

| ID | Requisito |
|---|---|
| **RNF-USA-01** | Respostas de erro padronizadas e legíveis (ver 3.8). |
| **RNF-USA-02** | Nomes de recursos e campos consistentes, em inglês e `snake_case`. |
| **RNF-USA-03** | Documentação OpenAPI com descrição e exemplos para todos os endpoints. |
| **RNF-USA-04** | Erros de limite de uso devem trazer informação suficiente para o frontend exibir mensagem clara (motivo, `Retry-After` ou `resets_at`). |

---

### 3.5 Regras de negócio

| ID | Regra |
|---|---|
| **RN-01** | Existe **um único usuário salvo**: o administrador, definido na configuração. Não há cadastro público. |
| **RN-02** | Qualquer visitante pode usar o chat como **ghost**, sem cadastro, dentro dos limites de uso. |
| **RN-03** | O administrador não tem cota diária de mensagens, mas está sujeito ao limite técnico por minuto e aos limites de tamanho do seu papel. |
| **RN-04** | Alterar o administrador (usuário ou senha) exige alterar a configuração e reiniciar a API. Tokens já emitidos do admin continuam válidos até expirar; para invalidá-los de imediato, troca-se o `JWT_SECRET` (o que também invalida os tokens de convidado). |
| **RN-05** | O chat é efêmero: a API não guarda histórico. O cliente é responsável por manter e reenviar o contexto desejado. |
| **RN-06** | Mensagens com `role = system` enviadas pelo cliente são aceitas somente se `ALLOW_CLIENT_SYSTEM_MESSAGES = true` (e nunca para ghost); caso contrário, são rejeitadas com `422`. O `DEFAULT_SYSTEM_PROMPT` do servidor, se definido, é prefixado ao contexto. |
| **RN-07** | O modelo de IA não possui memória; o contexto que o cliente envia é encaminhado integralmente ao provedor (após validação e limites). |
| **RN-08** | A cota do ghost é medida por `gid` **e** por IP; vale o limite mais restritivo. Pedir um novo token de convidado **não** renova a cota. |
| **RN-09** | A cota diária reinicia à 00:00 UTC. O limite por minuto usa janela deslizante de 60 segundos. |
| **RN-10** | Mensagem barrada por limite de uso não consome cota nem chega ao provedor de IA. Falha do provedor antes do primeiro trecho de resposta devolve a cota (RF-USO-05). |
| **RN-11** | Ghost não acessa nenhum endpoint `/admin/*`. |
| **RN-12** | Os contadores de uso são voláteis: reiniciar a API (ou o Redis) zera os limites. Essa fragilidade é aceita nesta versão e deixa de existir quando os limites passarem a ser persistidos (seção 5.5). |
| **RN-13** | O ghost só pode ter o modelo e o prompt de sistema definidos pelo servidor; não escolhe modelo nem parâmetros de geração. |

---

### 3.6 Restrições de projeto

| ID | Restrição |
|---|---|
| **RP-01** | Linguagem Python; framework FastAPI. |
| **RP-02** | **Sem banco de dados, ORM ou migrações** nesta versão. |
| **RP-03** | Autenticação baseada em JWT (`PyJWT` ou `python-jose`), com suporte nativo OAuth2/Bearer do FastAPI. |
| **RP-04** | Comunicação com Ollama via `httpx` ou biblioteca `ollama`. |
| **RP-05** | Streaming de respostas via SSE com `StreamingResponse`. |
| **RP-06** | Padrão Strategy obrigatório para provedores de IA (RNF-MAN-01). A troca de provedor deve ocorrer **apenas** pela variável `AI_PROVIDER` (e variáveis correlatas). |
| **RP-07** | Contadores de limite de uso e de tentativas de login ficam em memória (nó único) ou em Redis (vários nós). Com mais de um nó e sem Redis, os limites deixam de ser confiáveis. |
| **RP-08** | Nenhum e-mail é enviado nesta versão (sem SMTP). |

---

### 3.7 Catálogo de endpoints

Prefixo comum: `/api/v1`. **Auth:** 🔓 público · 🔐 ghost ou admin · 🛡️ somente admin.

#### 3.7.1 Autenticação

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| POST | `/auth/login` | 🔓 | Login do admin; retorna o access token | RF-AUT-02 a 04, 06 |
| POST | `/auth/guest` | 🔓 | Emite token de convidado (ghost) | RF-AUT-05, 06, 08 |

**Corpo do login**

```json
{ "username": "admin", "password": "********" }
```

**Resposta do login e do token de convidado (`200 OK`)**

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "role": "admin"
}
```

Para o ghost, a resposta traz `"role": "guest"`, o `expires_in` em segundos (padrão 86400) e o objeto `usage` com os limites iniciais:

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 86400,
  "role": "guest",
  "usage": { "daily_limit": 10, "daily_remaining": 10, "per_minute_limit": 3 }
}
```

#### 3.7.2 Uso

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| GET | `/usage` | 🔐 | Limites e uso restante do chamador | RF-USO-07 |

**Resposta (`200 OK`, ghost)**

```json
{
  "role": "guest",
  "daily_limit": 10,
  "daily_remaining": 7,
  "per_minute_limit": 3,
  "resets_at": "2026-10-29T00:00:00Z"
}
```

#### 3.7.3 Chat

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| POST | `/chat` | 🔐 | Envia mensagens e recebe a resposta (JSON ou SSE) | RF-CHAT-01 a 11, RF-USO-01 a 09 |

**Corpo da requisição**

```json
{
  "messages": [
    {"role": "user", "content": "Olá!"},
    {"role": "assistant", "content": "Olá! Como posso ajudar?"},
    {"role": "user", "content": "Explique o que é SSE."}
  ],
  "stream": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `messages` | array | Sim | Lista completa do contexto; a última deve ser `role = user` |
| `stream` | booleano | Não | `true` (padrão): SSE; `false`: JSON completo |

**Resposta com `stream = false` (`200 OK`)**

```json
{
  "message": {
    "role": "assistant",
    "content": "SSE é ..."
  },
  "provider": "ollama",
  "model": "llama3.1",
  "usage": { "daily_remaining": 6 }
}
```

Para o admin, `usage.daily_remaining` é `null`.

**Resposta com `stream = true` (`200 OK`, `text/event-stream`)**

Cada pedaço é enviado como JSON dentro de `data:`. Isso evita quebras de protocolo quando o texto contém novas linhas, uma melhoria em relação ao esboço do levantamento (`data: {chunk}`).

```
data: {"content": "SSE é "}

data: {"content": "um mecanismo ..."}

event: done
data: {"status": "complete", "usage": {"daily_remaining": 6}}

```

Em caso de falha após o início do fluxo:

```
event: error
data: {"code": "ai_provider_unavailable", "detail": "O provedor de IA não respondeu."}

```

**Resposta ao exceder o limite (`429 Too Many Requests`)**

```json
{
  "type": "about:blank",
  "title": "Limite de uso atingido",
  "status": 429,
  "code": "guest_daily_limit_reached",
  "detail": "Você atingiu o limite diário de mensagens do modo visitante.",
  "resets_at": "2026-10-29T00:00:00Z",
  "request_id": "b1f4c7e2-..."
}
```

#### 3.7.4 Administração

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| GET | `/admin/stats` | 🛡️ | Estatísticas de uso em memória (desde a última inicialização) | RF-ADM-02 |
| GET | `/admin/ai/status` | 🛡️ | Status do provedor de IA | RF-ADM-03 |
| POST | `/admin/usage/reset` | 🛡️ | Zera a cota de um ghost (`gid`) ou IP (`ip`) | RF-ADM-04, RF-USO-10 |

#### 3.7.5 Sistema

| Método | Rota | Auth | Descrição | Requisitos |
|---|---|---|---|---|
| GET | `/health` | 🔓 | Saúde da API | RF-SIS-01 |
| GET | `/health/ready` | 🔓 | Prontidão (inclui provedor de IA) | RF-SIS-04 |
| GET | `/docs`, `/redoc` | 🔓 | Documentação OpenAPI | RF-SIS-02 |

> `/health` e `/docs` ficam fora do prefixo `/api/v1`.

---

### 3.8 Padrão de erros

Os erros seguem uma estrutura inspirada na RFC 9457 (Problem Details):

```json
{
  "type": "about:blank",
  "title": "Não autorizado",
  "status": 401,
  "code": "invalid_credentials",
  "detail": "Usuário ou senha inválidos.",
  "request_id": "b1f4c7e2-..."
}
```

Para erros de validação (`422`), incluir o campo `errors` com a lista de campos inválidos e motivos.

| HTTP | Quando ocorre | Exemplo de `code` |
|---|---|---|
| 400 | Requisição malformada | `bad_request` |
| 401 | Token ausente/inválido/expirado; credenciais inválidas | `invalid_credentials`, `token_expired`, `invalid_token` |
| 403 | Sem permissão (ghost em rota de admin) | `forbidden` |
| 404 | Recurso inexistente | `not_found` |
| 413 | Corpo acima do limite | `payload_too_large` |
| 422 | Falha de validação (inclui mensagem `system` não permitida e contexto acima do limite) | `validation_error` |
| 429 | Limite de uso, de emissão de tokens ou de tentativas de login excedido | `rate_limited`, `guest_daily_limit_reached`, `ip_daily_limit_reached`, `login_locked` |
| 500 | Erro interno | `internal_error` |
| 502 | Erro retornado pelo provedor de IA | `ai_provider_error` |
| 504 | Timeout do provedor de IA | `ai_provider_timeout` |

---

## 4. Critérios de aceitação

A API será considerada aceita quando:

| ID | Critério |
|---|---|
| **CA-01** | A API inicia com `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH` válidos e **não inicia** se qualquer um estiver ausente. |
| **CA-02** | O admin faz login com usuário e senha corretos e recebe token; com senha incorreta recebe `401` genérico. |
| **CA-03** | Um visitante obtém token em `POST /auth/guest` e usa o chat com ele, sem cadastro. |
| **CA-04** | `POST /chat` com `stream = true` entrega a resposta incrementalmente e finaliza com o evento `done`. |
| **CA-05** | `POST /chat` com `stream = false` retorna a resposta completa em JSON. |
| **CA-06** | Nenhuma mensagem é persistida: não existe banco, e o conteúdo das mensagens não aparece em logs. |
| **CA-07** | Ao esgotar a cota diária, o ghost recebe `429` (`guest_daily_limit_reached`) com `resets_at`, e a requisição não chega ao provedor de IA. |
| **CA-08** | Ao exceder o limite por minuto, o ghost recebe `429` com `Retry-After`. |
| **CA-09** | Pedir novo token de convidado não renova a cota: o limite por IP continua valendo. |
| **CA-10** | A emissão de tokens de convidado é limitada por IP e retorna `429` ao exceder. |
| **CA-11** | `GET /usage` mostra ao ghost o uso restante, coerente com os cabeçalhos `X-RateLimit-*` do chat. |
| **CA-12** | O admin envia mensagens sem cota diária; ghost recebe `403` em qualquer `/admin/*`. |
| **CA-13** | Falha do provedor de IA antes do primeiro trecho devolve a cota ao ghost. |
| **CA-14** | Com o Ollama parado, `POST /chat` retorna `502`/`504` (ou evento `error`) e os demais endpoints continuam funcionando. |
| **CA-15** | Trocar `AI_PROVIDER` (`ollama` → `cloud`, após implementar o `CloudProvider`) não exige nenhuma alteração em `api/chat.py`. |
| **CA-16** | O login do admin é bloqueado temporariamente após `LOGIN_MAX_ATTEMPTS` falhas. |
| **CA-17** | A documentação OpenAPI lista todos os endpoints com exemplos. |
| **CA-18** | Cobertura de testes automatizados ≥ 80% e pipeline de lint/tipagem sem falhas. |

---

## 5. Apêndices

### 5.1 Itens fora do escopo (versão 1.0)

- Frontend React e seus requisitos.
- **Banco de dados e qualquer persistência** (próxima versão).
- Cadastro público de usuários, perfil, troca de senha, múltiplos usuários e gestão de usuários pelo admin.
- Histórico de conversas, mensagens salvas, fixar/arquivar, ramificação (editar/regenerar) e feedback de respostas.
- Verificação de e-mail, recuperação de senha e envio de e-mail (SMTP).
- Refresh token, sessões por dispositivo e revogação de tokens no servidor.
- Auditoria persistente, estatísticas históricas e exportação de dados (LGPD).
- Cobrança, planos pagos e controle de custo por tokens.
- Login social, autenticação multifator, upload de arquivos e RAG.
- Implementação efetiva do `CloudProvider` (somente o contrato e o esqueleto estão no escopo).

### 5.2 Decisões e premissas adotadas neste SRS

| # | Decisão | Motivo |
|---|---|---|
| 1 | Sem banco de dados nesta versão; persistência na próxima versão da API. | Definido pelo solicitante. |
| 2 | Único usuário salvo: o admin, via variáveis de ambiente (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`). | Definido pelo solicitante. A senha fica como **hash** na configuração, nunca em texto puro. |
| 3 | O ghost é identificado por um **token de convidado** (JWT, `gid`) e também por **IP**. | Só o token seria fácil de burlar (basta pedir outro); o IP fecha essa brecha. |
| 4 | Limites padrão do ghost: 10 mensagens/dia, 3/min, contexto de até 20 mensagens de 2000 caracteres. | Valores iniciais configuráveis, a validar com testes reais, sobretudo com IA local. |
| 5 | O chat recebe a **lista completa de mensagens** do cliente e não persiste nada. | Mantém a decisão do levantamento e é a única opção sem banco. |
| 6 | Sem refresh token: token do admin curto (60 min) e do ghost de 24 h. | Sem armazenamento, não há como revogar ou rotacionar tokens. |
| 7 | Cota diária por janela fixa, reiniciando à 00:00 UTC. | Simples e previsível; a janela deslizante diária exigiria guardar cada requisição. |
| 8 | Contagem da cota ao **iniciar** a geração, com devolução se o provedor falhar antes do primeiro trecho. | Evita que o ghost abuse de streams longos e não o penaliza por falha do servidor. |
| 9 | Mensagens `system` do cliente nunca são aceitas de ghost. | Impede que um anônimo reescreva o comportamento do modelo. |
| 10 | Contadores em memória (nó único), com Redis opcional. | Mantém a API sem banco; Redis só é necessário com vários nós. |
| 11 | Autenticação e armazenamento de contadores isolados atrás de módulos/interfaces. | Facilita a troca por banco na próxima versão sem reescrever as rotas. |

### 5.3 Pontos em aberto

| # | Questão | Impacto |
|---|---|---|
| 1 | Qual o modelo e o hardware finais da IA local? | Define metas realistas de latência e concorrência (RNF-DES-02/04) e os limites do ghost. |
| 2 | Os valores de cota do ghost (10/dia, 3/min) atendem ao uso esperado? | Ajuste de `GUEST_*`. |
| 3 | O limite por IP prejudicará usuários atrás de NAT compartilhado (redes de empresa, universidade)? | Pode exigir um limite por IP mais alto ou outra forma de identificar o ghost. |
| 4 | A cota do ghost deve também limitar o tamanho da **resposta** (tokens de saída)? | Controle de custo e de carga no modelo local. |
| 5 | Haverá mais de um nó da API antes da chegada do banco? | Se sim, o Redis passa a ser obrigatório (RP-07). |
| 6 | Mensagens `system` do admin serão permitidas? | Define o valor de `ALLOW_CLIENT_SYSTEM_MESSAGES` (padrão: não). |

### 5.4 Resumo de rastreabilidade (módulo → endpoints)

| Módulo | Requisitos | Endpoints |
|---|---|---|
| Autenticação | RF-AUT-01 a 10 | `/auth/login`, `/auth/guest` |
| Chat | RF-CHAT-01 a 11 | `/chat` |
| Limites de uso | RF-USO-01 a 10 | `/usage`, `/chat` (cabeçalhos e `429`) |
| Administração | RF-ADM-01 a 04 | `/admin/*` |
| Sistema | RF-SIS-01 a 04 | `/health*`, `/docs`, `/redoc` |

### 5.5 Preparação para a próxima versão (com banco de dados)

O que volta quando o banco entrar, e como esta versão já deixa o caminho livre:

| Item que volta | Como esta versão se prepara |
|---|---|
| Banco `ai_chat` (MySQL), ORM e migrações | `core/auth.py` e `UsageStore` isolados (RNF-MAN-04 e 05); rotas não dependem da origem do usuário. |
| Cadastro, perfil e múltiplos usuários | O admin da configuração vira o primeiro registro (seed) na tabela de usuários. |
| Histórico, conversas, fixar/arquivar, feedback | `POST /chat` já recebe o contexto completo e devolve `message`; basta acrescentar `conversation_id` e gravar. |
| Refresh token e revogação de sessões | O JWT já carrega `role` e `sub`; entra o `sid` e a tabela de sessões. |
| Persistência dos limites do ghost | `UsageStore` ganha implementação em banco, e os contadores deixam de zerar ao reiniciar (RN-12). |
| E-mail (verificação e recuperação de senha) | Sem impacto nas rotas atuais. |
| Auditoria e estatísticas históricas | As estatísticas em memória (RF-ADM-02) passam a ser calculadas a partir do banco. |

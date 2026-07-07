---
title: InfraDoc AI
emoji: 🖥️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# InfraDoc AI

**Sistema inteligente de diagnóstico e documentação de incidentes de infraestrutura de TI**

> Avaliações Intermediária e Final — IA Generativa | Stack: FastAPI + React + SQLite + Claude (Anthropic)

---

## O que o sistema faz

InfraDoc AI é uma plataforma para técnicos e engenheiros de datacenter registrarem, diagnosticarem e acompanharem incidentes de infraestrutura. O técnico descreve o problema (rack afetado, equipamento, sintomas, histórico), e o sistema gera automaticamente um diagnóstico estruturado com causa raiz provável e próximos passos recomendados — via **Claude (Anthropic)** com tool use, ou modo mock por regras estáticas quando a variável `ANTHROPIC_API_KEY` não está configurada.

**Telas implementadas:**
- **Login / Criar Conta** — autenticação com e-mail obrigatório, senha, recuperação simulada
- **Dashboard** — estatísticas, gráfico de incidentes por severidade e rack, incidentes recentes
- **Lista de Incidentes** — filtros por status, severidade, busca por texto
- **Novo Incidente** — formulário dinâmico com sugestões de sintomas por tipo de equipamento e seletor visual de severidade
- **Detalhe do Incidente** — diagnóstico gerado por IA, causa raiz, próximos passos; encerramento exige nota obrigatória
- **Inventário** — assets agrupados por rack, status automático por severidade, adicionar novo asset
- **Relatórios** — resumo executivo, solicitação de exportação com aprovação do admin
- **Base de Conhecimento** — artigos de soluções documentadas pela equipe, busca, avaliação de utilidade
- **Usuários** — gerenciamento de contas (admin), perfis Técnico e Administrador
- **Solicitações de Exportação** — fluxo de aprovação admin para exportar relatórios

---

## Estrutura do Projeto

```
infradoc-ai/
├── README.md
├── .gitignore
├── backend/
│   ├── main.py               # FastAPI — rotas, diagnóstico Claude (tool use) + fallback mock, SQLite
│   ├── requirements.txt      # fastapi, uvicorn, pydantic, anthropic
│   └── .env                  # NÃO subir no GitHub — contém ANTHROPIC_API_KEY (uso local; no HF Spaces isso é uma Secret)
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx               # Router principal + controle de autenticação
│       ├── api.js                # Client HTTP para o backend
│       ├── index.css             # Design system completo (dark, JetBrains Mono + Inter)
│       ├── main.jsx
│       ├── components/
│       │   ├── Sidebar.jsx       # Navegação com info do usuário e indicador de modo IA
│       │   └── Toast.jsx         # Notificações globais
│       └── pages/
│           ├── Login.jsx             # Login, cadastro e recuperação de senha
│           ├── Dashboard.jsx         # Visão geral com gráficos
│           ├── Incidents.jsx         # Lista com filtros
│           ├── NewIncident.jsx       # Formulário dinâmico
│           ├── IncidentDetail.jsx    # Detalhe com diagnóstico IA + nota de encerramento
│           ├── Assets.jsx            # Inventário por rack com status automático
│           ├── Reports.jsx           # Relatórios com fluxo de solicitação
│           ├── KnowledgeBase.jsx     # Base de conhecimento da equipe
│           ├── Users.jsx             # Gerenciamento de usuários (admin)
│           └── ExportRequests.jsx    # Aprovação de exportações (admin)
├── prompts/
│   └── system_prompt.txt     # System prompt para referência
└── tools/
    └── tools.md              # Definições e justificativas das tools
```

---

## Como rodar localmente

### 1. Configurar a chave da IA (Claude / Anthropic)

Crie o arquivo `backend/.env` (ou exporte a variável de ambiente diretamente) com:

```
ANTHROPIC_API_KEY=sk-ant-sua_chave_aqui
```

Obtenha sua chave em: https://console.anthropic.com

> Sem a chave, o sistema roda em **modo mock** com diagnósticos por regras estáticas — o app funciona normalmente de qualquer forma, apenas sem tool use real.

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> **Atenção:** na primeira execução ou após atualizações, delete `backend/infradoc.db` para recriar o banco com todas as tabelas.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: `http://localhost:5173`

**Credenciais padrão:**
```
Usuário: admin
Senha:   admin123
```

### 4. Endpoint público (ngrok, para desenvolvimento local)

```bash
ngrok http 5173
```

---

## Deploy no Hugging Face Spaces (Docker SDK)

O projeto está pronto pra rodar como um **Docker Space** no Hugging Face — um único container que builda o frontend React e serve tudo (API + frontend) junto, na porta `7860` exigida pela plataforma.

### Passo a passo

1. Crie um novo Space em [huggingface.co/new-space](https://huggingface.co/new-space), escolhendo **Docker** como SDK.
2. Clone o repositório do Space e copie para dentro dele: `Dockerfile`, `.dockerignore`, `backend/` e `frontend/` (mantendo essa estrutura de pastas).
3. O `README.md` do Space precisa começar com o bloco YAML abaixo (já incluso neste arquivo):
   ```yaml
   ---
   title: InfraDoc AI
   emoji: 🖥️
   colorFrom: blue
   colorTo: green
   sdk: docker
   app_port: 7860
   pinned: false
   ---
   ```
4. Se/quando a integração com a API da Claude for ativada, adicione `ANTHROPIC_API_KEY` em **Settings → Variables and secrets** do Space (nunca commitar a chave no repositório).
5. Faça `git push` para o Space. O build (Node → Vite → Python → Uvicorn) roda automaticamente; acompanhe em **Logs**.

### O que o Dockerfile faz

- **Stage 1 (Node):** instala dependências do frontend (`npm ci`) e roda `npm run build`, gerando `frontend/dist`.
- **Stage 2 (Python):** instala `backend/requirements.txt`, copia o `dist` buildado para `backend/static/`, e sobe `uvicorn main:app` na porta `7860`.
- O próprio FastAPI passa a servir o frontend (rotas `/api/*` continuam funcionando normalmente, e qualquer outra rota devolve o `index.html` do React, permitindo que o React Router funcione client-side).

### ⚠️ Atenção — persistência de dados

O free tier do Hugging Face Spaces **não tem armazenamento persistente por padrão**: o arquivo `infradoc.db` é recriado do zero (via `init_db()`) toda vez que o Space reinicia, dorme por inatividade ou é reconstruído. Para uma demo/avaliação isso é aceitável — os dados de seed voltam automaticamente —, mas não é um banco de produção. Se precisar de persistência real no futuro, as opções são: habilitar *Persistent Storage* pago do Space, ou migrar para um banco externo (ex: Turso, como já cogitado).

---

## Integração com IA — Claude (Anthropic)

### Arquitetura de LLM (fluxo)

```
Técnico preenche formulário de incidente
        │
        ▼
POST /api/incidents  (main.py)
        │
        ▼
generate_claude_diagnosis()
        │
        ├─ ANTHROPIC_API_KEY ausente/erro? ──► generate_mock_diagnosis() (regras estáticas)
        │
        ▼ (chave presente)
client.messages.create(system=system_prompt, tools=[4 tools], messages=[...])
        │
        ▼
stop_reason == "tool_use"?
   │                    │
  sim                  não
   │                    │
   ▼                    ▼
executa a tool      parseia JSON final
localmente          (diagnosis, root_cause,
(SQLite) e           next_steps, confidence)
devolve tool_result       │
   │                      ▼
   └──────────────► incidente salvo com
     (loop, até 6x)   diagnosis_source='claude'
```

Cada incidente grava também `diagnosis_source` (`claude` ou `mock`) e, quando aplicável, `diagnosis_confidence` — isso permite ao frontend mostrar de forma honesta qual diagnóstico veio de fato do modelo e qual veio do fallback, em vez de uma tag fixa de "modo mock".

### Por que Claude e não outro provedor?

- **Tool calling maduro e bem documentado** — as 4 ferramentas do projeto (ver `tools/tools.md`) dependem de um loop de tool use confiável; a API da Anthropic tem esse fluxo como cidadão de primeira classe (`stop_reason: "tool_use"`, blocos `tool_use`/`tool_result` tipados).
- **Instruction following em system prompts longos** — o `prompts/system_prompt.txt` tem regras detalhadas, few-shot examples e um formato de saída estrito (JSON); Claude segue esse tipo de instrução estruturada de forma consistente.
- **Trade-off assumido**: é uma API paga (diferente da tentativa inicial com Groq gratuito). Para este projeto acadêmico, isso significa custo por chamada, mas o ganho em confiabilidade do tool use e do formato de saída compensou — principalmente porque o Groq/LLaMA 3 já tinha causado JSON quebrado em testes anteriores (ver "O que não funcionou" abaixo).
- **Se fosse trocar por um modelo local** (Ollama/vLLM): perderia parte da confiabilidade do tool calling — modelos abertos menores tendem a "esquecer" o formato JSON depois de uma ou duas chamadas de ferramenta, exigindo mais parsing defensivo e possivelmente um parser de tool-call próprio em vez do suporte nativo da API.

### Framework: chamada direta ao SDK, sem LangChain/LangGraph

Escolha deliberada por **chamar o SDK `anthropic` diretamente**, sem framework de orquestração:

- Apenas 4 tools e um loop de no máximo 6 iterações — não há necessidade de grafo de estados, memória de longo prazo entre sessões, nem múltiplos agentes especializados, que é onde LangGraph justificaria sua complexidade adicional.
- Chamada direta deixa o comportamento do loop (quando parar, como tratar erro de tool, como validar o JSON final) totalmente explícito e visível em `generate_claude_diagnosis()`, o que facilita depuração e é mais fácil de explicar/justificar numa apresentação de 3 minutos.
- Trade-off: se o projeto crescesse para múltiplas etapas de raciocínio encadeadas ou precisasse de retomada de estado entre requisições HTTP (o que não é o caso aqui — cada incidente é uma chamada isolada e sem estado), um framework como LangGraph passaria a valer a complexidade.

### Ferramentas (tools) — ver `tools/tools.md` para a justificativa completa de cada uma

| Tool | O que faz | Já existia no schema? |
|---|---|---|
| `get_rack_inventory` | Lista os equipamentos do mesmo rack | Sim (tabela `assets`) |
| `get_incident_history` | Busca incidentes anteriores do mesmo equipamento/rack | Sim (tabela `incidents`, filtrando por `approval_status='approved'`) |
| `search_knowledge_base` | Busca por palavra-chave na base de soluções documentadas | Reaproveita a mesma lógica de `GET /api/kb/search` |
| `create_maintenance_ticket` | Cria um ticket de manutenção preventiva | Nova tabela `maintenance_tickets` |

### Parâmetros configurados

| Parâmetro | Valor | Justificativa |
|---|---|---|
| Modelo | `claude-sonnet-5` | Bom equilíbrio custo/qualidade para um caso de uso técnico e estruturado; não precisa do modelo topo de linha (Opus) para diagnóstico com tools bem definidas |
| Temperatura | `0.2` | Respostas técnicas precisas e reprodutíveis — baixa criatividade é desejável quando o output alimenta um sistema (parse de JSON), não uma conversa |
| Max tokens | `1024` | Suficiente para o JSON final (diagnosis + root_cause + next_steps + confidence); tool calls intermediárias usam poucos tokens |
| Limite de iterações do loop | `6` | Evita loop infinito caso o modelo insista em chamar tools sem nunca fechar com o JSON final |

### Estratégia de prompting

- **Persona + regras explícitas** — o system prompt define tom (engenheiro sênior de infra), formato de saída (JSON com 4 campos fixos) e uma lista de "o que NÃO fazer".
- **Few-shot com 4 exemplos completos** — cobrindo severidades diferentes (crítico, médio, baixo) e mostrando quando o modelo deveria ter chamado uma tool (comentado inline nos exemplos).
- **Instrução de uso de tools por critério de julgamento, não obrigatório** — o prompt deixa claro que nem toda chamada precisa investigar via tools; incidentes óbvios podem ir direto ao diagnóstico, o que evita gastar tokens/latência à toa.
- **Defesa contra prompt injection via campos do usuário** — o prompt instrui explicitamente que `symptoms`/`history` são dados observacionais, nunca comandos, já que são texto livre digitado por um técnico e chegam ao modelo dentro do mesmo prompt.

### Fallback automático

Se `ANTHROPIC_API_KEY` não estiver configurada, se a chamada à API falhar (rede, autenticação, rate limit) ou se a resposta final não for um JSON parseável com os campos esperados, `generate_claude_diagnosis()` retorna `None` e o sistema cai automaticamente para `generate_mock_diagnosis()` — o incidente sempre é criado, nunca quebra por falha de IA.

---

## Funcionalidades em Detalhe

### Status Automático de Assets por Severidade

Ao abrir um incidente, o asset correspondente tem seu status atualizado automaticamente:

| Severidade | Status do Asset | Cor |
|---|---|---|
| Crítico | Offline | 🔴 Vermelho |
| Alto | Offline | 🔴 Vermelho |
| Médio | Degradado | 🟡 Amarelo |
| Baixo | Monitoring | 🔵 Azul |
| Incidente resolvido | Online | 🟢 Verde |

### Nota Obrigatória ao Encerrar Incidente
Modal exige nota mínima de 10 caracteres ao encerrar. A nota fica registrada no histórico do incidente.

### Fluxo de Exportação de Relatórios
- **Técnico:** solicita exportação com motivo obrigatório (mínimo 15 caracteres)
- **Admin:** revisa e aprova ou nega com nota opcional
- **Técnico:** após aprovação, download liberado em `.txt`
- Admin sempre exporta diretamente sem solicitação

### Base de Conhecimento
- Artigos de soluções documentadas, organizados por tipo de equipamento
- Busca por título, sintoma ou palavra-chave
- Contador de visualizações e marcação de utilidade
- 5 artigos de exemplo pré-cadastrados

---

## Escolhas de Design

### FastAPI + React
FastAPI com validação Pydantic e documentação automática (Swagger em `/docs`). React + Vite para frontend moderno com hot reload.

### SQLite
Arquivo único `.db`, sem Docker ou servidor. Zero configuração. Migração para PostgreSQL futura seria trivial com SQLAlchemy.

### Claude com tool use, chamada direta ao SDK
Ver seção "Integração com IA — Claude (Anthropic)" acima para a justificativa completa de modelo, framework e parâmetros.

### Design system próprio (não Tailwind/MUI)
Estética de terminal/IDE para audiência técnica. `JetBrains Mono` para dados (IPs, IDs, comandos) e `Inter` para UI criam hierarquia visual clara.

### Autenticação no localStorage
Decisão deliberada para manter o projeto sem backend de autenticação complexo. Em produção, migraria para SQLite com bcrypt.

---

## O que funcionou (com o agente de codificação)

**1. Estrutura inicial do projeto**
Prompt: *"Crie a estrutura de um projeto FastAPI + React + SQLite para um sistema de gerenciamento de incidentes de TI"*
→ Gerou `main.py` com modelos Pydantic, rotas REST, CORS e seed de dados funcional de primeira.

**2. Integração com Claude (tool use)**
Prompt: *"Implemente o diagnóstico via API da Claude com as 4 tools definidas em tools.md, usando tool use nativo do SDK anthropic, com loop agentic e fallback automático para mock em caso de erro"*
→ Gerou `generate_claude_diagnosis()` com o loop de tool use, as 4 implementações de tool e o tratamento de erro/fallback corretamente na primeira tentativa. O ponto que precisou de atenção manual foi garantir que o `INSERT` na tabela `incidents` passasse a usar nomes de coluna explícitos (em vez de `VALUES (?,?,?...)` posicional) depois de adicionar as colunas novas (`diagnosis_source`, `diagnosis_confidence`) — sem isso, o insert quebrava com "table incidents has N columns but M values were supplied".

**3. Fluxo de aprovação de exportações**
Prompt: *"Implemente fluxo onde técnico solicita exportação com motivo obrigatório e admin aprova ou nega"*
→ Gerou rotas backend, modal de solicitação e tela de revisão admin sem erros.

**4. Status automático de assets por severidade**
Prompt: *"Ao criar incidente, atualizar status do asset: crítico/alto → offline, médio → degraded, baixo → monitoring (azul). Resolver → online"*
→ Implementado diretamente no endpoint sem erros.

**5. Base de conhecimento completa**
Prompt: *"Crie base de conhecimento com CRUD, busca por palavras-chave, contador de visualizações e 5 artigos de exemplo"*
→ Gerou tabela, seed, todas as rotas e componente React com expansão inline.

---

## O que não funcionou

**1. Roteamento após refactor**
Após reorganizar componentes em pastas, imports não foram atualizados automaticamente.
**Lição:** Sempre incluir no prompt: *"atualize todos os imports afetados"*.

**2. Responsividade**
Grid `1fr 380px` do `IncidentDetail.jsx` quebra em telas menores. Não corrigido pois avaliação é em desktop.

**3. Exportação PDF**
`jsPDF` gerou código com formatação incorreta. Substituído por `.txt`.

**4. E-mail real de confirmação**
SendGrid introduziu dependências desnecessárias. Substituído por simulação mock.

**5. Schema duplicado**
Tabela `export_requests` foi criada duas vezes no `init_db` na primeira geração. Corrigido manualmente.

**6. JSON quebrado com temperatura alta (ainda na fase Groq/LLaMA 3)**
Com temperatura `0.7`, o LLaMA 3 adicionava texto fora do JSON quebrando o parse. Esse e outros problemas de confiabilidade do tool calling em modelos abertos menores foram o motivo principal da troca de provedor para Claude — mantive a temperatura baixa (`0.2`) na migração, mas o ganho real veio do tool use nativo da API da Anthropic, mais consistente em manter o formato JSON mesmo depois de várias chamadas de ferramenta.

**7. Validação ao vivo da integração Claude — pendente**
O ambiente onde este código foi desenvolvido com o agente de codificação não tinha acesso à internet, então o loop de tool use foi escrito e revisado contra a documentação oficial da API, mas **ainda não foi testado ponta a ponta com uma chamada real**. Antes da apresentação final, é necessário: (1) configurar `ANTHROPIC_API_KEY` como Secret no Space, (2) criar pelo menos um incidente de cada severidade e confirmar que `diagnosis_source` vem `"claude"` na resposta, e (3) verificar nos logs se alguma tool foi de fato chamada pelo modelo. Se algo quebrar nesse teste, documentar aqui o que precisou de ajuste.

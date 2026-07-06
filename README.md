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

> Avaliações Intermediária e Final — IA Generativa | Stack: FastAPI + React + SQLite + Groq LLaMA 3

---

## O que o sistema faz

InfraDoc AI é uma plataforma para técnicos e engenheiros de datacenter registrarem, diagnosticarem e acompanharem incidentes de infraestrutura. O técnico descreve o problema (rack afetado, equipamento, sintomas, histórico), e o sistema gera automaticamente um diagnóstico estruturado com causa raiz provável e próximos passos recomendados — via **Groq LLaMA 3-70B** (gratuito) ou modo mock quando sem chave configurada.

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
│   ├── main.py               # FastAPI — rotas, diagnóstico Groq/mock, SQLite
│   ├── requirements.txt      # fastapi, uvicorn, pydantic, groq, python-dotenv
│   └── .env                  # NÃO subir no GitHub — contém GROQ_API_KEY
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

### 1. Configurar a chave da IA (Groq)

Crie o arquivo `backend/.env` com:

```
GROQ_API_KEY=gsk_sua_chave_aqui
```

Obtenha sua chave gratuita em: https://console.groq.com

> Sem a chave, o sistema roda em **modo mock** com diagnósticos por regras estáticas.

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

## Integração com IA — Groq LLaMA 3

O sistema usa o **Groq** como provedor de IA com o modelo `llama3-70b-8192` — gratuito e sem necessidade de cartão de crédito.

### Por que Groq e não Claude/OpenAI?
- **Gratuito** — sem custo para desenvolvimento e avaliação
- **Rápido** — Groq usa hardware especializado (LPU), respostas em menos de 1 segundo
- **LLaMA 3-70B** — modelo open-source de alta qualidade, adequado para diagnóstico técnico

### Parâmetros configurados

| Parâmetro | Valor | Justificativa |
|---|---|---|
| Modelo | `llama3-70b-8192` | Melhor custo-benefício no Groq gratuito |
| Temperatura | `0.2` | Respostas técnicas precisas, baixa criatividade |
| Max tokens | `1024` | Suficiente para JSON completo de diagnóstico |
| Output | JSON estruturado | Parse direto no frontend sem processamento extra |

### Fallback automático
Se a chave não estiver configurada ou a API retornar erro, o sistema cai automaticamente para o **modo mock** sem interromper o funcionamento.

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

### Groq como provedor de IA
Escolha deliberada para uso gratuito em desenvolvimento. O system prompt e a estrutura de output em JSON são idênticos ao que seria usado com Claude ou GPT — troca de provedor requer apenas alterar 3 linhas no `main.py`.

### Design system próprio (não Tailwind/MUI)
Estética de terminal/IDE para audiência técnica. `JetBrains Mono` para dados (IPs, IDs, comandos) e `Inter` para UI criam hierarquia visual clara.

### Autenticação no localStorage
Decisão deliberada para manter o projeto sem backend de autenticação complexo. Em produção, migraria para SQLite com bcrypt.

---

## O que funcionou (com o agente de codificação)

**1. Estrutura inicial do projeto**
Prompt: *"Crie a estrutura de um projeto FastAPI + React + SQLite para um sistema de gerenciamento de incidentes de TI"*
→ Gerou `main.py` com modelos Pydantic, rotas REST, CORS e seed de dados funcional de primeira.

**2. Integração com Groq**
Prompt: *"Integre o Groq com LLaMA 3-70B no endpoint de criação de incidente, com fallback automático para mock se a chave não estiver configurada"*
→ Gerou a função `generate_groq_diagnosis()` com tratamento de erro e fallback corretamente.

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

**6. JSON quebrado com temperatura alta**
Com temperatura `0.7`, o LLaMA 3 adicionava texto fora do JSON quebrando o parse. Resolvido com temperatura `0.2` e instrução explícita no system prompt.

---# InfraDoc-AI-v1.0-Resid-ncia-IA-Generativa

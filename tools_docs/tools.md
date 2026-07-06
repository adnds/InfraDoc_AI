# Tools — InfraDoc AI (Avaliação Final)

## Por que Tools ao invés de contexto direto?

Na arquitetura final, o Claude recebe as informações do incidente e pode **buscar contexto adicional** via tools, em vez de receber tudo de uma vez no prompt. Isso:
1. Reduz tokens desnecessários (o modelo busca só o que precisa)
2. Permite respostas mais ricas (o modelo pode "investigar" antes de diagnosticar)
3. Simula o comportamento de um técnico que consulta sistemas reais

---

## Tool 1: get_rack_inventory

Retorna todos os assets do rack especificado.

```json
{
  "name": "get_rack_inventory",
  "description": "Retorna o inventário completo de um rack específico, incluindo todos os equipamentos, seus IPs, status atual e posição. Use quando precisar entender o contexto de equipamentos vizinhos ao afetado, ou verificar se outros equipamentos do mesmo rack estão com problema.",
  "input_schema": {
    "type": "object",
    "properties": {
      "rack_id": {
        "type": "string",
        "description": "Identificador do rack (ex: 'A1', 'B3', 'DC-Externo')"
      }
    },
    "required": ["rack_id"]
  }
}
```

**Implementação (Python):**
```python
def get_rack_inventory(rack_id: str) -> dict:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT name, type, ip, status, notes FROM assets WHERE rack=?", 
        (rack_id,)
    ).fetchall()
    conn.close()
    return {
        "rack": rack_id,
        "assets": [{"name": r[0], "type": r[1], "ip": r[2], "status": r[3], "notes": r[4]} for r in rows]
    }
```

---

## Tool 2: get_incident_history

Retorna histórico de incidentes de um equipamento específico.

```json
{
  "name": "get_incident_history",
  "description": "Retorna o histórico de incidentes anteriores de um equipamento ou rack. Use para identificar padrões de falha recorrente, verificar se o problema já ocorreu antes e o que resolveu, e correlacionar com mudanças recentes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "equipment_name": {
        "type": "string",
        "description": "Nome exato do equipamento (ex: 'SRV-APP-01'). Opcional se rack for fornecido."
      },
      "rack_id": {
        "type": "string",
        "description": "ID do rack para buscar todos os incidentes do rack. Opcional se equipment_name for fornecido."
      },
      "limit": {
        "type": "integer",
        "description": "Número máximo de incidentes a retornar. Padrão: 5.",
        "default": 5
      }
    }
  }
}
```

---

## Tool 3: search_knowledge_base

Busca na base de conhecimento de soluções conhecidas.

```json
{
  "name": "search_knowledge_base",
  "description": "Busca na base de conhecimento interno soluções para problemas conhecidos, runbooks e procedimentos padrão. Use quando o diagnóstico indicar um problema com solução documentada (ex: 'servidor lento', 'loop de rede', 'bateria degradada').",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Descrição do problema a buscar (ex: 'servidor reiniciando memória RAM', 'switch loop spanning tree')"
      },
      "equipment_type": {
        "type": "string",
        "enum": ["server", "switch", "firewall", "pdu", "ups", "storage", "router"],
        "description": "Tipo de equipamento para filtrar resultados"
      }
    },
    "required": ["query"]
  }
}
```

---

## Tool 4: create_maintenance_ticket

Cria um ticket de manutenção programada.

```json
{
  "name": "create_maintenance_ticket",
  "description": "Cria automaticamente um ticket de manutenção programada quando o diagnóstico identificar ação preventiva necessária (ex: substituição de bateria, atualização de firmware, substituição de hardware). Use apenas quando o diagnóstico tiver confidence 'high'.",
  "input_schema": {
    "type": "object",
    "properties": {
      "incident_id": {
        "type": "string",
        "description": "ID do incidente que originou a necessidade de manutenção"
      },
      "equipment_name": {
        "type": "string",
        "description": "Nome do equipamento que precisa de manutenção"
      },
      "action_required": {
        "type": "string",
        "description": "Ação de manutenção necessária (ex: 'Substituição de bateria do no-break')"
      },
      "priority": {
        "type": "string",
        "enum": ["urgent", "high", "normal", "low"],
        "description": "Prioridade baseada no impacto do não-atendimento"
      },
      "estimated_duration": {
        "type": "string",
        "description": "Duração estimada da manutenção (ex: '2 horas')"
      }
    },
    "required": ["incident_id", "equipment_name", "action_required", "priority"]
  }
}
```

---

## Justificativa das Tools

| Tool | Por quê existe? | Alternativa descartada |
|------|----------------|----------------------|
| `get_rack_inventory` | Contexto de vizinhança é essencial para correlacionar falhas (ex: PDU afetando múltiplos servidores) | Enviar inventário inteiro no prompt — desperdício de tokens quando não relevante |
| `get_incident_history` | Padrões de falha recorrente são o dado mais valioso para diagnóstico diferencial | Histórico no prompt — técnico pode não saber o que é relevante incluir |
| `search_knowledge_base` | Encapsula conhecimento acumulado da equipe sem poluir o system prompt | Few-shot com todos os casos — prompt gigante, difícil de manter |
| `create_maintenance_ticket` | Fecha o loop: diagnóstico → ação preventiva automática | Depender do técnico lembrar de criar ticket — gera retrabalho |

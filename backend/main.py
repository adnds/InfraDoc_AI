from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
import os
from datetime import datetime
import uuid

app = FastAPI(title="InfraDoc AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "infradoc.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            rack TEXT NOT NULL,
            equipment_type TEXT NOT NULL,
            equipment_name TEXT NOT NULL,
            severity TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            history TEXT,
            status TEXT DEFAULT 'open',
            diagnosis TEXT,
            root_cause TEXT,
            next_steps TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            rack TEXT NOT NULL,
            ip TEXT,
            serial TEXT,
            status TEXT DEFAULT 'online',
            notes TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS export_requests (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            incident_title TEXT NOT NULL,
            requested_by TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            reviewed_by TEXT,
            review_note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS knowledge_base (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            equipment_type TEXT NOT NULL,
            keywords TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            root_cause TEXT NOT NULL,
            solution TEXT NOT NULL,
            resolved_by TEXT,
            views INTEGER DEFAULT 0,
            helpful INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    # Seed some assets
    existing = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    if existing == 0:
        assets = [
            ("asset-001", "SW-CORE-01", "switch", "A1", "10.0.0.1", "SN001", "online", "Switch core principal"),
            ("asset-002", "SRV-APP-01", "server", "A2", "10.0.0.10", "SN002", "online", "Servidor de aplicação"),
            ("asset-003", "SRV-DB-01", "server", "A3", "10.0.0.11", "SN003", "online", "Servidor de banco de dados"),
            ("asset-004", "PDU-A-01", "pdu", "A1", None, "SN004", "online", "PDU do rack A"),
            ("asset-005", "SW-ACCESS-01", "switch", "B1", "10.0.0.2", "SN005", "online", "Switch de acesso"),
            ("asset-006", "SRV-BACKUP-01", "server", "B2", "10.0.0.20", "SN006", "degraded", "Servidor de backup"),
            ("asset-007", "NOBREAK-01", "ups", "A1", None, "SN007", "online", "No-break rack A"),
            ("asset-008", "FW-01", "firewall", "A1", "10.0.0.254", "SN008", "online", "Firewall principal"),
        ]
        conn.executemany(
            "INSERT INTO assets VALUES (?,?,?,?,?,?,?,?,?)",
            [(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], datetime.now().isoformat()) for a in assets]
        )
        conn.commit()

    # Seed knowledge base
    kb_existing = conn.execute("SELECT COUNT(*) FROM knowledge_base").fetchone()[0]
    if kb_existing == 0:
        now = datetime.now().isoformat()
        kb_entries = [
            ("kb-001", "Servidor reiniciando após expansão de RAM", "server", "reiniciando,ram,memoria,restart",
             "Servidor reiniciando sem padrão de horário após expansão de memória RAM.",
             "Módulo de RAM incompatível ou com defeito. Falha de ECC memory error causa kernel panic.",
             "1. Verificar ECC errors: `ipmitool sel list | grep -i mem`\n2. Checar eventos de kernel: `journalctl -k | grep -i memory`\n3. Testar cada módulo novo individualmente\n4. Verificar compatibilidade com QVL do fabricante\n5. Substituir módulo defeituoso",
             "admin", 0, 0, now, now),
            ("kb-002", "Switch com loop de rede — Spanning Tree", "switch", "loop,lentidao,broadcast,spanning tree",
             "Rede extremamente lenta, broadcast storm detectado, switch com CPU em 100%.",
             "Loop de rede causado por porta sem Spanning Tree configurado corretamente.",
             "1. Identificar porta causando loop: `show spanning-tree detail`\n2. Desabilitar porta suspeita temporariamente\n3. Habilitar PortFast + BPDU Guard nas portas de acesso\n4. Reabilitar porta após configuração\n5. Monitorar por 30 minutos",
             "admin", 0, 0, now, now),
            ("kb-003", "PDU com sobrecarga na fase B", "pdu", "sobrecarga,fase,alarme,corrente",
             "Alarme de sobrecarga na PDU, leitura acima do limite em uma das fases.",
             "Desbalanceamento de fases após adição de novo equipamento sem planejamento de carga.",
             "1. Identificar equipamentos na fase sobrecarregada\n2. Migrar um equipamento para fase menos carregada\n3. Verificar leitura após migração (limite: 80% da capacidade)\n4. Documentar mapa de cargas por fase\n5. Configurar alerta em 75% da capacidade",
             "admin", 0, 0, now, now),
            ("kb-004", "No-break com bateria degradada", "ups", "bateria,autonomia,alarme,ups",
             "No-break com autonomia reduzida, alarme de bateria fraca ativo.",
             "Bateria com ciclos esgotados ou sulfatação. Vida útil média de 3-5 anos.",
             "1. Verificar idade da bateria no histórico de manutenção\n2. Testar autonomia real com carga atual\n3. Verificar tensão de flutuação (deve ser 13.5-13.8V por célula)\n4. Se abaixo de 50% da autonomia original: programar substituição\n5. Contatar fornecedor para troca preventiva",
             "admin", 0, 0, now, now),
            ("kb-005", "Firewall bloqueando tráfego legítimo", "firewall", "bloqueio,acesso,regra,trafego",
             "Usuários sem acesso a sistema específico após alteração de regras no firewall.",
             "Regra incorreta adicionada ou ordem de regras alterada bloqueando tráfego legítimo.",
             "1. Verificar log de tráfego bloqueado: `show log | grep DENY`\n2. Identificar a regra causando o bloqueio\n3. Revisar regras adicionadas nas últimas 24h\n4. Testar com regra temporária de permissão\n5. Ajustar regra definitiva e documentar",
             "admin", 0, 0, now, now),
        ]
        conn.executemany(
            "INSERT INTO knowledge_base VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            kb_entries
        )
        conn.commit()
    conn.close()

init_db()

# --- Models ---

class IncidentCreate(BaseModel):
    title: str
    rack: str
    equipment_type: str
    equipment_name: str
    severity: str
    symptoms: str
    history: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    diagnosis: Optional[str] = None
    root_cause: Optional[str] = None
    next_steps: Optional[str] = None

class AssetCreate(BaseModel):
    name: str
    type: str
    rack: str
    ip: Optional[str] = None
    serial: Optional[str] = None
    notes: Optional[str] = None

class KBCreate(BaseModel):
    title: str
    equipment_type: str
    keywords: str
    symptoms: str
    root_cause: str
    solution: str
    resolved_by: Optional[str] = None

class KBUpdate(BaseModel):
    title: Optional[str] = None
    keywords: Optional[str] = None
    symptoms: Optional[str] = None
    root_cause: Optional[str] = None
    solution: Optional[str] = None

class ExportRequestCreate(BaseModel):
    incident_id: str
    incident_title: str
    requested_by: str
    reason: str

class ExportRequestReview(BaseModel):
    status: str  # 'approved' | 'rejected'
    reviewed_by: str
    review_note: Optional[str] = None

# --- Mock AI Diagnosis ---

MOCK_DIAGNOSES = {
    "server": {
        "symptoms_keywords": {
            "lento": {
                "diagnosis": "Possível saturação de recursos (CPU/RAM/disco). O servidor está operando acima da capacidade nominal.",
                "root_cause": "Aumento de carga não planejado ou processo runaway consumindo recursos.",
                "next_steps": "1. Verificar uso de CPU/RAM via `top` ou `htop`\n2. Checar espaço em disco com `df -h`\n3. Identificar processo de maior consumo\n4. Avaliar escalonamento vertical ou horizontal"
            },
            "caindo": {
                "diagnosis": "Reinicializações inesperadas detectadas. Possível problema de hardware, kernel panic ou falha de energia.",
                "root_cause": "Falha de memória (ECC errors), superaquecimento, ou instabilidade da PSU.",
                "next_steps": "1. Verificar logs de kernel: `dmesg | tail -50`\n2. Checar temperatura: `sensors`\n3. Analisar `/var/log/syslog` por erros de hardware\n4. Verificar logs do IPMI/iDRAC\n5. Testar memória com memtest86"
            },
            "rede": {
                "diagnosis": "Intermitência de conectividade de rede. Pode ser falha de NIC, cabo, ou configuração de switch.",
                "root_cause": "Possível auto-negociação incorreta de velocidade/duplex, cabo danificado ou falha de NIC.",
                "next_steps": "1. Verificar status da interface: `ip link show`\n2. Checar erros de NIC: `ethtool -S eth0`\n3. Testar cabo com substituto\n4. Verificar configuração do switch port\n5. Checar logs de interface no switch"
            }
        },
        "default": {
            "diagnosis": "Anomalia detectada no servidor. Análise completa de logs e hardware necessária.",
            "root_cause": "Causa raiz não determinada automaticamente. Requer investigação manual.",
            "next_steps": "1. Coletar logs do sistema: `journalctl -xe`\n2. Verificar integridade do hardware via IPMI\n3. Abrir chamado com o fabricante se necessário\n4. Considerar migração de cargas para servidor backup"
        }
    },
    "switch": {
        "default": {
            "diagnosis": "Possível instabilidade de switching. Verificar tabela MAC, spanning tree e saúde das portas.",
            "root_cause": "Loop de rede, falha de SFP, ou problema de configuração de VLAN.",
            "next_steps": "1. Verificar logs do switch via SSH\n2. Checar status de spanning tree\n3. Inspecionar erros por porta\n4. Verificar utilização de CPU do switch\n5. Revisar configuração de VLANs"
        }
    },
    "pdu": {
        "default": {
            "diagnosis": "Possível problema de distribuição de energia. Verificar carga por fase e alarmes da PDU.",
            "root_cause": "Sobrecarga de circuito ou falha de tomada/disjuntor.",
            "next_steps": "1. Verificar carga atual por fase (não exceder 80%)\n2. Inspecionar alarmes no painel da PDU\n3. Redistribuir cargas entre fases se necessário\n4. Verificar conexão com o no-break\n5. Contatar fornecedor se houver falha de hardware"
        }
    },
    "ups": {
        "default": {
            "diagnosis": "Possível problema no no-break. Verificar autonomia, estado da bateria e alarmes.",
            "root_cause": "Bateria degradada, sobrecarga ou falha de bypass.",
            "next_steps": "1. Verificar status via software de gestão do no-break\n2. Testar autonomia real de bateria\n3. Checar log de eventos de energia\n4. Se bateria degradada, programar substituição\n5. Verificar se carga total está dentro do limite"
        }
    },
    "firewall": {
        "default": {
            "diagnosis": "Possível problema no firewall. Pode impactar toda a conectividade da rede.",
            "root_cause": "Regra mal configurada, alta carga de CPU ou falha de hardware.",
            "next_steps": "1. Verificar utilização de CPU/memória do firewall\n2. Analisar logs de tráfego bloqueado\n3. Revisar regras recentemente alteradas\n4. Verificar sessões ativas (possível DDoS)\n5. Ativar modo de diagnóstico se disponível"
        }
    }
}

def generate_mock_diagnosis(equipment_type: str, symptoms: str) -> dict:
    eq = equipment_type.lower()
    syms = symptoms.lower()
    
    eq_data = MOCK_DIAGNOSES.get(eq, MOCK_DIAGNOSES["server"])
    
    if "symptoms_keywords" in eq_data:
        for keyword, data in eq_data["symptoms_keywords"].items():
            if keyword in syms:
                return data
    
    return eq_data.get("default", {
        "diagnosis": "Análise de diagnóstico concluída. Requer revisão manual detalhada.",
        "root_cause": "Não determinado automaticamente.",
        "next_steps": "1. Coletar mais informações\n2. Verificar logs\n3. Escalar para nível 2"
    })

class ExportRequestCreate(BaseModel):
    incident_id: str
    incident_title: str
    requested_by: str
    reason: str

class ExportRequestReview(BaseModel):
    status: str  # 'approved' | 'rejected'
    reviewed_by: str
    review_note: Optional[str] = None

# --- Routes ---

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/api/stats")
def get_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    open_inc = conn.execute("SELECT COUNT(*) FROM incidents WHERE status='open'").fetchone()[0]
    resolved = conn.execute("SELECT COUNT(*) FROM incidents WHERE status='resolved'").fetchone()[0]
    assets = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    degraded = conn.execute("SELECT COUNT(*) FROM assets WHERE status IN ('degraded', 'monitoring')").fetchone()[0]
    
    by_severity = conn.execute("""
        SELECT severity, COUNT(*) as count FROM incidents WHERE status='open'
        GROUP BY severity
    """).fetchall()
    
    by_rack = conn.execute("""
        SELECT rack, COUNT(*) as count FROM incidents
        GROUP BY rack ORDER BY count DESC LIMIT 5
    """).fetchall()
    
    recent = conn.execute("""
        SELECT id, title, severity, status, created_at FROM incidents
        ORDER BY created_at DESC LIMIT 5
    """).fetchall()
    
    conn.close()
    return {
        "total_incidents": total,
        "open_incidents": open_inc,
        "resolved_incidents": resolved,
        "total_assets": assets,
        "degraded_assets": degraded,
        "by_severity": [dict(r) for r in by_severity],
        "by_rack": [dict(r) for r in by_rack],
        "recent_incidents": [dict(r) for r in recent],
    }

@app.get("/api/incidents")
def list_incidents(status: Optional[str] = None, rack: Optional[str] = None):
    conn = get_db()
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    if status:
        query += " AND status=?"
        params.append(status)
    if rack:
        query += " AND rack=?"
        params.append(rack)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

SEVERITY_TO_ASSET_STATUS = {
    "critical": "offline",
    "high": "offline",
    "medium": "degraded",
    "low": "monitoring",
}

@app.post("/api/incidents")
def create_incident(incident: IncidentCreate):
    conn = get_db()
    inc_id = str(uuid.uuid4())[:8].upper()
    now = datetime.now().isoformat()
    
    diag = generate_mock_diagnosis(incident.equipment_type, incident.symptoms)
    
    conn.execute("""
        INSERT INTO incidents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        inc_id, incident.title, incident.rack, incident.equipment_type,
        incident.equipment_name, incident.severity, incident.symptoms,
        incident.history, "open",
        diag["diagnosis"], diag["root_cause"], diag["next_steps"],
        now, now
    ))

    # Atualiza status do asset automaticamente pela severidade
    asset_status = SEVERITY_TO_ASSET_STATUS.get(incident.severity, "degraded")
    conn.execute("UPDATE assets SET status=? WHERE name=?", (asset_status, incident.equipment_name))

    conn.commit()
    
    row = conn.execute("SELECT * FROM incidents WHERE id=?", (inc_id,)).fetchone()
    conn.close()
    return dict(row)

@app.get("/api/incidents/{inc_id}")
def get_incident(inc_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM incidents WHERE id=?", (inc_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Incidente não encontrado")
    return dict(row)

@app.patch("/api/incidents/{inc_id}")
def update_incident(inc_id: str, update: IncidentUpdate):
    conn = get_db()
    row = conn.execute("SELECT * FROM incidents WHERE id=?", (inc_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Incidente não encontrado")
    
    fields = {k: v for k, v in update.dict().items() if v is not None}
    fields["updated_at"] = datetime.now().isoformat()
    
    set_clause = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE incidents SET {set_clause} WHERE id=?", list(fields.values()) + [inc_id])

    # Se resolvendo o incidente, verifica se há outros abertos para o mesmo equipamento
    if update.status == "resolved":
        equipment_name = dict(row)["equipment_name"]
        outros_abertos = conn.execute(
            "SELECT COUNT(*) FROM incidents WHERE equipment_name=? AND status='open' AND id!=?",
            (equipment_name, inc_id)
        ).fetchone()[0]
        if outros_abertos == 0:
            conn.execute("UPDATE assets SET status='online' WHERE name=?", (equipment_name,))

    conn.commit()
    
    row = conn.execute("SELECT * FROM incidents WHERE id=?", (inc_id,)).fetchone()
    conn.close()
    return dict(row)

@app.get("/api/assets")
def list_assets(rack: Optional[str] = None, type: Optional[str] = None):
    conn = get_db()
    query = "SELECT * FROM assets WHERE 1=1"
    params = []
    if rack:
        query += " AND rack=?"
        params.append(rack)
    if type:
        query += " AND type=?"
        params.append(type)
    query += " ORDER BY rack, name"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/assets")
def create_asset(asset: AssetCreate):
    conn = get_db()
    asset_id = "asset-" + str(uuid.uuid4())[:6]
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO assets VALUES (?,?,?,?,?,?,?,?,?)",
        (asset_id, asset.name, asset.type, asset.rack, asset.ip, asset.serial, "online", asset.notes, now)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM assets WHERE id=?", (asset_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/assets/{asset_id}/status")
def update_asset_status(asset_id: str, body: dict):
    conn = get_db()
    conn.execute("UPDATE assets SET status=? WHERE id=?", (body["status"], asset_id))
    conn.commit()
    row = conn.execute("SELECT * FROM assets WHERE id=?", (asset_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Asset não encontrado")
    return dict(row)

# --- Knowledge Base Routes ---

@app.get("/api/kb")
def list_kb(search: Optional[str] = None, equipment_type: Optional[str] = None):
    conn = get_db()
    query = "SELECT * FROM knowledge_base WHERE 1=1"
    params = []
    if equipment_type:
        query += " AND equipment_type=?"
        params.append(equipment_type)
    if search:
        query += " AND (title LIKE ? OR keywords LIKE ? OR symptoms LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
    query += " ORDER BY views DESC, created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/kb/search")
def search_kb(equipment_type: str, symptoms: str):
    """Busca automática durante criação de incidente"""
    conn = get_db()
    words = [w.strip().lower() for w in symptoms.replace(',', ' ').split() if len(w.strip()) > 3]
    results = []
    rows = conn.execute(
        "SELECT * FROM knowledge_base WHERE equipment_type=?", (equipment_type,)
    ).fetchall()
    for row in rows:
        r = dict(row)
        kw = r['keywords'].lower()
        score = sum(1 for w in words if w in kw or w in r['symptoms'].lower())
        if score > 0:
            results.append({**r, 'score': score})
    results.sort(key=lambda x: x['score'], reverse=True)
    conn.close()
    return results[:3]

@app.get("/api/kb/{kb_id}")
def get_kb(kb_id: str):
    conn = get_db()
    conn.execute("UPDATE knowledge_base SET views=views+1 WHERE id=?", (kb_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM knowledge_base WHERE id=?", (kb_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Artigo não encontrado")
    return dict(row)

@app.post("/api/kb")
def create_kb(kb: KBCreate):
    conn = get_db()
    kb_id = "kb-" + str(uuid.uuid4())[:6]
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO knowledge_base VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (kb_id, kb.title, kb.equipment_type, kb.keywords, kb.symptoms,
         kb.root_cause, kb.solution, kb.resolved_by, 0, 0, now, now)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM knowledge_base WHERE id=?", (kb_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/kb/{kb_id}")
def update_kb(kb_id: str, update: KBUpdate):
    conn = get_db()
    row = conn.execute("SELECT * FROM knowledge_base WHERE id=?", (kb_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Artigo não encontrado")
    fields = {k: v for k, v in update.dict().items() if v is not None}
    fields["updated_at"] = datetime.now().isoformat()
    set_clause = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE knowledge_base SET {set_clause} WHERE id=?", list(fields.values()) + [kb_id])
    conn.commit()
    row = conn.execute("SELECT * FROM knowledge_base WHERE id=?", (kb_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/kb/{kb_id}")
def delete_kb(kb_id: str):
    conn = get_db()
    conn.execute("DELETE FROM knowledge_base WHERE id=?", (kb_id,))
    conn.commit()
    conn.close()
    return {"deleted": kb_id}

@app.post("/api/kb/{kb_id}/helpful")
def mark_helpful(kb_id: str):
    conn = get_db()
    conn.execute("UPDATE knowledge_base SET helpful=helpful+1 WHERE id=?", (kb_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM knowledge_base WHERE id=?", (kb_id,)).fetchone()
    conn.close()
    return dict(row)

# --- Export Requests Routes ---

@app.get("/api/export-requests")
def list_export_requests(status: Optional[str] = None, requested_by: Optional[str] = None):
    conn = get_db()
    query = "SELECT * FROM export_requests WHERE 1=1"
    params = []
    if status:
        query += " AND status=?"
        params.append(status)
    if requested_by:
        query += " AND requested_by=?"
        params.append(requested_by)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/export-requests")
def create_export_request(req_body: ExportRequestCreate):
    conn = get_db()
    # Verifica se já existe solicitação pendente ou aprovada para este incidente/usuário
    existing = conn.execute(
        "SELECT * FROM export_requests WHERE incident_id=? AND requested_by=? AND status IN ('pending','approved')",
        (req_body.incident_id, req_body.requested_by)
    ).fetchone()
    if existing:
        conn.close()
        return dict(existing)
    req_id = "exp-" + str(uuid.uuid4())[:6]
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO export_requests VALUES (?,?,?,?,?,?,?,?,?,?)",
        (req_id, req_body.incident_id, req_body.incident_title,
         req_body.requested_by, req_body.reason, "pending", None, None, now, now)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM export_requests WHERE id=?", (req_id,)).fetchone()
    conn.close()
    return dict(row)

@app.patch("/api/export-requests/{req_id}/review")
def review_export_request(req_id: str, review: ExportRequestReview):
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE export_requests SET status=?, reviewed_by=?, review_note=?, updated_at=? WHERE id=?",
        (review.status, review.reviewed_by, review.review_note, now, req_id)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM export_requests WHERE id=?", (req_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Solicitação não encontrada")
    return dict(row)

@app.get("/api/export-requests/check/{incident_id}/{username}")
def check_export_permission(incident_id: str, username: str):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM export_requests WHERE incident_id=? AND requested_by=? AND status='approved'",
        (incident_id, username)
    ).fetchone()
    conn.close()
    return {"approved": row is not None, "request": dict(row) if row else None}


# --- Frontend estático (React buildado) ---
# Servido por último, para que nenhuma rota /api/* seja "engolida" pelo catch-all abaixo.
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

if os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))


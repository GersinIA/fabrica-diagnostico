const { useState, useEffect, useCallback } = React;

// ─── CONSTANTES ────────────────────────────────────────────────────────────
const STORAGE_KEY = "fabrica_diagnosticos_v1";
const ADMIN_PASS = "fabrica2026";
const PIX_KEY = "consultoria@inconsultoriaativa.com.br";

const CORES = {
  navy: "#0A0F1E",
  green: "#10B981",
  gold: "#F59E0B",
};

// ─── UTILITÁRIOS ───────────────────────────────────────────────────────────
async function storageGet(key) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  }
  catch { return null; }
}
async function storageSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  }
  catch { return false; }
}

async function salvarDiagnostico(dados) {
  const registro = {
    id: Date.now().toString(),
    criadoEm: new Date().toISOString(),
    ...dados,
  };
  try {
    await fetch("https://hook.us2.make.com/c54qlqwgao3tnqd6a2h3q9x9b1sjr3ol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro)
    });
  } catch (err) {
    console.error("Erro webhook:", err);
  }
  return registro;
}

async function callClaude(prompt) {
  const resp = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Erro de conexão com a IA");
  const txt = data.content.map((i) => i.text || "").join("");
  const clean = txt.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function buildPrompt(form, feedback) {
  return `Você é especialista em aplicações de IA para pequenas e médias empresas brasileiras. Analise o diagnóstico e gere um pré-diagnóstico estruturado.

DIAGNÓSTICO:
- Empresa: ${form.empresa}
- Processo problemático: ${form.processo}
- Como funciona hoje: ${form.descricao}
- Impactos: ${form.impactos.join(", ")}
- Tempo perdido: ${form.tempo}
- Ferramenta ideal: ${form.ferramenta}
- Usuários: ${form.usuarios}
- Nível tech: ${form.tech}/5
- Contexto extra: ${form.extra}
${feedback ? "- Feedback do participante: " + feedback : ""}

REGRAS GLOBAIS RIGOROSAS:
A empresa precisa de inteligência sistêmica. NUNCA sugira agentes conversacionais, "Chatbots para WhatsApp/Instagram/Direct", ou robôs de SAC. Ignore completamente soluções de "atendimento automático de clientes". 
Concentre-se em sistemas e interfaces internas, cruzamento de dados, automação financeira, gestão de equipe inteligente e plataformas de negócio.

Responda APENAS com JSON válido, sem markdown:
{
  "resumo": "3-4 linhas resumindo o problema central, impacto no negócio e potencial de solução com IA. Direto, empático, específico.",
  "solucoes": [
    {
      "nome": "Nome curto (máx 6 palavras)",
      "descricao": "O que faz e como resolve. 2-3 linhas.",
      "viabilidade": "Alta em 5h" ou "Média — iteração pós-workshop" ou "Avançada — base no workshop",
      "pilha": "Ex: Claude + Lovable + Supabase"
    }
  ]
}

Gere exatamente 3 soluções da mais simples à mais ambiciosa. A primeira DEVE ser construível em 5h. Seja específico ao negócio descrito.`;
}

// ─── ESTILOS GLOBAIS ───────────────────────────────────────────────────────
const G = {
  root: {
    fontFamily: "'Outfit', sans-serif",
    background: CORES.navy,
    minHeight: "100vh",
    color: "#fff",
  },
  hdr: {
    background: CORES.navy,
    borderBottom: "1px solid rgba(16,185,129,0.18)",
    padding: "1.5rem 1.75rem 1.25rem",
  },
  badge: {
    display: "inline-flex", alignItems: "center",
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.25)",
    color: CORES.green, fontSize: 11, fontWeight: 500,
    letterSpacing: "0.08em", padding: "3px 12px",
    borderRadius: 20, textTransform: "uppercase", marginBottom: 10,
  },
  hdrTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4,
  },
  hdrSub: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  progWrap: { display: "flex", alignItems: "center", gap: 10, marginTop: 14 },
  progTrack: { flex: 1, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  progFill: (pct) => ({ height: "100%", background: CORES.green, borderRadius: 2, width: pct + "%", transition: "width 0.4s ease" }),
  progLbl: { fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" },
  dots: { display: "flex", gap: 5, marginTop: 10 },
  dot: (state) => ({
    width: 5, height: 5, borderRadius: "50%",
    background: state === "done" ? CORES.green : state === "active" ? CORES.gold : "rgba(255,255,255,0.12)",
    transform: state === "active" ? "scale(1.5)" : "scale(1)",
    transition: "all 0.3s",
  }),
  body: { padding: "1.5rem 1.75rem" },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14, padding: "1.5rem",
  },
  eyebrow: { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: CORES.green, fontWeight: 500, marginBottom: 8 },
  qtext: { fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 600, color: "#fff", marginBottom: 4, lineHeight: 1.4 },
  hint: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: "1.1rem", lineHeight: 1.5 },
  textarea: {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    color: "#fff", fontFamily: "'Outfit', sans-serif", fontSize: 13,
    padding: "12px 14px", outline: "none", resize: "vertical",
    boxSizing: "border-box",
  },
  input: {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    color: "#fff", fontFamily: "'Outfit', sans-serif", fontSize: 13,
    padding: "10px 14px", outline: "none", boxSizing: "border-box",
  },
  optsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  opt: (sel) => ({
    background: sel ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${sel ? CORES.green : "rgba(255,255,255,0.09)"}`,
    borderRadius: 9, padding: "10px 12px",
    color: sel ? CORES.green : "rgba(255,255,255,0.65)",
    fontFamily: "'Outfit', sans-serif", fontSize: 12,
    textAlign: "left", cursor: "pointer", lineHeight: 1.3,
    transition: "all 0.18s",
  }),
  scaleRow: { display: "flex", gap: 6, marginBottom: 6 },
  scBtn: (sel) => ({
    flex: 1, height: 36,
    background: sel ? "rgba(245,158,11,0.09)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${sel ? CORES.gold : "rgba(255,255,255,0.09)"}`,
    borderRadius: 8, color: sel ? CORES.gold : "rgba(255,255,255,0.5)",
    fontFamily: "'Outfit', sans-serif", fontSize: 13, cursor: "pointer",
  }),
  scaleLbl: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "0 2px", marginBottom: 14 },
  nav: { display: "flex", gap: 8, marginTop: "1.25rem" },
  btnBk: {
    background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.4)", borderRadius: 9,
    padding: "10px 18px", fontFamily: "'Outfit', sans-serif",
    fontSize: 13, cursor: "pointer",
  },
  btnNx: (disabled) => ({
    flex: 1, background: disabled ? "rgba(16,185,129,0.18)" : CORES.green,
    border: "none", borderRadius: 9, color: disabled ? "rgba(255,255,255,0.25)" : "#fff",
    fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 500,
    padding: "10px 20px", cursor: disabled ? "not-allowed" : "pointer",
  }),
  btnGold: {
    flex: 1, background: CORES.gold, border: "none", borderRadius: 9,
    color: CORES.navy, fontFamily: "'Outfit', sans-serif",
    fontSize: 13, fontWeight: 600, padding: "10px 20px", cursor: "pointer",
  },
  lblSm: { fontSize: 11, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 6, marginTop: 14 },
};

// ─── COMPONENTES AUXILIARES ────────────────────────────────────────────────
function Header({ step, total }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div style={G.hdr}>
      <div style={G.badge}>Fábrica de Ferramentas · Diagnóstico</div>
      <div style={G.hdrTitle}>Seu projeto começa aqui</div>
      <div style={G.hdrSub}>6 etapas · ~15 min · Você sai com o projeto definido</div>
      <div style={G.progWrap}>
        <div style={G.progTrack}><div style={G.progFill(pct)} /></div>
        <span style={G.progLbl}>Etapa {step + 1} de {total}</span>
      </div>
      <div style={G.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={G.dot(i < step ? "done" : i === step ? "active" : "off")} />
        ))}
      </div>
    </div>
  );
}

function OptBtn({ label, selected, onClick, multi }) {
  return (
    <button style={G.opt(selected)} onClick={onClick}>
      {multi && <span style={{ marginRight: 6, opacity: selected ? 1 : 0.4 }}>{selected ? "✓" : "○"}</span>}
      {label}
    </button>
  );
}

// ─── TELAS DE ETAPAS ───────────────────────────────────────────────────────
function Etapa1({ form, setForm, onNext }) {
  return (
    <div style={G.card}>
      <div style={G.eyebrow}>Etapa 1 · Sua empresa</div>
      <div style={G.qtext}>Qual é o nome da sua empresa e o que ela faz?</div>
      <div style={G.hint}>Não precisa ser formal. Escreva como explicaria para um amigo.</div>
      <textarea rows={4} style={G.textarea}
        placeholder="Ex: Minha empresa é uma clínica odontológica com 3 consultórios em Teresina. Atendemos convênio e particular, cerca de 80 pacientes por semana..."
        value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} />
      <div style={G.nav}>
        <button style={G.btnNx(!form.empresa.trim())} disabled={!form.empresa.trim()} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  );
}

const PROCESSOS = [
  "Atendimento ao cliente / agendamentos",
  "Controle financeiro / fluxo de caixa",
  "Gestão de equipe / tarefas",
  "Orçamentos / propostas comerciais",
  "Relatórios / análise de resultados",
  "Outro processo crítico",
];

function Etapa2({ form, setForm, onNext, onBack }) {
  return (
    <div style={G.card}>
      <div style={G.eyebrow}>Etapa 2 · O problema central</div>
      <div style={G.qtext}>Qual processo te dá mais dor de cabeça no dia a dia?</div>
      <div style={G.hint}>Escolha a área que mais consome seu tempo ou gera mais erros.</div>
      <div style={G.optsGrid}>
        {PROCESSOS.map(p => (
          <OptBtn key={p} label={p} selected={form.processo === p}
            onClick={() => setForm(f => ({ ...f, processo: p }))} />
        ))}
      </div>
      <div style={G.nav}>
        <button style={G.btnBk} onClick={onBack}>← Voltar</button>
        <button style={G.btnNx(!form.processo)} disabled={!form.processo} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  );
}

function Etapa3({ form, setForm, onNext, onBack }) {
  return (
    <div style={G.card}>
      <div style={G.eyebrow}>Etapa 3 · Como funciona hoje</div>
      <div style={G.qtext}>Descreva como esse processo funciona do começo ao fim.</div>
      <div style={G.hint}>Quem faz, como faz, onde anota, quanto tempo leva. Mais detalhe = ferramenta melhor.</div>
      <textarea rows={5} style={G.textarea}
        placeholder="Ex: Quando um cliente liga pedindo orçamento, minha secretária anota no papel. Ela me manda por WhatsApp. Eu calculo manualmente em planilha. Levo ~40 min por orçamento..."
        value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
      <div style={G.nav}>
        <button style={G.btnBk} onClick={onBack}>← Voltar</button>
        <button style={G.btnNx(!form.descricao.trim())} disabled={!form.descricao.trim()} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  );
}

const IMPACTOS = [
  "Perda de clientes ou vendas",
  "Retrabalho e erros frequentes",
  "Horas desperdiçadas por semana",
  "Decisões tomadas no escuro",
  "Equipe travada ou desmotivada",
  "Fluxo de caixa imprevisível",
];

function Etapa4({ form, setForm, onNext, onBack }) {
  const toggle = (imp) => {
    setForm(f => ({
      ...f,
      impactos: f.impactos.includes(imp) ? f.impactos.filter(x => x !== imp) : [...f.impactos, imp],
    }));
  };
  return (
    <div style={G.card}>
      <div style={G.eyebrow}>Etapa 4 · O impacto real</div>
      <div style={G.qtext}>Qual é o custo real desse problema para você?</div>
      <div style={G.hint}>Marque tudo que se aplica.</div>
      <div style={G.optsGrid}>
        {IMPACTOS.map(imp => (
          <OptBtn key={imp} label={imp} selected={form.impactos.includes(imp)}
            onClick={() => toggle(imp)} multi />
        ))}
      </div>
      <label style={G.lblSm}>Quanto tempo por semana você perde com isso?</label>
      <input style={G.input} placeholder="Ex: 5 horas por semana, 1 dia inteiro por mês..."
        value={form.tempo} onChange={e => setForm(f => ({ ...f, tempo: e.target.value }))} />
      <div style={G.nav}>
        <button style={G.btnBk} onClick={onBack}>← Voltar</button>
        <button style={G.btnNx(false)} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  );
}

const USUARIOS = ["Só eu (dono)", "Eu + minha equipe", "Principalmente a equipe", "Clientes também acessam"];

function Etapa5({ form, setForm, onNext, onBack }) {
  return (
    <div style={G.card}>
      <div style={G.eyebrow}>Etapa 5 · A ferramenta ideal</div>
      <div style={G.qtext}>Se existisse uma ferramenta perfeita, o que ela faria?</div>
      <div style={G.hint}>Não se preocupe se é viável. Depois filtramos o que dá pra construir em 5 horas.</div>
      <textarea rows={4} style={G.textarea}
        placeholder="Ex: Queria que qualquer funcionário preenchesse as infos do cliente e o sistema gerasse o orçamento automaticamente, já com desconto certo, e enviasse por WhatsApp..."
        value={form.ferramenta} onChange={e => setForm(f => ({ ...f, ferramenta: e.target.value }))} />
      <label style={G.lblSm}>Quem usaria essa ferramenta no dia a dia?</label>
      <div style={G.optsGrid}>
        {USUARIOS.map(u => (
          <OptBtn key={u} label={u} selected={form.usuarios === u}
            onClick={() => setForm(f => ({ ...f, usuarios: u }))} />
        ))}
      </div>
      <div style={G.nav}>
        <button style={G.btnBk} onClick={onBack}>← Voltar</button>
        <button style={G.btnNx(!form.ferramenta.trim())} disabled={!form.ferramenta.trim()} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  );
}

function Etapa6({ form, setForm, onSubmit, onBack, loading }) {
  return (
    <div style={G.card}>
      <div style={G.eyebrow}>Etapa 6 · Contexto final</div>
      <div style={G.qtext}>Últimas perguntas para fechar seu diagnóstico.</div>
      <div style={G.hint}>Isso calibra a complexidade da ferramenta certa para o seu momento.</div>

      <label style={{ ...G.lblSm, marginTop: 0 }}>Nível de familiaridade com tecnologia no dia a dia?</label>
      <div style={G.scaleRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} style={G.scBtn(form.tech === n)} onClick={() => setForm(f => ({ ...f, tech: n }))}>{n}</button>
        ))}
      </div>
      <div style={G.scaleLbl}><span>Uso o básico</span><span>Sou bem digital</span></div>

      <label style={G.lblSm}>Contexto extra que o Gerson deve saber?</label>
      <textarea rows={2} style={G.textarea}
        placeholder="Dúvidas, expectativas, tamanho da equipe, restrições..."
        value={form.extra} onChange={e => setForm(f => ({ ...f, extra: e.target.value }))} />

      <label style={G.lblSm}>Seu nome completo</label>
      <input style={G.input} placeholder="Nome completo"
        value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />

      <label style={G.lblSm}>WhatsApp com DDD</label>
      <input style={{ ...G.input, marginTop: 0 }} placeholder="Ex: 86 99999-0000"
        value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />

      <div style={G.nav}>
        <button style={G.btnBk} onClick={onBack}>← Voltar</button>
        <button style={G.btnGold} onClick={onSubmit} disabled={loading || !form.nome.trim()}>
          {loading ? "Analisando..." : "Gerar pré-diagnóstico com IA →"}
        </button>
      </div>
    </div>
  );
}

// ─── TELA DE IA ────────────────────────────────────────────────────────────
const LOADING_MSGS = [
  ["Lendo o diagnóstico...", "Mapeando o perfil do negócio"],
  ["Identificando padrões...", "Cruzando com casos similares"],
  ["Estruturando soluções...", "Calibrando para 5 horas de workshop"],
  ["Finalizando análise...", "Quase pronto"],
];

function TelaIA({ form, onConfirmar }) {
  const [fase, setFase] = useState("loading"); // loading | result | error
  const [msgIdx, setMsgIdx] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [escolha, setEscolha] = useState(null);
  const [showFb, setShowFb] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [reloading, setReloading] = useState(false);

  const rodar = useCallback(async (fb) => {
    setFase("loading"); setEscolha(null); setShowFb(false);
    let idx = 0;
    const iv = setInterval(() => { idx++; if (idx < LOADING_MSGS.length) setMsgIdx(idx); }, 1800);
    try {
      const res = await callClaude(buildPrompt(form, fb || ""));
      clearInterval(iv);
      setResultado(res);
      setFase("result");
    } catch {
      clearInterval(iv);
      setFase("error");
    }
  }, [form]);

  useEffect(() => { rodar(""); }, [rodar]);

  const cardSol = (sel) => ({
    background: sel ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${sel ? CORES.gold : "rgba(255,255,255,0.08)"}`,
    borderRadius: 11, padding: "1rem 1.1rem", marginBottom: 8,
    cursor: "pointer", position: "relative", transition: "all 0.2s",
  });

  const tag = (color) => ({
    display: "inline-block", marginTop: 7,
    background: color === "green" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.08)",
    border: `1px solid ${color === "green" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
    color: color === "green" ? CORES.green : CORES.gold,
    fontSize: 10, padding: "2px 8px", borderRadius: 20, marginRight: 4,
  });

  if (fase === "loading") return (
    <div style={{ textAlign: "center", padding: "3rem 1.75rem" }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: "2px solid rgba(16,185,129,0.15)",
        borderTopColor: CORES.green,
        animation: "spin 0.8s linear infinite",
        margin: "0 auto 1.25rem",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{LOADING_MSGS[msgIdx][0]}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{LOADING_MSGS[msgIdx][1]}</div>
    </div>
  );

  if (fase === "error") return (
    <div style={{ textAlign: "center", padding: "3rem 1.75rem" }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Erro ao conectar com a IA. Tente novamente.</div>
      <button style={G.btnGold} onClick={() => rodar(feedback)}>Tentar novamente</button>
    </div>
  );

  return (
    <div style={{ padding: "1.5rem 1.75rem" }}>
      {/* Resumo */}
      <div style={{
        background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)",
        borderRadius: 12, padding: "1.25rem", marginBottom: "1rem",
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: CORES.green, marginBottom: 8 }}>
          Resumo · IA
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{resultado?.resumo}</div>
      </div>

      {/* Soluções */}
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: "1.1rem 0 10px", letterSpacing: "0.02em" }}>
        Aplicações que podemos construir para você
      </div>

      {(resultado?.solucoes || []).map((s, i) => (
        <div key={i} style={cardSol(escolha?.nome === s.nome)} onClick={() => setEscolha(s)}>
          {escolha?.nome === s.nome && (
            <div style={{
              position: "absolute", top: 10, right: 10, width: 18, height: 18,
              borderRadius: "50%", background: CORES.gold,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: CORES.navy, fontWeight: 700,
            }}>✓</div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{
              minWidth: 22, height: 22, borderRadius: "50%",
              background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
              color: CORES.gold, fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
            }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 3 }}>{s.nome}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{s.descricao}</div>
              <div>
                <span style={tag("green")}>{s.viabilidade}</span>
                <span style={tag("gold")}>{s.pilha}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Feedback */}
      <div style={{ marginTop: "1rem" }}>
        <button
          style={{
            background: "transparent", border: "1px dashed rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.4)", borderRadius: 9,
            padding: "9px 16px", fontFamily: "'Outfit', sans-serif",
            fontSize: 12, cursor: "pointer", width: "100%", textAlign: "center",
          }}
          onClick={() => setShowFb(v => !v)}
        >
          Tenho outra necessidade ou quero ajustar as sugestões →
        </button>

        {showFb && (
          <div style={{ marginTop: 10 }}>
            <textarea rows={3} style={{ ...G.textarea, marginBottom: 8 }}
              placeholder="Descreva o que mudaria, o que está faltando ou outra necessidade..."
              value={feedback} onChange={e => setFeedback(e.target.value)} />
            <button style={{ ...G.btnGold, width: "100%" }}
              onClick={() => { if (feedback.trim()) rodar(feedback); }}>
              Refazer análise com novo contexto →
            </button>
          </div>
        )}
      </div>

      {/* Confirmar */}
      <div style={G.nav}>
        <button style={G.btnNx(!escolha)} disabled={!escolha} onClick={() => onConfirmar(escolha, resultado?.resumo, resultado?.solucoes)}>
          Confirmar projeto escolhido ✓
        </button>
      </div>
    </div>
  );
}

// ─── TELA DE SUCESSO ───────────────────────────────────────────────────────
function TelaSucesso({ form, escolha }) {
  return (
    <div style={{ padding: "2rem 1.75rem", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 1.25rem", fontSize: 24,
      }}>✓</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
        Projeto confirmado!
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 320, margin: "0 auto 1.5rem" }}>
        Gerson vai receber seu diagnóstico e te enviará o esqueleto do projeto antes do workshop. Nos vemos no dia <strong>24/03</strong> — chegue sabendo o que vai construir.
      </div>
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "1.1rem", textAlign: "left",
      }}>
        {[
          ["Participante", form.nome],
          ["WhatsApp", form.whatsapp],
          ["Processo trabalhado", form.processo],
          ["Projeto escolhido", escolha?.nome],
          ["Tecnologias", escolha?.pilha],
          ["Viabilidade", escolha?.viabilidade],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{v || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAINEL ADMIN ──────────────────────────────────────────────────────────
function PainelAdmin({ onSair }) {
  const [lista, setLista] = useState([]);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    // Banco migrado pro Make
    setLista([{
      id: "admin-box",
      criadoEm: new Date().toISOString(),
      empresa: "Acesse as respostas no seu Excel",
      escolha: { nome: "Painel Migrado: A partir de agora, todas as respostas estão sendo repassadas em tempo-real do site direto para sua automação do Make e Google Sheets, 100% blindadas e livres de perdas de Cache ou da Nuvem antiga." }
    }]);
  }, []);

  const excluir = async (id) => {
    window.alert("Painel operando em Modo Leitura Apenas (Google Sheets ativo na conta In Consultoria).");
  };

  const exportCSV = () => {
    const cols = ["nome", "whatsapp", "empresa", "processo", "descricao", "impactos", "tempo", "ferramenta", "usuarios", "tech", "extra", "projetoEscolhido", "pilha", "viabilidade", "criadoEm"];
    const rows = lista.map(r => cols.map(c => {
      const v = c === "impactos" ? (r[c] || []).join("; ") : c === "projetoEscolhido" ? r.escolha?.nome : c === "pilha" ? r.escolha?.pilha : c === "viabilidade" ? r.escolha?.viabilidade : r[c] || "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "diagnosticos_fabrica.csv";
    a.click();
  };

  const rowStyle = (sel) => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
    background: sel ? "rgba(245,158,11,0.08)" : "transparent",
    border: `1px solid ${sel ? "rgba(245,158,11,0.3)" : "transparent"}`,
    marginBottom: 4, transition: "all 0.15s",
  });

  return (
    <div style={{ ...G.root, minHeight: "100vh" }}>
      {/* Header Admin */}
      <div style={{ ...G.hdr, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ ...G.badge, background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.25)", color: CORES.gold }}>
            Painel Admin
          </div>
          <div style={G.hdrTitle}>Diagnósticos recebidos</div>
          <div style={G.hdrSub}>{lista.length} participante{lista.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...G.btnBk, fontSize: 12 }} onClick={exportCSV}>Exportar CSV</button>
          <button style={{ ...G.btnBk, fontSize: 12 }} onClick={onSair}>Sair</button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 130px)" }}>
        {/* Lista */}
        <div style={{ width: 260, borderRight: "1px solid rgba(255,255,255,0.07)", padding: "1rem" }}>
          {lista.length === 0 && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: "2rem" }}>
              Nenhum diagnóstico ainda
            </div>
          )}
          {lista.map(r => (
            <div key={r.id} style={rowStyle(selecionado?.id === r.id)} onClick={() => setSelecionado(r)}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600, color: CORES.green, flexShrink: 0,
              }}>
                {(r.nome || "?")[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nome || "Sem nome"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{r.processo || "—"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Detalhe */}
        <div style={{ flex: 1, padding: "1.25rem 1.5rem", overflowY: "auto" }}>
          {!selecionado ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: "3rem" }}>
              Selecione um participante para ver o diagnóstico
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff" }}>{selecionado.nome}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{selecionado.whatsapp} · {new Date(selecionado.criadoEm).toLocaleDateString("pt-BR")}</div>
                </div>
                <button style={{ ...G.btnBk, fontSize: 11, color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}
                  onClick={() => excluir(selecionado.id)}>Excluir</button>
              </div>

              {/* Projeto escolhido */}
              {selecionado.escolha && (
                <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 11, padding: "1rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: CORES.gold, marginBottom: 6 }}>Projeto escolhido</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 4 }}>{selecionado.escolha.nome}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{selecionado.escolha.descricao}</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: CORES.green, padding: "2px 8px", borderRadius: 20, marginRight: 6 }}>{selecionado.escolha.viabilidade}</span>
                    <span style={{ fontSize: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: CORES.gold, padding: "2px 8px", borderRadius: 20 }}>{selecionado.escolha.pilha}</span>
                  </div>
                </div>
              )}

              {/* Todas as Opções Sugeridas */}
              {selecionado.todasSolucoes && selecionado.todasSolucoes.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "1rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Todas as opções pensadas pela IA</div>
                  {selecionado.todasSolucoes.map((s, idx) => (
                    <div key={idx} style={{ marginBottom: idx === selecionado.todasSolucoes.length - 1 ? 0 : 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 2 }}>
                        {s.nome} {selecionado.escolha?.nome === s.nome && <span style={{ color: CORES.gold, fontSize: 10, marginLeft: 6 }}>(Escolhida)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{s.descricao}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumo IA */}
              {selecionado.resumoIA && (
                <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 11, padding: "1rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: CORES.green, marginBottom: 6 }}>Resumo gerado pela IA</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{selecionado.resumoIA}</div>
                </div>
              )}

              {/* Campos */}
              {[
                ["Empresa", selecionado.empresa],
                ["Processo problemático", selecionado.processo],
                ["Como funciona hoje", selecionado.descricao],
                ["Impactos", (selecionado.impactos || []).join(", ")],
                ["Tempo perdido", selecionado.tempo],
                ["Ferramenta ideal", selecionado.ferramenta],
                ["Usuários", selecionado.usuarios],
                ["Nível tech", selecionado.tech ? selecionado.tech + "/5" : "—"],
                ["Contexto extra", selecionado.extra],
              ].map(([k, v]) => v ? (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{v}</div>
                </div>
              ) : null)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────
const FORM_INIT = {
  empresa: "", processo: "", descricao: "", impactos: [],
  tempo: "", ferramenta: "", usuarios: "", tech: null,
  extra: "", nome: "", whatsapp: "",
};

function App() {
  const [tela, setTela] = useState("form"); // form | ia | sucesso | admin | adminLogin
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(FORM_INIT);
  const [escolha, setEscolha] = useState(null);
  const [adminPass, setAdminPass] = useState("");
  const [adminErr, setAdminErr] = useState(false);

  // Toque longo no header → login admin
  const [tapCount, setTapCount] = useState(0);
  const handleHeaderTap = () => {
    const n = tapCount + 1;
    setTapCount(n);
    if (n >= 5) { setTela("adminLogin"); setTapCount(0); }
    setTimeout(() => setTapCount(0), 2000);
  };

  const confirmar = async (sol, resumoIA, todasSolucoes) => {
    setEscolha(sol);
    await salvarDiagnostico({ ...form, escolha: sol, resumoIA, todasSolucoes });
    setTela("sucesso");
  };

  if (tela === "adminLogin") return (
    <div style={{ ...G.root, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "2rem", width: 300 }}>
        <div style={{ ...G.badge, marginBottom: 16 }}>Acesso admin</div>
        <input type="password" style={{ ...G.input, marginBottom: 10 }}
          placeholder="Senha" value={adminPass} onChange={e => { setAdminPass(e.target.value); setAdminErr(false); }} />
        {adminErr && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>Senha incorreta</div>}
        <button style={{ ...G.btnGold, width: "100%" }} onClick={() => {
          if (adminPass === ADMIN_PASS) setTela("admin");
          else setAdminErr(true);
        }}>Entrar</button>
        <button style={{ ...G.btnBk, width: "100%", marginTop: 8 }} onClick={() => { setTela("form"); setAdminPass(""); }}>Cancelar</button>
      </div>
    </div>
  );

  if (tela === "admin") return <PainelAdmin onSair={() => setTela("form")} />;

  if (tela === "sucesso") return (
    <div style={G.root}>
      <div style={G.hdr} onClick={handleHeaderTap}>
        <div style={G.badge}>Fábrica de Ferramentas · Diagnóstico</div>
      </div>
      <TelaSucesso form={form} escolha={escolha} />
    </div>
  );

  if (tela === "ia") return (
    <div style={G.root}>
      <div style={{ background: CORES.navy, borderBottom: "1px solid rgba(16,185,129,0.18)", padding: "1rem 1.75rem" }} onClick={handleHeaderTap}>
        <div style={G.badge}>Fábrica de Ferramentas · Análise IA</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Processando diagnóstico de {form.nome}</div>
      </div>
      <TelaIA form={form} onConfirmar={confirmar} />
    </div>
  );

  return (
    <div style={G.root}>
      <div onClick={handleHeaderTap}>
        <Header step={step} total={6} />
      </div>
      <div style={G.body}>
        {step === 0 && <Etapa1 form={form} setForm={setForm} onNext={() => setStep(1)} />}
        {step === 1 && <Etapa2 form={form} setForm={setForm} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <Etapa3 form={form} setForm={setForm} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Etapa4 form={form} setForm={setForm} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Etapa5 form={form} setForm={setForm} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
        {step === 5 && <Etapa6 form={form} setForm={setForm} onBack={() => setStep(4)} onSubmit={() => setTela("ia")} />}
      </div>
    </div>
  );
}

// Inicializar a aplicação React
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

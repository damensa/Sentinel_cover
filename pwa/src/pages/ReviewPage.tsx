import { useLocation, useNavigate, useParams } from 'react-router-dom';

export function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const state = useLocation().state as { fields?: Record<string, any> } | null;
  const fields = state?.fields ?? {};

  const critical: Array<{ key: string; value: any }> = [
    { key: 'Titular', value: fields.titular?.nom_complet },
    { key: 'NIF', value: fields.titular?.nif },
    { key: 'CUPS', value: fields.instalacio?.cups },
    { key: 'Potència (kW)', value: fields.instalacio?.potencia_kw },
    { key: 'Adreça', value: formatAddress(fields.emplacament) },
  ];

  return (
    <div className="page">
      <h1>Revisió <small>abans d'enviar</small></h1>
      <p className="page-sub">Comprova els camps crítics. Si algun no és correcte, torna enrere i corregeix parlant.</p>

      <div className="card">
        <label>Camps crítics</label>
        {critical.map((c) => (
          <div className="field-row" key={c.key}>
            <span className="field-key">{c.key}</span>
            <span className={`field-val ${c.value ? '' : 'pending'}`}>{c.value ?? '—'}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <label>JSON complet</label>
        <pre className="json">{JSON.stringify(fields, null, 2)}</pre>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn secondary" onClick={() => nav(-1)}>← Torna</button>
        <button
          className="btn"
          style={{ marginLeft: 'auto' }}
          onClick={() => nav(`/submit/${sessionId}`, { state: { fields } })}
        >
          Envia →
        </button>
      </div>
    </div>
  );
}

function formatAddress(e: any): string | undefined {
  if (!e) return undefined;
  const parts = [
    e.tipus_via, e.nom_via, e.num_via,
    e.bloc ? `bl ${e.bloc}` : null,
    e.escala ? `esc ${e.escala}` : null,
    e.pis ? `${e.pis}` : null,
    e.porta ? `${e.porta}` : null,
    e.codi_postal, e.poblacio,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}

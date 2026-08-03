import { useLocation, useNavigate, useParams } from 'react-router-dom';

interface ReviewRow {
  label: string;
  value: any;
  critical?: boolean;
}

/**
 * Camps mostrats en el bloc principal de Revisió per cada tipus de document.
 * Els marcats com `critical` surten destacats en vermell si falten.
 */
function reviewRowsFor(docType: string | undefined, fields: Record<string, any>): ReviewRow[] {
  const t = fields.titular;
  const e = fields.emplacament;

  switch (docType) {
    case 'elec1':
      return [
        { label: 'Titular', value: t?.nom_complet, critical: true },
        { label: 'NIF', value: t?.nif, critical: true },
        { label: 'Adreça', value: formatAddress(e), critical: true },
        { label: 'CUPS', value: fields.instalacio?.cups, critical: true },
        { label: 'Potència (kW)', value: fields.instalacio?.potencia_kw, critical: true },
        { label: 'Tensió', value: fields.instalacio?.tensio },
        { label: 'Ús', value: fields.instalacio?.us },
      ];
    case 'dr': {
      const d = fields.declarant;
      return [
        { label: 'Titular', value: t?.nom_complet, critical: true },
        { label: 'NIF titular', value: t?.nif, critical: true },
        { label: 'Declarant', value: d?.nom_complet, critical: true },
        { label: 'NIF declarant', value: d?.nif, critical: true },
        { label: 'Adreça', value: formatAddress(fields.adreca), critical: true },
        { label: 'Tipus instal·lació', value: fields.installacio?.tipus },
        { label: 'CUPS', value: fields.installacio?.cups, critical: true },
      ];
    }
    case 'contracte': {
      const r = fields.representant;
      const inst = fields.installacio;
      return [
        { label: 'Titular', value: t?.nom_complet, critical: true },
        { label: 'NIF', value: t?.nif, critical: true },
        { label: 'Representant', value: r?.nom_complet },
        { label: 'Adreça instal·lació', value: formatAddress(inst?.adreca), critical: true },
        { label: 'Ús', value: inst?.us },
        { label: 'Potència contractada (kW)', value: inst?.potencia_contractada_kw, critical: true },
        { label: 'Tensió', value: inst?.tensio },
        { label: 'Expedient BT', value: inst?.num_expedient_bt },
      ];
    }
    case 'elec2': {
      const g = fields.general;
      const c = fields.circuits ?? [];
      return [
        { label: 'Titular', value: g?.titular, critical: true },
        { label: 'Emplaçament', value: g?.emplacament, critical: true },
        { label: 'Tensió', value: g?.tensio, critical: true },
        { label: 'Potència contractada (kW)', value: g?.potencia_contractada_kw, critical: true },
        { label: 'Nombre de circuits', value: c.length ? `${c.length}` : undefined, critical: true },
      ];
    }
    case 'dictamen': {
      const g = fields.general;
      const a = fields.anomalies ?? [];
      const noCompleix = a.filter((x: any) => x?.estat === 'no compleix').length;
      return [
        { label: 'Titular', value: g?.titular, critical: true },
        { label: 'Expedient', value: g?.expedient, critical: true },
        { label: 'Data revisió', value: g?.data_revisio, critical: true },
        { label: 'Emplaçament', value: g?.emplacament },
        { label: 'Anomalies revisades', value: a.length ? `${a.length}/43` : undefined },
        { label: '"No compleix"', value: noCompleix > 0 ? `${noCompleix} anomalies` : 'cap' },
      ];
    }
    default:
      // Sense docType, mostra tot el que hi hagi al primer nivell.
      return Object.entries(fields)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => ({ label: k, value: typeof v === 'object' ? JSON.stringify(v) : v }));
  }
}

export function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const state = useLocation().state as { fields?: Record<string, any>; docType?: string } | null;
  const fields = state?.fields ?? {};
  const docType = state?.docType;
  const rows = reviewRowsFor(docType, fields);
  const missingCritical = rows.filter((r) => r.critical && !r.value).length;

  return (
    <div className="page">
      <h1>Revisió <small>abans d'enviar</small></h1>
      <p className="page-sub">
        {missingCritical > 0
          ? `Falten ${missingCritical} camp${missingCritical === 1 ? '' : 's'} obligatori${missingCritical === 1 ? '' : 's'}. Torna a la conversa per completar-los.`
          : 'Comprova que tot és correcte. Si veus algun error, torna a la conversa i digues què s\'ha de corregir.'}
      </p>

      <div className="card">
        <label>Camps recollits</label>
        {rows.map((r) => (
          <div className="field-row" key={r.label}>
            <span className="field-key">{r.label}</span>
            {r.value != null && r.value !== '' ? (
              <span className="field-val">{String(r.value)}</span>
            ) : r.critical ? (
              <span className="field-val" style={{ color: 'var(--err)', fontWeight: 600 }}>FALTA</span>
            ) : (
              <span className="field-val pending">—</span>
            )}
          </div>
        ))}
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
          Veure el JSON complet
        </summary>
        <pre className="json" style={{ marginTop: 10 }}>{JSON.stringify(fields, null, 2)}</pre>
      </details>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn secondary" onClick={() => nav(-1)}>← Torna a la conversa</button>
        <button
          className="btn"
          style={{ marginLeft: 'auto' }}
          onClick={() => nav(`/submit/${sessionId}`, { state: { fields } })}
          disabled={missingCritical > 0}
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

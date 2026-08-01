import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession, type DocType, type Region } from '../api/gateway';

const DOC_LABELS: Record<DocType, string> = {
  elec1: "ELEC1 · Certificat d'instal·lació BT",
  dr: 'DR · Declaració Responsable',
  contracte: 'Contracte de Manteniment BT',
  elec2: 'ELEC2 · Esquema Unifilar',
  dictamen: 'Dictamen de Reconeixement',
};

export function SelectionPage() {
  const nav = useNavigate();
  const [region, setRegion] = useState<Region>('catalunya');
  const [docType, setDocType] = useState<DocType>('elec1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const { sessionId } = await createSession(region, docType);
      nav(`/conversation/${sessionId}`, { state: { region, docType } });
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Sentinel <small>Instal·lador de veu</small></h1>
      <p className="page-sub">Escull la comunitat i el document. Després parlaràs amb l'assistent per omplir-lo.</p>

      <div className="card">
        <label htmlFor="region">Comunitat</label>
        <select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)}>
          <option value="catalunya">Catalunya</option>
        </select>
      </div>

      <div className="card">
        <label htmlFor="doc">Document</label>
        <select id="doc" value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
          {(Object.keys(DOC_LABELS) as DocType[]).map((k) => (
            <option key={k} value={k}>{DOC_LABELS[k]}</option>
          ))}
        </select>
      </div>

      <button className="btn" onClick={start} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Obrint sessió…' : 'Comença'}
      </button>
      {error && <p className="error-msg">Error: {error}</p>}
    </div>
  );
}

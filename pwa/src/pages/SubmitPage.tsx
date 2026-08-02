import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { submitSession, documentUrl, type SubmitResponse } from '../api/gateway';
import { friendlyErrorMessages } from '../utils/friendlyErrors';

type State = 'sending' | 'ok' | 'invalid' | 'unsupported' | 'error';

export function SubmitPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const [state, setState] = useState<State>('sending');
  const [result, setResult] = useState<SubmitResponse | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    submitSession(sessionId)
      .then((r) => {
        setResult(r);
        if (r.ok) setState('ok');
        else if (r.errors) setState('invalid');
        else setState('unsupported');
      })
      .catch((e) => {
        setResult({ ok: false, fields: null, error: e.message });
        setState('error');
      });
  }, [sessionId]);

  const title =
    state === 'sending' ? 'Generant…'
    : state === 'ok' ? 'Documents llestos'
    : state === 'invalid' ? 'Falten dades'
    : state === 'unsupported' ? 'Document no suportat encara'
    : 'Error';

  return (
    <div className="page">
      <h1>{title}</h1>

      {state === 'sending' && <p className="page-sub">Validant les dades i omplint el PDF…</p>}

      {state === 'ok' && (
        <>
          <p className="ok-msg">Les dades passen la validació i el document s'ha generat.</p>

          <div className="card">
            <label>Descarrega</label>
            {(result?.documents ?? []).map((d) => (
              <div className="field-row" key={d.filename}>
                <span className="field-key">{d.docType.toUpperCase()}</span>
                <a
                  className="btn"
                  href={documentUrl(d.downloadUrl)}
                  download={d.filename}
                  style={{ textDecoration: 'none' }}
                >
                  Baixa el PDF
                </a>
              </div>
            ))}
            {(result?.documents ?? []).length === 0 && (
              <p className="page-sub">El servidor no ha retornat cap document.</p>
            )}
          </div>

          <div className="card">
            <label>Dades utilitzades</label>
            <pre className="json">{JSON.stringify(result?.fields, null, 2)}</pre>
          </div>
        </>
      )}

      {state === 'invalid' && (
        <>
          <p className="error-msg">Encara falten algunes dades. Torna a la conversa i digues-les (o escriu-les al camp de text).</p>
          <div className="card">
            <label>Què falta</label>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {friendlyErrorMessages(result?.errors ?? []).map((msg, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{msg}</li>
              ))}
            </ul>
          </div>
          <details className="card">
            <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
              Detall tècnic
            </summary>
            <pre className="json" style={{ marginTop: 10 }}>{JSON.stringify(result?.errors, null, 2)}</pre>
          </details>
          <div className="card">
            <label>Estat actual</label>
            <pre className="json">{JSON.stringify(result?.fields, null, 2)}</pre>
          </div>
        </>
      )}

      {state === 'unsupported' && (
        <>
          <p className="error-msg">{result?.error}</p>
          <div className="card">
            <label>Dades recollides (es poden reaprofitar)</label>
            <pre className="json">{JSON.stringify(result?.fields, null, 2)}</pre>
          </div>
        </>
      )}

      {state === 'error' && <p className="error-msg">Error de xarxa: {result?.error}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn secondary" onClick={() => nav(`/conversation/${sessionId}`)}>← Torna a la conversa</button>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => nav('/')}>Nova sessió</button>
      </div>
    </div>
  );
}

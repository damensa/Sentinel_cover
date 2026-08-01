import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { submitSession } from '../api/gateway';

type State = 'sending' | 'ok' | 'invalid' | 'error';

export function SubmitPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const [state, setState] = useState<State>('sending');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    submitSession(sessionId)
      .then((r) => {
        setResult(r);
        setState(r.ok ? 'ok' : 'invalid');
      })
      .catch((e) => {
        setResult({ error: e.message });
        setState('error');
      });
  }, [sessionId]);

  return (
    <div className="page">
      <h1>{state === 'sending' ? 'Enviant…' : state === 'ok' ? 'Enviat ✓' : 'Revisió necessària'}</h1>

      {state === 'sending' && <p className="page-sub">Validant el JSON contra l'schema…</p>}

      {state === 'ok' && (
        <>
          <p className="ok-msg">La sessió {sessionId} passa la validació. Aviat es connectarà al FormFillerService per generar els PDFs.</p>
          <div className="card">
            <label>JSON validat</label>
            <pre className="json">{JSON.stringify(result?.fields, null, 2)}</pre>
          </div>
        </>
      )}

      {state === 'invalid' && (
        <>
          <p className="error-msg">Hi ha camps que no compleixen l'schema. Torna a la conversa per completar-los.</p>
          <div className="card">
            <label>Errors</label>
            <pre className="json">{JSON.stringify(result?.errors, null, 2)}</pre>
          </div>
          <div className="card">
            <label>Estat actual</label>
            <pre className="json">{JSON.stringify(result?.fields, null, 2)}</pre>
          </div>
        </>
      )}

      {state === 'error' && (
        <p className="error-msg">Error de xarxa: {result?.error}</p>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn secondary" onClick={() => nav(`/conversation/${sessionId}`)}>← Torna a la conversa</button>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => nav('/')}>Nova sessió</button>
      </div>
    </div>
  );
}

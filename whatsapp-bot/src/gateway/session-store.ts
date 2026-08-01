import { randomUUID } from 'crypto';
import type { DocType, Region } from '../schemas/loader';

export interface SessionState {
  id: string;
  region: Region;
  docType: DocType;
  createdAt: number;
  // Estat acumulat dels camps que Gemini ha omplert (deep-merged de cada function_call).
  fields: Record<string, any>;
}

class SessionStore {
  private sessions = new Map<string, SessionState>();

  create(region: Region, docType: DocType): SessionState {
    const s: SessionState = {
      id: randomUUID(),
      region,
      docType,
      createdAt: Date.now(),
      fields: {},
    };
    this.sessions.set(s.id, s);
    return s;
  }

  get(id: string): SessionState | undefined {
    return this.sessions.get(id);
  }

  mergeFields(id: string, partial: Record<string, any>): SessionState | undefined {
    const s = this.sessions.get(id);
    if (!s) return undefined;
    s.fields = deepMerge(s.fields, partial);
    return s;
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }
}

function deepMerge<T extends Record<string, any>>(target: T, src: Record<string, any>): T {
  const out: Record<string, any> = { ...target };
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export const sessionStore = new SessionStore();

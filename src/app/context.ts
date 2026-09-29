import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Runtime } from './runtime';

export const RuntimeContext = createContext<Runtime | null>(null);

/** Estado + ações. Os componentes redesenham quando o App redesenha (ele é o único inscrito no store). */
export function useRuntime(): Runtime {
  const rt = useContext(RuntimeContext);
  if (!rt) throw new Error('RuntimeContext ausente');
  return rt;
}

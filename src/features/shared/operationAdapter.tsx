import { createContext } from "react";
/** Optional transport simulation. Presentation does not own dispatched work. */
export interface OperationAdapter {
  subscribe(result: { resolve: () => void; timeout: () => void }): () => void;
}
export const OperationAdapterContext = createContext<OperationAdapter | null>(
  null,
);

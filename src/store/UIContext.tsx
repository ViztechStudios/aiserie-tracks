import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Transaction } from '../types';

export interface ModalPreset {
  categoryId?: string;
  amount?: number;
  note?: string;
  date?: string;
  source?: 'manual' | 'scan';
}

interface ModalState {
  visible: boolean;
  editing?: Transaction;
  preset?: ModalPreset;
}

interface UIContextValue extends ModalState {
  openAdd: (preset?: ModalPreset) => void;
  openEdit: (tx: Transaction) => void;
  close: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ visible: false });

  const openAdd = useCallback((preset?: ModalPreset) => {
    setState({ visible: true, editing: undefined, preset });
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    setState({ visible: true, editing: tx, preset: undefined });
  }, []);

  const close = useCallback(() => {
    setState({ visible: false, editing: undefined, preset: undefined });
  }, []);

  const value = useMemo(() => ({ ...state, openAdd, openEdit, close }), [state, openAdd, openEdit, close]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}

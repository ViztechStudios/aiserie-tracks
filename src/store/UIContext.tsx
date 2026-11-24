import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Transaction } from '../types';
import { UpdateInfo } from '../services/updateCheck';

export type LegalDoc = 'privacy' | 'terms';

export interface ModalPreset {
  categoryId?: string;
  amount?: number;
  note?: string;
  date?: string;
  source?: 'manual' | 'scan' | 'detect';
  accountId?: string;
}

interface ModalState {
  visible: boolean;
  editing?: Transaction;
  preset?: ModalPreset;
}

interface UIContextValue extends ModalState {
  walletsVisible: boolean;
  editAccountId?: string;
  legalDoc: LegalDoc | null;
  updateInfo: UpdateInfo | null;
  openAdd: (preset?: ModalPreset) => void;
  openEdit: (tx: Transaction) => void;
  openWallets: (editAccountId?: string) => void;
  openLegal: (doc: LegalDoc) => void;
  showUpdate: (info: UpdateInfo) => void;
  close: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ visible: false });
  const [walletsVisible, setWalletsVisible] = useState(false);
  const [editAccountId, setEditAccountId] = useState<string | undefined>(undefined);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const openAdd = useCallback((preset?: ModalPreset) => {
    setState({ visible: true, editing: undefined, preset });
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    setState({ visible: true, editing: tx, preset: undefined });
  }, []);

  const openWallets = useCallback((id?: string) => {
    setEditAccountId(id);
    setWalletsVisible(true);
  }, []);

  const openLegal = useCallback((doc: LegalDoc) => {
    setLegalDoc(doc);
  }, []);

  const showUpdate = useCallback((info: UpdateInfo) => {
    setUpdateInfo(info);
  }, []);

  const closeUpdate = useCallback(() => {
    setUpdateInfo(null);
  }, []);

  const close = useCallback(() => {
    setState({ visible: false, editing: undefined, preset: undefined });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      walletsVisible,
      editAccountId,
      legalDoc,
      updateInfo,
      openAdd,
      openEdit,
      openWallets,
      openLegal,
      showUpdate,
      close,
      closeWallets: () => setWalletsVisible(false),
      closeLegal: () => setLegalDoc(null),
      closeUpdate,
    }),
    [state, walletsVisible, editAccountId, legalDoc, updateInfo, openAdd, openEdit, openWallets, openLegal, showUpdate, close, closeUpdate]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue & { closeWallets: () => void; closeLegal: () => void; closeUpdate: () => void } {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx as UIContextValue & { closeWallets: () => void; closeLegal: () => void; closeUpdate: () => void };
}

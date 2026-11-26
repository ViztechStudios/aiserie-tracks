import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Transaction, TxType } from '../types';
import { UpdateInfo } from '../services/updateCheck';

export type LegalDoc = 'privacy' | 'terms';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ModalPreset {
  categoryId?: string;
  amount?: number;
  note?: string;
  date?: string;
  source?: 'manual' | 'scan' | 'detect';
  accountId?: string;
  /** Pre-select the entry mode (expense / income / transfer). */
  type?: TxType;
  /** For transfer presets: destination wallet. */
  toAccountId?: string;
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
  /** Global Reports sheet (Settings → Export & reports). */
  reportsVisible: boolean;
  /** Global Backup & Restore sheet (Settings → Backup & restore). "import" jumps straight to picking a file. */
  backupVisible: false | 'export' | 'import';
  openAdd: (preset?: ModalPreset) => void;
  openEdit: (tx: Transaction) => void;
  openWallets: (editAccountId?: string) => void;
  openLegal: (doc: LegalDoc) => void;
  showUpdate: (info: UpdateInfo) => void;
  openReports: () => void;
  openBackup: (mode: 'export' | 'import') => void;
  close: () => void;
  /**
   * In-app confirmation that works identically on native and web (the RN
   * Alert API drops its buttons on react-native-web, which silently broke
   * every destructive action on the PWA). Resolves true when confirmed.
   */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** In-app notice (validation, confirmations) — Alert.alert is a no-op on web. */
  toast: (message: string) => void;
}

interface ConfirmState extends ConfirmOptions {
  id: number;
  resolve: (v: boolean) => void;
}

interface ToastState {
  id: number;
  message: string;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ visible: false });
  const [walletsVisible, setWalletsVisible] = useState(false);
  const [editAccountId, setEditAccountId] = useState<string | undefined>(undefined);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [reportsVisible, setReportsVisible] = useState(false);
  const [backupVisible, setBackupVisible] = useState<false | 'export' | 'import'>(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, id: Date.now(), resolve });
    });
  }, []);

  const settleConfirm = useCallback((value: boolean) => {
    setConfirmState((prev) => {
      if (prev) prev.resolve(value);
      return null;
    });
  }, []);

  const toast = useCallback((message: string) => {
    setToastState({ id: Date.now(), message });
  }, []);

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

  const openReports = useCallback(() => setReportsVisible(true), []);
  const openBackup = useCallback((mode: 'export' | 'import') => setBackupVisible(mode), []);

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
      reportsVisible,
      backupVisible,
      openAdd,
      openEdit,
      openWallets,
      openLegal,
      showUpdate,
      openReports,
      openBackup,
      close,
      closeWallets: () => setWalletsVisible(false),
      closeLegal: () => setLegalDoc(null),
      closeUpdate,
      closeReports: () => setReportsVisible(false),
      closeBackup: () => setBackupVisible(false),
      confirm,
      confirmState,
      settleConfirm,
      toast,
      toastState,
    }),
    [state, walletsVisible, editAccountId, legalDoc, updateInfo, reportsVisible, backupVisible, openAdd, openEdit, openWallets, openLegal, showUpdate, openReports, openBackup, close, closeUpdate, confirm, confirmState, settleConfirm, toast, toastState]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI():
  | UIContextValue & {
      closeWallets: () => void;
      closeLegal: () => void;
      closeUpdate: () => void;
      closeReports: () => void;
      closeBackup: () => void;
      confirm: (opts: ConfirmOptions) => Promise<boolean>;
      confirmState: (ConfirmState & ConfirmOptions) | null;
      settleConfirm: (v: boolean) => void;
      toast: (message: string) => void;
      toastState: { id: number; message: string } | null;
    } {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx as UIContextValue & {
    closeWallets: () => void;
    closeLegal: () => void;
    closeUpdate: () => void;
    closeReports: () => void;
    closeBackup: () => void;
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
    confirmState: (ConfirmState & ConfirmOptions) | null;
    settleConfirm: (v: boolean) => void;
    toast: (message: string) => void;
    toastState: { id: number; message: string } | null;
  };
}

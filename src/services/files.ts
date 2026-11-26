import { Platform } from 'react-native';

/**
 * On-device file plumbing for backups and reports. Nothing here ever talks to
 * a server: "save" means a browser download on web and the system share sheet
 * (or app container) on native; "pick" means the platform file picker, and
 * only the file the user personally selected is read.
 */

/** Save a text file entirely on-device: download on web, share sheet on native. */
export async function saveTextFile(fileName: string, mime: string, contents: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }
  const FS = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const fileUri = `${(FS as any).documentDirectory ?? ''}${fileName}`;
  await (FS as any).writeAsStringAsync(fileUri, contents, { encoding: (FS as any).EncodingType.UTF8 });
  if (await (Sharing as any).isAvailableAsync()) {
    await (Sharing as any).shareAsync(fileUri, { mimeType: mime, dialogTitle: fileName, UTI: 'public.json' });
  }
}

/** Read a picked text file. Web: <input type="file">; native: DocumentPicker + FileSystem. */
export async function pickTextFile(mimeHints: string[]): Promise<{ name: string; text: string } | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = mimeHints.join(',');
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, text: String(reader.result ?? '') });
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }
  const DP = await import('expo-document-picker');
  const res = await (DP as any).getDocumentAsync({
    type: mimeHints.length > 0 ? mimeHints : ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if ((res as any).canceled !== false && (res as any).type !== 'success') return null;
  const asset = (res as any).assets?.[0] ?? (res as any);
  const uri = asset?.uri;
  if (!uri) return null;
  const FS = await import('expo-file-system');
  const text = await (FS as any).readAsStringAsync(uri);
  return { name: asset.name ?? 'backup.json', text };
}

/** Produces a PDF via the OS dialog: print-to-file + share sheet on native, the browser print dialog (Save as PDF) on web. */
export async function saveReportPDF(html: string, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('popup-blocked');
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        /* user can still print manually */
      }
    }, 350);
    return;
  }
  const Printing = await import('expo-print');
  const { uri } = await (Printing as any).printToFileAsync({ html, fileName });
  const Sharing = await import('expo-sharing');
  if (await (Sharing as any).isAvailableAsync()) {
    await (Sharing as any).shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName, UTI: 'com.adobe.pdf' });
  }
}

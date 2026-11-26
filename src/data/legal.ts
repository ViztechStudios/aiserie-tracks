export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: '1. Overview',
    paragraphs: [
      'Aiserie Tracks ("the app") is a personal finance companion built to run entirely on your device. This policy explains, in plain language, what information the app touches and what it never does.',
      'The app contains no advertising, no analytics trackers, no third-party SDKs that transmit data, and no user accounts. Your records have no server to be sent to.',
      'The app is published by Viztech Studios, an independent studio based in the Philippines.',
    ],
  },
  {
    heading: '2. Data we store — and where',
    paragraphs: [
      'Your transactions, wallet balances, budgets, bills, recurring schedules, tasks, categories, notes, currency preference and display name are stored locally on your device using AsyncStorage. This data never leaves your device: it is not synced, uploaded, backed up remotely, or shared with anyone.',
      'Deleting the app from your device removes all of this data with it. You can also erase everything at any time from Settings → Erase all data — the wipe clears every storage key the app owns, so nothing is left behind or re-persisted afterwards.',
      'Backups and reports are created only when you ask for them (Settings → Backup & restore, Settings → Export report). The backup file or report is written to your device or share sheet — it is not uploaded anywhere, and the app never reads any file except the backup you personally pick to restore. Keep backup files somewhere safe: they contain your records in plain JSON and are not encrypted, so anyone holding the file can read it.',
    ],
  },
  {
    heading: '3. Update checks (the app\'s only network call)',
    paragraphs: [
      'When you open Settings → Check for updates (and, on some versions, when a new release is announced in-app), the app contacts GitHub\'s public releases feed to compare the latest published version number with the one installed on your device.',
      'This check sends no personal data — no name, no transactions, no device identifiers. It only reads a public version number, exactly like a browser fetching a public webpage. You are never required to check for updates.',
    ],
  },
  {
    heading: '4. Camera and receipt scanning',
    paragraphs: [
      'The app requests camera permission only to photograph receipts. The photo is processed on your device with on-device text recognition (Google ML Kit) to extract the receipt total. The photo is not uploaded anywhere, is not attached to your records, and is discarded once you finish reviewing the parsed result.',
    ],
  },
  {
    heading: '5. Purchase detection from pasted text',
    paragraphs: [
      'Aiserie Tracks can read short text that you paste into it — for example the confirmation SMS or notification text from an e-wallet like GCash or Maya — to pre-fill a transaction. This parsing happens entirely on your device. The app does not read your messages, does not access notifications, and does not monitor any other app.',
      'Apple\'s iOS does not permit apps to read other apps\' notifications, and the app does not attempt to do so on any platform.',
    ],
  },
  {
    heading: '6. Wallets and balances',
    paragraphs: [
      'E-wallet, bank and cash balances shown in the app are based on figures you enter yourself and transactions you record. The app does not connect to, log into, or communicate with GCash, Maya, any bank, or any third-party financial service. Displaying a provider\'s name in the app does not imply any affiliation, endorsement or integration.',
    ],
  },
  {
    heading: '7. Your rights (Philippines — RA 10173)',
    paragraphs: [
      'Because all data remains on your device under your sole control, you have complete custody of your information at all times. You may view it, export it, correct it, or destroy it (Settings → Erase all data, or uninstalling the app) without asking anyone. Nothing is processed on your behalf on any external system.',
    ],
  },
  {
    heading: '8. Changes and contact',
    paragraphs: [
      'If a future version of the app ever adds networking beyond the update check, accounts or cloud backup, this policy will be updated first and the feature will always be strictly opt-in. Questions about this policy can be sent to Viztech Studios through the app\'s repository page on GitHub.',
    ],
  },
];

export const TERMS: LegalSection[] = [
  {
    heading: '1. Acceptance',
    paragraphs: [
      'By installing or using Aiserie Tracks ("the app"), you agree to these Terms & Conditions. If you do not agree, please stop using the app and remove it from your device.',
    ],
  },
  {
    heading: '2. Publisher',
    paragraphs: [
      'Aiserie Tracks is designed, developed and published by Viztech Studios. The app was first created as a personal gift — a simple money tracker for the studio\'s co-founder\'s girlfriend, Aiserie — and is now shared publicly so anyone who wants the same calm way of tracking money can use it.',
    ],
  },
  {
    heading: '3. Licence and personal use',
    paragraphs: [
      'The app is licensed to you for personal, non-commercial use. You may use it on any number of devices you own, for yourself or — as it is often shared as a gift — for the person it was given to. You may not resell the app, misrepresent it as your own product, or use it to provide bookkeeping services to third parties.',
    ],
  },
  {
    heading: '4. Not financial advice',
    paragraphs: [
      'The "Finance Advisor" section, all insights, projections, safe-to-spend figures and tips are generated by simple mathematical rules applied to the data you entered. They are informational only and do not constitute financial, investment, accounting or tax advice. Always consult a qualified professional before making financial decisions.',
    ],
  },
  {
    heading: '5. Accuracy of balances',
    paragraphs: [
      'Wallet and bank balances in the app are computed from figures you declare and transactions you record. The app does not connect to any financial institution and cannot verify real-world balances. It is your responsibility to reconcile balances against your actual accounts.',
    ],
  },
  {
    heading: '6. Third-party names and trademarks',
    paragraphs: [
      'GCash, Maya, PayMaya, GrabPay, ShopeePay and all bank names are trademarks of their respective owners. Aiserie Tracks is not affiliated with, endorsed by, or connected to any of them, and no integration with their services exists or is planned.',
    ],
  },
  {
    heading: '7. No warranty',
    paragraphs: [
      'The app is provided "as is" without warranties of any kind, express or implied, including merchantability and fitness for a particular purpose. We do not guarantee that the app will be error-free or uninterrupted, and we are not liable for lost data (always keep your own records), missed payments, overdrafts, or financial losses of any kind arising from use of the app.',
    ],
  },
  {
    heading: '8. Limitation of liability',
    paragraphs: [
      'To the maximum extent permitted by law, Viztech Studios shall not be liable for any indirect, incidental, special or consequential damages arising from your use of, or inability to use, the app — even if advised of the possibility of such damages. Total liability, if any, is limited to the amount you paid for the app (typically nothing).',
    ],
  },
  {
    heading: '9. Updates and termination',
    paragraphs: [
      'These terms may be updated with new versions of the app; continuing to use an updated version means you accept the updated terms. You may stop using the app at any time — uninstalling removes all local data.',
    ],
  },
  {
    heading: '10. Governing law',
    paragraphs: [
      'These terms are governed by the laws of the Republic of the Philippines.',
    ],
  },
];

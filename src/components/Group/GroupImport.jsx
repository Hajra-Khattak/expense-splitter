import { useRef, useState } from "react";
import { toast } from "sonner";
import { downloadCsv } from "../../utils/csv";
import { downloadGroupTemplate, readSpreadsheetRows } from "../../utils/spreadsheet";
import { parseGroupRows } from "../../utils/groupImport";
import { currencyDigits, formatMinor } from "../../utils/minorUnits";
import { importGroupExpenses } from "../../services/groupImportService";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const btnPrimary =
  "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 dark:hover:bg-emerald-500";
const btnQuiet =
  "rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10";

export default function GroupImport({ group, members, user, onImported }) {
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null); // { fileName, valid, errors }
  const [importing, setImporting] = useState(false);

  const nameCell = (name) => `"${String(name).replace(/"/g, '""')}"`;

 async function downloadTemplate() {
  try {
    await downloadGroupTemplate(members);
  } catch (err) {
    console.error("template failed", err);
    toast.error("Could not create the template.");
  }
}

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const rows = await readSpreadsheetRows(file);
      const { valid, errors } = parseGroupRows(rows, members, group.currency);
      setPreview({ fileName: file.name, valid, errors });
    } catch (err) {
      console.error("read import file failed", err);
      toast.error(err.message || "Could not read that file.");
    }
  }

  async function confirmImport() {
    if (!preview || preview.valid.length === 0) return;
    setImporting(true);
    try {
      await importGroupExpenses(group.id ?? preview.groupId, user, preview.valid);
      toast.success(`${preview.valid.length} expenses imported`);
      setPreview(null);
      setOpen(false);
      await onImported?.();
    } catch (err) {
      console.error("group import failed", err.code, err.message);
      toast.error(err.message || "Import failed. Nothing was saved.");
    } finally {
      setImporting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={btnQuiet} onClick={() => setOpen(true)}>
        Import expenses
      </button>
    );
  }

  const total = preview?.valid.reduce((s, r) => s + r.amountMinor, 0) ?? 0;

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import expenses</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
        Upload .csv, .xls or .xlsx. Required columns: Date (YYYY-MM-DD), Description, Amount, Paid by
        (a member's exact name). Optional: Category, Split between (names separated by ; or "all"),
        Note. Every imported expense is split equally.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btnQuiet} onClick={downloadTemplate}>
          Download template
        </button>
        <button type="button" className={btnQuiet} onClick={() => fileRef.current?.click()}>
          Choose file
        </button>
        <button type="button" className={btnQuiet} onClick={() => { setOpen(false); setPreview(null); }}>
          Close
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={onFile}
          className="hidden"
          aria-label="Choose a file to import"
        />
      </div>

      {preview && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 dark:bg-white/[0.03]">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{preview.fileName}</p>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            {preview.valid.length} rows ready, total {formatMinor(total, group.currency)}
          </p>

          {preview.errors.length > 0 && (
            <div role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-medium">{preview.errors.length} rows will be skipped:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {preview.errors.slice(0, 10).map((er) => (
                  <li key={`${er.line}-${er.message}`}>Line {er.line}: {er.message}</li>
                ))}
              </ul>
              {preview.errors.length > 10 && <p className="mt-1">...and {preview.errors.length - 10} more.</p>}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={btnPrimary}
              onClick={confirmImport}
              disabled={importing || preview.valid.length === 0}
            >
              {importing ? "Importing..." : `Import ${preview.valid.length} expenses`}
            </button>
            <button type="button" className={btnQuiet} onClick={() => setPreview(null)} disabled={importing}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
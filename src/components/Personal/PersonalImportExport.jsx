import { useRef, useState } from "react";
import { toast } from "sonner";
import { downloadCsv, parseCsv, personalExpensesToCsv } from "../../utils/csv";
import { parsePersonalRows } from "../../utils/personalImport";
import { importPersonalExpenses } from "../../services/personalExpenseService";
import { readSpreadsheetRows } from "../../utils/spreadsheet";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const btnPrimary =
  "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 dark:hover:bg-emerald-500";
const btnQuiet =
  "rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10";

const MAX_FILE_BYTES = 1024 * 1024; // 1 MB is far more than 500 rows need

export default function PersonalImportExport({ user, items }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { fileName, valid, errors }
  const [importing, setImporting] = useState(false);

  function exportCsv() {
    downloadCsv("my-expenses.csv", personalExpensesToCsv(items));
  }

  async function onFile(e) {
  const file = e.target.files?.[0];
  e.target.value = ""; // lets the same file be picked again
  if (!file) return;
  try {
    const { valid, errors } = parsePersonalRows(await readSpreadsheetRows(file));
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
      await importPersonalExpenses(user.uid, preview.valid);
      toast.success(`${preview.valid.length} expenses imported`);
      setPreview(null);
    } catch (err) {
      console.error("import failed", err.code, err.message);
      toast.error(err.message || "Import failed. Nothing was saved.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export and import</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
        CSV opens in Excel. To import from Excel, save the sheet as "CSV UTF-8". Columns: Date
        (YYYY-MM-DD), Description, Amount are required. Category, Currency, Note are optional.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btnQuiet} onClick={exportCsv} disabled={items.length === 0}>
          Export CSV
        </button>
        <button type="button" className={btnQuiet} onClick={() => fileRef.current?.click()}>
          Import CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="hidden"
          aria-label="Choose a CSV file to import"
        />
      </div>

      {preview && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 dark:bg-white/[0.03]">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{preview.fileName}</p>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            {preview.valid.length} rows ready to import
          </p>

          {preview.errors.length > 0 && (
            <div role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-medium">{preview.errors.length} rows will be skipped:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {preview.errors.slice(0, 10).map((er) => (
                  <li key={`${er.line}-${er.message}`}>
                    Line {er.line}: {er.message}
                  </li>
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
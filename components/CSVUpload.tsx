'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ParsedGame {
  date: string;
  time?: string;
  opponent: string;
  game_number?: number;
  notes?: string;
  price_per_ticket?: number;
}

interface CSVUploadProps {
  onGamesReady: (games: ParsedGame[]) => void;
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  raw = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // M/D/YYYY or MM/DD/YYYY
  const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const m = String(mdyMatch[1]).padStart(2, '0');
    const d = String(mdyMatch[2]).padStart(2, '0');
    return `${mdyMatch[3]}-${m}-${d}`;
  }
  // M/D/YY (2-digit year, e.g. from Excel)
  const mdyShort = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyShort) {
    const m = String(mdyShort[1]).padStart(2, '0');
    const d = String(mdyShort[2]).padStart(2, '0');
    const yr = parseInt(mdyShort[3]) >= 50 ? `19${mdyShort[3]}` : `20${mdyShort[3]}`;
    return `${yr}-${m}-${d}`;
  }
  return null;
}

function parsePrice(raw: string | number | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'number') return isNaN(raw) ? undefined : raw;
  const cleaned = String(raw).replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

function rowsToGames(rows: Record<string, string | number>[]): { games: ParsedGame[]; errors: string[] } {
  const errors: string[] = [];
  const games: ParsedGame[] = [];

  rows.forEach((row, i) => {
    // Normalize column names (case-insensitive, trim)
    const normalized: Record<string, string | number> = {};
    for (const key of Object.keys(row)) {
      normalized[key.toLowerCase().trim()] = row[key];
    }

    const rawDate = String(normalized['date'] ?? '');
    const opponent = String(normalized['opponent'] ?? normalized['team'] ?? '').trim();
    const date = normalizeDate(rawDate);

    if (!date) {
      errors.push(`Row ${i + 2}: Invalid date "${rawDate}"`);
      return;
    }
    if (!opponent) {
      errors.push(`Row ${i + 2}: Missing opponent/team`);
      return;
    }

    // Accept price, price_per_ticket, or ticket_price columns
    const rawPrice =
      normalized['price_per_ticket'] ??
      normalized['price'] ??
      normalized['ticket_price'] ??
      normalized['cost'];

    games.push({
      date,
      time: normalized['time'] ? String(normalized['time']).trim() || undefined : undefined,
      opponent,
      game_number: normalized['game_number'] ? parseInt(String(normalized['game_number'])) : undefined,
      notes: normalized['notes'] ? String(normalized['notes']).trim() || undefined : undefined,
      price_per_ticket: parsePrice(rawPrice as string | number | undefined),
    });
  });

  return { games, errors };
}

export default function CSVUpload({ onGamesReady }: CSVUploadProps) {
  const [preview, setPreview] = useState<ParsedGame[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCSV(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { games, errors: errs } = rowsToGames(results.data as Record<string, string | number>[]);
        setErrors(errs);
        setPreview(games);
        if (games.length > 0) onGamesReady(games);
      },
    });
  }

  function handleExcel(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // raw:false formats dates as strings using the cell's display format
        const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { raw: false });
        const { games, errors: errs } = rowsToGames(rows);
        setErrors(errs);
        setPreview(games);
        if (games.length > 0) onGamesReady(games);
      } catch {
        setErrors(['Failed to parse Excel file. Make sure it is a valid .xlsx file.']);
      }
    };
    reader.readAsBinaryString(file);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    setErrors([]);
    setPreview([]);
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      handleExcel(file);
    } else if (file.name.endsWith('.csv')) {
      handleCSV(file);
    } else {
      setErrors(['Please upload a .csv or .xlsx file']);
    }
  }

  const hasPrices = preview.some((g) => g.price_per_ticket !== undefined);

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragging ? 'border-giants-orange bg-giants-orange/10' : 'border-gray-600 hover:border-gray-400'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="text-gray-300 text-sm">
          Drop your schedule here or <span className="text-giants-orange font-semibold">click to browse</span>
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Accepts <strong className="text-gray-400">.xlsx</strong> (Excel) or <strong className="text-gray-400">.csv</strong>
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Columns: date, opponent, time, game_number, notes, price (all optional except date &amp; opponent)
        </p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 text-sm text-red-300 space-y-1">
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-green-900/30 border border-green-700 rounded p-3 text-sm text-green-300">
          <div>✓ {preview.length} games parsed successfully</div>
          <div className="text-xs text-green-400 mt-1">
            {preview[0].date} vs {preview[0].opponent}
            {preview.length > 1 && ` … through ${preview[preview.length - 1].date}`}
          </div>
          {hasPrices && (
            <div className="text-xs text-green-400 mt-0.5">
              ✓ Ticket prices included
            </div>
          )}
          {!hasPrices && (
            <div className="text-xs text-yellow-500 mt-0.5">
              No price column found — add a &quot;price&quot; column to your file to enable cost tracking
            </div>
          )}
        </div>
      )}
    </div>
  );
}

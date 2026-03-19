'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';

interface ParsedGame {
  date: string;
  time?: string;
  opponent: string;
  game_number?: number;
  notes?: string;
}

interface CSVUploadProps {
  onGamesReady: (games: ParsedGame[]) => void;
}

function normalizeDate(raw: string): string | null {
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
  return null;
}

export default function CSVUpload({ onGamesReady }: CSVUploadProps) {
  const [preview, setPreview] = useState<ParsedGame[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function parseFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errs: string[] = [];
        const games: ParsedGame[] = [];

        (results.data as Record<string, string>[]).forEach((row, i) => {
          // Normalize column names (case-insensitive)
          const normalized: Record<string, string> = {};
          for (const key of Object.keys(row)) {
            normalized[key.toLowerCase().trim()] = row[key];
          }

          const rawDate = normalized['date'] ?? '';
          const opponent = (normalized['opponent'] ?? normalized['team'] ?? '').trim();
          const date = normalizeDate(rawDate);

          if (!date) {
            errs.push(`Row ${i + 2}: Invalid date "${rawDate}"`);
            return;
          }
          if (!opponent) {
            errs.push(`Row ${i + 2}: Missing opponent/team`);
            return;
          }

          games.push({
            date,
            time: normalized['time']?.trim() || undefined,
            opponent,
            game_number: normalized['game_number'] ? parseInt(normalized['game_number']) : undefined,
            notes: normalized['notes']?.trim() || undefined,
          });
        });

        setErrors(errs);
        setPreview(games);
        if (games.length > 0) onGamesReady(games);
      },
    });
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrors(['Please upload a .csv file']);
      return;
    }
    parseFile(file);
  }

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
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="text-gray-300 text-sm">
          Drop your CSV here or <span className="text-giants-orange font-semibold">click to browse</span>
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Columns: date, opponent, time (optional), game_number (optional), notes (optional)
        </p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-900/40 border border-red-700 rounded p-3 text-sm text-red-300 space-y-1">
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-green-900/30 border border-green-700 rounded p-3 text-sm text-green-300">
          ✓ {preview.length} games parsed successfully
          <div className="text-xs text-green-400 mt-1">
            {preview[0].date} vs {preview[0].opponent}
            {preview.length > 1 && ` … through ${preview[preview.length - 1].date}`}
          </div>
        </div>
      )}
    </div>
  );
}

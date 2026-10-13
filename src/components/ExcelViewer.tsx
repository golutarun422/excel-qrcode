import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Table,
  Search,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  Loader2,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ExcelViewerProps {
  blob: Blob;
  filename: string;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({ blob, filename }) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<Record<string, (string | number | boolean | null)[][]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    blob
      .arrayBuffer()
      .then((buffer) => {
        if (!isMounted) return;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const names = workbook.SheetNames || [];
        const parsed: Record<string, (string | number | boolean | null)[][]> = {};

        names.forEach((name) => {
          const worksheet = workbook.Sheets[name];
          if (worksheet) {
            const rawData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
              header: 1,
              defval: '',
              raw: false,
            });
            parsed[name] = rawData;
          } else {
            parsed[name] = [];
          }
        });

        setSheetNames(names);
        if (names.length > 0) {
          setCurrentSheet(names[0]);
        }
        setSheetData(parsed);
      })
      .catch((err) => {
        console.error('Failed to parse Excel workbook with SheetJS:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [blob]);

  // Current sheet raw rows
  const activeRows = useMemo(() => {
    return sheetData[currentSheet] || [];
  }, [sheetData, currentSheet]);

  // Filtered rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return activeRows;
    const query = searchQuery.toLowerCase();
    return activeRows.filter((row, idx) => {
      // Always keep header row 0
      if (idx === 0) return true;
      return row.some((cell) => String(cell || '').toLowerCase().includes(query));
    });
  }, [activeRows, searchQuery]);

  // Calculate max columns to render equal width table
  const maxCols = useMemo(() => {
    let max = 0;
    activeRows.forEach((r) => {
      if (r.length > max) max = r.length;
    });
    return Math.max(max, 1);
  }, [activeRows]);

  // Pagination for large files
  const totalRows = filteredRows.length > 0 ? filteredRows.length - 1 : 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    if (filteredRows.length <= 1) return filteredRows;
    const header = filteredRows[0];
    const dataRows = filteredRows.slice(1);
    const start = (currentPage - 1) * rowsPerPage;
    const pageRows = dataRows.slice(start, start + rowsPerPage);
    return [header, ...pageRows];
  }, [filteredRows, currentPage]);

  if (isLoading) {
    return (
      <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold text-white">Opening spreadsheet in browser...</p>
        <p className="text-xs text-slate-400">Parsing sheets and data tables</p>
      </div>
    );
  }

  if (sheetNames.length === 0 || activeRows.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
        <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto" />
        <h4 className="text-sm font-bold text-white">Empty Workbook</h4>
        <p className="text-xs text-slate-400">This spreadsheet does not appear to contain any data rows.</p>
      </div>
    );
  }

  // Column letters (A, B, C...) helper
  const getColLetter = (index: number) => {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  };

  return (
    <div
      className={`rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
        isFullscreen
          ? 'fixed inset-4 z-50 bg-slate-950/95 backdrop-blur-2xl'
          : 'w-full'
      }`}
    >
      {/* Top Controls Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Sheet selector tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-white mr-2 truncate max-w-[160px] sm:max-w-xs shrink-0 hidden md:inline">
            {filename}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400 mr-2 shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-300">Sheets:</span>
          </div>
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => {
                setCurrentSheet(name);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                currentSheet === name
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>{name}</span>
            </button>
          ))}
        </div>

        {/* Right: Search & View controls */}
        <div className="flex items-center gap-2">
          {/* In-sheet search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search in sheet..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="flex-1 overflow-auto max-h-[500px] sm:max-h-[600px] relative scrollbar-thin">
        <table className="w-full border-collapse text-xs text-left text-slate-200 select-text">
          {/* Column Letters Bar */}
          <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono font-bold text-slate-400">
            <tr>
              <th className="w-12 px-3 py-2 text-center bg-slate-950 border-r border-slate-800 text-slate-500">
                #
              </th>
              {Array.from({ length: maxCols }).map((_, cIdx) => (
                <th
                  key={cIdx}
                  className="px-4 py-2 border-r border-slate-800/80 font-medium whitespace-nowrap min-w-[120px] max-w-[280px]"
                >
                  {getColLetter(cIdx)}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {paginatedRows.map((row, rIdx) => {
              const isHeaderRow = rIdx === 0 && currentPage === 1;
              const rowNumber = (currentPage - 1) * rowsPerPage + rIdx;

              return (
                <tr
                  key={rIdx}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    isHeaderRow ? 'bg-slate-900/90 font-bold text-white' : ''
                  }`}
                >
                  {/* Row Number */}
                  <td className="px-3 py-2 text-center font-mono text-[10px] text-slate-500 bg-slate-950/70 border-r border-slate-800 shrink-0 select-none">
                    {rowNumber === 0 ? '1' : rowNumber + 1}
                  </td>

                  {/* Cell Values */}
                  {Array.from({ length: maxCols }).map((_, cIdx) => {
                    const cellValue = row[cIdx];
                    const displayValue = cellValue !== undefined && cellValue !== null ? String(cellValue) : '';

                    return (
                      <td
                        key={cIdx}
                        className={`px-4 py-2.5 border-r border-slate-800/50 whitespace-nowrap truncate min-w-[120px] max-w-[280px] ${
                          isHeaderRow
                            ? 'text-emerald-300 font-bold'
                            : 'text-slate-300'
                        }`}
                        title={displayValue}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info & Pagination */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>{totalRows} rows</span>
            <span>•</span>
            <span>{maxCols} columns</span>
          </span>
          {searchQuery && (
            <span className="text-emerald-400 text-[11px]">
              (Filtered by &quot;{searchQuery}&quot;)
            </span>
          )}
        </div>

        {/* Pagination buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

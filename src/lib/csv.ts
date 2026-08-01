import type { Trade } from "../types/Trade";

const HEADERS = [
  "id",
  "date",
  "pair",
  "session",
  "direction",
  "zoneType",
  "entry",
  "stopLoss",
  "target",
  "result",
  "rr",
  "isValidRuleTrade",
  "notes",
  "tags",
] as const;

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function tradesToCsv(trades: Trade[]): string {
  const rows = trades.map((t) =>
    HEADERS.map((h) => {
      const value = t[h as keyof Trade];
      if (value === undefined) return "";
      if (h === "tags") {
        return escapeCell((value as string[]).join("|"));
      }
      if (typeof value === "boolean") return value ? "true" : "false";
      return escapeCell(String(value));
    }).join(","),
  );
  return [HEADERS.join(","), ...rows].join("\n");
}

function parseRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseCsv(content: string): Trade[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const header = parseRow(lines[0]);
  const index = (name: string): number => header.indexOf(name);

  const trades: Trade[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseRow(line);
    const cell = (name: string): string => {
      const i = index(name);
      return i >= 0 ? (cells[i] ?? "") : "";
    };

    const session = cell("session") as Trade["session"];
    const direction = cell("direction") as Trade["direction"];
    const zoneType = cell("zoneType") as Trade["zoneType"];
    const result = cell("result") as Trade["result"];
    const pair = cell("pair").toUpperCase();
    if (!pair) continue;

    const tags = cell("tags")
      .split("|")
      .map((t) => t.trim())
      .filter(Boolean);

    trades.push({
      id: cell("id") || crypto.randomUUID(),
      date: cell("date") || new Date().toISOString().slice(0, 10),
      pair,
      session: ["London", "NewYork", "Overlap", "Other"].includes(session)
        ? session
        : "Other",
      direction: direction === "Sell" ? "Sell" : "Buy",
      zoneType: zoneType === "Supply" ? "Supply" : "Demand",
      entry: toNumber(cell("entry")),
      stopLoss: toNumber(cell("stopLoss")),
      target: toNumber(cell("target")),
      result: ["Win", "Loss", "BreakEven", "Open"].includes(result)
        ? result
        : "Open",
      rr: toNumber(cell("rr")),
      notes: cell("notes") || undefined,
      tags: tags.length > 0 ? tags : undefined,
      isValidRuleTrade: cell("isValidRuleTrade") === "true",
    });
  }
  return trades;
}

export function parseImportFile(content: string, filename: string): Trade[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsv(content);
  }
  const data = JSON.parse(content) as unknown;
  if (Array.isArray(data)) {
    return data as Trade[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { trades: Trade[] }).trades)) {
    return (data as { trades: Trade[] }).trades;
  }
  throw new Error("Unsupported JSON format.");
}

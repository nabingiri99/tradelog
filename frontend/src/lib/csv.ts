import type { Trade } from "../types/Trade";

const HEADERS = [
  "id",
  "date",
  "entryTime",
  "pair",
  "session",
  "direction",
  "entry",
  "stopLoss",
  "target",
  "result",
  "rr",
  "positionSize",
  "riskAmount",
  "pnlAmount",
  "isValidRuleTrade",
  "notes",
  "tags",
  "emotion",
  "reason",
  "screenshot",
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

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(line: string): string {
  const counts: Array<[string, number]> = [
    [";", (line.match(/;/g) ?? []).length],
    [",", (line.match(/,/g) ?? []).length],
    ["\t", (line.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

function parseMt4Date(raw: string): { date: string; entryTime?: string } {
  const cleaned = raw.replace(/["']/g, "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/.exec(cleaned);
  if (iso) {
    return {
      date: `${iso[1]}-${iso[2]}-${iso[3]}`,
      entryTime: iso[4]
        ? `${String(Number(iso[4])).padStart(2, "0")}:${iso[5]}`
        : undefined,
    };
  }
  const dotY = /^(\d{4})\.(\d{2})\.(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/.exec(cleaned);
  if (dotY) {
    return {
      date: `${dotY[1]}-${dotY[2]}-${dotY[3]}`,
      entryTime: dotY[4]
        ? `${String(Number(dotY[4])).padStart(2, "0")}:${dotY[5]}`
        : undefined,
    };
  }
  const dotD = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(cleaned);
  if (dotD) {
    return {
      date: `${dotD[3]}-${dotD[2]}-${dotD[1]}`,
      entryTime: dotD[4]
        ? `${String(Number(dotD[4])).padStart(2, "0")}:${dotD[5]}`
        : undefined,
    };
  }
  return { date: new Date().toISOString().slice(0, 10) };
}

export function parseMt4Csv(content: string): Trade[] {
  const allLines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (allLines.length < 2) return [];

  // MT4 exports often put column headers in a "#" comment line.
  const commentHeader = allLines
    .filter((l) => l.startsWith("#"))
    .map((l) => l.replace(/^#+/, "").trim())
    .find((l) => /(type|time|pair|symbol|profit|order)/i.test(l));

  const dataLines = allLines.filter((l) => !l.startsWith("#"));
  if (dataLines.length === 0) return [];

  const headerSource = commentHeader ?? dataLines[0];
  const delimiter = detectDelimiter(headerSource);
  const split = (line: string): string[] =>
    line.split(delimiter).map((c) => c.replace(/^"|"$/g, "").trim());

  let usedLine = 0;
  let header: string[];
  if (commentHeader) {
    header = split(commentHeader).map(normalizeHeader);
  } else {
    header = split(dataLines[0]).map(normalizeHeader);
    usedLine = 1;
  }

  const idx = (names: string[]): number => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const typeCol = idx(["type", "kind", "positiontype", "order"]);
  const timeCol = idx(["time", "opentime", "date", "datetime", "opened", "executiontime"]);
  const pairCol = idx(["pair", "symbol", "instrument", "currencypair", "item", "currency"]);
  const priceCol = idx(["price", "entry", "entryprice", "openprice", "open", "openingprice"]);
  const slCol = idx(["sl", "stoploss", "stop", "stoplossprice"]);
  const tpCol = idx(["tp", "takeprofit", "target", "takeprofitprice"]);
  const profitCol = idx(["profit", "pnl", "pl", "netprofit", "realizedpl", "grossprofit"]);
  const volumeCol = idx(["volume", "vol", "lots", "size"]);

  if (pairCol < 0) return [];
  if (timeCol < 0 && typeCol < 0 && profitCol < 0) return [];

  const trades: Trade[] = [];
  for (const line of dataLines.slice(usedLine)) {
    const cells = split(line);
    const cell = (i: number): string => (i >= 0 ? (cells[i] ?? "") : "");
    const pairRaw = cell(pairCol);
    if (!pairRaw) continue;

    const typeRaw = cell(typeCol).toLowerCase();
    if (["balance", "deposit", "withdrawal", "credit", "bonus", "taxes"].includes(typeRaw)) {
      continue;
    }

    const entry = toNumber(cell(priceCol));
    const stopLoss = toNumber(cell(slCol));
    const target = toNumber(cell(tpCol));

    let rr = 1;
    if (entry !== stopLoss && entry !== 0 && stopLoss !== 0) {
      const risk = Math.abs(entry - stopLoss);
      const reward = target !== 0 ? Math.abs(target - entry) : 0;
      if (risk > 0 && reward > 0) {
        rr = Math.round((reward / risk) * 100) / 100;
      }
    }

    const profit = toNumber(cell(profitCol));
    const hasProfit = profitCol >= 0 && cell(profitCol) !== "";
    const result: Trade["result"] = !hasProfit
      ? "Open"
      : profit > 0
        ? "Win"
        : profit < 0
          ? "Loss"
          : "BreakEven";

    const direction: Trade["direction"] =
      typeRaw.includes("sell") || typeRaw.includes("short")
        ? "Sell"
        : typeRaw.includes("buy") || typeRaw.includes("long")
          ? "Buy"
          : profit < 0
            ? guessDirection("", "", String(entry))
            : "Buy";

    const { date, entryTime } = parseMt4Date(cell(timeCol));

    trades.push({
      id: crypto.randomUUID(),
      date,
      entryTime,
      pair: pairRaw.toUpperCase(),
      session: "Other",
      direction,
      entry,
      stopLoss,
      target,
      result,
      rr,
      positionSize: volumeCol >= 0 && cell(volumeCol) !== "" ? toNumber(cell(volumeCol)) : undefined,
      pnlAmount: hasProfit ? profit : undefined,
      isValidRuleTrade: false,
    });
  }
  return trades;
}

function splitLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function readRows(
  content: string,
  normalize = false,
): Array<{ cells: string[]; index: (name: string) => number; cell: (name: string) => string }> {
  const lines = splitLines(content);
  if (lines.length < 2) return [];
  const header = normalize
    ? parseRow(lines[0]).map(normalizeHeader)
    : parseRow(lines[0]);
  const idx = (name: string): number => header.indexOf(name);
  const rows = lines.slice(1).map((line) => {
    const cells = parseRow(line);
    return {
      cells,
      index: idx,
      cell: (name: string): string => {
        const i = idx(name);
        return i >= 0 ? (cells[i] ?? "") : "";
      },
    };
  });
  return rows;
}

export function parseCsv(content: string): Trade[] {
  const rows = readRows(content);

  const trades: Trade[] = [];
  for (const row of rows) {
    const pair = row.cell("pair").toUpperCase();
    if (!pair) continue;

    const session = row.cell("session") as Trade["session"];
    const direction = row.cell("direction") as Trade["direction"];
    const result = row.cell("result") as Trade["result"];
    const tags = row
      .cell("tags")
      .split("|")
      .map((t) => t.trim())
      .filter(Boolean);

    trades.push({
      id: row.cell("id") || crypto.randomUUID(),
      date: row.cell("date") || new Date().toISOString().slice(0, 10),
      entryTime: row.cell("entryTime") || undefined,
      pair,
      session: ["London", "NewYork", "Overlap", "Other"].includes(session)
        ? session
        : "Other",
      direction: direction === "Sell" ? "Sell" : "Buy",
      entry: toNumber(row.cell("entry")),
      stopLoss: toNumber(row.cell("stopLoss")),
      target: toNumber(row.cell("target")),
      result: ["Win", "Loss", "BreakEven", "Open"].includes(result)
        ? result
        : "Open",
      rr: toNumber(row.cell("rr")),
      positionSize: row.cell("positionSize") !== "" ? toNumber(row.cell("positionSize")) : undefined,
      riskAmount: row.cell("riskAmount") !== "" ? toNumber(row.cell("riskAmount")) : undefined,
      pnlAmount: row.cell("pnlAmount") !== "" ? toNumber(row.cell("pnlAmount")) : undefined,
      notes: row.cell("notes") || undefined,
      tags: tags.length > 0 ? tags : undefined,
      emotion: row.cell("emotion") || undefined,
      reason: row.cell("reason") || undefined,
      screenshot: row.cell("screenshot") || undefined,
      isValidRuleTrade: row.cell("isValidRuleTrade") === "true",
    });
  }
  return trades;
}

const DATE_COLS = ["date", "time", "datetime", "opentime", "opendate", "opened", "timestamp", "executiontime"];
const PAIR_COLS = ["pair", "symbol", "instrument", "currencypair", "currency", "asset"];
const TYPE_COLS = ["type", "direction", "side", "action", "positiontype", "order"];
const ENTRY_COLS = ["entry", "entryprice", "openprice", "open", "price", "openingprice"];
const SL_COLS = ["stoploss", "sl", "stop", "stoplossprice"];
const TP_COLS = ["takeprofit", "tp", "target", "takeprofitprice"];
const PROFIT_COLS = ["profit", "pnl", "pl", "netprofit", "grossprofit", "realizedpl"];

function firstMatch(header: string[], cols: string[]): string | null {
  const set = new Set(cols);
  for (const h of header) {
    if (set.has(h)) return h;
  }
  return null;
}

function guessDirection(type: string, direction: string, entry: string): Trade["direction"] {
  const text = `${type} ${direction}`.toLowerCase();
  if (text.includes("sell") || text.includes("short") || text.includes("close")) {
    return "Sell";
  }
  if (text.includes("buy") || text.includes("long") || text.includes("open")) {
    return "Buy";
  }
  if (entry.startsWith("-")) return "Sell";
  return "Buy";
}

export function parseBrokerCsv(content: string): Trade[] {
  const lines = splitLines(content);
  if (lines.length < 2) return [];
  const header = parseRow(lines[0]).map(normalizeHeader);

  const dateCol = firstMatch(header, DATE_COLS);
  const pairCol = firstMatch(header, PAIR_COLS);
  const typeCol = firstMatch(header, TYPE_COLS);
  const entryCol = firstMatch(header, ENTRY_COLS);
  const slCol = firstMatch(header, SL_COLS);
  const tpCol = firstMatch(header, TP_COLS);
  const profitCol = firstMatch(header, PROFIT_COLS);

  if (!dateCol && !pairCol && !entryCol) {
    return [];
  }

  const rows = readRows(content, true);
  const trades: Trade[] = [];

  for (const row of rows) {
    const pairRaw = pairCol ? row.cell(pairCol) : "";
    if (!pairRaw) continue;

    const entry = toNumber(entryCol ? row.cell(entryCol) : "");
    const stopLoss = toNumber(slCol ? row.cell(slCol) : "");
    const target = toNumber(tpCol ? row.cell(tpCol) : "");

    let rr = 1;
    if (entry !== stopLoss && entry !== 0 && stopLoss !== 0) {
      const risk = Math.abs(entry - stopLoss);
      const reward = target !== 0 ? Math.abs(target - entry) : 0;
      if (risk > 0 && reward > 0) {
        rr = Math.round((reward / risk) * 100) / 100;
      }
    }

    const profit = toNumber(profitCol ? row.cell(profitCol) : "");
    const hasProfit = profitCol !== null && row.cell(profitCol) !== "";
    const result: Trade["result"] = !hasProfit
      ? "Open"
      : profit > 0
        ? "Win"
        : profit < 0
          ? "Loss"
          : "BreakEven";

    const dateRaw = dateCol ? row.cell(dateCol) : "";
    const date =
      dateRaw.length >= 10 ? dateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const timeMatch = /(\d{1,2}):(\d{2})/.exec(dateRaw);
    const entryTime = timeMatch
      ? `${String(Number(timeMatch[1])).padStart(2, "0")}:${timeMatch[2]}`
      : undefined;

    trades.push({
      id: crypto.randomUUID(),
      date,
      entryTime,
      pair: pairRaw.toUpperCase(),
      session: "Other",
      direction: guessDirection(typeCol ? row.cell(typeCol) : "", "", String(entry)),
      entry,
      stopLoss,
      target,
      result,
      rr,
      isValidRuleTrade: false,
    });
  }
  return trades;
}

export function parseImportFile(content: string, filename: string): Trade[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) {
    const data = JSON.parse(content) as unknown;
    if (Array.isArray(data)) {
      return data as Trade[];
    }
    if (data && typeof data === "object" && Array.isArray((data as { trades: Trade[] }).trades)) {
      return (data as { trades: Trade[] }).trades;
    }
    throw new Error("Unsupported JSON format.");
  }

  if (lower.endsWith(".csv")) {
    const lines = splitLines(content);
    if (lines.length === 0) throw new Error("Empty file.");
    const header = parseRow(lines[0]).map(normalizeHeader);
    const isTradeLog = header.includes("id") && header.includes("result") && header.includes("rr");
    if (isTradeLog) {
      return parseCsv(content);
    }

    const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const hasCommentHeader = rawLines.some((l) => l.trim().startsWith("#"));
    const firstData = rawLines.find((l) => !l.trim().startsWith("#")) ?? "";
    const delimiter = detectDelimiter(firstData);
    const usesMt4Delimiter = delimiter === ";" || delimiter === "\t";
    const hasMt4Date = /^(\d{4}|\d{1,2})\.\d{1,2}\.\d{4}/.test(firstData.trim());

    if (hasCommentHeader || usesMt4Delimiter || hasMt4Date) {
      const mt4 = parseMt4Csv(content);
      if (mt4.length > 0) return mt4;
    }

    const broker = parseBrokerCsv(content);
    if (broker.length > 0) return broker;

    const mt4Fallback = parseMt4Csv(content);
    if (mt4Fallback.length > 0) return mt4Fallback;

    throw new Error(
      "Could not recognize the CSV format. Use a TradeLog export, an MT4/MT5 history export, or a broker export with date/symbol/entry columns.",
    );
  }

  throw new Error("Unsupported file type. Use .json or .csv.");
}

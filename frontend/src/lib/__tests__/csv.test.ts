import { describe, it, expect } from "vitest";
import {
  parseCsv,
  parseMt4Csv,
  parseBrokerCsv,
  parseImportFile,
  tradesToCsv,
} from "../csv";

const TRADELOG_HEADER =
  "id,date,entryTime,pair,session,direction,entry,stopLoss,target,result,rr,positionSize,riskAmount,pnlAmount,isValidRuleTrade,notes,tags,emotion,reason,screenshot";

describe("tradesToCsv / parseCsv round-trip", () => {
  it("exports and re-imports trades", () => {
    const trades = [
      {
        id: "abc",
        date: "2026-08-01",
        entryTime: "09:30",
        pair: "EURUSD",
        session: "London" as const,
        direction: "Buy" as const,
        entry: 1.1,
        stopLoss: 1.09,
        target: 1.13,
        result: "Win" as const,
        rr: 3,
        isValidRuleTrade: true,
        notes: 'He said "hello", then it worked',
        tags: ["breakout", "news"],
      },
    ];
    const csv = tradesToCsv(trades);
    const parsed = parseCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].pair).toBe("EURUSD");
    expect(parsed[0].result).toBe("Win");
    expect(parsed[0].tags).toEqual(["breakout", "news"]);
    expect(parsed[0].notes).toBe('He said "hello", then it worked');
    expect(parsed[0].isValidRuleTrade).toBe(true);
  });
});

describe("parseMt4Csv", () => {
  const MT4_CSV = `# Type,Time,Order,Position,Pair,Volume,Price,SL,TP,Profit
# balance,2004.08.10 01:08:58,000001,0,USDJPY,0.00,0.00,0.00,0.00,0.00
buy,2026.08.01 09:30:00,1001,1,EURUSD,1.00,1.10000,1.09000,1.13000,300.00
sell,2026.08.02 10:00:00,1002,1,GBPUSD,0.50,1.30000,1.31000,1.28000,-150.00
balance,2026.08.03 00:00:00,1003,0,EURUSD,0.00,0.00,0.00,0.00,1000.00`;

  it("parses buy/sell trades and skips balance rows", () => {
    const trades = parseMt4Csv(MT4_CSV);
    expect(trades).toHaveLength(2);
    expect(trades[0].pair).toBe("EURUSD");
    expect(trades[0].direction).toBe("Buy");
    expect(trades[0].date).toBe("2026-08-01");
    expect(trades[0].entryTime).toBe("09:30");
    expect(trades[0].rr).toBe(3);
    expect(trades[0].result).toBe("Win");
    expect(trades[1].pair).toBe("GBPUSD");
    expect(trades[1].direction).toBe("Sell");
    expect(trades[1].result).toBe("Loss");
    expect(trades[1].pnlAmount).toBe(-150);
  });

  it("parses tab-delimited exports", () => {
    const tab = [
      "type\ttime\tpair\tprice\tsl\ttp\tprofit",
      "buy\t2026.08.01 09:30:00\tEURUSD\t1.10000\t1.09000\t1.13000\t300.00",
      "sell\t2026.08.01 10:00:00\tGBPUSD\t1.30000\t1.31000\t1.28000\t-150.00",
    ].join("\n");
    const trades = parseMt4Csv(tab);
    expect(trades).toHaveLength(2);
    expect(trades[0].direction).toBe("Buy");
    expect(trades[0].rr).toBe(3);
  });

  it("parses day-first dot dates", () => {
    const csv = [
      "# Type,Time,Pair,Price,SL,TP,Profit",
      "buy,01.08.2026 14:15:00,EURUSD,1.10000,1.09000,1.13000,300.00",
    ].join("\n");
    const trades = parseMt4Csv(csv);
    expect(trades).toHaveLength(1);
    expect(trades[0].date).toBe("2026-08-01");
    expect(trades[0].entryTime).toBe("14:15");
  });
});

describe("parseBrokerCsv", () => {
  it("maps generic broker columns", () => {
    const csv = [
      "Date,Symbol,Action,Open Price,SL,TP,Profit",
      "2026-08-01 09:30:00,AAPL,Buy,200.00,195.00,215.00,15.50",
      "2026-08-02 10:00:00,MSFT,Sell,300.00,310.00,280.00,-20.00",
    ].join("\n");
    const trades = parseBrokerCsv(csv);
    expect(trades).toHaveLength(2);
    expect(trades[0].pair).toBe("AAPL");
    expect(trades[0].direction).toBe("Buy");
    expect(trades[0].result).toBe("Win");
    expect(trades[1].pair).toBe("MSFT");
    expect(trades[1].direction).toBe("Sell");
    expect(trades[1].result).toBe("Loss");
  });
});

describe("parseImportFile detection chain", () => {
  it("parses TradeLog JSON export", () => {
    const trades = parseImportFile(
      JSON.stringify([{ id: "1", pair: "EURUSD" }]),
      "export.json",
    );
    expect(trades).toHaveLength(1);
  });

  it("parses TradeLog CSV export directly", () => {
    const csv = `${TRADELOG_HEADER}\n1,2026-08-01,09:30,EURUSD,London,Buy,1.1,1.09,1.13,Win,3,1,100,300,true,,,calm,,`;
    const trades = parseImportFile(csv, "trades.csv");
    expect(trades).toHaveLength(1);
    expect(trades[0].pair).toBe("EURUSD");
  });

  it("detects MT4 CSV via comment header", () => {
    const mt4 = `# Type,Time,Order,Position,Pair,Volume,Price,SL,TP,Profit
buy,2026.08.01 09:30:00,1001,1,EURUSD,1.00,1.10000,1.09000,1.13000,300.00`;
    const trades = parseImportFile(mt4, "mt4.csv");
    expect(trades).toHaveLength(1);
    expect(trades[0].rr).toBe(3);
  });

  it("throws on unsupported formats", () => {
    expect(() => parseImportFile("totally not a trade file", "weird.csv")).toThrow();
  });
});

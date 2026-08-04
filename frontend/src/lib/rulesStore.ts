export interface TradeRule {
  id: string;
  label: string;
  category: string;
  description?: string;
}

export const DEFAULT_RULES: TradeRule[] = [
  {
    id: "session",
    category: "Market Context",
    label: "Trading session is active",
    description: "Trade only during high-liquidity sessions (London / New York).",
  },
  {
    id: "bias",
    category: "Market Context",
    label: "4H bias is clear and aligned",
    description: "Higher timeframe direction supports the planned trade.",
  },
  {
    id: "structure",
    category: "Market Context",
    label: "1H market structure confirmed",
    description: "Key levels, swing points and structure align with the setup.",
  },
  {
    id: "poi",
    category: "Setup Validation",
    label: "Price is at the designated POI",
    description: "Order Block or Fair Value Gap has been reached.",
  },
  {
    id: "liquidity",
    category: "Setup Validation",
    label: "Liquidity sweep completed",
    description: "Stops above / below recent swings have been swept.",
  },
  {
    id: "mss",
    category: "Setup Validation",
    label: "MSS confirmed on 15M / 5M",
    description: "Market Structure Shift confirmed on the entry timeframe.",
  },
  {
    id: "risk",
    category: "Risk Management",
    label: "Risk is within 1% of account",
    description: "Position size keeps risk at or below the maximum.",
  },
  {
    id: "rr",
    category: "Risk Management",
    label: "Minimum 1:2 R:R target met",
    description: "Reward justifies the risk taken on the trade.",
  },
  {
    id: "news",
    category: "Execution",
    label: "High-impact news avoided",
    description: "No major news release within 30 minutes of entry.",
  },
];

export function loadRules(key: string): TradeRule[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_RULES.map((r) => ({ ...r }));
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_RULES.map((r) => ({ ...r }));
    }
    return parsed as TradeRule[];
  } catch {
    return DEFAULT_RULES.map((r) => ({ ...r }));
  }
}

export function saveRules(key: string, rules: TradeRule[]): void {
  localStorage.setItem(key, JSON.stringify(rules));
}

export function isDefaultSet(rules: TradeRule[]): boolean {
  return JSON.stringify(rules) === JSON.stringify(DEFAULT_RULES);
}

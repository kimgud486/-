export interface PresetStock {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC" | "UPBIT";
  price: number;
  regularClosePrice?: number;
  afterHoursPrice?: number;
  overPrice?: number;
  marketSession?: string;
  priceNote?: string;
  change: number;
  changePct: number;
  marketCap: string;
  per: number;
  pbr: number;
  roe: number;
  debtRatio: number;
  revenueGrowth: number;
  operatingMargin: number;
  news: { title: string; source: string; time: string; sentiment: 'positive' | 'neutral' | 'negative' }[];
  technical: {
    rsi: number;
    macd: string;
    bollinger: 'upper' | 'middle' | 'lower';
    trend: 'up' | 'down' | 'sideways';
  };
}

/** DEMO/TEST ONLY. Never export these into production paths unless explicitly enabled. */
const RAW_DEMO_FIXTURES: PresetStock[] = [
  {
    symbol: "005930", name: "삼성전자", market: "KOREA", price: 255000,
    regularClosePrice: 255000, afterHoursPrice: 255000, overPrice: 255000,
    marketSession: "DEMO", priceNote: "DEMO FIXTURE",
    change: 1500, changePct: 0.59, marketCap: "DEMO", per: 14.8, pbr: 1.25,
    roe: 8.5, debtRatio: 24.3, revenueGrowth: 11.2, operatingMargin: 12.1,
    news: [], technical: { rsi: 58, macd: "Bullish Cross", bollinger: "middle", trend: "up" }
  },
  {
    symbol: "000660", name: "SK하이닉스", market: "KOREA", price: 1647000,
    change: -3000, changePct: -0.18, marketCap: "DEMO", per: 11.2, pbr: 1.85,
    roe: 14.2, debtRatio: 45.1, revenueGrowth: 22.4, operatingMargin: 18.5,
    news: [], technical: { rsi: 62, macd: "Bullish Cross", bollinger: "upper", trend: "up" }
  },
  {
    symbol: "NVDA", name: "NVIDIA", market: "US", price: 128.5,
    change: 3.2, changePct: 2.55, marketCap: "DEMO", per: 48.2, pbr: 32.1,
    roe: 55.4, debtRatio: 18.2, revenueGrowth: 122.5, operatingMargin: 62.1,
    news: [], technical: { rsi: 66, macd: "Bullish Cross", bollinger: "upper", trend: "up" }
  }
];

const demoEnabled = typeof process !== "undefined" && process.env?.ALLOW_DEMO_FIXTURES === "true";

/**
 * Empty by default. Production can never silently fall back to these fixtures.
 * Tests/demo environments must opt in with ALLOW_DEMO_FIXTURES=true.
 */
export const DEMO_FIXTURE_STOCKS: PresetStock[] = demoEnabled ? RAW_DEMO_FIXTURES : [];

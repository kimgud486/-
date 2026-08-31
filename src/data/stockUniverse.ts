import { KRX_AND_GLOBAL_MASTER_UNIVERSE } from "./krxMasterUniverse";
import { 
  matchesChosungOrKeyword, 
  COMPREHENSIVE_STOCK_INDEX, 
  OVERSEAS_STOCK_MAP, 
  DOMESTIC_STOCK_MAP, 
  CRYPTO_MAP,
  resolveStockName
} from "../lib/stockDictionary";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";

export interface StockItem {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US";
  category: "LARGE" | "MID" | "SMALL" | "CRYPTO";
  categoryLabel: string;
  price: number;
  changeRate: number;
  changeAmount: number;
  tradeValue: string; // e.g. "9,812억"
  volume: string; // e.g. "1,334만"
  rvol: number; // e.g. 1.65
  score: number; // e.g. 92
  grade: "S+" | "S" | "A+" | "A" | "B" | "C";
  theme: string;
  signal: "LONG" | "WATCH" | "AVOID" | "EXIT_RISK";
  strategy: string;
  marketCap: string;
  isCustom?: boolean;
}

export const INITIAL_STOCK_UNIVERSE: StockItem[] = [
  // 1. 국내 대형주 / 우량주 (KOREA - LARGE)
  {
    symbol: "005930",
    name: "삼성전자",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 73800,
    changeRate: 2.79,
    changeAmount: 2000,
    tradeValue: "9,812억",
    volume: "1,334만",
    rvol: 1.65,
    score: 87,
    grade: "A+",
    theme: "반도체 / AI 하드웨어",
    signal: "LONG",
    strategy: "VWAP Reclaim + SMC Order Block",
    marketCap: "440조"
  },
  {
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 233500,
    changeRate: 3.76,
    changeAmount: 8500,
    tradeValue: "8,420억",
    volume: "360만",
    rvol: 2.34,
    score: 89,
    grade: "S",
    theme: "HBM3E / AI 반도체",
    signal: "LONG",
    strategy: "52주 신고가 추세 추종",
    marketCap: "170조"
  },
  {
    symbol: "005380",
    name: "현대차",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 254000,
    changeRate: 1.80,
    changeAmount: 4500,
    tradeValue: "3,120억",
    volume: "123만",
    rvol: 1.45,
    score: 85,
    grade: "A",
    theme: "완성차 / 로보틱스 / 수소",
    signal: "WATCH",
    strategy: "밸류업 저PBR 수급 반등",
    marketCap: "53조"
  },
  {
    symbol: "000270",
    name: "기아",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 112500,
    changeRate: 2.15,
    changeAmount: 2300,
    tradeValue: "2,410억",
    volume: "210만",
    rvol: 1.55,
    score: 84,
    grade: "A",
    theme: "완성차 / EV / 주주환원",
    signal: "WATCH",
    strategy: "고배당 실적 성장 추세",
    marketCap: "45조"
  },
  {
    symbol: "005490",
    name: "POSCO홀딩스",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 315000,
    changeRate: 3.11,
    changeAmount: 9500,
    tradeValue: "2,840억",
    volume: "90만",
    rvol: 1.82,
    score: 83,
    grade: "A",
    theme: "2차전지 소재 / 철강",
    signal: "LONG",
    strategy: "바닥 지지선 2차 반등",
    marketCap: "26조"
  },
  {
    symbol: "105560",
    name: "KB금융",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 88500,
    changeRate: 1.95,
    changeAmount: 1700,
    tradeValue: "1,850억",
    volume: "210만",
    rvol: 1.62,
    score: 88,
    grade: "A+",
    theme: "금융 / 밸류업 / 주주환원",
    signal: "LONG",
    strategy: "주주환원 확대 수급 유입",
    marketCap: "35조"
  },
  {
    symbol: "035420",
    name: "NAVER",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 182400,
    changeRate: 3.45,
    changeAmount: 6100,
    tradeValue: "2,150억",
    volume: "118만",
    rvol: 1.88,
    score: 82,
    grade: "A",
    theme: "생성형 AI / 검색 / 이커머스",
    signal: "LONG",
    strategy: "IT 플랫폼 기관 수급 재유입",
    marketCap: "29.8조"
  },
  {
    symbol: "035720",
    name: "카카오",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 41200,
    changeRate: 2.85,
    changeAmount: 1140,
    tradeValue: "1,650억",
    volume: "402만",
    rvol: 1.62,
    score: 78,
    grade: "B",
    theme: "카카오톡 / AI 서비스 / 모빌리티",
    signal: "WATCH",
    strategy: "바닥 다지기 분할 매수",
    marketCap: "18.3조"
  },
  {
    symbol: "068270",
    name: "셀트리온",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 198500,
    changeRate: 4.12,
    changeAmount: 7800,
    tradeValue: "3,410억",
    volume: "172만",
    rvol: 2.15,
    score: 86,
    grade: "A+",
    theme: "바이오시밀러 / 짐펜트라 미국 출시",
    signal: "LONG",
    strategy: "미국 실적 모멘텀 돌파",
    marketCap: "43.2조"
  },
  {
    symbol: "373220",
    name: "LG에너지솔루션",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 392000,
    changeRate: 3.29,
    changeAmount: 12500,
    tradeValue: "2,890억",
    volume: "74만",
    rvol: 1.70,
    score: 81,
    grade: "A",
    theme: "배터리 셀 / ESS / 미국 IRA",
    signal: "WATCH",
    strategy: "2차전지 반등 세력 매집",
    marketCap: "91.7조"
  },

  // 2. 국내 중형주 / 스윙 주도주 (KOREA - MID)
  {
    symbol: "012450",
    name: "한화에어로스페이스",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 301000,
    changeRate: 7.21,
    changeAmount: 20200,
    tradeValue: "6,950억",
    volume: "231만",
    rvol: 3.85,
    score: 92,
    grade: "S+",
    theme: "K-방산 / 우주항공 / 수출모멘텀",
    signal: "LONG",
    strategy: "Bull Flag 돌파 가속",
    marketCap: "15조"
  },
  {
    symbol: "034020",
    name: "두산에너빌리티",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 32450,
    changeRate: 8.95,
    changeAmount: 2670,
    tradeValue: "5,410억",
    volume: "1,670만",
    rvol: 4.12,
    score: 86,
    grade: "S",
    theme: "원전 / SMR / 가스터빈",
    signal: "LONG",
    strategy: "거래대금 폭발 전고점 돌파",
    marketCap: "20조"
  },
  {
    symbol: "064350",
    name: "현대로템",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 89600,
    changeRate: 6.28,
    changeAmount: 5300,
    tradeValue: "3,890억",
    volume: "434만",
    rvol: 3.20,
    score: 84,
    grade: "A+",
    theme: "방산(K2전차) / 철도 모빌리티",
    signal: "LONG",
    strategy: "외인 기관 쌍끌이 추세",
    marketCap: "9.8조"
  },
  {
    symbol: "010120",
    name: "LS ELECTRIC",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 149800,
    changeRate: 5.41,
    changeAmount: 7700,
    tradeValue: "3,210억",
    volume: "214만",
    rvol: 2.80,
    score: 82,
    grade: "A+",
    theme: "변압기 / AI 전력망 인프라",
    signal: "LONG",
    strategy: "거래량 가속 상승 랠리",
    marketCap: "4.5조"
  },
  {
    symbol: "267260",
    name: "HD현대일렉트릭",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 418000,
    changeRate: 4.22,
    changeAmount: 16900,
    tradeValue: "2,760억",
    volume: "66만",
    rvol: 2.15,
    score: 81,
    grade: "A",
    theme: "초고압 변압기 / 북미 수주",
    signal: "LONG",
    strategy: "20일선 지지 후 전고점 트라이",
    marketCap: "15조"
  },
  {
    symbol: "247540",
    name: "에코프로비엠",
    market: "KOSDAQ",
    category: "MID",
    categoryLabel: "중형주",
    price: 117500,
    changeRate: 4.46,
    changeAmount: 5020,
    tradeValue: "2,150억",
    volume: "183만",
    rvol: 1.95,
    score: 79,
    grade: "B",
    theme: "양극재 / 2차전지 반등",
    signal: "WATCH",
    strategy: "단기 과매도 기술적 반등",
    marketCap: "11.5조"
  },
  {
    symbol: "196170",
    name: "알테오젠",
    market: "KOSDAQ",
    category: "MID",
    categoryLabel: "중형주",
    price: 382500,
    changeRate: 3.66,
    changeAmount: 13500,
    tradeValue: "4,600억",
    volume: "120만",
    rvol: 2.45,
    score: 88,
    grade: "S",
    theme: "피하주사(SC) 플랫폼 / 키트루다",
    signal: "LONG",
    strategy: "코스닥 1위 대장주 모멘텀",
    marketCap: "20.3조"
  },
  {
    symbol: "079550",
    name: "LIG넥스원",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 215000,
    changeRate: 5.88,
    changeAmount: 11900,
    tradeValue: "2,310억",
    volume: "107만",
    rvol: 2.90,
    score: 88,
    grade: "S",
    theme: "유도무기 / 천궁-II / 방산",
    signal: "LONG",
    strategy: "수출 수주 모멘텀 3파동",
    marketCap: "4.7조"
  },
  {
    symbol: "042660",
    name: "한화오션",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 38900,
    changeRate: 4.85,
    changeAmount: 1800,
    tradeValue: "3,150억",
    volume: "810만",
    rvol: 2.65,
    score: 85,
    grade: "A+",
    theme: "조선 / 특수선 / 함정 MRO",
    signal: "LONG",
    strategy: "미국 함정 정비 수주 상승",
    marketCap: "11.9조"
  },
  {
    symbol: "003230",
    name: "삼양식품",
    market: "KOSPI",
    category: "MID",
    categoryLabel: "중형주",
    price: 612000,
    changeRate: 6.45,
    changeAmount: 37100,
    tradeValue: "2,890억",
    volume: "47만",
    rvol: 3.10,
    score: 91,
    grade: "S",
    theme: "불닭볶음면 / K-푸드 글로벌 수출",
    signal: "LONG",
    strategy: "해외 실적 신고가 가속",
    marketCap: "4.6조"
  },

  // 3. 국내 소형주 / 테마 주도 알파 (KOREA - SMALL)
  {
    symbol: "277810",
    name: "레인보우로보틱스",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    price: 168400,
    changeRate: 11.23,
    changeAmount: 17000,
    tradeValue: "2,980억",
    volume: "177만",
    rvol: 5.60,
    score: 95,
    grade: "S+",
    theme: "휴머노이드 / 삼성 피인수 / 협동로봇",
    signal: "LONG",
    strategy: "소형주 수급 폭발 세력 매집 돌파",
    marketCap: "3.2조"
  },
  {
    symbol: "454910",
    name: "두산로보틱스",
    market: "KOSPI",
    category: "SMALL",
    categoryLabel: "소형주",
    price: 84500,
    changeRate: 8.75,
    changeAmount: 6800,
    tradeValue: "2,120억",
    volume: "251만",
    rvol: 4.10,
    score: 92,
    grade: "S",
    theme: "협동로봇 / 스마트팩토리 / 로보틱스",
    signal: "LONG",
    strategy: "로봇 테마 주도 수급 연동",
    marketCap: "5.4조"
  },
  {
    symbol: "080220",
    name: "제주반도체",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    price: 24350,
    changeRate: 9.68,
    changeAmount: 2150,
    tradeValue: "2,450억",
    volume: "1,006만",
    rvol: 4.85,
    score: 93,
    grade: "S+",
    theme: "온디바이스 AI / 저전력 LPDDR",
    signal: "LONG",
    strategy: "온디바이스 AI 테마 1차 파동",
    marketCap: "8,400억"
  },
  {
    symbol: "000250",
    name: "삼천당제약",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    price: 142800,
    changeRate: 8.43,
    changeAmount: 11100,
    tradeValue: "1,870억",
    volume: "131만",
    rvol: 3.90,
    score: 91,
    grade: "S",
    theme: "경구용 GLP-1 비만치료제",
    signal: "LONG",
    strategy: "수급 쏠림형 급등 랠리",
    marketCap: "3.1조"
  },
  {
    symbol: "056080",
    name: "유진로봇",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    price: 11850,
    changeRate: 14.50,
    changeAmount: 1500,
    tradeValue: "1,620억",
    volume: "1,367만",
    rvol: 6.20,
    score: 96,
    grade: "S+",
    theme: "자율주행 솔루션 / 물류로봇",
    signal: "LONG",
    strategy: "상한가 인접 강력 세력 매수세",
    marketCap: "4,500억"
  },
  {
    symbol: "298380",
    name: "에이비엘바이오",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    price: 36200,
    changeRate: 7.42,
    changeAmount: 2500,
    tradeValue: "1,450억",
    volume: "400만",
    rvol: 3.40,
    score: 89,
    grade: "S",
    theme: "이중항체 플랫폼 / BBB 셔틀",
    signal: "LONG",
    strategy: "기술수출 모멘텀 박스권 상단 돌파",
    marketCap: "1.7조"
  },
  {
    symbol: "032820",
    name: "우리기술",
    market: "KOSDAQ",
    category: "SMALL",
    categoryLabel: "소형주",
    price: 2415,
    changeRate: 12.85,
    changeAmount: 275,
    tradeValue: "1,290억",
    volume: "5,340만",
    rvol: 5.10,
    score: 92,
    grade: "S+",
    theme: "체코 원전 수혜 / DCS 제어시스템",
    signal: "LONG",
    strategy: "동전주 탈출 테마 수급 폭발",
    marketCap: "3,800억"
  },

  // 4. 미국 빅테크 / 글로벌 주도주 (US STOCKS)
  {
    symbol: "NVDA",
    name: "엔비디아",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    price: 128.50,
    changeRate: 4.13,
    changeAmount: 5.10,
    tradeValue: "482억 달러",
    volume: "4,820만",
    rvol: 3.80,
    score: 98,
    grade: "S+",
    theme: "AI 가속기 / 블랙웰 GPU / AI반도체",
    signal: "LONG",
    strategy: "신고가 전고점 SMC 돌파",
    marketCap: "3.15조 달러"
  },
  {
    symbol: "TSLA",
    name: "테슬라",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    price: 218.40,
    changeRate: -2.10,
    changeAmount: -4.68,
    tradeValue: "284억 달러",
    volume: "6,240만",
    rvol: 2.10,
    score: 84,
    grade: "A",
    theme: "로보택시 / 옵티머스 로봇 / FSD",
    signal: "WATCH",
    strategy: "200달러 눌림목 2차 진입",
    marketCap: "6,950억 달러"
  },
  {
    symbol: "AAPL",
    name: "애플",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    price: 224.20,
    changeRate: 1.85,
    changeAmount: 4.07,
    tradeValue: "185억 달러",
    volume: "3,410만",
    rvol: 1.45,
    score: 88,
    grade: "A+",
    theme: "애플 인텔리전스 / 아이폰16 / AI스마트폰",
    signal: "LONG",
    strategy: "AI 온디바이스 수혜 상승 추세",
    marketCap: "3.42조 달러"
  },
  {
    symbol: "MSFT",
    name: "마이크로소프트",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    price: 442.80,
    changeRate: 2.35,
    changeAmount: 10.15,
    tradeValue: "162억 달러",
    volume: "1,980만",
    rvol: 1.60,
    score: 90,
    grade: "S",
    theme: "Copilot AI / Azure 클라우드 / OpenAI",
    signal: "LONG",
    strategy: "클라우드 성장 재가속",
    marketCap: "3.29조 달러"
  },
  {
    symbol: "AMZN",
    name: "아마존",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    price: 186.50,
    changeRate: 3.12,
    changeAmount: 5.64,
    tradeValue: "145억 달러",
    volume: "2,840만",
    rvol: 1.90,
    score: 89,
    grade: "S",
    theme: "AWS AI 클라우드 / 이커머스 / 로보틱스",
    signal: "LONG",
    strategy: "마진 개선 수급 유입",
    marketCap: "1.94조 달러"
  },
  {
    symbol: "GOOGL",
    name: "알파벳 (구글)",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국 빅테크",
    price: 178.10,
    changeRate: 1.92,
    changeAmount: 3.36,
    tradeValue: "128억 달러",
    volume: "2,150만",
    rvol: 1.50,
    score: 86,
    grade: "A+",
    theme: "Gemini AI / 유튜브 / 자율주행 웨이모",
    signal: "LONG",
    strategy: "Gemini 1.5 Pro 모멘텀",
    marketCap: "2.21조 달러"
  },
  {
    symbol: "PLTR",
    name: "팔란티어",
    market: "US",
    category: "MID",
    categoryLabel: "미국 주도주",
    price: 31.40,
    changeRate: 8.25,
    changeAmount: 2.39,
    tradeValue: "95억 달러",
    volume: "5,890만",
    rvol: 4.20,
    score: 96,
    grade: "S+",
    theme: "AIP AI 플랫폼 / 군사 안보 / S&P500 편입",
    signal: "LONG",
    strategy: "기업용 AI 수주 폭발 랠리",
    marketCap: "690억 달러"
  },
  {
    symbol: "MSTR",
    name: "마이크로스트래티지",
    market: "US",
    category: "MID",
    categoryLabel: "미국 주도주",
    price: 154.20,
    changeRate: 12.40,
    changeAmount: 17.00,
    tradeValue: "112억 달러",
    volume: "3,120만",
    rvol: 5.10,
    score: 97,
    grade: "S+",
    theme: "비트코인 보유량 1위 기업 / BTC 레버리지",
    signal: "LONG",
    strategy: "BTC 신고가 돌파 연동 급등",
    marketCap: "310억 달러"
  },

  // 5. 국내 바이오 및 첨단 테크 우량주 (KOREA - TECH & BIO)
  {
    symbol: "207940",
    name: "삼성바이오로직스",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 985000,
    changeRate: 2.18,
    changeAmount: 21000,
    tradeValue: "2,180억",
    volume: "22만",
    rvol: 1.75,
    score: 93,
    grade: "S+",
    theme: "바이오시밀러 / CDMO 글로벌 1위",
    signal: "LONG",
    strategy: "기관/외인 순매수 지속 우상향",
    marketCap: "70조"
  },
  {
    symbol: "323410",
    name: "카카오뱅크",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 24200,
    changeRate: 3.12,
    changeAmount: 730,
    tradeValue: "1,450억",
    volume: "590만",
    rvol: 2.10,
    score: 88,
    grade: "A+",
    theme: "인터넷전문은행 / 핀테크 플랫폼",
    signal: "LONG",
    strategy: "플랫폼 수수료 이익 턴어라운드",
    marketCap: "11.5조"
  },
  {
    symbol: "259960",
    name: "크래프톤",
    market: "KOSPI",
    category: "LARGE",
    categoryLabel: "대형주",
    price: 335000,
    changeRate: 4.36,
    changeAmount: 14000,
    tradeValue: "2,890억",
    volume: "86만",
    rvol: 2.65,
    score: 94,
    grade: "S+",
    theme: "K-게임 / 펍지 배틀그라운드 IP",
    signal: "LONG",
    strategy: "글로벌 모바일 매출 호조 신고가 돌파",
    marketCap: "16조"
  },
  {
    symbol: "AVGO",
    name: "브로드컴",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국대형주",
    price: 165.8,
    changeRate: 3.85,
    changeAmount: 6.15,
    tradeValue: "$8.4B",
    volume: "1,200만",
    rvol: 2.30,
    score: 95,
    grade: "S+",
    theme: "AI ASIC 칩 / 데이터센터 네트워킹",
    signal: "LONG",
    strategy: "커스텀 AI 칩 수주 확대 모멘텀",
    marketCap: "7,800억 달러"
  },
  {
    symbol: "MU",
    name: "마이크론 테크놀로지",
    market: "US",
    category: "LARGE",
    categoryLabel: "미국대형주",
    price: 112.4,
    changeRate: 4.92,
    changeAmount: 5.27,
    tradeValue: "$6.2B",
    volume: "2,400만",
    rvol: 2.85,
    score: 92,
    grade: "S",
    theme: "HBM3E / 고대역폭 메모리",
    signal: "LONG",
    strategy: "AI 메모리 슈퍼사이클 수혜",
    marketCap: "1,240억 달러"
  }
];

export function getCustomStocks(): StockItem[] {
  try {
    const raw = localStorage.getItem("aistock_custom_registered_stocks");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load custom stocks", e);
  }
  return [];
}

export function saveCustomStock(stock: StockItem): void {
  try {
    const existing = getCustomStocks();
    const updated = [stock, ...existing.filter((s) => s.symbol !== stock.symbol)];
    localStorage.setItem("aistock_custom_registered_stocks", JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save custom stock", e);
  }
}

export function getAllStocks(): StockItem[] {
  const custom = getCustomStocks();
  const map = new Map<string, StockItem>();
  
  // 1. Base preset universe
  INITIAL_STOCK_UNIVERSE.forEach((item) => {
    const liveQuote = realtimeMarketFeedService.getQuote(item.symbol);
    if (liveQuote) {
      map.set(item.symbol, {
        ...item,
        price: liveQuote.price,
        changeRate: liveQuote.changeRate,
        changeAmount: liveQuote.changeAmount,
        marketCap: liveQuote.tradeValue !== "실시간 연동" ? liveQuote.tradeValue : item.marketCap
      });
    } else {
      map.set(item.symbol, item);
    }
  });

  // 2. Comprehensive KRX & Global master universe
  KRX_AND_GLOBAL_MASTER_UNIVERSE.forEach((master) => {
    if (!map.has(master.symbol)) {
      const marketVal: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" = 
        master.market === "US" ? "US" : master.market === "UPBIT" ? "UPBIT" : (master.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI");
      const catLabel = master.capCategory === "LARGE" ? "대형주" : master.capCategory === "MID" ? "중형주" : master.capCategory === "CRYPTO" ? "가상자산" : "소형주";
      
      const liveQuote = realtimeMarketFeedService.getQuote(master.symbol);
      const dictMatch = COMPREHENSIVE_STOCK_INDEX.find((c) => c.symbol === master.symbol);

      const resolvedPrice = liveQuote?.price || dictMatch?.price || (marketVal === "UPBIT" ? 1500 : marketVal === "US" ? 150 : master.capCategory === "LARGE" ? 85000 : master.capCategory === "MID" ? 28000 : 8500);
      const resolvedRate = liveQuote ? liveQuote.changeRate : dictMatch ? dictMatch.changePct : 0.8;
      const resolvedAmount = liveQuote ? liveQuote.changeAmount : Math.round(resolvedPrice * (resolvedRate / 100));

      map.set(master.symbol, {
        symbol: master.symbol,
        name: master.name,
        market: marketVal,
        category: master.capCategory,
        categoryLabel: catLabel,
        price: resolvedPrice,
        changeRate: resolvedRate,
        changeAmount: resolvedAmount,
        tradeValue: liveQuote?.tradeValue || "실시간 연동",
        volume: liveQuote?.volume || "실시간",
        rvol: 1.8,
        score: master.capCategory === "LARGE" ? 88 : 82,
        grade: master.capCategory === "LARGE" ? "S" : "A",
        theme: master.sector || (master.themeTags ? master.themeTags.join(" / ") : "실시간 시세 연동"),
        signal: "LONG",
        strategy: "실시간 시장 수급 추세 추종",
        marketCap: liveQuote?.tradeValue || catLabel
      });
    }
  });

  // 3. Fallback Dictionary Stocks (Overseas, Domestic, Crypto)
  Object.entries(OVERSEAS_STOCK_MAP).forEach(([sym, name]) => {
    if (!map.has(sym)) {
      const live = realtimeMarketFeedService.getQuote(sym);
      map.set(sym, {
        symbol: sym,
        name,
        market: "US",
        category: "LARGE",
        categoryLabel: "미국주식",
        price: live?.price || 180,
        changeRate: live?.changeRate || 1.2,
        changeAmount: live?.changeAmount || 2,
        tradeValue: live?.tradeValue || "실시간",
        volume: live?.volume || "실시간",
        rvol: 2.1,
        score: 88,
        grade: "S",
        theme: "미국 주식 / 글로벌 우량주",
        signal: "LONG",
        strategy: "글로벌 모멘텀 추종",
        marketCap: "빅테크"
      });
    }
  });

  Object.entries(CRYPTO_MAP).forEach(([sym, name]) => {
    if (!map.has(sym) && !map.has(`KRW-${sym}`)) {
      const live = realtimeMarketFeedService.getQuote(sym) || realtimeMarketFeedService.getQuote(`KRW-${sym}`);
      map.set(sym, {
        symbol: sym,
        name,
        market: "UPBIT",
        category: "CRYPTO",
        categoryLabel: "가상자산",
        price: live?.price || 1500,
        changeRate: live?.changeRate || 2.5,
        changeAmount: live?.changeAmount || 35,
        tradeValue: live?.tradeValue || "실시간",
        volume: live?.volume || "실시간",
        rvol: 2.5,
        score: 85,
        grade: "A+",
        theme: "업비트 원화 가상자산",
        signal: "LONG",
        strategy: "24시간 변동성 추세 돌파",
        marketCap: "가상자산"
      });
    }
  });

  Object.entries(DOMESTIC_STOCK_MAP).forEach(([sym, name]) => {
    if (!map.has(sym)) {
      const live = realtimeMarketFeedService.getQuote(sym);
      map.set(sym, {
        symbol: sym,
        name,
        market: "KOSPI",
        category: "LARGE",
        categoryLabel: "국내주식",
        price: live?.price || 50000,
        changeRate: live?.changeRate || 1.1,
        changeAmount: live?.changeAmount || 500,
        tradeValue: live?.tradeValue || "실시간",
        volume: live?.volume || "실시간",
        rvol: 1.7,
        score: 84,
        grade: "A",
        theme: "국내 우량 상장주식",
        signal: "LONG",
        strategy: "KOSPI/KOSDAQ 주도주",
        marketCap: "상장주식"
      });
    }
  });

  // 4. User custom registered stocks
  custom.forEach((item) => {
    const liveQuote = realtimeMarketFeedService.getQuote(item.symbol);
    if (liveQuote) {
      map.set(item.symbol, {
        ...item,
        price: liveQuote.price,
        changeRate: liveQuote.changeRate,
        changeAmount: liveQuote.changeAmount
      });
    } else {
      map.set(item.symbol, item);
    }
  });

  return Array.from(map.values());
}

export function searchUniversalStocks(query: string, marketFilter?: string): StockItem[] {
  const all = getAllStocks();
  if (!query || !query.trim()) {
    if (!marketFilter || marketFilter === "ALL") return all;
    return all.filter(s => s.market === marketFilter);
  }
  const cleanQ = query.trim();
  return all.filter(s => {
    if (marketFilter && marketFilter !== "ALL" && s.market !== marketFilter) return false;
    return matchesChosungOrKeyword(s.name, s.symbol, cleanQ, [
      s.theme, 
      s.categoryLabel, 
      s.strategy, 
      s.market
    ]);
  });
}


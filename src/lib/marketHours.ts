export interface MarketStatus {
  market: 'KOREA' | 'US' | 'BTC';
  isOpen: boolean;
  statusBadgeText: string;
  detailText: string;
  nextSessionText: string;
  operatingHoursText: string;
}

export interface ExecutionPhaseInfo {
  market: 'KOREA' | 'US' | 'BTC';
  phase: 'COOLING_SCAN' | 'PATTERN_CHECK' | 'REGULAR_TREND' | 'CLOSING_SELECTION' | 'CLOSING_BLOCK' | 'CLOSED';
  phaseName: string;
  allowNewBuy: boolean;
  reasonText: string;
}

/**
 * Checks the current market execution phase according to the 30-minute pattern and time-based risk rules.
 */
export function getExecutionPhase(market: 'KOREA' | 'US' | 'BTC', date: Date = new Date()): ExecutionPhaseInfo {
  if (market === 'BTC') {
    return {
      market: 'BTC',
      phase: 'REGULAR_TREND',
      phaseName: '24시간 무휴 정규 트레이딩',
      allowNewBuy: true,
      reasonText: '가상자산 시장 24시간 365일 상시 가동 중'
    };
  }

  const kstFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const parts = kstFormatter.formatToParts(date);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);

  const kstYear = getPart("year");
  const kstMonth = getPart("month");
  const kstDay = getPart("day");
  const kstHour = getPart("hour");
  const kstMinute = getPart("minute");

  const kstDate = new Date(Date.UTC(kstYear, kstMonth - 1, kstDay, kstHour, kstMinute));
  const kstDayOfWeek = kstDate.getUTCDay();
  const totalKstMins = kstHour * 60 + kstMinute;

  if (market === 'KOREA') {
    const isWeekday = kstDayOfWeek >= 1 && kstDayOfWeek <= 5;
    if (!isWeekday) {
      return {
        market: 'KOREA',
        phase: 'CLOSED',
        phaseName: '주말 휴장',
        allowNewBuy: false,
        reasonText: '주말에는 국내 주식 정규 시장이 휴장합니다.'
      };
    }

    if (totalKstMins >= 9 * 60 && totalKstMins < 9 * 60 + 15) {
      // 09:00 ~ 09:15
      return {
        market: 'KOREA',
        phase: 'COOLING_SCAN',
        phaseName: '장 초반 15분 관망 & 수급 스캐닝',
        allowNewBuy: false,
        reasonText: '가짜 돌파(False Breakout) 방지를 위해 09:00~09:15 구간은 신규 매수가 제한되며 수급 스캐닝만 가동됩니다.'
      };
    } else if (totalKstMins >= 9 * 60 + 15 && totalKstMins < 9 * 60 + 30) {
      // 09:15 ~ 09:30
      return {
        market: 'KOREA',
        phase: 'PATTERN_CHECK',
        phaseName: '30분 패턴 지지 검증 & 1차 매수',
        allowNewBuy: true,
        reasonText: '장 시작 15분간 형성된 고/저점 및 VWAP 지지선을 검증한 후 승인된 1차 분할 진입 구간입니다.'
      };
    } else if (totalKstMins >= 9 * 60 + 30 && totalKstMins < 14 * 60 + 30) {
      // 09:30 ~ 14:30
      return {
        market: 'KOREA',
        phase: 'REGULAR_TREND',
        phaseName: '정규 퀀트 추세 매매 가동',
        allowNewBuy: true,
        reasonText: '정규 퀀트 시그널 및 오더플로우 매매가 활성화된 정상 구간입니다.'
      };
    } else if (totalKstMins >= 14 * 60 + 30 && totalKstMins < 15 * 60) {
      // 14:30 ~ 15:00
      return {
        market: 'KOREA',
        phase: 'CLOSING_SELECTION',
        phaseName: '장 마감전 주도주 선별 구간',
        allowNewBuy: true,
        reasonText: '당일 수급 및 종가주도주 위주로 선별 매매를 진행합니다.'
      };
    } else if (totalKstMins >= 15 * 60 && totalKstMins <= 15 * 60 + 30) {
      // 15:00 ~ 15:30
      return {
        market: 'KOREA',
        phase: 'CLOSING_BLOCK',
        phaseName: '장 마감 원장 정돈 & 신규 차단',
        allowNewBuy: false,
        reasonText: '15:00 이후 장 마감 시간대에는 변동성 방지를 위해 신규 매수가 차단되고 미체결 주문이 회수됩니다.'
      };
    } else {
      return {
        market: 'KOREA',
        phase: 'CLOSED',
        phaseName: '정규장 마감',
        allowNewBuy: false,
        reasonText: '정규 거래 시간(09:00~15:30) 외에는 매수가 제한됩니다.'
      };
    }
  }

  // US Market phase
  const nyFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const nyParts = nyFormatter.formatToParts(date);
  const getNyPart = (type: string) => parseInt(nyParts.find(p => p.type === type)?.value || "0", 10);

  const nyHour = getNyPart("hour");
  const nyMinute = getNyPart("minute");
  const totalNyMins = nyHour * 60 + nyMinute;

  if (totalNyMins >= 9 * 60 + 30 && totalNyMins < 9 * 60 + 45) {
    return {
      market: 'US',
      phase: 'COOLING_SCAN',
      phaseName: '미국장 초반 15분 관망',
      allowNewBuy: false,
      reasonText: '미국 개장 직후 15분간은 변동성 관망 구간입니다.'
    };
  } else if (totalNyMins >= 9 * 60 + 45 && totalNyMins < 15 * 60 + 30) {
    return {
      market: 'US',
      phase: 'REGULAR_TREND',
      phaseName: '미국 정규 추세 트레이딩',
      allowNewBuy: true,
      reasonText: '미국 증시 정규 자율매매 운영 시간입니다.'
    };
  } else if (totalNyMins >= 15 * 60 + 30 && totalNyMins <= 16 * 60) {
    return {
      market: 'US',
      phase: 'CLOSING_BLOCK',
      phaseName: '미국장 마감 정돈',
      allowNewBuy: false,
      reasonText: '미국장 마감 30분 전 신규 매수가 차단됩니다.'
    };
  } else {
    return {
      market: 'US',
      phase: 'CLOSED',
      phaseName: '미국장 휴장',
      allowNewBuy: false,
      reasonText: '미국 정규장이 개장하지 않은 시간대입니다.'
    };
  }
}

/**
 * Checks the current market operating hours in Korean Standard Time (KST / Asia/Seoul)
 * and US Eastern Time (America/New_York).
 */
export function getMarketStatus(market: 'KOREA' | 'US' | 'BTC', date: Date = new Date()): MarketStatus {
  if (market === 'BTC') {
    return {
      market: 'BTC',
      isOpen: true,
      statusBadgeText: '24시간 개장 중 🟢',
      detailText: '가상자산 시장 (업비트) 24시간 365일 연중무휴 실시간 거래',
      nextSessionText: '실시간 정규장 상시 작동 중',
      operatingHoursText: '00:00 ~ 24:00 (연중무휴)'
    };
  }

  // Get current date/time in Asia/Seoul
  const kstFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });

  const parts = kstFormatter.formatToParts(date);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);

  const kstYear = getPart("year");
  const kstMonth = getPart("month");
  const kstDay = getPart("day");
  const kstHour = getPart("hour");
  const kstMinute = getPart("minute");

  // Determine KST Day of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const kstDate = new Date(Date.UTC(kstYear, kstMonth - 1, kstDay, kstHour, kstMinute));
  const kstDayOfWeek = kstDate.getUTCDay();

  const totalKstMins = kstHour * 60 + kstMinute;

  if (market === 'KOREA') {
    const isWeekday = kstDayOfWeek >= 1 && kstDayOfWeek <= 5;
    const startMins = 9 * 60; // 09:00 KST
    const endMins = 15 * 60 + 30; // 15:30 KST

    const isOpen = isWeekday && totalKstMins >= startMins && totalKstMins < endMins;

    let statusBadgeText = '';
    let detailText = '';
    let nextSessionText = '';

    if (isOpen) {
      statusBadgeText = '국내주식 개장 중 🟢';
      detailText = '한국 거래소 (KOSPI/KOSDAQ) 정규 매매 시간 가동 중';
      const remainingMins = endMins - totalKstMins;
      const rHours = Math.floor(remainingMins / 60);
      const rMins = remainingMins % 60;
      nextSessionText = `장마감까지 ${rHours > 0 ? `${rHours}시간 ` : ''}${rMins}분 남음`;
    } else {
      statusBadgeText = '국내주식 장마감 🔴';
      if (!isWeekday) {
        detailText = '주말 휴장 (토/일요일은 국내 주식 거래가 정지됩니다)';
        nextSessionText = '다음 개장: 월요일 09:00 KST';
      } else if (totalKstMins < startMins) {
        detailText = '개장 준비 중 (09:00 정규장 개장)';
        const waitMins = startMins - totalKstMins;
        const wHours = Math.floor(waitMins / 60);
        const wMins = waitMins % 60;
        nextSessionText = `개장까지 ${wHours > 0 ? `${wHours}시간 ` : ''}${wMins}분 남음`;
      } else {
        detailText = '정규장 마감 (금일 거래 종료)';
        nextSessionText = kstDayOfWeek === 5 ? '다음 개장: 월요일 09:00 KST' : '다음 개장: 내일 09:00 KST';
      }
    }

    return {
      market: 'KOREA',
      isOpen,
      statusBadgeText,
      detailText,
      nextSessionText,
      operatingHoursText: '평일 09:00 ~ 15:30 KST'
    };
  }

  // US Stock Market
  const nyFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });

  const nyParts = nyFormatter.formatToParts(date);
  const getNyPart = (type: string) => parseInt(nyParts.find(p => p.type === type)?.value || "0", 10);

  const nyYear = getNyPart("year");
  const nyMonth = getNyPart("month");
  const nyDay = getNyPart("day");
  const nyHour = getNyPart("hour");
  const nyMinute = getNyPart("minute");

  const nyDate = new Date(Date.UTC(nyYear, nyMonth - 1, nyDay, nyHour, nyMinute));
  const nyDayOfWeek = nyDate.getUTCDay();

  const totalNyMins = nyHour * 60 + nyMinute;
  const nyStartMins = 9 * 60 + 30; // 09:30 NY time
  const nyEndMins = 16 * 60; // 16:00 NY time

  const isNyWeekday = nyDayOfWeek >= 1 && nyDayOfWeek <= 5;
  const isUsOpen = isNyWeekday && totalNyMins >= nyStartMins && totalNyMins < nyEndMins;

  let usBadge = '';
  let usDetail = '';
  let usNext = '';

  if (isUsOpen) {
    usBadge = '미국주식 개장 중 🟢';
    usDetail = '미국 증시 (NYSE / NASDAQ) 정규 매매 시간 가동 중';
    const remainingMins = nyEndMins - totalNyMins;
    const rHours = Math.floor(remainingMins / 60);
    const rMins = remainingMins % 60;
    usNext = `장마감까지 ${rHours > 0 ? `${rHours}시간 ` : ''}${rMins}분 남음`;
  } else {
    usBadge = '미국주식 장마감 🔴';
    if (!isNyWeekday) {
      usDetail = '주말 휴장 (토/일요일은 미국 주식 거래가 정지됩니다)';
      usNext = '다음 개장: 한국시간 월요일 밤 22:30 KST';
    } else if (totalNyMins < nyStartMins) {
      usDetail = '미국 정규장 개장 대기 중';
      const waitMins = nyStartMins - totalNyMins;
      const wHours = Math.floor(waitMins / 60);
      const wMins = waitMins % 60;
      usNext = `개장까지 ${wHours > 0 ? `${wHours}시간 ` : ''}${wMins}분 남음`;
    } else {
      usDetail = '미국 정규장 마감 (금일 거래 종료)';
      usNext = nyDayOfWeek === 5 ? '다음 개장: 한국시간 월요일 밤 22:30 KST' : '다음 개장: 오늘/내일 밤 22:30 KST';
    }
  }

  return {
    market: 'US',
    isOpen: isUsOpen,
    statusBadgeText: usBadge,
    detailText: usDetail,
    nextSessionText: usNext,
    operatingHoursText: '한국시간 22:30 ~ 05:00 KST (썸머타임 기준)'
  };
}

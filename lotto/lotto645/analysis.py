"""당첨번호 상세 분석.

모든 함수는 `draws`(Draw 리스트, 회차 오름차순)를 받아 dict 또는 numpy 배열을 돌려준다.
통계 검정은 "이 패턴이 무작위 추첨에서도 흔히 나올 수 있는가"를 p-value로 알려 준다.
"""
from __future__ import annotations

from collections import Counter
from itertools import combinations
from math import comb
from typing import Sequence

import numpy as np
from scipy import stats

from .data import Draw

N_BALLS = 45
PICK = 6
SECTIONS = ((1, 10), (11, 20), (21, 30), (31, 40), (41, 45))


# ------------------------------------------------------------------ 기본 행렬

def draws_matrix(draws: Sequence[Draw]) -> np.ndarray:
    """(회차수, 6) 정수 행렬."""
    return np.array([d.numbers for d in draws], dtype=np.int16).reshape(-1, PICK)


def indicator_matrix(draws: Sequence[Draw]) -> np.ndarray:
    """(회차수, 45) 0/1 행렬. [i, k-1] = k번이 i번째 회차에 나왔는지."""
    m = np.zeros((len(draws), N_BALLS), dtype=np.int8)
    for i, d in enumerate(draws):
        m[i, [n - 1 for n in d.numbers]] = 1
    return m


# ------------------------------------------------------------------ 번호 빈도

def number_frequency(draws: Sequence[Draw], include_bonus: bool = False) -> np.ndarray:
    """1~45 각 번호의 출현 횟수 (길이 45, index k-1)."""
    freq = indicator_matrix(draws).sum(axis=0).astype(np.int64)
    if include_bonus:
        for d in draws:
            freq[d.bonus - 1] += 1
    return freq


def bonus_frequency(draws: Sequence[Draw]) -> np.ndarray:
    freq = np.zeros(N_BALLS, dtype=np.int64)
    for d in draws:
        freq[d.bonus - 1] += 1
    return freq


def uniformity_test(freq: np.ndarray) -> dict:
    """카이제곱 균등성 검정: 번호별 출현 횟수가 모두 같다는 가설."""
    expected = np.full_like(freq, freq.sum() / len(freq), dtype=float)
    chi2, p = stats.chisquare(freq, expected)
    return {
        "chi2": float(chi2), "p_value": float(p), "dof": len(freq) - 1,
        "expected_per_number": float(expected[0]),
        "verdict": "균등 분포와 구별되지 않음 (무작위와 일치)" if p > 0.05
                   else "균등 분포에서 유의하게 벗어남 (추가 확인 필요)",
    }


def hot_cold(freq: np.ndarray, k: int = 10) -> dict:
    order = np.argsort(-freq, kind="stable")
    return {
        "hot": [(int(i + 1), int(freq[i])) for i in order[:k]],
        "cold": [(int(i + 1), int(freq[i])) for i in order[::-1][:k]],
    }


def gaps_since_last(draws: Sequence[Draw]) -> np.ndarray:
    """각 번호가 마지막으로 나온 뒤 지난 회차 수 (0 = 최신 회차에 나옴)."""
    last = np.full(N_BALLS, -1, dtype=np.int64)
    for i, d in enumerate(draws):
        for n in d.numbers:
            last[n - 1] = i
    n = len(draws)
    return np.where(last >= 0, n - 1 - last, n)


def max_historical_gap(draws: Sequence[Draw]) -> np.ndarray:
    """번호별 역대 최장 미출현 기간."""
    last = np.full(N_BALLS, -1, dtype=np.int64)
    best = np.zeros(N_BALLS, dtype=np.int64)
    for i, d in enumerate(draws):
        for n in d.numbers:
            best[n - 1] = max(best[n - 1], i - last[n - 1] - 1)
            last[n - 1] = i
    n = len(draws)
    return np.maximum(best, n - 1 - last)


# ------------------------------------------------------------------ 조합 패턴

def combo_features(numbers: Sequence[int]) -> dict:
    """한 조합(6개)의 패턴 특징."""
    nums = sorted(numbers)
    odd = sum(n % 2 for n in nums)
    low = sum(n <= 22 for n in nums)
    consecutive_pairs = sum(1 for a, b in zip(nums, nums[1:]) if b - a == 1)
    diffs = sorted({b - a for a, b in combinations(nums, 2)})
    ac = len(diffs) - (PICK - 1)
    last_digits = Counter(n % 10 for n in nums)
    sections = [sum(lo <= n <= hi for n in nums) for lo, hi in SECTIONS]
    return {
        "sum": sum(nums),
        "odd": odd, "even": PICK - odd,
        "low": low, "high": PICK - low,
        "consecutive_pairs": consecutive_pairs,
        "range": nums[-1] - nums[0],
        "ac": ac,
        "max_same_last_digit": max(last_digits.values()),
        "sections": sections,
        "sections_used": sum(1 for s in sections if s > 0),
    }


def pattern_distributions(draws: Sequence[Draw]) -> dict:
    feats = [combo_features(d.numbers) for d in draws]
    n = len(feats)
    sums = np.array([f["sum"] for f in feats])

    def dist(key):
        c = Counter(f[key] for f in feats)
        return {int(k): int(v) for k, v in sorted(c.items())}

    # 이론값(모든 조합이 동일 확률일 때)과 비교
    total = comb(N_BALLS, PICK)
    odd_theory = {k: comb(23, k) * comb(22, PICK - k) / total for k in range(PICK + 1)}
    low_theory = {k: comb(22, k) * comb(23, PICK - k) / total for k in range(PICK + 1)}

    odd_obs = dist("odd")
    odd_chi = stats.chisquare(
        [odd_obs.get(k, 0) for k in range(PICK + 1)],
        [odd_theory[k] * n for k in range(PICK + 1)],
    )
    return {
        "n": n,
        "sum": {
            "mean": float(sums.mean()), "std": float(sums.std(ddof=1)),
            "min": int(sums.min()), "max": int(sums.max()),
            "theory_mean": PICK * (N_BALLS + 1) / 2,          # 138
            "pct_in_100_175": float(((sums >= 100) & (sums <= 175)).mean()),
            "percentiles": {p: int(np.percentile(sums, p)) for p in (5, 25, 50, 75, 95)},
        },
        "odd_even": {"observed": odd_obs,
                     "theory": {k: round(v * n, 1) for k, v in odd_theory.items()},
                     "chi2_p": float(odd_chi.pvalue)},
        "low_high": {"observed": dist("low"),
                     "theory": {k: round(v * n, 1) for k, v in low_theory.items()}},
        "consecutive_pairs": dist("consecutive_pairs"),
        "ac": dist("ac"),
        "sections_used": dist("sections_used"),
        "max_same_last_digit": dist("max_same_last_digit"),
        "range": {"mean": float(np.mean([f["range"] for f in feats])),
                  "min": min(f["range"] for f in feats), "max": max(f["range"] for f in feats)},
    }


def last_digit_frequency(draws: Sequence[Draw]) -> dict:
    c = Counter(n % 10 for d in draws for n in d.numbers)
    # 끝수별 번호 개수가 다르다(끝수 0은 10,20,30,40 → 4개, 1~5는 5개씩, 6~9는 4개씩)
    counts_per_digit = Counter(n % 10 for n in range(1, N_BALLS + 1))
    total = len(draws) * PICK
    return {
        d: {"count": c.get(d, 0),
            "expected": round(total * counts_per_digit[d] / N_BALLS, 1)}
        for d in range(10)
    }


def section_frequency(draws: Sequence[Draw]) -> dict:
    freq = number_frequency(draws)
    total = freq.sum()
    out = {}
    for lo, hi in SECTIONS:
        cnt = int(freq[lo - 1:hi].sum())
        out[f"{lo}-{hi}"] = {"count": cnt, "expected": round(total * (hi - lo + 1) / N_BALLS, 1)}
    return out


# ------------------------------------------------------------------ 독립성 검정 (예측 가능성의 핵심)

def repeat_rate(draws: Sequence[Draw]) -> dict:
    """직전 회차 번호가 다음 회차에 다시 나오는 비율.
    독립 추첨이면 각 번호의 재출현 확률은 6/45 = 13.3%, 회차당 평균 0.8개."""
    m = indicator_matrix(draws)
    if len(m) < 2:
        return {}
    repeats = (m[1:] & m[:-1]).sum(axis=1)
    n_pairs = len(repeats)
    total_repeats = int(repeats.sum())
    expected_p = PICK / N_BALLS
    # 직전 6개 번호 × (회차-1)번의 베르누이 시행
    trials = PICK * n_pairs
    test = stats.binomtest(total_repeats, trials, expected_p)
    return {
        "mean_repeats_per_draw": float(repeats.mean()),
        "expected_per_draw": PICK * expected_p,
        "distribution": {int(k): int(v) for k, v in sorted(Counter(repeats.tolist()).items())},
        "observed_rate": total_repeats / trials,
        "expected_rate": expected_p,
        "p_value": float(test.pvalue),
        "verdict": "직전 회차 번호의 재출현 확률은 무작위와 같음" if test.pvalue > 0.05
                   else "직전 회차와의 관계가 유의함 (추가 확인 필요)",
    }


def hot_persistence_test(draws: Sequence[Draw], window: int = 30, top_k: int = 10) -> dict:
    """최근 `window`회 출현 상위 `top_k` 번호('핫넘버')가 바로 다음 회차에 나오는 비율.
    핫넘버에 예측력이 있다면 6/45 보다 유의하게 높아야 한다."""
    m = indicator_matrix(draws)
    hits = trials = 0
    cold_hits = cold_trials = 0
    for i in range(window, len(m)):
        freq = m[i - window:i].sum(axis=0)
        order = np.argsort(-freq, kind="stable")
        hot = order[:top_k]
        cold = order[::-1][:top_k]
        hits += int(m[i, hot].sum()); trials += top_k
        cold_hits += int(m[i, cold].sum()); cold_trials += top_k
    p = PICK / N_BALLS
    if trials == 0:
        return {}
    return {
        "window": window, "top_k": top_k,
        "hot_hit_rate": hits / trials, "cold_hit_rate": cold_hits / cold_trials,
        "expected_rate": p,
        "hot_p_value": float(stats.binomtest(hits, trials, p).pvalue),
        "cold_p_value": float(stats.binomtest(cold_hits, cold_trials, p).pvalue),
        "n_rounds_tested": len(m) - window,
    }


def autocorrelation_by_number(draws: Sequence[Draw], max_lag: int = 5) -> dict:
    """번호 출현 지표열의 시차별 자기상관(45개 번호 평균). 독립이면 0 근처."""
    m = indicator_matrix(draws).astype(float)
    m = m - m.mean(axis=0)
    out = {}
    for lag in range(1, max_lag + 1):
        num = (m[lag:] * m[:-lag]).sum(axis=0)
        den = (m * m).sum(axis=0)
        r = num / np.where(den == 0, 1, den)
        se = 1 / np.sqrt(len(m) - lag)
        out[lag] = {"mean_r": float(r.mean()),
                    "n_numbers_outside_2se": int((np.abs(r) > 2 * se).sum()),
                    "approx_2se": float(2 * se)}
    return out


def pair_cooccurrence(draws: Sequence[Draw]) -> np.ndarray:
    """(45,45) 두 번호 동시 출현 횟수."""
    m = indicator_matrix(draws).astype(np.int32)
    co = m.T @ m
    np.fill_diagonal(co, 0)
    return co


def top_pairs(draws: Sequence[Draw], k: int = 10) -> list[tuple[int, int, int]]:
    co = pair_cooccurrence(draws)
    iu = np.triu_indices(N_BALLS, 1)
    vals = co[iu]
    order = np.argsort(-vals, kind="stable")[:k]
    return [(int(iu[0][i] + 1), int(iu[1][i] + 1), int(vals[i])) for i in order]


def pair_expected(n_draws: int) -> float:
    """임의의 두 번호가 같은 회차에 나올 기대 횟수."""
    return n_draws * comb(43, 4) / comb(45, 6)


# ------------------------------------------------------------------ 판매/당첨 요약

def prize_summary(draws: Sequence[Draw]) -> dict:
    rows = [d for d in draws if d.first_winners > 0 and d.first_prize > 0]
    if not rows:
        return {}
    winners = np.array([d.first_winners for d in rows])
    prizes = np.array([d.first_prize for d in rows], dtype=float)
    sales = np.array([d.total_sales for d in draws if d.total_sales > 0], dtype=float)
    return {
        "rounds_with_first_winner": len(rows),
        "rounds_without_first_winner": sum(1 for d in draws if d.first_winners == 0),
        "avg_first_winners": float(winners.mean()),
        "max_first_winners": int(winners.max()),
        "avg_first_prize": float(prizes.mean()),
        "max_first_prize": float(prizes.max()),
        "recent_52_avg_first_winners": float(np.mean([d.first_winners for d in draws[-52:]])),
        "recent_52_avg_first_prize": float(np.mean([d.first_prize for d in draws[-52:]])),
        "recent_52_avg_sales": float(np.mean([d.total_sales for d in draws[-52:]])) if len(sales) else 0,
    }


# ------------------------------------------------------------------ 종합

def full_analysis(draws: Sequence[Draw]) -> dict:
    freq = number_frequency(draws)
    gaps = gaps_since_last(draws)
    max_gap = max_historical_gap(draws)
    n = len(draws)
    return {
        "rounds": n,
        "first_date": draws[0].date, "last_date": draws[-1].date,
        "frequency": {int(i + 1): int(freq[i]) for i in range(N_BALLS)},
        "frequency_uniformity": uniformity_test(freq),
        "bonus_frequency": {int(i + 1): int(v) for i, v in enumerate(bonus_frequency(draws))},
        "hot_cold": hot_cold(freq),
        "gaps": {int(i + 1): {"since_last": int(gaps[i]), "max_ever": int(max_gap[i])} for i in range(N_BALLS)},
        "longest_absent": [(int(i + 1), int(gaps[i])) for i in np.argsort(-gaps, kind="stable")[:10]],
        "patterns": pattern_distributions(draws),
        "last_digit": last_digit_frequency(draws),
        "sections": section_frequency(draws),
        "repeat_rate": repeat_rate(draws),
        "hot_persistence": hot_persistence_test(draws),
        "autocorrelation": autocorrelation_by_number(draws),
        "top_pairs": top_pairs(draws),
        "pair_expected": pair_expected(n),
        "prizes": prize_summary(draws),
    }

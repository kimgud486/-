"""예측 전략: 과거 데이터(지표 행렬)를 받아 1~45 각 번호의 점수를 돌려준다.

점수가 높을수록 그 전략이 "다음 회차에 나올 것"으로 보는 번호다.
모든 전략은 `fit` 시점 이전의 데이터만 본다(미래 정보 누출 없음).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np

N_BALLS = 45
PICK = 6


def _standardize(x: np.ndarray) -> np.ndarray:
    x = x.astype(float)
    sd = x.std()
    return (x - x.mean()) / sd if sd > 0 else np.zeros_like(x)


@dataclass
class Strategy:
    name: str
    label: str                     # 한국어 표시명
    assumption: str                # 이 전략이 가정하는 것 (진단 리포트에서 검증 대상)
    score_fn: Callable[[np.ndarray], np.ndarray]
    use_filter: bool = True        # 조합 생성 시 패턴 필터 적용 여부
    uniform: bool = False          # 점수가 의미 없고 균등 추출인지
    params: dict = field(default_factory=dict)

    needs_ctx: bool = False        # score_fn이 (ind, ctx)를 받는지

    def score(self, ind: np.ndarray, ctx: dict | None = None) -> np.ndarray:
        """ind: (회차수, 45) 0/1 지표 행렬 (학습 구간). ctx: 보조 자료(당첨자 밀도 등). 길이 45 점수 반환."""
        if self.needs_ctx:
            return np.asarray(self.score_fn(ind, ctx), dtype=float)
        return np.asarray(self.score_fn(ind), dtype=float)


# ------------------------------------------------------------------ 개별 전략

def score_frequency(ind: np.ndarray) -> np.ndarray:
    """전체 기간 출현 빈도 (핫넘버)."""
    return ind.sum(axis=0).astype(float)


def score_cold(ind: np.ndarray) -> np.ndarray:
    """오래 안 나온 번호 우선 (미출현 기간이 길수록 높은 점수) — '나올 때가 됐다' 가설."""
    return gaps_since_last(ind).astype(float)


def gaps_since_last(ind: np.ndarray) -> np.ndarray:
    """번호별 마지막 출현 이후 지난 회차 수(0 = 마지막 회차에 나옴, 한 번도 안 나왔으면 회차 수)."""
    n = len(ind)
    if n == 0:
        return np.zeros(N_BALLS, dtype=np.int64)
    rev = ind[::-1]
    seen = rev.any(axis=0)
    first = rev.argmax(axis=0)
    return np.where(seen, first, n).astype(np.int64)


def make_score_recent(window: int = 20, half_life: float = 8.0) -> Callable[[np.ndarray], np.ndarray]:
    """최근 `window`회를 지수 가중(최근일수록 큼)한 빈도 — '최근 흐름' 가설."""
    def fn(ind: np.ndarray) -> np.ndarray:
        w = ind[-window:]
        k = len(w)
        weights = 0.5 ** (np.arange(k)[::-1] / half_life)
        return (w * weights[:, None]).sum(axis=0)
    return fn


def score_markov(ind: np.ndarray) -> np.ndarray:
    """1차 전이: 직전 회차에 나온 번호들 뒤에 역사적으로 자주 따라온 번호."""
    if len(ind) < 2:
        return np.zeros(N_BALLS)
    prev = ind[:-1].astype(np.int32)
    nxt = ind[1:].astype(np.int32)
    trans = prev.T @ nxt                       # trans[a,b] = a 다음 회차에 b가 나온 횟수
    row = prev.sum(axis=0)                     # a가 나온(=조건) 횟수
    probs = trans / np.where(row == 0, 1, row)[:, None]
    last = ind[-1] == 1
    return probs[last].sum(axis=0)


def score_pair(ind: np.ndarray) -> np.ndarray:
    """동반 출현: 전체 빈도 상위 번호들과 역사적으로 함께 자주 나온 번호에 가산점."""
    m = ind.astype(np.int32)
    freq = m.sum(axis=0)
    co = m.T @ m
    np.fill_diagonal(co, 0)
    seeds = np.argsort(-freq, kind="stable")[:6]
    affinity = co[seeds].sum(axis=0).astype(float)
    return _standardize(freq) + _standardize(affinity)


def score_uniform(ind: np.ndarray) -> np.ndarray:
    return np.zeros(N_BALLS)


def make_score_ensemble(parts: list[Callable[[np.ndarray], np.ndarray]]) -> Callable[[np.ndarray], np.ndarray]:
    def fn(ind: np.ndarray) -> np.ndarray:
        return np.mean([_standardize(p(ind)) for p in parts], axis=0)
    return fn


# ------------------------------------------------------------------ 레지스트리

def build_strategies() -> dict[str, Strategy]:
    from .popularity import score_unpopular
    recent = make_score_recent(window=20, half_life=8.0)
    strategies = [
        Strategy("frequency", "누적 빈도(핫넘버)",
                 "과거에 자주 나온 번호가 앞으로도 자주 나온다",
                 score_frequency),
        Strategy("cold", "미출현(콜드넘버)",
                 "오래 안 나온 번호는 평균으로 회귀하려고 곧 나온다",
                 score_cold),
        Strategy("recent", "최근 20회 가중",
                 "최근 흐름(최근 자주 나온 번호)이 다음 회차에 이어진다",
                 recent, params={"window": 20, "half_life": 8.0}),
        Strategy("markov", "직전회차 전이",
                 "직전 회차 번호 뒤에 역사적으로 자주 따라온 번호가 또 따라온다",
                 score_markov),
        Strategy("pair", "동반출현 친화도",
                 "자주 나온 번호와 함께 자주 나온 번호 묶음이 다시 함께 나온다",
                 score_pair),
        Strategy("ensemble", "앙상블(빈도+최근+전이+동반)",
                 "여러 패턴 신호를 합치면 개별 신호보다 안정적으로 맞는다",
                 make_score_ensemble([score_frequency, recent, score_markov, score_pair])),
        Strategy("unpopular", "비인기 번호(당첨금 극대화)",
                 "적중 확률은 같지만 남들이 덜 고르는 번호로 당첨되면 나눠 가질 사람이 적다",
                 score_unpopular, use_filter=False, needs_ctx=True),
        Strategy("balanced", "균등 추출+패턴 필터",
                 "번호 자체에는 정보가 없지만 합계/홀짝/고저 등 '전형적인 패턴'을 지키면 유리하다",
                 score_uniform, use_filter=True, uniform=True),
        Strategy("random", "순수 무작위(기준선)",
                 "아무 가정도 하지 않는다 — 다른 전략이 이것을 이기지 못하면 예측력이 없다",
                 score_uniform, use_filter=False, uniform=True),
    ]
    return {s.name: s for s in strategies}


STRATEGIES = build_strategies()
DEFAULT_ORDER = ["frequency", "cold", "recent", "markov", "pair", "ensemble", "unpopular", "balanced", "random"]

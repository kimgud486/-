"""점수 → 실제 구매 가능한 6개 조합(게임) 생성.

생성 과정은 시드가 고정되어 같은 데이터·전략·회차에 대해 항상 같은 결과를 낸다
(백테스트 재현성). 조합은 상위 `pool_size`개 번호 풀에서 점수 가중 추출하고,
전략이 필터를 쓰면 과거 당첨 조합에 흔한 패턴 범위를 벗어나는 조합을 걸러낸다.
"""
from __future__ import annotations

import zlib
from dataclasses import dataclass, field
from typing import Sequence

import numpy as np

from .analysis import combo_features, indicator_matrix
from .data import Draw
from .strategies import STRATEGIES, Strategy

N_BALLS = 45
PICK = 6


@dataclass
class PatternFilter:
    """과거 당첨 조합의 약 84%가 들어오는 '전형적' 범위(1~1247회 기준).
    각 조건이 실제 조합을 배제한 비율은 백테스트 진단에 기록된다."""
    sum_min: int = 90
    sum_max: int = 186
    odd_min: int = 1
    odd_max: int = 5
    low_min: int = 1
    low_max: int = 5
    max_consecutive_pairs: int = 2
    max_same_last_digit: int = 3

    def violations(self, numbers: Sequence[int]) -> list[str]:
        f = combo_features(numbers)
        v = []
        if not (self.sum_min <= f["sum"] <= self.sum_max):
            v.append(f"합계 {f['sum']} (허용 {self.sum_min}~{self.sum_max})")
        if not (self.odd_min <= f["odd"] <= self.odd_max):
            v.append(f"홀수 {f['odd']}개 (허용 {self.odd_min}~{self.odd_max})")
        if not (self.low_min <= f["low"] <= self.low_max):
            v.append(f"저구간(1~22) {f['low']}개 (허용 {self.low_min}~{self.low_max})")
        if f["consecutive_pairs"] > self.max_consecutive_pairs:
            v.append(f"연번 {f['consecutive_pairs']}쌍 (허용 ≤{self.max_consecutive_pairs})")
        if f["max_same_last_digit"] > self.max_same_last_digit:
            v.append(f"같은 끝수 {f['max_same_last_digit']}개 (허용 ≤{self.max_same_last_digit})")
        return v

    def passes(self, numbers: Sequence[int]) -> bool:
        return not self.violations(numbers)

    def pass_rate(self, draws: Sequence[Draw]) -> float:
        if not draws:
            return float("nan")
        return sum(self.passes(d.numbers) for d in draws) / len(draws)


DEFAULT_FILTER = PatternFilter()


@dataclass
class Prediction:
    target_round: int                 # 예측 대상 회차
    strategy: str
    trained_rounds: int               # 학습에 쓴 회차 수 (1~trained_rounds)
    scores: np.ndarray                # 길이 45
    ranking: list[int]                # 점수 내림차순 번호 (동점은 번호 오름차순)
    pool: list[int]                   # 추출 풀
    games: list[tuple[int, ...]]      # 생성된 조합들
    filter_used: bool
    rejected_by_filter: int = 0       # 필터로 버린 후보 수
    notes: list[str] = field(default_factory=list)

    def rank_of(self, number: int) -> int:
        """1 = 가장 높은 점수. 균등 전략이면 모두 23(중앙)."""
        return self.ranking.index(number) + 1


def stable_seed(*parts) -> int:
    return zlib.crc32("|".join(str(p) for p in parts).encode("utf-8"))


def rank_numbers(scores: np.ndarray) -> list[int]:
    # 점수 내림차순, 동점은 번호 오름차순 → 재현 가능
    order = sorted(range(N_BALLS), key=lambda i: (-scores[i], i))
    return [i + 1 for i in order]


def _weights_from_scores(scores: np.ndarray, pool_idx: np.ndarray, temperature: float) -> np.ndarray:
    s = scores[pool_idx]
    if s.std() == 0:
        return np.full(len(pool_idx), 1.0 / len(pool_idx))
    z = (s - s.mean()) / s.std()
    w = np.exp(z / temperature)
    return w / w.sum()


def generate_games(scores: np.ndarray, *, games: int, pool_size: int, seed: int,
                   pattern_filter: PatternFilter | None, temperature: float = 1.0,
                   max_attempts: int = 2000, coverage: bool = False,
                   reuse_penalty: float = 0.02) -> tuple[list[tuple[int, ...]], list[int], int, list[str]]:
    """점수 기반 가중 추출로 서로 다른 조합 `games`개 생성.

    coverage=True 이면 앞 게임에 쓴 번호의 가중치를 reuse_penalty 배로 낮춰 게임 간 겹침을 최소화한다
    (평균 적중은 같고, '전부 꽝' 회차가 줄어 분산만 작아진다).

    풀이 너무 좁아 필터를 통과하는 조합이 없으면 풀을 5개씩 넓히고, 그래도 안 되면
    필터 없이 생성한다(그 사실을 notes에 남긴다).
    반환: (조합 목록, 풀, 필터로 버린 수, notes)."""
    rng = np.random.default_rng(seed)
    ranking = rank_numbers(scores)
    uniform = scores.std() == 0
    notes: list[str] = []
    rejected_total = 0
    size = N_BALLS if uniform else pool_size
    pf = pattern_filter
    while True:
        pool = ranking[:size] if not uniform else list(range(1, N_BALLS + 1))
        pool_idx = np.array([p - 1 for p in pool])
        weights = _weights_from_scores(scores, pool_idx, temperature)
        out: list[tuple[int, ...]] = []
        seen = set()
        rejected = 0
        w = weights.copy()
        for _ in range(max_attempts):
            if len(out) >= games:
                break
            pick = rng.choice(pool_idx, size=PICK, replace=False, p=w)
            combo = tuple(sorted(int(i) + 1 for i in pick))
            if combo in seen:
                continue
            if pf is not None and not pf.passes(combo):
                rejected += 1
                continue
            seen.add(combo)
            out.append(combo)
            if coverage:
                used = np.isin(pool_idx, pick)
                w = np.where(used, w * reuse_penalty, w)
                w = w / w.sum()
        rejected_total += rejected
        if len(out) >= games or (uniform and pf is None):
            return out, pool, rejected_total, notes
        if pf is not None and size < N_BALLS:
            size = min(N_BALLS, size + 5)
            notes.append(f"풀 {len(pool)}개로는 필터 통과 조합이 부족해 풀을 {size}개로 확장")
            continue
        if pf is not None:
            pf = None
            notes.append("필터를 통과하는 조합을 만들 수 없어 필터 없이 생성")
            continue
        return out, pool, rejected_total, notes


def make_ctx(draws: Sequence[Draw]) -> dict:
    """전략 보조 자료: 회차별 1등 당첨자 밀도 (인기도 모델용)."""
    from .popularity import winners_density
    return {"density": winners_density(draws)}


def slice_ctx(ctx: dict | None, n: int) -> dict | None:
    return None if ctx is None else {k: v[:n] for k, v in ctx.items()}


def predict(draws: Sequence[Draw], strategy: Strategy | str, *, games: int = 5, pool_size: int = 15,
            seed: int | None = None, pattern_filter: PatternFilter | None = DEFAULT_FILTER,
            temperature: float = 1.0, coverage: bool = False, ctx: dict | None = None) -> Prediction:
    """draws(1~n회)로 n+1회를 예측한다."""
    if isinstance(strategy, str):
        strategy = STRATEGIES[strategy]
    if len(draws) == 0:
        raise ValueError("학습 데이터가 최소 1회차는 필요합니다")
    ind = indicator_matrix(draws)
    if ctx is None and strategy.needs_ctx:
        ctx = make_ctx(draws)
    scores = strategy.score(ind, ctx)
    target = draws[-1].round + 1
    if seed is None:
        seed = stable_seed(strategy.name, target, games, pool_size)
    pf = pattern_filter if strategy.use_filter else None
    combos, pool, rejected, notes = generate_games(
        scores, games=games, pool_size=pool_size, seed=seed, pattern_filter=pf, temperature=temperature,
        coverage=coverage)
    if len(combos) < games:
        notes.append(f"필터/풀 제약으로 {len(combos)}게임만 생성됨 (요청 {games})")
    return Prediction(
        target_round=target, strategy=strategy.name, trained_rounds=len(draws),
        scores=scores, ranking=rank_numbers(scores), pool=pool, games=combos,
        filter_used=pf is not None, rejected_by_filter=rejected, notes=notes,
    )


def match_count(game: Sequence[int], actual: Sequence[int]) -> int:
    return len(set(game) & set(actual))


def prize_rank(matches: int, bonus_hit: bool) -> int | None:
    """로또 6/45 등수. 1등 6개, 2등 5개+보너스, 3등 5개, 4등 4개, 5등 3개."""
    if matches == 6:
        return 1
    if matches == 5:
        return 2 if bonus_hit else 3
    if matches == 4:
        return 4
    if matches == 3:
        return 5
    return None

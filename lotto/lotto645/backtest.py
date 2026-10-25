"""워크포워드 백테스트 + 회차별 오답 진단.

n회까지의 데이터만으로 n+1회를 예측하고, 실제 n+1회 결과와 비교한다.
회차마다 "왜 틀렸는지"를 전략의 가정에 비추어 진단하고, 전체 구간에서
전략이 순수 무작위보다 나은지 통계적으로 판정한다.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field, asdict
from math import comb
from typing import Sequence

import numpy as np
from scipy import stats

from .analysis import combo_features, indicator_matrix
from .data import Draw
from .predictor import (DEFAULT_FILTER, PatternFilter, Prediction, generate_games, match_count,
                        prize_rank, rank_numbers, stable_seed)
from .strategies import STRATEGIES, DEFAULT_ORDER, Strategy, gaps_since_last

N_BALLS = 45
PICK = 6
EXPECTED_MATCHES_PER_GAME = PICK * PICK / N_BALLS   # 0.8


def hypergeom_match_pmf() -> dict[int, float]:
    """한 게임이 k개 맞을 이론 확률 (무작위 선택 기준)."""
    total = comb(N_BALLS, PICK)
    return {k: comb(PICK, k) * comb(N_BALLS - PICK, PICK - k) / total for k in range(PICK + 1)}


MATCH_PMF = hypergeom_match_pmf()
P_AT_LEAST_3 = sum(v for k, v in MATCH_PMF.items() if k >= 3)   # 약 2.38% (3개 이상 = 5등 이상)


# ------------------------------------------------------------------ 회차 단위 결과

@dataclass
class RoundResult:
    target_round: int
    strategy: str
    actual: tuple[int, ...]
    bonus: int
    games: list[tuple[int, ...]]
    matches: list[int]                 # 게임별 적중 수
    best: int                          # 최고 적중 수
    mean: float                        # 평균 적중 수
    prizes: list[int | None]           # 게임별 등수
    actual_ranks: list[int]            # 실제 번호 6개의 모델 순위(1=최고)
    in_pool: int                       # 실제 번호 중 풀(상위 K)에 있던 개수
    pool_size: int
    filter_violations: list[str]       # 실제 조합이 필터에 걸린 이유 (없으면 통과)
    assumption_check: dict             # 전략 가정 검증 수치
    diagnosis: list[str]               # 사람이 읽는 진단 문장들

    def to_dict(self) -> dict:
        d = asdict(self)
        d["games"] = [list(g) for g in self.games]
        d["actual"] = list(self.actual)
        return d


# ------------------------------------------------------------------ 가정 검증

def check_assumption(strategy: Strategy, ind: np.ndarray, actual: Sequence[int], scores: np.ndarray) -> dict:
    """실제 당첨번호가 전략의 가정과 얼마나 부합했는지 수치로 요약."""
    n = len(ind)
    idx = [a - 1 for a in actual]
    out: dict = {}
    freq = ind.sum(axis=0)
    out["actual_mean_freq"] = float(freq[idx].mean())
    out["all_mean_freq"] = float(freq.mean())
    out["freq_z"] = float((freq[idx].mean() - freq.mean()) / (freq.std() / np.sqrt(PICK))) if freq.std() > 0 else 0.0

    gap = gaps_since_last(ind)
    out["actual_mean_gap"] = float(gap[idx].mean())
    out["all_mean_gap"] = float(gap.mean())

    w = ind[-20:]
    rec = w.sum(axis=0)
    out["actual_recent20"] = float(rec[idx].mean())
    out["all_recent20"] = float(rec.mean())

    out["repeat_from_prev"] = int(ind[-1][idx].sum())   # 직전 회차와 겹친 개수 (기대 0.8)

    if not strategy.uniform:
        ranking = rank_numbers(scores)
        ranks = [ranking.index(a) + 1 for a in actual]
        out["actual_mean_rank"] = float(np.mean(ranks))     # 정보가 없으면 평균 23
    return out


def _fmt(x: float) -> str:
    return f"{x:.2f}"


def diagnose(strategy: Strategy, pred: Prediction, actual: Sequence[int], bonus: int,
             matches: list[int], ranks: list[int], in_pool: int, violations: list[str],
             chk: dict, pattern_filter: PatternFilter | None) -> list[str]:
    """회차별 '왜 틀렸나' 설명문."""
    lines: list[str] = []
    best = max(matches) if matches else 0
    expected_in_pool = PICK * len(pred.pool) / N_BALLS
    lines.append(f"결과: {len(matches)}게임 중 최고 {best}개 적중, 평균 {np.mean(matches):.2f}개 "
                 f"(무작위 기대 {EXPECTED_MATCHES_PER_GAME:.2f}개/게임).")

    if not strategy.uniform:
        rank_txt = ", ".join(f"{a}번→{r}위" for a, r in zip(actual, ranks))
        lines.append(f"모델 순위에서 실제 번호의 위치: {rank_txt} (평균 {np.mean(ranks):.1f}위; 정보가 없으면 23위).")
        lines.append(f"상위 {len(pred.pool)}개 풀에 실제 번호 {in_pool}개 포함 (무작위 기대 {expected_in_pool:.2f}개)"
                     + (" → 풀 바깥 번호가 많아 조합 단계에서 맞힐 수 없었음." if in_pool < 3 else
                        " → 풀에는 들어왔지만 조합 추출에서 함께 뽑히지 않음."))
    else:
        lines.append("이 전략은 번호 점수가 없어(균등 추출) 순위 진단은 해당 없음.")

    # 전략별 가정 검증
    name = strategy.name
    if name == "frequency":
        lines.append(f"가정 검증(빈도): 실제 번호의 과거 평균 출현 {_fmt(chk['actual_mean_freq'])}회 vs 전체 평균 "
                     f"{_fmt(chk['all_mean_freq'])}회 (z={chk['freq_z']:+.2f}) → "
                     + ("실제 번호가 특별히 '핫'하지 않았음. 과거 빈도는 다음 회차와 무관." if abs(chk['freq_z']) < 1
                        else "이번엔 빈도 편차가 있었지만 우연 범위(z<2) 안."))
    elif name == "cold":
        lines.append(f"가정 검증(미출현): 실제 번호의 평균 미출현 {_fmt(chk['actual_mean_gap'])}회 vs 전체 평균 "
                     f"{_fmt(chk['all_mean_gap'])}회 → "
                     + ("오래 안 나온 번호가 특별히 더 나오지 않았음(도박사의 오류)." if chk['actual_mean_gap'] <= chk['all_mean_gap'] * 1.3
                        else "이번엔 미출현 번호가 몇 개 나왔지만 평균적으로는 기대치와 같음."))
    elif name == "recent":
        lines.append(f"가정 검증(최근 흐름): 실제 번호의 최근 20회 출현 {_fmt(chk['actual_recent20'])}회 vs 전체 평균 "
                     f"{_fmt(chk['all_recent20'])}회 → "
                     + ("최근 자주 나온 번호가 이어지지 않았음." if chk['actual_recent20'] <= chk['all_recent20'] * 1.2
                        else "최근 번호가 일부 겹쳤지만 우연 범위."))
    elif name == "markov":
        lines.append(f"가정 검증(전이): 직전 회차와 겹친 실제 번호 {chk['repeat_from_prev']}개 (기대 0.80개). "
                     "전이 확률 행렬은 표본이 적어(각 번호 조건부 ~160회) 잡음을 패턴으로 오인함.")
    elif name == "pair":
        lines.append("가정 검증(동반출현): 자주 함께 나온 쌍은 쌍의 수(990개)가 많아 생기는 극값일 뿐, "
                     "기대치(약 n×0.0192회) 주변의 무작위 산포임. 다음 회차 동반 여부와 무관.")
    elif name == "ensemble":
        lines.append(f"가정 검증(앙상블): 신호가 없는 지표를 평균해도 신호는 생기지 않음. 실제 번호 평균 순위 "
                     f"{chk.get('actual_mean_rank', 23):.1f}위(무정보 기준 23위).")
    elif name == "balanced":
        lines.append("가정 검증(패턴 필터): 필터는 '흔한 모양'의 조합만 남기지만, 각 조합의 당첨 확률은 "
                     "모양과 상관없이 1/8,145,060으로 같음.")
    elif name == "random":
        lines.append("기준선: 무작위 선택. 다른 전략의 성적을 이 값과 비교해야 한다.")

    if pattern_filter is not None and pred.filter_used:
        if violations:
            lines.append("필터 진단: 실제 당첨 조합은 필터에 걸려 생성 불가능했음 → " + "; ".join(violations)
                         + ". (필터가 '비전형적'이라고 버린 조합이 실제로 나옴)")
        else:
            lines.append("필터 진단: 실제 당첨 조합은 필터를 통과하는 모양이었음. 필터 때문에 놓친 것은 아님.")

    if best >= 3:
        lines.append(f"참고: {best}개 적중은 게임당 확률 {P_AT_LEAST_3*100:.2f}%(3개 이상) 범위의 사건으로, "
                     f"{len(matches)}게임을 사면 {1 - (1 - P_AT_LEAST_3) ** len(matches):.1%}확률로 무작위로도 일어남.")
    else:
        lines.append("결론: 적중 수가 무작위 기대 범위 안. 분석이 '틀린' 이유는 특정 계산 실수가 아니라 "
                     "과거 추첨이 다음 추첨에 정보를 주지 않기 때문임.")
    return lines


# ------------------------------------------------------------------ 백테스트 실행

@dataclass
class StrategySummary:
    strategy: str
    label: str
    rounds: int
    games_per_round: int
    total_games: int
    mean_matches: float
    expected_mean: float
    total_matches: int
    expected_total: float
    t_vs_theory: float
    p_value_vs_theory: float
    match_distribution: dict[int, int]
    theory_distribution: dict[int, float]
    best_distribution: dict[int, int]
    prize_counts: dict[int, int]
    rate_3plus: float
    expected_rate_3plus: float
    mean_actual_rank: float | None
    top6_hit_rate: float | None          # 점수 상위 6개 번호가 실제로 나온 비율 (기대 6/45)
    top6_p_value: float | None
    pool_hit_rate: float | None
    expected_pool_hit_rate: float | None
    filter_excluded_actual_rate: float | None
    verdict: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class BacktestResult:
    start_round: int          # 첫 예측 대상 회차
    end_round: int            # 마지막 예측 대상 회차
    games: int
    pool_size: int
    rounds: dict[str, list[RoundResult]]          # 전략별 회차 결과
    summaries: dict[str, StrategySummary]
    filter_pass_rate_all: float                   # 전 구간 실제 조합의 필터 통과율
    comparison_vs_random: dict[str, dict]         # 전략 vs random 기준선 검정

    def round_results(self, target_round: int) -> dict[str, RoundResult]:
        return {s: next(r for r in rs if r.target_round == target_round) for s, rs in self.rounds.items()}


def evaluate_round(strategy: Strategy, history: Sequence[Draw], actual_draw: Draw, *, games: int,
                   pool_size: int, pattern_filter: PatternFilter | None, ind_prefix: np.ndarray | None = None,
                   seed: int | None = None) -> tuple[Prediction, RoundResult]:
    """history(1~n회)로 actual_draw(n+1회)를 예측·채점·진단."""
    ind = ind_prefix if ind_prefix is not None else indicator_matrix(history)
    scores = strategy.score(ind)
    target = actual_draw.round
    if seed is None:
        seed = stable_seed(strategy.name, target, games, pool_size)
    pf = pattern_filter if strategy.use_filter else None
    combos, pool, rejected, notes = generate_games(scores, games=games, pool_size=pool_size, seed=seed,
                                                   pattern_filter=pf)
    pred = Prediction(target_round=target, strategy=strategy.name, trained_rounds=len(history),
                      scores=scores, ranking=rank_numbers(scores), pool=pool, games=combos,
                      filter_used=pf is not None, rejected_by_filter=rejected, notes=notes)

    actual = actual_draw.numbers
    matches = [match_count(g, actual) for g in combos]
    prizes = [prize_rank(m, actual_draw.bonus in g) for m, g in zip(matches, combos)]
    ranks = [pred.rank_of(a) for a in actual] if not strategy.uniform else [23] * PICK
    in_pool = sum(1 for a in actual if a in pool)
    violations = pattern_filter.violations(actual) if (pattern_filter is not None and pf is not None) else []
    chk = check_assumption(strategy, ind, actual, scores)
    diag = diagnose(strategy, pred, actual, actual_draw.bonus, matches, ranks, in_pool, violations, chk, pattern_filter)
    if notes:
        diag.insert(1, "생성 메모: " + "; ".join(notes))
    rr = RoundResult(
        target_round=target, strategy=strategy.name, actual=actual, bonus=actual_draw.bonus,
        games=combos, matches=matches, best=max(matches) if matches else 0,
        mean=float(np.mean(matches)) if matches else 0.0, prizes=prizes,
        actual_ranks=ranks, in_pool=in_pool, pool_size=len(pool),
        filter_violations=violations, assumption_check=chk, diagnosis=diag,
    )
    return pred, rr


def summarize(strategy: Strategy, results: list[RoundResult], games: int) -> StrategySummary:
    all_matches = [m for r in results for m in r.matches]
    total_games = len(all_matches)
    total = int(sum(all_matches))
    expected_total = EXPECTED_MATCHES_PER_GAME * total_games
    # 같은 회차의 여러 게임은 서로 상관되므로(같은 풀에서 추출) 게임 단위가 아니라
    # 회차 단위 평균 적중을 표본으로 삼아 기대치 0.8과 비교한다(회차 간은 독립).
    round_means = np.array([r.mean for r in results if r.matches])
    if len(round_means) > 1 and round_means.std(ddof=1) > 0:
        t = stats.ttest_1samp(round_means, EXPECTED_MATCHES_PER_GAME)
        z, p = float(t.statistic), float(t.pvalue)
    else:
        z, p = 0.0, 1.0
    dist = Counter(all_matches)
    best_dist = Counter(r.best for r in results)
    prize_counts = Counter(pz for r in results for pz in r.prizes if pz is not None)
    n3 = sum(1 for m in all_matches if m >= 3)
    rank_mean = None if strategy.uniform else float(np.mean([np.mean(r.actual_ranks) for r in results]))
    top6_rate = top6_p = None
    if not strategy.uniform and results:
        hits6 = sum(sum(1 for rk in r.actual_ranks if rk <= PICK) for r in results)
        trials6 = PICK * len(results)
        top6_rate = hits6 / trials6
        top6_p = float(stats.binomtest(hits6, trials6, PICK / N_BALLS).pvalue)
    pool_hit = None if strategy.uniform else float(np.mean([r.in_pool / PICK for r in results]))
    pool_exp = None if strategy.uniform else float(np.mean([r.pool_size / N_BALLS for r in results]))
    fex = None
    if strategy.use_filter:
        fex = float(np.mean([1.0 if r.filter_violations else 0.0 for r in results]))

    if p < 0.05 and z > 0:
        verdict = "무작위 기대치보다 유의하게 높음 — 다중 비교/우연 가능성을 포함해 재검증 필요"
    elif p < 0.05 and z < 0:
        verdict = ("무작위 기대치보다 낮음 — 전략이 고른 번호가 오히려 덜 나왔음. 가정과 반대 방향이며, "
                   "여러 전략을 동시에 검정할 때 우연히 나올 수 있는 크기")
    else:
        verdict = "무작위와 통계적으로 구별되지 않음 (예측력 없음)"
    return StrategySummary(
        strategy=strategy.name, label=strategy.label, rounds=len(results), games_per_round=games,
        total_games=total_games, mean_matches=float(np.mean(all_matches)) if all_matches else 0.0,
        expected_mean=EXPECTED_MATCHES_PER_GAME, total_matches=total, expected_total=float(expected_total),
        t_vs_theory=float(z), p_value_vs_theory=p,
        match_distribution={k: int(dist.get(k, 0)) for k in range(PICK + 1)},
        theory_distribution={k: round(MATCH_PMF[k] * total_games, 1) for k in range(PICK + 1)},
        best_distribution={k: int(best_dist.get(k, 0)) for k in range(PICK + 1)},
        prize_counts={k: int(prize_counts.get(k, 0)) for k in range(1, 6)},
        rate_3plus=n3 / total_games if total_games else 0.0, expected_rate_3plus=P_AT_LEAST_3,
        mean_actual_rank=rank_mean, top6_hit_rate=top6_rate, top6_p_value=top6_p, pool_hit_rate=pool_hit, expected_pool_hit_rate=pool_exp,
        filter_excluded_actual_rate=fex, verdict=verdict,
    )


def compare_to_random(rounds: dict[str, list[RoundResult]]) -> dict[str, dict]:
    """각 전략의 회차별 평균 적중을 random 기준선과 대응표본 비교."""
    out = {}
    base = rounds.get("random")
    if not base:
        return out
    base_means = np.array([r.mean for r in base])
    for name, rs in rounds.items():
        if name == "random":
            continue
        means = np.array([r.mean for r in rs])
        diff = means - base_means
        if len(diff) > 1 and diff.std() > 0:
            t = stats.ttest_rel(means, base_means)
            p = float(t.pvalue)
        else:
            p = 1.0
        out[name] = {"mean_diff_per_game": float(diff.mean()), "p_value": p,
                     "better_rounds": int((diff > 0).sum()), "worse_rounds": int((diff < 0).sum()),
                     "tie_rounds": int((diff == 0).sum())}
    return out


def run_backtest(draws: Sequence[Draw], *, strategies: Sequence[str] | None = None, start: int = 2,
                 end: int | None = None, games: int = 5, pool_size: int = 15,
                 pattern_filter: PatternFilter | None = DEFAULT_FILTER, progress: bool = False) -> BacktestResult:
    """start회부터 end회까지를 각각 '직전까지의 데이터'로 예측한다.
    start=2 이면 1회 분석 → 2회 예측부터 시작."""
    names = list(strategies or DEFAULT_ORDER)
    end = end or draws[-1].round
    if start < 2:
        raise ValueError("start는 2 이상이어야 합니다 (1회차는 학습에 최소 필요)")
    if end > draws[-1].round:
        raise ValueError(f"end({end})가 보유 데이터 최신 회차({draws[-1].round})를 넘습니다")
    full_ind = indicator_matrix(draws)
    rounds: dict[str, list[RoundResult]] = {n: [] for n in names}
    total = end - start + 1
    for i, target in enumerate(range(start, end + 1), 1):
        history = draws[:target - 1]
        actual = draws[target - 1]
        assert actual.round == target
        ind = full_ind[:target - 1]
        for n in names:
            _, rr = evaluate_round(STRATEGIES[n], history, actual, games=games, pool_size=pool_size,
                                   pattern_filter=pattern_filter, ind_prefix=ind)
            rounds[n].append(rr)
        if progress and (i % 100 == 0 or i == total):
            print(f"[backtest] {i}/{total} ({target}회)")
    summaries = {n: summarize(STRATEGIES[n], rounds[n], games) for n in names}
    fpr = pattern_filter.pass_rate(draws[start - 1:end]) if pattern_filter else float("nan")
    return BacktestResult(start_round=start, end_round=end, games=games, pool_size=pool_size,
                          rounds=rounds, summaries=summaries, filter_pass_rate_all=fpr,
                          comparison_vs_random=compare_to_random(rounds))

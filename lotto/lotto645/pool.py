"""후보군 방식 예측·백테스트.

  1~n회 분석 → 핵심 후보 CORE개(기본 15) 선별
  비후보군(나머지)에서 WILD개(기본 3) 추가 선별 → 최종 후보 CORE+WILD개(기본 18)
  최종 후보에서 예측 6개(게임) 생성
  n+1회 실제 번호와 비교: 핵심/추가/통합 후보 적중 수, 예측 6개 적중 수, 후보 밖에서 나온 번호(틀린 데이터) 기록
"""
from __future__ import annotations

import csv
import json
import os
from collections import Counter
from dataclasses import dataclass, field, asdict
from math import comb
from typing import Sequence

import numpy as np
from scipy import stats

from .analysis import indicator_matrix
from .data import Draw
from .predictor import DEFAULT_FILTER, PatternFilter, generate_games, match_count, prize_rank, rank_numbers, stable_seed
from .strategies import STRATEGIES, Strategy, gaps_since_last, make_score_recent

N_BALLS = 45
PICK = 6
WILD_RULES = ("cold", "recent", "pair", "random")


def hypergeom_pmf(pool: int) -> dict[int, float]:
    """실제 6개 중 k개가 크기 `pool`인 후보군에 들어갈 확률 (후보군이 무정보일 때)."""
    total = comb(N_BALLS, PICK)
    return {k: comb(pool, k) * comb(N_BALLS - pool, PICK - k) / total for k in range(PICK + 1)}


# ------------------------------------------------------------------ 후보 선별

def select_core(scores: np.ndarray, core: int) -> list[int]:
    return rank_numbers(scores)[:core]


def select_wild(ind: np.ndarray, core_numbers: Sequence[int], wild: int, rule: str, seed: int) -> tuple[list[int], str]:
    """비후보군(핵심 후보 밖 번호)에서 wild개 선별. 선별 근거 문장을 함께 돌려준다."""
    others = [n for n in range(1, N_BALLS + 1) if n not in core_numbers]
    idx = np.array([n - 1 for n in others])
    if rule == "cold":
        gaps = gaps_since_last(ind)[idx]
        order = sorted(range(len(others)), key=lambda i: (-gaps[i], others[i]))
        chosen = [others[i] for i in order[:wild]]
        why = "비후보군 중 가장 오래 안 나온 번호 " + ", ".join(f"{n}({gaps_since_last(ind)[n-1]}회 미출현)" for n in chosen)
    elif rule == "recent":
        sc = make_score_recent(20, 8.0)(ind)[idx]
        order = sorted(range(len(others)), key=lambda i: (-sc[i], others[i]))
        chosen = [others[i] for i in order[:wild]]
        why = "비후보군 중 최근 20회 가중 출현이 많은 번호 " + ", ".join(map(str, chosen))
    elif rule == "pair":
        m = ind.astype(np.int32)
        co = m.T @ m
        np.fill_diagonal(co, 0)
        core_idx = [c - 1 for c in core_numbers]
        aff = co[core_idx].sum(axis=0)[idx]
        order = sorted(range(len(others)), key=lambda i: (-aff[i], others[i]))
        chosen = [others[i] for i in order[:wild]]
        why = "비후보군 중 핵심 후보들과 동반 출현이 많았던 번호 " + ", ".join(map(str, chosen))
    elif rule == "random":
        rng = np.random.default_rng(seed)
        chosen = sorted(int(x) for x in rng.choice(others, size=wild, replace=False))
        why = "비후보군에서 무작위로 " + ", ".join(map(str, chosen))
    else:
        raise ValueError(f"알 수 없는 wild 규칙: {rule} (가능: {', '.join(WILD_RULES)})")
    return chosen, why


# ------------------------------------------------------------------ 회차 결과

@dataclass
class PoolRound:
    target_round: int
    strategy: str
    wild_rule: str
    core: list[int]
    wild: list[int]
    pool: list[int]
    wild_reason: str
    games: list[tuple[int, ...]]
    actual: tuple[int, ...] | None = None
    bonus: int | None = None
    core_hits: list[int] = field(default_factory=list)      # 실제 번호 중 핵심 후보에 있던 것
    wild_hits: list[int] = field(default_factory=list)      # 실제 번호 중 추가 후보에 있던 것
    pool_hit_count: int = 0                                 # 통합 후보(18) 적중 수
    game_matches: list[int] = field(default_factory=list)   # 게임별 적중 수
    game_prizes: list[int | None] = field(default_factory=list)
    best_match: int = 0
    missed_outside: list[dict] = field(default_factory=list)   # 후보 밖에서 나온 번호 + 왜 밀렸나
    missed_inside: list[int] = field(default_factory=list)     # 후보 안엔 있었지만 6개에 못 들어간 실제 번호
    diagnosis: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["games"] = [list(g) for g in self.games]
        d["actual"] = list(self.actual) if self.actual else None
        return d


def build_pool(history: Sequence[Draw], *, strategy: Strategy | str = "ensemble", core: int = 15, wild: int = 3,
               wild_rule: str = "cold", games: int = 1, pattern_filter: PatternFilter | None = DEFAULT_FILTER,
               ind_prefix: np.ndarray | None = None, seed: int | None = None) -> tuple[PoolRound, np.ndarray]:
    """1~n회(history)로 n+1회 후보군과 예측 게임을 만든다."""
    if isinstance(strategy, str):
        strategy = STRATEGIES[strategy]
    if strategy.uniform:
        raise ValueError("후보군 방식에는 점수가 있는 전략이 필요합니다 (balanced/random 제외)")
    ind = ind_prefix if ind_prefix is not None else indicator_matrix(history)
    target = history[-1].round + 1
    if seed is None:
        seed = stable_seed("pool", strategy.name, wild_rule, target, core, wild, games)
    scores = strategy.score(ind)
    core_numbers = select_core(scores, core)
    wild_numbers, why = select_wild(ind, core_numbers, wild, wild_rule, seed)
    pool = sorted(core_numbers + wild_numbers)

    # 최종 후보 안에서만 추출: 후보 밖 번호의 점수를 -inf로 깎아 풀을 pool로 고정
    masked = np.full(N_BALLS, -np.inf)
    for n in pool:
        masked[n - 1] = scores[n - 1]
    pool_scores = masked.copy()
    finite = np.isfinite(pool_scores)
    if finite.sum() and pool_scores[finite].std() > 0:
        pool_scores[finite] = (pool_scores[finite] - pool_scores[finite].mean()) / pool_scores[finite].std()
    else:
        pool_scores[finite] = 0.0
    pool_scores[~finite] = -1e9
    combos, _, _, notes = generate_games(pool_scores, games=games, pool_size=len(pool), seed=seed,
                                         pattern_filter=pattern_filter)
    pr = PoolRound(target_round=target, strategy=strategy.name, wild_rule=wild_rule, core=core_numbers,
                   wild=wild_numbers, pool=pool, wild_reason=why, games=combos)
    if notes:
        pr.diagnosis.append("생성 메모: " + "; ".join(notes))
    return pr, scores


def score_pool_round(pr: PoolRound, scores: np.ndarray, ind: np.ndarray, actual_draw: Draw) -> PoolRound:
    """실제 결과로 채점하고 틀린 데이터·진단을 채운다."""
    actual = actual_draw.numbers
    pr.actual = actual
    pr.bonus = actual_draw.bonus
    pr.core_hits = [a for a in actual if a in pr.core]
    pr.wild_hits = [a for a in actual if a in pr.wild]
    pr.pool_hit_count = len(pr.core_hits) + len(pr.wild_hits)
    pr.game_matches = [match_count(g, actual) for g in pr.games]
    pr.game_prizes = [prize_rank(m, actual_draw.bonus in g) for m, g in zip(pr.game_matches, pr.games)]
    pr.best_match = max(pr.game_matches) if pr.game_matches else 0
    picked = set().union(*pr.games) if pr.games else set()
    pr.missed_inside = [a for a in actual if a in pr.pool and a not in picked]

    ranking = rank_numbers(scores)
    freq = ind.sum(axis=0)
    gaps = gaps_since_last(ind)
    recent = ind[-20:].sum(axis=0)
    pr.missed_outside = []
    for a in actual:
        if a not in pr.pool:
            pr.missed_outside.append({
                "number": a, "rank": ranking.index(a) + 1, "freq": int(freq[a - 1]),
                "freq_mean": round(float(freq.mean()), 1), "gap": int(gaps[a - 1]), "recent20": int(recent[a - 1]),
            })

    core_n, wild_n, pool_n = len(pr.core), len(pr.wild), len(pr.pool)
    exp_core, exp_wild, exp_pool = PICK * core_n / N_BALLS, PICK * wild_n / N_BALLS, PICK * pool_n / N_BALLS
    d = pr.diagnosis
    d.append(f"핵심 후보 {core_n}개 적중 {len(pr.core_hits)}개 {pr.core_hits} (무정보 기대 {exp_core:.2f}개) / "
             f"추가 후보 {wild_n}개 적중 {len(pr.wild_hits)}개 {pr.wild_hits} (기대 {exp_wild:.2f}개) / "
             f"통합 후보 {pool_n}개 적중 {pr.pool_hit_count}개 (기대 {exp_pool:.2f}개).")
    if pr.games:
        d.append(f"예측 {len(pr.games)}게임: 적중 {pr.game_matches} → 최고 {pr.best_match}개 (무작위 기대 0.80개/게임).")
    if pr.missed_outside:
        parts = []
        for m in pr.missed_outside:
            parts.append(f"{m['number']}번(모델 {m['rank']}위, 누적 {m['freq']}회 vs 평균 {m['freq_mean']}회, "
                         f"미출현 {m['gap']}회, 최근20회 {m['recent20']}회)")
        d.append(f"후보 밖에서 나온 번호 {len(pr.missed_outside)}개: " + "; ".join(parts)
                 + " → 모델은 이 번호들을 낮게 봤지만 추첨은 순위를 모른다.")
    else:
        d.append(f"실제 6개가 모두 {pool_n}개 후보 안에 있었음 (무정보 확률 {hypergeom_pmf(pool_n)[6]:.3%}).")
    if pr.missed_inside:
        d.append(f"후보 안에 있었지만 예측 6개에 못 넣은 번호: {pr.missed_inside} "
                 f"({pool_n}개 중 6개를 고르는 조합 {comb(pool_n, 6):,}개 중 하나를 맞혀야 함).")
    if pr.pool_hit_count >= 5:
        d.append(f"참고: 통합 후보에 {pr.pool_hit_count}개 이상 들어오는 일은 무정보에서도 "
                 f"{sum(v for k, v in hypergeom_pmf(pool_n).items() if k >= pr.pool_hit_count):.2%} 확률로 일어남.")
    return pr


# ------------------------------------------------------------------ 백테스트

@dataclass
class PoolBacktest:
    strategy: str
    wild_rule: str
    core: int
    wild: int
    games: int
    start_round: int
    end_round: int
    rounds: list[PoolRound]
    summary: dict


def summarize_pool(rounds: list[PoolRound], core: int, wild: int, games: int) -> dict:
    n = len(rounds)
    pool_n = core + wild
    core_hits = np.array([len(r.core_hits) for r in rounds])
    wild_hits = np.array([len(r.wild_hits) for r in rounds])
    pool_hits = np.array([r.pool_hit_count for r in rounds])
    game_matches = [m for r in rounds for m in r.game_matches]
    round_mean = np.array([np.mean(r.game_matches) for r in rounds if r.game_matches])

    def binom(hits_total, trials, p):
        return float(stats.binomtest(int(hits_total), int(trials), p).pvalue)

    pmf = hypergeom_pmf(pool_n)
    dist = Counter(pool_hits.tolist())
    prizes = Counter(pz for r in rounds for pz in r.game_prizes if pz is not None)
    missed = [m for r in rounds for m in r.missed_outside]
    t = stats.ttest_1samp(round_mean, 0.8) if len(round_mean) > 1 and round_mean.std() > 0 else None
    return {
        "rounds": n,
        "core": {"size": core, "mean_hits": float(core_hits.mean()), "expected": PICK * core / N_BALLS,
                 "hit_rate": float(core_hits.sum() / (n * core)), "expected_rate": PICK / N_BALLS,
                 "p_value": binom(core_hits.sum(), n * core, PICK / N_BALLS)},
        "wild": {"size": wild, "mean_hits": float(wild_hits.mean()), "expected": PICK * wild / N_BALLS,
                 "hit_rate": float(wild_hits.sum() / (n * wild)) if wild else 0.0, "expected_rate": PICK / N_BALLS,
                 "p_value": binom(wild_hits.sum(), n * wild, PICK / N_BALLS) if wild else 1.0},
        "pool": {"size": pool_n, "mean_hits": float(pool_hits.mean()), "expected": PICK * pool_n / N_BALLS,
                 "distribution": {k: int(dist.get(k, 0)) for k in range(PICK + 1)},
                 "theory_distribution": {k: round(pmf[k] * n, 1) for k in range(PICK + 1)},
                 "rounds_all6_in_pool": int(dist.get(6, 0)), "theory_all6": round(pmf[6] * n, 2),
                 "rounds_5plus_in_pool": int(dist.get(5, 0) + dist.get(6, 0)),
                 "theory_5plus": round((pmf[5] + pmf[6]) * n, 1),
                 "p_value": binom(pool_hits.sum(), n * pool_n, PICK / N_BALLS)},
        "games": {"per_round": games, "mean_matches": float(np.mean(game_matches)) if game_matches else 0.0,
                  "expected": 0.8, "t": float(t.statistic) if t else 0.0, "p_value": float(t.pvalue) if t else 1.0,
                  "match_distribution": {k: int(v) for k, v in sorted(Counter(game_matches).items())},
                  "prize_counts": {k: int(prizes.get(k, 0)) for k in range(1, 6)},
                  "best_distribution": {k: int(v) for k, v in sorted(Counter(r.best_match for r in rounds).items())}},
        "missed_outside": {"count": len(missed), "per_round": len(missed) / n if n else 0.0,
                           "expected_per_round": PICK * (N_BALLS - pool_n) / N_BALLS,
                           "mean_rank": float(np.mean([m["rank"] for m in missed])) if missed else None,
                           "expected_mean_rank_if_uniform": (pool_n + 1 + N_BALLS) / 2,
                           "mean_gap": float(np.mean([m["gap"] for m in missed])) if missed else None},
    }


def run_pool_backtest(draws: Sequence[Draw], *, strategy: str = "ensemble", core: int = 15, wild: int = 3,
                      wild_rule: str = "cold", games: int = 1, start: int = 2, end: int | None = None,
                      pattern_filter: PatternFilter | None = DEFAULT_FILTER, progress: bool = False) -> PoolBacktest:
    end = end or draws[-1].round
    if start < 2 or end > draws[-1].round or start > end:
        raise ValueError(f"구간 오류: start={start}, end={end}, 보유 {draws[-1].round}회")
    full_ind = indicator_matrix(draws)
    st = STRATEGIES[strategy]
    rounds: list[PoolRound] = []
    total = end - start + 1
    for i, target in enumerate(range(start, end + 1), 1):
        history = draws[:target - 1]
        ind = full_ind[:target - 1]
        pr, scores = build_pool(history, strategy=st, core=core, wild=wild, wild_rule=wild_rule, games=games,
                                pattern_filter=pattern_filter, ind_prefix=ind)
        rounds.append(score_pool_round(pr, scores, ind, draws[target - 1]))
        if progress and (i % 200 == 0 or i == total):
            print(f"[pool] {i}/{total} ({target}회)")
    return PoolBacktest(strategy=strategy, wild_rule=wild_rule, core=core, wild=wild, games=games,
                        start_round=start, end_round=end, rounds=rounds,
                        summary=summarize_pool(rounds, core, wild, games))


# ------------------------------------------------------------------ 출력

def pool_round_markdown(pr: PoolRound) -> str:
    st = STRATEGIES[pr.strategy]
    L = [f"### {pr.target_round}회 — 1~{pr.target_round - 1}회 분석 ({st.label}, 추가 후보 규칙 `{pr.wild_rule}`)"]
    L.append(f"- 핵심 후보 {len(pr.core)}개: {' '.join(f'{n:2d}' for n in sorted(pr.core))}")
    L.append(f"- 추가 후보 {len(pr.wild)}개: {' '.join(f'{n:2d}' for n in sorted(pr.wild))}  ← {pr.wild_reason}")
    L.append(f"- 최종 후보 {len(pr.pool)}개: {' '.join(f'{n:2d}' for n in pr.pool)}")
    for i, g in enumerate(pr.games, 1):
        line = f"- 예측 {chr(64 + i)}: {' '.join(f'{n:2d}' for n in g)}"
        if pr.actual is not None:
            hit = sorted(set(g) & set(pr.actual))
            m = pr.game_matches[i - 1]
            pz = pr.game_prizes[i - 1]
            line += f" → {m}개 적중" + (f" {hit}" if hit else "") + (f" **{pz}등**" if pz else "")
        L.append(line)
    if pr.actual is not None:
        mark = " ".join(f"**{n}**" if n in pr.pool else f"~~{n}~~" for n in pr.actual)
        L.append(f"- 실제 당첨번호: {mark} + 보너스 {pr.bonus}  (굵게 = 후보 안, 취소선 = 후보 밖)")
    for d in pr.diagnosis:
        L.append(f"  - {d}")
    return "\n".join(L) + "\n"


def pool_summary_markdown(bt: PoolBacktest, detail_rounds: Sequence[int] = ()) -> str:
    s = bt.summary
    st = STRATEGIES[bt.strategy]
    L = [f"# 후보군 백테스트: {bt.start_round}회 ~ {bt.end_round}회 ({s['rounds']}회차)\n"]
    L.append(f"- 핵심 후보 {bt.core}개 선별 전략: {st.label} (`{bt.strategy}`)")
    L.append(f"- 추가 후보 {bt.wild}개 규칙: `{bt.wild_rule}` → 최종 후보 {bt.core + bt.wild}개 → 예측 {bt.games}게임")
    L.append("- 모든 회차는 직전 회차까지의 데이터만 사용 (1회 분석 → 2회 예측부터 시작)\n")
    L.append("## 후보군 적중 (회차당 평균, 무정보 기대와 비교)")
    rows = []
    for key, label in (("core", f"핵심 후보 {bt.core}개"), ("wild", f"추가 후보 {bt.wild}개"), ("pool", f"통합 후보 {bt.core + bt.wild}개")):
        v = s[key]
        rows.append([label, f"{v['mean_hits']:.3f}", f"{v['expected']:.3f}",
                     f"{v.get('hit_rate', v['mean_hits'] / v['size']) * 100:.2f}%", "13.33%", f"{v['p_value']:.3f}"])
    L.append("| 후보군 | 평균 적중 | 무정보 기대 | 번호당 적중률 | 기대 | p |")
    L.append("|---|---|---|---|---|---|")
    for r in rows:
        L.append("| " + " | ".join(r) + " |")
    p = s["pool"]
    L.append("")
    L.append(f"### 통합 후보 {p['size']}개에 실제 6개 중 몇 개가 들어왔나 (관측 / 이론)")
    L.append("| 들어온 개수 | " + " | ".join(str(k) for k in range(7)) + " |")
    L.append("|---|" + "---|" * 7)
    L.append("| 관측 회차 | " + " | ".join(str(p["distribution"][k]) for k in range(7)) + " |")
    L.append("| 이론 회차 | " + " | ".join(str(p["theory_distribution"][k]) for k in range(7)) + " |")
    L.append(f"- 6개 전부 후보 안: {p['rounds_all6_in_pool']}회 (이론 {p['theory_all6']}회), "
             f"5개 이상: {p['rounds_5plus_in_pool']}회 (이론 {p['theory_5plus']}회)")
    g = s["games"]
    L.append("")
    L.append(f"## 예측 6개 적중 (회차당 {g['per_round']}게임)")
    L.append(f"- 게임당 평균 적중 {g['mean_matches']:.3f}개 (무작위 기대 0.800), t={g['t']:+.2f}, p={g['p_value']:.3f}")
    L.append(f"- 적중 수 분포: {g['match_distribution']}")
    L.append(f"- 등수별 횟수: " + (", ".join(f"{k}등 {v}회" for k, v in g['prize_counts'].items() if v) or "없음"))
    m = s["missed_outside"]
    L.append("")
    L.append("## 틀린 데이터: 후보 밖에서 나온 번호")
    L.append(f"- 회차당 평균 {m['per_round']:.3f}개가 후보 밖에서 나옴 (무정보 기대 {m['expected_per_round']:.3f}개), 총 {m['count']}개")
    if m["mean_rank"] is not None:
        L.append(f"- 그 번호들의 모델 순위 평균 {m['mean_rank']:.1f}위 (후보 밖 순위가 균등하면 {m['expected_mean_rank_if_uniform']:.1f}위), "
                 f"평균 미출현 {m['mean_gap']:.1f}회")
    L.append("")
    L.append("## 판정")
    verdicts = []
    for key, label in (("core", "핵심 후보"), ("pool", "통합 후보")):
        v = s[key]
        if v["p_value"] < 0.05:
            verdicts.append(f"- {label}: 번호당 적중률 {v.get('hit_rate', v['mean_hits']/v['size'])*100:.2f}%가 13.33%와 유의하게 다름(p={v['p_value']:.3f}). "
                            + ("기대보다 높음 — 다른 구간/전략에서 재현되는지 확인 필요." if v["mean_hits"] > v["expected"] else
                               "기대보다 낮음 — 선별이 오히려 역효과(가정과 반대 방향)."))
        else:
            verdicts.append(f"- {label}: 적중률이 무정보 선별(아무 {v['size']}개)과 구별되지 않음(p={v['p_value']:.3f}).")
    gv = s["games"]
    verdicts.append(f"- 예측 6개: " + ("무작위와 구별되지 않음" if gv["p_value"] >= 0.05 else "무작위와 유의하게 다름") + f" (p={gv['p_value']:.3f}).")
    L.extend(verdicts)
    L.append("")
    L.append("**왜 틀리는가.** 후보 18개를 아무리 잘 골라도 실제 6개가 그 안에 들어오는 비율은 18/45=40%로 고정되고, "
             "18개 안에서 6개를 맞히는 것도 18,564개 조합 중 하나를 고르는 문제입니다. 후보 밖에서 나온 번호들의 "
             "모델 순위가 후보 밖 구간에 균등하게 퍼져 있다는 것은, 모델이 '낮게 본 이유'가 다음 추첨과 무관했다는 뜻입니다.")
    if detail_rounds:
        L.append("\n## 회차별 상세 (예시)\n")
        by = {r.target_round: r for r in bt.rounds}
        for tr in detail_rounds:
            if tr in by:
                L.append(pool_round_markdown(by[tr]))
    return "\n".join(L) + "\n"


def write_pool_outputs(bt: PoolBacktest, out_dir: str, detail_rounds: Sequence[int] = ()) -> dict[str, str]:
    os.makedirs(out_dir, exist_ok=True)
    tag = f"{bt.strategy}_{bt.wild_rule}_{bt.core}p{bt.wild}"
    paths = {}
    md = os.path.join(out_dir, f"pool_summary_{tag}.md")
    with open(md, "w", encoding="utf-8") as f:
        f.write(pool_summary_markdown(bt, detail_rounds))
    paths["summary_md"] = md
    js = os.path.join(out_dir, f"pool_summary_{tag}.json")
    with open(js, "w", encoding="utf-8") as f:
        json.dump({"strategy": bt.strategy, "wild_rule": bt.wild_rule, "core": bt.core, "wild": bt.wild,
                   "games": bt.games, "start_round": bt.start_round, "end_round": bt.end_round,
                   "summary": bt.summary}, f, ensure_ascii=False, indent=2)
    paths["summary_json"] = js
    cp = os.path.join(out_dir, f"pool_rounds_{tag}.csv")
    with open(cp, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["round", "actual", "bonus", "core15", "wild", "pool", "games", "core_hits", "wild_hits",
                    "pool_hit_count", "game_matches", "best", "missed_outside(number:rank:gap)", "missed_inside",
                    "diagnosis"])
        for r in bt.rounds:
            w.writerow([r.target_round, " ".join(map(str, r.actual)), r.bonus,
                        " ".join(map(str, sorted(r.core))), " ".join(map(str, sorted(r.wild))), " ".join(map(str, r.pool)),
                        ";".join(" ".join(map(str, g)) for g in r.games),
                        " ".join(map(str, r.core_hits)), " ".join(map(str, r.wild_hits)), r.pool_hit_count,
                        " ".join(map(str, r.game_matches)), r.best_match,
                        " ".join(f"{m['number']}:{m['rank']}:{m['gap']}" for m in r.missed_outside),
                        " ".join(map(str, r.missed_inside)), " ".join(r.diagnosis)])
    paths["rounds_csv"] = cp
    return paths

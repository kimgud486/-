"""분석·예측·백테스트 결과를 사람이 읽는 마크다운/JSON으로 만든다."""
from __future__ import annotations

import csv
import json
import os
from typing import Sequence

import numpy as np

from .backtest import BacktestResult, RoundResult, EXPECTED_MATCHES_PER_GAME, P_AT_LEAST_3
from .data import Draw
from .predictor import Prediction
from .strategies import STRATEGIES


def _table(headers: Sequence[str], rows: Sequence[Sequence]) -> str:
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out)


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


# ------------------------------------------------------------------ 분석 리포트

def analysis_markdown(a: dict) -> str:
    L = []
    L.append(f"# 로또 6/45 상세 분석 (1~{a['rounds']}회, {a['first_date']} ~ {a['last_date']})\n")
    u = a["frequency_uniformity"]
    L.append("## 1. 번호별 출현 빈도")
    L.append(f"- 번호당 기대 출현: {u['expected_per_number']:.1f}회")
    L.append(f"- 카이제곱 균등성 검정: χ²={u['chi2']:.1f} (자유도 {u['dof']}), p={u['p_value']:.3f} → **{u['verdict']}**")
    hot = ", ".join(f"{n}({c})" for n, c in a["hot_cold"]["hot"])
    cold = ", ".join(f"{n}({c})" for n, c in a["hot_cold"]["cold"])
    L.append(f"- 최다 출현 10개: {hot}")
    L.append(f"- 최소 출현 10개: {cold}")
    freq = a["frequency"]
    rows = [[n, freq[n], f"{(freq[n] - u['expected_per_number']) / np.sqrt(u['expected_per_number'] * (1 - 6/45)):+.2f}",
             a["bonus_frequency"][n], a["gaps"][n]["since_last"], a["gaps"][n]["max_ever"]] for n in range(1, 46)]
    L.append("\n<details><summary>번호별 상세 표</summary>\n")
    L.append(_table(["번호", "출현", "z", "보너스", "현재 미출현", "역대 최장 미출현"], rows))
    L.append("\n</details>\n")
    L.append("- 현재 가장 오래 안 나온 번호: " + ", ".join(f"{n}({g}회)" for n, g in a["longest_absent"]))

    p = a["patterns"]
    L.append("\n## 2. 조합 패턴")
    s = p["sum"]
    L.append(f"- 합계: 평균 {s['mean']:.1f} (이론 {s['theory_mean']:.0f}), 표준편차 {s['std']:.1f}, 범위 {s['min']}~{s['max']}, "
             f"백분위 5/25/50/75/95 = {s['percentiles'][5]}/{s['percentiles'][25]}/{s['percentiles'][50]}/{s['percentiles'][75]}/{s['percentiles'][95]}")
    oe = p["odd_even"]
    L.append(f"- 홀수 개수 분포 (관측 / 이론), 카이제곱 p={oe['chi2_p']:.3f}:")
    L.append(_table(["홀수 개수"] + [str(k) for k in range(7)],
                    [["관측"] + [oe["observed"].get(k, 0) for k in range(7)],
                     ["이론"] + [oe["theory"][k] for k in range(7)]]))
    lh = p["low_high"]
    L.append("- 저구간(1~22) 개수 분포 (관측 / 이론):")
    L.append(_table(["저구간 개수"] + [str(k) for k in range(7)],
                    [["관측"] + [lh["observed"].get(k, 0) for k in range(7)],
                     ["이론"] + [lh["theory"][k] for k in range(7)]]))
    L.append(f"- 연번 쌍 개수 분포: {p['consecutive_pairs']}")
    L.append(f"- AC값 분포: {p['ac']}")
    L.append(f"- 사용 구간 수(1-10/11-20/21-30/31-40/41-45) 분포: {p['sections_used']}")
    L.append(f"- 같은 끝수 최대 개수 분포: {p['max_same_last_digit']}")
    L.append("- 구간별 출현 (관측 vs 기대): " + ", ".join(f"{k} {v['count']}/{v['expected']}" for k, v in a["sections"].items()))
    L.append("- 끝수별 출현 (관측 vs 기대): " + ", ".join(f"끝{k} {v['count']}/{v['expected']}" for k, v in a["last_digit"].items()))

    L.append("\n## 3. 예측 가능성 검정 (핵심)")
    r = a["repeat_rate"]
    L.append(f"- 직전 회차 번호 재출현: 회차당 평균 {r['mean_repeats_per_draw']:.3f}개 (독립 기대 {r['expected_per_draw']:.3f}개), "
             f"재출현률 {_pct(r['observed_rate'])} vs {_pct(r['expected_rate'])}, p={r['p_value']:.3f} → **{r['verdict']}**")
    L.append(f"  - 재출현 개수 분포: {r['distribution']}")
    h = a["hot_persistence"]
    L.append(f"- 핫넘버 지속성: 최근 {h['window']}회 상위 {h['top_k']}개가 다음 회차에 나온 비율 {_pct(h['hot_hit_rate'])} "
             f"(기대 {_pct(h['expected_rate'])}, p={h['hot_p_value']:.3f}); 콜드 하위 {h['top_k']}개는 {_pct(h['cold_hit_rate'])} "
             f"(p={h['cold_p_value']:.3f}) — {h['n_rounds_tested']}회차 검증")
    ac = a["autocorrelation"]
    L.append("- 번호 출현의 시차 자기상관(45개 평균; 독립이면 0, 유의 범위 ±" + f"{ac[1]['approx_2se']:.3f}):")
    L.append(_table(["시차", "평균 r", "유의 범위 벗어난 번호 수(45개 중, 우연 기대 ≈2개)"],
                    [[lag, f"{v['mean_r']:+.4f}", v["n_numbers_outside_2se"]] for lag, v in ac.items()]))
    L.append(f"- 동반출현 상위 쌍 (기대 {a['pair_expected']:.1f}회): " + ", ".join(f"({x},{y}) {c}회" for x, y, c in a["top_pairs"]))
    L.append("  - 990개 쌍 중 최대값은 기대치의 1.5~2배가 되는 것이 정상적인 극값 분포임.")

    pz = a.get("prizes") or {}
    if pz:
        L.append("\n## 4. 당첨/판매 요약")
        L.append(f"- 1등 당첨자 있는 회차 {pz['rounds_with_first_winner']}회, 없는 회차 {pz['rounds_without_first_winner']}회")
        L.append(f"- 회차당 평균 1등 {pz['avg_first_winners']:.1f}명 (최대 {pz['max_first_winners']}명), 평균 1등 당첨금 {pz['avg_first_prize'] / 1e8:.1f}억 원 "
                 f"(최대 {pz['max_first_prize'] / 1e8:.1f}억 원)")
        L.append(f"- 최근 52회: 평균 1등 {pz['recent_52_avg_first_winners']:.1f}명, 평균 당첨금 {pz['recent_52_avg_first_prize'] / 1e8:.1f}억 원, "
                 f"평균 판매액 {pz['recent_52_avg_sales'] / 1e8:.0f}억 원")

    L.append("\n## 결론")
    L.append("번호 빈도·패턴·시차 상관 어느 것도 무작위 추첨과 구별되지 않습니다. 이는 과거 데이터에 "
             "다음 회차를 맞힐 정보가 없다는 뜻이며, 아래 백테스트가 그 사실을 전략별로 확인합니다.")
    return "\n".join(L) + "\n"


# ------------------------------------------------------------------ 예측 리포트

def prediction_markdown(preds: Sequence[Prediction], latest: Draw) -> str:
    L = [f"# {preds[0].target_round}회 예측 (1~{latest.round}회 데이터 기준, 최신 추첨일 {latest.date})\n"]
    L.append("> 주의: 아래 조합의 당첨 확률은 어떤 전략이든 게임당 1/8,145,060으로 동일합니다. "
            "전략은 '다른 방식으로 번호를 고르는 규칙'일 뿐이며, 백테스트에서 무작위를 이기지 못했습니다.\n")
    for p in preds:
        st = STRATEGIES[p.strategy]
        L.append(f"## {st.label} (`{p.strategy}`)")
        L.append(f"- 가정: {st.assumption}")
        if not st.uniform:
            L.append("- 점수 상위 15개: " + ", ".join(str(n) for n in p.ranking[:15]))
        L.append(f"- 필터 적용: {'예' if p.filter_used else '아니오'}" + (f", 필터로 버린 후보 {p.rejected_by_filter}개" if p.filter_used else ""))
        for i, g in enumerate(p.games, 1):
            L.append(f"  - {chr(64 + i)}: " + " ".join(f"{n:2d}" for n in g))
        for n in p.notes:
            L.append(f"- 메모: {n}")
        L.append("")
    return "\n".join(L)


# ------------------------------------------------------------------ 백테스트 리포트

def round_markdown(rr: RoundResult, history_rounds: int) -> str:
    st = STRATEGIES[rr.strategy]
    L = [f"### {st.label} (`{rr.strategy}`) — 1~{history_rounds}회 분석 → {rr.target_round}회 예측"]
    L.append(f"- 실제 당첨번호: {' '.join(f'{n:2d}' for n in rr.actual)} + 보너스 {rr.bonus}")
    for i, (g, m, pz) in enumerate(zip(rr.games, rr.matches, rr.prizes), 1):
        hit = sorted(set(g) & set(rr.actual))
        L.append(f"- 게임 {chr(64 + i)}: {' '.join(f'{n:2d}' for n in g)} → {m}개 적중"
                 + (f" {hit}" if hit else "") + (f" **{pz}등**" if pz else ""))
    L.append("- 진단:")
    for d in rr.diagnosis:
        L.append(f"  - {d}")
    return "\n".join(L) + "\n"


def backtest_markdown(bt: BacktestResult, *, detail_rounds: Sequence[int] = ()) -> str:
    L = [f"# 워크포워드 백테스트: {bt.start_round}회 ~ {bt.end_round}회 "
         f"({bt.end_round - bt.start_round + 1}회차, 회차당 {bt.games}게임, 풀 {bt.pool_size}개)\n"]
    L.append("각 회차 n은 **1~(n-1)회 데이터만으로** 예측했습니다(미래 정보 없음). "
             f"무작위 선택의 기대 적중은 게임당 {EXPECTED_MATCHES_PER_GAME:.2f}개, 3개 이상(5등 이상) 확률은 게임당 {P_AT_LEAST_3 * 100:.2f}%입니다.\n")
    L.append("## 전략별 성적")
    rows = []
    for name, s in bt.summaries.items():
        cmp = bt.comparison_vs_random.get(name)
        rows.append([
            f"{s.label} (`{name}`)", s.rounds, f"{s.mean_matches:.3f}", f"{s.t_vs_theory:+.2f}", f"{s.p_value_vs_theory:.3f}",
            f"{_pct(s.rate_3plus)} / {_pct(s.expected_rate_3plus)}",
            " ".join(f"{k}등 {v}" for k, v in s.prize_counts.items() if v) or "-",
            f"{s.mean_actual_rank:.1f}" if s.mean_actual_rank is not None else "-",
            (f"{_pct(s.top6_hit_rate)} (p={s.top6_p_value:.3f})") if s.top6_hit_rate is not None else "-",
            (f"{_pct(s.pool_hit_rate)} / {_pct(s.expected_pool_hit_rate)}") if s.pool_hit_rate is not None else "-",
            _pct(s.filter_excluded_actual_rate) if s.filter_excluded_actual_rate is not None else "-",
            (f"{cmp['mean_diff_per_game']:+.3f} (p={cmp['p_value']:.3f})") if cmp else "기준선",
        ])
    L.append(_table(["전략", "회차", "게임당 평균 적중 (기대 0.800)", "t", "p", "3개↑ 비율 / 기대", "등수별 횟수",
                     "실제번호 평균 순위 (무정보 23)", "상위6개 적중률 (기대 13.3%)", "풀 적중률 / 기대", "필터가 실제조합 배제", "vs random 게임당 차이"], rows))
    L.append("")
    L.append("### 적중 수 분포 (게임 단위, 관측 / 이론)")
    for name, s in bt.summaries.items():
        obs = " ".join(f"{k}개:{s.match_distribution[k]}" for k in range(7))
        th = " ".join(f"{k}개:{s.theory_distribution[k]}" for k in range(7))
        L.append(f"- `{name}` 관측 {obs}")
        L.append(f"  - 이론 {th}")
    L.append("")
    L.append("### 판정")
    for name, s in bt.summaries.items():
        L.append(f"- **{s.label}**: {s.verdict}")
    sig_pos = [n for n, s in bt.summaries.items() if s.p_value_vs_theory < 0.05 and s.t_vs_theory > 0]
    sig_neg = [n for n, s in bt.summaries.items() if s.p_value_vs_theory < 0.05 and s.t_vs_theory < 0]
    L.append("")
    L.append(f"- 전 구간 실제 당첨 조합 중 패턴 필터 통과율: {_pct(bt.filter_pass_rate_all)} "
             "(필터를 쓰면 이만큼의 실제 조합은 처음부터 만들 수 없음)")
    if sig_pos:
        L.append(f"- p<0.05로 기대치를 넘은 전략: {', '.join(sig_pos)}. 전략 {len(bt.summaries)}개를 동시에 검정하면 "
                 "우연히 하나쯤 p<0.05가 나올 확률이 약 1/3이므로 다른 구간에서 재현되는지 확인해야 합니다.")
    else:
        L.append("- 어떤 전략도 무작위 기대치를 유의하게 넘지 못했습니다.")
    if sig_neg:
        L.append(f"- 기대치 아래로 p<0.05인 전략: {', '.join(sig_neg)}. 이 전략들이 고른 '상위 6개' 번호의 실제 출현률이 "
                 "13.3%보다 조금 낮았다는 뜻으로, 전략의 가정(그 번호가 더 나온다)과 정반대입니다. "
                 "점수 기반 전략들은 같은 빈도 신호를 공유하므로 독립된 증거가 아니라 하나의 신호이며, "
                 f"{len(bt.summaries)}개 전략을 동시에 검정하면 우연히 생길 수 있는 크기입니다. "
                 "어느 쪽이든 '당첨번호를 맞히는 정보'는 아닙니다.")
    L.append("")
    L.append("## 왜 계속 틀리는가 (회차별 진단의 공통 결론)")
    L.append("1. **번호 순위에 정보가 없음**: 실제 당첨번호의 모델 순위 평균이 23위 근처(무정보 기준)로, 어떤 점수도 "
             "당첨번호를 위로 올려놓지 못했습니다.")
    L.append("2. **풀 적중률 = 풀 크기/45**: 상위 K개 풀에 실제 번호가 들어오는 비율이 정확히 K/45로, 풀 선정이 무작위와 같습니다.")
    L.append("3. **가정 검증 실패**: 핫넘버는 계속 핫하지 않고, 콜드넘버는 '나올 때'가 따로 없으며, 직전 회차 번호 재출현은 "
             "기대 0.8개 그대로이고, 동반출현 쌍은 990개 쌍의 자연스런 극값일 뿐입니다.")
    L.append("4. **필터는 확률을 바꾸지 못함**: 필터는 실제 당첨 조합의 일부를 아예 배제하면서도, 남긴 조합의 당첨 확률을 올리지 않습니다.")
    L.append("5. **그래서 틀린 이유는 계산 실수가 아니라 추첨의 독립성**입니다. 매 회차 8,145,060개 조합이 같은 확률을 가지며, "
             "과거 데이터로 이 확률을 바꿀 수 없습니다.")
    if detail_rounds:
        L.append("\n## 회차별 상세 진단 (예시)")
        for tr in detail_rounds:
            L.append(f"\n## {tr}회 ({tr - 1}회까지 분석 → {tr}회 예측)\n")
            for name, rr in bt.round_results(tr).items():
                L.append(round_markdown(rr, tr - 1))
    return "\n".join(L) + "\n"


def write_backtest_outputs(bt: BacktestResult, out_dir: str, *, detail_rounds: Sequence[int] = ()) -> dict[str, str]:
    os.makedirs(out_dir, exist_ok=True)
    paths = {}
    md = os.path.join(out_dir, "backtest_summary.md")
    with open(md, "w", encoding="utf-8") as f:
        f.write(backtest_markdown(bt, detail_rounds=detail_rounds))
    paths["summary_md"] = md

    js = os.path.join(out_dir, "backtest_summary.json")
    with open(js, "w", encoding="utf-8") as f:
        json.dump({
            "start_round": bt.start_round, "end_round": bt.end_round, "games": bt.games, "pool_size": bt.pool_size,
            "filter_pass_rate_all": bt.filter_pass_rate_all,
            "summaries": {k: v.to_dict() for k, v in bt.summaries.items()},
            "comparison_vs_random": bt.comparison_vs_random,
        }, f, ensure_ascii=False, indent=2)
    paths["summary_json"] = js

    cp = os.path.join(out_dir, "backtest_rounds.csv")
    with open(cp, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["target_round", "strategy", "actual", "bonus", "games", "matches", "best", "mean",
                    "actual_mean_rank", "in_pool", "pool_size", "filter_violations", "diagnosis"])
        for name, rs in bt.rounds.items():
            for r in rs:
                w.writerow([r.target_round, name, " ".join(map(str, r.actual)), r.bonus,
                            ";".join(" ".join(map(str, g)) for g in r.games), " ".join(map(str, r.matches)),
                            r.best, f"{r.mean:.3f}", f"{np.mean(r.actual_ranks):.2f}", r.in_pool, r.pool_size,
                            " / ".join(r.filter_violations), " ".join(r.diagnosis)])
    paths["rounds_csv"] = cp
    return paths

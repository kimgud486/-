"""기계학습 예측 시험: 번호별 특징으로 '다음 회차에 나올 확률'을 학습한다.

각 (회차 n, 번호 k) 행에 n회까지의 특징을 만들고, 정답은 n+1회에 k가 나왔는지(0/1).
그래디언트 부스팅을 전진 방식(과거만 학습)으로 학습해 다음 회차를 예측하고,
AUC(0.5 = 정보 없음)와 상위 6/15개 적중률(13.3% = 정보 없음)로 평가한다.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats

from .analysis import indicator_matrix
from .data import Draw

N_BALLS = 45
PICK = 6

FEATURE_NAMES = [
    "number", "odd", "section", "last_digit",
    "freq_all_norm", "freq_z", "gap", "gap_over_mean", "max_gap_hist",
    "recent5", "recent10", "recent20", "recent50",
    "in_last", "in_last2", "streak",
    "ewm8", "ewm20",
    "trans_from_last", "co_with_last",
    "sum_last", "odd_last", "low_last",
]


def build_features(ind: np.ndarray, trans: np.ndarray, co: np.ndarray, max_gap: np.ndarray) -> np.ndarray:
    """ind: (n,45) 학습 구간 지표. n회까지 본 뒤 n+1회를 위한 45×F 특징."""
    n = len(ind)
    freq = ind.sum(axis=0).astype(float)
    exp = n * PICK / N_BALLS
    freq_norm = freq / max(n, 1)
    freq_z = (freq - exp) / np.sqrt(max(exp * (1 - PICK / N_BALLS), 1e-9))
    rev = ind[::-1]
    seen = rev.any(axis=0)
    gap = np.where(seen, rev.argmax(axis=0), n).astype(float)
    gap_mean = gap.mean() if gap.mean() > 0 else 1.0

    def recent(w):
        return ind[-w:].sum(axis=0).astype(float)

    last = ind[-1].astype(float)
    last2 = ind[-2].astype(float) if n >= 2 else np.zeros(N_BALLS)
    # 연속 출현 길이
    streak = np.zeros(N_BALLS)
    for i in range(n - 1, -1, -1):
        alive = ind[i] == 1
        if not alive.any():
            break
        streak += alive & (streak == (n - 1 - i))
    def ewm(hl):
        w = 0.5 ** (np.arange(n)[::-1] / hl)
        return (ind * w[:, None]).sum(axis=0)
    last_idx = np.where(ind[-1] == 1)[0]
    row = ind[:-1].sum(axis=0) if n >= 2 else np.ones(N_BALLS)
    trans_p = trans / np.where(row == 0, 1, row)[:, None]
    trans_from_last = trans_p[last_idx].sum(axis=0) if len(last_idx) else np.zeros(N_BALLS)
    co_with_last = co[last_idx].sum(axis=0).astype(float) / max(n, 1) if len(last_idx) else np.zeros(N_BALLS)
    nums = np.arange(1, N_BALLS + 1)
    last_nums = nums[ind[-1] == 1]
    sum_last = np.full(N_BALLS, last_nums.sum(), dtype=float)
    odd_last = np.full(N_BALLS, (last_nums % 2).sum(), dtype=float)
    low_last = np.full(N_BALLS, (last_nums <= 22).sum(), dtype=float)
    X = np.column_stack([
        nums, nums % 2, (nums - 1) // 10, nums % 10,
        freq_norm, freq_z, gap, gap / gap_mean, max_gap,
        recent(5), recent(10), recent(20), recent(50),
        last, last2, streak,
        ewm(8), ewm(20),
        trans_from_last, co_with_last,
        sum_last, odd_last, low_last,
    ]).astype(float)
    return X


@dataclass
class MLResult:
    start: int
    end: int
    n_rounds: int
    auc: float
    auc_ci_low: float
    auc_ci_high: float
    top6_hit_rate: float
    top6_p: float
    top15_hit_rate: float
    top15_p: float
    mean_rank_of_actual: float
    importances: dict
    refit_every: int
    model_name: str


def run_ml(draws: list[Draw], *, start: int = 200, end: int | None = None, refit_every: int = 25,
           progress: bool = False, model: str = "hgb") -> MLResult:
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    end = end or draws[-1].round
    full = indicator_matrix(draws).astype(np.int32)
    N = len(full)

    # 특징 행렬을 회차마다 미리 만든다 (각 n은 1~n회만 사용)
    feats = {}
    trans = np.zeros((N_BALLS, N_BALLS), dtype=np.int64)
    co = np.zeros((N_BALLS, N_BALLS), dtype=np.int64)
    last_seen = np.full(N_BALLS, -1)
    max_gap = np.zeros(N_BALLS)
    for n in range(1, N):                      # n회까지 봄 → feats[n]은 n+1회 예측용
        if n >= 2:
            trans += np.outer(full[n - 2], full[n - 1])
        co += np.outer(full[n - 1], full[n - 1])
        cur = full[n - 1] == 1
        max_gap = np.maximum(max_gap, np.where(cur, n - 1 - last_seen - 1, 0))
        last_seen[cur] = n - 1
        if n >= 30:
            feats[n] = build_features(full[:n], trans.copy(), co.copy(), np.maximum(max_gap, n - 1 - last_seen))
    y_of = {n: full[n] for n in range(N)}      # y_of[n] = n+1회(index n) 결과

    def make_model():
        if model == "logit":
            return make_pipeline(StandardScaler(), LogisticRegression(max_iter=500, C=0.5))
        return HistGradientBoostingClassifier(max_iter=150, learning_rate=0.05, max_depth=4,
                                              l2_regularization=1.0, random_state=0)

    all_scores, all_y, ranks, top6_hits, top15_hits = [], [], [], 0, 0
    clf = None
    targets = list(range(start, end + 1))
    for i, target in enumerate(targets):
        n = target - 1                          # n회까지 학습, target회 예측
        if clf is None or i % refit_every == 0:
            # 학습 데이터: 30회~(n-1)회까지의 특징과 그 다음 회차 결과 (target회 정보는 포함 안 됨)
            Xs = [feats[m] for m in range(30, n) if m in feats]
            ys = [y_of[m] for m in range(30, n)]
            X = np.vstack(Xs); y = np.concatenate(ys)
            clf = make_model().fit(X, y)
        p = clf.predict_proba(feats[n])[:, 1]
        y = y_of[n]
        all_scores.append(p); all_y.append(y)
        order = np.argsort(-p, kind="stable")
        top6_hits += int(y[order[:6]].sum()); top15_hits += int(y[order[:15]].sum())
        rank_pos = np.empty(N_BALLS); rank_pos[order] = np.arange(1, N_BALLS + 1)
        ranks.extend(rank_pos[y == 1].tolist())
        if progress and ((i + 1) % 200 == 0 or i + 1 == len(targets)):
            print(f"[ml] {i + 1}/{len(targets)} ({target}회)")

    S = np.concatenate(all_scores); Y = np.concatenate(all_y)
    auc = roc_auc_score(Y, S)
    # 회차 단위 부트스트랩 신뢰구간
    rng = np.random.default_rng(0)
    R = len(all_scores)
    boots = []
    for _ in range(200):
        idx = rng.integers(0, R, R)
        boots.append(roc_auc_score(np.concatenate([all_y[j] for j in idx]), np.concatenate([all_scores[j] for j in idx])))
    lo, hi = np.percentile(boots, [2.5, 97.5])
    p0 = PICK / N_BALLS
    imp = {}
    if model != "logit":
        try:
            from sklearn.inspection import permutation_importance
            Xl = feats[end - 1]; yl = y_of[end - 1]
            # 마지막 학습 모델의 특징 중요도(마지막 50회 묶음으로 계산)
            Xp = np.vstack([feats[m] for m in range(end - 51, end - 1)]); yp = np.concatenate([y_of[m] for m in range(end - 51, end - 1)])
            r = permutation_importance(clf, Xp, yp, n_repeats=5, random_state=0, scoring="roc_auc")
            imp = {FEATURE_NAMES[k]: float(r.importances_mean[k]) for k in np.argsort(-r.importances_mean)[:8]}
        except Exception:
            imp = {}
    return MLResult(
        start=start, end=end, n_rounds=R, auc=float(auc), auc_ci_low=float(lo), auc_ci_high=float(hi),
        top6_hit_rate=top6_hits / (6 * R), top6_p=float(stats.binomtest(top6_hits, 6 * R, p0).pvalue),
        top15_hit_rate=top15_hits / (15 * R), top15_p=float(stats.binomtest(top15_hits, 15 * R, p0).pvalue),
        mean_rank_of_actual=float(np.mean(ranks)), importances=imp, refit_every=refit_every,
        model_name="HistGradientBoosting" if model != "logit" else "LogisticRegression",
    )


def ml_markdown(r: MLResult) -> str:
    L = [f"# 기계학습 예측 시험 ({r.model_name}, {r.start}~{r.end}회, {r.n_rounds}회차 전진 검증)\n"]
    L.append(f"- 특징 {len(FEATURE_NAMES)}개(번호 속성, 누적 빈도, 미출현, 최근 5/10/20/50회, 직전 출현, 연속 출현, "
             f"지수가중, 직전 회차 전이·동반, 직전 회차 합계/홀짝/고저), {r.refit_every}회차마다 재학습, 미래 정보 없음")
    L.append(f"- **AUC {r.auc:.4f}** (95% 신뢰구간 {r.auc_ci_low:.3f}~{r.auc_ci_high:.3f}; 0.5 = 정보 없음)")
    L.append(f"- 모델 상위 6개 번호의 실제 적중률 {r.top6_hit_rate * 100:.2f}% (무정보 13.33%, p={r.top6_p:.3f})")
    L.append(f"- 모델 상위 15개 번호의 실제 적중률 {r.top15_hit_rate * 100:.2f}% (무정보 13.33%, p={r.top15_p:.3f})")
    L.append(f"- 실제 당첨번호의 모델 순위 평균 {r.mean_rank_of_actual:.1f}위 (무정보 23.0위)")
    if r.importances:
        L.append("- 모델이 가장 의존한 특징(순열 중요도, AUC 기준): " + ", ".join(f"{k} {v:+.4f}" for k, v in r.importances.items()))
    verdict = ("무작위와 구별되지 않음 — 23개 특징 어디에도 다음 회차 정보가 없음"
               if r.auc_ci_low <= 0.5 <= r.auc_ci_high or abs(r.auc - 0.5) < 0.01
               else "0.5에서 벗어남 — 누출이나 우연 여부를 반드시 재검증할 것")
    L.append(f"\n**판정: {verdict}.**")
    return "\n".join(L) + "\n"

"""번호 인기도 추정: 어떤 번호가 들어간 조합이 나오면 1등 당첨자가 많아지는가.

1~3등은 당첨자끼리 상금을 나누므로, 남들이 덜 고르는 번호로 조합하면 적중 확률은 같아도
당첨 시 받는 금액이 커진다. 회차별 (1등 당첨자 수 / 판매 게임 수)를 번호 지표 45개로
릿지 회귀해 번호별 인기도 계수를 구한다. 모든 계산은 학습 구간(과거)만 사용한다.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np
from scipy import stats

from .analysis import indicator_matrix
from .data import Draw

N_BALLS = 45
PICK = 6
PRICE_WON = 1000           # 1게임 가격(원). 1000원 체제가 확실한 구간만 사용
MIN_ROUND_FOR_MODEL = 100  # 초기 회차(2000원 체제·판매 급변)는 제외


def winners_density(draws: Sequence[Draw]) -> np.ndarray:
    """회차별 '판매 백만 게임당 1등 당첨자 수'. 계산 불가(판매액 없음/초기 회차)는 NaN."""
    out = np.full(len(draws), np.nan)
    for i, d in enumerate(draws):
        if d.total_sales > 0 and d.round >= MIN_ROUND_FOR_MODEL:
            out[i] = d.first_winners / (d.total_sales / PRICE_WON) * 1e6
    return out


@dataclass
class PopularityModel:
    intercept: float          # 평균 밀도 (백만 게임당 1등 수)
    beta: np.ndarray          # 길이 45: 번호가 포함될 때 밀도 변화
    n_rounds: int

    def predict_density(self, numbers: Sequence[int]) -> float:
        return float(self.intercept + sum(self.beta[n - 1] for n in numbers))

    def relative(self, numbers: Sequence[int]) -> float:
        """무작위 조합 대비 예상 공동 당첨자 비율 (1.0 = 평균, 0.85 = 15% 적음)."""
        return self.predict_density(numbers) / self.intercept if self.intercept > 0 else 1.0


def fit_popularity(ind: np.ndarray, density: np.ndarray, ridge: float = 5.0) -> PopularityModel | None:
    """ind (n,45) 지표, density (n,) 밀도. NaN 회차는 제외. 자료가 적으면 None."""
    mask = ~np.isnan(density)
    if mask.sum() < 60:
        return None
    X = ind[mask].astype(float)
    y = density[mask]
    ybar = y.mean()
    Xc = X - X.mean(axis=0)
    A = Xc.T @ Xc + ridge * np.eye(N_BALLS)
    beta = np.linalg.solve(A, Xc.T @ (y - ybar))
    # 평균 조합(6개)의 예측이 ybar가 되도록 절편 보정
    intercept = ybar - float(beta.sum()) * PICK / N_BALLS
    return PopularityModel(intercept=intercept, beta=beta, n_rounds=int(mask.sum()))


def score_unpopular(ind: np.ndarray, ctx: dict | None = None) -> np.ndarray:
    """인기도가 낮을수록 높은 점수. ctx['density']가 없으면 '큰 번호가 덜 인기' 근사 사용."""
    model = fit_popularity(ind, ctx["density"]) if ctx and "density" in ctx else None
    if model is None:
        return np.arange(1, N_BALLS + 1, dtype=float)
    return -model.beta


def validate_out_of_sample(draws: Sequence[Draw], start: int = 400) -> dict:
    """n회까지로 적합한 모델이 n+1회 실제 당첨 조합의 당첨자 밀도를 얼마나 예측하는가 (미래 정보 없음)."""
    ind = indicator_matrix(draws)
    dens = winners_density(draws)
    preds, actual = [], []
    for target in range(start, draws[-1].round + 1):
        i = target - 1
        if np.isnan(dens[i]):
            continue
        model = fit_popularity(ind[:i], dens[:i])
        if model is None:
            continue
        preds.append(model.relative(draws[i].numbers))
        actual.append(dens[i])
    preds, actual = np.array(preds), np.array(actual)
    if len(preds) < 30:
        return {"n": int(len(preds))}
    rho = stats.spearmanr(preds, actual)
    q20, q80 = np.quantile(preds, [0.2, 0.8])
    low, high = actual[preds <= q20], actual[preds >= q80]
    return {
        "n": int(len(preds)), "spearman_rho": float(rho.correlation), "p_value": float(rho.pvalue),
        "mean_density_when_predicted_unpopular": float(low.mean()),
        "mean_density_when_predicted_popular": float(high.mean()),
        "reduction_pct": float((1 - low.mean() / high.mean()) * 100) if high.mean() > 0 else 0.0,
        "t_p_value": float(stats.ttest_ind(low, high, equal_var=False).pvalue),
    }


def popularity_markdown(draws: Sequence[Draw]) -> str:
    ind = indicator_matrix(draws)
    dens = winners_density(draws)
    model = fit_popularity(ind, dens)
    L = ["# 번호 인기도 분석 (1등 당첨자 수 기반)\n"]
    if model is None:
        return "\n".join(L + ["자료 부족"])
    L.append(f"- 사용 회차 {model.n_rounds}회 (판매액이 있는 {MIN_ROUND_FOR_MODEL}회 이후), 평균 밀도 {model.intercept:.3f}명/백만 게임 "
             f"(이론 1/8.145 = {1e6 / 8145060:.3f})")
    order = np.argsort(model.beta)
    L.append("- 가장 **덜** 인기 있는 번호 10개(들어가면 공동 당첨자 감소): "
             + ", ".join(f"{i + 1}({model.beta[i]:+.4f})" for i in order[:10]))
    L.append("- 가장 인기 있는 번호 10개(들어가면 공동 당첨자 증가): "
             + ", ".join(f"{i + 1}({model.beta[i]:+.4f})" for i in order[::-1][:10]))
    lo = [int(i) + 1 for i in order[:6]]
    hi = [int(i) + 1 for i in order[::-1][:6]]
    L.append(f"- 예: 비인기 6개 {lo} 조합의 예상 공동 당첨자는 평균의 {model.relative(lo):.2f}배, "
             f"인기 6개 {hi} 조합은 {model.relative(hi):.2f}배 (전체 자료로 적합한 값이라 과장됨 — 아래 미래 검증 수치가 기준)")
    v = validate_out_of_sample(draws)
    L.append("\n## 미래 데이터로 검증 (n회까지 적합 → n+1회 실제 당첨자 밀도 예측)")
    if v.get("n", 0) >= 30:
        L.append(f"- 검증 회차 {v['n']}회, 스피어만 상관 {v['spearman_rho']:+.3f} (p={v['p_value']:.1e})")
        L.append(f"- 모델이 '비인기'로 본 하위 20% 회차의 실제 1등 밀도 {v['mean_density_when_predicted_unpopular']:.3f} vs "
                 f"'인기' 상위 20% 회차 {v['mean_density_when_predicted_popular']:.3f} → "
                 f"공동 당첨자 {v['reduction_pct']:.0f}% 차이 (p={v['t_p_value']:.1e})")
        L.append("- 해석: 적중 확률은 그대로지만, 비인기 조합으로 당첨되면 나눠 가질 사람이 이만큼 적다. "
                 "자동 구매 비중이 높아 효과 크기는 제한적이다.")
    else:
        L.append("- 검증 자료 부족")
    return "\n".join(L) + "\n"

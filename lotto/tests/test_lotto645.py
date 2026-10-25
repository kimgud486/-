"""단위 테스트: python -m unittest discover -s lotto/tests (저장소 루트에서) 또는 lotto/ 에서 python -m unittest."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np  # noqa: E402

from lotto645 import analysis, data, predictor, strategies  # noqa: E402
from lotto645.backtest import (EXPECTED_MATCHES_PER_GAME, MATCH_PMF, P_AT_LEAST_3,  # noqa: E402
                               evaluate_round, run_backtest)


def synthetic_draws(n: int, seed: int = 1) -> list[data.Draw]:
    rng = np.random.default_rng(seed)
    out = []
    for i in range(1, n + 1):
        picks = rng.choice(np.arange(1, 46), size=7, replace=False)
        out.append(data.Draw(round=i, date=f"2000-01-{(i % 28) + 1:02d}", numbers=tuple(sorted(int(x) for x in picks[:6])),
                             bonus=int(picks[6])))
    return out


class DrawTests(unittest.TestCase):
    def test_sorts_numbers(self):
        d = data.Draw(1, "2002-12-07", (40, 10, 23, 29, 33, 37), 16)
        self.assertEqual(d.numbers, (10, 23, 29, 33, 37, 40))

    def test_rejects_bad(self):
        with self.assertRaises(ValueError):
            data.Draw(1, "d", (1, 2, 3, 4, 5, 5), 7)
        with self.assertRaises(ValueError):
            data.Draw(1, "d", (1, 2, 3, 4, 5, 46), 7)
        with self.assertRaises(ValueError):
            data.Draw(1, "d", (1, 2, 3, 4, 5, 6), 6)

    def test_csv_roundtrip_and_sequence_validation(self):
        draws = synthetic_draws(10)
        with tempfile.TemporaryDirectory() as td:
            p = os.path.join(td, "x.csv")
            data.save_csv(draws, p)
            self.assertEqual(data.load_csv(p), draws)
        with self.assertRaises(ValueError):
            data.validate_sequence(draws[:3] + draws[4:])

    def test_parse_mirror_json(self):
        text = json.dumps([{"draw_no": 1, "numbers": [10, 23, 29, 33, 37, 40], "bonus_no": 16,
                            "date": "2002-12-07T00:00:00Z", "divisions": [{}, {"prize": 1, "winners": 1}],
                            "total_sales_amount": 3681782000}])
        d = data.parse_mirror_json(text)[0]
        self.assertEqual(d.round, 1)
        self.assertEqual(d.date, "2002-12-07")
        self.assertEqual(d.first_winners, 0)

    def test_expected_latest_round(self):
        from datetime import date
        self.assertEqual(data.expected_latest_round(date(2002, 12, 7)), 1)
        self.assertEqual(data.expected_latest_round(date(2002, 12, 13)), 1)
        self.assertEqual(data.expected_latest_round(date(2002, 12, 14)), 2)
        self.assertEqual(data.expected_latest_round(date(2026, 10, 24)), 1247)
        self.assertEqual(data.expected_latest_round(date(2026, 10, 25)), 1247)


class AnalysisTests(unittest.TestCase):
    def test_frequency_and_gaps(self):
        draws = [data.Draw(1, "d", (1, 2, 3, 4, 5, 6), 7), data.Draw(2, "d", (1, 10, 20, 30, 40, 45), 8)]
        freq = analysis.number_frequency(draws)
        self.assertEqual(freq[0], 2)
        self.assertEqual(freq[1], 1)
        self.assertEqual(freq.sum(), 12)
        gaps = analysis.gaps_since_last(draws)
        self.assertEqual(gaps[0], 0)   # 1번: 최신 회차에 나옴
        self.assertEqual(gaps[1], 1)   # 2번: 1회차에만
        self.assertEqual(gaps[8], 2)   # 9번: 한 번도 안 나옴 → 회차 수
        np.testing.assert_array_equal(gaps, strategies.gaps_since_last(analysis.indicator_matrix(draws)))

    def test_combo_features(self):
        f = analysis.combo_features((1, 2, 3, 20, 21, 45))
        self.assertEqual(f["sum"], 92)
        self.assertEqual(f["odd"], 4)
        self.assertEqual(f["low"], 5)
        self.assertEqual(f["consecutive_pairs"], 3)
        self.assertEqual(f["range"], 44)
        self.assertEqual(f["sections"], [3, 1, 1, 0, 1])
        self.assertEqual(f["max_same_last_digit"], 2)  # 1,21

    def test_ac_value(self):
        # 등차 조합은 차이의 종류가 적어 AC가 0
        self.assertEqual(analysis.combo_features((1, 2, 3, 4, 5, 6))["ac"], 0)
        self.assertGreaterEqual(analysis.combo_features((3, 11, 20, 27, 38, 44))["ac"], 5)

    def test_uniformity_on_random_data(self):
        draws = synthetic_draws(600, seed=3)
        u = analysis.uniformity_test(analysis.number_frequency(draws))
        self.assertGreater(u["p_value"], 0.001)
        rr = analysis.repeat_rate(draws)
        self.assertAlmostEqual(rr["expected_per_draw"], 0.8)
        self.assertGreater(rr["p_value"], 0.001)

    def test_full_analysis_runs(self):
        a = analysis.full_analysis(synthetic_draws(80))
        self.assertEqual(a["rounds"], 80)
        self.assertIn("hot_persistence", a)
        self.assertEqual(len(a["frequency"]), 45)


class PredictorTests(unittest.TestCase):
    def test_filter(self):
        pf = predictor.PatternFilter()
        self.assertTrue(pf.passes((3, 11, 20, 27, 38, 44)))
        self.assertIn("합계", " ".join(pf.violations((1, 2, 3, 4, 5, 6))))
        self.assertIn("연번", " ".join(pf.violations((1, 2, 3, 4, 5, 6))))
        self.assertIn("홀수", " ".join(pf.violations((2, 10, 18, 26, 34, 44))))

    def test_prediction_deterministic_and_valid(self):
        draws = synthetic_draws(60)
        for name in strategies.DEFAULT_ORDER:
            p1 = predictor.predict(draws, name, games=5)
            p2 = predictor.predict(draws, name, games=5)
            self.assertEqual(p1.games, p2.games, name)
            self.assertEqual(p1.target_round, 61)
            self.assertEqual(len(p1.games), 5)
            for g in p1.games:
                self.assertEqual(len(set(g)), 6)
                self.assertTrue(all(1 <= n <= 45 for n in g))
                self.assertEqual(tuple(sorted(g)), g)
            self.assertEqual(len(set(p1.games)), 5)   # 중복 게임 없음
            self.assertEqual(sorted(p1.ranking), list(range(1, 46)))

    def test_pool_restricts_when_scored(self):
        draws = synthetic_draws(60)
        p = predictor.predict(draws, "frequency", games=3, pool_size=12)
        self.assertEqual(len(p.pool), 12)
        for g in p.games:
            self.assertTrue(set(g) <= set(p.pool))

    def test_pool_expands_when_filter_blocks(self):
        # 1회차만 있으면 콜드 점수 상위가 1~15번에 몰려 합계 필터를 통과할 수 없다 → 풀 확장
        draws = [data.Draw(1, "d", (10, 23, 29, 33, 37, 40), 16)]
        p = predictor.predict(draws, "cold", games=5, pool_size=15)
        self.assertEqual(len(p.games), 5)
        self.assertTrue(any("확장" in n for n in p.notes))

    def test_match_and_prize(self):
        self.assertEqual(predictor.match_count((1, 2, 3, 4, 5, 6), (4, 5, 6, 7, 8, 9)), 3)
        self.assertEqual(predictor.prize_rank(6, False), 1)
        self.assertEqual(predictor.prize_rank(5, True), 2)
        self.assertEqual(predictor.prize_rank(5, False), 3)
        self.assertEqual(predictor.prize_rank(4, False), 4)
        self.assertEqual(predictor.prize_rank(3, True), 5)
        self.assertIsNone(predictor.prize_rank(2, True))

    def test_strategies_see_only_history(self):
        """점수는 학습 구간만 사용해야 한다: 미래 회차를 바꿔도 점수가 같아야 함."""
        draws = synthetic_draws(50)
        ind = analysis.indicator_matrix(draws)
        for name in strategies.DEFAULT_ORDER:
            s = strategies.STRATEGIES[name]
            a = s.score(ind[:40])
            b = s.score(analysis.indicator_matrix(draws[:40] + synthetic_draws(10, seed=99))[:40])
            np.testing.assert_allclose(a, b, err_msg=name)


class BacktestTests(unittest.TestCase):
    def test_theory_constants(self):
        self.assertAlmostEqual(sum(MATCH_PMF.values()), 1.0)
        self.assertAlmostEqual(EXPECTED_MATCHES_PER_GAME, 0.8)
        self.assertAlmostEqual(MATCH_PMF[6], 1 / 8145060)
        self.assertAlmostEqual(P_AT_LEAST_3, 0.02383, places=4)

    def test_evaluate_round_scores_correctly(self):
        draws = synthetic_draws(30)
        s = strategies.STRATEGIES["frequency"]
        pred, rr = evaluate_round(s, draws[:29], draws[29], games=4, pool_size=15, pattern_filter=predictor.DEFAULT_FILTER)
        self.assertEqual(rr.target_round, 30)
        self.assertEqual(rr.games, pred.games)
        for g, m in zip(rr.games, rr.matches):
            self.assertEqual(m, len(set(g) & set(draws[29].numbers)))
        self.assertEqual(rr.best, max(rr.matches))
        self.assertEqual(len(rr.actual_ranks), 6)
        self.assertEqual(rr.in_pool, sum(1 for a in draws[29].numbers if a in pred.pool))
        self.assertTrue(any("결과:" in d for d in rr.diagnosis))
        self.assertTrue(any("가정 검증" in d for d in rr.diagnosis))

    def test_run_backtest_walk_forward(self):
        draws = synthetic_draws(40)
        bt = run_backtest(draws, strategies=["frequency", "random"], start=2, end=40, games=3)
        self.assertEqual(bt.start_round, 2)
        self.assertEqual(bt.end_round, 40)
        self.assertEqual(len(bt.rounds["frequency"]), 39)
        self.assertEqual([r.target_round for r in bt.rounds["random"]], list(range(2, 41)))
        s = bt.summaries["frequency"]
        self.assertEqual(s.total_games, 39 * 3)
        self.assertEqual(sum(s.match_distribution.values()), s.total_games)
        self.assertIn("frequency", bt.comparison_vs_random)
        self.assertEqual(bt.round_results(10)["random"].target_round, 10)

    def test_backtest_rejects_bad_range(self):
        draws = synthetic_draws(10)
        with self.assertRaises(ValueError):
            run_backtest(draws, start=1)
        with self.assertRaises(ValueError):
            run_backtest(draws, start=2, end=11)


class UpgradeTests(unittest.TestCase):
    def test_coverage_reduces_overlap(self):
        draws = synthetic_draws(60)
        p_plain = predictor.predict(draws, "random", games=5)
        p_cov = predictor.predict(draws, "random", games=5, coverage=True)
        distinct_plain = len(set().union(*p_plain.games))
        distinct_cov = len(set().union(*p_cov.games))
        self.assertEqual(distinct_cov, 30)             # 5게임 × 6개 완전 분리
        self.assertGreaterEqual(distinct_cov, distinct_plain)

    def test_popularity_fit_and_unpopular_strategy(self):
        from lotto645 import popularity
        rng = np.random.default_rng(7)
        draws = []
        for i in range(1, 401):
            nums = tuple(sorted(int(x) for x in rng.choice(np.arange(1, 46), 6, replace=False)))
            bonus = int(rng.choice([n for n in range(1, 46) if n not in nums]))
            # 번호 7이 들어가면 당첨자가 크게 늘어나는 가짜 세계
            winners = 10 + (20 if 7 in nums else 0) + int(rng.integers(0, 3))
            draws.append(data.Draw(i, "d", nums, bonus, first_prize=1, first_winners=winners, total_sales=10**11))
        ind = analysis.indicator_matrix(draws)
        dens = popularity.winners_density(draws)
        self.assertTrue(np.isnan(dens[:99]).all())          # 100회 이전은 제외
        model = popularity.fit_popularity(ind, dens)
        self.assertIsNotNone(model)
        self.assertEqual(int(np.argmax(model.beta)) + 1, 7)  # 7번이 가장 '인기'
        sc = popularity.score_unpopular(ind, {"density": dens})
        self.assertEqual(int(np.argmin(sc)) + 1, 7)          # 비인기 전략은 7번을 가장 낮게
        p = predictor.predict(draws, "unpopular", games=3)
        self.assertEqual(len(p.games), 3)
        for g in p.games:
            self.assertNotIn(7, g)
        # ctx 없이도 동작(큰 번호 선호 근사)
        sc2 = popularity.score_unpopular(ind, None)
        self.assertEqual(int(np.argmax(sc2)) + 1, 45)

    def test_backtest_zero_hit_and_payout_fields(self):
        draws = synthetic_draws(80)
        bt = run_backtest(draws, strategies=["random", "unpopular"], start=70, end=80, games=3, coverage=True)
        s = bt.summaries["random"]
        self.assertTrue(0 <= s.zero_hit_round_rate <= 1)
        self.assertAlmostEqual(s.zero_hit_theory_independent, MATCH_PMF[0] ** 3)
        self.assertEqual(len(bt.rounds["unpopular"]), 11)


class MLTests(unittest.TestCase):
    """기계학습 파이프라인이 '신호가 있으면 잡고, 없으면 0.5'인지 확인."""

    def _predictable_draws(self, n):
        # 가짜 로또: 다음 회차 = 직전 회차 번호 각각 +1 (45→1). 완전히 예측 가능.
        draws = [data.Draw(1, "d", (3, 11, 20, 27, 38, 44), 7)]
        for i in range(2, n + 1):
            prev = draws[-1].numbers
            nums = tuple(sorted((p % 45) + 1 for p in prev))
            bonus = next(b for b in range(1, 46) if b not in nums)
            draws.append(data.Draw(i, "d", nums, bonus))
        return draws

    def test_pipeline_detects_signal_when_present(self):
        try:
            import sklearn  # noqa: F401
        except ImportError:
            self.skipTest("scikit-learn 없음")
        from lotto645 import ml
        r = ml.run_ml(self._predictable_draws(200), start=120, end=200, refit_every=20)
        self.assertGreater(r.auc, 0.9)
        self.assertGreater(r.top6_hit_rate, 0.8)

    def test_pipeline_near_half_on_random(self):
        try:
            import sklearn  # noqa: F401
        except ImportError:
            self.skipTest("scikit-learn 없음")
        from lotto645 import ml
        r = ml.run_ml(synthetic_draws(260, seed=11), start=150, end=260, refit_every=30)
        self.assertLess(abs(r.auc - 0.5), 0.06)
        self.assertEqual(r.n_rounds, 111)


class PoolTests(unittest.TestCase):
    def test_build_pool_sizes_and_games_inside_pool(self):
        from lotto645 import pool
        draws = synthetic_draws(80)
        for rule in pool.WILD_RULES:
            pr, scores = pool.build_pool(draws, strategy="frequency", core=15, wild=3, wild_rule=rule, games=3)
            self.assertEqual(len(pr.core), 15)
            self.assertEqual(len(pr.wild), 3)
            self.assertEqual(len(pr.pool), 18)
            self.assertFalse(set(pr.core) & set(pr.wild))
            self.assertEqual(pr.target_round, 81)
            self.assertEqual(len(pr.games), 3)
            for g in pr.games:
                self.assertTrue(set(g) <= set(pr.pool), rule)
            # 핵심 후보는 점수 상위 15개여야 한다
            self.assertEqual(sorted(pr.core), sorted(predictor.rank_numbers(scores)[:15]))

    def test_score_pool_round(self):
        from lotto645 import pool
        draws = synthetic_draws(50)
        ind = analysis.indicator_matrix(draws[:49])
        pr, scores = pool.build_pool(draws[:49], strategy="ensemble", games=2, ind_prefix=ind)
        pr = pool.score_pool_round(pr, scores, ind, draws[49])
        actual = set(draws[49].numbers)
        self.assertEqual(set(pr.core_hits), actual & set(pr.core))
        self.assertEqual(set(pr.wild_hits), actual & set(pr.wild))
        self.assertEqual(pr.pool_hit_count, len(actual & set(pr.pool)))
        self.assertEqual(len(pr.missed_outside), 6 - pr.pool_hit_count)
        for m in pr.missed_outside:
            self.assertGreater(m["rank"], 15)   # 후보 밖 번호는 핵심 순위 밖
        self.assertTrue(any("통합 후보" in d for d in pr.diagnosis))

    def test_pool_backtest_and_theory(self):
        from lotto645 import pool
        pmf = pool.hypergeom_pmf(18)
        self.assertAlmostEqual(sum(pmf.values()), 1.0)
        self.assertAlmostEqual(sum(k * v for k, v in pmf.items()), 2.4)
        draws = synthetic_draws(40)
        bt = pool.run_pool_backtest(draws, strategy="frequency", start=2, end=40, games=1)
        self.assertEqual(len(bt.rounds), 39)
        self.assertEqual(bt.summary["pool"]["expected"], 2.4)
        self.assertEqual(sum(bt.summary["pool"]["distribution"].values()), 39)
        with tempfile.TemporaryDirectory() as td:
            paths = pool.write_pool_outputs(bt, td, detail_rounds=[10])
            for p in paths.values():
                self.assertTrue(os.path.exists(p))
            md = open(paths["summary_md"], encoding="utf-8").read()
            self.assertIn("10회", md)

    def test_pool_rejects_uniform_strategy(self):
        from lotto645 import pool
        with self.assertRaises(ValueError):
            pool.build_pool(synthetic_draws(10), strategy="random")


class ReportTests(unittest.TestCase):
    def test_markdown_outputs(self):
        from lotto645 import report
        draws = synthetic_draws(60)
        a = analysis.full_analysis(draws)
        md = report.analysis_markdown(a)
        self.assertIn("카이제곱", md)
        preds = [predictor.predict(draws, n, games=2) for n in ("frequency", "random")]
        self.assertIn("61회 예측", report.prediction_markdown(preds, draws[-1]))
        bt = run_backtest(draws, strategies=["frequency", "random"], start=50, end=60, games=2)
        md = report.backtest_markdown(bt, detail_rounds=[55])
        self.assertIn("55회", md)
        with tempfile.TemporaryDirectory() as td:
            paths = report.write_backtest_outputs(bt, td)
            for p in paths.values():
                self.assertTrue(os.path.exists(p))


if __name__ == "__main__":
    unittest.main()

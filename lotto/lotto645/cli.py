"""명령줄 인터페이스.

  python -m lotto645 update                     데이터 최신화
  python -m lotto645 analyze [--out FILE]       1~최신회 상세 분석
  python -m lotto645 predict [--strategy all]   다음 회차 예측
  python -m lotto645 explain 2                  1회 분석 → 2회 예측 → 실제와 비교, 왜 틀렸는지
  python -m lotto645 backtest [--start 2]       전 구간 워크포워드 백테스트 + 리포트
"""
from __future__ import annotations

import argparse
import json
import os
import sys

from . import analysis, data, report
from .backtest import evaluate_round, run_backtest
from .predictor import DEFAULT_FILTER, predict
from .strategies import DEFAULT_ORDER, STRATEGIES

HERE = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.normpath(os.path.join(HERE, "..", "reports"))


def _strategy_list(arg: str) -> list[str]:
    if arg in ("all", ""):
        return list(DEFAULT_ORDER)
    names = [s.strip() for s in arg.split(",") if s.strip()]
    unknown = [n for n in names if n not in STRATEGIES]
    if unknown:
        raise SystemExit(f"알 수 없는 전략: {unknown}. 사용 가능: {', '.join(DEFAULT_ORDER)}")
    return names


def _load(args) -> list[data.Draw]:
    draws = data.load_or_update(args.data, offline=args.offline, verbose=True)
    if args.until:
        if args.until > draws[-1].round:
            raise SystemExit(f"--until {args.until}: 보유 데이터는 {draws[-1].round}회까지입니다")
        draws = draws[:args.until]
    return draws


def cmd_update(args):
    draws = data.update(args.data, verbose=True)
    print(f"보유: 1~{draws[-1].round}회 (최신 추첨일 {draws[-1].date}), 오늘 기준 예상 최신 {data.expected_latest_round()}회")


def cmd_analyze(args):
    draws = _load(args)
    a = analysis.full_analysis(draws)
    md = report.analysis_markdown(a)
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"분석 리포트 저장: {args.out}")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(a, f, ensure_ascii=False, indent=2, default=str)
        print(f"분석 JSON 저장: {args.json}")
    if not args.out or args.print:
        print(md)


def cmd_predict(args):
    draws = _load(args)
    preds = [predict(draws, n, games=args.games, pool_size=args.pool, seed=args.seed)
             for n in _strategy_list(args.strategy)]
    md = report.prediction_markdown(preds, draws[-1])
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"예측 리포트 저장: {args.out}")
    print(md)


def cmd_explain(args):
    draws = _load(args)
    target = args.round
    if target < 2 or target > draws[-1].round:
        raise SystemExit(f"회차는 2~{draws[-1].round} 사이여야 합니다")
    history = draws[:target - 1]
    actual = draws[target - 1]
    print(f"# {target}회 예측 복기 — 1~{target - 1}회 데이터로 예측 후 실제({actual.date}) 결과와 비교\n")
    for n in _strategy_list(args.strategy):
        _, rr = evaluate_round(STRATEGIES[n], history, actual, games=args.games, pool_size=args.pool,
                               pattern_filter=DEFAULT_FILTER)
        print(report.round_markdown(rr, target - 1))


def cmd_backtest(args):
    draws = _load(args)
    end = args.end or draws[-1].round
    names = _strategy_list(args.strategy)
    print(f"[backtest] {args.start}회~{end}회, 전략 {len(names)}개, 회차당 {args.games}게임, 풀 {args.pool}개")
    bt = run_backtest(draws, strategies=names, start=args.start, end=end, games=args.games,
                      pool_size=args.pool, progress=True)
    detail = [int(x) for x in args.detail.split(",") if x.strip()] if args.detail else []
    detail = [d for d in detail if args.start <= d <= end]
    paths = report.write_backtest_outputs(bt, args.out, detail_rounds=detail)
    print(report.backtest_markdown(bt))
    for k, p in paths.items():
        print(f"저장: {k} → {p}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="lotto645", description="로또 6/45 분석·예측·백테스트")
    p.add_argument("--data", default=data.DEFAULT_CSV, help="CSV 데이터 경로")
    p.add_argument("--offline", action="store_true", help="네트워크 갱신 시도 안 함")
    p.add_argument("--until", type=int, default=None, help="이 회차까지만 데이터 사용 (과거 시점 재현)")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("update", help="당첨번호 데이터 최신화"); s.set_defaults(fn=cmd_update)

    s = sub.add_parser("analyze", help="상세 분석 리포트")
    s.add_argument("--out", default=None, help="마크다운 저장 경로")
    s.add_argument("--json", default=None, help="JSON 저장 경로")
    s.add_argument("--print", action="store_true", help="파일로 저장해도 화면에 출력")
    s.set_defaults(fn=cmd_analyze)

    s = sub.add_parser("predict", help="다음 회차 예측")
    s.add_argument("--strategy", default="all", help="all 또는 콤마 구분: " + ",".join(DEFAULT_ORDER))
    s.add_argument("--games", type=int, default=5)
    s.add_argument("--pool", type=int, default=15)
    s.add_argument("--seed", type=int, default=None)
    s.add_argument("--out", default=None)
    s.set_defaults(fn=cmd_predict)

    s = sub.add_parser("explain", help="특정 회차를 직전까지 데이터로 예측하고 왜 틀렸는지 설명")
    s.add_argument("round", type=int)
    s.add_argument("--strategy", default="all")
    s.add_argument("--games", type=int, default=5)
    s.add_argument("--pool", type=int, default=15)
    s.set_defaults(fn=cmd_explain)

    s = sub.add_parser("backtest", help="워크포워드 백테스트")
    s.add_argument("--start", type=int, default=2, help="첫 예측 대상 회차 (2 = 1회 분석→2회 예측)")
    s.add_argument("--end", type=int, default=None)
    s.add_argument("--strategy", default="all")
    s.add_argument("--games", type=int, default=5)
    s.add_argument("--pool", type=int, default=15)
    s.add_argument("--detail", default="2,3,100,500,1000,1247", help="상세 진단을 리포트에 넣을 회차(콤마)")
    s.add_argument("--out", default=REPORTS_DIR, help="리포트 저장 폴더")
    s.set_defaults(fn=cmd_backtest)
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()

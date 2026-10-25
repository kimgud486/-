"""당첨번호 데이터 수집·저장·로드.

우선순위:
  1. 로컬 CSV 캐시 (lotto/data/lotto645.csv)
  2. 동행복권 공식 API  (https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=N)
  3. GitHub 공개 미러   (smok95/lotto results/all.json) — 공식 API가 막힌 네트워크용 폴백
"""
from __future__ import annotations

import csv
import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from datetime import date
from typing import Iterable

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CSV = os.path.normpath(os.path.join(HERE, "..", "data", "lotto645.csv"))

DHLOTTERY_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={no}"
MIRROR_URL = "https://raw.githubusercontent.com/smok95/lotto/main/results/all.json"
USER_AGENT = "Mozilla/5.0 (lotto645-analyzer; +https://github.com)"

FIRST_DRAW_DATE = date(2002, 12, 7)  # 1회 추첨일 (토요일)

CSV_FIELDS = [
    "round", "date", "n1", "n2", "n3", "n4", "n5", "n6", "bonus",
    "first_prize", "first_winners", "total_sales",
]


@dataclass(frozen=True)
class Draw:
    round: int
    date: str                 # YYYY-MM-DD
    numbers: tuple[int, ...]  # 오름차순 6개
    bonus: int
    first_prize: int = 0      # 1등 1인당 당첨금(원), 모르면 0
    first_winners: int = 0    # 1등 당첨자 수, 모르면 0
    total_sales: int = 0      # 총 판매액(원), 모르면 0

    def __post_init__(self):
        if len(self.numbers) != 6 or len(set(self.numbers)) != 6:
            raise ValueError(f"{self.round}회: 번호는 서로 다른 6개여야 합니다: {self.numbers}")
        if any(not (1 <= n <= 45) for n in self.numbers) or not (1 <= self.bonus <= 45):
            raise ValueError(f"{self.round}회: 번호 범위(1~45) 오류: {self.numbers} + {self.bonus}")
        if self.bonus in self.numbers:
            raise ValueError(f"{self.round}회: 보너스 번호가 본번호와 중복: {self.bonus}")
        if tuple(sorted(self.numbers)) != tuple(self.numbers):
            object.__setattr__(self, "numbers", tuple(sorted(self.numbers)))

    def to_row(self) -> dict:
        d = {
            "round": self.round, "date": self.date, "bonus": self.bonus,
            "first_prize": self.first_prize, "first_winners": self.first_winners,
            "total_sales": self.total_sales,
        }
        for i, n in enumerate(self.numbers, 1):
            d[f"n{i}"] = n
        return d

    @staticmethod
    def from_row(row: dict) -> "Draw":
        return Draw(
            round=int(row["round"]),
            date=row["date"],
            numbers=tuple(int(row[f"n{i}"]) for i in range(1, 7)),
            bonus=int(row["bonus"]),
            first_prize=int(row.get("first_prize") or 0),
            first_winners=int(row.get("first_winners") or 0),
            total_sales=int(row.get("total_sales") or 0),
        )


def expected_latest_round(today: date | None = None) -> int:
    """오늘 날짜 기준으로 이미 추첨된 최신 회차를 추정한다 (매주 토요일 추첨)."""
    today = today or date.today()
    weeks = (today - FIRST_DRAW_DATE).days // 7
    return 1 + weeks


# ---------------------------------------------------------------- CSV I/O

def save_csv(draws: Iterable[Draw], path: str = DEFAULT_CSV) -> str:
    draws = sorted(draws, key=lambda d: d.round)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        for d in draws:
            w.writerow(d.to_row())
    return path


def load_csv(path: str = DEFAULT_CSV) -> list[Draw]:
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        draws = [Draw.from_row(r) for r in csv.DictReader(f)]
    draws.sort(key=lambda d: d.round)
    validate_sequence(draws)
    return draws


def validate_sequence(draws: list[Draw]) -> None:
    """1회부터 빠진 회차 없이 연속인지 확인한다."""
    for i, d in enumerate(draws, 1):
        if d.round != i:
            raise ValueError(f"회차 누락/중복: {i}회가 와야 하는데 {d.round}회가 있습니다")


# ---------------------------------------------------------------- 원격 수집

def _http_get(url: str, timeout: float = 15.0) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def fetch_official(round_no: int) -> Draw | None:
    """동행복권 공식 API에서 1회차를 가져온다. 아직 추첨 전이면 None."""
    raw = _http_get(DHLOTTERY_URL.format(no=round_no))
    obj = json.loads(raw.decode("utf-8"))
    if obj.get("returnValue") != "success":
        return None
    return Draw(
        round=int(obj["drwNo"]),
        date=obj["drwNoDate"],
        numbers=tuple(int(obj[f"drwtNo{i}"]) for i in range(1, 7)),
        bonus=int(obj["bnusNo"]),
        first_prize=int(obj.get("firstWinamnt") or 0),
        first_winners=int(obj.get("firstPrzwnerCo") or 0),
        total_sales=int(obj.get("totSellamnt") or 0),
    )


def fetch_mirror() -> list[Draw]:
    """GitHub 공개 미러(smok95/lotto)에서 전 회차를 한 번에 가져온다."""
    raw = _http_get(MIRROR_URL, timeout=60)
    return parse_mirror_json(raw.decode("utf-8"))


def parse_mirror_json(text: str) -> list[Draw]:
    items = json.loads(text)
    draws = []
    for it in items:
        divisions = it.get("divisions") or []
        first = divisions[0] if divisions else {}
        draws.append(Draw(
            round=int(it["draw_no"]),
            date=str(it["date"])[:10],
            numbers=tuple(int(n) for n in it["numbers"]),
            bonus=int(it["bonus_no"]),
            first_prize=int(first.get("prize") or 0),
            first_winners=int(first.get("winners") or 0),
            total_sales=int(it.get("total_sales_amount") or 0),
        ))
    draws.sort(key=lambda d: d.round)
    return draws


def update(path: str = DEFAULT_CSV, *, use_official: bool = True, use_mirror: bool = True,
           verbose: bool = True) -> list[Draw]:
    """로컬 CSV를 최신 회차까지 갱신한다. 결과 전체 리스트를 돌려준다."""
    log = print if verbose else (lambda *a, **k: None)
    draws = load_csv(path)
    have = len(draws)
    target = expected_latest_round()
    if have >= target:
        log(f"[data] 로컬 데이터가 최신입니다: 1~{have}회")
        return draws

    log(f"[data] 로컬 {have}회 → 예상 최신 {target}회. 갱신 시도...")
    errors = []

    if use_official:
        try:
            added = 0
            for no in range(have + 1, target + 1):
                d = fetch_official(no)
                if d is None:
                    break
                draws.append(d)
                added += 1
                time.sleep(0.15)
            if added:
                log(f"[data] 동행복권 공식 API에서 {added}회 수집 ({have + 1}~{have + added}회)")
        except (urllib.error.URLError, OSError, ValueError, KeyError) as e:
            errors.append(f"공식 API 실패: {e}")

    if len(draws) < target and use_mirror:
        try:
            mirror = fetch_mirror()
            known = {d.round for d in draws}
            new = [d for d in mirror if d.round not in known]
            if new:
                draws.extend(new)
                log(f"[data] GitHub 미러에서 {len(new)}회 보충 (최신 {max(d.round for d in new)}회)")
        except (urllib.error.URLError, OSError, ValueError, KeyError) as e:
            errors.append(f"미러 실패: {e}")

    draws.sort(key=lambda d: d.round)
    validate_sequence(draws)
    if len(draws) > have:
        save_csv(draws, path)
        log(f"[data] 저장: {path} (1~{len(draws)}회)")
    elif errors:
        log("[data] 갱신 실패: " + " / ".join(errors))
    return draws


def load_or_update(path: str = DEFAULT_CSV, *, offline: bool = False, verbose: bool = False) -> list[Draw]:
    draws = load_csv(path)
    if draws and (offline or len(draws) >= expected_latest_round()):
        return draws
    if offline:
        if not draws:
            raise FileNotFoundError(f"로컬 데이터가 없습니다: {path} — `update` 명령으로 먼저 수집하세요")
        return draws
    try:
        return update(path, verbose=verbose)
    except Exception as e:  # 네트워크가 막혀도 기존 데이터로 계속 진행
        if draws:
            if verbose:
                print(f"[data] 갱신 실패, 기존 데이터 사용: {e}")
            return draws
        raise

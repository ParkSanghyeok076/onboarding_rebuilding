import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os

# ── 색상 ──────────────────────────────────────────
NAVY      = "#1A2332"
GOLD      = "#C9A84C"
BLUE      = "#2E6DA4"
GREEN     = "#2E8B57"
LIGHT_BG  = "#F7F8FA"
CARD_BG   = "#FFFFFF"
GRAY_LINE = "#DADFE8"
GRAY_TEXT = "#555555"
ORANGE    = "#E07B39"

OUTPUT = os.path.join(os.path.dirname(__file__), "onboarding-diagram.png")

fig, ax = plt.subplots(figsize=(18, 13))
fig.patch.set_facecolor(LIGHT_BG)
ax.set_facecolor(LIGHT_BG)
ax.set_xlim(0, 18)
ax.set_ylim(0, 13)
ax.axis("off")

def card(x, y, w, h, color=CARD_BG, ec=GRAY_LINE, lw=1.2, radius=0.3):
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle=f"round,pad=0,rounding_size={radius}",
                       facecolor=color, edgecolor=ec, linewidth=lw, zorder=3)
    ax.add_patch(p)

def txt(x, y, s, size=10, color=NAVY, weight="normal", ha="center", va="center", zorder=5):
    ax.text(x, y, s, fontsize=size, color=color, fontweight=weight,
            ha=ha, va=va, zorder=zorder,
            fontfamily="Malgun Gothic" if "Malgun Gothic" in
            plt.rcParams["font.family"] else "sans-serif")

# 한글 폰트 설정
import matplotlib.font_manager as fm
for name in ["Malgun Gothic", "NanumGothic", "AppleGothic", "DejaVu Sans"]:
    if any(name.lower() in f.name.lower() for f in fm.fontManager.ttflist):
        plt.rcParams["font.family"] = name
        break

# ── 타이틀 ──────────────────────────────────────────────────
card(0.4, 11.8, 17.2, 0.95, color=NAVY, ec=NAVY)
ax.text(9, 12.28, "신규입사자 온보딩 프로그램", fontsize=20, color="white",
        fontweight="bold", ha="center", va="center", zorder=5,
        fontfamily=plt.rcParams["font.family"])

# ── 버디 활동 6가지 (공통) ───────────────────────────────────
buddy_title_y = 11.1
ax.text(9, buddy_title_y, "[ 버디 프로그램 — 신입·경력 공통 ]",
        fontsize=11, color=NAVY, fontweight="bold", ha="center", va="center",
        zorder=5, fontfamily=plt.rcParams["font.family"])

activities = [
    ("①", "멘토와\n티타임"),
    ("②", "팀원\n인사"),
    ("③", "구내식당\n이용"),
    ("④", "주변\n맛집 탐방"),
    ("⑤", "협업부서\n인사"),
    ("⑥", "자율\n활동"),
]

box_w, box_h = 2.3, 1.35
gap = 0.28
total_w = len(activities) * box_w + (len(activities) - 1) * gap
start_x = (18 - total_w) / 2
buddy_y = 9.45

for i, (num, label) in enumerate(activities):
    bx = start_x + i * (box_w + gap)
    card(bx, buddy_y, box_w, box_h, color=CARD_BG, ec=BLUE, lw=1.8)
    # 상단 색 바
    p = FancyBboxPatch((bx, buddy_y + box_h - 0.22), box_w, 0.22,
                       boxstyle="round,pad=0,rounding_size=0.15",
                       facecolor=BLUE, edgecolor=BLUE, linewidth=0, zorder=4)
    ax.add_patch(p)
    ax.text(bx + box_w/2, buddy_y + box_h - 0.11, num,
            fontsize=9, color="white", fontweight="bold",
            ha="center", va="center", zorder=5,
            fontfamily=plt.rcParams["font.family"])
    ax.text(bx + box_w/2, buddy_y + box_h/2 - 0.1, label,
            fontsize=9.5, color=NAVY, ha="center", va="center",
            zorder=5, fontfamily=plt.rcParams["font.family"])
    # 카메라 아이콘 대신 텍스트
    ax.text(bx + box_w/2, buddy_y + 0.2, "[ 증빙 이미지 첨부 ]",
            fontsize=7.5, color=GRAY_TEXT, ha="center", va="center", zorder=5)

# ── 구분선 ──────────────────────────────────────────────────
ax.plot([0.4, 17.6], [9.2, 9.2], color=GRAY_LINE, lw=1.5, zorder=3)

# ── 두 트랙 레이블 ───────────────────────────────────────────
# 신입공채
card(0.4, 8.7, 8.35, 0.42, color=BLUE, ec=BLUE)
ax.text(4.57, 8.91, "신입공채 (3개월 · 3차 설문)",
        fontsize=11, color="white", fontweight="bold",
        ha="center", va="center", zorder=5,
        fontfamily=plt.rcParams["font.family"])

# 경력공채
card(9.25, 8.7, 8.35, 0.42, color=GREEN, ec=GREEN)
ax.text(13.42, 8.91, "경력공채 (1개월 · 1차 설문)",
        fontsize=11, color="white", fontweight="bold",
        ha="center", va="center", zorder=5,
        fontfamily=plt.rcParams["font.family"])

# ── 신입공채 타임라인 ─────────────────────────────────────────
# 배경
card(0.4, 1.2, 8.35, 7.35, color="#EEF4FB", ec=BLUE, lw=1.2)

# 타임라인 선
tl_y = 7.6
ax.plot([0.9, 8.4], [tl_y, tl_y], color=BLUE, lw=3, zorder=4, solid_capstyle="round")

milestones_new = [
    (0.9,  "입사일",    "D+0"),
    (3.27, "1차 설문",  "D+28"),
    (5.63, "2차 설문",  "D+56"),
    (8.0,  "3차 설문",  "D+84"),
]

for mx, label, day in milestones_new:
    ax.plot(mx, tl_y, "o", markersize=13, color=BLUE, zorder=5)
    ax.plot(mx, tl_y, "o", markersize=7, color="white", zorder=6)
    ax.text(mx, tl_y + 0.45, label, fontsize=9, color=NAVY, fontweight="bold",
            ha="center", va="bottom", zorder=7,
            fontfamily=plt.rcParams["font.family"])
    ax.text(mx, tl_y - 0.45, day, fontsize=8.5, color=BLUE,
            ha="center", va="top", zorder=7,
            fontfamily=plt.rcParams["font.family"])

# 구간 레이블
for sx, ex, label in [(0.9, 3.27, "1차 (D+1 ~ D+28)"),
                       (3.27, 5.63, "2차 (D+29 ~ D+56)"),
                       (5.63, 8.0, "3차 (D+57 ~ D+84)")]:
    mx = (sx + ex) / 2
    ax.text(mx, tl_y + 0.95, label, fontsize=8, color=GRAY_TEXT,
            ha="center", va="bottom", zorder=7,
            fontfamily=plt.rcParams["font.family"])

# 설문 내용 카드들
survey_items_new = [
    (1.6,  5.5, "1차 설문", "입사 후 1개월\nOJT·멘토링\n조직 적응 전반"),
    (4.0,  4.0, "2차 설문", "입사 후 2개월\n업무 숙련도\n팀 융합 상태"),
    (6.35, 2.6, "3차 설문", "입사 후 3개월\n온보딩 종합\n성장 방향"),
]

for sx, sy, stitle, sdesc in survey_items_new:
    card(sx - 1.15, sy - 0.7, 2.3, 1.6, color=CARD_BG, ec=BLUE, lw=1.2)
    ax.text(sx, sy + 0.55, stitle, fontsize=9, color=BLUE, fontweight="bold",
            ha="center", va="center", zorder=6,
            fontfamily=plt.rcParams["font.family"])
    ax.text(sx, sy - 0.1, sdesc, fontsize=8, color=GRAY_TEXT,
            ha="center", va="center", zorder=6,
            fontfamily=plt.rcParams["font.family"])

# ABSA 태그
card(0.7, 1.3, 7.8, 0.75, color="#DDE8F5", ec=BLUE, lw=0.8)
ax.text(4.6, 1.67, "AI 감성분석 (ABSA)  →  멘토·팀장 대상 이메일 초안 자동 생성",
        fontsize=8.5, color=NAVY, ha="center", va="center", zorder=5,
        fontfamily=plt.rcParams["font.family"])

# ── 경력공채 타임라인 ─────────────────────────────────────────
card(9.25, 1.2, 8.35, 7.35, color="#EEF7F2", ec=GREEN, lw=1.2)

tl_y2 = 7.6
ax.plot([9.75, 17.1], [tl_y2, tl_y2], color=GREEN, lw=3, zorder=4, solid_capstyle="round")

milestones_exp = [
    (9.75,  "입사일",   "D+0"),
    (17.1,  "1차 설문", "D+28"),
]
for mx, label, day in milestones_exp:
    ax.plot(mx, tl_y2, "o", markersize=13, color=GREEN, zorder=5)
    ax.plot(mx, tl_y2, "o", markersize=7, color="white", zorder=6)
    ax.text(mx, tl_y2 + 0.45, label, fontsize=9, color=NAVY, fontweight="bold",
            ha="center", va="bottom", zorder=7,
            fontfamily=plt.rcParams["font.family"])
    ax.text(mx, tl_y2 - 0.45, day, fontsize=8.5, color=GREEN,
            ha="center", va="top", zorder=7,
            fontfamily=plt.rcParams["font.family"])

ax.text(13.42, tl_y2 + 0.95, "온보딩 기간 (D+1 ~ D+28)",
        fontsize=8.5, color=GRAY_TEXT, ha="center", va="bottom", zorder=7,
        fontfamily=plt.rcParams["font.family"])

# 경력 설문 카드
card(11.4, 4.3, 2.5, 2.1, color=CARD_BG, ec=GREEN, lw=1.2)
ax.text(12.65, 6.05, "1차 설문", fontsize=9, color=GREEN, fontweight="bold",
        ha="center", va="center", zorder=6,
        fontfamily=plt.rcParams["font.family"])
ax.text(12.65, 5.35, "입사 후 1개월\nOJT·업무 적응\n조직 문화 적응", fontsize=8,
        color=GRAY_TEXT, ha="center", va="center", zorder=6,
        fontfamily=plt.rcParams["font.family"])

# 경력 특이사항 카드
card(9.5, 2.1, 7.8, 1.9, color=CARD_BG, ec=GREEN, lw=1.0)
ax.text(13.4, 3.25, "경력직 온보딩 특징",
        fontsize=9, color=GREEN, fontweight="bold",
        ha="center", va="center", zorder=6,
        fontfamily=plt.rcParams["font.family"])
ax.text(13.4, 2.65,
        "• 빠른 현업 투입을 위한 집중 1개월 과정\n"
        "• 버디 프로그램 6가지 동일 적용\n"
        "• 설문 1회로 적응 상태 점검",
        fontsize=8.5, color=GRAY_TEXT,
        ha="center", va="center", zorder=6,
        fontfamily=plt.rcParams["font.family"])

# ABSA 태그 (경력)
card(9.5, 1.3, 7.8, 0.75, color="#D9F0E5", ec=GREEN, lw=0.8)
ax.text(13.4, 1.67, "AI 감성분석 (ABSA)  →  멘토·팀장 대상 이메일 초안 자동 생성",
        fontsize=8.5, color=NAVY, ha="center", va="center", zorder=5,
        fontfamily=plt.rcParams["font.family"])

# ── 중앙 구분선 ──────────────────────────────────────────────
ax.plot([9.05, 9.05], [1.2, 8.7], color=GRAY_LINE, lw=1.5,
        linestyle="--", zorder=3)

# ── 공통 설문 구성 박스 ──────────────────────────────────────
parts = [
    ("Part 1", "OJT 준비 및\n멘토링 태도", BLUE),
    ("Part 2", "업무 지식 및\n기술 전수", BLUE),
    ("Part 3", "실무 지도 및\n피드백", BLUE),
    ("Part 4", "조직 적응 지원\n및 소통", BLUE),
    ("Part 5", "종합 의견\n(주관식)", ORANGE),
]

# 설문 구성은 너무 복잡해질 수 있으므로 신입 쪽 하단에 간략히 표시
# → 이미 충분한 내용이 있으므로 생략

plt.tight_layout(pad=0)
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
plt.savefig(OUTPUT, dpi=150, bbox_inches="tight", facecolor=LIGHT_BG)
plt.close()
print(f"저장 완료: {OUTPUT}")

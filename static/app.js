(function () {
  "use strict";

  // === 設定：APIのベースURL（同じサーバーなので空）、通信タイムアウト（6秒） ===
  const API = "";
  const FETCH_TIMEOUT_MS = 6000;

  // タイムアウト付きでサーバーにリクエストする（応答が遅いと中断）
  function fetchWithTimeout(url, options, timeoutMs) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(id));
  }

  // === API呼び出し：今日の気分を取得 ===
  async function getToday() {
    const res = await fetchWithTimeout(API + "/api/today", {}, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error("getToday " + res.status);
    return res.json();
  }

  // === API呼び出し：気分を保存（POST） ===
  async function postMood(score) {
    const res = await fetchWithTimeout(
      API + "/api/mood",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      },
      FETCH_TIMEOUT_MS
    );
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("application/json")) throw new Error("APIがJSONを返していません");
    return res.json();
  }

  // === API呼び出し：過去の気分一覧を取得 ===
  async function getMoods() {
    const res = await fetchWithTimeout(API + "/api/moods", {}, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error("getMoods " + res.status);
    return res.json();
  }

  // === モーダル：表示 / 非表示 ===
  function showModal() {
    const el = document.getElementById("overlay");
    if (el) el.setAttribute("aria-hidden", "false");
  }

  function hideModal() {
    const el = document.getElementById("overlay");
    if (el) el.setAttribute("aria-hidden", "true");
  }

  // 日付文字列を "2026/3/8（日）" 形式に整形
  function formatDay(dayStr) {
    const d = new Date(dayStr + "T00:00:00");
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const date = d.getDate();
    const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return `${y}/${m}/${date}（${w}）`;
  }

  // 「今日の気分」ブロックの表示を更新（記録済み or 未記録）
  function renderToday(mood) {
    const el = document.getElementById("today-status");
    if (!el) return;
    if (mood) {
      el.textContent = "今日の気分: " + mood.score + " / 5（記録済み）";
      el.classList.add("recorded");
    } else {
      el.textContent = "今日はまだ記録していません。";
      el.classList.remove("recorded");
    }
  }

  // 気分一覧を「日付 → 点数」の連想配列に変換（グラフ用）
  function moodByDay(moods) {
    const map = {};
    (moods || []).forEach(function (m) {
      map[m.day] = m.score;
    });
    return map;
  }

  // 直近14日分の棒グラフを描く（データがない日は薄い棒）
  function renderChart(moods) {
    const chart = document.getElementById("chart");
    if (!chart) return;
    const map = moodByDay(moods);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      days.push({ day: dayStr, score: map[dayStr] != null ? map[dayStr] : null });
    }
    const maxH = 56;
    chart.innerHTML = days
      .map(function (item) {
        var day = item.day;
        var score = item.score;
        var label = day.slice(5).replace("-", "/");
        var h = score != null ? Math.max(8, (score / 5) * maxH) : 6;
        var cls = score != null ? "" : " empty";
        return (
          '<div class="chart-bar-wrap"><div class="chart-bar' +
          cls +
          '" style="height:' +
          h +
          'px" title="' +
          day +
          " " +
          (score != null ? score + " / 5" : "未記録") +
          '"></div><span class="chart-label">' +
          label +
          "</span></div>"
        );
      })
      .join("");
  }

  // 過去の記録一覧を描く（日付・点数）
  function renderMoodList(moods) {
    const list = document.getElementById("mood-list");
    if (!list) return;
    if (!moods || !moods.length) {
      list.innerHTML = '<li class="empty">まだ記録がありません</li>';
      return;
    }
    list.innerHTML = moods
      .map(
        function (m) {
          return (
            '<li><span class="day">' +
            formatDay(m.day) +
            '</span><span class="score">' +
            m.score +
            " / 5</span></li>"
          );
        }
      )
      .join("");
  }

  // サーバーに繋がらないとき：エラー表示・空のグラフ・モーダル表示
  function showServerDownUI() {
    var el = document.getElementById("today-status");
    if (el) {
      el.textContent = "サーバーに接続できません。サーバーを起動してから「再読み込み」してください。";
      el.classList.remove("recorded");
    }
    renderChart([]);
    renderMoodList([]);
    showModal();
  }

  // 1〜5のボタンが押されたとき：モーダルを閉じ、APIに送信し、画面を更新
  function onScoreClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest(".score-btn") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var score = parseInt(btn.getAttribute("data-score"), 10);
    if (!score || score < 1 || score > 5) return;

    var statusEl = document.getElementById("today-status");
    var overlayEl = document.getElementById("overlay");

    if (overlayEl) overlayEl.setAttribute("aria-hidden", "true");
    if (statusEl) {
      statusEl.textContent = "送信中…";
      statusEl.classList.remove("recorded");
    }

    postMood(score)
      .then(function (result) {
        if (result && result.ok) {
          renderToday({ day: result.day, score: result.score });
          return getMoods().then(function (res) {
            var moods = (res && res.moods) ? res.moods : [];
            renderChart(moods);
            renderMoodList(moods);
          });
        } else {
          if (statusEl) statusEl.textContent = "記録に失敗しました。もう一度お試しください。";
        }
      })
      .catch(function () {
        if (statusEl) {
          statusEl.textContent =
            "記録に失敗しました。サーバーが止まっている可能性があります。下の「サーバーを起動」を参照してください。";
        }
      });
  }

  // ページ読み込み時：今日の気分を取得 → 未記録ならモーダル表示 → 一覧・グラフを描く
  function init() {
    getToday()
      .then(function (today) {
        var statusEl = document.getElementById("today-status");
        if (!statusEl) return;
        if (today && today.mood === null) {
          showModal();
          renderToday(null);
        } else {
          renderToday(today && today.mood ? today.mood : null);
        }
        return getMoods();
      })
      .then(function (res) {
        var moods = (res && res.moods) ? res.moods : [];
        renderChart(moods);
        renderMoodList(moods);
      })
      .catch(function () {
        showServerDownUI();
      });
  }

  // 起動：クリック監視を登録し、init で初期表示
  function run() {
    document.body.addEventListener("click", onScoreClick, false);
    init();
  }

  // DOM の準備ができてから run（まだなら DOMContentLoaded を待つ）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

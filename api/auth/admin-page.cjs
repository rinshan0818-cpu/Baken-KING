'use strict';
// Server-delivered only after authenticated owner check in api/auth/index.js.
// Public JS/CSS contain no credentials and cannot grant admin privileges.
const HTML=String.raw`<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Baken-KING 管理者ページ</title>
<link rel="stylesheet" href="/admin-panel.css"></head>
<body><main>
<header><div><small>BAKEN-KING / 管理専用</small><h1>管理者ページ</h1></div>
<a href="/">アプリに戻る</a></header>
<section><h2>管理者認証</h2>
<p id="authStatus" role="status">ログイン権限を確認しています…</p>
<p class="muted">登録済みの本人アカウントだけが利用できます。友達に管理用パスワードを知らせる必要はありません。</p></section>
<section><h2>データの分離状態</h2>
<p class="muted">この端末内だけを確認します。他の利用者の端末やアカウントの履歴は取得しません。</p>
<div id="storageStatus" role="status">確認中…</div>
<p class="muted">旧形式の馬券が残っていても自動で削除・精算・変換しません。既存の保存キーは変えません。</p></section>
<section><h2>管理者用テスト環境</h2><p id="modeStatus">確認中…</p>
<div class="actions"><button id="switchMode" type="button">テストモードに切り替え</button>
<button id="clearTest" type="button" class="secondary">テスト用データだけ初期化</button></div>
<p class="muted">テスト馬券は本番と別のローカル保存領域に保存されます。切替後にアプリを開いてください。</p></section>
<section><h2>全記録の削除（管理者専用）</h2>
<p class="muted">通常の馬券・残高・精算履歴・シーズン記録をこの端末から削除し、初期状態へ戻します。自動的なリセットには使われません。削除前に通常アプリの「データ管理」からバックアップを保存してください。</p>
<div class="actions"><button id="clearProduction" type="button" disabled>この端末の全記録を削除</button></div>
<p id="clearProductionStatus" role="status" class="muted">本人認証の確認が必要です。</p></section>
<section id="adminOperations"><h2>接続・運用</h2>
<p class="muted">この端末から各APIに接続して、現在取得できる情報を確認します。結果はこの画面を開いた時点の状態です。</p>
<div id="operationOverview" class="operation-overview" role="status" aria-live="polite">接続状態を確認中…</div>
<div class="operation-list">
<div class="operation-item"><div class="operation-line"><strong>管理者認証</strong><span id="opsAuthBadge" class="operation-badge pending">確認中</span></div><p id="opsAuthDetail" class="muted">管理者ログインを確認します。</p></div>
<div class="operation-item"><div class="operation-line"><strong>出馬表の配信</strong><span id="opsCardsBadge" class="operation-badge pending">未確認</span></div><p id="opsCardsDetail" class="muted">当日分の配信APIを確認します。</p></div>
<div class="operation-item"><div class="operation-line"><strong>確定結果の配信</strong><span id="opsResultsBadge" class="operation-badge pending">未確認</span></div><p id="opsResultsDetail" class="muted">検証済み結果の配信APIを確認します。</p></div>
<div class="operation-item"><div class="operation-line"><strong>監視対象の登録</strong><span id="opsMonitorBadge" class="operation-badge pending">未確認</span></div><p id="opsMonitorDetail" class="muted">アカウントの登録済みレースを確認します。</p></div>
<div class="operation-item"><div class="operation-line"><strong>5分監視の実行履歴</strong><span id="opsRunBadge" class="operation-badge unknown">未取得</span></div><p id="opsRunDetail" class="muted">GitHub Actionsの実行履歴を読み込みます。</p><div class="ops-history"><div><span>最終実行</span><strong id="opsLastRun">未取得</strong></div><div><span>最終成功</span><strong id="opsLastSuccess">未取得</strong></div><div><span>直近エラー</span><strong id="opsLastError">未取得</strong></div></div><p class="muted">ワークフローの成功はJRA結果の取得成功とは限りません。対象なし・監視時間外の場合もあります。</p></div>
</div>
<p id="opsCheckedAt" class="muted">最終確認：まだ確認していません</p>
<div class="actions"><button id="recheck" type="button" class="secondary">接続状態を更新</button><a href="/">通常アプリで動作確認</a></div>
<p class="muted">通信エラーと「当日データがまだない状態」は区別して表示します。ここでは馬券や残高を変更せず、秘密鍵も表示しません。</p></section>
</main><script src="/admin-panel.js" defer></script></body></html>`;
module.exports={HTML};

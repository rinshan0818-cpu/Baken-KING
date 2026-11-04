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
<section><h2>接続・運用</h2>
<p class="muted">出馬表・結果・監視はアプリの共通APIを使用します。GitHubやVercelの秘密鍵はここに表示しません。</p>
<div class="actions"><button id="recheck" type="button" class="secondary">状態を再確認</button>
<a href="/">通常アプリで動作確認</a></div></section>
</main><script src="/admin-panel.js" defer></script></body></html>`;
module.exports={HTML};

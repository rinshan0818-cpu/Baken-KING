# Baken-KING：iPhoneのみ・本人専用の実レースデータ連携設計

更新：2026-10-29

## 目的と現状

- 使うのはユーザー本人のiPhoneのみ。Windows PCなし。ゲームは非商用・広告なし・課金なし。
- ゲームの公開URLは絶対に変更しない：https://rinshan0818-cpu.github.io/Baken-KING/
- **現在は実レースの自動取得・転送・購入・精算はいずれも未実装**。既存デモ／履歴を失わせない。
- データソース第一候補`jra-scr`（コードライセンス未確認）、第二候補`keiba-scraping`（MIT、実データ側の利用条件は別途確認）。
- 利用条件が確定するまでは、自動スクレイピングのスケジュールを有効化しない。

## 実用構成：公開するのは画面・プログラムのみ

```text
  [許容された個人用データ取得]
                  |
        非公開Linux実行環境
                  |
      検証・正規化（7券種）
                  |
    本人専用データストア（非公開）
                  |
         認証付きの読み取りAPI
                  |
         iPhone Baken-KING
       （静的HTMLはGitHub Pages）
```

### 実装判断

1. **GitHub Actionsは「スケジュール実行可能」でも「常駐サーバー」ではない**。実行結果を保存する領域と、iPhoneから読むためのAPIは別途必要。
2. 公開GitHub Pagesに実レースデータをコミットする案は採用しない。
3. GitHub PagesのJavaScriptに個人アクセストークン、API秘密鍵、GitHubプライベートリポジトリの認証情報を埋め込まない。GitHub raw private URLを秘密URLとして配ることもしない。
4. 取得元の個人利用条件とコードライセンスを別々に確認する。jra-scrはLICENSE確認待ち、keiba-scrapingはMITだが主な出馬表・結果の取得元がnetkeibaである。
5. データ取得時には同一レースID、取得日時、発走時刻、出走取消、着順確定の有無を検証する。欠損を0円として精算しない。
6. 本番購入締切は**信頼できる時刻を持つバックエンド**で判定する。今の静的PWAの時計だけでは購入不正を防ぎ切れない。

## 初期運用の選択肢（決定前）

|方式|実現できること|問題|現段階|
|---|---|---|---|
| GitHub Actions + 非公開データストア + 認証API | iPhoneだけで日々表示 | API/認証の開発、非公開DB、定期実行の遅延や制限 | **第一候補として設計のみ** |
| 本人専用の無料クラウドサーバーにAPI常駐 | 取得・保存・読み取りを一体化 | 無料枠、停止・時間制限、認証・セキュリティ、規約 | 要比較 |
| iPhoneのファイル読み込みのみ | サーバー不要、データ非公開 | 毎回の手動作業が多い | 暫定手段（設定タブに機能あり） |
| 第三者の無許可公開データAPI | 手軽に見える | 利用条件・継続性・情報精度が不明 | **不採用** |

## 出来ているデータ基盤（取得ではない）

- `race-data.js`：共通スキーマ、発走時刻、取得元ID、購入可否の安全な既定値。
- `jra-adapter.js`：jra-scrモデルの出馬表・発走前オッズ・結果・7券種払戻を共通形式へ変換。
- `race-bundle.js`：同じレースをまとめる。別レース・発走後の事前オッズを拒否。
- `scripts/inspect-private-race.cjs`：許可済み個人用JSONを非公開環境から検証するコマンド。
- 各種オフラインテスト。**GitHub Actionsの実行結果は、実行履歴が取得できるまでは未確認**。

## STEP 1の完了条件

- [ ] jra-scrまたは代替ソフトのコード利用権が明確（MIT等、または作者の個別許諾）
- [ ] 取得元サイトの自動取得・非公開保存・本人専用表示の可否が明確
- [ ] Linux実行テストの**成功ログ**を確認できる
- [ ] 許容された方法で過去のJRAレース1件から出馬表・オッズ・確定結果・払戻金を取得できる
- [ ] 得られたデータの7券種・取消・同着・返還の扱いを検証できる
- [ ] 本人のみアクセスできるiPhoneのデータ経路と保護が確認できる

## 検証リンク

- [オフライン共通テスト](https://github.com/rinshan0818-cpu/Baken-KING/actions/workflows/validate-race-data.yml)
- [jra-scr Linuxテスト](https://github.com/rinshan0818-cpu/Baken-KING/actions/workflows/check-jra-scr-offline.yml)
- [keiba-scraping Linuxテスト](https://github.com/rinshan0818-cpu/Baken-KING/actions/workflows/check-keiba-scraping-offline.yml)
- [問い合わせ案](jra-scr-permission-check.md)

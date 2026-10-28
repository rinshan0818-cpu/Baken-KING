# レースデータ取得・利用条件の調査（2026-10-29）

Baken-KINGは**非商用・広告なし・課金なし**の個人と少人数の友人向けゲーム。ただしGitHub Pagesで公開されているため、各ユーザーへのデータ配信は「個人が自分だけで閲覧すること」とは異なる。

## 確認できた情報源

| 提供元 | 入手できるもの | 公開ゲームへの組み込み判断 |
| --- | --- | --- |
| JRA公式サイト | 出馬表・結果・払戻等を閲覧可能 | **自由に再配信できるAPI・許諾は未確認**。画面や記事等の転載を前提にしない |
| JRA-VAN Data Lab. | 詳細な中央競馬データ | **通常契約で利用者へデータ再配布不可**。非商用の公開ゲームでも個人利用とは区別する |
| 地方競馬情報サイト（NAR） | レース情報・オッズのダウンロード機能あり | **JRAではなく地方競馬**。利用規約は転載・複製を制限。非商用公開アプリでの可否は要照会 |
| 非公式API・GitHubデータセット | 形式・提供範囲はさまざま | 出典・権利・継続性が不明なものは採用しない |

参照（公式）：
- JRAサイト利用案内：https://www.jra.go.jp/use/
- JRA競馬情報案内：https://www.jra.go.jp/owner/members/faq/category_f.html
- JRA-VANスタッフの再配布説明：https://developer.jra-van.jp/t/topic/899
- JRA-VANスタッフの個人利用と公開の区別：https://developer.jra-van.jp/t/topic/287
- 地方競馬データダウンロード説明：https://www.keiba.go.jp/pdf/manual/data_pdf_manual.pdf
- 地方競馬サイト規約：https://www.keiba.go.jp/terms.html

## 取得方式の採用条件

1. **データの保存・加工・友人への表示が利用条件上認められていること**（非商用でも要確認）。
2. 過去レースの出馬表・枠番・馬番・馬名・発走時刻・確定着順・券種別払戻金が揃うこと。
3. 本番用には開催前の出馬表・発走時刻・取消・変更情報が必要。できれば時点別オッズも取得できること。
4. 安定して継続利用でき、費用が原則無料であること。
5. データ提供元を変更してもゲーム本体の変更を最小限にするため、アプリ内の共通JSON形式へ変換すること。

## 共通データモデル（設計案。未実装）

- raceId：日付＋競馬場コード＋レース番号等で一意にする。
- scheduledStartAt：日本時間オフセット付きISO 8601。開催日だけで購入可否を判定しない。
- horses：馬番、枠番、馬名、出走状態（出走・取消・除外など）。
- odds：券種、組み合わせ、倍率、取得時刻（購入時点のオッズと最終オッズを混同しない）。
- result：確定状態、着順、同着、返還情報、払戻金（100円あたり）。
- provenance：提供元、取得日時、利用条件の根拠。
- mode：development / production。**開発用過去レースの成績は正式な成績に加算しない**。

## 本番の購入制限

- 過去レース：閲覧専用、購入不可。
- 開発モード：過去レースでテスト購入可。ただし正式資金・ランキングとは分離。
- 本番モード：締切前かつ結果未確定のレースのみ購入可。端末時刻の変更で制限を回避できないよう、将来は信頼できるサーバー時刻と締切管理が必要。
- 出走取消・返還・同着等は、単純な「着順3頭」だけでは正しく精算できない。データが揃うまで本番精算を有効にしない。

## 現段階の結論

**JRAの実レースデータをGitHub Pagesから自動取得し、公開ゲームに再配信できる無料・許諾済みの経路は、まだ確認できていない。**

当面は取得元の調査と利用許諾の確認を優先。権利が不明な実レースデータをリポジトリにアップロードしない。現在の `sample-race.json` は架空のテスト用データであり、実レースの代替ではない。

## 2026-10-29 追加調査：オープンソースの取得プログラム

候補：`kawaberi01/jra-scr`
- 公開ドキュメント：https://github.com/kawaberi01/jra-scr/blob/main/docs/jra/05_API%E4%BB%95%E6%A7%98.md
- 出馬表・オッズ・結果・払戻をローカルのHTTP APIにまとめる実装がある。
- **「JRA 公式 API」という見出しは、その開発者による取得対象の分類であり、JRAが公開・保証する公式APIの存在を意味しない。** ドキュメントのベースURLは `http://127.0.0.1:8000` で、そのままGitHub Pagesから利用するクラウドAPIではない。
- オープンソースのコードを読めることと、取得したJRA由来のデータをBaken-KINGのGitHub Pagesへ公開・再配信できることは別。
- 評価：**技術調査候補**。利用条件・負荷・実際の動作・ライセンスを未検証のためBaken-KINGには未統合。

公式確認資料：
- https://www.jra.go.jp/faq/pop02/1_6.html （過去レース結果の閲覧範囲）
- https://www.jra.go.jp/use/ （掲載素材の利用に関する案内）
- https://developer.jra-van.jp/t/topic/899 （Data Lab.通常契約での再配信制限）

### 技術的な次の確認

1. 実際にJRA出走表・結果の**同じ1レース**が一貫して取得できるか、取得時点のオッズと結果確定後の払戻を区別できるか。
2. 取得元の利用規約を調べ、**非商用の友人向け公開Webゲームへの配信**が許されるか確認する。
3. 出典・利用条件が確認できる場合に限り、アプリ共通JSONへ変換する方法を試験。
4. 本番購入の可否は、サーバー側の締切管理ができるまで常に禁止する。

## 2026-10-29 深掘り：非商用でも第三者配信は別問題（一次情報確認）

### A. JRA-VAN Data Lab.：**Baken-KINGの公開配信には不適合**

- 公式の2020年回答（2025年移管掲載）：個人向けデータは、一部・改変後の内容でも、インターネットなどを通じて第三者に公表することを禁じる。https://developer.jra-van.jp/t/topic/311
- 公式の2020年回答（2025年移管掲載）：データを使った競馬サイト公開は利用規約違反で、競馬サイトではJRADB契約が必要。https://developer.jra-van.jp/t/topic/287
- 公式の2026年7月6日案内：通常Data Lab.契約で、エンドユーザーにデータを配信するスマホアプリは再配布（二次利用）に当たり不可。https://developer.jra-van.jp/t/topic/899
- 結論：**「非商用・少人数なら通常契約でOK」とは解釈できない**。利用許可を別途得ない限り本番データソース候補から外す。

### B. netkeiba：**無断での公開ゲームデータソース化は不可**

- 利用規約第14条は、承認を得ていないデータの私的利用外への複製等を禁じ、不特定または多数の人が知り得る状態に置く行為を目的を問わず私的利用外とみなす。
- https://www.netkeiba.com/info/kiyaku.html
- 少人数の非公開利用についてまで一律に許諾の有無を断定するものではないが、**Baken-KINGの一般公開GitHub Pagesに転記・再配信する用途には現時点で不採用**。

### C. 地方競馬公式ダウンロード：**技術面は有望、許諾は未確認**

- 公式の2026-05-18更新マニュアルによれば、ZIP内CSVの「レース情報（出馬表・払戻金・レース一覧）」および「オッズ情報」を当日・月次単位でダウンロード可能。
- マニュアル：https://www.keiba.go.jp/pdf/manual/data_pdf_manual.pdf
- 利用規約：https://www.keiba.go.jp/terms.html
- JRAとは別競馬体系。技術的にはデータモデルの試験素材候補だが、**ダウンロードできることはゲーム内での転載・再配信許可を意味しない**。事前照会が必要。

### D. GitHub非公式取得実装：**データの権利は解決しない**

- https://github.com/kawaberi01/jra-scr/blob/main/docs/jra/05_API%E4%BB%95%E6%A7%98.md
- ローカルHTTP APIで出馬表・結果・オッズの取得を設計する事例。APIの存在とデータ再配布の許諾は別であり、**非公式スクレイパーを挟んでもJRA由来情報の再利用条件を回避できない**。

### E. 次の現実的な選択肢（優先順）

1. **JRA／JRA-VANに非商用・無広告・少人数のWebゲームへのデータ掲載を個別照会**。公開GitHub Pages、出馬表・発走時刻・払戻、更新頻度、保存期間、過去レースのテスト利用、友人への共有を具体的に伝える。無料の個別許諾があると想定せず確認する。
2. **地方競馬の公式データダウンロード担当に、CSVから変換したデータの非商用Web公開が可能か照会**。JRAとは別でも、許諾されれば検証用データの選択肢になる。
3. **ユーザー本人の入力値や許諾済みデータだけを使用する開発モード**を維持。ただし、本番の自動連動要件は満たせないため暫定手段と明示。
4. 出典の明確な個々の事実を手作業で確認する場合も、元サイトの規約、体系的な収集、公開範囲は別問題として評価する。

### 採否判断

- データ入手手段だけでなく、**①取得、②加工・保存、③GitHubへのコミット・公開、④友人への表示、⑤定期更新**の各許諾範囲を確認する。
- 非商用という理由だけで許諾済みとみなさない。
- 承認が取れるまでは、本番用の実レースデータ公開・自動取得は実装しない。

## 2026-10-29 GitHub公開プロジェクト追加比較（iPhone専用・1人用へ方針転換後）

調査基準：①JRA出馬表・オッズ・着順・払戻、②Python/Linux環境での実行可能性、③ゲーム向けJSON化、④コードの利用ライセンス、⑤取得元サイトの規約と私的利用範囲、⑥iPhoneへの安全なデータ連携。下記は**README・公開ドキュメントの確認**であり、実アクセス・再現試験は未実施。

| 候補 | 出馬表 | オッズ | 結果・払戻 | 技術評価 | 主要な未解決点 |
| --- | --- | --- | --- | --- | --- |
| [kawaberi01/jra-scr](https://github.com/kawaberi01/jra-scr)（README内名称はjra-srb） | ○ | ○ | ○ | **第一候補**。Python 3.12+, FastAPI, JSON API、ローカルキャッシュ・スナップショット機能あり | リポジトリの明示的ライセンスを今回確認できず。GitHub Actionsの短時間実行は未検証。JRAサイトの利用条件を要検証 |
| [KeibaAI-developer/keiba-scraping](https://github.com/KeibaAI-developer/keiba-scraping) | ○ | ○ | ○（8券種の払戻メソッド） | **第二候補**。MITコードライセンス、Python、pandas、Playwright。過去レースの検証向き | JRAオッズ取得にはPlaywright/Chromiumが必要。netkeiba取得部分を混同しない。元サイトのデータ利用許諾は別 |
| [KeibaAI-developer/keiba-data-interface](https://github.com/KeibaAI-developer/keiba-data-interface) | ○ | ○ | ○ | **第三候補**。MIT、プロバイダー交換を抽象化 | 取得本体はkeiba-scrapingまたはJRA-VANの外部依存。単独で新しい取得経路を生むものではない |
| [tsukasaI/keiba-ai](https://github.com/tsukasaI/keiba-ai) | ○ | △ | △ | 古いKaggleの過去データ（1986〜2021）とライブ取得コードの参考 | AI予想に重点、Baken-KINGの8券種払戻・リアルタイム取得の一式は未確認。Kaggle配布元の権利を要確認 |
| [SatoHub/k-bar-ai](https://github.com/SatoHub/k-bar-ai) | ○ | ○ | △ | Playwright・FastAPI・Next.jsなどの構成例 | JRA-VAN/JV-Linkに依存する部分あり、クラウドの個人運用には複雑 |
| [AlexBerns/Horse-Racing](https://github.com/AlexBerns/Horse-Racing) | △ | ○ | △ | 2020〜2022年の歴史データを利用した学習研究事例 | ライブ取得には不向きで、データの再利用権も未確認 |

**記号：○=READMEに対応記述あり、△=部分対応または未確認。「動作検証済み」の意味ではない。**

### jra-scrで優先確認したい具体的機能

- `GET /meetings/{date_}/{course}/races/{race_no}/card`：出馬表。
- 同 `/odds`：券種別オッズ。
- 同 `/result`：着順・払戻。
- `/jra/races/{race_id}/pre-race-snapshot`：保存済みの**発走前の**出馬表とオッズの再現。
- `/jra/races/{race_id}/odds-timeline`：購入時点のオッズ検証に利用可能な形式。
- ドキュメント：https://github.com/kawaberi01/jra-scr/blob/main/docs/jra/05_API%E4%BB%95%E6%A7%98.md
- `127.0.0.1:8000` のローカルAPIであり、そのままiPhone上のGitHub Pagesからアクセスできない。
- リポジトリに明示的なライセンスがなければ**ソース公開≠改変・再配布自由**。インストールして検証する前にライセンスを確認。

### keiba-scrapingの特徴

- 単勝・複勝・枠連・馬連・ワイド・馬単・三連複・三連単の払戻メソッドを公開。
- `pandas.DataFrame` 形式のためBaken-KING JSONへ変換が必要。
- Python 3.12以上。JRAオッズ取得はPlaywright/Chromium、Selenium利用機能ではChromeDriverが必要。
- ソフトウェア自体はMIT。ただしこのライセンスは**JRA/netkeibaから取得したデータへの権利を付与しない**。
- https://github.com/KeibaAI-developer/keiba-scraping

### 技術上の次のPoCゲート（この段階では実行していない）

1. **コードライセンス確認**、対象サービスの利用条件とアクセス制御の確認。許諾のない自動収集やGitHub公開へのアップロードをしない。
2. 許容される検証範囲で、過去の同一レースの**出馬表→払戻まで**を1つの取得方式で得られるかテスト。再現できたデータは公開GitHubへ置かない。
3. 結果ページを使って発走前オッズを補完しない。時点を区別し、取消、枠番、的中組合せの整合性を検証。
4. Linuxで処理できる場合も、GitHub Actionsでの定期実行可否、保存先、非公開認証、無料枠、遅延・実行スケジュールを実測する。
5. **個人専用の非公開保存領域とiPhoneとの連携が必要**。GitHub Pagesだけではサーバー秘密情報や個人データを安全に隠せない。
6. データの権利・技術の両面がクリアになるまでアプリ本体はv2.5維持。試作する場合も架空fixtureで先に検証。

### 設計上の注意

- 出走馬データと同一レースの時点別オッズ、結果・払戻をraceIdに紐付ける。
- 開発用の過去レーステストと、本番の仮想成績を分ける。
- 本番の購入締切はクライアント時計だけに依存せず、信頼できる時刻基準が必要。
- 自動取得が許容されるかは**非商用・本人1人用でも別途確認**。過去データ・単なる数値・著作物、元サイトの利用規約はそれぞれ別の論点。

参照：jra-scr README https://github.com/kawaberi01/jra-scr ; keiba-scraping README https://github.com/KeibaAI-developer/keiba-scraping ; data-interface README https://github.com/KeibaAI-developer/keiba-data-interface ; JRA利用案内 https://www.jra.go.jp/use/

## 2026-10-29 検証フェーズ：公開ソースの構造を追加確認

### 第一候補の注意点（jra-scr）
- READMEではPython 3.12+、FastAPI、SQLiteキャッシュ、出馬表・オッズ・結果・払戻APIを説明。
- 取得元はJRA公式サイトHTMLの解析。データ利用規約・アクセス頻度の確認を開発者自身も注意喚起。
- **公開のファイル一覧にLICENSEファイルは確認できない**（2026-10-29閲覧）。ソースの再配布・改変を当然に認めるものと扱わない。検証前に開発者に利用ライセンスを確認する。
- ローカルAPIは既定で127.0.0.1:8000で、READMEに**認証未実装のためインターネット公開禁止**と明記。iPhoneから直接接続できる公開サーバーではない。
- 保存済み発走前スナップショットは、**過去に収集して保存したもの**の参照であり、過去の全レースの発走前オッズが自動復元できるわけではない。
- 参照：https://github.com/kawaberi01/jra-scr 、https://github.com/kawaberi01/jra-scr/blob/main/docs/jra/05_API%E4%BB%95%E6%A7%98.md

### 第二候補の注意点（keiba-scraping）
- MITコードライセンスはGitHubページで確認。
- **出馬表のEntryPageScraper、結果と8券種払戻のResultPageScraperはnetkeibaのページを例示**。一方、JRA公式からのオッズ取得は別のPlaywright関数として実装。
- そのため、**JRA公式だけで出馬表→全払戻が揃うと断定できない**。netkeibaの利用規約上の取り扱いを慎重に評価する必要がある。
- 参照：https://github.com/KeibaAI-developer/keiba-scraping

### Baken-KING側の検証コード（実データ取得なし）
- `tests/race-data.test.cjs`：架空の過去レースfixtureを検証し、重複馬番拒否と本番購入禁止を確認するオフラインテスト。
- `.github/workflows/validate-race-data.yml`：LinuxのGitHub Actionsで上記テストを走らせる設定を追加。**ワークフローの実行成功までは未確認**。
- 第三者の競馬サイトへのアクセス・取得・保存・公開は行わない。これはデータ変換基盤の動作検証であり、jra-scrやkeiba-scrapingの実行テストではない。

### 次の進捗ゲート
1. jra-scrの作者に**コード使用ライセンス**と、非商用個人利用での取得方針の助言を照会。
2. 取得元サイトの利用条件と個人的な自動取得の扱いを確認。
3. 条件を満たす場合のみ非公開のLinux環境で、過去の出馬表・結果・払戻を単発取得して検証（公開リポジトリへ収録しない）。
4. データ形式が確定したら変換アダプターを作成し、本人のiPhoneへ**認証付き**で接続。GitHub PagesにAPI秘密情報を埋め込まない。

## 2026-10-29 jra-scr実装のデータ型を直接照合（出典リポジトリ確認）

参照：https://github.com/kawaberi01/jra-scr/blob/main/src/jra_srb/models.py

- `RaceCard`：`race_id`, `course`, `start_time`, `runners`。馬は `horse_no`, `frame_no`, `horse_name`, `status`（active/withdrawn）。**馬番等は文字列で返る**。
- `RaceOdds`：`bet_type`, `entries`, `odds`, `fetched_at`。 `OddsEntry` に `combination`, `odds`, `odds_min`, `odds_max`。競馬データの時点を区別する必要がある。
- `RaceResult`：`results` の各着順要素に `rank`, `horse_no`、`payouts` に `bet_type`, `combination`, `payout`（文字列）。JRAの同着、返還、人気、配当表記の精査は未実施。
- `BetType` は win/place/quinella/wide/exacta/trio/trifecta。**枠連に対応するbet typeが列挙されていない**ので、Baken-KINGの全8券種へそのまま対応するとは言い切れない。
- `README.md` は公式HTML解析が含まれること、アクセス間隔や規約に注意すべきこと、ローカルAPIを認証なしで公開しないよう警告している。
- `LICENSE` の取得をGitHub Contents APIで試したが404。 `pyproject.toml` にライセンス指定も見当たらず、**著作権者からの利用条件が明確になるまで、このプロジェクトのコードをコピー／改変しない**。

### 今回作成した自作アダプター

- `jra-adapter.js`：ドキュメント化された**出馬表JSONの項目**を、Baken-KINGの共通スキーマへ変換（10競馬場、馬番、枠番、馬名、取消、発走時刻）。**他者のソースコードをコピーしない・実サイトへアクセスしない**。
- `tests/jra-adapter.test.cjs`：全て架空の出馬表を使った変換検証。既存の `tests/race-data.test.cjs` と共にGitHub Actionsで実行する設定。
- 実レース結果・払戻・オッズの変換はデータ表記と権利を確認してから。コード作成は接続・自動取得の成功を意味しない。
- GitHub Actionsの**実行結果は未確認**。ワークフローを追加したことと実行成功は区別する。

## 2026-10-29：枠連除外後の7券種・結果形式の独立変換試作

- ユーザーは枠連を実レース連動の必須対象から除外した。対象は単勝・複勝・馬連・ワイド・馬単・三連複・三連単の7券種。
- `jra-scr` の公開モデル `ResultEntry.rank/horse_no` と `PayoutEntry.bet_type/combination/payout`（文字列）をGitHub Contentsで直接照合。
- `jra-adapter.js` に、**架空の入力だけを対象にした** `convertResult` を追加。7券種の英語識別子から日本語券種へ変換、組合せ・100円あたり払戻金（例：1,250円）の基本形式を検証。
- **同着、着順欠落、範囲外の馬番、不明な券種・配当文字列はエラーとして止める**。払戻が全組合せで揃っていない場合にゼロ円精算は行わない。変換結果のステータスは `provisional` とし、公式確定結果だと断定しない。
- `tests/jra-adapter.test.cjs` に7券種の架空配当テストと不正データの拒否テストを追加。ワークフローは既存のNode 22オフラインテストを使用。
- **未実施**：jra-scrの実行、JRAサイトへの実アクセス、実データの取得、実際の文字列形式の網羅、取消返還・同着精算、CI成功確認、iPhoneからの接続。
- 今後の重要な確認：プロジェクト作者にコード利用許諾を照会すること、取得元の個人利用規約を確認すること、外部に公開しないLinux環境で単発動作テストを実施すること。

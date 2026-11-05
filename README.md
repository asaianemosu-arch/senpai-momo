# Senpai Momo

**Your shop's manual, just by talking.**

Small food shops rarely have a manual. The know-how lives in the chef's head and hands, and staff are often too afraid to ask. Senpai Momo (モモ, "Momo") is a friendly "senior colleague" on a tablet. The chef and the manager simply talk to her during the working day; she listens, asks gently, and writes the shop's manual page by page. Staff can then ask her anything, as many times as they like, and she answers from that manual.

Built for **Built with Claude: Japan 2026**. The sample shop, "Mofumofu Bakery", is fictional.

**Try it:**  
https://app.momo-buddymos.workers.dev  
(opens with the sample shop; the buttons at the bottom of the left column restore the sample or start a blank shop)

## What it does

**Making, handing out and reading a manual through conversation**
- Momo helps write a professional manual that needs expert knowledge, from natural conversation in the chat. She takes voice input, typing, attached files and handwritten recipes. Made for a busy kitchen floor: big buttons and letters, easy to read, with photos placed by Momo where they belong in the manual. When staff ask, she explains the part of the manual that answers them. What the manual does not cover yet, she remembers and later asks the people who write it (the chef, the manager), filling the gap between "those who teach" and "those who learn". Her expert knowledge and careful way of communicating are what set her apart from a simple question-and-answer bot.

**Teaching side (chef, manager)**
- Talk with the big mic button, or type. Hand over what you already have: a pasted memo, PDF, photos (JPG, PNG, HEIC), Word, Excel, text files, and photos of handwritten notes.
- Momo answers first, in a few seconds, then writes the manual in the background, so nobody waits for the page.
- She files what she hears where the work happens, not in the order it was said: one remark can land in both "Close" (write the daily report) and "Before opening" (read yesterday's notes).
- She notices when the speaker changes (chef → manager) and greets them; the speaker can also be chosen on screen.
- She keeps a quiet list of what is still missing and asks one thing at a time, only when the talk settles. A handwritten memo is usually missing something (sometimes the baking temperature), and she asks for it once the chef has finished talking about it.
- She never deletes or rewrites what the chef has checked. Every page can also be edited (✏️), and nothing reaches the staff until the chef checks it page by page and hands it out.

**Staff side**
- Ask by voice or text. Momo answers only from the handed-out manual and shows the exact place on the page ("👀 here it is").
- When the manual does not have the answer, she says so honestly, remembers the question, and later asks the chef in passing.
- Checklists for opening and closing, showing only the routine work set for today's weekday in the manual.
- A daily hygiene record (fridge and freezer temperatures with a number pad, cleaning checks). *It refers to the "record forms (daily type)" in the Guidebook on food hygiene management in bread making that adopts the HACCP approach (Japan Institute of Baking, All Japan Bread Cooperative Federation, Japan Bakery Industry Association).

**The manual**
- Parts: the day's timetable (built automatically from the times in the manual), before opening, during service, recipes, cleaning, close, and hygiene records.
- Pages are made of bundles of steps with icons, photos, "important" rules, "don't forget" marks and "points" (only what changes with the season or the dough), so staff do not have to read walls of text.
- On screen, a manual page is called 紙 (*kami*, "paper"), like the paper manuals a shop pins up or hands out. It is a page on the screen, not a printout.

## How to use

**The screen**
- **Left: the shop's manual.** The parts of the manual (the day's timetable, before opening, during service, recipes, cleaning, close, hygiene records). Under each, the names of what it holds. A part Momo has just written to glows and shows "+1".
- **Middle: talking with Momo.** The conversation, the big 🎤 button, ✍️ (read handwriting), 📋 (paste), and a box for typing.
- **Right: the page.** The page of the part chosen on the left.
- **Top right: who you are.** "シェフ（教える）" (chef, teaching) or "スタッフ（聞く）" (staff, asking).
- On a phone (760 px wide or less) the conversation fills the screen; the manual opens from the button at the top left.

**Teaching (chef, manager)**
1. Press 🎤 and talk as you would to a new colleague. Press it again (送る) when you finish. You can also type in the box.
2. To hand over something you already have: 📋 for a memo, a file or a pasted text; ✍️ for a photo of handwriting or a paper PDF (on a phone you can take the picture there and then).
3. Momo answers in a few seconds. A moment later the line "→ …に入れました" says which page she wrote to, and that part glows on the left.
4. When someone else takes over (the manager, the owner's wife…), they can just say who they are, or choose the speaker from "〇〇とお話し中 ▾" at the top of the conversation.
5. To fix a page by hand, press ✏️ next to what you want to change. While Momo is still writing, the ✏️ buttons wait.
   - When fixing steps, 📷 adds a photo and 🎬 a short video (up to 30 seconds) to a step. The video plays silently in a small frame beside the step, over and over; press it to watch it big.
6. When a page is ready, press "スタッフに配る" (hand out to staff). You check what is new or changed, one page at a time, then "これで配る". Staff see only what has been handed out.

**Asking (staff)**
1. Switch to "スタッフ（聞く）" at the top right.
2. Ask Momo by voice or text. She answers from the handed-out manual and opens the page at the right place ("👀 ここですよ").
3. On "before opening" and "close", switch between 📖 読む (read) and ☑️ チェック (tick off today's list).
4. "衛生の記録" (hygiene records): enter fridge and freezer temperatures with the number pad and answer the checks, in the morning, after lunch and before going home. The checks done for the day tick themselves off on the checklist.

**Starting over**
At the bottom of the left column: "見本に戻す" puts the sample shop back; "まっさらのお店で試す" starts a blank shop. Both ask once before clearing the conversation and pages.

## Specifications

**Works on**
- Chrome, Edge or Safari, on a computer, tablet or phone.
- Voice input needs the browser's speech recognition and permission to use the microphone: Chrome, Edge and Safari can; Firefox cannot (you can still type).
- Momo's voice (🔊) needs sound on the device.

**Files you can hand over**
| Kind | Extensions | How it is read |
|---|---|---|
| Text | .txt .csv .tsv .md .rtf | read in the browser (also Shift_JIS from older Windows/Excel) |
| Word | .docx | read in the browser |
| Excel | .xlsx .xls .xlsm .ods | every sheet, read in the browser |
| PDF | .pdf | Claude reads it (up to 10 MB) |
| Photos | .jpg .jpeg .png .webp .gif .heic .heif | Claude reads them; HEIC (iPhone) is converted in the browser |

Old Word (.doc) and Pages / Numbers / Keynote files cannot be read: save them as .docx, .xlsx or PDF first.

**Limits**
- The shop's data (conversation, manual, hygiene records, photos) is kept only in the browser it was made in. It is not shared between devices or browsers, and clearing the browser's site data erases it. In the demo, chef and staff switch on the same screen.
- Momo reads the most recent 40 messages of the conversation; what came before is already in the manual and in her notes.
- Pasted text and text read from files: up to 30,000 characters at a time.
- Photos are shrunk to 1,568 px on the long side before Momo reads them.
- Step videos: up to 30 seconds, kept in the browser like photos. Momo cannot watch them; they are for people to see the hands at work. A video taken on an iPhone may not play on some Windows computers.
- To protect the shared keys, each connection can ask Momo about 20 times a minute (more for her writing) and play about 20 voices a minute; past that, she asks you to wait a minute.
- Checklist ticks last for the day; the hygiene record is kept day by day.
- Momo's voice is made only when 🔊 is pressed, and kept while the page is open, so you can play it again.

**How Momo writes**
- Each turn: a quick reply first, then the manual pages, written while you go on talking.
- She files work where it happens, not in the order it was said, and never deletes or rewrites what the speaker has edited.
- She keeps up to 8 notes of what is still missing (including questions staff asked that the manual could not answer) and asks one at a time, only when the talk settles.
- The day's timetable is built from the times written in the manual; weekday-only work shows only on its days.
- The hygiene plan refers to the "record forms (daily type)" in the Guidebook on food hygiene management in bread making that adopts the HACCP approach (Japan Institute of Baking, All Japan Bread Cooperative Federation, Japan Bakery Industry Association).

## Claude API

- **Claude Opus 5.5** runs Momo, in two calls per turn: a quick reply (`effort: low`) and the manual writing (`effort: medium`), both with structured outputs (Zod schemas) and a cached system prompt.
- Photos, handwriting and PDFs go to Claude directly, and what it read is kept with the conversation.
- Momo's way of listening (`src/core/momo-prompt.ts`) comes from the interviewing skills the author built over 30 years of listening to chefs as a food editor. For example: "don't always answer with a question", "at most one question", "help put into words what people 'just know by looking'", and "leave the speaker with more energy and confidence than before".
- The whole app was built with **Claude Code** by an author who does not write code, in conversation with it: every screen, the relay, Momo's instructions and the checks came out of the two talking together, mock-ups and testing in a browser.

## How it is built

- React 19 + TypeScript + Vite, on Cloudflare Workers (the worker is a small relay to Claude and ElevenLabs; it stores nothing).
- The shop's data stays in the browser (localStorage, and IndexedDB for photos).
- Voice: speech input uses the browser's speech recognition; Momo's voice is ElevenLabs (v4 Turbo), made only when 🔊 is pressed.
- Files are read in the browser: Word (mammoth), Excel (SheetJS), HEIC (heic-to).
- Per-connection rate limits on the relay protect the shared keys.
- `src/core/` is the shared base; `src/trades/bakery/` holds the bakery's parts, hygiene plan, knowledge and sample shop, built so that other kinds of food shop can be added.

## Run it yourself

```bash
npm install
```

Create `.dev.vars` with your own keys (never commit it):

```
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
MOMO_VOICE_ID=...
```

```bash
npm run dev
```

To publish on your Cloudflare account, set the same three values with `npx wrangler secret put`, then `npm run deploy`.

## License

The code is released under the MIT License. The Momo illustrations in `assets/momo/` are not covered by it. See [LICENSE](LICENSE).

---

# 先輩店員 Momo

**お店のマニュアルを、話すだけで。**

小さな飲食店には、マニュアルがほとんどありません。技はシェフの頭と手の中にあって、スタッフは聞くのをためらいがちです。先輩店員 Momo（モモ） は、タブレットの中の人懐っこい先輩です。シェフや店長は、ふだんの仕事の合間にモモと話すだけ。モモは聞いて、そっと聞き返して、お店のマニュアルを1ページずつ書いていきます。スタッフはそのマニュアルをもとに、モモに何度でも聞けます。

**Built with Claude: Japan 2026** の作品です。見本のお店「もふもふベーカリー」は架空のお店です。

**試す：** 
https://app.momo-buddymos.workers.dev
（見本のお店が入った状態で開きます。左の列のいちばん下から、見本に戻したり、まっさらのお店で試したりできます）

## できること

**会話からのマニュアル作成と配布・閲覧**
- チャットでの自然な会話から専門知識の必要なプロ向けマニュアルの作成をサポートします。音声入力／文字入力／添付ファイル読み込み／手書きレシピなどの読み込みに対応します。忙しく立ち働く飲食店の現場で使いやすく、見やすいように、ボタンや文字は大きめ、マニュアルには写真を適した位置にモモが配置します。閲覧者が質問すると、該当部分を説明。まだマニュアル化されてない項目は覚えておき、モモが後日作成者（シェフ・店長）に聞くことで、「教える側」と「教わる側」の意思疎通を補完します。専門知識とこまやかなコミュニケーション力の高さが、シンプルな質疑応答BOTとは大きく異なる点です。

**教える側（シェフ・店長）**
- 大きなマイクで話すか、文字で書く。手元の資料もそのまま渡せます：貼ったメモ、PDF、写真（JPG・PNG・HEIC）、Word、Excel、文字のファイル、手書きのメモの写真。
- モモは先に数秒で返事をします。マニュアルのページは、シェフが次の話をしているあいだに書きます。シェフを待たせません。
- 話した順ではなく、その仕事が行われる場所へ振り分けます。ひとつの話が「クローズ」（日報を書く）と「オープン前」（前の日の申し送りを読む）の両方に入ることもあります。
- 話し手が代わったら（シェフ → 店長）気づいて迎えます。画面で話し手を選ぶこともできます。
- 足りないことはこっそり覚えておいて、話がひと段落したときに、ひとつずつ聞きます。手書きのメモには、たいてい何かが抜けています（ときには「焼く温度」など）。シェフがメモの話をし終えてから、そっと聞きます。
- シェフが確かめたことを、勝手に消したり言い換えたりしません。どのページも ✏️ で編集できます。シェフが1ページずつ確かめて「スタッフに配る」を押すまで、スタッフには届きません。

**聞く側（スタッフ）**
- 声か文字で聞く。モモは配られたマニュアルだけをもとに答え、ページのその場所を「👀 ここですよ」と見せます。
- マニュアルにないことは正直に「まだ書かれていない」と伝え、その質問を覚えておいて、あとでシェフにさりげなく聞きます。
- オープン前・クローズのチェックリスト。マニュアルから曜日の定例分だけ自動で表示します。
- 毎日の衛生の記録（冷蔵庫・冷凍庫の温度は数字のキーで、清掃のチェックも）。＊HACCPの考え方を取り入れたパン類の製造における食品衛生管理の手引書（日本パン技術研究所・全日本パン協同組合連合会・日本パン工業会）「記録様式（日報型）」を参照しています。

**マニュアル**
- 1日の流れ（マニュアルの時刻から自動でできる時間割）、オープン前、営業中、レシピ、清掃、クローズ、衛生の記録。
- ページは、アイコンつきの手順、写真、「大切なこと」、「忘れずに」、「ポイント」（季節や生地の様子で変えるところだけ）でできていて、文字ばかりになりません。
- アプリの画面では、マニュアルの1ページを「紙」と呼んでいます。お店で貼り出したり配ったりする紙のマニュアルのように。印刷するものではなく、画面の中のページです。

## 使いかた

**画面**
- **左：お店のマニュアル**　マニュアルの場所（1日の流れ、オープン前、営業中、レシピ、清掃、クローズ、衛生の記録）。それぞれの下に、中に入っているものの名前。モモが書いたばかりの場所は、光って「＋1」が出ます。
- **中央：モモとの会話**　会話、大きな 🎤、✍️（手書きを読む）、📋（貼る）、文字を書く欄。
- **右：ページ**　左で選んだ場所のページ。
- **右上：いまの立場**　「シェフ（教える）」か「スタッフ（聞く）」。
- スマホ（横幅 760px 以下）では、会話が画面いっぱいになり、マニュアルは左上のボタンから開きます。

**教える（シェフ・店長）**
1. 🎤 を押して、新人さんに話すように話します。話し終えたら、もう一度押します（送る）。入力欄に文字で書くこともできます。
2. 手元の資料を渡すとき：メモやファイル、文章を貼るなら 📋、手書きのメモの写真や紙の PDF なら ✍️（スマホなら、その場で撮れます）。
3. モモは数秒で返事をします。少しあとに「→ …に入れました」の一行が出て、どのページに書いたかが分かります。左の棚の、その場所が光ります。
4. 話す人が代わるとき（店長、マダムなど）は、名乗るだけで大丈夫です。会話の上の「〇〇とお話し中 ▾」から選ぶこともできます。
5. ページを手で直すときは、直したいところの横の ✏️ を押します。モモが書いているあいだは、✏️ は待っています。
   - 手順を直すとき、📷 で写真を、🎬 で短い動画（30秒まで）を手順に入れられます。動画は手順の横の小さな枠で、音なしでくり返し流れます。押すと大きく見られます。
6. ページができたら「スタッフに配る」。新しく書いたところ・直したところを1ページずつ確かめて、「これで配る」。スタッフには、配ったものだけが見えます。

**聞く（スタッフ）**
1. 右上で「スタッフ（聞く）」にします。
2. 声か文字で、モモに聞きます。モモは配られたマニュアルをもとに答えて、ページのその場所を開いて見せます（「👀 ここですよ」）。
3. 「オープン前」と「クローズ」は、📖 読む と ☑️ チェック（その日のチェックリスト）を切りかえられます。
4. 「衛生の記録」：冷蔵庫・冷凍庫の温度を数字のキーで入れて、確認の質問に答えます。朝、ランチのあと、帰る前の3回です。記録すると、チェックリストのその行にも ✓ がつきます。

**やり直す**
左の列のいちばん下：「見本に戻す」で見本のお店に、「まっさらのお店で試す」で何も書かれていないお店になります。どちらも、会話とページを消す前に一度確かめます。

## 仕様

**動作環境**
- Chrome、Edge、Safari。パソコン、タブレット、スマートフォン。
- 音声入力にはブラウザの音声認識とマイクの許可が必要です。Chrome、Edge、Safari は使えます。Firefox は使えません（文字入力は可能）。
- モモの声（🔊）を聞くには、音が出る状態にしてください。

**渡せるファイル**
| 種類 | 拡張子 | 読み方 |
|---|---|---|
| 文字 | .txt .csv .tsv .md .rtf | ブラウザで読む（古い Windows や Excel の Shift_JIS も） |
| Word | .docx | ブラウザで読む |
| Excel | .xlsx .xls .xlsm .ods | すべてのシートを、ブラウザで読む |
| PDF | .pdf | Claude が読む（10MB まで） |
| 写真 | .jpg .jpeg .png .webp .gif .heic .heif | Claude が読む。HEIC（iPhone）はブラウザで変換 |

古い Word（.doc）と、Pages・Numbers・Keynote は読めません。.docx・.xlsx・PDF に書き出してから渡してください。

**制限**
- お店のデータ（会話、マニュアル、衛生の記録、写真）は、作ったブラウザの中だけにあります。ほかの端末やブラウザとは共有されません。ブラウザのサイトデータを消すと、消えます。デモでは、同じ画面でシェフとスタッフを切りかえます。
- モモが読むのは、会話の新しいほうから40件です。それより前のことは、マニュアルとモモの心覚えに入っています。
- 貼った文章や、ファイルから読んだ文字は、1回に3万字まで。
- 写真は、長い辺を 1568px に縮めてからモモが読みます。
- 手順の動画は30秒まで。写真と同じく、ブラウザの中にしまいます。モモは動画を見られないので、手もとの動きを人が見るためのものです。iPhone で撮った動画は、Windows のパソコンでは再生できないことがあります。
- 共有の鍵を守るため、1つの接続から、モモへの質問は1分に約20回（ページを書くぶんは別に多め）、声は1分に約20回までです。超えると、モモが「1分ほど待ってね」とお願いします。
- チェックリストの ✓ はその日かぎり、衛生の記録は日ごとに残ります。
- モモの声は 🔊 を押したときだけ作ります。画面を開いているあいだは保存するので、もう一度聞くことも可能です。

**モモの書きかた**
- 1回のやりとりで、先にすぐ返事をして、マニュアルのページは、話を続けているあいだに書きます。
- 話した順ではなく、その仕事が行われる場所へ振り分けます。話し手が編集したことを、消したり言い換えたりしません。
- まだ足りないこと（スタッフに聞かれてマニュアルで答えられなかったことも）を8つまで覚えておいて、話がひと段落したときに、ひとつずつ聞きます。
- 1日の流れの時間割は、マニュアルに書いた時刻から自動で作成します。曜日の決まった仕事は、その曜日にだけ出ます。
- 衛生管理計画は、HACCPの考え方を取り入れたパン類の製造における食品衛生管理の手引書（日本パン技術研究所・全日本パン協同組合連合会・日本パン工業会）「記録様式（日報型）」を参照しています。

## Claude API

- モモは **Claude Opus 5.5** です。1回のやりとりで2回呼びます：すぐの返事（`effort: low`）と、マニュアルを書くこと（`effort: medium`）。どちらも構造化出力（Zod のスキーマ）で、システムプロンプトはキャッシュします。
- 写真・手書き・PDF は Claude にそのまま渡して、読んだ中身は会話に残します。
- モモの聞きかた（`src/core/momo-prompt.ts`）は、作者が食の編集者として30年、シェフから話を聞いてきた取材技術から作りました。たとえば「いつも問いで返さない」「問いは1つまで」「見ればわかるを言葉にする手伝いをする」「話し終えた人が活力と自信を取り戻しているように」など。
- アプリ全体は、コードを書かない作者が **Claude Code** と対話をしながら作りました。画面も中継もモモの指示も確かめかたも、二者の会話と見本の画面とブラウザでの確認から生まれています。

## しくみ

- React 19 + TypeScript + Vite、Cloudflare Workers（Worker は Claude と ElevenLabs への小さな中継で、何も保存しません）。
- お店のデータはブラウザの中だけに置きます（localStorage、写真は IndexedDB）。
- 声：話す側はブラウザの音声認識、モモの声は ElevenLabs（v4 Turbo）で、🔊 を押したときだけ作ります。
- ファイルはブラウザで読みます：Word（mammoth）、Excel（SheetJS）、HEIC（heic-to）。
- 中継には接続ごとの回数の上限があり、共有の鍵を守ります。
- `src/core/` が共通の土台で、`src/trades/bakery/` にベーカリーの場所・衛生管理計画・知識・見本のお店があります。ほかの業種の飲食店も追加できるつくりです。

## 自分で動かす

```bash
npm install
```

`.dev.vars` に自分の鍵を書きます（コミットしないでください）：

```
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
MOMO_VOICE_ID=...
```

```bash
npm run dev
```

自分の Cloudflare に公開するときは、同じ3つを `npx wrangler secret put` で入れてから、`npm run deploy`。

## ライセンス

コードは MIT ライセンスです。`assets/momo/` のモモの絵は、このライセンスに含まれません。くわしくは [LICENSE](LICENSE) をご覧ください。

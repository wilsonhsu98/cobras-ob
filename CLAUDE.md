# CLAUDE.md

這份文件給在這個 repo 工作的 Claude 閱讀。內容整理自專案規劃時的討論，修改重要決定時請一併更新。

## 專案背景

- CobrasOB（新北）是一支約 30 人的 OB 棒球隊，成員多為 40～50 歲的爸爸，因小孩參加社區少棒而聚在一起，棒球程度落差大。
- 維護者是隊長本人，前端工程師，熟悉 React 與 Firebase，**偏好 JavaScript，不使用 TypeScript**。
- 使用者幾乎都從 LINE 群組點連結、在 LINE 內建瀏覽器裡打開。手機優先，桌機只是附帶。

## 技術決策（以及為什麼）

- **Vite + React 18 + react-router-dom 6，JavaScript（.jsx）**。不要引入 TypeScript。
- **Firebase Spark 免費方案**：只用 Auth 與 Firestore。不用 Cloud Functions（需要 Blaze 付費方案）。
- **LINE 登入用 custom token**：LIFF 取得 LINE ID token → Netlify Function `line-auth` 向 LINE verify API 驗證 → 查 `lineBindings` → firebase-admin 發 custom token（claims：`playerId`、`admin`）→ 前端 `signInWithCustomToken`。不用 Firebase OIDC provider（需付費升級，且在 LINE 內體驗較差）。
- **Netlify** 放網頁與 Function。SPA 由 `netlify.toml` 的 redirect 處理。
- 狀態管理只用 React context + Firestore `onSnapshot`（`src/hooks/useFirestore.js`），不另外引入狀態管理套件。
- **圖片不用 Firebase Storage**（需升級 Blaze 並綁信用卡，且免費額度只限 us-central1／us-east1／us-west1 的 bucket）。球具照片在瀏覽器縮成 JPEG 資料網址（`src/lib/image.js`，約 25 萬字元以內），存在 Firestore 的 `bagPhotos`。之後若真的需要更多、更大的照片，再改成 Storage 存網址。球員頭像同樣做法（`imageToAvatarDataUrl`：裁成正方形、縮成 160px），存在 `playerPhotos`。
- **選完照片會先開裁切視窗**（`CropSheet.jsx`，用 `react-easy-crop`，釘死 6.2.4）：拖曳移動、兩指／滑桿／滾輪縮放；頭像是圓形框 1:1、球具照片是 4:3（跟列表上顯示的比例一致）。視窗只回傳原圖像素的裁切範圍 `{x, y, width, height}`，實際裁切與縮小仍在 `image.js`（兩個函式第二個參數 `area`，沒給就退回整張／中間裁正方形）。裁切視窗疊在編輯視窗上，所以 `Sheet` 有 `closeOnBackdrop={false}`：滑鼠拖曳到框外放開不能被當成點背景而誤關。
- **Firestore 快取**（`src/lib/firebase.js`）：用 `persistentLocalCache`（IndexedDB，多分頁版）。每次重新打開 app 都是一次完整的頁面載入，原本要等連線建好、整批資料下載完，計分板才有數字；有快取後，球員、活動、出席人數先用上次的資料立刻顯示，伺服器的最新資料回來後自動更新（所以最多短暫看到上次的數字，不會是空的）。IndexedDB 用不了時 SDK 會退回記憶體快取，`createDb` 另外 catch 了「已初始化」（Vite 熱更新重跑這個檔）的情況。本機 Emulator 也一樣會快取：重新 seed 後，若分頁是關著的，再打開會先看到舊資料一瞬間，連上後就會被伺服器的資料蓋掉。**新開的監聽只要快取裡有任何一筆符合的文件，Firestore 就會立刻交出一份「部分」結果、不等伺服器**（例如別的 query 先載入的「我自己的出席紀錄」，計分板就曾在實機顯示 `0 / 0 / 1 / 37` 長達約 15 秒）。所以 `useQuery` 會回傳 `fromCache`（用 `includeMetadataChanges`），**數字必須正確的地方（計分板）要等 `fromCache` 變 false 才顯示，之前顯示「–」**；只看 `loading` 擋不住。活動視窗的出席名單／人數還沒套用這個處理。實機那約 15 秒的根本原因還沒查出來（SDK 預設已開 `experimentalAutoDetectLongPolling`；SDK 在伺服器 10 秒沒回應時會把狀態轉成離線）。**LINE 內建瀏覽器的 IndexedDB 是否跨次開啟保留也還沒實機確認**；若沒保留，行為等同沒有快取，不會壞。
- **新版本提示**：LINE 內建瀏覽器常把頁面留在背景好幾天，部署後使用者還在跑舊版。做法是 build 時（`vite.config.js` 的 `versionFile` plugin）產生一個編號（建置時間，不用 commit hash：只改 Netlify 環境變數重新部署時 commit 不變、但 `VITE_*` 會被烤進程式碼），同時寫進程式碼（`__BUILD_ID__`）和 `dist/version.json`；`useAppUpdate` 在載入、回到前景／取得焦點（30 秒內只查一次）、停在前景時每 10 分鐘，用 `no-store` 抓 `/version.json` 比對，不同就在頁籤列上方浮出 `UpdateBanner`（「有新版本，點一下更新」→ `location.reload()`）。**只提示、不自動重整**（使用者可能正在填表單或裁切照片）；本機 `npm run dev` 不檢查；讀不到版本檔（離線、不存在）一律當沒有新版。`netlify.toml` 對 `/version.json` 設 `no-store`。不用 service worker（快取行為複雜、LINE 內建瀏覽器支援不穩）。這只是提示、不是強制更新：若哪天有舊版不能再用的重大變更（例如資料結構遷移），要另外加「最低版本」機制。**LINE 實機上 `location.reload()` 是否真的重抓 `index.html` 還沒測**；不行的話改 `location.replace` 並帶版本查詢參數。
- 不做主動推播（LINE Messaging API 推播到群組依人數計費）。公告用管理頁「複製文字」或 `liff.shareTargetPicker()`。

## 環境

| 環境 | 資料 | 登入 |
|---|---|---|
| 本機 `npm run dev` | Firebase Emulator（專案 `demo-cobras`）+ seed 假資料 | 從名單選人（`src/lib/devAuth.js` 產生未簽章 token） |
| Netlify branch / preview | Firebase dev 專案 | 真的 LINE（測試用 LIFF app） |
| Netlify production | Firebase prod 專案 | 真的 LINE（正式 LIFF app） |

- `.env.development` 只含 Emulator 設定，可以 commit。正式值放 Netlify 環境變數。
- **原則：本機永遠不要寫入 prod 專案。** 需要看正式資料請用 Firebase Console。
- seed 腳本寫入雲端時必須輸入專案 ID 確認，這一步由人本人輸入，不要用管線代填。
- Firebase 專案：dev＝`cobras-ob-dev`、prod＝`cobras-ob-prod`（Firestore 都在 `asia-east1`）。服務帳戶金鑰放專案根目錄、已被 gitignore：`service-account.json`（dev）、`service-account-prod.json`（prod）。
- **現況（2026-11-12）**：Netlify Production 已連 prod，LINE 登入與綁定在正式環境驗證通過；真實名單已匯入 prod。branch / preview 的環境變數是 dev 值，但還沒有對應的測試用 LIFF（見待辦）。
- Netlify 的 Secrets scanning 會因為「變數值出現在 repo 檔案」讓 build 失敗（例如 README 裡寫了專案 ID）。公開的 `VITE_*` 值已用 `SECRETS_SCAN_OMIT_KEYS` 排除；不要關掉整個掃描，那會連服務帳戶金鑰與 `INVITE_CODE` 的保護一起關掉。
- 改 `firestore.rules` 或索引之後，要分別部署到兩個專案：`firebase deploy --only firestore --project cobras-ob-prod`（dev 同理）。

## 資料結構（Firestore）

```
players/{playerId}            name, nick, number, isAdmin, role, positions[], batsThrows,
                              relation, experience, skill, job, favoriteTeam, bound, pictureUrl
events/{eventId}              date('YYYY-MM-DD'), dateKey(20261115), start, end,
                              type(practice|hardball|rubberball|softball|party), title, place, opponent, jersey, note,
                              status(on|rain), seriesId
events/{eventId}/attendance/{playerId}
                              playerId, eventId, rsvp(yes|late|no|null), updatedAt
bags/{bagId}                  name, items[{name,qty}], holderId
bagPhotos/{bagId}             dataUrl, updatedAt   （球具照片，文件 ID 同 bagId；另放一個集合，只有球具頁與管理頁訂閱）
playerPhotos/{playerId}       dataUrl, updatedAt   （球員自己上傳的頭像，文件 ID 同 playerId；160px 方形 JPEG，約 5～10KB）
handoffs/{handoffId}          bagId, bagName, fromId, toId, byId, missing, createdAt   （保管紀錄，建立後不可改）
lineBindings/{lineUserId}     playerId, lineName, boundAt   （只有 Function 寫入，管理者可讀、可刪）
```

- 守備位置 `positions[]` 只有投手、捕手、一壘手、內野手、外野手（`POSITIONS`），可複選；點將錄的「內野」篩選包含一壘手與內野手。
- 管理職 `role` 只有隊長、副隊長、總務、教練、卸任管理（`ADMIN_ROLES`）或空字串；有管理職就是管理者（`isAdmin` 跟著設成 true），沒有就是一般隊員。各管理職的權限完全相同、沒有分級，差別只在標示身分；卸任管理是已卸任但仍保有管理權限的人。每個職務可以有多人，一人只有一個職務。管理頁用下拉選單設定（`setPlayerRole`），球員自己改不了。
- 出席紀錄的文件 ID 就是 playerId，一人一場一筆。人數統計在前端算，不維護計數器。
- 出席回覆有「會到」`yes`、「會遲到」`late`、「不會到」`no` 三種，**不做「未定」**（模稜兩可、統計也不好用）；還沒回覆的人算「尚未回覆」。舊資料裡殘留的 `maybe` 也當成尚未回覆。按鈕與名單分組的順序就是 `RSVP_LABEL` 的 key 順序。
- **不做當日簽到**：實務上出席全憑自由心證，簽到只會多一道手續。出席統計一律以回覆為準，**會到算 1、會遲到算 0.5**（權重在 `constants.js` 的 `ATTEND_WEIGHT`），是「出席加權次數／已舉辦活動數」（會遲到出現小數，例如 `2.5/4`），已舉辦＝日期已過且沒有因雨取消（`heldEvents`）。出席統計的查詢是 `rsvp in ['yes','late']`（`useAllAttended`、`usePlayerAttended`），沿用原本的 collection group 索引。**活動當天的人數（計分板、活動視窗、公告）算人頭、不加權**：會遲到的人也算會來，「會到 N 人」＝會到＋會遲到，另外標出遲到幾人；投手、捕手缺口也把會遲到的人算進去。管理頁的出席排行標題右邊有年份下拉單，預設今年（也可選有活動的其他年份或「全部年份」）；球員卡的出席欄依年度分行列出（`2026 2/4 (50%)`，年份由小到大，`attendanceByYear`）。
- 職業 `job`、支持球隊 `favoriteTeam` 是選填的自由文字，由球員本人在「編輯我的球員卡」填寫。
- 週末月曆不顯示已經過去的週（週日早於今天）；過去的活動在清單的「已結束的活動」裡看。
- 重複練球展開成多筆活動文件（`seriesId` 串起來），不存 RRULE。
- 管理頁可以編輯單場活動（`updateEvent`，欄位與新增活動共用 `EventFields`）：**只改那一場**，不連動同系列；狀態（雨天取消）另用 `setEventStatus`；出席回覆存在活動底下，改日期也不受影響。目前只能編輯「即將舉行」的活動；刪除活動會連出席回覆一起刪除。
- 日期一律以**台北時間**為準（`src/lib/dates.js`）。
- 球衣 `jersey` 的選項在 `JERSEYS`（條紋衣、練習衣、隨意穿；新增活動預設練習衣，`DEFAULT_JERSEY`）。活動備註 `note` 是選填的自由文字（可多行），管理者在新增／編輯活動時填；有填才會顯示在活動視窗（「備註」）與公告文字（📝）。重複練球建出的每一場都會帶同一份備註。
- 集合名稱與狀態值從 `src/lib/constants.js` 引用，不要在各處手打字串。
- 所有 Firestore 寫入集中在 `src/lib/actions.js`。

## 權限（firestore.rules）

- 已通過 LINE 驗證但尚未綁定的人只能讀 `players`（用來選自己）。
- 球員只能改自己的出席紀錄（只有 `rsvp`，值為 `yes`／`late`／`no`）、自己的球員卡（不能改 `isAdmin`、`bound`、`pictureUrl`）。
- `pictureUrl`（LINE 頭像網址）只有 `line-auth` Function 在登入時寫入，來源是 LINE ID token 的 `picture`；解除綁定時清掉。已綁定的人每次打開 app 都會在背景重新換 token，所以在 LINE 換頭像後重新打開就會更新（不是即時）。
- 球員也可以在「編輯我的球員卡」自己上傳頭像（`playerPhotos`，只有本人能寫、`dataUrl` 不超過 8 萬字元；本人或管理者能刪）。Avatar 的優先順序：自己上傳的 → LINE 頭像 → 姓氏，其中一個載入失敗就換下一個。LINE 沒有開放 API 讓第三方改使用者的 LINE 頭像，所以**無法把自訂頭像同步回 LINE**；「改回用 LINE 頭像」鈕做的是刪掉自己上傳的那張，並呼叫一次 `exchange({ silent: true })` 讓 `line-auth` 把最新的 LINE 頭像寫回。`playerPhotos` 由 `TeamDataProvider` 訂閱一次（全隊約 30 張、各約 10KB），**不算進 loading／error**（頭像只是裝飾）。解除綁定、刪除球員時要一併刪掉 `playerPhotos`，免得換人綁同一個位子時還看到前一個人的照片。
- 球具保管一步完成、沒有輪值：任何成員都能接手（只能把 `holderId` 改成自己，不需原保管人同意）；指定別人保管只有管理者。每次換手寫一筆 `handoffs`（`byId` 不等於 `toId` 代表是管理者指定）。
- 球具新增、編輯（名稱、品項、照片）、刪除只有管理者，在「管理」頁的「球具管理」。`bagPhotos` 成員可讀、管理者可寫，rules 限制只有 `dataUrl`、`updatedAt` 兩個欄位且 `dataUrl` 不超過 40 萬字元。刪除球具時 `handoffs` 保留（上面記有當時的球具名稱）。
- 改 rules 時請在 Emulator 實際操作驗證。

## 設計規範

- 配色取自隊徽：黑（標題列、計分板）、橘（主色）、米白。token 在 `src/styles/tokens.css`。
- **外觀預設深色，標題列右上角有三段切換**（淺色／自動／深色，`src/components/ThemeToggle.jsx`，樣式抄自 riversidesoftballclub.netlify.app 的做法）。偏好存在 localStorage（`cobras:theme`，`src/lib/theme.js`），套用方式是設定 `<html data-theme="light|auto|dark">`；`index.html` 有一小段內嵌 script 在畫面出現前先套用，避免閃一下，key 與預設值要跟 `theme.js` 一致。**沒選過就是深色、不是自動**：LINE 內建瀏覽器是否跟著系統外觀不確定，預設跟隨的話手機是淺色時會讓全隊突然看到淺色畫面。「自動」才跟手機（`prefers-color-scheme`）。調配色時，`tokens.css` 裡 `@media (prefers-color-scheme: dark)` 區塊與 `:root[data-theme="dark"]` 兩處的值要一起改。若發現在球場陽光下反光難讀，淺色模式隨時可以自己切。
- 切換鈕在標題列（永遠黑底），所以它的顏色寫死、不跟著主題變；本機的「切換身分」按鈕放在「本機測試資料」那條，才不會擠到標題列。
- 分頁圖示：賽程＝月曆、點將錄＝名片、球具＝交叉球棒加棒球、管理＝齒輪（`TabBar.jsx`）。球棒的線稿取自 IconOven（MIT）。目前頁籤上方的橘色標示條整列只有一條（`.tabbar .bar`，位置由 `--i`、`--n` 算），換頁時用 `left` 轉場滑到目標那格，不是各頁籤自己的 `::before`；做法跟外觀切換的圓點相同，`prefers-reduced-motion` 時不滑動。
- 首頁主角是「計分板」：黑底、橘色發光數字，顯示下一場日期、是否照常、出席人數。其他元件保持安靜。
- 大字（基準 17px）、大按鈕（最小約 48px 高），使用者是中年爸爸、常在戶外陽光下操作。
- 管理頁的列表（活動、球具、球員）每列只放一顆「更多」（`RowMenu`），所有動作在點開的底部視窗裡；危險動作（刪除）放最後、用紅色，刪除前仍有確認。不要在列裡並排多顆按鈕或下拉單，手機放不下會掉行。需要在列上看到的狀態（例如雨天取消）用標籤顯示。
- 搜尋框用 `SearchBox.jsx`：有字才出現自己畫的清除鈕（點擊範圍 44px，清除後**不聚焦**輸入框，手機鍵盤才不會跳出來），並用 CSS 關掉瀏覽器內建的 ×（藍色、很小、各家長得不一樣）。
- 字體：Alfa Slab One（隊名）、Barlow Condensed（數字）、Noto Sans TC（內文）。
- 介面文字用台灣繁體中文，口語、直接。

## 產品原則

- 降低門檻優先：打開就自動登入，不要求填寫不必要的資料。
- 上線前只需要基本名單（姓名、綽號、背號、管理職），其餘由本人在「編輯我的球員卡」補。
- 「與眼鏡蛇的關係」（`relation`）是選填的自由文字，例如「小孩五年級」「少棒校友」「朋友介紹」，由本人在「編輯我的球員卡」填寫；提示「只有隊員看得到、有小孩不必寫全名」。原本欄位叫 `kid`（小孩），但不是每個人都因小孩而來，所以改名；prod 還沒匯入名單時改最省事，之後再改就要寫遷移。球員視窗的標籤較長，所以 `.kv` 加 `wide` 變體放寬標籤欄。
- 點將錄不放能力評分，避免程度落差造成尷尬。
- 位置缺口（沒有投手、捕手、不到 9 人）要明顯提示。
- 活動視窗（即將舉行的活動）的「出席名單」標題旁，**管理者**有「全螢幕名單」按鈕（`LineupSheet.jsx`）：蓋滿整個畫面，分「會到／會遲到／不會到／尚未回覆」四區，每區兩欄（依背號由左到右、由上到下）列出背號、全名、守位，全名後面空一格接綽號（現場都叫綽號，對得上人）。背號用等寬字體，個位數改成全形數字（２），並放在固定寬度（兩個字寬）的格子裡置中，個位數和兩位數的中心線才對得齊（不另外載入 CJK 等寬字型）。用途是隊長到場後對照著填紙本的先發名單，所以字大、不放能力；一般隊員看不到這顆按鈕。`Sheet` 有 `full` 屬性可做全螢幕版，疊兩層視窗時 Esc 只關最上面那層。
- 活動視窗（即將舉行、沒有雨天取消的活動）有「加到手機行事曆」：Google 行事曆連結與 .ics 下載（`src/lib/calendar.js`）。**單場、純前端、存進去是一份複本**，之後活動改時間或雨天取消不會同步，視窗裡有寫提示；已結束或雨天取消的活動不顯示。時間轉成 UTC 字串（台北固定 UTC+8），.ics 的 UID 是 `{eventId}@cobras-ob`，同一場重複匯入不會重複。在 LINE 內建瀏覽器裡 Google 連結用 `openExternal`（`liff.openWindow` 開系統瀏覽器）；.ics 是 blob 下載，**LINE iOS 內建瀏覽器可能下載不了，需用實機測**，不行的話改走 Netlify Function 提供 .ics 網址（用查詢參數帶活動資料就不必驗證）。「訂閱整隊行事曆」（Function 輸出 ICS、網址帶祕密 token）還沒做，Google 重新抓訂閱的頻率是幾小時到一天，雨天取消不會即時。

## 開發指令

```bash
npm run emulators   # 啟動 Emulator
npm run seed        # 清空並匯入假資料（Emulator）
npm run dev         # 前端
npm run build       # 正式建置
```

## 待辦（依優先順序）

1. 上線：LINE channel 切成 Published、在管理頁建立真實活動與球具、在群組公告連結與邀請碼
2. Netlify branch deploy 接 dev 專案，並建立測試用 LIFF（endpoint 填 branch 網址），讓新功能可以在雲端用真的 LINE 測試
3. 分享到 LINE 改用 Flex Message 卡片（隊徽 + 回覆出席按鈕）
4. 尾牙功能：年度出席統計頁、獎項名單
5. 比賽紀錄（比數、MVP）、照片連結

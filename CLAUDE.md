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
- **圖片不用 Firebase Storage**（需升級 Blaze 並綁信用卡，且免費額度只限 us-central1／us-east1／us-west1 的 bucket）。球具照片在瀏覽器縮成 JPEG 資料網址（`src/lib/image.js`，約 25 萬字元以內），存在 Firestore 的 `bagPhotos`。之後若真的需要更多、更大的照片，再改成 Storage 存網址。
- 不做主動推播（LINE Messaging API 推播到群組依人數計費）。公告用管理頁「複製文字」或 `liff.shareTargetPicker()`。

## 環境

| 環境 | 資料 | 登入 |
|---|---|---|
| 本機 `npm run dev` | Firebase Emulator（專案 `demo-cobras`）+ seed 假資料 | 從名單選人（`src/lib/devAuth.js` 產生未簽章 token） |
| Netlify branch / preview | Firebase dev 專案 | 真的 LINE（測試用 LIFF app） |
| Netlify production | Firebase prod 專案 | 真的 LINE（正式 LIFF app） |

- `.env.development` 只含 Emulator 設定，可以 commit。正式值放 Netlify 環境變數。
- **原則：本機永遠不要寫入 prod 專案。** 需要看正式資料請用 Firebase Console。
- seed 腳本寫入雲端時必須輸入專案 ID 確認。

## 資料結構（Firestore）

```
players/{playerId}            name, nick, number, isAdmin, role, positions[], batsThrows,
                              kid, experience, skill, job, favoriteTeam, bound, pictureUrl
events/{eventId}              date('YYYY-MM-DD'), dateKey(20261115), start, end,
                              type(practice|hardball|rubberball|softball|party), title, place, opponent, jersey,
                              status(on|rain), seriesId
events/{eventId}/attendance/{playerId}
                              playerId, eventId, rsvp(yes|no|null), updatedAt
bags/{bagId}                  name, items[{name,qty}], holderId
bagPhotos/{bagId}             dataUrl, updatedAt   （球具照片，文件 ID 同 bagId；另放一個集合，只有球具頁與管理頁訂閱）
handoffs/{handoffId}          bagId, bagName, fromId, toId, byId, missing, createdAt   （保管紀錄，建立後不可改）
lineBindings/{lineUserId}     playerId, lineName, boundAt   （只有 Function 寫入，管理者可讀、可刪）
```

- 守備位置 `positions[]` 只有投手、捕手、一壘手、內野手、外野手（`POSITIONS`），可複選；點將錄的「內野」篩選包含一壘手與內野手。
- 管理職 `role` 只有隊長、副隊長、總務、教練、卸任管理（`ADMIN_ROLES`）或空字串；有管理職就是管理者（`isAdmin` 跟著設成 true），沒有就是一般隊員。各管理職的權限完全相同、沒有分級，差別只在標示身分；卸任管理是已卸任但仍保有管理權限的人。每個職務可以有多人，一人只有一個職務。管理頁用下拉選單設定（`setPlayerRole`），球員自己改不了。
- 出席紀錄的文件 ID 就是 playerId，一人一場一筆。人數統計在前端算，不維護計數器。
- 出席回覆只有「會到」「不會到」，**不做「未定」**（模稜兩可、統計也不好用）；還沒回覆的人算「尚未回覆」。舊資料裡殘留的 `maybe` 也當成尚未回覆。
- **不做當日簽到**：實務上出席全憑自由心證，簽到只會多一道手續。出席統計一律以回覆「會到」為準：管理頁的出席排行與球員卡的出席欄都是「會到次數／已舉辦活動數」，已舉辦＝日期已過且沒有因雨取消（`heldEvents`）。
- 職業 `job`、支持球隊 `favoriteTeam` 是選填的自由文字，由球員本人在「編輯我的球員卡」填寫。
- 週末月曆不顯示已經過去的週（週日早於今天）；過去的活動在清單的「已結束的活動」裡看。
- 重複練球展開成多筆活動文件（`seriesId` 串起來），不存 RRULE。
- 管理頁可以編輯單場活動（`updateEvent`，欄位與新增活動共用 `EventFields`）：**只改那一場**，不連動同系列；狀態（雨天取消）另用 `setEventStatus`；出席回覆存在活動底下，改日期也不受影響。目前只能編輯「即將舉行」的活動；刪除活動會連出席回覆一起刪除。
- 日期一律以**台北時間**為準（`src/lib/dates.js`）。
- 集合名稱與狀態值從 `src/lib/constants.js` 引用，不要在各處手打字串。
- 所有 Firestore 寫入集中在 `src/lib/actions.js`。

## 權限（firestore.rules）

- 已通過 LINE 驗證但尚未綁定的人只能讀 `players`（用來選自己）。
- 球員只能改自己的出席紀錄（只有 `rsvp`）、自己的球員卡（不能改 `isAdmin`、`bound`、`pictureUrl`）。
- `pictureUrl`（LINE 頭像網址）只有 `line-auth` Function 在登入時寫入，來源是 LINE ID token 的 `picture`；解除綁定時清掉。前端 Avatar 有頭像就顯示，沒有或載入失敗就退回姓氏。
- 球具保管一步完成、沒有輪值：任何成員都能接手（只能把 `holderId` 改成自己，不需原保管人同意）；指定別人保管只有管理者。每次換手寫一筆 `handoffs`（`byId` 不等於 `toId` 代表是管理者指定）。
- 球具新增、編輯（名稱、品項、照片）、刪除只有管理者，在「管理」頁的「球具管理」。`bagPhotos` 成員可讀、管理者可寫，rules 限制只有 `dataUrl`、`updatedAt` 兩個欄位且 `dataUrl` 不超過 40 萬字元。刪除球具時 `handoffs` 保留（上面記有當時的球具名稱）。
- 改 rules 時請在 Emulator 實際操作驗證。

## 設計規範

- 配色取自隊徽：黑（標題列、計分板）、橘（主色）、米白。token 在 `src/styles/tokens.css`。
- **外觀預設深色，標題列右上角有三段切換**（淺色／自動／深色，`src/components/ThemeToggle.jsx`，樣式抄自 riversidesoftballclub.netlify.app 的做法）。偏好存在 localStorage（`cobras:theme`，`src/lib/theme.js`），套用方式是設定 `<html data-theme="light|auto|dark">`；`index.html` 有一小段內嵌 script 在畫面出現前先套用，避免閃一下，key 與預設值要跟 `theme.js` 一致。**沒選過就是深色、不是自動**：LINE 內建瀏覽器是否跟著系統外觀不確定，預設跟隨的話手機是淺色時會讓全隊突然看到淺色畫面。「自動」才跟手機（`prefers-color-scheme`）。調配色時，`tokens.css` 裡 `@media (prefers-color-scheme: dark)` 區塊與 `:root[data-theme="dark"]` 兩處的值要一起改。若發現在球場陽光下反光難讀，淺色模式隨時可以自己切。
- 切換鈕在標題列（永遠黑底），所以它的顏色寫死、不跟著主題變；本機的「切換身分」按鈕放在「本機測試資料」那條，才不會擠到標題列。
- 分頁圖示：賽程＝月曆、點將錄＝名片、球具＝交叉球棒加棒球、管理＝齒輪（`TabBar.jsx`）。球棒的線稿取自 IconOven（MIT）。
- 首頁主角是「計分板」：黑底、橘色發光數字，顯示下一場日期、是否照常、出席人數。其他元件保持安靜。
- 大字（基準 17px）、大按鈕（最小約 48px 高），使用者是中年爸爸、常在戶外陽光下操作。
- 管理頁的列表（活動、球具、球員）每列只放一顆「更多」（`RowMenu`），所有動作在點開的底部視窗裡；危險動作（刪除）放最後、用紅色，刪除前仍有確認。不要在列裡並排多顆按鈕或下拉單，手機放不下會掉行。需要在列上看到的狀態（例如雨天取消）用標籤顯示。
- 字體：Alfa Slab One（隊名）、Barlow Condensed（數字）、Noto Sans TC（內文）。
- 介面文字用台灣繁體中文，口語、直接。

## 產品原則

- 降低門檻優先：打開就自動登入，不要求填寫不必要的資料。
- 上線前只需要基本名單（姓名、綽號、背號、管理職），其餘由本人在「編輯我的球員卡」補。
- 小孩資料是選填，提示「只有隊員看得到、不必寫全名」。
- 點將錄不放能力評分，避免程度落差造成尷尬。
- 位置缺口（沒有投手、捕手、不到 9 人）要明顯提示。
- 活動視窗（即將舉行的活動）的「出席名單」標題旁，**管理者**有「全螢幕名單」按鈕（`LineupSheet.jsx`）：蓋滿整個畫面，分「會到／不會到／尚未回覆」三區，每區兩欄（依背號由左到右、由上到下）列出背號、全名、守位，全名後面空一格接綽號（現場都叫綽號，對得上人）。背號用等寬字體，個位數改成全形數字（２），並放在固定寬度（兩個字寬）的格子裡置中，個位數和兩位數的中心線才對得齊（不另外載入 CJK 等寬字型）。用途是隊長到場後對照著填紙本的先發名單，所以字大、不放能力；一般隊員看不到這顆按鈕。`Sheet` 有 `full` 屬性可做全螢幕版，疊兩層視窗時 Esc 只關最上面那層。

## 開發指令

```bash
npm run emulators   # 啟動 Emulator
npm run seed        # 清空並匯入假資料（Emulator）
npm run dev         # 前端
npm run build       # 正式建置
```

## 待辦（依優先順序）

1. 實際串接 LINE（dev 專案 + 測試用 LIFF）並驗證綁定流程
2. 分享到 LINE 改用 Flex Message 卡片（隊徽 + 回覆出席按鈕）
3. 尾牙功能：年度出席統計頁、獎項名單
4. 比賽紀錄（比數、MVP）、照片連結

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
                              playerId, eventId, rsvp(yes|maybe|no|null), updatedAt
bags/{bagId}                  name, items[{name,qty}], holderId
bagPhotos/{bagId}             dataUrl, updatedAt   （球具照片，文件 ID 同 bagId；另放一個集合，只有球具頁與管理頁訂閱）
handoffs/{handoffId}          bagId, bagName, fromId, toId, byId, missing, createdAt   （保管紀錄，建立後不可改）
lineBindings/{lineUserId}     playerId, lineName, boundAt   （只有 Function 寫入，管理者可讀、可刪）
```

- 守備位置 `positions[]` 只有投手、捕手、一壘手、內野手、外野手（`POSITIONS`），可複選；點將錄的「內野」篩選包含一壘手與內野手。
- 管理職 `role` 只有隊長、副隊長、總務、教練、卸任管理（`ADMIN_ROLES`）或空字串；有管理職就是管理者（`isAdmin` 跟著設成 true），沒有就是一般隊員。各管理職的權限完全相同、沒有分級，差別只在標示身分；卸任管理是已卸任但仍保有管理權限的人。每個職務可以有多人，一人只有一個職務。管理頁用下拉選單設定（`setPlayerRole`），球員自己改不了。
- 出席紀錄的文件 ID 就是 playerId，一人一場一筆。人數統計在前端算，不維護計數器。
- **不做當日簽到**：實務上出席全憑自由心證，簽到只會多一道手續。出席統計一律以回覆「會到」為準：管理頁的出席排行與球員卡的出席欄都是「會到次數／已舉辦活動數」，已舉辦＝日期已過且沒有因雨取消（`heldEvents`）。
- 職業 `job`、支持球隊 `favoriteTeam` 是選填的自由文字，由球員本人在「編輯我的球員卡」填寫。
- 週末月曆不顯示已經過去的週（週日早於今天）；過去的活動在清單的「已結束的活動」裡看。
- 重複練球展開成多筆活動文件（`seriesId` 串起來），不存 RRULE。
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

- 配色取自隊徽：黑（標題列、計分板）、橘（主色）、米白。token 在 `src/styles/tokens.css`，支援深色模式。
- 首頁主角是「計分板」：黑底、橘色發光數字，顯示下一場日期、是否照常、出席人數。其他元件保持安靜。
- 大字（基準 17px）、大按鈕（最小約 48px 高），使用者是中年爸爸、常在戶外陽光下操作。
- 字體：Alfa Slab One（隊名）、Barlow Condensed（數字）、Noto Sans TC（內文）。
- 介面文字用台灣繁體中文，口語、直接。

## 產品原則

- 降低門檻優先：打開就自動登入，不要求填寫不必要的資料。
- 上線前只需要基本名單（姓名、綽號、背號、管理職），其餘由本人在「編輯我的球員卡」補。
- 小孩資料是選填，提示「只有隊員看得到、不必寫全名」。
- 點將錄不放能力評分，避免程度落差造成尷尬。
- 位置缺口（沒有投手、捕手、不到 9 人）要明顯提示。

## 開發指令

```bash
npm run emulators   # 啟動 Emulator
npm run seed        # 清空並匯入假資料（Emulator）
npm run dev         # 前端
npm run build       # 正式建置
```

## 待辦（依優先順序）

1. 實際串接 LINE（dev 專案 + 測試用 LIFF）並驗證綁定流程
2. 管理頁：編輯單場活動內容（目前只能改雨天狀態或刪除）
3. 分享到 LINE 改用 Flex Message 卡片（隊徽 + 回覆出席按鈕）
4. 尾牙功能：年度出席統計頁、獎項名單
5. 比賽紀錄（比數、MVP）、照片連結

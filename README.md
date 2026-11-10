# CobrasOB 球隊系統

新北 CobrasOB 棒球隊的週末行事曆、出席回覆、簽到、點將錄與球具轉交系統。隊員從 LINE 群組點連結打開，用 LINE 身分自動登入。

技術：Vite + React（JavaScript）、Firebase（Auth + Firestore，Spark 免費方案）、LINE LIFF、Netlify（網頁與 Functions）。

---

## 一、本機開發（不需要任何帳號）

本機開發完全跑在 Firebase Emulator 上，使用假資料，登入方式是「從名單選人」，不需要 Firebase 專案、LINE 或 Netlify 帳號。

### 需要安裝

- Node.js 20 以上
- Java（Firestore Emulator 需要；版本需求請看 [Firebase 官方文件](https://firebase.google.com/docs/emulator-suite/install_and_configure)）
- Firebase CLI：`npm install -g firebase-tools`

### 啟動步驟

```bash
npm install

# 終端機 A：啟動 Emulator（會自動載入 firestore.rules）
npm run emulators

# 終端機 B：匯入假資料，再啟動前端
npm run seed
npm run dev
```

打開 http://localhost:5173 ，從名單選一位球員即可登入。宏哥、阿明是管理者，可以看到「管理」分頁；選其他人可以體驗一般隊員的畫面。右上角「切換」可以換人。

- Emulator 管理介面：http://localhost:4000 （可以直接看、改 Firestore 資料）
- 假資料會自動建立一場「今天」的活動，方便測試當天簽到
- 想保留測試資料：改用 `npm run emulators:keep`，關閉時會存到 `emulator-data/`（第一次使用前先 `mkdir emulator-data`）
- 想用手機連電腦測試：在 `firebase.json` 的 auth 與 firestore 加上 `"host": "0.0.0.0"`，手機連 `http://電腦的區網IP:5173`

> 本機模式畫面頂端會有黃色的「本機測試資料」提示，正式環境不會出現。

---

## 二、專案結構

```
netlify/functions/line-auth.mjs   LINE ID token → Firebase custom token（含球員綁定）
scripts/seed.mjs                  匯入球員、球具袋、範例活動
scripts/players.sample.csv        30 位假球員（本機用）
scripts/players.template.csv      真實名單範本（只需 name,nick,number,isAdmin）
scripts/bags.sample.json          球具袋範本（holder/queue 用綽號對應）
firestore.rules                   權限規則
firestore.indexes.json            出席統計需要的 collection group 索引
src/lib/                          firebase、liff、actions（所有寫入）、constants、dates
src/hooks/                        useAuth、useTeamData、useFirestore、useEventAttendance、useToast
src/components/                   計分板、出席按鈕、各種底部彈出視窗
src/pages/                        賽程、點將錄、球具、管理、綁定
```

---

## 三、正式上線步驟

### 1. Firebase（建議開兩個專案：dev 與 prod）

以下 dev、prod 各做一次：

1. 到 [Firebase Console](https://console.firebase.google.com/) 建立專案，例如 `cobras-ob-dev`、`cobras-ob-prod`。
2. 建立 **Firestore Database**，地區建議選 `asia-east1`（台灣）。
3. 開啟 **Authentication**（點「開始使用」即可，不需要啟用任何登入方式；我們用的是 custom token）。
4. 新增一個 **Web App**，記下 `apiKey`、`authDomain`、`projectId`、`appId`。
5. 專案設定 → 服務帳戶 → **產生新的私密金鑰**，下載 JSON。**這個檔案不能 commit。**
6. 部署 rules 與索引：

   ```bash
   firebase login
   firebase use --add            # 選 cobras-ob-prod，alias 取名 prod（dev 也照做）
   firebase deploy --only firestore --project prod
   ```

### 2. LINE Developers

1. 到 [LINE Developers](https://developers.line.biz/) 建立 Provider。
2. 建立 **LINE Login** channel，記下 **Channel ID**。
3. 在 channel 的 LIFF 分頁新增兩個 LIFF app：
   - 正式用：Endpoint URL 填 Netlify 正式網址（例如 `https://cobras-ob.netlify.app`）
   - 測試用：Endpoint URL 填 Netlify 的 branch deploy 網址
   - Size 選 **Full**，Scope 勾 **openid**、**profile**
   - 開啟 **shareTargetPicker**（管理頁「分享到 LINE」會用到）
4. 記下兩個 **LIFF ID**。

> LINE Login channel 建立後預設是「開發中」狀態，只有你加入的測試者能登入。全隊使用前要切換成 **Published**。

### 3. Netlify

1. 把專案推上 GitHub，在 Netlify 選 **Import from Git**，建置設定會自動讀 `netlify.toml`。
2. Site settings → Environment variables，依環境填入（可以分別設定 Production 與 Deploy previews / Branch deploys 的值）：

| 變數 | 說明 | 機密 |
|---|---|---|
| `VITE_USE_EMULATOR` | 填 `false` | |
| `VITE_FIREBASE_API_KEY` | Firebase Web App 設定 | |
| `VITE_FIREBASE_AUTH_DOMAIN` | 同上 | |
| `VITE_FIREBASE_PROJECT_ID` | 同上 | |
| `VITE_FIREBASE_APP_ID` | 同上 | |
| `VITE_LIFF_ID` | 對應環境的 LIFF ID | |
| `LINE_CHANNEL_ID` | LINE Login channel ID | |
| `FIREBASE_SERVICE_ACCOUNT_B64` | 服務帳戶 JSON 轉 base64：`base64 -i key.json \| tr -d '\n'` | ✅ |
| `INVITE_CODE` | 選填。設定後第一次綁定要輸入邀請碼 | ✅ |

Production 用 prod 專案的值；Deploy previews / Branch deploys 用 dev 專案的值與測試用 LIFF ID。

3. 部署完成後，把網址填回 LIFF app 的 Endpoint URL。

### 4. 匯入真實名單

複製 `scripts/players.template.csv` 成 `players.csv`，填入真實名單（至少 `name`、`nick`，管理者 `isAdmin` 填 `true`），然後：

```bash
npm run seed:remote -- --project cobras-ob-prod --key ./service-account.json --csv ./players.csv
# 球具袋（選填）：加上 --bags ./scripts/bags.sample.json（先把綽號改成真實的）
```

腳本會要求你輸入專案 ID 確認，並在 players 已有資料時拒絕執行（避免重複匯入）。

### 5. 實測

先找 3～5 位隊友從 LINE 打開正式網址，確認登入、綁定、回覆出席都順利，再把連結（建議用 `https://liff.line.me/你的LIFF_ID`）釘在 LINE 群組公告。

---

## 四、常見問題

**改了某人的管理者身分沒生效？** 權限寫在登入 token 裡，對方重新打開網頁時會自動更新。

**有人綁錯球員？** 管理頁 → 球員管理 → 解除綁定，對方重新打開就能重選。

**登入一直失敗？** 檢查 `LINE_CHANNEL_ID` 是否和 LIFF app 所屬的 channel 一致，以及 LINE Login channel 是否已 Published。Netlify 的 Functions log 可以看到詳細錯誤。

**簽到按鈕沒出現？** 只有活動當天（台北時間）且非雨天取消才會出現，Firestore rules 也會擋下非當天的簽到。

---

## 五、安全提醒

- 服務帳戶 JSON 與 `.env` 已列在 `.gitignore`，第一次 commit 前請用 `git status` 確認沒有被加入。
- 前端的 Firebase 設定與 LIFF ID 是公開值，安全性由 `firestore.rules` 把關。
- `src/lib/devAuth.js` 產生的未簽章 token 只有 Emulator 接受，正式環境的 Firebase 會拒絕。

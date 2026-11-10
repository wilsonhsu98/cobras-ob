// LINE 登入 → Firebase custom token
//
// POST /.netlify/functions/line-auth
// body: { idToken, bindPlayerId?, inviteCode? }
// 回傳: { token, bound } 或 { needInvite: true, wrongCode }
//
// 需要的環境變數：LINE_CHANNEL_ID、FIREBASE_SERVICE_ACCOUNT_B64、INVITE_CODE（選填）
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!raw || !process.env.LINE_CHANNEL_ID) {
    throw new Error('伺服器尚未設定 FIREBASE_SERVICE_ACCOUNT_B64 或 LINE_CHANNEL_ID');
  }
  const sa = JSON.parse(Buffer.from(raw, 'base64').toString());
  initializeApp({ credential: cert(sa) });
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    initAdmin();
  } catch (e) {
    console.error(e);
    return json({ error: '登入服務尚未設定完成，請聯絡隊長' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: '請求格式錯誤' }, 400);
  }
  const { idToken, bindPlayerId, inviteCode } = body;
  if (!idToken) return json({ error: '缺少 idToken' }, 400);

  // 1. 向 LINE 驗證 ID token
  const verify = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: process.env.LINE_CHANNEL_ID || '' }),
  });
  if (!verify.ok) return json({ error: 'LINE 驗證失敗，請重新登入' }, 401);
  const { sub: lineUserId, name: lineName = '' } = await verify.json();

  const db = getFirestore();
  const bindingRef = db.doc(`lineBindings/${lineUserId}`);
  let playerId = (await bindingRef.get()).data()?.playerId;

  // 2. 尚未綁定：檢查邀請碼，再視需要綁定球員
  if (!playerId) {
    const required = process.env.INVITE_CODE;
    if (required && inviteCode !== required) {
      return json({ bound: false, needInvite: true, wrongCode: Boolean(inviteCode) });
    }

    if (bindPlayerId) {
      try {
        await db.runTransaction(async (tx) => {
          const playerRef = db.doc(`players/${bindPlayerId}`);
          const player = await tx.get(playerRef);
          if (!player.exists || player.data().bound === true) throw new Error('taken');
          tx.update(playerRef, { bound: true });
          tx.set(bindingRef, { playerId: bindPlayerId, lineName, boundAt: FieldValue.serverTimestamp() });
        });
        playerId = bindPlayerId;
      } catch {
        return json({ error: '這位球員已經被綁定了，如果是你本人請聯絡隊長' }, 409);
      }
    }
  }

  // 3. 發 Firebase custom token，claims 帶 playerId 與管理者身分
  let admin = false;
  if (playerId) {
    const player = await db.doc(`players/${playerId}`).get();
    if (!player.exists) {
      // 球員被刪除：清掉綁定，回到選人畫面
      await bindingRef.delete();
      playerId = undefined;
    } else {
      admin = player.data().isAdmin === true;
    }
  }

  const token = await getAuth().createCustomToken(
    `line:${lineUserId}`,
    playerId ? { playerId, admin } : {}
  );
  return json({ token, bound: Boolean(playerId) });
};

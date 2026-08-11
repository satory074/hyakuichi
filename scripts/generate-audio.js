/**
 * generate-audio.js
 * Google Cloud Text-to-Speech で全100首の朗読MP3を事前生成するスクリプト。
 * 一度生成したら public/audio/ にコミットし、以後はAPI不要の静的配信。
 *
 * 使い方:
 *   GOOGLE_TTS_API_KEY=... npm run generate-audio          # APIキー認証
 *   npm run generate-audio                                  # gcloud 認証 (auth print-access-token)
 *   npm run generate-audio -- --only=1,2      # 指定番号のみ（試聴用）
 *   npm run generate-audio -- --force         # 既存ファイルも再生成
 *   npm run generate-audio -- --voice=ja-JP-Neural2-C  # 声の差し替え
 *
 * 出力: public/audio/001-kami.mp3 / 001-shimo.mp3 〜 100-shimo.mp3（200ファイル）
 * 料金: Neural2 は月100万バイト無料枠。全200クリップの入力は合計~12KBで無料圏内。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POEMS_PATH = join(__dirname, '..', 'src', 'data', 'poems.json');
const OUT_DIR = join(__dirname, '..', 'public', 'audio');
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const DEFAULT_VOICE = 'ja-JP-Neural2-B'; // 女性・落ち着いた朗読調
const SPEAKING_RATE = 0.85;
const BREAK_TIME = '500ms'; // 句間のポーズ

// --- CLI引数 ---
const args = process.argv.slice(2);
const force = args.includes('--force');
const voice = args.find((a) => a.startsWith('--voice='))?.slice(8) || DEFAULT_VOICE;
const only = args
  .find((a) => a.startsWith('--only='))
  ?.slice(7)
  .split(',')
  .map(Number);

// --- 認証: APIキー優先、なければ gcloud ---
function getAuth() {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (key) {
    return { url: `${ENDPOINT}?key=${key}`, headers: {} };
  }
  try {
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
    const project = execSync('gcloud config get-value project', { encoding: 'utf-8' }).trim();
    console.log(`gcloud 認証を使用 (project: ${project})`);
    return {
      url: ENDPOINT,
      headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': project },
    };
  } catch {
    console.error('認証情報がありません。GOOGLE_TTS_API_KEY を設定するか gcloud auth login してください。');
    process.exit(1);
  }
}

/**
 * かな("あきのたの かりほのいほの とまをあらみ")をSSMLに変換。
 * 句間に <break> を入れて和歌らしい間を作る。
 * かなはひらがな＋半角スペースのみなので XML エスケープ不要。
 */
function buildSsml(kana) {
  return `<speak>${kana.trim().split(/\s+/).join(`<break time="${BREAK_TIME}"/>`)}</speak>`;
}

async function synthesize(ssml, auth) {
  const res = await fetch(auth.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth.headers },
    body: JSON.stringify({
      input: { ssml },
      voice: { languageCode: 'ja-JP', name: voice },
      audioConfig: { audioEncoding: 'MP3', speakingRate: SPEAKING_RATE },
    }),
  });
  if (!res.ok) {
    throw new Error(`TTS API ${res.status}: ${await res.text()}`);
  }
  const { audioContent } = await res.json();
  return Buffer.from(audioContent, 'base64');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const poems = JSON.parse(readFileSync(POEMS_PATH, 'utf-8'));
  mkdirSync(OUT_DIR, { recursive: true });

  const targets = only ? poems.filter((p) => only.includes(p.id)) : poems;
  const total = targets.length * 2;
  console.log(`voice: ${voice}, rate: ${SPEAKING_RATE}, break: ${BREAK_TIME}`);
  console.log(`${targets.length}首 × 2 = ${total}ファイルを処理します`);

  const auth = getAuth();
  let done = 0;
  let generated = 0;
  let skipped = 0;
  let totalBytes = 0;

  for (const poem of targets) {
    const pad = String(poem.id).padStart(3, '0');
    for (const part of ['kami', 'shimo']) {
      done++;
      const file = `${pad}-${part}.mp3`;
      const outPath = join(OUT_DIR, file);
      if (!force && existsSync(outPath)) {
        console.log(`[${done}/${total}] ${file} skip`);
        skipped++;
        continue;
      }
      const mp3 = await synthesize(buildSsml(poem[part].kana), auth);
      writeFileSync(outPath, mp3);
      totalBytes += mp3.length;
      generated++;
      console.log(`[${done}/${total}] ${file} (${(mp3.length / 1024).toFixed(1)} KB)`);
      await sleep(200);
    }
  }

  console.log(
    `完了: 生成 ${generated}, スキップ ${skipped}, 合計 ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

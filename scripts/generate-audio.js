/**
 * generate-audio.js
 * VOICEVOX で全100首＋序歌の読唱音声を事前生成するスクリプト。
 * 一度生成したら public/audio/ にコミットし、以後はエンジン不要の静的配信。
 *
 * 競技かるた公式の読唱リズム（八拍のリズム）をモーラ単位で再現する:
 *  - /audio_query が返す AudioQuery のモーラ列を編集してから /synthesis する
 *  - 各句を8拍に収める: 句末モーラの母音を (8 - モーラ数) 拍ぶん伸ばす
 *    （五音句は長く+3拍、七音句は短く+1拍。字余りでも最低 MIN_STRETCH_BEATS）
 *  - クリップ末尾の句はさらに余韻 YOIN_EXTRA を追加（静寂は speech.js のタイマー）
 *  - 全モーラの pitch を平均値に平板化（公式の平板な読み）。伸ばしモーラはやや下げる
 *
 * 前提: VOICEVOX エンジンが localhost:50021 で起動していること
 *（VOICEVOX アプリを起動するか、エンジン単体を実行）。
 *
 * 使い方:
 *   npm run generate-audio                         # 全202ファイル（既存はスキップ）
 *   npm run generate-audio -- --only=1,joka        # 指定番号のみ（試聴用。joka=序歌）
 *   npm run generate-audio -- --force              # 既存ファイルも再生成
 *   npm run generate-audio -- --speaker=13         # 話者ID差し替え（GET /speakers で一覧）
 *
 * 出力: public/audio/001-kami.m4a 〜 100-shimo.m4a + joka-kami.m4a / joka-shimo.m4a（202ファイル）
 * WAV→AAC(m4a) 変換は macOS 標準の afconvert を使用（依存追加なし）。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POEMS_PATH = join(__dirname, '..', 'src', 'data', 'poems.json');
const OUT_DIR = join(__dirname, '..', 'public', 'audio');
const ENGINE = 'http://localhost:50021';

// --- 読唱チューニング定数（試聴ゲートで触るのはここ） ---
const DEFAULT_SPEAKER = 52; // 雀松朱司（ノーマル・男声ナレーター調）。--speaker= で差し替え
const SPEED_SCALE = 0.95; // 全体の話速（1.0=標準）
const BEAT = 0.45; // 1拍の長さ(秒)。八拍ルールの単位
const BEATS_PER_KU = 8; // 各句を収める拍数
const MIN_STRETCH_BEATS = 0.5; // 字余り句でも最低これだけは伸ばす
const YOIN_EXTRA = 1.0; // クリップ末尾（余韻）の追加伸ばし(秒)
const PAUSE_S = 0.25; // 句間（読点）の無音(秒)
const PITCH_FLATTEN = 0.6; // 平板化の強さ（1=完全平板・0=元の抑揚。中間ブレンド）
const PITCH_DROP = 0.15; // 伸ばしモーラの音程下げ幅（余韻感）

// 序歌「難波津に」（王仁）。id がそのままファイル名 joka-kami.m4a / joka-shimo.m4a になる
const JOKA = {
  id: 'joka',
  kami: { kana: 'なにわづに さくやこのはな ふゆごもり' },
  shimo: { kana: 'いまをはるべと さくやこのはな' },
};

// --- CLI引数 ---
const args = process.argv.slice(2);
const force = args.includes('--force');
const speaker = Number(args.find((a) => a.startsWith('--speaker='))?.slice(10) || DEFAULT_SPEAKER);
const only = args
  .find((a) => a.startsWith('--only='))
  ?.slice(7)
  .split(','); // 文字列のまま保持（'joka' を含められる）

async function checkEngine() {
  try {
    const res = await fetch(`${ENGINE}/version`);
    const version = await res.text();
    console.log(`VOICEVOX engine ${version.replace(/"/g, '')} (speaker: ${speaker})`);
  } catch {
    console.error('VOICEVOX エンジンに接続できません (localhost:50021)。');
    console.error('VOICEVOX アプリを起動してから再実行してください: https://voicevox.hiroshiba.jp/');
    process.exit(1);
  }
}

/**
 * AudioQuery を公式読唱リズムに編集する。
 * かなは句を半角スペース区切り → 読点に変換して問い合わせ、pause_mora を句境界に使う。
 */
function applyChantRhythm(query, { isTail }) {
  query.speedScale = SPEED_SCALE;

  // 句グルーピング: pause_mora を持つ accent_phrase までを1句とする
  const kus = [];
  let current = [];
  for (const phrase of query.accent_phrases) {
    current.push(phrase);
    if (phrase.pause_mora) {
      phrase.pause_mora.vowel_length = PAUSE_S; // 句間の無音
      kus.push(current);
      current = [];
    }
  }
  if (current.length) kus.push(current);

  // pitch 平板化: 有声モーラを平均へ PITCH_FLATTEN の割合で寄せる（完全平板は単調になる）
  const allMoras = query.accent_phrases.flatMap((p) => p.moras);
  const voiced = allMoras.filter((m) => m.pitch > 0);
  const meanPitch = voiced.reduce((s, m) => s + m.pitch, 0) / (voiced.length || 1);
  for (const m of voiced) m.pitch += (meanPitch - m.pitch) * PITCH_FLATTEN;

  // 八拍ルール: 句末モーラの母音を (8 - モーラ数) 拍ぶん伸ばす
  kus.forEach((ku, kuIdx) => {
    const moras = ku.flatMap((p) => p.moras);
    const stretchBeats = Math.max(BEATS_PER_KU - moras.length, MIN_STRETCH_BEATS);
    const last = moras[moras.length - 1];
    last.vowel_length += stretchBeats * BEAT;
    if (isTail && kuIdx === kus.length - 1) {
      last.vowel_length += YOIN_EXTRA; // クリップ末尾の余韻
    }
    if (last.pitch > 0) last.pitch -= PITCH_DROP; // 伸ばしはやや下げて余韻感
  });

  return query;
}

async function synthesize(kana) {
  const text = kana.trim().split(/\s+/).join('、');
  const queryRes = await fetch(
    `${ENGINE}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`,
    { method: 'POST' }
  );
  if (!queryRes.ok) throw new Error(`audio_query ${queryRes.status}: ${await queryRes.text()}`);
  const query = applyChantRhythm(await queryRes.json(), { isTail: true });

  const synthRes = await fetch(`${ENGINE}/synthesis?speaker=${speaker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error(`synthesis ${synthRes.status}: ${await synthRes.text()}`);
  return Buffer.from(await synthRes.arrayBuffer()); // WAV
}

/** WAV → AAC(m4a) 変換（macOS 標準 afconvert） */
function wavToM4a(wavBuf, outPath) {
  const tmpWav = join(tmpdir(), `hyakuichi-tts-${process.pid}.wav`);
  writeFileSync(tmpWav, wavBuf);
  try {
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', tmpWav, outPath]);
  } finally {
    unlinkSync(tmpWav);
  }
}

async function main() {
  await checkEngine();
  const poems = JSON.parse(readFileSync(POEMS_PATH, 'utf-8'));
  mkdirSync(OUT_DIR, { recursive: true });

  const all = [...poems, JOKA];
  const targets = only ? all.filter((p) => only.includes(String(p.id))) : all;
  const total = targets.length * 2;
  console.log(
    `beat: ${BEAT}s × ${BEATS_PER_KU}拍, 余韻+${YOIN_EXTRA}s, speed: ${SPEED_SCALE}`
  );
  console.log(`${targets.length}首 × 2 = ${total}ファイルを処理します`);

  let done = 0;
  let generated = 0;
  let skipped = 0;

  for (const poem of targets) {
    const pad = poem.id === 'joka' ? 'joka' : String(poem.id).padStart(3, '0');
    for (const part of ['kami', 'shimo']) {
      done++;
      const file = `${pad}-${part}.m4a`;
      const outPath = join(OUT_DIR, file);
      if (!force && existsSync(outPath)) {
        console.log(`[${done}/${total}] ${file} skip`);
        skipped++;
        continue;
      }
      const wav = await synthesize(poem[part].kana);
      wavToM4a(wav, outPath);
      generated++;
      console.log(`[${done}/${total}] ${file}`);
    }
  }

  console.log(`完了: 生成 ${generated}, スキップ ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

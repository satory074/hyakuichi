/**
 * prepare-data.js
 * 百人一首データを外部ソースから取得・マージして poems.json を生成するスクリプト。
 * 使い方: node scripts/prepare-data.js
 *
 * ソース:
 *   - wakaba Gist (JSON: 歌番号・歌人・上の句・下の句・決まり字)
 *   - 不足分は手動データで補完
 *
 * 出力: src/data/poems.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'poems.json');

// Ensure output directory exists
mkdirSync(dirname(OUT_PATH), { recursive: true });

async function fetchGistData() {
  // wakaba's Hyakunin Isshu JSON Gist
  const url =
    'https://gist.githubusercontent.com/wakaba/1638424/raw/hyakunin-isshu.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch gist: ${res.status}`);
  return res.json();
}

/**
 * 決まり字の文字数を計算する
 */
function countKimariji(kimariji) {
  // ひらがな文字数（スペースを除く）
  return [...kimariji.replace(/\s/g, '')].length;
}

async function main() {
  console.log('Fetching data from Gist...');

  let rawData;
  try {
    rawData = await fetchGistData();
  } catch (e) {
    console.error('Failed to fetch from Gist, using fallback data.');
    console.error(e.message);
    console.log('Please ensure src/data/poems.json exists with valid data.');
    process.exit(1);
  }

  console.log(`Fetched ${rawData.length} poems.`);

  // Transform to our schema
  const poems = rawData.map((poem) => {
    const id = poem.number || poem.id;
    const poetKanji = poem.poet?.kanji || poem.author || '';
    const poetKana = poem.poet?.kana || '';

    const kamiKanji = poem.kami_no_ku?.kanji || poem.first_half || '';
    const kamiKana = poem.kami_no_ku?.kana || '';
    const shimoKanji = poem.shimo_no_ku?.kanji || poem.second_half || '';
    const shimoKana = poem.shimo_no_ku?.kana || '';
    const kimariji = poem.kimariji || '';

    return {
      id,
      poet: { kanji: poetKanji, kana: poetKana },
      kami: { kanji: kamiKanji, kana: kamiKana },
      shimo: { kanji: shimoKanji, kana: shimoKana },
      kimariji,
      kimarijiCount: countKimariji(kimariji),
    };
  });

  // Sort by id
  poems.sort((a, b) => a.id - b.id);

  // Validate
  if (poems.length !== 100) {
    console.warn(`Warning: Expected 100 poems but got ${poems.length}`);
  }

  // Check kimariji distribution
  const dist = {};
  for (const p of poems) {
    dist[p.kimarijiCount] = (dist[p.kimarijiCount] || 0) + 1;
  }
  console.log('Kimariji distribution:', dist);

  writeFileSync(OUT_PATH, JSON.stringify(poems, null, 2), 'utf-8');
  console.log(`Wrote ${poems.length} poems to ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

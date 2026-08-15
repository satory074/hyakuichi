# 朗読音声の出典

- **内容**: 各歌の上の句・下の句の読唱音声。`001-kami.m4a` / `001-shimo.m4a` 〜 `100-shimo.m4a` が第1番〜第100番に対応。`joka-kami.m4a` / `joka-shimo.m4a` は序歌「難波津に」（計202ファイル）。
- **生成**: VOICEVOX（ローカル音声合成エンジン）で事前生成（`scripts/generate-audio.js`。要 VOICEVOX アプリ起動 localhost:50021。WAV→AAC変換は macOS 標準 afconvert）。
- **ボイス**: VOICEVOX:雀松朱司（ノーマル、speaker id 52）。
- **読唱リズム**: 競技かるた公式の読み方を `/audio_query` のモーラ編集で再現 — 八拍のリズム（各句8拍・句末モーラの母音を「8−モーラ数」拍ぶん伸長。五音句は長く+3拍、七音句は短く+1拍）、クリップ末尾に余韻+1.0秒、pitch を平均へ60%平板化。5-3-1-6方式の静寂（余韻・間合い）は音声に焼き込まず `src/utils/speech.js` のタイマーで再現。
- **クレジット表記**: VOICEVOX の利用規約により「VOICEVOX:雀松朱司」の表記が必要（アプリの設定画面と本ファイルに記載）。
- **ライセンス**: VOICEVOX・雀松朱司の音源利用規約に従う（商用・非商用とも利用可、クレジット表記必須）。

音声を再生成・差し替えした場合は `vite.config.js` の runtimeCaching `cacheName`（現在 `poem-audio-v2`）のバージョンを上げること（1年キャッシュのため）。

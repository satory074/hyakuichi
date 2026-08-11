# 朗読音声の出典

- **内容**: 各歌の上の句・下の句の朗読音声。`001-kami.mp3` / `001-shimo.mp3` 〜 `100-shimo.mp3` が第1番〜第100番に対応（計200ファイル）。
- **生成**: Google Cloud Text-to-Speech API で事前生成（`scripts/generate-audio.js`、一度きりのローカル実行。再生成には GCP の API キーまたは gcloud 認証が必要）。
- **ボイス**: `ja-JP-Neural2-B`（女性・朗読調）、speakingRate 0.85、句間に SSML `<break time="500ms"/>`。
- **ライセンス**: Google Cloud TTS で生成した音声は、Google Cloud の利用規約のもと自作アプリへの組み込み・配信が許容される（Service Specific Terms 参照）。

音声を再生成・差し替えした場合は `vite.config.js` の runtimeCaching `cacheName`（`poem-audio`）のバージョンを上げること（1年キャッシュのため）。

import type { Trade } from '../../core/types'

// The bakery part. The backbone of the manual is the shop's day;
// what goes inside each part is heard from the chef, not written here.
export const bakery: Trade = {
  shopName: 'もふもふベーカリー',
  shelf: [
    { id: 'open', icon: '☀️', title: 'オープン前' },
    { id: 'day', icon: '🕐', title: '1日の流れ', note: '時間ごとの仕事' },
    { id: 'service', icon: '🛎️', title: '販売中', note: 'お客さまに売る仕事' },
    { id: 'close', icon: '🌙', title: 'クローズ' },
    { id: 'hygiene', icon: '🌡️', title: '衛生の記録', note: '冷蔵庫・冷凍庫の温度など' },
  ],
  greetings: {
    chef: 'シェフ、こんにちは！ モモです。\nお仕事のお話、聞かせてもらえたらうれしいです。マイクを押して、いつもの言葉で話してくださいね。',
    staff: 'おつかれさまです！ モモです。\n分からないことがあったら、何度でも聞いてくださいね。',
  },
}

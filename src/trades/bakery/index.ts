import type { Trade } from '../../core/types'
import { BAKERY_HYGIENE } from './hygiene'
import { BAKERY_CLEANING } from './cleaning'

// The bakery part. The backbone of the manual is the shop's day;
// what goes inside each part is heard from the chef, not written here.
export const bakery: Trade = {
  shopName: 'もふもふベーカリー',
  shelf: [
    // Not a place to file work: the day's timetable, built from the times
    // the chef mentions in the other parts.
    { id: 'day', icon: '🕐', title: '1日の流れ', note: '時間割', timetable: true },
    {
      id: 'open',
      icon: '☀️',
      title: 'オープン前',
      checklist: { record: 'morning', done: 'オープンの準備、ぜんぶできましたね！ きょうもいい1日になりますように (๑˃̵ᴗ˂̵)' },
    },
    { id: 'service', icon: '🛎️', title: '営業中', note: '段取り・包む・お知らせ・お客さん' },
    { id: 'recipe', icon: '📖', title: 'レシピ', note: 'パンごとの作り方', untimed: true, list: { title: '配合', label: '材料', text: '分量' } },
    { id: 'clean', icon: '🧹', title: '清掃', note: '場所・道具ごとのやり方', untimed: true, list: { title: '要点', label: '見出し', text: '中身' } },
    {
      id: 'close',
      icon: '🌙',
      title: 'クローズ',
      checklist: { record: 'close', done: 'クローズ、ぜんぶできましたね！ きょうもおつかれさまでした。気をつけて帰ってくださいね (๑˃̵ᴗ˂̵)' },
    },
    { id: 'hygiene', icon: '🌡️', title: '衛生の記録', note: '冷蔵庫・冷凍庫の温度など', record: true },
  ],
  hygiene: BAKERY_HYGIENE,
  seeds: { clean: BAKERY_CLEANING },
  greetings: {
    chef: 'シェフ、こんにちは！ モモです。\nお仕事のお話、聞かせてもらえたらうれしいです。マイクを押して、いつもの言葉で話してくださいね。',
    staff: 'おつかれさまです！ モモです。\n分からないことがあったら、何度でも聞いてくださいね。',
  },
}

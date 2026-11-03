import type { HygieneForm } from '../../core/types'

// The bakery guide's daily record form (日報型), questions word for word.
// When each is asked, and what is kept elsewhere, is this shop's own plan
// (もふもふベーカリー: eat-in, so the toilet every hour; tools washed after
// lunch and before leaving; health and stool tests on a separate sheet).
export const BAKERY_HYGIENE: HygieneForm = {
  title: '衛生管理記録表',
  source:
    '様式の出どころ：HACCPの考え方を取り入れたパン類の製造における食品衛生管理の手引書（日本パン技術研究所・全日本パン協同組合連合会・日本パン工業会）「記録様式（日報型）」35ページ',
  groups: [
    {
      title: '一般衛生管理',
      items: [
        { id: 'receive', text: '受入れた原材料に破れ、汚れや期限切れはありませんか', when: ['morning'] },
        {
          id: 'temps',
          text: '冷蔵庫（10℃以下）、冷凍庫（-18℃以下）の温度は問題ありませんか',
          when: ['morning'],
          temps: [
            { id: 'fridge', label: '冷蔵庫', max: 10 },
            { id: 'freezer', label: '冷凍庫', max: -18 },
          ],
        },
        { id: 'wash', text: '使用後に器具類の洗浄、殺菌をしましたか', when: ['lunch', 'close'] },
        {
          id: 'health',
          text: '従業員の健康状態、身だしなみに問題はありませんか',
          when: [],
          elsewhere: '体調・検便は別のシートで管理',
        },
        { id: 'hands', text: '手洗いをしていましたか（作業前やトイレ後、その他必要時）', when: ['morning'] },
        { id: 'toilet', text: 'トイレを清掃、消毒しましたか', when: ['close'], hourly: true },
      ],
    },
    {
      title: 'HACCPの考え方を取り入れた重点衛生管理',
      part: 'アレルゲン対策',
      items: [
        { id: 'switch', text: '製品切替時に設備、器具を洗浄しましたか', when: ['close'] },
        { id: 'return', text: '戻し生地は同一生地のみに使用しましたか', when: ['close'] },
        { id: 'leftover', text: '製品切替時に残り生地を取り除きましたか', when: ['close'] },
      ],
    },
    {
      title: 'HACCPの考え方を取り入れた重点衛生管理',
      part: '金属および硬質プラスティック対策',
      items: [
        { id: 'noise', text: '機械類に異常音等はありませんか', when: ['close'] },
        { id: 'broken', text: '器具類に破損等はありませんか', when: ['close'] },
      ],
    },
    {
      title: 'HACCPの考え方を取り入れた重点衛生管理',
      part: 'ノロウイルス対策',
      items: [{ id: 'gloves', text: '焼成冷却後工程では清潔なプラスティック製手袋を着用しましたか', when: ['close'] }],
    },
    {
      title: 'HACCPの考え方を取り入れた重点衛生管理',
      part: '有害微生物対策（焼成後加工時）',
      items: [
        { id: 'veg', text: '器具類、野菜などは十分に洗浄（殺菌）してから使用しましたか', when: ['close'] },
        { id: 'fry', text: '揚げ物等の加熱調理の揚げ色や焼き色は十分ですか', when: ['close'] },
        { id: 'cool', text: 'カレーフィリング等は加熱後速やかに冷却しましたか', when: ['close'] },
        { id: 'cuts', text: '手指に傷がある場合は耐水性絆創膏と手袋を着用しましたか', when: ['close'] },
      ],
    },
  ],
}

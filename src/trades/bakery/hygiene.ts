import type { HygieneForm } from '../../core/types'

// The bakery guide's daily record form (日報型), questions word for word.
// When each is asked, and what is kept elsewhere, is this shop's own plan
// (もふもふベーカリー: eat-in, so the toilet every hour; tools washed after
// lunch and before leaving; health and stool tests on a separate sheet).
export const BAKERY_HYGIENE: HygieneForm = {
  title: '衛生管理記録表',
  source:
    '様式の出どころ：HACCPの考え方を取り入れたパン類の製造における食品衛生管理の手引書（日本パン技術研究所・全日本パン協同組合連合会・日本パン工業会）「記録様式（日報型）」35ページ',
  plan: {
    title: '衛生管理計画',
    source:
      '出どころ：HACCPの考え方を取り入れたパン類の製造における食品衛生管理の手引書「衛生管理計画（記載例）」34ページ。★はもふもふベーカリーで変えたところ',
    sections: [
      {
        title: '一般衛生管理',
        rows: [
          {
            point: '原材料の受入れ',
            freq: '毎回',
            when: '納品時',
            pairs: [['包装状態、におい、表示、保存方法、期限などを確認', '返品して正常品に交換']],
          },
          {
            point: '冷蔵庫、冷凍庫の温度確認',
            freq: '毎日',
            when: '始業前',
            pairs: [['庫内温度の確認', '温度再設定\n故障時は修理依頼']],
          },
          {
            point: '従業員の健康管理、身だしなみ等',
            freq: '毎日',
            when: '始業前、作業時',
            pairs: [
              [
                '従業員の体調（下痢、発熱等）確認\n手指の傷、着衣等を確認',
                '体調不良者へ通院等を指示\n絆創膏・手袋着用（手指の傷）\n汚れた着衣の交換を指示',
              ],
            ],
            ours: { note: '体調・検便は別のシート（エクセルなど）で管理' },
          },
          {
            point: '衛生的な手洗いの実施',
            freq: '毎日',
            when: '作業前、トイレ後、その他必要時',
            pairs: [['衛生的な手洗いの実施', '未実施者への手洗いの指示']],
          },
          {
            point: '機械や器具の洗浄、殺菌',
            freq: '毎日',
            when: '使用後',
            pairs: [['洗浄、殺菌を実施', '洗浄、殺菌を再度実施']],
            ours: { when: '使用後（ランチのあとに一度、帰る前）' },
          },
          {
            point: 'トイレの清掃',
            freq: '毎日',
            when: '作業終了後',
            pairs: [['トイレの清掃、消毒の実施', '再度清掃、消毒を実施']],
            ours: { freq: '毎時', when: '営業中（イートインがあるため）、作業終了後' },
          },
        ],
      },
      {
        title: 'HACCPの考え方を取り入れた重点衛生管理',
        rows: [
          {
            point: 'アレルゲン対策',
            freq: '毎日',
            when: '製造作業中',
            pairs: [
              ['製品切替時の機械、器具の洗浄', '洗浄、殺菌を再度実施'],
              ['戻し生地の適切な使用\n製品切替時の残り生地の除去', '異なる生地が混入した製品の除去'],
            ],
          },
          {
            point: '金属及び硬質プラスティック対策',
            freq: '毎日',
            when: '製造作業中',
            pairs: [['機械類の異常音の確認\n器具類の破損等の確認', '異常原因の確認、調整\n異物混入製品の除去']],
          },
          {
            point: 'ノロウイルス対策',
            freq: '毎日',
            when: '焼成冷却後の作業中',
            pairs: [['プラスティック製手袋の着用', '未着用者への着用の指示']],
          },
          {
            point: '有害微生物対策（焼成後加工時）',
            freq: '毎日',
            when: '焼成後の加工作業中',
            pairs: [
              ['器具類の洗浄殺菌', '再度洗浄'],
              [
                '野菜の洗浄殺菌（十分な流水、又は適切な濃度、浸漬時間、すすぎによる次亜塩素酸Na溶液殺菌）',
                '再度洗浄\n次亜塩素酸Na溶液の再調整',
              ],
              ['揚げ物等は、揚げ色、焼き色が十分か確認', '再加熱または廃棄'],
              ['加熱調理後に冷却する具材は調理後速やかに冷却、冷蔵保管', '日々の使用残は廃棄'],
              ['手指に傷のある場合、耐水性絆創膏、手袋着用', '未着用者への着用の指示'],
            ],
          },
        ],
      },
    ],
  },
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

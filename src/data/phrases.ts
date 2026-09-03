export interface Phrase {
  id: string;
  japanese: string;
  furigana: string;
  romaji: string;
  english: string;
  day: number;
}

export const PHRASES: Record<string, Phrase> = {
  // repair (taught everywhere)
  mou_ichido: { id: "mou_ichido", japanese: "もう一度お願いします", furigana: "もういちどおねがいします", romaji: "mou ichido onegai shimasu", english: "Once more, please", day: 0 },
  yukkuri: { id: "yukkuri", japanese: "ゆっくりお願いします", furigana: "ゆっくりおねがいします", romaji: "yukkuri onegai shimasu", english: "Slowly, please", day: 0 },
  kore_nani: { id: "kore_nani", japanese: "これは何ですか", furigana: "これはなんですか", romaji: "kore wa nan desu ka", english: "What is this?", day: 0 },
  // day 1
  kankou: { id: "kankou", japanese: "観光です", furigana: "かんこうです", romaji: "kankou desu", english: "Sightseeing", day: 1 },
  nishuukan: { id: "nishuukan", japanese: "二週間です", furigana: "にしゅうかんです", romaji: "ni shuukan desu", english: "Two weeks", day: 1 },
  tomodachi: { id: "tomodachi", japanese: "友達の家です", furigana: "ともだちのいえです", romaji: "tomodachi no ie desu", english: "A friend's house", day: 1 },
  hai_onegai: { id: "hai_onegai", japanese: "はい、お願いします", furigana: "はい、おねがいします", romaji: "hai, onegai shimasu", english: "Yes, please", day: 1 },
  // day 2
  sumimasen: { id: "sumimasen", japanese: "すみません", furigana: "すみません", romaji: "sumimasen", english: "Excuse me / sorry", day: 2 },
  made_ikura: { id: "made_ikura", japanese: "新宿までいくらですか", furigana: "しんじゅくまでいくらですか", romaji: "shinjuku made ikura desu ka", english: "How much to Shinjuku?", day: 2 },
  arigatou: { id: "arigatou", japanese: "ありがとうございます", furigana: "ありがとうございます", romaji: "arigatou gozaimasu", english: "Thank you", day: 2 },
  // day 3
  dono_home: { id: "dono_home", japanese: "どのホームですか", furigana: "どのほーむですか", romaji: "dono hoomu desu ka", english: "Which platform?", day: 3 },
  norikae: { id: "norikae", japanese: "乗り換えは必要ですか", furigana: "のりかえはひつようですか", romaji: "norikae wa hitsuyou desu ka", english: "Do I need to transfer?", day: 3 },
  tsugi_densha: { id: "tsugi_densha", japanese: "次の電車ですか", furigana: "つぎのでんしゃですか", romaji: "tsugi no densha desu ka", english: "Is it the next train?", day: 3 },
  // day 4
  kono_basu: { id: "kono_basu", japanese: "このバスは中野に行きますか", furigana: "このばすはなかのにいきますか", romaji: "kono basu wa nakano ni ikimasu ka", english: "Does this bus go to Nakano?", day: 4 },
  nanban: { id: "nanban", japanese: "何番ですか", furigana: "なんばんですか", romaji: "nanban desu ka", english: "Which number?", day: 4 },
  // day 5
  fukuro_iranai: { id: "fukuro_iranai", japanese: "いらないです", furigana: "いらないです", romaji: "iranai desu", english: "I don't need one", day: 5 },
  onegai: { id: "onegai", japanese: "お願いします", furigana: "おねがいします", romaji: "onegai shimasu", english: "Yes please", day: 5 },
  nai_desu: { id: "nai_desu", japanese: "ないです", furigana: "ないです", romaji: "nai desu", english: "I don't have one", day: 5 },
  daijoubu: { id: "daijoubu", japanese: "大丈夫です", furigana: "だいじょうぶです", romaji: "daijoubu desu", english: "I'm fine (no thanks)", day: 5 },
  // day 6
  hoshou_gaisha: { id: "hoshou_gaisha", japanese: "保証会社は使えますか", furigana: "ほしょうがいしゃはつかえますか", romaji: "hoshou gaisha wa tsukaemasu ka", english: "Can I use a guarantor company?", day: 6 },
  hoka_bukken: { id: "hoka_bukken", japanese: "他の物件はありますか", furigana: "ほかのぶっけんはありますか", romaji: "hoka no bukken wa arimasu ka", english: "Are there other properties?", day: 6 },
  osoreirimasu: { id: "osoreirimasu", japanese: "恐れ入りますが", furigana: "おそれいりますが", romaji: "osore irimasu ga", english: "I'm terribly sorry, but…", day: 6 },
  wakarimashita: { id: "wakarimashita", japanese: "わかりました", furigana: "わかりました", romaji: "wakarimashita", english: "Understood", day: 6 },
};

export const REPAIR_PHRASE_IDS = ["mou_ichido", "yukkuri", "kore_nani"] as const;

import type { Line, Option, Register, Scenario } from "../types";

const L = (japanese: string, furigana: string, romaji: string, english: string, register: Register = "polite", true_meaning?: string): Line => ({
  japanese, furigana, romaji, english, register, true_meaning,
});

const O = (
  id: string,
  kind: Option["kind"],
  japanese: string,
  furigana: string,
  romaji: string,
  english: string,
  register: Register,
  extra: Partial<Option> = {},
): Option => ({ id, kind, japanese, furigana, romaji, english, register, ...extra });

const ENG = (id: string, text: string): Option =>
  O(id, "english", text, text, text, text, "casual", { keys: [] });

// ---------------------------------------------------------------- DAY 1
const day1: Scenario = {
  day: 1,
  location: "Immigration",
  locationJa: "入国審査",
  objective: "Answer the officer's four questions and get stamped in.",
  timer_seconds: 12,
  intro: "Narita, 6:40am. The officer doesn't look up. He asks the same four questions six hundred times a day.",
  offenceLabel: "was rude at immigration",
  npc: {
    npc_id: "officer_sato",
    name: "審査官",
    surface: "Flat, procedural, patient. Speaks slowly for foreigners.",
    true_intent: "Wants to process you in under ninety seconds. Will not chat.",
    reveal_rule: "Never explains. If misunderstood, repeats the same question, slower.",
    softens_if: ["polite form"],
    hardens_if: ["english"],
    patience: 6,
    register_expected: "polite",
  },
  target_phrases: ["観光です", "二週間です", "友達の家です"],
  fail_conditions: ["freeze", "english"],
  beats: [
    {
      id: "d1_passport",
      npc: L("パスポートをお願いします。", "ぱすぽーとをおねがいします。", "pasupooto o onegai shimasu.", "Passport, please.", "polite", "Routine. Hand it over."),
      options: [
        O("a", "correct", "はい、お願いします", "はい、おねがいします", "hai, onegai shimasu", "Yes, here you go", "polite", { phraseId: "hai_onegai", keys: ["はい", "どうぞ", "お願い"] }),
        O("b", "wrong", "観光です", "かんこうです", "kankou desu", "Sightseeing", "polite", {
          reaction: L("…パスポートを。", "…ぱすぽーとを。", "...pasupooto o.", "...Your passport.", "polite", "You answered a question I didn't ask."),
          senseiNote: "He asked for your passport, you told him why you're here. Answer the question in front of you, not the one you rehearsed.",
        }),
        ENG("c", "Here you go."),
      ],
    },
    {
      id: "d1_purpose",
      npc: L("入国の目的は何ですか。", "にゅうこくのもくてきはなんですか。", "nyuukoku no mokuteki wa nan desu ka.", "What is the purpose of your visit?", "polite", "Say tourism and we both move on."),
      options: [
        O("a", "correct", "観光です", "かんこうです", "kankou desu", "Sightseeing", "polite", { phraseId: "kankou", keys: ["観光", "かんこう", "kankou"] }),
        O("b", "correct", "観光", "かんこう", "kankou", "Sightseeing (casual)", "casual", {
          meiwaku: 4, keys: [],
          reaction: L("…観光ですね。", "…かんこうですね。", "...kankou desu ne.", "...Sightseeing, I see.", "polite", "Understood, but that was blunt."),
          senseiNote: "Dropping です at the immigration desk isn't a crime, but it reads as curt. Officers notice register.",
        }),
        O("c", "wrong", "二週間です", "にしゅうかんです", "ni shuukan desu", "Two weeks", "polite", {
          senseiNote: "目的 (mokuteki) = purpose. You gave a duration. Listen for the question word: 何 asks what, どのくらい asks how long.",
        }),
        ENG("d", "Tourism."),
      ],
    },
    {
      id: "d1_duration",
      npc: L("滞在期間はどのくらいですか。", "たいざいきかんはどのくらいですか。", "taizai kikan wa dono kurai desu ka.", "How long will you stay?", "polite", "Give me a number."),
      options: [
        O("a", "correct", "二週間です", "にしゅうかんです", "ni shuukan desu", "Two weeks", "polite", { phraseId: "nishuukan", keys: ["週間", "しゅうかん", "shuukan", "二週", "日間"] }),
        O("b", "wrong", "友達の家です", "ともだちのいえです", "tomodachi no ie desu", "A friend's house", "polite", {
          senseiNote: "どのくらい = how long. You answered where. Same pattern as before: catch the question word first.",
        }),
        O("c", "wrong", "はい", "はい", "hai", "Yes", "polite", {
          reaction: L("…はい？期間は。", "…はい？きかんは。", "...hai? kikan wa.", "...Yes? The duration.", "polite", "'Yes' is not a duration."),
          senseiNote: "はい to a どのくらい question is a freeze in disguise. If you didn't catch it, もう一度お願いします is a better move than はい.",
        }),
        ENG("d", "Two weeks."),
      ],
    },
    {
      id: "d1_stay",
      final: true,
      npc: L("どこに泊まりますか。", "どこにとまりますか。", "doko ni tomarimasu ka.", "Where will you be staying?", "polite", "Last one. Then the stamp."),
      options: [
        O("a", "correct", "友達の家です", "ともだちのいえです", "tomodachi no ie desu", "A friend's house", "polite", {
          phraseId: "tomodachi", keys: ["友達", "ともだち", "tomodachi", "ホテル", "家"],
          reaction: L("はい、結構です。どうぞ。", "はい、けっこうです。どうぞ。", "hai, kekkou desu. douzo.", "Fine. Go ahead.", "polite", "Processed."),
        }),
        O("b", "wrong", "観光です", "かんこうです", "kankou desu", "Sightseeing", "polite", {
          senseiNote: "どこ = where. 泊まる = to stay overnight. You'll hear 泊まる again at every hotel counter in the country.",
        }),
        ENG("c", "At my friend's place."),
      ],
    },
  ],
};

// ---------------------------------------------------------------- DAY 2
const day2: Scenario = {
  day: 2,
  location: "Ticket machine",
  locationJa: "券売機",
  objective: "Buy the correct ticket to Shinjuku without paying for a taxi.",
  timer_seconds: 10,
  intro: "The fare map is a wall of kanji. The machine is beeping at you. A salaryman behind you has stopped pretending not to watch.",
  offenceLabel: "was curt with a stranger who helped you",
  npc: {
    npc_id: "salaryman_okada",
    name: "サラリーマン",
    surface: "Slightly rushed, but decent. Will help if asked clearly.",
    true_intent: "Has a train in four minutes. Will leave if you dither.",
    reveal_rule: "Never says he's in a hurry. Shows it by clipped answers and glancing at the board.",
    softens_if: ["すみません first", "polite form"],
    hardens_if: ["english", "casual"],
    patience: 4,
    register_expected: "polite",
  },
  target_phrases: ["〜までいくらですか", "すみません"],
  fail_conditions: ["freeze", "english"],
  beats: [
    {
      id: "d2_approach",
      npc: L("あの…大丈夫ですか？", "あの…だいじょうぶですか？", "ano... daijoubu desu ka?", "Um... are you alright?", "polite", "You're blocking the machine. Do you need help or not?"),
      options: [
        O("a", "correct", "すみません、新宿までいくらですか", "すみません、しんじゅくまでいくらですか", "sumimasen, shinjuku made ikura desu ka", "Sorry — how much to Shinjuku?", "polite", { phraseId: "made_ikura", keys: ["いくら", "ikura", "まで", "新宿"] }),
        O("b", "wrong", "大丈夫です", "だいじょうぶです", "daijoubu desu", "I'm fine", "polite", {
          patience: -1,
          reaction: L("…本当に？", "…ほんとうに？", "...hontou ni?", "...Really?", "polite", "You are visibly not fine."),
          senseiNote: "大丈夫です is the reflex that strands people. It means 'no thanks'. You needed help — すみません + the question was the move.",
        }),
        O("c", "correct", "タクシーに乗る", "たくしーにのる", "(take a taxi)", "(give up, take a taxi)", "casual", {
          wallet: -8000, completes: true, keys: [],
          reaction: L("…", "…", "...", "(he watches you walk to the taxi rank)", "polite", "Coward's exit."),
          senseiNote: "You paid ¥8,000 to avoid one sentence. The sentence was 新宿までいくらですか. It's cheaper.",
        }),
        ENG("d", "Do you speak English?"),
      ],
    },
    {
      id: "d2_price",
      npc: L("新宿？二百円ですよ。", "しんじゅく？にひゃくえんですよ。", "shinjuku? nihyaku en desu yo.", "Shinjuku? It's 200 yen.", "polite", "200. Not 2000. Listen to the number."),
      options: [
        O("a", "correct", "ありがとうございます", "ありがとうございます", "arigatou gozaimasu", "Thank you very much", "polite", { phraseId: "arigatou", keys: ["ありがとう", "arigatou", "どうも"] }),
        O("b", "correct", "ありがと", "ありがと", "arigato", "Thanks (casual)", "casual", {
          meiwaku: 6, keys: [],
          reaction: L("…はい。", "…はい。", "...hai.", "...Sure.", "polite", "Casual thanks to a stranger who stopped for you. Noted."),
          senseiNote: "ありがと to a stranger older than you reads as a teenager thanking a parent. ございます costs half a second.",
        }),
        O("c", "wrong", "いくらですか", "いくらですか", "ikura desu ka", "How much is it?", "polite", {
          patience: -1,
          reaction: L("だから、二百円。", "だから、にひゃくえん。", "dakara, nihyaku en.", "Like I said. 200 yen.", "polite", "I just told you."),
          senseiNote: "He'd already answered. If you didn't catch the number, ゆっくりお願いします gets you a slow repeat without the だから.",
        }),
        ENG("d", "Thanks!"),
      ],
    },
    {
      id: "d2_button",
      final: true,
      npc: L("ここ。二百円のボタン、押して。", "ここ。にひゃくえんのぼたん、おして。", "koko. nihyaku en no botan, oshite.", "Here. Press the 200-yen button.", "casual", "He's dropped to casual because he's pointing at a screen, not because he's your friend."),
      options: [
        O("a", "correct", "二百円", "にひゃくえん", "(press ¥200)", "(press ¥200)", "polite", {
          wallet: -200, keys: ["200", "二百", "にひゃく"],
          reaction: L("はい、それ。じゃ。", "はい、それ。じゃ。", "hai, sore. ja.", "Yep, that one. Later.", "casual", "Done. He's already gone."),
        }),
        O("b", "wrong", "二千円", "にせんえん", "(press ¥2000)", "(press ¥2000)", "polite", {
          wallet: -2000, patience: -1,
          reaction: L("あっ、それ違う！", "あっ、それちがう！", "a', sore chigau!", "Ah — not that one!", "casual", "Wrong button. That's two thousand."),
          senseiNote: "二百 (nihyaku, 200) vs 二千 (nisen, 2000). The ¥1,800 you lost is the price of a number you'll now never forget.",
        }),
        O("c", "wrong", "百二十円", "ひゃくにじゅうえん", "(press ¥120)", "(press ¥120)", "polite", {
          wallet: -120, patience: -1,
          reaction: L("違う違う、二百。", "ちがうちがう、にひゃく。", "chigau chigau, nihyaku.", "No no, two hundred.", "casual", "Wrong."),
          senseiNote: "百二十 is 120. You heard 二百 (200). Numbers in the 100s: 百 first means one hundred; 二百 means two hundred.",
        }),
      ],
    },
  ],
};

// ---------------------------------------------------------------- DAY 3
const day3: Scenario = {
  day: 3,
  location: "Platform",
  locationJa: "ホーム",
  objective: "Board the Shinjuku-bound train. Not the other one.",
  timer_seconds: 9,
  intro: "Eight platforms. The announcement is coming through a speaker that was installed in 1987. You have ninety seconds.",
  offenceLabel: "blocked the platform stairs",
  npc: {
    npc_id: "staff_kimura",
    name: "駅員",
    surface: "Brisk, professional, used to lost foreigners.",
    true_intent: "Will point you at the right platform once, then go back to work.",
    reveal_rule: "Never repeats unprompted. Wait to be asked.",
    softens_if: ["どのホームですか", "polite form"],
    hardens_if: ["english"],
    patience: 4,
    register_expected: "polite",
  },
  target_phrases: ["どのホームですか", "乗り換え", "次の電車"],
  fail_conditions: ["freeze", "english", "objective"],
  beats: [
    {
      id: "d3_where",
      npc: L("どちらまでですか？", "どちらまでですか？", "dochira made desu ka?", "Where to?", "polite", "State your destination."),
      options: [
        O("a", "correct", "新宿までお願いします", "しんじゅくまでおねがいします", "shinjuku made onegai shimasu", "To Shinjuku, please", "polite", { keys: ["新宿", "しんじゅく", "shinjuku", "まで"] }),
        O("b", "wrong", "二週間です", "にしゅうかんです", "ni shuukan desu", "Two weeks", "polite", {
          senseiNote: "どちらまで = where to (polite). You reached for the immigration script. Different day, different question word.",
        }),
        O("c", "wrong", "次の電車ですか", "つぎのでんしゃですか", "tsugi no densha desu ka", "Is it the next train?", "polite", {
          patience: -1,
          senseiNote: "Good phrase, wrong moment. He asked where you're going; you asked which train. Destination first, then logistics.",
        }),
        ENG("d", "Shinjuku station."),
      ],
    },
    {
      id: "d3_transfer",
      npc: L("新宿ですね。次の電車は乗り換えが必要ですよ。", "しんじゅくですね。つぎのでんしゃはのりかえがひつようですよ。", "shinjuku desu ne. tsugi no densha wa norikae ga hitsuyou desu yo.", "Shinjuku. The next train needs a transfer.", "polite", "Don't just get on the next one."),
      options: [
        O("a", "correct", "どのホームですか", "どのほーむですか", "dono hoomu desu ka", "Which platform?", "polite", {
          phraseId: "dono_home", keys: ["ホーム", "hoomu", "どの", "番線"],
          reaction: L("直通は四番線です。放送を聞いてください。", "ちょくつうはよんばんせんです。ほうそうをきいてください。", "chokutsuu wa yonbansen desu. housou o kiite kudasai.", "The direct one is platform 4. Listen for the announcement.", "polite", "Four. Remember four."),
        }),
        O("b", "correct", "乗り換えは必要ですか", "のりかえはひつようですか", "norikae wa hitsuyou desu ka", "Do I need to transfer?", "polite", {
          phraseId: "norikae", patience: -1, keys: ["乗り換え", "のりかえ", "norikae"],
          reaction: L("…はい、次のは。直通は四番線です。", "…はい、つぎのは。ちょくつうはよんばんせんです。", "...hai, tsugi no wa. chokutsuu wa yonbansen desu.", "...Yes, the next one does. The direct train is platform 4.", "polite", "I literally just said that. But fine — platform 4."),
          senseiNote: "You asked him to confirm something he'd just said. Not wrong — confirming before committing is the whole skill — but どのホームですか would have gotten you the platform in one move.",
        }),
        O("c", "wrong", "はい、わかりました", "はい、わかりました", "hai, wakarimashita", "Yes, understood", "polite", {
          reaction: L("…はい。", "…はい。", "...hai.", "...Okay.", "polite", "You didn't ask which platform. I'm not going to volunteer it."),
          senseiNote: "わかりました when you haven't actually understood is the most expensive phrase in Japanese. He was waiting for a question.",
        }),
        ENG("d", "Which platform?"),
      ],
    },
    {
      id: "d3_announce",
      final: true,
      rate: 1.35,
      timer: 8,
      npc: L("まもなく、三番線に品川方面行き、四番線に新宿方面行きの電車が参ります。", "まもなく、さんばんせんにしながわほうめんゆき、よんばんせんにしんじゅくほうめんゆきのでんしゃがまいります。", "mamonaku, sanbansen ni shinagawa houmen yuki, yonbansen ni shinjuku houmen yuki no densha ga mairimasu.", "(announcement) Trains arriving: platform 3 for Shinagawa, platform 4 for Shinjuku.", "keigo", "Platform 4. If you heard 三 first and moved, you're on the wrong train."),
      options: [
        O("a", "wrong", "三番線に走る", "さんばんせんにはしる", "(run to platform 3)", "(run to platform 3)", "polite", {
          failsObjective: true, wallet: -300, keys: ["3", "三", "さん"],
          reaction: L("この電車は品川方面行きです。", "このでんしゃはしながわほうめんゆきです。", "kono densha wa shinagawa houmen yuki desu.", "(on-board) This train is bound for Shinagawa.", "keigo", "Wrong train. You heard the first number and stopped listening."),
          senseiNote: "You heard 三番線 and went. The announcement had two platforms in it; yours was the second. When an announcement is too fast, もう一度 replays it — that's not cheating, that's what the button on the platform is for.",
        }),
        O("b", "correct", "四番線に走る", "よんばんせんにはしる", "(run to platform 4)", "(run to platform 4)", "polite", {
          keys: ["4", "四", "よん"],
          reaction: L("四番線、新宿方面、ドアが閉まります。", "よんばんせん、しんじゅくほうめん、どあがしまります。", "yonbansen, shinjuku houmen, doa ga shimarimasu.", "Platform 4, Shinjuku-bound, doors closing.", "keigo", "Made it."),
        }),
        O("c", "wrong", "一番線に走る", "いちばんせんにはしる", "(run to platform 1)", "(run to platform 1)", "polite", {
          failsObjective: true, wallet: -300, keys: ["1", "一", "いち"],
          reaction: L("この電車は回送です。", "このでんしゃはかいそうです。", "kono densha wa kaisou desu.", "(sign) This train is out of service.", "keigo", "Nobody said platform 1."),
          senseiNote: "Platform 1 wasn't in the announcement at all. That's a guess, not a mishearing. Replay beats guessing every time.",
        }),
      ],
    },
  ],
};

// ---------------------------------------------------------------- DAY 4
const day4: Scenario = {
  day: 4,
  location: "Bus depot",
  locationJa: "バス停",
  objective: "Get on the bus that actually goes to Nakano.",
  timer_seconds: 9,
  intro: "Six bays, twelve routes, one sign, all kanji. A bus is idling with its door open. The driver isn't looking at you.",
  offenceLabel: "held up a bus",
  npc: {
    npc_id: "driver_hayashi",
    name: "運転手",
    surface: "Gruff, casual, bored. Not unkind.",
    true_intent: "Will tell you the right bay if you ask before boarding. Won't stop you boarding the wrong one.",
    reveal_rule: "Speaks casual. Never volunteers information.",
    softens_if: ["asks before boarding", "polite form"],
    hardens_if: ["english", "boards without asking"],
    patience: 4,
    register_expected: "polite",
  },
  target_phrases: ["このバスは〜に行きますか", "何番"],
  fail_conditions: ["freeze", "english", "objective"],
  beats: [
    {
      id: "d4_door",
      npc: L("はい、どうぞ。", "はい、どうぞ。", "hai, douzo.", "Yeah, go ahead.", "casual", "I'm saying you can board. I'm not saying this is your bus."),
      options: [
        O("a", "correct", "このバスは中野に行きますか", "このばすはなかのにいきますか", "kono basu wa nakano ni ikimasu ka", "Does this bus go to Nakano?", "polite", { phraseId: "kono_basu", keys: ["中野", "なかの", "nakano", "行き", "いき"] }),
        O("b", "wrong", "（そのまま乗る）", "（そのままのる）", "(just board)", "(just board)", "casual", {
          failsObjective: true, wallet: -220, keys: [],
          reaction: L("…次は、高円寺駅前ー。", "…つぎは、こうえんじえきまえー。", "...tsugi wa, kouenji ekimae.", "(20 min later) ...Next stop, Koenji Station.", "polite", "Wrong bus. You never asked."),
          senseiNote: "どうぞ meant 'you may board', not 'this is your bus'. Confirm before committing — このバスは中野に行きますか — costs three seconds. The wrong bus cost you ¥220 and twenty minutes.",
        }),
        O("c", "wrong", "何番ですか", "なんばんですか", "nanban desu ka", "Which number?", "polite", {
          patience: -1, phraseId: "nanban",
          reaction: L("何番って…どこ行くの？", "なんばんって…どこいくの？", "nanban tte... doko iku no?", "Which number... where are you going?", "casual", "You asked which bus without saying where. I can't answer that."),
          senseiNote: "何番 is the right phrase, one step early. He can't tell you a number until he knows your destination.",
        }),
        ENG("d", "Is this the Nakano bus?"),
      ],
    },
    {
      id: "d4_wrongbus",
      npc: L("中野？これは違うよ。三番のりばの、二十一番。", "なかの？これはちがうよ。さんばんのりばの、にじゅういちばん。", "nakano? kore wa chigau yo. sanban noriba no, nijuuichi ban.", "Nakano? Not this one. Bay 3, bus 21.", "casual", "Bay three. Bus twenty-one. Two numbers. Get both."),
      options: [
        O("a", "correct", "二十一番ですね、ありがとうございます", "にじゅういちばんですね、ありがとうございます", "nijuuichi ban desu ne, arigatou gozaimasu", "Bus 21, right? Thanks", "polite", { keys: ["21", "二十一", "にじゅういち"] }),
        O("b", "wrong", "十二番ですね", "じゅうにばんですね", "juuni ban desu ne", "Bus 12, right?", "polite", {
          patience: -1, keys: ["12", "十二", "じゅうに"],
          reaction: L("違う違う、二十一。に、じゅう、いち。", "ちがうちがう、にじゅういち。に、じゅう、いち。", "chigau chigau, nijuuichi. ni, juu, ichi.", "No no, twenty-one. Two. Ten. One.", "casual", "Twelve and twenty-one are not the same."),
          senseiNote: "二十一 (ni-juu-ichi, 21) vs 十二 (juu-ni, 12). Japanese numbers are read in the order they're built: two-tens-one. You flipped it.",
        }),
        O("c", "wrong", "はい（乗る）", "はい（のる）", "hai (board)", "Okay (board this bus)", "polite", {
          failsObjective: true, wallet: -220,
          reaction: L("いや、だから違うって…", "いや、だからちがうって…", "iya, dakara chigau tte...", "No — I said it's not this one...", "casual", "He said no and you boarded anyway."),
          senseiNote: "はい as a reflex again. He told you this bus was wrong (違う) and you got on. When you hear 違う, stop moving.",
        }),
        ENG("d", "Twenty-one, got it."),
      ],
    },
    {
      id: "d4_fare",
      final: true,
      callbackOf: "made_ikura",
      npc: L("はい、どこまで？", "はい、どこまで？", "hai, doko made?", "Yeah, where to?", "casual", "Same question as the station yesterday, minus the politeness."),
      options: [
        O("a", "correct", "中野までいくらですか", "なかのまでいくらですか", "nakano made ikura desu ka", "How much to Nakano?", "polite", {
          phraseId: "made_ikura", wallet: -220, keys: ["いくら", "ikura", "中野", "まで"],
          reaction: L("二百二十円。前払いね。", "にひゃくにじゅうえん。まえばらいね。", "nihyaku nijuu en. maebarai ne.", "220 yen. Pay up front.", "casual", "Done. You're on the right bus."),
        }),
        O("b", "wrong", "観光です", "かんこうです", "kankou desu", "Sightseeing", "polite", {
          patience: -1,
          reaction: L("…はあ。で、どこまで？", "…はあ。で、どこまで？", "...haa. de, doko made?", "...Right. So, where to?", "casual", "I didn't ask why you're in Japan."),
          senseiNote: "どこまで = how far / where to. It's the same まで from 新宿までいくらですか on Day 2. You've heard this one before.",
        }),
        O("c", "wrong", "何番ですか", "なんばんですか", "nanban desu ka", "Which number?", "polite", {
          patience: -1,
          senseiNote: "You're already on bus 21. He's asking where you're getting off.",
        }),
        ENG("d", "Nakano, please."),
      ],
    },
  ],
};

// ---------------------------------------------------------------- DAY 5
const day5: Scenario = {
  day: 5,
  location: "Konbini",
  locationJa: "コンビニ",
  objective: "Complete the transaction without freezing. Four questions. Seconds each.",
  timer_seconds: 5,
  intro: "Onigiri, a bento, a canned coffee. The clerk has already started talking before you've put them down. There's a queue.",
  offenceLabel: "held up the konbini queue",
  npc: {
    npc_id: "clerk_nguyen",
    name: "店員",
    surface: "Fast, scripted, polite. Same four questions, all day.",
    true_intent: "Needs a yes or a no. Any yes or no. In under three seconds.",
    reveal_rule: "Never slows down unprompted. Repeats the question verbatim if you stall.",
    softens_if: ["short answers"],
    hardens_if: ["keigo", "english", "long answers"],
    patience: 5,
    register_expected: "polite",
  },
  target_phrases: ["袋いりますか", "温めますか", "ポイントカード"],
  fail_conditions: ["freeze", "english"],
  beats: [
    {
      id: "d5_bag",
      npc: L("袋いりますか？", "ふくろいりますか？", "fukuro irimasu ka?", "Do you need a bag?", "polite", "Yes or no. Now."),
      options: [
        O("a", "correct", "いらないです", "いらないです", "iranai desu", "No, I don't need one", "polite", { phraseId: "fukuro_iranai", keys: ["いらない", "iranai", "いいです", "大丈夫", "結構"] }),
        O("b", "correct", "お願いします", "おねがいします", "onegai shimasu", "Yes please", "polite", { phraseId: "onegai", wallet: -3, keys: ["お願い", "onegai", "はい", "ください"] }),
        O("c", "correct", "恐れ入りますが、結構でございます", "おそれいりますが、けっこうでございます", "osore irimasu ga, kekkou de gozaimasu", "I humbly decline (keigo)", "keigo", {
          meiwaku: 5, patience: -1, keys: [],
          reaction: L("…あ、はい。", "…あ、はい。", "...a, hai.", "...Oh. Okay.", "polite", "Why are you speaking to me like I'm your CEO? The man behind you is staring."),
          senseiNote: "Keigo at a konbini is over-formal to the point of strange. The clerk was confused and the queue noticed. Match the register of the room: いらないです.",
        }),
        ENG("d", "No bag."),
      ],
    },
    {
      id: "d5_warm",
      npc: L("お弁当、温めますか？", "おべんとう、あたためますか？", "obentou, atatamemasu ka?", "Shall I heat the bento?", "polite", "Yes or no."),
      options: [
        O("a", "correct", "お願いします", "おねがいします", "onegai shimasu", "Yes please", "polite", { phraseId: "onegai", keys: ["お願い", "onegai", "はい"] }),
        O("b", "correct", "大丈夫です", "だいじょうぶです", "daijoubu desu", "No, I'm fine", "polite", { phraseId: "daijoubu", keys: ["大丈夫", "daijoubu", "いらない", "いいです"] }),
        O("c", "wrong", "いくらですか", "いくらですか", "ikura desu ka", "How much is it?", "polite", {
          patience: -1,
          reaction: L("…温め、どうしますか？", "…あたため、どうしますか？", "...atatame, dou shimasu ka?", "...Heating — yes or no?", "polite", "That's not what I asked."),
          senseiNote: "温める (atatameru) = to heat. It's one of the four konbini questions. You'll hear it every single time you buy a bento.",
        }),
        ENG("d", "Yes, heat it."),
      ],
    },
    {
      id: "d5_points",
      npc: L("ポイントカードお持ちですか？", "ぽいんとかーどおもちですか？", "pointo kaado omochi desu ka?", "Do you have a points card?", "polite", "You don't. Say so."),
      options: [
        O("a", "correct", "ないです", "ないです", "nai desu", "I don't have one", "polite", { phraseId: "nai_desu", keys: ["ない", "nai", "持ってない", "大丈夫"] }),
        O("b", "correct", "大丈夫です", "だいじょうぶです", "daijoubu desu", "I'm fine (no)", "polite", { phraseId: "daijoubu", keys: [] }),
        O("c", "wrong", "はい、お願いします", "はい、おねがいします", "hai, onegai shimasu", "Yes, please", "polite", {
          patience: -1,
          reaction: L("…カードは？", "…かーどは？", "...kaado wa?", "...The card?", "polite", "You said yes. Now she's waiting for a card you don't have."),
          senseiNote: "お持ちですか = do you have (polite). はい means you do. The clerk is now holding out her hand. ないです ends it instantly.",
        }),
        ENG("d", "No card."),
      ],
    },
    {
      id: "d5_chopsticks",
      final: true,
      npc: L("お箸、おつけしますか？", "おはし、おつけしますか？", "ohashi, otsuke shimasu ka?", "Shall I add chopsticks?", "polite", "Last one."),
      options: [
        O("a", "correct", "はい、お願いします", "はい、おねがいします", "hai, onegai shimasu", "Yes please", "polite", {
          phraseId: "hai_onegai", wallet: -580, keys: ["お願い", "onegai", "はい", "ください"],
          reaction: L("五百八十円になります。", "ごひゃくはちじゅうえんになります。", "gohyaku hachijuu en ni narimasu.", "That'll be 580 yen.", "polite", "Done. Next customer."),
        }),
        O("b", "correct", "大丈夫です", "だいじょうぶです", "daijoubu desu", "I'm fine (no)", "polite", {
          phraseId: "daijoubu", wallet: -580, keys: ["大丈夫", "daijoubu", "いらない"],
          reaction: L("五百八十円になります。", "ごひゃくはちじゅうえんになります。", "gohyaku hachijuu en ni narimasu.", "That'll be 580 yen.", "polite", "Done. Next customer."),
        }),
        O("c", "wrong", "ないです", "ないです", "nai desu", "I don't have any", "polite", {
          patience: -1,
          reaction: L("…はい？お箸は？", "…はい？おはしは？", "...hai? ohashi wa?", "...Sorry? Chopsticks?", "polite", "That answer doesn't fit this question."),
          senseiNote: "ないです answers 'do you have'. She asked 'shall I add'. Close, but the clerk had to re-ask. Under time pressure, お願いします / 大丈夫です cover almost every konbini question.",
        }),
        ENG("d", "Yes, chopsticks."),
      ],
    },
  ],
};

// ---------------------------------------------------------------- DAY 6
const day6: Scenario = {
  day: 6,
  location: "Estate agent",
  locationJa: "不動産屋",
  objective: "Detect the 'no' and find a way around it. Do not wait for a call that isn't coming.",
  timer_seconds: 14,
  intro: "Air conditioning, green tea, a binder of apartments. Tanaka-san smiles the whole time. That's the problem.",
  offenceLabel: "pushed an agent past politeness",
  npc: {
    npc_id: "agent_tanaka",
    name: "田中さん",
    surface: "Unfailingly polite, apologetic, helpful-sounding.",
    true_intent: "Will not rent to a foreigner without a Japanese guarantor.",
    reveal_rule: "NEVER state this directly. Deflect with ちょっと…, 難しいですね, air through teeth, changing subject to another property.",
    softens_if: ["player uses keigo correctly", "player mentions 保証会社"],
    hardens_if: ["player pushes directly", "player uses casual form"],
    patience: 5,
    register_expected: "keigo",
  },
  target_phrases: ["ちょっと…", "難しい", "保証人", "保証会社"],
  fail_conditions: ["freeze", "english", "objective"],
  coldOpen: L("…ああ。ご近所から、お話は伺っております。どういったご用件でしょうか。", "…ああ。ごきんじょから、おはなしはうかがっております。どういったごようけんでしょうか。", "...aa. gokinjo kara, ohanashi wa ukagatte orimasu. dou itta goyouken deshou ka.", "...Ah. I've heard about you from the neighbourhood. What can I do for you.", "keigo", "Your reputation arrived before you did. I already don't want to do this."),
  beats: [
    {
      id: "d6_open",
      npc: L("いらっしゃいませ。本日はどのようなお部屋をお探しでしょうか。", "いらっしゃいませ。ほんじつはどのようなおへやをおさがしでしょうか。", "irasshaimase. honjitsu wa dono you na oheya o osagashi deshou ka.", "Welcome. What kind of room are you looking for today?", "keigo", "Sizing you up. Foreigner. Let's see how this goes."),
      options: [
        O("a", "correct", "一人暮らしの部屋を探しています", "ひとりぐらしのへやをさがしています", "hitorigurashi no heya o sagashite imasu", "I'm looking for a place to live alone", "polite", { keys: ["部屋", "へや", "探し", "さがし", "一人"] }),
        O("b", "correct", "恐れ入りますが、一人用の部屋をお願いしたいのですが", "おそれいりますが、ひとりようのへやをおねがいしたいのですが", "osore irimasu ga, hitori you no heya o onegai shitai no desu ga", "I'm terribly sorry, but I'd like a room for one", "keigo", {
          phraseId: "osoreirimasu", patience: 1, keys: ["恐れ入り", "おそれいり"],
          reaction: L("まあ、丁寧に。かしこまりました。", "まあ、ていねいに。かしこまりました。", "maa, teinei ni. kashikomarimashita.", "Oh, how polite. Certainly.", "keigo", "Unexpected. Slightly disarmed."),
        }),
        O("c", "correct", "部屋探してる", "へやさがしてる", "heya sagashiteru", "Looking for a room", "casual", {
          meiwaku: 12, patience: -2, keys: [],
          reaction: L("…はあ。左様でございますか。", "…はあ。さようでございますか。", "...haa. sayou de gozaimasu ka.", "...I see. Is that so.", "keigo", "Casual form, to me, in my office. This just got much harder for you."),
          senseiNote: "Casual form with an estate agent triggered his hardens_if rule before you'd said anything else. The more formal his register, the more formal yours needs to be.",
        }),
        ENG("d", "I need an apartment."),
      ],
    },
    {
      id: "d6_guarantor",
      npc: L("こちらの物件はいかがでしょう。…あ、失礼ですが、保証人はいらっしゃいますか？", "こちらのぶっけんはいかがでしょう。…あ、しつれいですが、ほしょうにんはいらっしゃいますか？", "kochira no bukken wa ikaga deshou. ...a, shitsurei desu ga, hoshounin wa irasshaimasu ka?", "How about this property? ...Ah, excuse me, but do you have a guarantor?", "keigo", "This is the real question. Everything before it was tea."),
      options: [
        O("a", "correct", "いいえ、いません", "いいえ、いません", "iie, imasen", "No, I don't", "polite", { keys: ["いません", "いない", "imasen", "いいえ", "ない"] }),
        O("b", "wrong", "はい、友達がいます", "はい、ともだちがいます", "hai, tomodachi ga imasu", "Yes, I have a friend", "polite", {
          patience: -1,
          reaction: L("ご友人…日本の方で、正社員の方でしょうか？", "ごゆうじん…にほんのかたで、せいしゃいんのかたでしょうか？", "goyuujin... nihon no kata de, seishain no kata deshou ka?", "A friend... a Japanese national, in permanent employment?", "keigo", "A friend isn't a guarantor. I'm going to make you say it."),
          senseiNote: "保証人 (hoshounin) is a legal guarantor, not a reference. Claiming one you don't have costs credibility — and he checks.",
        }),
        O("c", "wrong", "はい、観光です", "はい、かんこうです", "hai, kankou desu", "Yes, sightseeing", "polite", {
          patience: -1,
          senseiNote: "保証人 = guarantor. You heard a question and reached for a Day 1 answer. By Day 6 the questions aren't scripted anymore.",
        }),
        ENG("d", "What's a guarantor?"),
      ],
    },
    {
      id: "d6_chotto",
      npc: L("あー…ちょっと…難しいですねえ。", "あー…ちょっと…むずかしいですねえ。", "aa... chotto... muzukashii desu nee.", "Ah... well... that's a bit difficult.", "keigo", "No. Absolutely not. And I will never say the word."),
      options: [
        O("a", "detect", "保証会社は使えますか", "ほしょうがいしゃはつかえますか", "hoshou gaisha wa tsukaemasu ka", "Can I use a guarantor company?", "polite", {
          phraseId: "hoshou_gaisha", patience: 2, keys: ["保証会社", "ほしょうがいしゃ", "hoshou gaisha", "会社"],
          reaction: L("あ、保証会社でしたら…はい、それでしたら大丈夫だと思います。", "あ、ほしょうがいしゃでしたら…はい、それでしたらだいじょうぶだとおもいます。", "a, hoshou gaisha deshitara... hai, sore deshitara daijoubu da to omoimasu.", "Ah, a guarantor company... yes, in that case I think that would be fine.", "keigo", "You heard the no and walked around it. Fine. We can work with this."),
        }),
        O("b", "detect", "他の物件はありますか", "ほかのぶっけんはありますか", "hoka no bukken wa arimasu ka", "Are there other properties?", "polite", {
          phraseId: "hoka_bukken", patience: 1, keys: ["他", "ほか", "hoka", "物件"],
          reaction: L("そうですね…保証会社対応の物件でしたら、いくつか。", "そうですね…ほしょうがいしゃたいおうのぶっけんでしたら、いくつか。", "sou desu ne... hoshou gaisha taiou no bukken deshitara, ikutsu ka.", "Let's see... if it's properties that accept guarantor companies, there are a few.", "keigo", "You read the room. Good. Now I'll tell you what I couldn't say."),
        }),
        O("c", "wrong", "何が難しいですか？本当の理由を教えてください", "なにがむずかしいですか？ほんとうのりゆうをおしえてください", "nani ga muzukashii desu ka? hontou no riyuu o oshiete kudasai", "What's difficult? Tell me the real reason", "polite", {
          patience: -2, meiwaku: 10,
          reaction: L("いえいえ、そういうわけでは…あの、こちらの物件などはいかがでしょう。", "いえいえ、そういうわけでは…あの、こちらのぶっけんなどはいかがでしょう。", "ieie, sou iu wake de wa... ano, kochira no bukken nado wa ikaga deshou.", "No no, it's not that... um, how about this property instead?", "keigo", "I will deflect this forever. You cannot make me say it."),
          senseiNote: "You pushed for the reason. He will never give it — that's his reveal_rule. ちょっと…難しい was already the whole answer. The skill isn't extracting the no; it's hearing it and pivoting.",
        }),
        O("d", "wrong", "わかりました。連絡を待ちます", "わかりました。れんらくをまちます", "wakarimashita. renraku o machimasu", "Understood. I'll wait for your call", "polite", {
          failsObjective: true, phraseId: "wakarimashita",
          reaction: L("はい、ぜひ。ご連絡いたしますので。", "はい、ぜひ。ごれんらくいたしますので。", "hai, zehi. gorenraku itashimasu node.", "Yes, absolutely. I'll be in touch.", "keigo", "I will not be in touch. You'll wait a week and the apartment will be gone."),
          senseiNote: "ご連絡します after ちょっと… is not a promise. It's the exit. You heard a 'no' as a 'maybe' and lost the apartment waiting for a phone that never rang.",
        }),
        ENG("e", "Is it because I'm a foreigner?"),
      ],
    },
    {
      id: "d6_close",
      final: true,
      npc: L("では、こちらにご記入をお願いいたします。", "では、こちらにごきにゅうをおねがいいたします。", "de wa, kochira ni gokinyuu o onegai itashimasu.", "Then, please fill this in.", "keigo", "You're getting an apartment. I'm mildly surprised."),
      options: [
        O("a", "correct", "わかりました。ありがとうございます", "わかりました。ありがとうございます", "wakarimashita. arigatou gozaimasu", "Understood. Thank you", "polite", {
          phraseId: "wakarimashita", wallet: -15000, keys: ["わかりました", "wakarimashita", "ありがとう"],
          reaction: L("こちらこそ。日本語、お上手ですね。", "こちらこそ。にほんご、おじょうずですね。", "kochira koso. nihongo, ojouzu desu ne.", "Thank you. Your Japanese is very good.", "keigo", "It isn't, particularly. But you got through me."),
        }),
        O("b", "correct", "恐れ入りますが、ゆっくり読んでもいいですか", "おそれいりますが、ゆっくりよんでもいいですか", "osore irimasu ga, yukkuri yonde mo ii desu ka", "I'm sorry, but may I read it slowly?", "keigo", {
          phraseId: "osoreirimasu", wallet: -15000, keys: ["恐れ入り", "ゆっくり"],
          reaction: L("もちろんです。どうぞごゆっくり。", "もちろんです。どうぞごゆっくり。", "mochiron desu. douzo goyukkuri.", "Of course. Take your time.", "keigo", "Correct keigo. Asking for time instead of pretending. This one will be fine here."),
        }),
        O("c", "wrong", "はい、わかった", "はい、わかった", "hai, wakatta", "Yeah, got it", "casual", {
          meiwaku: 6,
          reaction: L("…はい。では、お名前から。", "…はい。では、おなまえから。", "...hai. de wa, onamae kara.", "...Right. Name first, then.", "keigo", "Casual, right at the end. Nearly."),
          senseiNote: "You dropped to casual on the last line. He noticed. Scene still cleared, but register is a whole-conversation thing, not a first-impression thing.",
        }),
      ],
    },
  ],
};

export const SCENARIOS: Scenario[] = [day1, day2, day3, day4, day5, day6];
export const FINAL_DAY = SCENARIOS.length;

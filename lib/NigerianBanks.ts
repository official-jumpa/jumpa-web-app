/**
 * Comprehensive Nigerian Banks Registry
 *
 * Single Source of Truth for Nigerian banking entities (790+ banks) across:
 * - Central Bank of Nigeria (CBN) / NIBSS NIP Codes (6-digit)
 * - Paystack, Switch, Centiiv
 * Provides O(1) indexed lookup by code, canonical name, and aliases,
 * with deterministic stem/brand token normalization.
 */

export interface NigerianBank {
  name: string;             // Official canonical display name
  cbnCode: string;          // 6-digit NIBSS CBN code (e.g. "000013")
  paystackCode: string;     // Paystack bank code (e.g. "058", "50315")
  switchCode: string;       // Switch offramp partner bank code
  centiivCode: string;      // Centiiv Stellar cash-out bank code
  aliases: string[];        // Shorthand aliases & acronyms
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  {
    "name": "3line Card Management Limited",
    "cbnCode": "110005",
    "paystackCode": "",
    "switchCode": "110005",
    "centiivCode": "110005",
    "aliases": [
      "3line card management limited"
    ]
  },
  {
    "name": "5TT MFB",
    "cbnCode": "090832",
    "paystackCode": "",
    "switchCode": "090832",
    "centiivCode": "090832",
    "aliases": [
      "5tt mfb"
    ]
  },
  {
    "name": "78 FINANCE COMPANY LTD",
    "cbnCode": "110072",
    "paystackCode": "40195",
    "switchCode": "110072",
    "centiivCode": "110072",
    "aliases": [
      "78 finance company ltd"
    ]
  },
  {
    "name": "9jaPay MFB",
    "cbnCode": "090629",
    "paystackCode": "090629",
    "switchCode": "090629",
    "centiivCode": "090629",
    "aliases": [
      "9japay mfb",
      "amegy mfb",
      "amegy microfinance bank"
    ]
  },
  {
    "name": "9mobile 9Payment Service Bank",
    "cbnCode": "120001",
    "paystackCode": "120001",
    "switchCode": "120001",
    "centiivCode": "120001",
    "aliases": [
      "9psb",
      "9mobile psb",
      "9mobile 9payment service bank",
      "9payment service bank",
      "9 payment solutions bank"
    ]
  },
  {
    "name": "AAA FINANCE",
    "cbnCode": "050005",
    "paystackCode": "",
    "switchCode": "050005",
    "centiivCode": "050005",
    "aliases": [
      "aaa finance"
    ]
  },
  {
    "name": "AB Microfinance Bank",
    "cbnCode": "090270",
    "paystackCode": "51204",
    "switchCode": "090270",
    "centiivCode": "090270",
    "aliases": [
      "ab mfb",
      "ab microfinance",
      "ab microfinance bank",
      "above only mfb"
    ]
  },
  {
    "name": "ABBEY MORTGAGE BANK",
    "cbnCode": "070010",
    "paystackCode": "404",
    "switchCode": "070010",
    "centiivCode": "070010",
    "aliases": [
      "abbey mortgage bank"
    ]
  },
  {
    "name": "ABOVE ONLY MICROFINANCE BANK",
    "cbnCode": "090260",
    "paystackCode": "",
    "switchCode": "090260",
    "centiivCode": "090260",
    "aliases": [
      "above only microfinance bank"
    ]
  },
  {
    "name": "ABSU MFB",
    "cbnCode": "090640",
    "paystackCode": "",
    "switchCode": "090640",
    "centiivCode": "090640",
    "aliases": [
      "absu mfb"
    ]
  },
  {
    "name": "ABU MICROFINANCE BANK",
    "cbnCode": "090197",
    "paystackCode": "",
    "switchCode": "090197",
    "centiivCode": "090197",
    "aliases": [
      "abu microfinance bank"
    ]
  },
  {
    "name": "ABUCOOP MICROFINANCE BANK",
    "cbnCode": "090424",
    "paystackCode": "",
    "switchCode": "090424",
    "centiivCode": "090424",
    "aliases": [
      "abucoop microfinance bank"
    ]
  },
  {
    "name": "Abulesoro Microfinance Bank Ltd",
    "cbnCode": "090545",
    "paystackCode": "",
    "switchCode": "090545",
    "centiivCode": "090545",
    "aliases": [
      "abulesoro microfinance bank ltd",
      "abulesoro microfinance bank"
    ]
  },
  {
    "name": "ACCELEREX NETWORK LIMITED",
    "cbnCode": "090202",
    "paystackCode": "",
    "switchCode": "090202",
    "centiivCode": "090202",
    "aliases": [
      "accelerex network limited"
    ]
  },
  {
    "name": "Access Bank",
    "cbnCode": "000014",
    "paystackCode": "044",
    "switchCode": "000014",
    "centiivCode": "000014",
    "aliases": [
      "access",
      "access bank",
      "access bank plc",
      "diamond",
      "diamond bank",
      "access bank (diamond)"
    ]
  },
  {
    "name": "ACCESS MONEY",
    "cbnCode": "100013",
    "paystackCode": "",
    "switchCode": "100013",
    "centiivCode": "100013",
    "aliases": [
      "access money",
      "accessmobile"
    ]
  },
  {
    "name": "ACCESS YELLO & BETA",
    "cbnCode": "100052",
    "paystackCode": "",
    "switchCode": "100052",
    "centiivCode": "100052",
    "aliases": [
      "access yello & beta",
      "access yello"
    ]
  },
  {
    "name": "Accion Microfinance Bank",
    "cbnCode": "090134",
    "paystackCode": "602",
    "switchCode": "090134",
    "centiivCode": "090134",
    "aliases": [
      "accion",
      "accion mfb",
      "accion microfinance bank"
    ]
  },
  {
    "name": "Ada Microfinance Bank",
    "cbnCode": "090483",
    "paystackCode": "",
    "switchCode": "090483",
    "centiivCode": "090483",
    "aliases": [
      "ada microfinance bank"
    ]
  },
  {
    "name": "Adamawa Mortgage Bank",
    "cbnCode": "070030",
    "paystackCode": "",
    "switchCode": "070030",
    "centiivCode": "070030",
    "aliases": [
      "adamawa mortgage bank",
      "adamawa mortgage bank"
    ]
  },
  {
    "name": "ADDOSSER MICROFINANCE BANK",
    "cbnCode": "090160",
    "paystackCode": "",
    "switchCode": "090160",
    "centiivCode": "090160",
    "aliases": [
      "addosser microfinance bank"
    ]
  },
  {
    "name": "ADEYEMI COLLEGE STAFF MICROFINANCE BANK",
    "cbnCode": "090268",
    "paystackCode": "",
    "switchCode": "090268",
    "centiivCode": "090268",
    "aliases": [
      "adeyemi college staff microfinance bank"
    ]
  },
  {
    "name": "ADVANCLY MFB",
    "cbnCode": "090759",
    "paystackCode": "",
    "switchCode": "090759",
    "centiivCode": "090759",
    "aliases": [
      "advancly mfb"
    ]
  },
  {
    "name": "ADVANS LA FAYETTE MICROFINANCE BANK",
    "cbnCode": "090155",
    "paystackCode": "",
    "switchCode": "090155",
    "centiivCode": "090155",
    "aliases": [
      "advans la fayette microfinance bank"
    ]
  },
  {
    "name": "Aella MFB",
    "cbnCode": "090614",
    "paystackCode": "50315",
    "switchCode": "090614",
    "centiivCode": "090614",
    "aliases": [
      "aella",
      "aella mfb",
      "aella bank",
      "aella microfinance bank",
      "aella microfinance",
      "flourish mfb"
    ]
  },
  {
    "name": "AFEKHAFE MICROFINANCE BANK",
    "cbnCode": "090292",
    "paystackCode": "",
    "switchCode": "090292",
    "centiivCode": "090292",
    "aliases": [
      "afekhafe microfinance bank"
    ]
  },
  {
    "name": "Afemai Microfinance Bank",
    "cbnCode": "090518",
    "paystackCode": "",
    "switchCode": "090518",
    "centiivCode": "090518",
    "aliases": [
      "afemai microfinance bank"
    ]
  },
  {
    "name": "AG MORTGAGE BANK",
    "cbnCode": "100028",
    "paystackCode": "90077",
    "switchCode": "100028",
    "centiivCode": "100028",
    "aliases": [
      "ag mortgage bank"
    ]
  },
  {
    "name": "AGOSASA MICROFINANCE BANK",
    "cbnCode": "090371",
    "paystackCode": "",
    "switchCode": "090371",
    "centiivCode": "090371",
    "aliases": [
      "agosasa microfinance bank"
    ]
  },
  {
    "name": "Ahmadu Bello University Microfinance Bank",
    "cbnCode": "50036",
    "paystackCode": "50036",
    "switchCode": "50036",
    "centiivCode": "50036",
    "aliases": [
      "ahmadu bello university microfinance bank"
    ]
  },
  {
    "name": "Airtel Smartcash PSB",
    "cbnCode": "120004",
    "paystackCode": "120004",
    "switchCode": "120004",
    "centiivCode": "120004",
    "aliases": [
      "smartcash",
      "smartcash psb",
      "airtel smartcash",
      "airtel smartcash psb",
      "smartcash payment service bank"
    ]
  },
  {
    "name": "AKALABO MICROFINANCE BANK",
    "cbnCode": "090698",
    "paystackCode": "",
    "switchCode": "090698",
    "centiivCode": "090698",
    "aliases": [
      "akalabo microfinance bank",
      "akalabo mfb"
    ]
  },
  {
    "name": "Akpo Microfinance Bank",
    "cbnCode": "090608",
    "paystackCode": "",
    "switchCode": "090608",
    "centiivCode": "090608",
    "aliases": [
      "akpo microfinance bank"
    ]
  },
  {
    "name": "AKSU MFB",
    "cbnCode": "090756",
    "paystackCode": "",
    "switchCode": "090756",
    "centiivCode": "090756",
    "aliases": [
      "aksu mfb"
    ]
  },
  {
    "name": "Aku Microfinance Bank",
    "cbnCode": "090531",
    "paystackCode": "51336",
    "switchCode": "090531",
    "centiivCode": "090531",
    "aliases": [
      "aku microfinance bank"
    ]
  },
  {
    "name": "Akuchukwu Microfinance Bank Ltd",
    "cbnCode": "090561",
    "paystackCode": "090561",
    "switchCode": "090561",
    "centiivCode": "090561",
    "aliases": [
      "akuchukwu microfinance bank ltd",
      "akuchuckwu microfinance bank",
      "akuchukwu microfinance bank limited"
    ]
  },
  {
    "name": "AL-BARAKAH MICROFINANCE BANK",
    "cbnCode": "090133",
    "paystackCode": "50055",
    "switchCode": "090133",
    "centiivCode": "090133",
    "aliases": [
      "al-barakah microfinance bank"
    ]
  },
  {
    "name": "AL-HAYAT MICROFINANCE BANK",
    "cbnCode": "090277",
    "paystackCode": "",
    "switchCode": "090277",
    "centiivCode": "090277",
    "aliases": [
      "al-hayat microfinance bank"
    ]
  },
  {
    "name": "ALEKUN MICROFINANCE BANK",
    "cbnCode": "090259",
    "paystackCode": "",
    "switchCode": "090259",
    "centiivCode": "090259",
    "aliases": [
      "alekun microfinance bank"
    ]
  },
  {
    "name": "ALERT MICROFINANCE BANK",
    "cbnCode": "090297",
    "paystackCode": "",
    "switchCode": "090297",
    "centiivCode": "090297",
    "aliases": [
      "alert microfinance bank"
    ]
  },
  {
    "name": "ALLWORKERS MICROFINANCE BANK",
    "cbnCode": "090131",
    "paystackCode": "",
    "switchCode": "090131",
    "centiivCode": "090131",
    "aliases": [
      "allworkers microfinance bank"
    ]
  },
  {
    "name": "Ally Microfinance Bank",
    "cbnCode": "090548",
    "paystackCode": "",
    "switchCode": "090548",
    "centiivCode": "090548",
    "aliases": [
      "ally microfinance bank"
    ]
  },
  {
    "name": "ALPHA KAPITAL MICROFINANCE BANK",
    "cbnCode": "090169",
    "paystackCode": "",
    "switchCode": "090169",
    "centiivCode": "090169",
    "aliases": [
      "alpha kapital microfinance bank"
    ]
  },
  {
    "name": "Alpha Morgan Bank",
    "cbnCode": "000041",
    "paystackCode": "108",
    "switchCode": "000041",
    "centiivCode": "000041",
    "aliases": [
      "alpha morgan bank"
    ]
  },
  {
    "name": "ALTERNATIVE BANK LIMITED",
    "cbnCode": "000037",
    "paystackCode": "",
    "switchCode": "000037",
    "centiivCode": "000037",
    "aliases": [
      "alternative bank limited"
    ]
  },
  {
    "name": "Alvana Microfinance Bank",
    "cbnCode": "090489",
    "paystackCode": "",
    "switchCode": "090489",
    "centiivCode": "090489",
    "aliases": [
      "alvana microfinance bank"
    ]
  },
  {
    "name": "AMAC MICROFINANCE BANK",
    "cbnCode": "090394",
    "paystackCode": "",
    "switchCode": "090394",
    "centiivCode": "090394",
    "aliases": [
      "amac microfinance bank"
    ]
  },
  {
    "name": "Amju Unique MFB",
    "cbnCode": "090180",
    "paystackCode": "50926",
    "switchCode": "090180",
    "centiivCode": "090180",
    "aliases": [
      "amju",
      "amju unique",
      "amju unique mfb",
      "amju unique microfinance bank"
    ]
  },
  {
    "name": "AMML MICROFINANCE BANK",
    "cbnCode": "090116",
    "paystackCode": "",
    "switchCode": "090116",
    "centiivCode": "090116",
    "aliases": [
      "amml microfinance bank",
      "amml mfb"
    ]
  },
  {
    "name": "AMOYE MICROFINANCE BANK",
    "cbnCode": "090610",
    "paystackCode": "",
    "switchCode": "090610",
    "centiivCode": "090610",
    "aliases": [
      "amoye microfinance bank"
    ]
  },
  {
    "name": "AMPLE MFB",
    "cbnCode": "090770",
    "paystackCode": "",
    "switchCode": "090770",
    "centiivCode": "090770",
    "aliases": [
      "ample mfb"
    ]
  },
  {
    "name": "AMPLE MFB",
    "cbnCode": "110081",
    "paystackCode": "",
    "switchCode": "110081",
    "centiivCode": "110081",
    "aliases": [
      "ample mfb"
    ]
  },
  {
    "name": "Anchorage Microfinance Bank",
    "cbnCode": "090476",
    "paystackCode": "",
    "switchCode": "090476",
    "centiivCode": "090476",
    "aliases": [
      "anchorage microfinance bank"
    ]
  },
  {
    "name": "Aniocha Microfinance Bank",
    "cbnCode": "090469",
    "paystackCode": "",
    "switchCode": "090469",
    "centiivCode": "090469",
    "aliases": [
      "aniocha microfinance bank"
    ]
  },
  {
    "name": "ANIOMA MFB",
    "cbnCode": "090751",
    "paystackCode": "",
    "switchCode": "090751",
    "centiivCode": "090751",
    "aliases": [
      "anioma mfb"
    ]
  },
  {
    "name": "APEKS MICROFINANCE BANK",
    "cbnCode": "090143",
    "paystackCode": "",
    "switchCode": "090143",
    "centiivCode": "090143",
    "aliases": [
      "apeks microfinance bank"
    ]
  },
  {
    "name": "APEX TRUST MFB",
    "cbnCode": "090737",
    "paystackCode": "",
    "switchCode": "090737",
    "centiivCode": "090737",
    "aliases": [
      "apex trust mfb"
    ]
  },
  {
    "name": "APPLE MICROFINANCE BANK",
    "cbnCode": "090376",
    "paystackCode": "",
    "switchCode": "090376",
    "centiivCode": "090376",
    "aliases": [
      "apple microfinance bank"
    ]
  },
  {
    "name": "ARAMOKO MICROFINANCE BANK",
    "cbnCode": "090307",
    "paystackCode": "",
    "switchCode": "090307",
    "centiivCode": "090307",
    "aliases": [
      "aramoko microfinance bank"
    ]
  },
  {
    "name": "ARISE MICROFINANCE BANK",
    "cbnCode": "090282",
    "paystackCode": "",
    "switchCode": "090282",
    "centiivCode": "090282",
    "aliases": [
      "arise microfinance bank"
    ]
  },
  {
    "name": "ARM MFB",
    "cbnCode": "090816",
    "paystackCode": "",
    "switchCode": "090816",
    "centiivCode": "090816",
    "aliases": [
      "arm mfb",
      "arm microfinance bank (arm mfb)"
    ]
  },
  {
    "name": "ASCENSIA FINANCE COMPANY LIMITED",
    "cbnCode": "050040",
    "paystackCode": "",
    "switchCode": "050040",
    "centiivCode": "050040",
    "aliases": [
      "ascensia finance company limited"
    ]
  },
  {
    "name": "ASO SAVINGS",
    "cbnCode": "090001",
    "paystackCode": "",
    "switchCode": "090001",
    "centiivCode": "090001",
    "aliases": [
      "aso savings",
      "asosavings & loans"
    ]
  },
  {
    "name": "Aspire Microfinance Bank Ltd",
    "cbnCode": "090544",
    "paystackCode": "",
    "switchCode": "090544",
    "centiivCode": "090544",
    "aliases": [
      "aspire microfinance bank ltd",
      "aspire microfinance bank"
    ]
  },
  {
    "name": "ASPIRE MORTGAGE BANK",
    "cbnCode": "070033",
    "paystackCode": "",
    "switchCode": "070033",
    "centiivCode": "070033",
    "aliases": [
      "aspire mortgage bank",
      "aspire mortgage bank limited"
    ]
  },
  {
    "name": "ASSETMATRIX MICROFINANCE BANK",
    "cbnCode": "090287",
    "paystackCode": "",
    "switchCode": "090287",
    "centiivCode": "090287",
    "aliases": [
      "assetmatrix microfinance bank"
    ]
  },
  {
    "name": "Assets Microfinance Bank",
    "cbnCode": "090473",
    "paystackCode": "50092",
    "switchCode": "090473",
    "centiivCode": "090473",
    "aliases": [
      "assets microfinance bank"
    ]
  },
  {
    "name": "ASTRAPOLARIS MICROFINANCE BANK",
    "cbnCode": "090172",
    "paystackCode": "",
    "switchCode": "090172",
    "centiivCode": "090172",
    "aliases": [
      "astrapolaris microfinance bank"
    ]
  },
  {
    "name": "ATBU Microfinance Bank",
    "cbnCode": "090451",
    "paystackCode": "",
    "switchCode": "090451",
    "centiivCode": "090451",
    "aliases": [
      "atbu microfinance bank"
    ]
  },
  {
    "name": "AUCHI MICROFINANCE BANK",
    "cbnCode": "090264",
    "paystackCode": "",
    "switchCode": "090264",
    "centiivCode": "090264",
    "aliases": [
      "auchi microfinance bank"
    ]
  },
  {
    "name": "Auchi Poly MFB",
    "cbnCode": "090817",
    "paystackCode": "",
    "switchCode": "090817",
    "centiivCode": "090817",
    "aliases": [
      "auchi poly mfb"
    ]
  },
  {
    "name": "AVE MARIA MICROFINANCE BANK LTD",
    "cbnCode": "090600",
    "paystackCode": "",
    "switchCode": "090600",
    "centiivCode": "090600",
    "aliases": [
      "ave maria microfinance bank ltd",
      "ave maria microfinance bank"
    ]
  },
  {
    "name": "Avuenegbe Microfinance Bank",
    "cbnCode": "090478",
    "paystackCode": "090478",
    "switchCode": "090478",
    "centiivCode": "090478",
    "aliases": [
      "avuenegbe microfinance bank",
      "avuenegbe mfb"
    ]
  },
  {
    "name": "AVVIC MFB",
    "cbnCode": "090853",
    "paystackCode": "",
    "switchCode": "090853",
    "centiivCode": "090853",
    "aliases": [
      "avvic mfb"
    ]
  },
  {
    "name": "Awacash MFB",
    "cbnCode": "090633",
    "paystackCode": "",
    "switchCode": "090633",
    "centiivCode": "090633",
    "aliases": [
      "awacash mfb"
    ]
  },
  {
    "name": "AWESOME MICROFINACE BANK",
    "cbnCode": "090662",
    "paystackCode": "",
    "switchCode": "090662",
    "centiivCode": "090662",
    "aliases": [
      "awesome microfinace bank"
    ]
  },
  {
    "name": "Aztec Microfinance Bank",
    "cbnCode": "090540",
    "paystackCode": "",
    "switchCode": "090540",
    "centiivCode": "090540",
    "aliases": [
      "aztec microfinance bank"
    ]
  },
  {
    "name": "Babura MFB",
    "cbnCode": "090625",
    "paystackCode": "",
    "switchCode": "090625",
    "centiivCode": "090625",
    "aliases": [
      "babura mfb"
    ]
  },
  {
    "name": "BAIGE MFB",
    "cbnCode": "090862",
    "paystackCode": "",
    "switchCode": "090862",
    "centiivCode": "090862",
    "aliases": [
      "baige mfb"
    ]
  },
  {
    "name": "BAINES CREDIT MICROFINANCE BANK",
    "cbnCode": "090188",
    "paystackCode": "",
    "switchCode": "090188",
    "centiivCode": "090188",
    "aliases": [
      "baines credit microfinance bank"
    ]
  },
  {
    "name": "Balera Microfinance Bank Ltd",
    "cbnCode": "090563",
    "paystackCode": "",
    "switchCode": "090563",
    "centiivCode": "090563",
    "aliases": [
      "balera microfinance bank ltd",
      "balera microfinance bank"
    ]
  },
  {
    "name": "BALOGUN FULANI MICROFINANCE BANK",
    "cbnCode": "090181",
    "paystackCode": "",
    "switchCode": "090181",
    "centiivCode": "090181",
    "aliases": [
      "balogun fulani microfinance bank"
    ]
  },
  {
    "name": "BALOGUN GAMBARI MICROFINANCE BANK",
    "cbnCode": "090326",
    "paystackCode": "",
    "switchCode": "090326",
    "centiivCode": "090326",
    "aliases": [
      "balogun gambari microfinance bank"
    ]
  },
  {
    "name": "BAM MICROFINANCE BANK",
    "cbnCode": "090651",
    "paystackCode": "",
    "switchCode": "090651",
    "centiivCode": "090651",
    "aliases": [
      "bam microfinance bank"
    ]
  },
  {
    "name": "BANC CORP MICROFINANCE BANK",
    "cbnCode": "090581",
    "paystackCode": "50117",
    "switchCode": "090581",
    "centiivCode": "090581",
    "aliases": [
      "banc corp microfinance bank",
      "banc corp mfb"
    ]
  },
  {
    "name": "BANEX MICROFINANCE BANK",
    "cbnCode": "090425",
    "paystackCode": "",
    "switchCode": "090425",
    "centiivCode": "090425",
    "aliases": [
      "banex microfinance bank"
    ]
  },
  {
    "name": "Bank of Agriculture",
    "cbnCode": "090367",
    "paystackCode": "",
    "switchCode": "090367",
    "centiivCode": "090367",
    "aliases": [
      "bank of agriculture"
    ]
  },
  {
    "name": "BANK78 MFB",
    "cbnCode": "090866",
    "paystackCode": "",
    "switchCode": "090866",
    "centiivCode": "090866",
    "aliases": [
      "bank78 mfb"
    ]
  },
  {
    "name": "BANKEASY MFB",
    "cbnCode": "090789",
    "paystackCode": "",
    "switchCode": "090789",
    "centiivCode": "090789",
    "aliases": [
      "bankeasy mfb"
    ]
  },
  {
    "name": "BANKIT MFB",
    "cbnCode": "090275",
    "paystackCode": "",
    "switchCode": "090275",
    "centiivCode": "090275",
    "aliases": [
      "bankit mfb"
    ]
  },
  {
    "name": "Bankly Microfinance Bank",
    "cbnCode": "090529",
    "paystackCode": "",
    "switchCode": "090529",
    "centiivCode": "090529",
    "aliases": [
      "bankly microfinance bank",
      "ampersand microfinance bank"
    ]
  },
  {
    "name": "BAOBAB MICROFINANCE BANK",
    "cbnCode": "090136",
    "paystackCode": "MFB50992",
    "switchCode": "090136",
    "centiivCode": "090136",
    "aliases": [
      "baobab microfinance bank",
      "microcred microfinance bank"
    ]
  },
  {
    "name": "BARNAWA MFB",
    "cbnCode": "090783",
    "paystackCode": "",
    "switchCode": "090783",
    "centiivCode": "090783",
    "aliases": [
      "barnawa mfb",
      "union mfb"
    ]
  },
  {
    "name": "BAYERO UNIVERSITY MICROFINANCE BANK",
    "cbnCode": "090316",
    "paystackCode": "",
    "switchCode": "090316",
    "centiivCode": "090316",
    "aliases": [
      "bayero university microfinance bank"
    ]
  },
  {
    "name": "BC KASH MICROFINANCE BANK",
    "cbnCode": "090127",
    "paystackCode": "",
    "switchCode": "090127",
    "centiivCode": "090127",
    "aliases": [
      "bc kash microfinance bank"
    ]
  },
  {
    "name": "BELLABANK MICROFINANCE BANK",
    "cbnCode": "090672",
    "paystackCode": "",
    "switchCode": "090672",
    "centiivCode": "090672",
    "aliases": [
      "bellabank microfinance bank"
    ]
  },
  {
    "name": "BellBank Microfinance Bank",
    "cbnCode": "51100",
    "paystackCode": "51100",
    "switchCode": "51100",
    "centiivCode": "51100",
    "aliases": [
      "bellbank microfinance bank"
    ]
  },
  {
    "name": "BENYSTA MICROFINANCE BANK",
    "cbnCode": "090413",
    "paystackCode": "",
    "switchCode": "090413",
    "centiivCode": "090413",
    "aliases": [
      "benysta microfinance bank"
    ]
  },
  {
    "name": "Berachah MFB",
    "cbnCode": "090618",
    "paystackCode": "",
    "switchCode": "090618",
    "centiivCode": "090618",
    "aliases": [
      "berachah mfb"
    ]
  },
  {
    "name": "Beststar Microfinance Bank",
    "cbnCode": "090615",
    "paystackCode": "50123",
    "switchCode": "090615",
    "centiivCode": "090615",
    "aliases": [
      "beststar microfinance bank",
      "beststar mfb"
    ]
  },
  {
    "name": "BETHEL MICROFINANCE BANK",
    "cbnCode": "090683",
    "paystackCode": "",
    "switchCode": "090683",
    "centiivCode": "090683",
    "aliases": [
      "bethel microfinance bank"
    ]
  },
  {
    "name": "BIPC MICROFINANCE BANK",
    "cbnCode": "090336",
    "paystackCode": "",
    "switchCode": "090336",
    "centiivCode": "090336",
    "aliases": [
      "bipc microfinance bank"
    ]
  },
  {
    "name": "Bishopgate Microfinance Bank",
    "cbnCode": "090555",
    "paystackCode": "",
    "switchCode": "090555",
    "centiivCode": "090555",
    "aliases": [
      "bishopgate microfinance bank"
    ]
  },
  {
    "name": "BKD NEW MFB",
    "cbnCode": "090722",
    "paystackCode": "",
    "switchCode": "090722",
    "centiivCode": "090722",
    "aliases": [
      "bkd new mfb"
    ]
  },
  {
    "name": "BLOC MFB",
    "cbnCode": "090977",
    "paystackCode": "51411",
    "switchCode": "090977",
    "centiivCode": "090977",
    "aliases": [
      "bloc",
      "bloc bank",
      "bloc mfb",
      "bloc microfinance",
      "bloc microfinance bank"
    ]
  },
  {
    "name": "BLOOMS MFB",
    "cbnCode": "090743",
    "paystackCode": "",
    "switchCode": "090743",
    "centiivCode": "090743",
    "aliases": [
      "blooms mfb"
    ]
  },
  {
    "name": "Blue Investments Microfinance Bank",
    "cbnCode": "090538",
    "paystackCode": "",
    "switchCode": "090538",
    "centiivCode": "090538",
    "aliases": [
      "blue investments microfinance bank",
      "blueprint investments microfinance bank"
    ]
  },
  {
    "name": "BLUEWHALES MICROFINANCE BANK",
    "cbnCode": "090431",
    "paystackCode": "",
    "switchCode": "090431",
    "centiivCode": "090431",
    "aliases": [
      "bluewhales microfinance bank"
    ]
  },
  {
    "name": "BOCTRUST MICROFINANCE BANK LIMITED",
    "cbnCode": "090117",
    "paystackCode": "",
    "switchCode": "090117",
    "centiivCode": "090117",
    "aliases": [
      "boctrust microfinance bank limited",
      "boctrust microfinance bank"
    ]
  },
  {
    "name": "BOI MF BANK",
    "cbnCode": "090444",
    "paystackCode": "",
    "switchCode": "090444",
    "centiivCode": "090444",
    "aliases": [
      "boi mf bank",
      "boi microfinance bank"
    ]
  },
  {
    "name": "Boji Boji Microfinance Bank",
    "cbnCode": "090494",
    "paystackCode": "",
    "switchCode": "090494",
    "centiivCode": "090494",
    "aliases": [
      "boji boji microfinance bank",
      "boji mfb"
    ]
  },
  {
    "name": "Bokkos MFB",
    "cbnCode": "090703",
    "paystackCode": "",
    "switchCode": "090703",
    "centiivCode": "090703",
    "aliases": [
      "bokkos mfb"
    ]
  },
  {
    "name": "BOLD MFB",
    "cbnCode": "090753",
    "paystackCode": "50725",
    "switchCode": "090753",
    "centiivCode": "090753",
    "aliases": [
      "bold mfb"
    ]
  },
  {
    "name": "BONGHE MICROFINANCE BANK",
    "cbnCode": "090319",
    "paystackCode": "",
    "switchCode": "090319",
    "centiivCode": "090319",
    "aliases": [
      "bonghe microfinance bank"
    ]
  },
  {
    "name": "Boost MFB",
    "cbnCode": "090819",
    "paystackCode": "",
    "switchCode": "090819",
    "centiivCode": "090819",
    "aliases": [
      "boost mfb"
    ]
  },
  {
    "name": "BORGU MFB",
    "cbnCode": "090395",
    "paystackCode": "",
    "switchCode": "090395",
    "centiivCode": "090395",
    "aliases": [
      "borgu mfb",
      "borgu microfinance bank"
    ]
  },
  {
    "name": "Borno Renaissance MFB",
    "cbnCode": "9",
    "paystackCode": "",
    "switchCode": "9",
    "centiivCode": "9",
    "aliases": [
      "borno renaissance mfb"
    ]
  },
  {
    "name": "Borno Renaissance Microfinance Bank",
    "cbnCode": "090508",
    "paystackCode": "",
    "switchCode": "090508",
    "centiivCode": "090508",
    "aliases": [
      "borno renaissance microfinance bank"
    ]
  },
  {
    "name": "Boromu Microfinance Bank",
    "cbnCode": "090501",
    "paystackCode": "",
    "switchCode": "090501",
    "centiivCode": "090501",
    "aliases": [
      "boromu microfinance bank"
    ]
  },
  {
    "name": "Borstal Microfinance Bank",
    "cbnCode": "090454",
    "paystackCode": "",
    "switchCode": "090454",
    "centiivCode": "090454",
    "aliases": [
      "borstal microfinance bank",
      "borstal mfb"
    ]
  },
  {
    "name": "BOSAK MICROFINANCE BANK",
    "cbnCode": "090176",
    "paystackCode": "650",
    "switchCode": "090176",
    "centiivCode": "090176",
    "aliases": [
      "bosak microfinance bank"
    ]
  },
  {
    "name": "Bowen Microfinance Bank",
    "cbnCode": "090148",
    "paystackCode": "50931",
    "switchCode": "090148",
    "centiivCode": "090148",
    "aliases": [
      "bowen",
      "bowen mfb",
      "bowen microfinance bank"
    ]
  },
  {
    "name": "Bowman MFB",
    "cbnCode": "090804",
    "paystackCode": "",
    "switchCode": "090804",
    "centiivCode": "090804",
    "aliases": [
      "bowman mfb"
    ]
  },
  {
    "name": "Branch International Finance Company Limited",
    "cbnCode": "050006",
    "paystackCode": "FC40163",
    "switchCode": "050006",
    "centiivCode": "050006",
    "aliases": [
      "branch international finance company limited",
      "branch international financial services"
    ]
  },
  {
    "name": "BRENT MORTGAGE BANK",
    "cbnCode": "070015",
    "paystackCode": "90070",
    "switchCode": "070015",
    "centiivCode": "070015",
    "aliases": [
      "brent mortgage bank"
    ]
  },
  {
    "name": "BRETHREN MICROFINANCE BANK",
    "cbnCode": "090293",
    "paystackCode": "",
    "switchCode": "090293",
    "centiivCode": "090293",
    "aliases": [
      "brethren microfinance bank"
    ]
  },
  {
    "name": "BRIDGEWAY MICROFINANACE BANK",
    "cbnCode": "090393",
    "paystackCode": "",
    "switchCode": "090393",
    "centiivCode": "090393",
    "aliases": [
      "bridgeway microfinanace bank",
      "bridgeway microfinance bank"
    ]
  },
  {
    "name": "BRIGHTWAY MICROFINANCE BANK",
    "cbnCode": "090308",
    "paystackCode": "",
    "switchCode": "090308",
    "centiivCode": "090308",
    "aliases": [
      "brightway microfinance bank"
    ]
  },
  {
    "name": "Briyth-Covenant MFB",
    "cbnCode": "090636",
    "paystackCode": "",
    "switchCode": "090636",
    "centiivCode": "090636",
    "aliases": [
      "briyth-covenant mfb"
    ]
  },
  {
    "name": "Broadview Microfinance Bank Ltd",
    "cbnCode": "090568",
    "paystackCode": "",
    "switchCode": "090568",
    "centiivCode": "090568",
    "aliases": [
      "broadview microfinance bank ltd",
      "broadview microfinance bank"
    ]
  },
  {
    "name": "Bubayero Microfinance Bank",
    "cbnCode": "090512",
    "paystackCode": "",
    "switchCode": "090512",
    "centiivCode": "090512",
    "aliases": [
      "bubayero microfinance bank"
    ]
  },
  {
    "name": "BUILD MFB",
    "cbnCode": "0906135",
    "paystackCode": "",
    "switchCode": "0906135",
    "centiivCode": "0906135",
    "aliases": [
      "build mfb"
    ]
  },
  {
    "name": "Build Microfinance Bank",
    "cbnCode": "090613",
    "paystackCode": "",
    "switchCode": "090613",
    "centiivCode": "090613",
    "aliases": [
      "build microfinance bank",
      "total trust mfb"
    ]
  },
  {
    "name": "BUNDI MICROFINANCE",
    "cbnCode": "090661",
    "paystackCode": "",
    "switchCode": "090661",
    "centiivCode": "090661",
    "aliases": [
      "bundi microfinance"
    ]
  },
  {
    "name": "Bunkure MFB",
    "cbnCode": "090655",
    "paystackCode": "",
    "switchCode": "090655",
    "centiivCode": "090655",
    "aliases": [
      "bunkure mfb"
    ]
  },
  {
    "name": "BUSINESS SUPPORT MICROFINANCE BANK",
    "cbnCode": "090406",
    "paystackCode": "",
    "switchCode": "090406",
    "centiivCode": "090406",
    "aliases": [
      "business support microfinance bank"
    ]
  },
  {
    "name": "BUYPOWER MICROFINANCE BANK",
    "cbnCode": "090682",
    "paystackCode": "",
    "switchCode": "090682",
    "centiivCode": "090682",
    "aliases": [
      "buypower microfinance bank"
    ]
  },
  {
    "name": "CALABAR MICROFINANCE BANK",
    "cbnCode": "090415",
    "paystackCode": "",
    "switchCode": "090415",
    "centiivCode": "090415",
    "aliases": [
      "calabar microfinance bank",
      "calabar mfb"
    ]
  },
  {
    "name": "Canaan MFB",
    "cbnCode": "090647",
    "paystackCode": "",
    "switchCode": "090647",
    "centiivCode": "090647",
    "aliases": [
      "canaan mfb"
    ]
  },
  {
    "name": "Capitalmetriq Swift Microfinance Bank",
    "cbnCode": "090509",
    "paystackCode": "",
    "switchCode": "090509",
    "centiivCode": "090509",
    "aliases": [
      "capitalmetriq swift microfinance bank"
    ]
  },
  {
    "name": "Capricorn Digital",
    "cbnCode": "110023",
    "paystackCode": "",
    "switchCode": "110023",
    "centiivCode": "110023",
    "aliases": [
      "capricorn digital"
    ]
  },
  {
    "name": "CAPSTONE MF BANK",
    "cbnCode": "090445",
    "paystackCode": "",
    "switchCode": "090445",
    "centiivCode": "090445",
    "aliases": [
      "capstone mf bank",
      "capstone microfinance bank",
      "capstobe mfb"
    ]
  },
  {
    "name": "CARBON",
    "cbnCode": "100026",
    "paystackCode": "565",
    "switchCode": "100026",
    "centiivCode": "100026",
    "aliases": [
      "carbon",
      "one finance"
    ]
  },
  {
    "name": "Caretaker Microfinance Bank",
    "cbnCode": "090472",
    "paystackCode": "",
    "switchCode": "090472",
    "centiivCode": "090472",
    "aliases": [
      "caretaker microfinance bank"
    ]
  },
  {
    "name": "Casa Microfinance Bank",
    "cbnCode": "090840",
    "paystackCode": "",
    "switchCode": "090840",
    "centiivCode": "090840",
    "aliases": [
      "casa microfinance bank"
    ]
  },
  {
    "name": "Cashbridge MFB",
    "cbnCode": "090634",
    "paystackCode": "",
    "switchCode": "090634",
    "centiivCode": "090634",
    "aliases": [
      "cashbridge mfb"
    ]
  },
  {
    "name": "CASHCONNECT MICROFINANCE BANK",
    "cbnCode": "090360",
    "paystackCode": "",
    "switchCode": "090360",
    "centiivCode": "090360",
    "aliases": [
      "cashconnect microfinance bank"
    ]
  },
  {
    "name": "CASHRITE MICROFINANCE BANK",
    "cbnCode": "090649",
    "paystackCode": "",
    "switchCode": "090649",
    "centiivCode": "090649",
    "aliases": [
      "cashrite microfinance bank",
      "cashrite mfb"
    ]
  },
  {
    "name": "Catland Microfinance Bank",
    "cbnCode": "090498",
    "paystackCode": "",
    "switchCode": "090498",
    "centiivCode": "090498",
    "aliases": [
      "catland microfinance bank",
      "catland mfb"
    ]
  },
  {
    "name": "CBN",
    "cbnCode": "000028",
    "paystackCode": "",
    "switchCode": "000028",
    "centiivCode": "000028",
    "aliases": [
      "cbn",
      "central bank of nigeria"
    ]
  },
  {
    "name": "CBN TSA",
    "cbnCode": "999001",
    "paystackCode": "",
    "switchCode": "999001",
    "centiivCode": "999001",
    "aliases": [
      "cbn tsa"
    ]
  },
  {
    "name": "Cedar Microfinance Bank Ltd",
    "cbnCode": "090562",
    "paystackCode": "",
    "switchCode": "090562",
    "centiivCode": "090562",
    "aliases": [
      "cedar microfinance bank ltd",
      "cedar microfinance bank"
    ]
  },
  {
    "name": "CEDRUS MFB",
    "cbnCode": "090851",
    "paystackCode": "",
    "switchCode": "090851",
    "centiivCode": "090851",
    "aliases": [
      "cedrus mfb"
    ]
  },
  {
    "name": "CELLULANT",
    "cbnCode": "100005",
    "paystackCode": "",
    "switchCode": "100005",
    "centiivCode": "100005",
    "aliases": [
      "cellulant"
    ]
  },
  {
    "name": "CEMCS MICROFINANCE BANK",
    "cbnCode": "090154",
    "paystackCode": "50823",
    "switchCode": "090154",
    "centiivCode": "090154",
    "aliases": [
      "cemcs microfinance bank"
    ]
  },
  {
    "name": "CENTRUM FINANCE",
    "cbnCode": "050032",
    "paystackCode": "",
    "switchCode": "050032",
    "centiivCode": "050032",
    "aliases": [
      "centrum finance"
    ]
  },
  {
    "name": "CHANELLE BANK",
    "cbnCode": "090397",
    "paystackCode": "",
    "switchCode": "090397",
    "centiivCode": "090397",
    "aliases": [
      "chanelle bank",
      "chanelle mfb"
    ]
  },
  {
    "name": "Charis MFB",
    "cbnCode": "090815",
    "paystackCode": "",
    "switchCode": "090815",
    "centiivCode": "090815",
    "aliases": [
      "charis mfb"
    ]
  },
  {
    "name": "Chase Microfinance Bank",
    "cbnCode": "090523",
    "paystackCode": "",
    "switchCode": "090523",
    "centiivCode": "090523",
    "aliases": [
      "chase microfinance bank"
    ]
  },
  {
    "name": "CHERISH MICROFINANCE BANK",
    "cbnCode": "090440",
    "paystackCode": "",
    "switchCode": "090440",
    "centiivCode": "090440",
    "aliases": [
      "cherish microfinance bank"
    ]
  },
  {
    "name": "CHIBUEZE MICROFINANCE BANK",
    "cbnCode": "090416",
    "paystackCode": "",
    "switchCode": "090416",
    "centiivCode": "090416",
    "aliases": [
      "chibueze microfinance bank",
      "chibueze mfb"
    ]
  },
  {
    "name": "CHIKUM MICROFINANCE BANK",
    "cbnCode": "090141",
    "paystackCode": "312",
    "switchCode": "090141",
    "centiivCode": "090141",
    "aliases": [
      "chikum microfinance bank"
    ]
  },
  {
    "name": "Chukwunenye Microfinance Bank",
    "cbnCode": "090490",
    "paystackCode": "",
    "switchCode": "090490",
    "centiivCode": "090490",
    "aliases": [
      "chukwunenye microfinance bank",
      "chukwunenye mfb"
    ]
  },
  {
    "name": "CIT MICROFINANCE BANK",
    "cbnCode": "090144",
    "paystackCode": "",
    "switchCode": "090144",
    "centiivCode": "090144",
    "aliases": [
      "cit microfinance bank"
    ]
  },
  {
    "name": "Citibank Nigeria",
    "cbnCode": "000009",
    "paystackCode": "023",
    "switchCode": "000009",
    "centiivCode": "000009",
    "aliases": [
      "citi",
      "citibank",
      "citi bank",
      "citibank nigeria"
    ]
  },
  {
    "name": "CITIZEN TRUST MICROFINANCE BANK LTD",
    "cbnCode": "090343",
    "paystackCode": "",
    "switchCode": "090343",
    "centiivCode": "090343",
    "aliases": [
      "citizen trust microfinance bank ltd"
    ]
  },
  {
    "name": "CITYCODE MORTGAGE BANK",
    "cbnCode": "070027",
    "paystackCode": "070027",
    "switchCode": "070027",
    "centiivCode": "070027",
    "aliases": [
      "citycode mortgage bank",
      "citycode mortage bank"
    ]
  },
  {
    "name": "CLEARPAY MICROFINANCE BANK",
    "cbnCode": "090482",
    "paystackCode": "",
    "switchCode": "090482",
    "centiivCode": "090482",
    "aliases": [
      "clearpay microfinance bank",
      "fedeth microfinance bank"
    ]
  },
  {
    "name": "Cloverleaf Microfinance Bank",
    "cbnCode": "090511",
    "paystackCode": "",
    "switchCode": "090511",
    "centiivCode": "090511",
    "aliases": [
      "cloverleaf microfinance bank",
      "clover leaf"
    ]
  },
  {
    "name": "COALCAMP MICROFINANCE BANK",
    "cbnCode": "090254",
    "paystackCode": "",
    "switchCode": "090254",
    "centiivCode": "090254",
    "aliases": [
      "coalcamp microfinance bank"
    ]
  },
  {
    "name": "COASTLINE MICROFINANCE BANK",
    "cbnCode": "090374",
    "paystackCode": "",
    "switchCode": "090374",
    "centiivCode": "090374",
    "aliases": [
      "coastline microfinance bank"
    ]
  },
  {
    "name": "Confidence Microfinance Bank Ltd",
    "cbnCode": "090530",
    "paystackCode": "",
    "switchCode": "090530",
    "centiivCode": "090530",
    "aliases": [
      "confidence microfinance bank ltd",
      "confidence mfb"
    ]
  },
  {
    "name": "Consistent Trust Microfinance Bank Ltd",
    "cbnCode": "090553",
    "paystackCode": "",
    "switchCode": "090553",
    "centiivCode": "090553",
    "aliases": [
      "consistent trust microfinance bank ltd",
      "consistent trust microfinance bank"
    ]
  },
  {
    "name": "CONSUMER MICROFINANCE BANK",
    "cbnCode": "090130",
    "paystackCode": "50910",
    "switchCode": "090130",
    "centiivCode": "090130",
    "aliases": [
      "consumer microfinance bank"
    ]
  },
  {
    "name": "COOL MFB",
    "cbnCode": "090842",
    "paystackCode": "",
    "switchCode": "090842",
    "centiivCode": "090842",
    "aliases": [
      "cool mfb",
      "cool microfinance bank limited"
    ]
  },
  {
    "name": "COOP MORTGAGE BANK",
    "cbnCode": "070021",
    "paystackCode": "",
    "switchCode": "070021",
    "centiivCode": "070021",
    "aliases": [
      "coop mortgage bank"
    ]
  },
  {
    "name": "COOPFUND MFB",
    "cbnCode": "090717",
    "paystackCode": "",
    "switchCode": "090717",
    "centiivCode": "090717",
    "aliases": [
      "coopfund mfb"
    ]
  },
  {
    "name": "Corestep Microfinance Bank",
    "cbnCode": "090365",
    "paystackCode": "50204",
    "switchCode": "090365",
    "centiivCode": "090365",
    "aliases": [
      "corestep",
      "corestep mfb",
      "corestep microfinance bank"
    ]
  },
  {
    "name": "CORONATION MERCHANT BANK",
    "cbnCode": "060001",
    "paystackCode": "559",
    "switchCode": "060001",
    "centiivCode": "060001",
    "aliases": [
      "coronation merchant bank"
    ]
  },
  {
    "name": "COUNTY FINANCE LTD",
    "cbnCode": "050001",
    "paystackCode": "",
    "switchCode": "050001",
    "centiivCode": "050001",
    "aliases": [
      "county finance ltd"
    ]
  },
  {
    "name": "COVENANT MICROFINANCE BANK",
    "cbnCode": "070006",
    "paystackCode": "",
    "switchCode": "070006",
    "centiivCode": "070006",
    "aliases": [
      "covenant microfinance bank",
      "covenant mfb"
    ]
  },
  {
    "name": "CREDIT AFRIQUE MICROFINANCE BANK",
    "cbnCode": "090159",
    "paystackCode": "",
    "switchCode": "090159",
    "centiivCode": "090159",
    "aliases": [
      "credit afrique microfinance bank"
    ]
  },
  {
    "name": "CREDIT DIRECT LIMITED",
    "cbnCode": "110049",
    "paystackCode": "40119",
    "switchCode": "110049",
    "centiivCode": "110049",
    "aliases": [
      "credit direct limited"
    ]
  },
  {
    "name": "Creditville Microfinance Bank",
    "cbnCode": "090611",
    "paystackCode": "",
    "switchCode": "090611",
    "centiivCode": "090611",
    "aliases": [
      "creditville microfinance bank",
      "creditville mfb"
    ]
  },
  {
    "name": "Crescent Microfinance Bank",
    "cbnCode": "090526",
    "paystackCode": "",
    "switchCode": "090526",
    "centiivCode": "090526",
    "aliases": [
      "crescent microfinance bank"
    ]
  },
  {
    "name": "CROSSRIVER MICROFINANCE BANK",
    "cbnCode": "090429",
    "paystackCode": "",
    "switchCode": "090429",
    "centiivCode": "090429",
    "aliases": [
      "crossriver microfinance bank"
    ]
  },
  {
    "name": "Crowdforce",
    "cbnCode": "110017",
    "paystackCode": "",
    "switchCode": "110017",
    "centiivCode": "110017",
    "aliases": [
      "crowdforce"
    ]
  },
  {
    "name": "CRUTECH MICROFINANCE BANK",
    "cbnCode": "090414",
    "paystackCode": "",
    "switchCode": "090414",
    "centiivCode": "090414",
    "aliases": [
      "crutech microfinance bank"
    ]
  },
  {
    "name": "CRYSTAL FINANCE COMPANY LIMITED",
    "cbnCode": "050029",
    "paystackCode": "",
    "switchCode": "050029",
    "centiivCode": "050029",
    "aliases": [
      "crystal finance company limited"
    ]
  },
  {
    "name": "CS Advance",
    "cbnCode": "050017",
    "paystackCode": "",
    "switchCode": "050017",
    "centiivCode": "050017",
    "aliases": [
      "cs advance"
    ]
  },
  {
    "name": "CSD MICROFINANCE BANK",
    "cbnCode": "90686",
    "paystackCode": "",
    "switchCode": "90686",
    "centiivCode": "90686",
    "aliases": [
      "csd microfinance bank"
    ]
  },
  {
    "name": "Cyberspace Limited",
    "cbnCode": "110014",
    "paystackCode": "",
    "switchCode": "110014",
    "centiivCode": "110014",
    "aliases": [
      "cyberspace limited"
    ]
  },
  {
    "name": "D CALLPHONE LIMITED",
    "cbnCode": "110038",
    "paystackCode": "",
    "switchCode": "110038",
    "centiivCode": "110038",
    "aliases": [
      "d callphone limited"
    ]
  },
  {
    "name": "DAILY TRUST MICROFINANCE BANK",
    "cbnCode": "090706",
    "paystackCode": "090706",
    "switchCode": "090706",
    "centiivCode": "090706",
    "aliases": [
      "daily trust microfinance bank",
      "ucee mfb",
      "ucee microfinance bank"
    ]
  },
  {
    "name": "DAL MICROFINANCE BANK",
    "cbnCode": "090596",
    "paystackCode": "",
    "switchCode": "090596",
    "centiivCode": "090596",
    "aliases": [
      "dal microfinance bank",
      "dal mfb"
    ]
  },
  {
    "name": "DASH MFB",
    "cbnCode": "090845",
    "paystackCode": "",
    "switchCode": "090845",
    "centiivCode": "090845",
    "aliases": [
      "dash mfb"
    ]
  },
  {
    "name": "DAVENPORT MFB",
    "cbnCode": "090673",
    "paystackCode": "",
    "switchCode": "090673",
    "centiivCode": "090673",
    "aliases": [
      "davenport mfb"
    ]
  },
  {
    "name": "DAVODANI MICROFINANCE BANK",
    "cbnCode": "090391",
    "paystackCode": "",
    "switchCode": "090391",
    "centiivCode": "090391",
    "aliases": [
      "davodani microfinance bank"
    ]
  },
  {
    "name": "DAYLIGHT MICROFINANCE BANK",
    "cbnCode": "090167",
    "paystackCode": "",
    "switchCode": "090167",
    "centiivCode": "090167",
    "aliases": [
      "daylight microfinance bank"
    ]
  },
  {
    "name": "DELTA TRUST MORTGAGE BANK",
    "cbnCode": "070023",
    "paystackCode": "",
    "switchCode": "070023",
    "centiivCode": "070023",
    "aliases": [
      "delta trust mortgage bank",
      "delta trust microfinance bank"
    ]
  },
  {
    "name": "DESTINY MFB",
    "cbnCode": "090723",
    "paystackCode": "",
    "switchCode": "090723",
    "centiivCode": "090723",
    "aliases": [
      "destiny mfb"
    ]
  },
  {
    "name": "DIGITVANT MFB",
    "cbnCode": "090745",
    "paystackCode": "",
    "switchCode": "090745",
    "centiivCode": "090745",
    "aliases": [
      "digitvant mfb"
    ]
  },
  {
    "name": "DIGNITY FINANCE",
    "cbnCode": "050013",
    "paystackCode": "",
    "switchCode": "050013",
    "centiivCode": "050013",
    "aliases": [
      "dignity finance"
    ]
  },
  {
    "name": "Dillon MFB",
    "cbnCode": "090828",
    "paystackCode": "",
    "switchCode": "090828",
    "centiivCode": "090828",
    "aliases": [
      "dillon mfb",
      "dillon mfb"
    ]
  },
  {
    "name": "Diobu MFB",
    "cbnCode": "090643",
    "paystackCode": "",
    "switchCode": "090643",
    "centiivCode": "090643",
    "aliases": [
      "diobu mfb"
    ]
  },
  {
    "name": "DOJE MICROFINANCE BANK",
    "cbnCode": "090404",
    "paystackCode": "",
    "switchCode": "090404",
    "centiivCode": "090404",
    "aliases": [
      "doje microfinance bank",
      "olowolagba microfinance bank"
    ]
  },
  {
    "name": "Dot Microfinance Bank",
    "cbnCode": "090470",
    "paystackCode": "50162",
    "switchCode": "090470",
    "centiivCode": "090470",
    "aliases": [
      "dot",
      "dot bank",
      "dot mfb",
      "dot microfinance bank",
      "changan rts microfinance bank"
    ]
  },
  {
    "name": "DSC Microfinance Bank",
    "cbnCode": "090821",
    "paystackCode": "",
    "switchCode": "090821",
    "centiivCode": "090821",
    "aliases": [
      "dsc microfinance bank",
      "dsc microfinance bank"
    ]
  },
  {
    "name": "DW MFB",
    "cbnCode": "090721",
    "paystackCode": "",
    "switchCode": "090721",
    "centiivCode": "090721",
    "aliases": [
      "dw mfb"
    ]
  },
  {
    "name": "E-BARCS MICROFINANCE BANK",
    "cbnCode": "090156",
    "paystackCode": "",
    "switchCode": "090156",
    "centiivCode": "090156",
    "aliases": [
      "e-barcs microfinance bank"
    ]
  },
  {
    "name": "E-Finance",
    "cbnCode": "050016",
    "paystackCode": "",
    "switchCode": "050016",
    "centiivCode": "050016",
    "aliases": [
      "e-finance"
    ]
  },
  {
    "name": "EAGLE FLIGHT MICROFINANCE BANK",
    "cbnCode": "090294",
    "paystackCode": "",
    "switchCode": "090294",
    "centiivCode": "090294",
    "aliases": [
      "eagle flight microfinance bank"
    ]
  },
  {
    "name": "EARNWELL MFB",
    "cbnCode": "090674",
    "paystackCode": "",
    "switchCode": "090674",
    "centiivCode": "090674",
    "aliases": [
      "earnwell mfb"
    ]
  },
  {
    "name": "EARTHOLEUM",
    "cbnCode": "100021",
    "paystackCode": "",
    "switchCode": "100021",
    "centiivCode": "100021",
    "aliases": [
      "eartholeum"
    ]
  },
  {
    "name": "Eastman MFB",
    "cbnCode": "090707",
    "paystackCode": "",
    "switchCode": "090707",
    "centiivCode": "090707",
    "aliases": [
      "eastman mfb"
    ]
  },
  {
    "name": "EBSU MICROFINANCE BANK",
    "cbnCode": "090427",
    "paystackCode": "50922",
    "switchCode": "090427",
    "centiivCode": "090427",
    "aliases": [
      "ebsu microfinance bank"
    ]
  },
  {
    "name": "Ecobank Nigeria",
    "cbnCode": "000010",
    "paystackCode": "050",
    "switchCode": "000010",
    "centiivCode": "000010",
    "aliases": [
      "ecobank",
      "eco bank",
      "ecobank nigeria",
      "ecobank bank"
    ]
  },
  {
    "name": "ECOBANK XPRESS ACCOUNT",
    "cbnCode": "100008",
    "paystackCode": "",
    "switchCode": "100008",
    "centiivCode": "100008",
    "aliases": [
      "ecobank xpress account"
    ]
  },
  {
    "name": "ECOMOBILE",
    "cbnCode": "100030",
    "paystackCode": "",
    "switchCode": "100030",
    "centiivCode": "100030",
    "aliases": [
      "ecomobile"
    ]
  },
  {
    "name": "EDFIN MICROFINANCE BANK",
    "cbnCode": "090310",
    "paystackCode": "",
    "switchCode": "090310",
    "centiivCode": "090310",
    "aliases": [
      "edfin microfinance bank"
    ]
  },
  {
    "name": "Egwafin Microfinance Bank Ltd",
    "cbnCode": "090556",
    "paystackCode": "",
    "switchCode": "090556",
    "centiivCode": "090556",
    "aliases": [
      "egwafin microfinance bank ltd",
      "egwafin microfinance bank"
    ]
  },
  {
    "name": "EJINDU MFB",
    "cbnCode": "090694",
    "paystackCode": "",
    "switchCode": "090694",
    "centiivCode": "090694",
    "aliases": [
      "ejindu mfb"
    ]
  },
  {
    "name": "EK-RELIABLE MICROFINANCE BANK",
    "cbnCode": "090389",
    "paystackCode": "",
    "switchCode": "090389",
    "centiivCode": "090389",
    "aliases": [
      "ek-reliable microfinance bank"
    ]
  },
  {
    "name": "Ekimogun Microfinance Bank",
    "cbnCode": "090552",
    "paystackCode": "",
    "switchCode": "090552",
    "centiivCode": "090552",
    "aliases": [
      "ekimogun microfinance bank"
    ]
  },
  {
    "name": "EKONDO MICROFINANCE BANK",
    "cbnCode": "090097",
    "paystackCode": "098",
    "switchCode": "090097",
    "centiivCode": "090097",
    "aliases": [
      "ekondo microfinance bank",
      "ekondo mfb"
    ]
  },
  {
    "name": "EMAAR MICROFINANCE BANK",
    "cbnCode": "090712",
    "paystackCode": "",
    "switchCode": "090712",
    "centiivCode": "090712",
    "aliases": [
      "emaar microfinance bank",
      "emaar mfb"
    ]
  },
  {
    "name": "EMERALD MICROFINANCE BANK",
    "cbnCode": "090273",
    "paystackCode": "",
    "switchCode": "090273",
    "centiivCode": "090273",
    "aliases": [
      "emerald microfinance bank",
      "emeralds microfinance bank"
    ]
  },
  {
    "name": "EMPIRE TRUST MICROFINANCE BANK",
    "cbnCode": "090114",
    "paystackCode": "",
    "switchCode": "090114",
    "centiivCode": "090114",
    "aliases": [
      "empire trust microfinance bank",
      "empire trust mfb"
    ]
  },
  {
    "name": "ENAIRA",
    "cbnCode": "000033",
    "paystackCode": "",
    "switchCode": "000033",
    "centiivCode": "000033",
    "aliases": [
      "enaira"
    ]
  },
  {
    "name": "ENCO FINANCE",
    "cbnCode": "050012",
    "paystackCode": "",
    "switchCode": "050012",
    "centiivCode": "050012",
    "aliases": [
      "enco finance"
    ]
  },
  {
    "name": "Enrich Microfinance Bank",
    "cbnCode": "090539",
    "paystackCode": "",
    "switchCode": "090539",
    "centiivCode": "090539",
    "aliases": [
      "enrich microfinance bank"
    ]
  },
  {
    "name": "ENTERPRISE BANK",
    "cbnCode": "000019",
    "paystackCode": "",
    "switchCode": "000019",
    "centiivCode": "000019",
    "aliases": [
      "enterprise bank"
    ]
  },
  {
    "name": "ENTITY MFB",
    "cbnCode": "090656",
    "paystackCode": "",
    "switchCode": "090656",
    "centiivCode": "090656",
    "aliases": [
      "entity mfb"
    ]
  },
  {
    "name": "ESAN MICROFINANCE BANK",
    "cbnCode": "090189",
    "paystackCode": "",
    "switchCode": "090189",
    "centiivCode": "090189",
    "aliases": [
      "esan microfinance bank"
    ]
  },
  {
    "name": "ESO-E MICROFINANCE BANK",
    "cbnCode": "090166",
    "paystackCode": "",
    "switchCode": "090166",
    "centiivCode": "090166",
    "aliases": [
      "eso-e microfinance bank"
    ]
  },
  {
    "name": "ETRANZACT",
    "cbnCode": "100006",
    "paystackCode": "",
    "switchCode": "100006",
    "centiivCode": "100006",
    "aliases": [
      "etranzact"
    ]
  },
  {
    "name": "EVANGEL MICROFINANCE BANK",
    "cbnCode": "090304",
    "paystackCode": "",
    "switchCode": "090304",
    "centiivCode": "090304",
    "aliases": [
      "evangel microfinance bank"
    ]
  },
  {
    "name": "EVERGREEN MICROFINANCE BANK",
    "cbnCode": "090332",
    "paystackCode": "",
    "switchCode": "090332",
    "centiivCode": "090332",
    "aliases": [
      "evergreen microfinance bank"
    ]
  },
  {
    "name": "EVIB FINANCE",
    "cbnCode": "050034",
    "paystackCode": "",
    "switchCode": "050034",
    "centiivCode": "050034",
    "aliases": [
      "evib finance"
    ]
  },
  {
    "name": "Ewt Microfinance Bank",
    "cbnCode": "090572",
    "paystackCode": "",
    "switchCode": "090572",
    "centiivCode": "090572",
    "aliases": [
      "ewt microfinance bank"
    ]
  },
  {
    "name": "EXCEL MFB",
    "cbnCode": "090678",
    "paystackCode": "090678",
    "switchCode": "090678",
    "centiivCode": "090678",
    "aliases": [
      "excel mfb",
      "excel finance bank"
    ]
  },
  {
    "name": "Excellent Microfinance Bank",
    "cbnCode": "090541",
    "paystackCode": "",
    "switchCode": "090541",
    "centiivCode": "090541",
    "aliases": [
      "excellent microfinance bank"
    ]
  },
  {
    "name": "Eyowo",
    "cbnCode": "090328",
    "paystackCode": "50126",
    "switchCode": "090328",
    "centiivCode": "090328",
    "aliases": [
      "eyowo",
      "eyowo mfb"
    ]
  },
  {
    "name": "Fairmoney Microfinance Bank",
    "cbnCode": "090551",
    "paystackCode": "51318",
    "switchCode": "090551",
    "centiivCode": "090551",
    "aliases": [
      "fairmoney",
      "fair money",
      "fairmoney mfb",
      "fairmoney microfinance bank",
      "fairmoney microfinance bank ltd"
    ]
  },
  {
    "name": "FAME MICROFINANCE BANK",
    "cbnCode": "090330",
    "paystackCode": "",
    "switchCode": "090330",
    "centiivCode": "090330",
    "aliases": [
      "fame microfinance bank"
    ]
  },
  {
    "name": "FAST CREDIT",
    "cbnCode": "050009",
    "paystackCode": "",
    "switchCode": "050009",
    "centiivCode": "050009",
    "aliases": [
      "fast credit"
    ]
  },
  {
    "name": "FAST MICROFINANCE BANK",
    "cbnCode": "090179",
    "paystackCode": "",
    "switchCode": "090179",
    "centiivCode": "090179",
    "aliases": [
      "fast microfinance bank"
    ]
  },
  {
    "name": "FBNQUEST MERCHANT BANK",
    "cbnCode": "060002",
    "paystackCode": "",
    "switchCode": "060002",
    "centiivCode": "060002",
    "aliases": [
      "fbnquest merchant bank"
    ]
  },
  {
    "name": "FCMB MICROFINANCE BANK",
    "cbnCode": "090409",
    "paystackCode": "",
    "switchCode": "090409",
    "centiivCode": "090409",
    "aliases": [
      "fcmb microfinance bank",
      "fcmb beta"
    ]
  },
  {
    "name": "FCMB MOBILE",
    "cbnCode": "100031",
    "paystackCode": "",
    "switchCode": "100031",
    "centiivCode": "100031",
    "aliases": [
      "fcmb mobile",
      "fcmb easy account"
    ]
  },
  {
    "name": "FCT MICROFINANCE BANK",
    "cbnCode": "090290",
    "paystackCode": "",
    "switchCode": "090290",
    "centiivCode": "090290",
    "aliases": [
      "fct microfinance bank"
    ]
  },
  {
    "name": "FEDERAL POLYTECHNIC NEKEDE MICROFINANCE BANK",
    "cbnCode": "090398",
    "paystackCode": "",
    "switchCode": "090398",
    "centiivCode": "090398",
    "aliases": [
      "federal polytechnic nekede microfinance bank"
    ]
  },
  {
    "name": "FEDPOLY NASARAWA MICROFINANCE BANK",
    "cbnCode": "090298",
    "paystackCode": "",
    "switchCode": "090298",
    "centiivCode": "090298",
    "aliases": [
      "fedpoly nasarawa microfinance bank"
    ]
  },
  {
    "name": "FETS",
    "cbnCode": "100001",
    "paystackCode": "",
    "switchCode": "100001",
    "centiivCode": "100001",
    "aliases": [
      "fets",
      "fet"
    ]
  },
  {
    "name": "FEWCHORE FINANCE COMPANY LIMITED",
    "cbnCode": "050002",
    "paystackCode": "",
    "switchCode": "050002",
    "centiivCode": "050002",
    "aliases": [
      "fewchore finance company limited"
    ]
  },
  {
    "name": "FFS MICROFINANCE BANK",
    "cbnCode": "090153",
    "paystackCode": "",
    "switchCode": "090153",
    "centiivCode": "090153",
    "aliases": [
      "ffs microfinance bank"
    ]
  },
  {
    "name": "FHA MORTGAGE BANK LTD",
    "cbnCode": "070026",
    "paystackCode": "",
    "switchCode": "070026",
    "centiivCode": "070026",
    "aliases": [
      "fha mortgage bank ltd",
      "fha mortgage bank"
    ]
  },
  {
    "name": "Fidelity Bank",
    "cbnCode": "000007",
    "paystackCode": "070",
    "switchCode": "000007",
    "centiivCode": "000007",
    "aliases": [
      "fidelity",
      "fidelity bank"
    ]
  },
  {
    "name": "FIDELITY MOBILE",
    "cbnCode": "100019",
    "paystackCode": "",
    "switchCode": "100019",
    "centiivCode": "100019",
    "aliases": [
      "fidelity mobile"
    ]
  },
  {
    "name": "FIDFUND MICROFINANCE BANK",
    "cbnCode": "090126",
    "paystackCode": "",
    "switchCode": "090126",
    "centiivCode": "090126",
    "aliases": [
      "fidfund microfinance bank"
    ]
  },
  {
    "name": "Fims Microfinance Bank",
    "cbnCode": "090507",
    "paystackCode": "",
    "switchCode": "090507",
    "centiivCode": "090507",
    "aliases": [
      "fims microfinance bank",
      "fims mfb"
    ]
  },
  {
    "name": "FINATRUST MICROFINANCE BANK",
    "cbnCode": "090111",
    "paystackCode": "",
    "switchCode": "090111",
    "centiivCode": "090111",
    "aliases": [
      "finatrust microfinance bank"
    ]
  },
  {
    "name": "FINCA MICROFINANCE BANK",
    "cbnCode": "090400",
    "paystackCode": "",
    "switchCode": "090400",
    "centiivCode": "090400",
    "aliases": [
      "finca microfinance bank"
    ]
  },
  {
    "name": "FIRMUS MICROFINANCE BANK",
    "cbnCode": "090366",
    "paystackCode": "",
    "switchCode": "090366",
    "centiivCode": "090366",
    "aliases": [
      "firmus microfinance bank"
    ]
  },
  {
    "name": "FIRST ALLY MICROFINANCE BANK",
    "cbnCode": "090135",
    "paystackCode": "",
    "switchCode": "090135",
    "centiivCode": "090135",
    "aliases": [
      "first ally microfinance bank",
      "personal trust microfinance bank"
    ]
  },
  {
    "name": "First Apple Limited",
    "cbnCode": "110004",
    "paystackCode": "",
    "switchCode": "110004",
    "centiivCode": "110004",
    "aliases": [
      "first apple limited"
    ]
  },
  {
    "name": "First Bank of Nigeria",
    "cbnCode": "000016",
    "paystackCode": "011",
    "switchCode": "000016",
    "centiivCode": "000016",
    "aliases": [
      "first bank",
      "firstbank",
      "fbn",
      "first bank of nigeria",
      "first bank plc",
      "firstbank plc",
      "first bank nigeria",
      "firstbank nigeria",
      "firstbank of nigeria",
      "first"
    ]
  },
  {
    "name": "First City Monument Bank",
    "cbnCode": "000003",
    "paystackCode": "214",
    "switchCode": "000003",
    "centiivCode": "000003",
    "aliases": [
      "fcmb",
      "first city monument bank",
      "first city monument"
    ]
  },
  {
    "name": "FIRST GENERATION MORTGAGE BANK",
    "cbnCode": "070014",
    "paystackCode": "",
    "switchCode": "070014",
    "centiivCode": "070014",
    "aliases": [
      "first generation mortgage bank"
    ]
  },
  {
    "name": "First Heritage Microfinance Bank",
    "cbnCode": "090479",
    "paystackCode": "",
    "switchCode": "090479",
    "centiivCode": "090479",
    "aliases": [
      "first heritage microfinance bank",
      "boji boji microfinance bank"
    ]
  },
  {
    "name": "First Marina Trust Finance",
    "cbnCode": "050022",
    "paystackCode": "",
    "switchCode": "050022",
    "centiivCode": "050022",
    "aliases": [
      "first marina trust finance"
    ]
  },
  {
    "name": "FIRST MULTIPLE MICROFINANCE BANK",
    "cbnCode": "090163",
    "paystackCode": "",
    "switchCode": "090163",
    "centiivCode": "090163",
    "aliases": [
      "first multiple microfinance bank",
      "first multiple mfb"
    ]
  },
  {
    "name": "FIRST OPTION MICROFINANCE BANK",
    "cbnCode": "090285",
    "paystackCode": "",
    "switchCode": "090285",
    "centiivCode": "090285",
    "aliases": [
      "first option microfinance bank"
    ]
  },
  {
    "name": "FIRST ROYAL MICROFINANCE BANK",
    "cbnCode": "090164",
    "paystackCode": "090164",
    "switchCode": "090164",
    "centiivCode": "090164",
    "aliases": [
      "first royal microfinance bank"
    ]
  },
  {
    "name": "FIRST TRUST MORTGAGE BANK PLC",
    "cbnCode": "090107",
    "paystackCode": "",
    "switchCode": "090107",
    "centiivCode": "090107",
    "aliases": [
      "first trust mortgage bank plc",
      "fbn mortgages limited"
    ]
  },
  {
    "name": "Firstmidas Microfinance Bank Ltd",
    "cbnCode": "090575",
    "paystackCode": "",
    "switchCode": "090575",
    "centiivCode": "090575",
    "aliases": [
      "firstmidas microfinance bank ltd",
      "first midas microfinance bank"
    ]
  },
  {
    "name": "FIRSTMONIE WALLET",
    "cbnCode": "100014",
    "paystackCode": "",
    "switchCode": "100014",
    "centiivCode": "100014",
    "aliases": [
      "firstmonie wallet",
      "fbnmobile"
    ]
  },
  {
    "name": "FIT MFB",
    "cbnCode": "090856",
    "paystackCode": "",
    "switchCode": "090856",
    "centiivCode": "090856",
    "aliases": [
      "fit mfb"
    ]
  },
  {
    "name": "Flexi MFB",
    "cbnCode": "090835",
    "paystackCode": "",
    "switchCode": "090835",
    "centiivCode": "090835",
    "aliases": [
      "flexi mfb"
    ]
  },
  {
    "name": "Flutterwave Technology Solutions Limited",
    "cbnCode": "110002",
    "paystackCode": "",
    "switchCode": "110002",
    "centiivCode": "110002",
    "aliases": [
      "flutterwave technology solutions limited"
    ]
  },
  {
    "name": "Focus MFB",
    "cbnCode": "090709",
    "paystackCode": "",
    "switchCode": "090709",
    "centiivCode": "090709",
    "aliases": [
      "focus mfb"
    ]
  },
  {
    "name": "Foresight Microfinance Bank",
    "cbnCode": "090521",
    "paystackCode": "",
    "switchCode": "090521",
    "centiivCode": "090521",
    "aliases": [
      "foresight microfinance bank"
    ]
  },
  {
    "name": "FORTIS MICROFINANCE BANK",
    "cbnCode": "070002",
    "paystackCode": "",
    "switchCode": "070002",
    "centiivCode": "070002",
    "aliases": [
      "fortis microfinance bank"
    ]
  },
  {
    "name": "FORTIS MOBILE",
    "cbnCode": "100016",
    "paystackCode": "",
    "switchCode": "100016",
    "centiivCode": "100016",
    "aliases": [
      "fortis mobile",
      "fortismobile"
    ]
  },
  {
    "name": "Fortress Microfinance Bank",
    "cbnCode": "090486",
    "paystackCode": "",
    "switchCode": "090486",
    "centiivCode": "090486",
    "aliases": [
      "fortress microfinance bank"
    ]
  },
  {
    "name": "FSDH",
    "cbnCode": "400001",
    "paystackCode": "",
    "switchCode": "400001",
    "centiivCode": "400001",
    "aliases": [
      "fsdh",
      "fsdh merchant bank"
    ]
  },
  {
    "name": "FUD MICROFINANCE BANK",
    "cbnCode": "090318",
    "paystackCode": "",
    "switchCode": "090318",
    "centiivCode": "090318",
    "aliases": [
      "fud microfinance bank",
      "federal university dutse microfinance bank"
    ]
  },
  {
    "name": "FULLRANGE MICROFINANCE BANK",
    "cbnCode": "090145",
    "paystackCode": "",
    "switchCode": "090145",
    "centiivCode": "090145",
    "aliases": [
      "fullrange microfinance bank"
    ]
  },
  {
    "name": "FUNDQUEST FINANCIAL SERVICES LTD",
    "cbnCode": "050010",
    "paystackCode": "",
    "switchCode": "050010",
    "centiivCode": "050010",
    "aliases": [
      "fundquest financial services ltd",
      "fundquest financial services limited"
    ]
  },
  {
    "name": "FUTMINNA MICROFINANCE BANK",
    "cbnCode": "090438",
    "paystackCode": "832",
    "switchCode": "090438",
    "centiivCode": "090438",
    "aliases": [
      "futminna microfinance bank"
    ]
  },
  {
    "name": "FUTO MICROFINANCE BANK",
    "cbnCode": "090158",
    "paystackCode": "",
    "switchCode": "090158",
    "centiivCode": "090158",
    "aliases": [
      "futo microfinance bank"
    ]
  },
  {
    "name": "Gabasawa MFB",
    "cbnCode": "090582",
    "paystackCode": "",
    "switchCode": "090582",
    "centiivCode": "090582",
    "aliases": [
      "gabasawa mfb"
    ]
  },
  {
    "name": "Gabsyn Microfinance Bank",
    "cbnCode": "090591",
    "paystackCode": "",
    "switchCode": "090591",
    "centiivCode": "090591",
    "aliases": [
      "gabsyn microfinance bank",
      "gabsyn microfinance bank limited"
    ]
  },
  {
    "name": "Gadol Finance",
    "cbnCode": "050033",
    "paystackCode": "",
    "switchCode": "050033",
    "centiivCode": "050033",
    "aliases": [
      "gadol finance"
    ]
  },
  {
    "name": "GADOL FINANCE",
    "cbnCode": "050303",
    "paystackCode": "",
    "switchCode": "050303",
    "centiivCode": "050303",
    "aliases": [
      "gadol finance"
    ]
  },
  {
    "name": "Garki Microfinance Bank",
    "cbnCode": "090484",
    "paystackCode": "",
    "switchCode": "090484",
    "centiivCode": "090484",
    "aliases": [
      "garki microfinance bank",
      "garki mfb"
    ]
  },
  {
    "name": "Garun Mallam MFB",
    "cbnCode": "090691",
    "paystackCode": "MFB51093",
    "switchCode": "090691",
    "centiivCode": "090691",
    "aliases": [
      "garun mallam mfb"
    ]
  },
  {
    "name": "GASHUA MICROFINANCE BANK",
    "cbnCode": "090168",
    "paystackCode": "",
    "switchCode": "090168",
    "centiivCode": "090168",
    "aliases": [
      "gashua microfinance bank"
    ]
  },
  {
    "name": "GATEWAY MORTGAGE BANK",
    "cbnCode": "070009",
    "paystackCode": "",
    "switchCode": "070009",
    "centiivCode": "070009",
    "aliases": [
      "gateway mortgage bank"
    ]
  },
  {
    "name": "Gbede Microfinance Bank",
    "cbnCode": "090579",
    "paystackCode": "",
    "switchCode": "090579",
    "centiivCode": "090579",
    "aliases": [
      "gbede microfinance bank"
    ]
  },
  {
    "name": "GDL FINANCE",
    "cbnCode": "050026",
    "paystackCode": "",
    "switchCode": "050026",
    "centiivCode": "050026",
    "aliases": [
      "gdl finance"
    ]
  },
  {
    "name": "Giant Stride Microfinance Bank",
    "cbnCode": "090475",
    "paystackCode": "",
    "switchCode": "090475",
    "centiivCode": "090475",
    "aliases": [
      "giant stride microfinance bank"
    ]
  },
  {
    "name": "GIDAUNIYAR ALHERI MICROFINANCE BANK",
    "cbnCode": "090621",
    "paystackCode": "",
    "switchCode": "090621",
    "centiivCode": "090621",
    "aliases": [
      "gidauniyar alheri microfinance bank",
      "gidauniyar alheri mfb"
    ]
  },
  {
    "name": "GIGINYA MICROFINANCE BANK",
    "cbnCode": "090411",
    "paystackCode": "",
    "switchCode": "090411",
    "centiivCode": "090411",
    "aliases": [
      "giginya microfinance bank"
    ]
  },
  {
    "name": "GIREI MICROFINANACE BANK",
    "cbnCode": "090186",
    "paystackCode": "",
    "switchCode": "090186",
    "centiivCode": "090186",
    "aliases": [
      "girei microfinanace bank",
      "girei microfinance bank"
    ]
  },
  {
    "name": "GIWA MICROFINANCE BANK",
    "cbnCode": "090441",
    "paystackCode": "",
    "switchCode": "090441",
    "centiivCode": "090441",
    "aliases": [
      "giwa microfinance bank",
      "lotus bank"
    ]
  },
  {
    "name": "Global Initiative MFB",
    "cbnCode": "090639",
    "paystackCode": "",
    "switchCode": "090639",
    "centiivCode": "090639",
    "aliases": [
      "global initiative mfb"
    ]
  },
  {
    "name": "GLOBAL trust Savings and Loans Limited",
    "cbnCode": "070032",
    "paystackCode": "",
    "switchCode": "070032",
    "centiivCode": "070032",
    "aliases": [
      "global trust savings and loans limited"
    ]
  },
  {
    "name": "Globus Bank",
    "cbnCode": "000027",
    "paystackCode": "00103",
    "switchCode": "000027",
    "centiivCode": "000027",
    "aliases": [
      "globus",
      "globus bank"
    ]
  },
  {
    "name": "GLORY MICROFINANCE BANK",
    "cbnCode": "090278",
    "paystackCode": "",
    "switchCode": "090278",
    "centiivCode": "090278",
    "aliases": [
      "glory microfinance bank"
    ]
  },
  {
    "name": "GMB MICROFINANCE BANK",
    "cbnCode": "090408",
    "paystackCode": "",
    "switchCode": "090408",
    "centiivCode": "090408",
    "aliases": [
      "gmb microfinance bank"
    ]
  },
  {
    "name": "GOLDMAN MICROFINANCE BANK",
    "cbnCode": "090574",
    "paystackCode": "090574",
    "switchCode": "090574",
    "centiivCode": "090574",
    "aliases": [
      "goldman microfinance bank",
      "goldman mfb"
    ]
  },
  {
    "name": "GOMBE MICROFINANCE BANK LTD",
    "cbnCode": "090586",
    "paystackCode": "",
    "switchCode": "090586",
    "centiivCode": "090586",
    "aliases": [
      "gombe microfinance bank ltd",
      "gombe mfb"
    ]
  },
  {
    "name": "GoMoney",
    "cbnCode": "100022",
    "paystackCode": "100022",
    "switchCode": "100022",
    "centiivCode": "100022",
    "aliases": [
      "gomoney",
      "go money"
    ]
  },
  {
    "name": "Good Neighbours Microfinance Bank",
    "cbnCode": "090467",
    "paystackCode": "",
    "switchCode": "090467",
    "centiivCode": "090467",
    "aliases": [
      "good neighbours microfinance bank",
      "good neigbours microfinance bank"
    ]
  },
  {
    "name": "GOWANS MICROFINANCE BANK",
    "cbnCode": "090122",
    "paystackCode": "",
    "switchCode": "090122",
    "centiivCode": "090122",
    "aliases": [
      "gowans microfinance bank"
    ]
  },
  {
    "name": "GRANT MF BANK",
    "cbnCode": "090335",
    "paystackCode": "",
    "switchCode": "090335",
    "centiivCode": "090335",
    "aliases": [
      "grant mf bank",
      "grants mfb"
    ]
  },
  {
    "name": "Green Energy Microfinance Bank Ltd",
    "cbnCode": "090550",
    "paystackCode": "",
    "switchCode": "090550",
    "centiivCode": "090550",
    "aliases": [
      "green energy microfinance bank ltd",
      "green energy microfinance bank"
    ]
  },
  {
    "name": "Greenacres MFB",
    "cbnCode": "090599",
    "paystackCode": "",
    "switchCode": "090599",
    "centiivCode": "090599",
    "aliases": [
      "greenacres mfb"
    ]
  },
  {
    "name": "GREENBANK MICROFINANCE BANK",
    "cbnCode": "090178",
    "paystackCode": "",
    "switchCode": "090178",
    "centiivCode": "090178",
    "aliases": [
      "greenbank microfinance bank"
    ]
  },
  {
    "name": "GREENVILLE MICROFINANCE BANK",
    "cbnCode": "090269",
    "paystackCode": "",
    "switchCode": "090269",
    "centiivCode": "090269",
    "aliases": [
      "greenville microfinance bank"
    ]
  },
  {
    "name": "GREENWICH MERCHANT BANK",
    "cbnCode": "060004",
    "paystackCode": "562",
    "switchCode": "060004",
    "centiivCode": "060004",
    "aliases": [
      "greenwich merchant bank"
    ]
  },
  {
    "name": "GRIFFIN FINANCE LIMITED",
    "cbnCode": "050041",
    "paystackCode": "",
    "switchCode": "050041",
    "centiivCode": "050041",
    "aliases": [
      "griffin finance limited"
    ]
  },
  {
    "name": "GROOMING MICROFINANCE BANK",
    "cbnCode": "090195",
    "paystackCode": "51276",
    "switchCode": "090195",
    "centiivCode": "090195",
    "aliases": [
      "grooming microfinance bank"
    ]
  },
  {
    "name": "GT MOBILE",
    "cbnCode": "100009",
    "paystackCode": "",
    "switchCode": "100009",
    "centiivCode": "100009",
    "aliases": [
      "gt mobile",
      "gtmobile"
    ]
  },
  {
    "name": "GTI MICROFINANCE BANK",
    "cbnCode": "090385",
    "paystackCode": "",
    "switchCode": "090385",
    "centiivCode": "090385",
    "aliases": [
      "gti microfinance bank"
    ]
  },
  {
    "name": "Guaranty Trust Bank",
    "cbnCode": "000013",
    "paystackCode": "058",
    "switchCode": "000013",
    "centiivCode": "000013",
    "aliases": [
      "gtb",
      "gt bank",
      "gtbank",
      "gtbank plc",
      "guaranty",
      "guaranty trust",
      "guaranty trust bank"
    ]
  },
  {
    "name": "Gwong Microfinance Bank",
    "cbnCode": "090500",
    "paystackCode": "",
    "switchCode": "090500",
    "centiivCode": "090500",
    "aliases": [
      "gwong microfinance bank"
    ]
  },
  {
    "name": "HABARIPAY LIMITED",
    "cbnCode": "110059",
    "paystackCode": "",
    "switchCode": "110059",
    "centiivCode": "110059",
    "aliases": [
      "habaripay limited"
    ]
  },
  {
    "name": "HACKMAN MICROFINANCE BANK",
    "cbnCode": "090147",
    "paystackCode": "51251",
    "switchCode": "090147",
    "centiivCode": "090147",
    "aliases": [
      "hackman microfinance bank"
    ]
  },
  {
    "name": "HAGGAI MORTGAGE BANK LIMITED",
    "cbnCode": "070017",
    "paystackCode": "",
    "switchCode": "070017",
    "centiivCode": "070017",
    "aliases": [
      "haggai mortgage bank limited"
    ]
  },
  {
    "name": "HALACREDIT MICROFINANCE BANK",
    "cbnCode": "090291",
    "paystackCode": "",
    "switchCode": "090291",
    "centiivCode": "090291",
    "aliases": [
      "halacredit microfinance bank",
      "halal credit microfinance bank"
    ]
  },
  {
    "name": "Hasal Microfinance Bank",
    "cbnCode": "090121",
    "paystackCode": "50383",
    "switchCode": "090121",
    "centiivCode": "090121",
    "aliases": [
      "hasal",
      "hasal mfb",
      "hasal microfinance bank"
    ]
  },
  {
    "name": "HAYAT TRUST MFB",
    "cbnCode": "090777",
    "paystackCode": "51364",
    "switchCode": "090777",
    "centiivCode": "090777",
    "aliases": [
      "hayat trust mfb"
    ]
  },
  {
    "name": "HEADWAY MICROFINANCE BANK",
    "cbnCode": "090363",
    "paystackCode": "",
    "switchCode": "090363",
    "centiivCode": "090363",
    "aliases": [
      "headway microfinance bank"
    ]
  },
  {
    "name": "HEDONMARK",
    "cbnCode": "100017",
    "paystackCode": "",
    "switchCode": "100017",
    "centiivCode": "100017",
    "aliases": [
      "hedonmark"
    ]
  },
  {
    "name": "Heritage Bank",
    "cbnCode": "000020",
    "paystackCode": "030",
    "switchCode": "000020",
    "centiivCode": "000020",
    "aliases": [
      "heritage",
      "heritage bank"
    ]
  },
  {
    "name": "HIGHLAND MICROFINANCE BANK",
    "cbnCode": "090418",
    "paystackCode": "",
    "switchCode": "090418",
    "centiivCode": "090418",
    "aliases": [
      "highland microfinance bank"
    ]
  },
  {
    "name": "HILLPOST MFB",
    "cbnCode": "090761",
    "paystackCode": "",
    "switchCode": "090761",
    "centiivCode": "090761",
    "aliases": [
      "hillpost mfb"
    ]
  },
  {
    "name": "HOMEBASE MORTGAGE BANK",
    "cbnCode": "070024",
    "paystackCode": "",
    "switchCode": "070024",
    "centiivCode": "070024",
    "aliases": [
      "homebase mortgage bank"
    ]
  },
  {
    "name": "HopePSB",
    "cbnCode": "120002",
    "paystackCode": "120002",
    "switchCode": "120002",
    "centiivCode": "120002",
    "aliases": [
      "hope psb",
      "hopepsb",
      "hope payment service bank"
    ]
  },
  {
    "name": "IBA MFB",
    "cbnCode": "090598",
    "paystackCode": "",
    "switchCode": "090598",
    "centiivCode": "090598",
    "aliases": [
      "iba mfb",
      "iba microfinance bank"
    ]
  },
  {
    "name": "IBANK MICROFINANCE BANK",
    "cbnCode": "090115",
    "paystackCode": "",
    "switchCode": "090115",
    "centiivCode": "090115",
    "aliases": [
      "ibank microfinance bank",
      "tcf mfb"
    ]
  },
  {
    "name": "IBBU MFB",
    "cbnCode": "090697",
    "paystackCode": "51279",
    "switchCode": "090697",
    "centiivCode": "090697",
    "aliases": [
      "ibbu mfb"
    ]
  },
  {
    "name": "IBETO MICROFINANCE BANK",
    "cbnCode": "090439",
    "paystackCode": "",
    "switchCode": "090439",
    "centiivCode": "090439",
    "aliases": [
      "ibeto microfinance bank",
      "ibeto mfb"
    ]
  },
  {
    "name": "IBILE MICROFINANCE BANK",
    "cbnCode": "090118",
    "paystackCode": "51244",
    "switchCode": "090118",
    "centiivCode": "090118",
    "aliases": [
      "ibile microfinance bank"
    ]
  },
  {
    "name": "Ibolo Micorfinance Bank Ltd",
    "cbnCode": "090532",
    "paystackCode": "",
    "switchCode": "090532",
    "centiivCode": "090532",
    "aliases": [
      "ibolo micorfinance bank ltd",
      "ibolo microfinance bank"
    ]
  },
  {
    "name": "Ibom Fadama Microfinance Bank",
    "cbnCode": "090519",
    "paystackCode": "",
    "switchCode": "090519",
    "centiivCode": "090519",
    "aliases": [
      "ibom fadama microfinance bank",
      "iboma fadama microfinance bank"
    ]
  },
  {
    "name": "IBOM MORTGAGE BANK",
    "cbnCode": "070025",
    "paystackCode": "90012",
    "switchCode": "070025",
    "centiivCode": "070025",
    "aliases": [
      "ibom mortgage bank",
      "akwa savings & loans limited"
    ]
  },
  {
    "name": "Ibu-Aje Microfinance",
    "cbnCode": "090488",
    "paystackCode": "",
    "switchCode": "090488",
    "centiivCode": "090488",
    "aliases": [
      "ibu-aje microfinance",
      "ibu-aje microfinance bank"
    ]
  },
  {
    "name": "IC Globalmicrofinance Bank",
    "cbnCode": "090520",
    "paystackCode": "",
    "switchCode": "090520",
    "centiivCode": "090520",
    "aliases": [
      "ic globalmicrofinance bank"
    ]
  },
  {
    "name": "Igbo-Ukwu MFB",
    "cbnCode": "090803",
    "paystackCode": "",
    "switchCode": "090803",
    "centiivCode": "090803",
    "aliases": [
      "igbo-ukwu mfb"
    ]
  },
  {
    "name": "IHALA MICROFINANCE BANK",
    "cbnCode": "090725",
    "paystackCode": "",
    "switchCode": "090725",
    "centiivCode": "090725",
    "aliases": [
      "ihala microfinance bank",
      "ihiala mfb"
    ]
  },
  {
    "name": "Ijebu-Ife Microfinance Bank Ltd",
    "cbnCode": "090546",
    "paystackCode": "",
    "switchCode": "090546",
    "centiivCode": "090546",
    "aliases": [
      "ijebu-ife microfinance bank ltd",
      "ijebu-ife microfinance bank"
    ]
  },
  {
    "name": "IKENNE MICROFINANCE BANK",
    "cbnCode": "090324",
    "paystackCode": "",
    "switchCode": "090324",
    "centiivCode": "090324",
    "aliases": [
      "ikenne microfinance bank"
    ]
  },
  {
    "name": "Ikere MFB",
    "cbnCode": "090799",
    "paystackCode": "",
    "switchCode": "090799",
    "centiivCode": "090799",
    "aliases": [
      "ikere mfb"
    ]
  },
  {
    "name": "IKERE MFB",
    "cbnCode": "090779",
    "paystackCode": "",
    "switchCode": "090779",
    "centiivCode": "090779",
    "aliases": [
      "ikere mfb"
    ]
  },
  {
    "name": "IKIRE MICROFINANCE BANK",
    "cbnCode": "090279",
    "paystackCode": "",
    "switchCode": "090279",
    "centiivCode": "090279",
    "aliases": [
      "ikire microfinance bank"
    ]
  },
  {
    "name": "IKORODU DIVISION MFB",
    "cbnCode": "090844",
    "paystackCode": "",
    "switchCode": "090844",
    "centiivCode": "090844",
    "aliases": [
      "ikorodu division mfb"
    ]
  },
  {
    "name": "IKOYI ILE MICROFINANCEBANK",
    "cbnCode": "090681",
    "paystackCode": "",
    "switchCode": "090681",
    "centiivCode": "090681",
    "aliases": [
      "ikoyi ile microfinancebank"
    ]
  },
  {
    "name": "Ikoyi-Osun Microfinance Bank",
    "cbnCode": "090536",
    "paystackCode": "",
    "switchCode": "090536",
    "centiivCode": "090536",
    "aliases": [
      "ikoyi-osun microfinance bank"
    ]
  },
  {
    "name": "Ilaro Poly Microfinance Bank Ltd",
    "cbnCode": "090571",
    "paystackCode": "",
    "switchCode": "090571",
    "centiivCode": "090571",
    "aliases": [
      "ilaro poly microfinance bank ltd",
      "ilaro poly microfinance bank"
    ]
  },
  {
    "name": "ILE-OLUJI MICROFINANCE BANK",
    "cbnCode": "090710",
    "paystackCode": "",
    "switchCode": "090710",
    "centiivCode": "090710",
    "aliases": [
      "ile-oluji microfinance bank",
      "ile oluji mfb"
    ]
  },
  {
    "name": "ILISAN MICROFINANCE BANK",
    "cbnCode": "090370",
    "paystackCode": "",
    "switchCode": "090370",
    "centiivCode": "090370",
    "aliases": [
      "ilisan microfinance bank"
    ]
  },
  {
    "name": "ILISAN-MFB",
    "cbnCode": "090037",
    "paystackCode": "",
    "switchCode": "090037",
    "centiivCode": "090037",
    "aliases": [
      "ilisan-mfb"
    ]
  },
  {
    "name": "ILLORIN MICROFINANCE BANK",
    "cbnCode": "090350",
    "paystackCode": "",
    "switchCode": "090350",
    "centiivCode": "090350",
    "aliases": [
      "illorin microfinance bank",
      "ilorin microfinance bank"
    ]
  },
  {
    "name": "ILORA MICROFINANCE BANK",
    "cbnCode": "090430",
    "paystackCode": "",
    "switchCode": "090430",
    "centiivCode": "090430",
    "aliases": [
      "ilora microfinance bank"
    ]
  },
  {
    "name": "IMO STATE MICROFINANCE BANK",
    "cbnCode": "090258",
    "paystackCode": "",
    "switchCode": "090258",
    "centiivCode": "090258",
    "aliases": [
      "imo state microfinance bank"
    ]
  },
  {
    "name": "IMOWO MICROFINANCE BANK",
    "cbnCode": "090417",
    "paystackCode": "",
    "switchCode": "090417",
    "centiivCode": "090417",
    "aliases": [
      "imowo microfinance bank"
    ]
  },
  {
    "name": "IMPERIAL HOMES MORTAGE BANK",
    "cbnCode": "415",
    "paystackCode": "415",
    "switchCode": "415",
    "centiivCode": "415",
    "aliases": [
      "imperial homes mortage bank"
    ]
  },
  {
    "name": "IMPERIAL HOMES MORTGAGE BANK",
    "cbnCode": "100024",
    "paystackCode": "",
    "switchCode": "100024",
    "centiivCode": "100024",
    "aliases": [
      "imperial homes mortgage bank"
    ]
  },
  {
    "name": "INDULGE MICROFINANCE BANK",
    "cbnCode": "090772",
    "paystackCode": "",
    "switchCode": "090772",
    "centiivCode": "090772",
    "aliases": [
      "indulge microfinance bank",
      "nuvion mfb"
    ]
  },
  {
    "name": "INEBA GOGO MFB",
    "cbnCode": "090838",
    "paystackCode": "",
    "switchCode": "090838",
    "centiivCode": "090838",
    "aliases": [
      "ineba gogo mfb"
    ]
  },
  {
    "name": "Infinity Microfinance Bank",
    "cbnCode": "090157",
    "paystackCode": "50457",
    "switchCode": "090157",
    "centiivCode": "090157",
    "aliases": [
      "infinity",
      "infinity mfb",
      "infinity microfinance bank"
    ]
  },
  {
    "name": "INFINITY TRUST MORTGAGE BANK",
    "cbnCode": "070016",
    "paystackCode": "070016",
    "switchCode": "070016",
    "centiivCode": "070016",
    "aliases": [
      "infinity trust mortgage bank",
      "infinity trust  mortgage bank"
    ]
  },
  {
    "name": "INNOVECTIVES KESH",
    "cbnCode": "100029",
    "paystackCode": "",
    "switchCode": "100029",
    "centiivCode": "100029",
    "aliases": [
      "innovectives kesh"
    ]
  },
  {
    "name": "INSIGHT MICROFINANCE BANK",
    "cbnCode": "090434",
    "paystackCode": "",
    "switchCode": "090434",
    "centiivCode": "090434",
    "aliases": [
      "insight microfinance bank"
    ]
  },
  {
    "name": "Intellifin",
    "cbnCode": "100027",
    "paystackCode": "",
    "switchCode": "100027",
    "centiivCode": "100027",
    "aliases": [
      "intellifin"
    ]
  },
  {
    "name": "INTERLAND MICROFINANCE BANK",
    "cbnCode": "090386",
    "paystackCode": "",
    "switchCode": "090386",
    "centiivCode": "090386",
    "aliases": [
      "interland microfinance bank"
    ]
  },
  {
    "name": "Interswitch Limited",
    "cbnCode": "110003",
    "paystackCode": "",
    "switchCode": "110003",
    "centiivCode": "110003",
    "aliases": [
      "interswitch limited"
    ]
  },
  {
    "name": "Iperu Microfinance Bank",
    "cbnCode": "090493",
    "paystackCode": "",
    "switchCode": "090493",
    "centiivCode": "090493",
    "aliases": [
      "iperu microfinance bank",
      "iperu mfb"
    ]
  },
  {
    "name": "IRL MICROFINANCE BANK",
    "cbnCode": "090149",
    "paystackCode": "",
    "switchCode": "090149",
    "centiivCode": "090149",
    "aliases": [
      "irl microfinance bank"
    ]
  },
  {
    "name": "ISALEOYO MICROFINANCE BANK",
    "cbnCode": "090377",
    "paystackCode": "",
    "switchCode": "090377",
    "centiivCode": "090377",
    "aliases": [
      "isaleoyo microfinance bank"
    ]
  },
  {
    "name": "ISHIE MICROFINANCE BANK",
    "cbnCode": "090428",
    "paystackCode": "",
    "switchCode": "090428",
    "centiivCode": "090428",
    "aliases": [
      "ishie microfinance bank"
    ]
  },
  {
    "name": "ISI-UZO MFB",
    "cbnCode": "090849",
    "paystackCode": "",
    "switchCode": "090849",
    "centiivCode": "090849",
    "aliases": [
      "isi-uzo mfb"
    ]
  },
  {
    "name": "Island MFB",
    "cbnCode": "090584",
    "paystackCode": "",
    "switchCode": "090584",
    "centiivCode": "090584",
    "aliases": [
      "island mfb",
      "island microfinance bank"
    ]
  },
  {
    "name": "ISUA MFB",
    "cbnCode": "090701",
    "paystackCode": "090701",
    "switchCode": "090701",
    "centiivCode": "090701",
    "aliases": [
      "isua mfb",
      "isua microfinance bank"
    ]
  },
  {
    "name": "ISUOFIA MICROFINANCE BANK",
    "cbnCode": "090353",
    "paystackCode": "",
    "switchCode": "090353",
    "centiivCode": "090353",
    "aliases": [
      "isuofia microfinance bank",
      "isuofia mfb"
    ]
  },
  {
    "name": "ITEX INTEGRATED SERVICES LIMITED",
    "cbnCode": "090211",
    "paystackCode": "",
    "switchCode": "090211",
    "centiivCode": "090211",
    "aliases": [
      "itex integrated services limited"
    ]
  },
  {
    "name": "Iwade Microfinance Bank Ltd",
    "cbnCode": "090578",
    "paystackCode": "",
    "switchCode": "090578",
    "centiivCode": "090578",
    "aliases": [
      "iwade microfinance bank ltd",
      "iwade mfb ltd"
    ]
  },
  {
    "name": "Iwoama Microfinance Bank",
    "cbnCode": "090543",
    "paystackCode": "",
    "switchCode": "090543",
    "centiivCode": "090543",
    "aliases": [
      "iwoama microfinance bank"
    ]
  },
  {
    "name": "Iyamoye Microfinance Bank Ltd",
    "cbnCode": "090570",
    "paystackCode": "",
    "switchCode": "090570",
    "centiivCode": "090570",
    "aliases": [
      "iyamoye microfinance bank ltd",
      "iyamoye microfinance bank"
    ]
  },
  {
    "name": "IYERU OKIN MICROFINANCE BANK LTD",
    "cbnCode": "090337",
    "paystackCode": "",
    "switchCode": "090337",
    "centiivCode": "090337",
    "aliases": [
      "iyeru okin microfinance bank ltd",
      "iyeru okin microfinance bank"
    ]
  },
  {
    "name": "Iyin Ekiti MFB",
    "cbnCode": "090620",
    "paystackCode": "",
    "switchCode": "090620",
    "centiivCode": "090620",
    "aliases": [
      "iyin ekiti mfb"
    ]
  },
  {
    "name": "IZON MICROFINANCE BANK",
    "cbnCode": "090421",
    "paystackCode": "",
    "switchCode": "090421",
    "centiivCode": "090421",
    "aliases": [
      "izon microfinance bank"
    ]
  },
  {
    "name": "Jaiz Bank",
    "cbnCode": "000006",
    "paystackCode": "301",
    "switchCode": "000006",
    "centiivCode": "000006",
    "aliases": [
      "jaiz",
      "jaiz bank"
    ]
  },
  {
    "name": "JESSEFIELD MICROFINANCE BANK",
    "cbnCode": "090352",
    "paystackCode": "",
    "switchCode": "090352",
    "centiivCode": "090352",
    "aliases": [
      "jessefield microfinance bank"
    ]
  },
  {
    "name": "JUBILEE LIFE",
    "cbnCode": "090003",
    "paystackCode": "",
    "switchCode": "090003",
    "centiivCode": "090003",
    "aliases": [
      "jubilee life",
      "jubilee-life mortgage bank"
    ]
  },
  {
    "name": "KADPOLY MICROFINANCE BANK",
    "cbnCode": "090320",
    "paystackCode": "",
    "switchCode": "090320",
    "centiivCode": "090320",
    "aliases": [
      "kadpoly microfinance bank"
    ]
  },
  {
    "name": "KADUPE MFB",
    "cbnCode": "090669",
    "paystackCode": "",
    "switchCode": "090669",
    "centiivCode": "090669",
    "aliases": [
      "kadupe mfb"
    ]
  },
  {
    "name": "KAIZEN MICROFINANCE BANK",
    "cbnCode": "090800",
    "paystackCode": "",
    "switchCode": "090800",
    "centiivCode": "090800",
    "aliases": [
      "kaizen microfinance bank"
    ]
  },
  {
    "name": "KANO POLY MFB",
    "cbnCode": "090592",
    "paystackCode": "51308",
    "switchCode": "090592",
    "centiivCode": "090592",
    "aliases": [
      "kano poly mfb",
      "kanopoly mfb"
    ]
  },
  {
    "name": "Katsu MFB",
    "cbnCode": "090749",
    "paystackCode": "",
    "switchCode": "090749",
    "centiivCode": "090749",
    "aliases": [
      "katsu mfb"
    ]
  },
  {
    "name": "KAYI MICROFINANCE BANK",
    "cbnCode": "090667",
    "paystackCode": "",
    "switchCode": "090667",
    "centiivCode": "090667",
    "aliases": [
      "kayi microfinance bank"
    ]
  },
  {
    "name": "Kayvee Microfinance Bank",
    "cbnCode": "090554",
    "paystackCode": "5129",
    "switchCode": "090554",
    "centiivCode": "090554",
    "aliases": [
      "kayvee microfinance bank"
    ]
  },
  {
    "name": "Kc Microfinance Bank",
    "cbnCode": "090549",
    "paystackCode": "",
    "switchCode": "090549",
    "centiivCode": "090549",
    "aliases": [
      "kc microfinance bank"
    ]
  },
  {
    "name": "KCMB MICROFINANCE BANK",
    "cbnCode": "090191",
    "paystackCode": "",
    "switchCode": "090191",
    "centiivCode": "090191",
    "aliases": [
      "kcmb microfinance bank"
    ]
  },
  {
    "name": "KEBBI STATE HOME SAVINGS AND LOANS LIMITED",
    "cbnCode": "070031",
    "paystackCode": "",
    "switchCode": "070031",
    "centiivCode": "070031",
    "aliases": [
      "kebbi state home savings and loans limited"
    ]
  },
  {
    "name": "KEGOW",
    "cbnCode": "100036",
    "paystackCode": "",
    "switchCode": "100036",
    "centiivCode": "100036",
    "aliases": [
      "kegow",
      "kegow (chamsmobile)"
    ]
  },
  {
    "name": "KEGOW",
    "cbnCode": "100015",
    "paystackCode": "",
    "switchCode": "100015",
    "centiivCode": "100015",
    "aliases": [
      "kegow"
    ]
  },
  {
    "name": "KENECHUKWU MICROFINANCE BANK",
    "cbnCode": "090602",
    "paystackCode": "",
    "switchCode": "090602",
    "centiivCode": "090602",
    "aliases": [
      "kenechukwu microfinance bank"
    ]
  },
  {
    "name": "Keystone Bank",
    "cbnCode": "000002",
    "paystackCode": "082",
    "switchCode": "000002",
    "centiivCode": "000002",
    "aliases": [
      "keystone",
      "keystone bank"
    ]
  },
  {
    "name": "Kingdom College Microfinance Bank",
    "cbnCode": "090487",
    "paystackCode": "",
    "switchCode": "090487",
    "centiivCode": "090487",
    "aliases": [
      "kingdom college microfinance bank"
    ]
  },
  {
    "name": "KKU MFB",
    "cbnCode": "090606",
    "paystackCode": "",
    "switchCode": "090606",
    "centiivCode": "090606",
    "aliases": [
      "kku mfb",
      "kku microfinance bank"
    ]
  },
  {
    "name": "KOINS MFB",
    "cbnCode": "090839",
    "paystackCode": "",
    "switchCode": "090839",
    "centiivCode": "090839",
    "aliases": [
      "koins mfb"
    ]
  },
  {
    "name": "KOLOMONI MICROFINANCE BANK",
    "cbnCode": "090480",
    "paystackCode": "",
    "switchCode": "090480",
    "centiivCode": "090480",
    "aliases": [
      "kolomoni microfinance bank",
      "cintrust microfinance bank"
    ]
  },
  {
    "name": "KONGAPAY",
    "cbnCode": "100025",
    "paystackCode": "100025",
    "switchCode": "100025",
    "centiivCode": "100025",
    "aliases": [
      "kongapay",
      "zinternet nigera limited",
      "kongapay (kongapay technologies limited)(formerly zinternet)"
    ]
  },
  {
    "name": "KONTAGORA MICROFINANCE BANK",
    "cbnCode": "090299",
    "paystackCode": "",
    "switchCode": "090299",
    "centiivCode": "090299",
    "aliases": [
      "kontagora microfinance bank"
    ]
  },
  {
    "name": "Kopo Kope MFB",
    "cbnCode": "090617",
    "paystackCode": "",
    "switchCode": "090617",
    "centiivCode": "090617",
    "aliases": [
      "kopo kope mfb"
    ]
  },
  {
    "name": "KREDI MONEY MICROFINANCE BANK",
    "cbnCode": "090380",
    "paystackCode": "",
    "switchCode": "090380",
    "centiivCode": "090380",
    "aliases": [
      "kredi money microfinance bank",
      "conpro microfinance bank"
    ]
  },
  {
    "name": "Kuda Bank",
    "cbnCode": "090267",
    "paystackCode": "50211",
    "switchCode": "090267",
    "centiivCode": "090267",
    "aliases": [
      "kuda",
      "kuda bank",
      "kuda mfb",
      "kuda microfinance bank"
    ]
  },
  {
    "name": "Kwasu MF Bank",
    "cbnCode": "090450",
    "paystackCode": "",
    "switchCode": "090450",
    "centiivCode": "090450",
    "aliases": [
      "kwasu mf bank",
      "kwasu mfb"
    ]
  },
  {
    "name": "LAGOS BUILDING AND INVESTMENT COMPANY",
    "cbnCode": "070012",
    "paystackCode": "",
    "switchCode": "070012",
    "centiivCode": "070012",
    "aliases": [
      "lagos building and investment company",
      "lagos building investment company"
    ]
  },
  {
    "name": "LANDGOLD MICROFINANCE BANK",
    "cbnCode": "090422",
    "paystackCode": "",
    "switchCode": "090422",
    "centiivCode": "090422",
    "aliases": [
      "landgold microfinance bank"
    ]
  },
  {
    "name": "LAPO MICROFINANCE BANK",
    "cbnCode": "090177",
    "paystackCode": "",
    "switchCode": "090177",
    "centiivCode": "090177",
    "aliases": [
      "lapo microfinance bank"
    ]
  },
  {
    "name": "LAVENDER MICROFINANCE BANK",
    "cbnCode": "090271",
    "paystackCode": "",
    "switchCode": "090271",
    "centiivCode": "090271",
    "aliases": [
      "lavender microfinance bank"
    ]
  },
  {
    "name": "LAWYERS MFB",
    "cbnCode": "090724",
    "paystackCode": "",
    "switchCode": "090724",
    "centiivCode": "090724",
    "aliases": [
      "lawyers mfb"
    ]
  },
  {
    "name": "Leadcity MFB",
    "cbnCode": "090650",
    "paystackCode": "",
    "switchCode": "090650",
    "centiivCode": "090650",
    "aliases": [
      "leadcity mfb"
    ]
  },
  {
    "name": "Leadremit Limited",
    "cbnCode": "110044",
    "paystackCode": "",
    "switchCode": "110044",
    "centiivCode": "110044",
    "aliases": [
      "leadremit limited"
    ]
  },
  {
    "name": "LEGEND MICROFINANCE BANK",
    "cbnCode": "090372",
    "paystackCode": "",
    "switchCode": "090372",
    "centiivCode": "090372",
    "aliases": [
      "legend microfinance bank"
    ]
  },
  {
    "name": "Lemmy MFB",
    "cbnCode": "091003",
    "paystackCode": "",
    "switchCode": "091003",
    "centiivCode": "091003",
    "aliases": [
      "lemmy mfb"
    ]
  },
  {
    "name": "LETSHEGO MFB",
    "cbnCode": "090420",
    "paystackCode": "090420",
    "switchCode": "090420",
    "centiivCode": "090420",
    "aliases": [
      "letshego mfb",
      "letshego microfinance bank"
    ]
  },
  {
    "name": "LEVITE MFB",
    "cbnCode": "090731",
    "paystackCode": "",
    "switchCode": "090731",
    "centiivCode": "090731",
    "aliases": [
      "levite mfb"
    ]
  },
  {
    "name": "Lifegate Microfinance Bank Ltd",
    "cbnCode": "090557",
    "paystackCode": "",
    "switchCode": "090557",
    "centiivCode": "090557",
    "aliases": [
      "lifegate microfinance bank ltd",
      "lifegate microfinance bank"
    ]
  },
  {
    "name": "Light Microfinance Bank",
    "cbnCode": "090477",
    "paystackCode": "",
    "switchCode": "090477",
    "centiivCode": "090477",
    "aliases": [
      "light microfinance bank",
      "light mfb"
    ]
  },
  {
    "name": "LIGHTWAY MFB",
    "cbnCode": "090807",
    "paystackCode": "",
    "switchCode": "090807",
    "centiivCode": "090807",
    "aliases": [
      "lightway mfb",
      "lightway microfinance bank"
    ]
  },
  {
    "name": "LINKS MICROFINANCE BANK",
    "cbnCode": "090435",
    "paystackCode": "",
    "switchCode": "090435",
    "centiivCode": "090435",
    "aliases": [
      "links microfinance bank",
      "links mfb"
    ]
  },
  {
    "name": "LiquidCrest MFB",
    "cbnCode": "090780",
    "paystackCode": "",
    "switchCode": "090780",
    "centiivCode": "090780",
    "aliases": [
      "liquidcrest mfb"
    ]
  },
  {
    "name": "LIVINGTRUST MORTGAGE BANK PLC",
    "cbnCode": "070007",
    "paystackCode": "",
    "switchCode": "070007",
    "centiivCode": "070007",
    "aliases": [
      "livingtrust mortgage bank plc",
      "omoluabi savings and loans"
    ]
  },
  {
    "name": "Lobrem Microfinance Bank",
    "cbnCode": "090537",
    "paystackCode": "",
    "switchCode": "090537",
    "centiivCode": "090537",
    "aliases": [
      "lobrem microfinance bank"
    ]
  },
  {
    "name": "LOMA MFB",
    "cbnCode": "50491",
    "paystackCode": "50491",
    "switchCode": "50491",
    "centiivCode": "50491",
    "aliases": [
      "loma mfb"
    ]
  },
  {
    "name": "Lotus Bank",
    "cbnCode": "000029",
    "paystackCode": "303",
    "switchCode": "000029",
    "centiivCode": "000029",
    "aliases": [
      "lotus",
      "lotus bank"
    ]
  },
  {
    "name": "LOVONUS MICROFINANCE BANK",
    "cbnCode": "090265",
    "paystackCode": "",
    "switchCode": "090265",
    "centiivCode": "090265",
    "aliases": [
      "lovonus microfinance bank"
    ]
  },
  {
    "name": "Lukefield Finance Company Limited",
    "cbnCode": "050015",
    "paystackCode": "",
    "switchCode": "050015",
    "centiivCode": "050015",
    "aliases": [
      "lukefield finance company limited"
    ]
  },
  {
    "name": "M36",
    "cbnCode": "100035",
    "paystackCode": "",
    "switchCode": "100035",
    "centiivCode": "100035",
    "aliases": [
      "m36"
    ]
  },
  {
    "name": "MAAL MFB",
    "cbnCode": "090764",
    "paystackCode": "51444",
    "switchCode": "090764",
    "centiivCode": "090764",
    "aliases": [
      "maal mfb"
    ]
  },
  {
    "name": "Mab Allianz MFB",
    "cbnCode": "090623",
    "paystackCode": "",
    "switchCode": "090623",
    "centiivCode": "090623",
    "aliases": [
      "mab allianz mfb"
    ]
  },
  {
    "name": "Mabinas MFB",
    "cbnCode": "090630",
    "paystackCode": "",
    "switchCode": "090630",
    "centiivCode": "090630",
    "aliases": [
      "mabinas mfb"
    ]
  },
  {
    "name": "Macrod MFB",
    "cbnCode": "090603",
    "paystackCode": "",
    "switchCode": "090603",
    "centiivCode": "090603",
    "aliases": [
      "macrod mfb"
    ]
  },
  {
    "name": "MADOBI MFB",
    "cbnCode": "090605",
    "paystackCode": "",
    "switchCode": "090605",
    "centiivCode": "090605",
    "aliases": [
      "madobi mfb"
    ]
  },
  {
    "name": "MAESTRO MFB",
    "cbnCode": "090746",
    "paystackCode": "",
    "switchCode": "090746",
    "centiivCode": "090746",
    "aliases": [
      "maestro mfb"
    ]
  },
  {
    "name": "MAHFUZ MFB",
    "cbnCode": "090825",
    "paystackCode": "",
    "switchCode": "090825",
    "centiivCode": "090825",
    "aliases": [
      "mahfuz mfb"
    ]
  },
  {
    "name": "MAINLAND MICROFINANCE BANK",
    "cbnCode": "090323",
    "paystackCode": "",
    "switchCode": "090323",
    "centiivCode": "090323",
    "aliases": [
      "mainland microfinance bank"
    ]
  },
  {
    "name": "Mainstreet Microfinance Bank",
    "cbnCode": "090171",
    "paystackCode": "090171",
    "switchCode": "090171",
    "centiivCode": "090171",
    "aliases": [
      "mainstreet",
      "mainstreet mfb",
      "mainstreet microfinance bank",
      "ikoyi osun mfb"
    ]
  },
  {
    "name": "Maintrust Microfinance Bank",
    "cbnCode": "090465",
    "paystackCode": "",
    "switchCode": "090465",
    "centiivCode": "090465",
    "aliases": [
      "maintrust microfinance bank"
    ]
  },
  {
    "name": "MALACHY MICROFINANCE BANK",
    "cbnCode": "090174",
    "paystackCode": "",
    "switchCode": "090174",
    "centiivCode": "090174",
    "aliases": [
      "malachy microfinance bank"
    ]
  },
  {
    "name": "MANNY MICROFINANCE BANK",
    "cbnCode": "090383",
    "paystackCode": "",
    "switchCode": "090383",
    "centiivCode": "090383",
    "aliases": [
      "manny microfinance bank"
    ]
  },
  {
    "name": "MAUTECH MICROFINANCE BANK",
    "cbnCode": "090423",
    "paystackCode": "",
    "switchCode": "090423",
    "centiivCode": "090423",
    "aliases": [
      "mautech microfinance bank"
    ]
  },
  {
    "name": "MAYFAIR MICROFINANCE BANK",
    "cbnCode": "090321",
    "paystackCode": "",
    "switchCode": "090321",
    "centiivCode": "090321",
    "aliases": [
      "mayfair microfinance bank"
    ]
  },
  {
    "name": "MAYFRESH MORTGAGE BANK",
    "cbnCode": "070019",
    "paystackCode": "",
    "switchCode": "070019",
    "centiivCode": "070019",
    "aliases": [
      "mayfresh mortgage bank"
    ]
  },
  {
    "name": "Medef Microfinance Bank",
    "cbnCode": "090612",
    "paystackCode": "",
    "switchCode": "090612",
    "centiivCode": "090612",
    "aliases": [
      "medef microfinance bank"
    ]
  },
  {
    "name": "Mega MFB",
    "cbnCode": "090824",
    "paystackCode": "",
    "switchCode": "090824",
    "centiivCode": "090824",
    "aliases": [
      "mega mfb",
      "mega mfb"
    ]
  },
  {
    "name": "MEGAPRAISE MICROFINANCE BANK",
    "cbnCode": "090280",
    "paystackCode": "",
    "switchCode": "090280",
    "centiivCode": "090280",
    "aliases": [
      "megapraise microfinance bank"
    ]
  },
  {
    "name": "MEMENTO MFB",
    "cbnCode": "090867",
    "paystackCode": "",
    "switchCode": "090867",
    "centiivCode": "090867",
    "aliases": [
      "memento mfb"
    ]
  },
  {
    "name": "MEMPHIS MICROFINANCE BANK",
    "cbnCode": "090432",
    "paystackCode": "",
    "switchCode": "090432",
    "centiivCode": "090432",
    "aliases": [
      "memphis microfinance bank"
    ]
  },
  {
    "name": "Mercury MFB",
    "cbnCode": "090589",
    "paystackCode": "",
    "switchCode": "090589",
    "centiivCode": "090589",
    "aliases": [
      "mercury mfb"
    ]
  },
  {
    "name": "Mgbidi Microfinance Bank",
    "cbnCode": "090528",
    "paystackCode": "",
    "switchCode": "090528",
    "centiivCode": "090528",
    "aliases": [
      "mgbidi microfinance bank"
    ]
  },
  {
    "name": "MICHAEL OKPARA UNIAGRIC MICROFINANCE BANK",
    "cbnCode": "090659",
    "paystackCode": "",
    "switchCode": "090659",
    "centiivCode": "090659",
    "aliases": [
      "michael okpara uniagric microfinance bank"
    ]
  },
  {
    "name": "Microbiz Microfinance Bank",
    "cbnCode": "090587",
    "paystackCode": "",
    "switchCode": "090587",
    "centiivCode": "090587",
    "aliases": [
      "microbiz microfinance bank",
      "microbiz mfb"
    ]
  },
  {
    "name": "MICROVIS MICROFINANCE BANK",
    "cbnCode": "090113",
    "paystackCode": "",
    "switchCode": "090113",
    "centiivCode": "090113",
    "aliases": [
      "microvis microfinance bank"
    ]
  },
  {
    "name": "MIDLAND MICROFINANCE BANK",
    "cbnCode": "090192",
    "paystackCode": "",
    "switchCode": "090192",
    "centiivCode": "090192",
    "aliases": [
      "midland microfinance bank"
    ]
  },
  {
    "name": "MINJIBIR MFB",
    "cbnCode": "090607",
    "paystackCode": "",
    "switchCode": "090607",
    "centiivCode": "090607",
    "aliases": [
      "minjibir mfb"
    ]
  },
  {
    "name": "MINT MFB",
    "cbnCode": "090763",
    "paystackCode": "50304",
    "switchCode": "090763",
    "centiivCode": "090763",
    "aliases": [
      "mint mfb",
      "mint microfinance bank"
    ]
  },
  {
    "name": "MINT-FINEX MFB",
    "cbnCode": "090281",
    "paystackCode": "09",
    "switchCode": "090281",
    "centiivCode": "090281",
    "aliases": [
      "mint-finex mfb",
      "mintfinex microfinance bank"
    ]
  },
  {
    "name": "MKOBO MICROFINANCE BANK LTD",
    "cbnCode": "090455",
    "paystackCode": "",
    "switchCode": "090455",
    "centiivCode": "090455",
    "aliases": [
      "mkobo microfinance bank ltd",
      "mkobo microfinance bank"
    ]
  },
  {
    "name": "MKUDI",
    "cbnCode": "100011",
    "paystackCode": "",
    "switchCode": "100011",
    "centiivCode": "100011",
    "aliases": [
      "mkudi"
    ]
  },
  {
    "name": "MODEL MICROFINANCE BANK",
    "cbnCode": "090775",
    "paystackCode": "",
    "switchCode": "090775",
    "centiivCode": "090775",
    "aliases": [
      "model microfinance bank"
    ]
  },
  {
    "name": "MOLUSI MICROFINANCE BANK",
    "cbnCode": "090362",
    "paystackCode": "",
    "switchCode": "090362",
    "centiivCode": "090362",
    "aliases": [
      "molusi microfinance bank"
    ]
  },
  {
    "name": "Monarch Microfinance Bank",
    "cbnCode": "090462",
    "paystackCode": "",
    "switchCode": "090462",
    "centiivCode": "090462",
    "aliases": [
      "monarch microfinance bank"
    ]
  },
  {
    "name": "MONEY BOX",
    "cbnCode": "100020",
    "paystackCode": "",
    "switchCode": "100020",
    "centiivCode": "100020",
    "aliases": [
      "money box",
      "moneybox"
    ]
  },
  {
    "name": "MONEY MASTER PSB",
    "cbnCode": "120005",
    "paystackCode": "946",
    "switchCode": "120005",
    "centiivCode": "120005",
    "aliases": [
      "money master psb"
    ]
  },
  {
    "name": "MONEY TRUST MICROFINANCE BANK",
    "cbnCode": "090129",
    "paystackCode": "",
    "switchCode": "090129",
    "centiivCode": "090129",
    "aliases": [
      "money trust microfinance bank"
    ]
  },
  {
    "name": "Moneytronics MFB",
    "cbnCode": "090692",
    "paystackCode": "",
    "switchCode": "090692",
    "centiivCode": "090692",
    "aliases": [
      "moneytronics mfb"
    ]
  },
  {
    "name": "Moniepoint MFB",
    "cbnCode": "090405",
    "paystackCode": "50515",
    "switchCode": "090405",
    "centiivCode": "090405",
    "aliases": [
      "moniepoint",
      "monie point",
      "moniepoint mfb",
      "moniepoint microfinance bank"
    ]
  },
  {
    "name": "Moremonee MFB",
    "cbnCode": "090685",
    "paystackCode": "",
    "switchCode": "090685",
    "centiivCode": "090685",
    "aliases": [
      "moremonee mfb",
      "moremonee microfinance bank limited"
    ]
  },
  {
    "name": "Movasco-op MFB",
    "cbnCode": "090979",
    "paystackCode": "",
    "switchCode": "090979",
    "centiivCode": "090979",
    "aliases": [
      "movasco-op mfb"
    ]
  },
  {
    "name": "Moyofade MF Bank",
    "cbnCode": "090448",
    "paystackCode": "",
    "switchCode": "090448",
    "centiivCode": "090448",
    "aliases": [
      "moyofade mf bank",
      "moyofade microfinance bank"
    ]
  },
  {
    "name": "MOZFIN MICROFINANCE BANK",
    "cbnCode": "090392",
    "paystackCode": "",
    "switchCode": "090392",
    "centiivCode": "090392",
    "aliases": [
      "mozfin microfinance bank"
    ]
  },
  {
    "name": "MTN Momo PSB",
    "cbnCode": "120003",
    "paystackCode": "120003",
    "switchCode": "120003",
    "centiivCode": "120003",
    "aliases": [
      "momo",
      "momo psb",
      "mtn momo",
      "mtn momo psb",
      "momo payment service bank"
    ]
  },
  {
    "name": "Mutual Trust Microfinance Bank",
    "cbnCode": "090190",
    "paystackCode": "090190",
    "switchCode": "090190",
    "centiivCode": "090190",
    "aliases": [
      "mutual trust",
      "mutual trust mfb",
      "mutual benefits microfinance bank",
      "mayfair mfb"
    ]
  },
  {
    "name": "MUTUAL TRUST MICROFINANCE BANK",
    "cbnCode": "090151",
    "paystackCode": "",
    "switchCode": "090151",
    "centiivCode": "090151",
    "aliases": [
      "mutual trust microfinance bank"
    ]
  },
  {
    "name": "NAF MFB",
    "cbnCode": "090740",
    "paystackCode": "",
    "switchCode": "090740",
    "centiivCode": "090740",
    "aliases": [
      "naf mfb"
    ]
  },
  {
    "name": "NAGARTA MICROFINANCE BANK",
    "cbnCode": "090152",
    "paystackCode": "",
    "switchCode": "090152",
    "centiivCode": "090152",
    "aliases": [
      "nagarta microfinance bank"
    ]
  },
  {
    "name": "NASARAWA MICROFINANCE BANK",
    "cbnCode": "090349",
    "paystackCode": "",
    "switchCode": "090349",
    "centiivCode": "090349",
    "aliases": [
      "nasarawa microfinance bank",
      "nassarawa microfinance bank"
    ]
  },
  {
    "name": "NDDC MFB",
    "cbnCode": "090679",
    "paystackCode": "090679",
    "switchCode": "090679",
    "centiivCode": "090679",
    "aliases": [
      "nddc mfb",
      "ndcc microfinance bank"
    ]
  },
  {
    "name": "NDIORAH MICROFINANCE BANK",
    "cbnCode": "090128",
    "paystackCode": "",
    "switchCode": "090128",
    "centiivCode": "090128",
    "aliases": [
      "ndiorah microfinance bank"
    ]
  },
  {
    "name": "NEPTUNE MICROFINANCE BANK",
    "cbnCode": "090329",
    "paystackCode": "",
    "switchCode": "090329",
    "centiivCode": "090329",
    "aliases": [
      "neptune microfinance bank"
    ]
  },
  {
    "name": "NET MICROFINANCE BANK",
    "cbnCode": "51361",
    "paystackCode": "51361",
    "switchCode": "51361",
    "centiivCode": "51361",
    "aliases": [
      "net microfinance bank"
    ]
  },
  {
    "name": "NEW DAWN MICROFINANCE BANK",
    "cbnCode": "090205",
    "paystackCode": "",
    "switchCode": "090205",
    "centiivCode": "090205",
    "aliases": [
      "new dawn microfinance bank"
    ]
  },
  {
    "name": "NEW GOLDEN PASTURES MICROFINANCE BANK",
    "cbnCode": "090378",
    "paystackCode": "",
    "switchCode": "090378",
    "centiivCode": "090378",
    "aliases": [
      "new golden pastures microfinance bank"
    ]
  },
  {
    "name": "NEW PRUDENTIAL BANK",
    "cbnCode": "090108",
    "paystackCode": "",
    "switchCode": "090108",
    "centiivCode": "090108",
    "aliases": [
      "new prudential bank"
    ]
  },
  {
    "name": "NEWEDGE FINANCE LTD",
    "cbnCode": "050004",
    "paystackCode": "",
    "switchCode": "050004",
    "centiivCode": "050004",
    "aliases": [
      "newedge finance ltd"
    ]
  },
  {
    "name": "NEXIM Bank",
    "cbnCode": "030001",
    "paystackCode": "",
    "switchCode": "030001",
    "centiivCode": "030001",
    "aliases": [
      "nexim bank"
    ]
  },
  {
    "name": "NEXTON MICROFINANCE BANK",
    "cbnCode": "090818",
    "paystackCode": "",
    "switchCode": "090818",
    "centiivCode": "090818",
    "aliases": [
      "nexton microfinance bank",
      "nexton microfinance bank"
    ]
  },
  {
    "name": "Nice Microfinance Bank",
    "cbnCode": "090459",
    "paystackCode": "",
    "switchCode": "090459",
    "centiivCode": "090459",
    "aliases": [
      "nice microfinance bank"
    ]
  },
  {
    "name": "Nigeria Prisons Microfinance Bank",
    "cbnCode": "090505",
    "paystackCode": "",
    "switchCode": "090505",
    "centiivCode": "090505",
    "aliases": [
      "nigeria prisons microfinance bank",
      "nigerian prisons microfinance bank"
    ]
  },
  {
    "name": "NIGERIAN NAVY MICROFINANCE BANK",
    "cbnCode": "090263",
    "paystackCode": "",
    "switchCode": "090263",
    "centiivCode": "090263",
    "aliases": [
      "nigerian navy microfinance bank",
      "navy microfinance bank"
    ]
  },
  {
    "name": "NIP VIRTUAL BANK",
    "cbnCode": "999999",
    "paystackCode": "",
    "switchCode": "999999",
    "centiivCode": "999999",
    "aliases": [
      "nip virtual bank"
    ]
  },
  {
    "name": "NIRSAL NATIONAL MICROFINANCE BANK",
    "cbnCode": "090194",
    "paystackCode": "",
    "switchCode": "090194",
    "centiivCode": "090194",
    "aliases": [
      "nirsal national microfinance bank",
      "nirsal microfinance bank"
    ]
  },
  {
    "name": "Nkpolu-Ust Microfinance",
    "cbnCode": "090535",
    "paystackCode": "",
    "switchCode": "090535",
    "centiivCode": "090535",
    "aliases": [
      "nkpolu-ust microfinance",
      "nkpolu-ust mfb"
    ]
  },
  {
    "name": "NNEW WOMEN MICROFINANCE BANK",
    "cbnCode": "090283",
    "paystackCode": "",
    "switchCode": "090283",
    "centiivCode": "090283",
    "aliases": [
      "nnew women microfinance bank"
    ]
  },
  {
    "name": "NOMASE MFB",
    "cbnCode": "090736",
    "paystackCode": "",
    "switchCode": "090736",
    "centiivCode": "090736",
    "aliases": [
      "nomase mfb"
    ]
  },
  {
    "name": "Nomba Financial Services Limited",
    "cbnCode": "110028",
    "paystackCode": "",
    "switchCode": "110028",
    "centiivCode": "110028",
    "aliases": [
      "nomba financial services limited",
      "alternative bank limited"
    ]
  },
  {
    "name": "Nombank MFB",
    "cbnCode": "090645",
    "paystackCode": "50072",
    "switchCode": "090645",
    "centiivCode": "090645",
    "aliases": [
      "nombank mfb"
    ]
  },
  {
    "name": "NORTHQUEST FINANCE",
    "cbnCode": "050030",
    "paystackCode": "",
    "switchCode": "050030",
    "centiivCode": "050030",
    "aliases": [
      "northquest finance"
    ]
  },
  {
    "name": "Noun MFB",
    "cbnCode": "090822",
    "paystackCode": "",
    "switchCode": "090822",
    "centiivCode": "090822",
    "aliases": [
      "noun mfb"
    ]
  },
  {
    "name": "NOVA BANK",
    "cbnCode": "561",
    "paystackCode": "561",
    "switchCode": "561",
    "centiivCode": "561",
    "aliases": [
      "nova bank"
    ]
  },
  {
    "name": "NOVA MERCHANT BANK",
    "cbnCode": "060003",
    "paystackCode": "",
    "switchCode": "060003",
    "centiivCode": "060003",
    "aliases": [
      "nova merchant bank"
    ]
  },
  {
    "name": "NOVUS MFB",
    "cbnCode": "090734",
    "paystackCode": "51371",
    "switchCode": "090734",
    "centiivCode": "090734",
    "aliases": [
      "novus mfb"
    ]
  },
  {
    "name": "NOWNOW DIGITAL SYSTEMS LIMITED",
    "cbnCode": "100032",
    "paystackCode": "",
    "switchCode": "100032",
    "centiivCode": "100032",
    "aliases": [
      "nownow digital systems limited",
      "contec global infotech limited (nownow)"
    ]
  },
  {
    "name": "NPF MICROFINANCE BANK",
    "cbnCode": "070001",
    "paystackCode": "50629",
    "switchCode": "070001",
    "centiivCode": "070001",
    "aliases": [
      "npf microfinance bank"
    ]
  },
  {
    "name": "Nsehe MFB",
    "cbnCode": "090628",
    "paystackCode": "",
    "switchCode": "090628",
    "centiivCode": "090628",
    "aliases": [
      "nsehe mfb"
    ]
  },
  {
    "name": "NSUK MICROFINANACE BANK",
    "cbnCode": "51261",
    "paystackCode": "51261",
    "switchCode": "51261",
    "centiivCode": "51261",
    "aliases": [
      "nsuk microfinanace bank"
    ]
  },
  {
    "name": "Nsuk Microfinance Bank",
    "cbnCode": "090491",
    "paystackCode": "",
    "switchCode": "090491",
    "centiivCode": "090491",
    "aliases": [
      "nsuk microfinance bank",
      "nsuk mfb"
    ]
  },
  {
    "name": "NUGGETS MFB",
    "cbnCode": "090676",
    "paystackCode": "",
    "switchCode": "090676",
    "centiivCode": "090676",
    "aliases": [
      "nuggets mfb"
    ]
  },
  {
    "name": "Numo Microfinance Bank",
    "cbnCode": "090516",
    "paystackCode": "",
    "switchCode": "090516",
    "centiivCode": "090516",
    "aliases": [
      "numo microfinance bank"
    ]
  },
  {
    "name": "NUTURE MICROFINANCE BANK",
    "cbnCode": "090364",
    "paystackCode": "",
    "switchCode": "090364",
    "centiivCode": "090364",
    "aliases": [
      "nuture microfinance bank"
    ]
  },
  {
    "name": "NWANNEGADI MICROFINANCE BANK",
    "cbnCode": "090399",
    "paystackCode": "",
    "switchCode": "090399",
    "centiivCode": "090399",
    "aliases": [
      "nwannegadi microfinance bank"
    ]
  },
  {
    "name": "OAKLAND MICROFINANCE BANK",
    "cbnCode": "090437",
    "paystackCode": "",
    "switchCode": "090437",
    "centiivCode": "090437",
    "aliases": [
      "oakland microfinance bank"
    ]
  },
  {
    "name": "OAU MICROFINANCE BANK LTD",
    "cbnCode": "090345",
    "paystackCode": "",
    "switchCode": "090345",
    "centiivCode": "090345",
    "aliases": [
      "oau microfinance bank ltd",
      "oau microfinance bank"
    ]
  },
  {
    "name": "OBELEDU MFB",
    "cbnCode": "090755",
    "paystackCode": "",
    "switchCode": "090755",
    "centiivCode": "090755",
    "aliases": [
      "obeledu mfb"
    ]
  },
  {
    "name": "OBOLLO MFB",
    "cbnCode": "090810",
    "paystackCode": "",
    "switchCode": "090810",
    "centiivCode": "090810",
    "aliases": [
      "obollo mfb",
      "obollo mfb"
    ]
  },
  {
    "name": "OCHE MICROFINANCE BANK",
    "cbnCode": "090333",
    "paystackCode": "",
    "switchCode": "090333",
    "centiivCode": "090333",
    "aliases": [
      "oche microfinance bank"
    ]
  },
  {
    "name": "Octopus Microfinance Bank Ltd",
    "cbnCode": "090576",
    "paystackCode": "",
    "switchCode": "090576",
    "centiivCode": "090576",
    "aliases": [
      "octopus microfinance bank ltd",
      "octopus microfinance bank"
    ]
  },
  {
    "name": "Odoakpu MFB",
    "cbnCode": "090654",
    "paystackCode": "",
    "switchCode": "090654",
    "centiivCode": "090654",
    "aliases": [
      "odoakpu mfb"
    ]
  },
  {
    "name": "OGBERURU MFB",
    "cbnCode": "090738",
    "paystackCode": "",
    "switchCode": "090738",
    "centiivCode": "090738",
    "aliases": [
      "ogberuru mfb"
    ]
  },
  {
    "name": "OGIGE MFB",
    "cbnCode": "090739",
    "paystackCode": "",
    "switchCode": "090739",
    "centiivCode": "090739",
    "aliases": [
      "ogige mfb"
    ]
  },
  {
    "name": "OHAFIA MICROFINANCE BANK",
    "cbnCode": "090119",
    "paystackCode": "",
    "switchCode": "090119",
    "centiivCode": "090119",
    "aliases": [
      "ohafia microfinance bank"
    ]
  },
  {
    "name": "Ohha MFB",
    "cbnCode": "090626",
    "paystackCode": "",
    "switchCode": "090626",
    "centiivCode": "090626",
    "aliases": [
      "ohha mfb"
    ]
  },
  {
    "name": "Ojokoro Microfinance Bank",
    "cbnCode": "090527",
    "paystackCode": "",
    "switchCode": "090527",
    "centiivCode": "090527",
    "aliases": [
      "ojokoro microfinance bank"
    ]
  },
  {
    "name": "Oke-Aro Oredegbe Microfinance Bank Ltd",
    "cbnCode": "090565",
    "paystackCode": "",
    "switchCode": "090565",
    "centiivCode": "090565",
    "aliases": [
      "oke-aro oredegbe microfinance bank ltd",
      "oke-aro oredegbe microfinance bank"
    ]
  },
  {
    "name": "Okengwe MFB",
    "cbnCode": "090646",
    "paystackCode": "",
    "switchCode": "090646",
    "centiivCode": "090646",
    "aliases": [
      "okengwe mfb"
    ]
  },
  {
    "name": "OKO MFB",
    "cbnCode": "090348",
    "paystackCode": "",
    "switchCode": "090348",
    "centiivCode": "090348",
    "aliases": [
      "oko mfb"
    ]
  },
  {
    "name": "OKPOGA MICROFINANCE BANK",
    "cbnCode": "090161",
    "paystackCode": "",
    "switchCode": "090161",
    "centiivCode": "090161",
    "aliases": [
      "okpoga microfinance bank"
    ]
  },
  {
    "name": "Okuku Microfinance Bank Ltd",
    "cbnCode": "090566",
    "paystackCode": "",
    "switchCode": "090566",
    "centiivCode": "090566",
    "aliases": [
      "okuku microfinance bank ltd",
      "okuku microfinance bank"
    ]
  },
  {
    "name": "OKWO-OHA MFB",
    "cbnCode": "090752",
    "paystackCode": "",
    "switchCode": "090752",
    "centiivCode": "090752",
    "aliases": [
      "okwo-oha mfb",
      "ubj mfb"
    ]
  },
  {
    "name": "OLABISI ONABANJO UNIVERSITY MICROFINANCE",
    "cbnCode": "090272",
    "paystackCode": "",
    "switchCode": "090272",
    "centiivCode": "090272",
    "aliases": [
      "olabisi onabanjo university microfinance",
      "olabisi onabanjo university microfinance bank"
    ]
  },
  {
    "name": "OLD SHOREHAM MICROFINANCE BANK",
    "cbnCode": "090410",
    "paystackCode": "",
    "switchCode": "090410",
    "centiivCode": "090410",
    "aliases": [
      "old shoreham microfinance bank",
      "maritime microfinance bank"
    ]
  },
  {
    "name": "OLIVE MFB",
    "cbnCode": "090696",
    "paystackCode": "",
    "switchCode": "090696",
    "centiivCode": "090696",
    "aliases": [
      "olive mfb"
    ]
  },
  {
    "name": "Olofin Owena Microfinance Bank",
    "cbnCode": "090468",
    "paystackCode": "",
    "switchCode": "090468",
    "centiivCode": "090468",
    "aliases": [
      "olofin owena microfinance bank"
    ]
  },
  {
    "name": "OLOMU APERAN MFB",
    "cbnCode": "090852",
    "paystackCode": "",
    "switchCode": "090852",
    "centiivCode": "090852",
    "aliases": [
      "olomu aperan mfb"
    ]
  },
  {
    "name": "Oluchukwu Microfinance Bank",
    "cbnCode": "090471",
    "paystackCode": "",
    "switchCode": "090471",
    "centiivCode": "090471",
    "aliases": [
      "oluchukwu microfinance bank"
    ]
  },
  {
    "name": "Oluyole Microfinance Bank",
    "cbnCode": "090460",
    "paystackCode": "",
    "switchCode": "090460",
    "centiivCode": "090460",
    "aliases": [
      "oluyole microfinance bank"
    ]
  },
  {
    "name": "OMAK MICROFINANCE BANK",
    "cbnCode": "090700",
    "paystackCode": "",
    "switchCode": "090700",
    "centiivCode": "090700",
    "aliases": [
      "omak microfinance bank",
      "omak mfb"
    ]
  },
  {
    "name": "OMIYE MICROFINANCE BANK",
    "cbnCode": "090295",
    "paystackCode": "",
    "switchCode": "090295",
    "centiivCode": "090295",
    "aliases": [
      "omiye microfinance bank"
    ]
  },
  {
    "name": "OPay Digital Services Limited (OPay)",
    "cbnCode": "100004",
    "paystackCode": "999992",
    "switchCode": "100004",
    "centiivCode": "100004",
    "aliases": [
      "opay",
      "paycom",
      "paycom opay",
      "paycom(opay)",
      "opay digital",
      "opay digital services limited (opay)"
    ]
  },
  {
    "name": "Optimus Bank",
    "cbnCode": "000036",
    "paystackCode": "107",
    "switchCode": "000036",
    "centiivCode": "000036",
    "aliases": [
      "optimus",
      "optimus bank",
      "optimus bank limited"
    ]
  },
  {
    "name": "Oraukwu Microfinance Bank",
    "cbnCode": "090492",
    "paystackCode": "",
    "switchCode": "090492",
    "centiivCode": "090492",
    "aliases": [
      "oraukwu microfinance bank",
      "oraukwu mfb"
    ]
  },
  {
    "name": "Orisun MFB",
    "cbnCode": "090588",
    "paystackCode": "",
    "switchCode": "090588",
    "centiivCode": "090588",
    "aliases": [
      "orisun mfb"
    ]
  },
  {
    "name": "Orokam Microfinance Bank Ltd",
    "cbnCode": "090567",
    "paystackCode": "",
    "switchCode": "090567",
    "centiivCode": "090567",
    "aliases": [
      "orokam microfinance bank ltd",
      "orokam microfinance bank"
    ]
  },
  {
    "name": "OSANTA MFB",
    "cbnCode": "090750",
    "paystackCode": "",
    "switchCode": "090750",
    "centiivCode": "090750",
    "aliases": [
      "osanta mfb"
    ]
  },
  {
    "name": "OSCOTECH MICROFINANCE BANK",
    "cbnCode": "090396",
    "paystackCode": "",
    "switchCode": "090396",
    "centiivCode": "090396",
    "aliases": [
      "oscotech microfinance bank"
    ]
  },
  {
    "name": "OSOMHE MFB",
    "cbnCode": "090715",
    "paystackCode": "",
    "switchCode": "090715",
    "centiivCode": "090715",
    "aliases": [
      "osomhe mfb"
    ]
  },
  {
    "name": "Ospoly Microfinance Bank",
    "cbnCode": "090456",
    "paystackCode": "",
    "switchCode": "090456",
    "centiivCode": "090456",
    "aliases": [
      "ospoly microfinance bank"
    ]
  },
  {
    "name": "Otech Microfinance Bank Ltd",
    "cbnCode": "090580",
    "paystackCode": "",
    "switchCode": "090580",
    "centiivCode": "090580",
    "aliases": [
      "otech microfinance bank ltd",
      "otech microfinance bank"
    ]
  },
  {
    "name": "Otuo Microfinance Bank Ltd",
    "cbnCode": "090542",
    "paystackCode": "",
    "switchCode": "090542",
    "centiivCode": "090542",
    "aliases": [
      "otuo microfinance bank ltd",
      "otuo microfinance bank"
    ]
  },
  {
    "name": "OURPASS MFB",
    "cbnCode": "090767",
    "paystackCode": "",
    "switchCode": "090767",
    "centiivCode": "090767",
    "aliases": [
      "ourpass mfb"
    ]
  },
  {
    "name": "OURS MFB",
    "cbnCode": "090346",
    "paystackCode": "",
    "switchCode": "090346",
    "centiivCode": "090346",
    "aliases": [
      "ours mfb"
    ]
  },
  {
    "name": "OVOUMA MFB",
    "cbnCode": "090765",
    "paystackCode": "",
    "switchCode": "090765",
    "centiivCode": "090765",
    "aliases": [
      "ovouma mfb",
      "uvuoma mfb"
    ]
  },
  {
    "name": "Oyan MFB",
    "cbnCode": "090635",
    "paystackCode": "",
    "switchCode": "090635",
    "centiivCode": "090635",
    "aliases": [
      "oyan mfb"
    ]
  },
  {
    "name": "Paga",
    "cbnCode": "100002",
    "paystackCode": "100002",
    "switchCode": "100002",
    "centiivCode": "100002",
    "aliases": [
      "paga"
    ]
  },
  {
    "name": "PAGE MFBANK",
    "cbnCode": "070008",
    "paystackCode": "",
    "switchCode": "070008",
    "centiivCode": "070008",
    "aliases": [
      "page mfbank",
      "page financials"
    ]
  },
  {
    "name": "Palmcoast Microfinance Bank",
    "cbnCode": "090497",
    "paystackCode": "",
    "switchCode": "090497",
    "centiivCode": "090497",
    "aliases": [
      "palmcoast microfinance bank"
    ]
  },
  {
    "name": "PalmPay",
    "cbnCode": "100033",
    "paystackCode": "999991",
    "switchCode": "100033",
    "centiivCode": "100033",
    "aliases": [
      "palmpay",
      "palm pay",
      "palmpay limited"
    ]
  },
  {
    "name": "Parallex Bank",
    "cbnCode": "000030",
    "paystackCode": "104",
    "switchCode": "000030",
    "centiivCode": "000030",
    "aliases": [
      "parallex",
      "parallex bank"
    ]
  },
  {
    "name": "PARKWAY MF BANK",
    "cbnCode": "090390",
    "paystackCode": "",
    "switchCode": "090390",
    "centiivCode": "090390",
    "aliases": [
      "parkway mf bank",
      "parkway mfb"
    ]
  },
  {
    "name": "PARKWAY-READYCASH",
    "cbnCode": "100003",
    "paystackCode": "311",
    "switchCode": "100003",
    "centiivCode": "100003",
    "aliases": [
      "parkway-readycash",
      "parkway - readycash"
    ]
  },
  {
    "name": "PARRALEX MICROFINANCE BANK",
    "cbnCode": "090004",
    "paystackCode": "",
    "switchCode": "090004",
    "centiivCode": "090004",
    "aliases": [
      "parralex microfinance bank"
    ]
  },
  {
    "name": "PATHFINDER MFB",
    "cbnCode": "090680",
    "paystackCode": "090680",
    "switchCode": "090680",
    "centiivCode": "090680",
    "aliases": [
      "pathfinder mfb",
      "pathfinder microfinance bank limited"
    ]
  },
  {
    "name": "PATRICKGOLD MICROFINANCE BANK",
    "cbnCode": "090317",
    "paystackCode": "",
    "switchCode": "090317",
    "centiivCode": "090317",
    "aliases": [
      "patrickgold microfinance bank"
    ]
  },
  {
    "name": "PayAttitude Online",
    "cbnCode": "110001",
    "paystackCode": "",
    "switchCode": "110001",
    "centiivCode": "110001",
    "aliases": [
      "payattitude online"
    ]
  },
  {
    "name": "PAYREP MFB",
    "cbnCode": "090823",
    "paystackCode": "",
    "switchCode": "090823",
    "centiivCode": "090823",
    "aliases": [
      "payrep mfb"
    ]
  },
  {
    "name": "Paystack Payment Limited",
    "cbnCode": "110006",
    "paystackCode": "",
    "switchCode": "110006",
    "centiivCode": "110006",
    "aliases": [
      "paystack payment limited"
    ]
  },
  {
    "name": "PAYSTACK-TITAN",
    "cbnCode": "100039",
    "paystackCode": "100039",
    "switchCode": "100039",
    "centiivCode": "100039",
    "aliases": [
      "paystack-titan",
      "titanpaystack"
    ]
  },
  {
    "name": "Peace Microfinance Bank",
    "cbnCode": "090402",
    "paystackCode": "50743",
    "switchCode": "090402",
    "centiivCode": "090402",
    "aliases": [
      "peace",
      "peace mfb",
      "peace microfinance bank"
    ]
  },
  {
    "name": "PECANTRUST MICROFINANCE BANK",
    "cbnCode": "090137",
    "paystackCode": "",
    "switchCode": "090137",
    "centiivCode": "090137",
    "aliases": [
      "pecantrust microfinance bank"
    ]
  },
  {
    "name": "PENIEL MICORFINANCE BANK LTD",
    "cbnCode": "090379",
    "paystackCode": "",
    "switchCode": "090379",
    "centiivCode": "090379",
    "aliases": [
      "peniel micorfinance bank ltd"
    ]
  },
  {
    "name": "PENNYWISE MICROFINANCE BANK",
    "cbnCode": "090196",
    "paystackCode": "",
    "switchCode": "090196",
    "centiivCode": "090196",
    "aliases": [
      "pennywise microfinance bank"
    ]
  },
  {
    "name": "PENTECOST MFB",
    "cbnCode": "090861",
    "paystackCode": "",
    "switchCode": "090861",
    "centiivCode": "090861",
    "aliases": [
      "pentecost mfb"
    ]
  },
  {
    "name": "PETRA MICROFINANCE BANK",
    "cbnCode": "090165",
    "paystackCode": "",
    "switchCode": "090165",
    "centiivCode": "090165",
    "aliases": [
      "petra microfinance bank"
    ]
  },
  {
    "name": "Petra Mircofinance Bank Plc",
    "cbnCode": "50746",
    "paystackCode": "50746",
    "switchCode": "50746",
    "centiivCode": "50746",
    "aliases": [
      "petra mircofinance bank plc"
    ]
  },
  {
    "name": "PETTYSAVE MFB",
    "cbnCode": "090768",
    "paystackCode": "MFB51452",
    "switchCode": "090768",
    "centiivCode": "090768",
    "aliases": [
      "pettysave mfb"
    ]
  },
  {
    "name": "PILLAR MICROFINANCE BANK",
    "cbnCode": "090289",
    "paystackCode": "",
    "switchCode": "090289",
    "centiivCode": "090289",
    "aliases": [
      "pillar microfinance bank"
    ]
  },
  {
    "name": "PLATINUM MORTGAGE BANK",
    "cbnCode": "070013",
    "paystackCode": "268",
    "switchCode": "070013",
    "centiivCode": "070013",
    "aliases": [
      "platinum mortgage bank"
    ]
  },
  {
    "name": "POCKETAPP",
    "cbnCode": "100042",
    "paystackCode": "00716",
    "switchCode": "100042",
    "centiivCode": "100042",
    "aliases": [
      "pocketapp",
      "pocket app"
    ]
  },
  {
    "name": "PODER FINANCE",
    "cbnCode": "050021",
    "paystackCode": "050021",
    "switchCode": "050021",
    "centiivCode": "050021",
    "aliases": [
      "poder finance",
      "pfi finance company limited"
    ]
  },
  {
    "name": "POINTONE MFB",
    "cbnCode": "090754",
    "paystackCode": "",
    "switchCode": "090754",
    "centiivCode": "090754",
    "aliases": [
      "pointone mfb"
    ]
  },
  {
    "name": "Polaris Bank",
    "cbnCode": "000008",
    "paystackCode": "076",
    "switchCode": "000008",
    "centiivCode": "000008",
    "aliases": [
      "polaris",
      "polaris bank",
      "skye",
      "skye bank"
    ]
  },
  {
    "name": "PolyIbadan Microfinance Bank",
    "cbnCode": "090534",
    "paystackCode": "",
    "switchCode": "090534",
    "centiivCode": "090534",
    "aliases": [
      "polyibadan microfinance bank",
      "polybadan microfinance bank"
    ]
  },
  {
    "name": "POLYUNWANA MICROFINANCE BANK",
    "cbnCode": "090296",
    "paystackCode": "",
    "switchCode": "090296",
    "centiivCode": "090296",
    "aliases": [
      "polyunwana microfinance bank"
    ]
  },
  {
    "name": "PREEMINENT MICROFINANCE BANK",
    "cbnCode": "090412",
    "paystackCode": "",
    "switchCode": "090412",
    "centiivCode": "090412",
    "aliases": [
      "preeminent microfinance bank"
    ]
  },
  {
    "name": "Premium Trust Bank",
    "cbnCode": "000031",
    "paystackCode": "105",
    "switchCode": "000031",
    "centiivCode": "000031",
    "aliases": [
      "premium trust",
      "premiumtrust",
      "premium trust bank",
      "premiumtrust bank"
    ]
  },
  {
    "name": "PRESTIGE MICROFINANCE BANK",
    "cbnCode": "090274",
    "paystackCode": "",
    "switchCode": "090274",
    "centiivCode": "090274",
    "aliases": [
      "prestige microfinance bank"
    ]
  },
  {
    "name": "Prisco Microfinance Bank",
    "cbnCode": "090481",
    "paystackCode": "",
    "switchCode": "090481",
    "centiivCode": "090481",
    "aliases": [
      "prisco microfinance bank"
    ]
  },
  {
    "name": "Pristine Divitis Microfinance Bank",
    "cbnCode": "090499",
    "paystackCode": "",
    "switchCode": "090499",
    "centiivCode": "090499",
    "aliases": [
      "pristine divitis microfinance bank"
    ]
  },
  {
    "name": "PRODIGY MFB",
    "cbnCode": "090784",
    "paystackCode": "",
    "switchCode": "090784",
    "centiivCode": "090784",
    "aliases": [
      "prodigy mfb"
    ]
  },
  {
    "name": "Projects Microfinance Bank",
    "cbnCode": "090503",
    "paystackCode": "",
    "switchCode": "090503",
    "centiivCode": "090503",
    "aliases": [
      "projects microfinance bank"
    ]
  },
  {
    "name": "Prophius",
    "cbnCode": "110032",
    "paystackCode": "",
    "switchCode": "110032",
    "centiivCode": "110032",
    "aliases": [
      "prophius"
    ]
  },
  {
    "name": "Prospa Capital MICROFINANCE BANK",
    "cbnCode": "090495",
    "paystackCode": "50739",
    "switchCode": "090495",
    "centiivCode": "090495",
    "aliases": [
      "prospa capital microfinance bank",
      "goodnews microfinance bank"
    ]
  },
  {
    "name": "PROSPERIS FINANCE LIMITED",
    "cbnCode": "050023",
    "paystackCode": "050023",
    "switchCode": "050023",
    "centiivCode": "050023",
    "aliases": [
      "prosperis finance limited"
    ]
  },
  {
    "name": "Prosperity MFB",
    "cbnCode": "090642",
    "paystackCode": "",
    "switchCode": "090642",
    "centiivCode": "090642",
    "aliases": [
      "prosperity mfb"
    ]
  },
  {
    "name": "Providus Bank",
    "cbnCode": "000023",
    "paystackCode": "101",
    "switchCode": "000023",
    "centiivCode": "000023",
    "aliases": [
      "providus",
      "providus bank"
    ]
  },
  {
    "name": "PRUDENT MICROFINANCE BANK",
    "cbnCode": "090690",
    "paystackCode": "",
    "switchCode": "090690",
    "centiivCode": "090690",
    "aliases": [
      "prudent microfinance bank"
    ]
  },
  {
    "name": "PURPLEMONEY MICROFINANCE BANK",
    "cbnCode": "090303",
    "paystackCode": "",
    "switchCode": "090303",
    "centiivCode": "090303",
    "aliases": [
      "purplemoney microfinance bank"
    ]
  },
  {
    "name": "PYRAMID MICROFINANCE BANK",
    "cbnCode": "090657",
    "paystackCode": "",
    "switchCode": "090657",
    "centiivCode": "090657",
    "aliases": [
      "pyramid microfinance bank",
      "pyramid mfb"
    ]
  },
  {
    "name": "Qube Microfinance Bank Ltd",
    "cbnCode": "090569",
    "paystackCode": "",
    "switchCode": "090569",
    "centiivCode": "090569",
    "aliases": [
      "qube microfinance bank ltd",
      "qube microfinance bank"
    ]
  },
  {
    "name": "QUICK MFB",
    "cbnCode": "090850",
    "paystackCode": "",
    "switchCode": "090850",
    "centiivCode": "090850",
    "aliases": [
      "quick mfb"
    ]
  },
  {
    "name": "QUICKFUND MICROFINANCE BANK",
    "cbnCode": "090261",
    "paystackCode": "",
    "switchCode": "090261",
    "centiivCode": "090261",
    "aliases": [
      "quickfund microfinance bank"
    ]
  },
  {
    "name": "Radalpha Microfinance Bank",
    "cbnCode": "090496",
    "paystackCode": "090496",
    "switchCode": "090496",
    "centiivCode": "090496",
    "aliases": [
      "radalpha microfinance bank",
      "randalpha microfinance bank"
    ]
  },
  {
    "name": "RAHAMA MICROFINANCE BANK",
    "cbnCode": "090170",
    "paystackCode": "",
    "switchCode": "090170",
    "centiivCode": "090170",
    "aliases": [
      "rahama microfinance bank"
    ]
  },
  {
    "name": "RAND MERCHANT BANK",
    "cbnCode": "000024",
    "paystackCode": "502",
    "switchCode": "000024",
    "centiivCode": "000024",
    "aliases": [
      "rand merchant bank"
    ]
  },
  {
    "name": "RAYYAN Microfinance Bank",
    "cbnCode": "090616",
    "paystackCode": "",
    "switchCode": "090616",
    "centiivCode": "090616",
    "aliases": [
      "rayyan microfinance bank",
      "rayyan mfb"
    ]
  },
  {
    "name": "REFUGE MORTGAGE BANK",
    "cbnCode": "070011",
    "paystackCode": "90067",
    "switchCode": "070011",
    "centiivCode": "070011",
    "aliases": [
      "refuge mortgage bank"
    ]
  },
  {
    "name": "REGENT MICROFINANCE BANK",
    "cbnCode": "090125",
    "paystackCode": "",
    "switchCode": "090125",
    "centiivCode": "090125",
    "aliases": [
      "regent microfinance bank"
    ]
  },
  {
    "name": "Rehoboth Microfinance Bank",
    "cbnCode": "090463",
    "paystackCode": "",
    "switchCode": "090463",
    "centiivCode": "090463",
    "aliases": [
      "rehoboth microfinance bank"
    ]
  },
  {
    "name": "RELIANCE MICROFINANCE BANK",
    "cbnCode": "090173",
    "paystackCode": "",
    "switchCode": "090173",
    "centiivCode": "090173",
    "aliases": [
      "reliance microfinance bank"
    ]
  },
  {
    "name": "RENMONEY MICROFINANCE BANK",
    "cbnCode": "090198",
    "paystackCode": "",
    "switchCode": "090198",
    "centiivCode": "090198",
    "aliases": [
      "renmoney microfinance bank"
    ]
  },
  {
    "name": "Rephidim Microfinance Bank",
    "cbnCode": "090322",
    "paystackCode": "50994",
    "switchCode": "090322",
    "centiivCode": "090322",
    "aliases": [
      "rephidim",
      "rephidim mfb",
      "rehoboth microfinance bank",
      "rephidim microfinance bank"
    ]
  },
  {
    "name": "RETRUST MFB",
    "cbnCode": "090766",
    "paystackCode": "",
    "switchCode": "090766",
    "centiivCode": "090766",
    "aliases": [
      "retrust mfb"
    ]
  },
  {
    "name": "REVELATION MICROFINANCE BANK",
    "cbnCode": "090666",
    "paystackCode": "",
    "switchCode": "090666",
    "centiivCode": "090666",
    "aliases": [
      "revelation microfinance bank"
    ]
  },
  {
    "name": "REX Microfinance Bank",
    "cbnCode": "090449",
    "paystackCode": "",
    "switchCode": "090449",
    "centiivCode": "090449",
    "aliases": [
      "rex microfinance bank"
    ]
  },
  {
    "name": "RIC MFB",
    "cbnCode": "090720",
    "paystackCode": "",
    "switchCode": "090720",
    "centiivCode": "090720",
    "aliases": [
      "ric mfb"
    ]
  },
  {
    "name": "Richway Microfinance Bank",
    "cbnCode": "090132",
    "paystackCode": "50767",
    "switchCode": "090132",
    "centiivCode": "090132",
    "aliases": [
      "richway",
      "richway mfb",
      "rockshield microfinance bank"
    ]
  },
  {
    "name": "RIGO MICROFINANCE BANK",
    "cbnCode": "090433",
    "paystackCode": "",
    "switchCode": "090433",
    "centiivCode": "090433",
    "aliases": [
      "rigo microfinance bank"
    ]
  },
  {
    "name": "Rima Growth Pathway Microfinance Bank",
    "cbnCode": "090515",
    "paystackCode": "",
    "switchCode": "090515",
    "centiivCode": "090515",
    "aliases": [
      "rima growth pathway microfinance bank"
    ]
  },
  {
    "name": "RIMA MICROFINANCE BANK",
    "cbnCode": "090443",
    "paystackCode": "",
    "switchCode": "090443",
    "centiivCode": "090443",
    "aliases": [
      "rima microfinance bank"
    ]
  },
  {
    "name": "RIMIN GADO MFB",
    "cbnCode": "090713",
    "paystackCode": "",
    "switchCode": "090713",
    "centiivCode": "090713",
    "aliases": [
      "rimin gado mfb"
    ]
  },
  {
    "name": "Rockshield Microfinance Bank",
    "cbnCode": "090547",
    "paystackCode": "",
    "switchCode": "090547",
    "centiivCode": "090547",
    "aliases": [
      "rockshield microfinance bank"
    ]
  },
  {
    "name": "Royal Blue MFB",
    "cbnCode": "090622",
    "paystackCode": "",
    "switchCode": "090622",
    "centiivCode": "090622",
    "aliases": [
      "royal blue mfb"
    ]
  },
  {
    "name": "ROYAL EXCHANGE MICROFINANCE BANK",
    "cbnCode": "090138",
    "paystackCode": "",
    "switchCode": "090138",
    "centiivCode": "090138",
    "aliases": [
      "royal exchange microfinance bank"
    ]
  },
  {
    "name": "Rubies MFB",
    "cbnCode": "090175",
    "paystackCode": "125",
    "switchCode": "090175",
    "centiivCode": "090175",
    "aliases": [
      "rubies",
      "rubies mfb",
      "rubies bank",
      "highstreet microfinance bank",
      "rubies microfinance bank"
    ]
  },
  {
    "name": "RUN MFB",
    "cbnCode": "090771",
    "paystackCode": "",
    "switchCode": "090771",
    "centiivCode": "090771",
    "aliases": [
      "run mfb"
    ]
  },
  {
    "name": "SABI MFB",
    "cbnCode": "090727",
    "paystackCode": "",
    "switchCode": "090727",
    "centiivCode": "090727",
    "aliases": [
      "sabi mfb"
    ]
  },
  {
    "name": "Safe Haven MFB",
    "cbnCode": "090286",
    "paystackCode": "51113",
    "switchCode": "090286",
    "centiivCode": "090286",
    "aliases": [
      "safe haven",
      "safe haven mfb",
      "safehaven",
      "safe haven microfinance bank"
    ]
  },
  {
    "name": "SAFEGATE MICROFINANCE BANK",
    "cbnCode": "090485",
    "paystackCode": "",
    "switchCode": "090485",
    "centiivCode": "090485",
    "aliases": [
      "safegate microfinance bank",
      "safegate mfb"
    ]
  },
  {
    "name": "SAFETRUST",
    "cbnCode": "090006",
    "paystackCode": "",
    "switchCode": "090006",
    "centiivCode": "090006",
    "aliases": [
      "safetrust"
    ]
  },
  {
    "name": "SAGAMU MICROFINANCE BANK",
    "cbnCode": "090140",
    "paystackCode": "",
    "switchCode": "090140",
    "centiivCode": "090140",
    "aliases": [
      "sagamu microfinance bank"
    ]
  },
  {
    "name": "SAGEGREY FINANCE LIMITED",
    "cbnCode": "050003",
    "paystackCode": "40165",
    "switchCode": "050003",
    "centiivCode": "050003",
    "aliases": [
      "sagegrey finance limited",
      "sage grey finance limited"
    ]
  },
  {
    "name": "Sciart Finance",
    "cbnCode": "050024",
    "paystackCode": "",
    "switchCode": "050024",
    "centiivCode": "050024",
    "aliases": [
      "sciart finance"
    ]
  },
  {
    "name": "Seap Microfinance Bank",
    "cbnCode": "090513",
    "paystackCode": "",
    "switchCode": "090513",
    "centiivCode": "090513",
    "aliases": [
      "seap microfinance bank"
    ]
  },
  {
    "name": "SEED CAPITAL MICROFINANCE BANK",
    "cbnCode": "090112",
    "paystackCode": "",
    "switchCode": "090112",
    "centiivCode": "090112",
    "aliases": [
      "seed capital microfinance bank"
    ]
  },
  {
    "name": "SEEDVEST MICROFINANCE BANK",
    "cbnCode": "090369",
    "paystackCode": "",
    "switchCode": "090369",
    "centiivCode": "090369",
    "aliases": [
      "seedvest microfinance bank"
    ]
  },
  {
    "name": "Shalom Microfinance Bank",
    "cbnCode": "090502",
    "paystackCode": "",
    "switchCode": "090502",
    "centiivCode": "090502",
    "aliases": [
      "shalom microfinance bank"
    ]
  },
  {
    "name": "SHANONO MFB",
    "cbnCode": "090748",
    "paystackCode": "",
    "switchCode": "090748",
    "centiivCode": "090748",
    "aliases": [
      "shanono mfb"
    ]
  },
  {
    "name": "SHERPERD TRUST MICROFINANCE BANK",
    "cbnCode": "090401",
    "paystackCode": "",
    "switchCode": "090401",
    "centiivCode": "090401",
    "aliases": [
      "sherperd trust microfinance bank",
      "shepherd trust microfinance bank"
    ]
  },
  {
    "name": "Shield Microfinance Bank Ltd",
    "cbnCode": "090559",
    "paystackCode": "",
    "switchCode": "090559",
    "centiivCode": "090559",
    "aliases": [
      "shield microfinance bank ltd",
      "shield microfinance bank"
    ]
  },
  {
    "name": "Shongom Microfinance Bank Ltd",
    "cbnCode": "090558",
    "paystackCode": "",
    "switchCode": "090558",
    "centiivCode": "090558",
    "aliases": [
      "shongom microfinance bank ltd",
      "shongom microfinance bank"
    ]
  },
  {
    "name": "Signature Bank",
    "cbnCode": "000034",
    "paystackCode": "106",
    "switchCode": "000034",
    "centiivCode": "000034",
    "aliases": [
      "signature",
      "signature bank",
      "signature bank ltd"
    ]
  },
  {
    "name": "SIMPLE FINANCE LIMITED",
    "cbnCode": "050008",
    "paystackCode": "",
    "switchCode": "050008",
    "centiivCode": "050008",
    "aliases": [
      "simple finance limited"
    ]
  },
  {
    "name": "SINCERE MFB",
    "cbnCode": "090339",
    "paystackCode": "",
    "switchCode": "090339",
    "centiivCode": "090339",
    "aliases": [
      "sincere mfb"
    ]
  },
  {
    "name": "SLS MICROFINANCE BANK",
    "cbnCode": "90449",
    "paystackCode": "",
    "switchCode": "90449",
    "centiivCode": "90449",
    "aliases": [
      "sls microfinance bank"
    ]
  },
  {
    "name": "Snow Microfinance Bank",
    "cbnCode": "090573",
    "paystackCode": "",
    "switchCode": "090573",
    "centiivCode": "090573",
    "aliases": [
      "snow microfinance bank",
      "snow mfb"
    ]
  },
  {
    "name": "SOLID ALLIANZE MICROFINANCE BANK",
    "cbnCode": "090506",
    "paystackCode": "",
    "switchCode": "090506",
    "centiivCode": "090506",
    "aliases": [
      "solid allianze microfinance bank",
      "solid allianze mfb"
    ]
  },
  {
    "name": "Solidrock Microfinance Bank",
    "cbnCode": "090524",
    "paystackCode": "",
    "switchCode": "090524",
    "centiivCode": "090524",
    "aliases": [
      "solidrock microfinance bank"
    ]
  },
  {
    "name": "Soroman Microfinance Bank",
    "cbnCode": "090769",
    "paystackCode": "",
    "switchCode": "090769",
    "centiivCode": "090769",
    "aliases": [
      "soroman microfinance bank"
    ]
  },
  {
    "name": "Source MFB",
    "cbnCode": "090641",
    "paystackCode": "",
    "switchCode": "090641",
    "centiivCode": "090641",
    "aliases": [
      "source mfb"
    ]
  },
  {
    "name": "Sparkle Microfinance Bank",
    "cbnCode": "090325",
    "paystackCode": "51310",
    "switchCode": "090325",
    "centiivCode": "090325",
    "aliases": [
      "sparkle",
      "sparkle bank",
      "sparkle mfb",
      "sparkle microfinance bank"
    ]
  },
  {
    "name": "SPECTRUM MICROFINANCE BANK",
    "cbnCode": "090436",
    "paystackCode": "",
    "switchCode": "090436",
    "centiivCode": "090436",
    "aliases": [
      "spectrum microfinance bank",
      "spectrum mfb"
    ]
  },
  {
    "name": "SPRING SKY FINANCE",
    "cbnCode": "050306",
    "paystackCode": "",
    "switchCode": "050306",
    "centiivCode": "050306",
    "aliases": [
      "spring sky finance"
    ]
  },
  {
    "name": "SPRING SKY FINANCE",
    "cbnCode": "050036",
    "paystackCode": "",
    "switchCode": "050036",
    "centiivCode": "050036",
    "aliases": [
      "spring sky finance"
    ]
  },
  {
    "name": "SPRINGFIELD MICROFINANCE BANK",
    "cbnCode": "090806",
    "paystackCode": "51429",
    "switchCode": "090806",
    "centiivCode": "090806",
    "aliases": [
      "springfield microfinance bank"
    ]
  },
  {
    "name": "SPRINGVILLE MFB",
    "cbnCode": "090786",
    "paystackCode": "",
    "switchCode": "090786",
    "centiivCode": "090786",
    "aliases": [
      "springville mfb"
    ]
  },
  {
    "name": "STABLE MFB",
    "cbnCode": "090833",
    "paystackCode": "",
    "switchCode": "090833",
    "centiivCode": "090833",
    "aliases": [
      "stable mfb"
    ]
  },
  {
    "name": "STANBIC IBTC @EASE WALLET",
    "cbnCode": "100007",
    "paystackCode": "",
    "switchCode": "100007",
    "centiivCode": "100007",
    "aliases": [
      "stanbic ibtc @ease wallet"
    ]
  },
  {
    "name": "Stanbic IBTC Bank",
    "cbnCode": "000012",
    "paystackCode": "221",
    "switchCode": "000012",
    "centiivCode": "000012",
    "aliases": [
      "stanbic",
      "stanbic ibtc",
      "stanbic ibtc bank",
      "stanbicibtc bank"
    ]
  },
  {
    "name": "Standard Chartered Bank",
    "cbnCode": "000021",
    "paystackCode": "068",
    "switchCode": "000021",
    "centiivCode": "000021",
    "aliases": [
      "standard chartered",
      "standard chartered bank",
      "standardchartered"
    ]
  },
  {
    "name": "STANDARD MICROFINANCE BANK",
    "cbnCode": "090182",
    "paystackCode": "",
    "switchCode": "090182",
    "centiivCode": "090182",
    "aliases": [
      "standard microfinance bank",
      "standard mfb"
    ]
  },
  {
    "name": "STANFORD MICROFINANCE BANK",
    "cbnCode": "090162",
    "paystackCode": "090162",
    "switchCode": "090162",
    "centiivCode": "090162",
    "aliases": [
      "stanford microfinance bank",
      "stanford microfinance bak"
    ]
  },
  {
    "name": "STATESIDE MFB",
    "cbnCode": "090583",
    "paystackCode": "",
    "switchCode": "090583",
    "centiivCode": "090583",
    "aliases": [
      "stateside mfb",
      "stateside microfinance bank"
    ]
  },
  {
    "name": "STB MORTGAGE BANK",
    "cbnCode": "070022",
    "paystackCode": "070022",
    "switchCode": "070022",
    "centiivCode": "070022",
    "aliases": [
      "stb mortgage bank"
    ]
  },
  {
    "name": "STELLAS MICROFINANCE BANK",
    "cbnCode": "090262",
    "paystackCode": "",
    "switchCode": "090262",
    "centiivCode": "090262",
    "aliases": [
      "stellas microfinance bank"
    ]
  },
  {
    "name": "Sterling Bank",
    "cbnCode": "000001",
    "paystackCode": "232",
    "switchCode": "000001",
    "centiivCode": "000001",
    "aliases": [
      "sterling",
      "sterling bank"
    ]
  },
  {
    "name": "STOCKCORP MICROFINANCE BANK",
    "cbnCode": "090340",
    "paystackCode": "",
    "switchCode": "090340",
    "centiivCode": "090340",
    "aliases": [
      "stockcorp microfinance bank"
    ]
  },
  {
    "name": "SULSPAP MICROFINANCE BANK",
    "cbnCode": "090305",
    "paystackCode": "",
    "switchCode": "090305",
    "centiivCode": "090305",
    "aliases": [
      "sulspap microfinance bank"
    ]
  },
  {
    "name": "Summit Bank",
    "cbnCode": "080030",
    "paystackCode": "00305",
    "switchCode": "080030",
    "centiivCode": "080030",
    "aliases": [
      "summit bank"
    ]
  },
  {
    "name": "Summit Bank",
    "cbnCode": "080003",
    "paystackCode": "",
    "switchCode": "080003",
    "centiivCode": "080003",
    "aliases": [
      "summit bank"
    ]
  },
  {
    "name": "SUNBEAM MICROFINANCE BANK",
    "cbnCode": "090302",
    "paystackCode": "",
    "switchCode": "090302",
    "centiivCode": "090302",
    "aliases": [
      "sunbeam microfinance bank"
    ]
  },
  {
    "name": "Suntop MFB",
    "cbnCode": "090644",
    "paystackCode": "",
    "switchCode": "090644",
    "centiivCode": "090644",
    "aliases": [
      "suntop mfb"
    ]
  },
  {
    "name": "Suntrust Bank",
    "cbnCode": "000022",
    "paystackCode": "100",
    "switchCode": "000022",
    "centiivCode": "000022",
    "aliases": [
      "suntrust",
      "suntrust bank"
    ]
  },
  {
    "name": "SUPPORT MICROFINANCE BANK",
    "cbnCode": "090446",
    "paystackCode": "",
    "switchCode": "090446",
    "centiivCode": "090446",
    "aliases": [
      "support microfinance bank",
      "support mfb"
    ]
  },
  {
    "name": "Supreme Microfinance Bank Ltd",
    "cbnCode": "090564",
    "paystackCode": "",
    "switchCode": "090564",
    "centiivCode": "090564",
    "aliases": [
      "supreme microfinance bank ltd",
      "supreme microfinance bank"
    ]
  },
  {
    "name": "SWIFT TRUST MFB",
    "cbnCode": "090757",
    "paystackCode": "",
    "switchCode": "090757",
    "centiivCode": "090757",
    "aliases": [
      "swift trust mfb"
    ]
  },
  {
    "name": "SYCAMORE MFB",
    "cbnCode": "090827",
    "paystackCode": "",
    "switchCode": "090827",
    "centiivCode": "090827",
    "aliases": [
      "sycamore mfb"
    ]
  },
  {
    "name": "TAGPAY",
    "cbnCode": "100023",
    "paystackCode": "",
    "switchCode": "100023",
    "centiivCode": "100023",
    "aliases": [
      "tagpay"
    ]
  },
  {
    "name": "TAJ Bank",
    "cbnCode": "000026",
    "paystackCode": "302",
    "switchCode": "000026",
    "centiivCode": "000026",
    "aliases": [
      "taj",
      "taj bank"
    ]
  },
  {
    "name": "TAJWALLET",
    "cbnCode": "080002",
    "paystackCode": "",
    "switchCode": "080002",
    "centiivCode": "080002",
    "aliases": [
      "tajwallet",
      "taj_pinspay"
    ]
  },
  {
    "name": "TANADI MFB",
    "cbnCode": "090560",
    "paystackCode": "090560",
    "switchCode": "090560",
    "centiivCode": "090560",
    "aliases": [
      "tanadi mfb",
      "tanadi microfinance bank",
      "crust microfinance bank"
    ]
  },
  {
    "name": "Tangale MFB",
    "cbnCode": "090638",
    "paystackCode": "",
    "switchCode": "090638",
    "centiivCode": "090638",
    "aliases": [
      "tangale mfb"
    ]
  },
  {
    "name": "TASUED MICROFINANCE BANK LTD",
    "cbnCode": "090593",
    "paystackCode": "",
    "switchCode": "090593",
    "centiivCode": "090593",
    "aliases": [
      "tasued microfinance bank ltd",
      "tasued microfinance bank"
    ]
  },
  {
    "name": "Tatum Bank",
    "cbnCode": "000042",
    "paystackCode": "",
    "switchCode": "000042",
    "centiivCode": "000042",
    "aliases": [
      "tatum bank"
    ]
  },
  {
    "name": "TCF MFB",
    "cbnCode": "090426",
    "paystackCode": "51211",
    "switchCode": "090426",
    "centiivCode": "090426",
    "aliases": [
      "tcf",
      "tcf mfb",
      "tangerine money",
      "ibank microfinance bank"
    ]
  },
  {
    "name": "Teamapt Limited",
    "cbnCode": "110007",
    "paystackCode": "",
    "switchCode": "110007",
    "centiivCode": "110007",
    "aliases": [
      "teamapt limited"
    ]
  },
  {
    "name": "TEASY MOBILE",
    "cbnCode": "100010",
    "paystackCode": "",
    "switchCode": "100010",
    "centiivCode": "100010",
    "aliases": [
      "teasy mobile",
      "teasymobile"
    ]
  },
  {
    "name": "TEERUS MFB",
    "cbnCode": "090991",
    "paystackCode": "",
    "switchCode": "090991",
    "centiivCode": "090991",
    "aliases": [
      "teerus mfb"
    ]
  },
  {
    "name": "TEKLA FINANCE LTD",
    "cbnCode": "050007",
    "paystackCode": "",
    "switchCode": "050007",
    "centiivCode": "050007",
    "aliases": [
      "tekla finance ltd",
      "tekla finance limited"
    ]
  },
  {
    "name": "TELLERONE FI MFB",
    "cbnCode": "090788",
    "paystackCode": "",
    "switchCode": "090788",
    "centiivCode": "090788",
    "aliases": [
      "tellerone fi mfb",
      "tellerone mfb"
    ]
  },
  {
    "name": "TENN MICROFINANCE BANK",
    "cbnCode": "090716",
    "paystackCode": "",
    "switchCode": "090716",
    "centiivCode": "090716",
    "aliases": [
      "tenn microfinance bank",
      "tenn mfb"
    ]
  },
  {
    "name": "THE BROOK FINANCE LTD",
    "cbnCode": "050031",
    "paystackCode": "",
    "switchCode": "050031",
    "centiivCode": "050031",
    "aliases": [
      "the brook finance ltd"
    ]
  },
  {
    "name": "THE MILLENNIUM MICROFINANCE BANK",
    "cbnCode": "090711",
    "paystackCode": "",
    "switchCode": "090711",
    "centiivCode": "090711",
    "aliases": [
      "the millennium microfinance bank",
      "the millenium mfb"
    ]
  },
  {
    "name": "THINK FINANCE MICROFINANCE BANK",
    "cbnCode": "090373",
    "paystackCode": "677",
    "switchCode": "090373",
    "centiivCode": "090373",
    "aliases": [
      "think finance microfinance bank"
    ]
  },
  {
    "name": "Titan Bank",
    "cbnCode": "000025",
    "paystackCode": "102",
    "switchCode": "000025",
    "centiivCode": "000025",
    "aliases": [
      "titan",
      "titan bank",
      "titan trust",
      "titan trust bank",
      "paystack-titan",
      "paystack titan"
    ]
  },
  {
    "name": "TOFA MICROFINANCE BANK",
    "cbnCode": "090714",
    "paystackCode": "",
    "switchCode": "090714",
    "centiivCode": "090714",
    "aliases": [
      "tofa microfinance bank",
      "tofa mfb"
    ]
  },
  {
    "name": "Toprate MFB",
    "cbnCode": "090801",
    "paystackCode": "",
    "switchCode": "090801",
    "centiivCode": "090801",
    "aliases": [
      "toprate mfb",
      "toprate microfinance bank"
    ]
  },
  {
    "name": "TransPay MICROFINANCE BANK",
    "cbnCode": "090708",
    "paystackCode": "090708",
    "switchCode": "090708",
    "centiivCode": "090708",
    "aliases": [
      "transpay microfinance bank",
      "transpay mfb"
    ]
  },
  {
    "name": "TREASURES MFB",
    "cbnCode": "090663",
    "paystackCode": "",
    "switchCode": "090663",
    "centiivCode": "090663",
    "aliases": [
      "treasures mfb"
    ]
  },
  {
    "name": "TRIDENT MICROFINANCE BANK",
    "cbnCode": "090146",
    "paystackCode": "",
    "switchCode": "090146",
    "centiivCode": "090146",
    "aliases": [
      "trident microfinance bank"
    ]
  },
  {
    "name": "TRINITY FINANCIAL SERVICES LIMITED",
    "cbnCode": "050014",
    "paystackCode": "",
    "switchCode": "050014",
    "centiivCode": "050014",
    "aliases": [
      "trinity financial services limited"
    ]
  },
  {
    "name": "Triple A Microfinance Bank",
    "cbnCode": "090525",
    "paystackCode": "",
    "switchCode": "090525",
    "centiivCode": "090525",
    "aliases": [
      "triple a microfinance bank",
      "triplea microfinance bank"
    ]
  },
  {
    "name": "TRUST MICROFINANCE BANK",
    "cbnCode": "090327",
    "paystackCode": "",
    "switchCode": "090327",
    "centiivCode": "090327",
    "aliases": [
      "trust microfinance bank"
    ]
  },
  {
    "name": "TRUSTBANC J6 MICROFINANCE BANK LIMITED",
    "cbnCode": "090123",
    "paystackCode": "",
    "switchCode": "090123",
    "centiivCode": "090123",
    "aliases": [
      "trustbanc j6 microfinance bank limited",
      "verite microfinance bank"
    ]
  },
  {
    "name": "Trustbond Mortgage Bank",
    "cbnCode": "090005",
    "paystackCode": "523",
    "switchCode": "090005",
    "centiivCode": "090005",
    "aliases": [
      "trustbond",
      "trustbond mortgage"
    ]
  },
  {
    "name": "TRUSTFUND MICROFINANCE BANK",
    "cbnCode": "090276",
    "paystackCode": "",
    "switchCode": "090276",
    "centiivCode": "090276",
    "aliases": [
      "trustfund microfinance bank"
    ]
  },
  {
    "name": "U & C MICROFINANCE BANK",
    "cbnCode": "090315",
    "paystackCode": "",
    "switchCode": "090315",
    "centiivCode": "090315",
    "aliases": [
      "u & c microfinance bank"
    ]
  },
  {
    "name": "UBA MONI",
    "cbnCode": "000040",
    "paystackCode": "",
    "switchCode": "000040",
    "centiivCode": "000040",
    "aliases": [
      "uba moni"
    ]
  },
  {
    "name": "UBJ MFB",
    "cbnCode": "090762",
    "paystackCode": "",
    "switchCode": "090762",
    "centiivCode": "090762",
    "aliases": [
      "ubj mfb",
      "centrum finance"
    ]
  },
  {
    "name": "UDA MICROFINANCE BANK",
    "cbnCode": "090403",
    "paystackCode": "",
    "switchCode": "090403",
    "centiivCode": "090403",
    "aliases": [
      "uda microfinance bank"
    ]
  },
  {
    "name": "UFORO MFB",
    "cbnCode": "090869",
    "paystackCode": "",
    "switchCode": "090869",
    "centiivCode": "090869",
    "aliases": [
      "uforo mfb"
    ]
  },
  {
    "name": "Uga MFB",
    "cbnCode": "090782",
    "paystackCode": "",
    "switchCode": "090782",
    "centiivCode": "090782",
    "aliases": [
      "uga mfb",
      "uga microfinance bank"
    ]
  },
  {
    "name": "UGA MICROFINANCE BANK",
    "cbnCode": "090978",
    "paystackCode": "",
    "switchCode": "090978",
    "centiivCode": "090978",
    "aliases": [
      "uga microfinance bank"
    ]
  },
  {
    "name": "Uhuru Microfinance Bank",
    "cbnCode": "090517",
    "paystackCode": "",
    "switchCode": "090517",
    "centiivCode": "090517",
    "aliases": [
      "uhuru microfinance bank"
    ]
  },
  {
    "name": "Ukpor MFB",
    "cbnCode": "090820",
    "paystackCode": "",
    "switchCode": "090820",
    "centiivCode": "090820",
    "aliases": [
      "ukpor mfb"
    ]
  },
  {
    "name": "ULTIMATE MICROFINANCE BANK",
    "cbnCode": "090776",
    "paystackCode": "",
    "switchCode": "090776",
    "centiivCode": "090776",
    "aliases": [
      "ultimate microfinance bank"
    ]
  },
  {
    "name": "ULTRAVIOLET MFB",
    "cbnCode": "090781",
    "paystackCode": "",
    "switchCode": "090781",
    "centiivCode": "090781",
    "aliases": [
      "ultraviolet mfb"
    ]
  },
  {
    "name": "Ummah Microfinance Bank",
    "cbnCode": "090609",
    "paystackCode": "",
    "switchCode": "090609",
    "centiivCode": "090609",
    "aliases": [
      "ummah microfinance bank"
    ]
  },
  {
    "name": "Umuchinemere Procredit Microfinance Bank",
    "cbnCode": "090514",
    "paystackCode": "",
    "switchCode": "090514",
    "centiivCode": "090514",
    "aliases": [
      "umuchinemere procredit microfinance bank",
      "umuchinemere procredit mfb"
    ]
  },
  {
    "name": "UMUCHINEMERE PROCREDIT MICROFINANCE BANK",
    "cbnCode": "090664",
    "paystackCode": "090664",
    "switchCode": "090664",
    "centiivCode": "090664",
    "aliases": [
      "umuchinemere procredit microfinance bank",
      "good shepherd microfinance bank"
    ]
  },
  {
    "name": "Umuchukwu MFB",
    "cbnCode": "090632",
    "paystackCode": "",
    "switchCode": "090632",
    "centiivCode": "090632",
    "aliases": [
      "umuchukwu mfb"
    ]
  },
  {
    "name": "UMUCHUKWU MFB",
    "cbnCode": "090652",
    "paystackCode": "",
    "switchCode": "090652",
    "centiivCode": "090652",
    "aliases": [
      "umuchukwu mfb"
    ]
  },
  {
    "name": "Umunnachi Microfinance Bank",
    "cbnCode": "090510",
    "paystackCode": "",
    "switchCode": "090510",
    "centiivCode": "090510",
    "aliases": [
      "umunnachi microfinance bank",
      "umunnachi mfb"
    ]
  },
  {
    "name": "UMUNRI MFB",
    "cbnCode": "090808",
    "paystackCode": "",
    "switchCode": "090808",
    "centiivCode": "090808",
    "aliases": [
      "umunri mfb"
    ]
  },
  {
    "name": "Umuoji MFB",
    "cbnCode": "090814",
    "paystackCode": "",
    "switchCode": "090814",
    "centiivCode": "090814",
    "aliases": [
      "umuoji mfb"
    ]
  },
  {
    "name": "UNAAB MICROFINANCE BANK",
    "cbnCode": "090331",
    "paystackCode": "",
    "switchCode": "090331",
    "centiivCode": "090331",
    "aliases": [
      "unaab microfinance bank"
    ]
  },
  {
    "name": "UNIABUJA MFB",
    "cbnCode": "090778",
    "paystackCode": "51447",
    "switchCode": "090778",
    "centiivCode": "090778",
    "aliases": [
      "uniabuja mfb"
    ]
  },
  {
    "name": "UNIBEN MICROFINANCE BANK",
    "cbnCode": "090266",
    "paystackCode": "",
    "switchCode": "090266",
    "centiivCode": "090266",
    "aliases": [
      "uniben microfinance bank"
    ]
  },
  {
    "name": "UNICAL MICROFINANCE BANK",
    "cbnCode": "090193",
    "paystackCode": "",
    "switchCode": "090193",
    "centiivCode": "090193",
    "aliases": [
      "unical microfinance bank"
    ]
  },
  {
    "name": "Unifund MFB",
    "cbnCode": "090637",
    "paystackCode": "",
    "switchCode": "090637",
    "centiivCode": "090637",
    "aliases": [
      "unifund mfb"
    ]
  },
  {
    "name": "Uniibadan Microfinance Bank",
    "cbnCode": "090461",
    "paystackCode": "",
    "switchCode": "090461",
    "centiivCode": "090461",
    "aliases": [
      "uniibadan microfinance bank"
    ]
  },
  {
    "name": "UNILAG Microfinance Bank",
    "cbnCode": "090452",
    "paystackCode": "51316",
    "switchCode": "090452",
    "centiivCode": "090452",
    "aliases": [
      "unilag microfinance bank"
    ]
  },
  {
    "name": "UNILORIN MICROFINANCE BANK",
    "cbnCode": "090341",
    "paystackCode": "",
    "switchCode": "090341",
    "centiivCode": "090341",
    "aliases": [
      "unilorin microfinance bank",
      "unilorin mfb"
    ]
  },
  {
    "name": "UNIMAID MICROFINANCE BANK",
    "cbnCode": "090464",
    "paystackCode": "50875",
    "switchCode": "090464",
    "centiivCode": "090464",
    "aliases": [
      "unimaid microfinance bank"
    ]
  },
  {
    "name": "Union Bank of Nigeria",
    "cbnCode": "000018",
    "paystackCode": "032",
    "switchCode": "000018",
    "centiivCode": "000018",
    "aliases": [
      "union",
      "union bank",
      "union bank of nigeria"
    ]
  },
  {
    "name": "United Bank For Africa",
    "cbnCode": "000004",
    "paystackCode": "033",
    "switchCode": "000004",
    "centiivCode": "000004",
    "aliases": [
      "uba",
      "united bank",
      "united bank for africa"
    ]
  },
  {
    "name": "Unity Bank",
    "cbnCode": "000011",
    "paystackCode": "215",
    "switchCode": "000011",
    "centiivCode": "000011",
    "aliases": [
      "unity",
      "unity bank"
    ]
  },
  {
    "name": "UNIUYO MICROFINANCE BANK",
    "cbnCode": "090338",
    "paystackCode": "",
    "switchCode": "090338",
    "centiivCode": "090338",
    "aliases": [
      "uniuyo microfinance bank"
    ]
  },
  {
    "name": "UNIVERSITY OF NIGERIA, NSUKKA MICROFINANCE BANK",
    "cbnCode": "090251",
    "paystackCode": "",
    "switchCode": "090251",
    "centiivCode": "090251",
    "aliases": [
      "university of nigeria, nsukka microfinance bank",
      "unn mfb"
    ]
  },
  {
    "name": "UNUBI MFB",
    "cbnCode": "090719",
    "paystackCode": "",
    "switchCode": "090719",
    "centiivCode": "090719",
    "aliases": [
      "unubi mfb"
    ]
  },
  {
    "name": "URE MICROFINANCE BANK",
    "cbnCode": "090619",
    "paystackCode": "",
    "switchCode": "090619",
    "centiivCode": "090619",
    "aliases": [
      "ure microfinance bank"
    ]
  },
  {
    "name": "Uzondu MF Bank",
    "cbnCode": "090453",
    "paystackCode": "50894",
    "switchCode": "090453",
    "centiivCode": "090453",
    "aliases": [
      "uzondu",
      "uzondu mfb",
      "uzondu mf bank",
      "uzondu microfinance bank",
      "uzondu microfinance bank awka anambra state"
    ]
  },
  {
    "name": "Vale Finance Limited",
    "cbnCode": "110071",
    "paystackCode": "",
    "switchCode": "110071",
    "centiivCode": "110071",
    "aliases": [
      "vale finance limited"
    ]
  },
  {
    "name": "VALE FINANCE LIMITED",
    "cbnCode": "050020",
    "paystackCode": "050020",
    "switchCode": "050020",
    "centiivCode": "050020",
    "aliases": [
      "vale finance limited"
    ]
  },
  {
    "name": "Vas2nets Limited",
    "cbnCode": "110015",
    "paystackCode": "",
    "switchCode": "110015",
    "centiivCode": "110015",
    "aliases": [
      "vas2nets limited"
    ]
  },
  {
    "name": "Verdant Microfinance Bank",
    "cbnCode": "090474",
    "paystackCode": "",
    "switchCode": "090474",
    "centiivCode": "090474",
    "aliases": [
      "verdant microfinance bank"
    ]
  },
  {
    "name": "VFD Microfinance Bank Limited",
    "cbnCode": "090110",
    "paystackCode": "566",
    "switchCode": "090110",
    "centiivCode": "090110",
    "aliases": [
      "vfd",
      "vfd bank",
      "vfd mfb",
      "vfd microfinance bank",
      "vfd microfinance bank limited"
    ]
  },
  {
    "name": "Victory MFB",
    "cbnCode": "090813",
    "paystackCode": "",
    "switchCode": "090813",
    "centiivCode": "090813",
    "aliases": [
      "victory mfb"
    ]
  },
  {
    "name": "VigiPay",
    "cbnCode": "119099",
    "paystackCode": "",
    "switchCode": "119099",
    "centiivCode": "119099",
    "aliases": [
      "vigipay"
    ]
  },
  {
    "name": "VIRTUE MICROFINANCE BANK",
    "cbnCode": "090150",
    "paystackCode": "",
    "switchCode": "090150",
    "centiivCode": "090150",
    "aliases": [
      "virtue microfinance bank"
    ]
  },
  {
    "name": "VISA MICROFINANCE BANK",
    "cbnCode": "090139",
    "paystackCode": "",
    "switchCode": "090139",
    "centiivCode": "090139",
    "aliases": [
      "visa microfinance bank"
    ]
  },
  {
    "name": "VISTA MICROFINANCE BANK",
    "cbnCode": "090787",
    "paystackCode": "",
    "switchCode": "090787",
    "centiivCode": "090787",
    "aliases": [
      "vista microfinance bank",
      "vista microfinance bank"
    ]
  },
  {
    "name": "VT NETWORKS",
    "cbnCode": "100012",
    "paystackCode": "",
    "switchCode": "100012",
    "centiivCode": "100012",
    "aliases": [
      "vt networks",
      "vtnetworks"
    ]
  },
  {
    "name": "WALLET MFB",
    "cbnCode": "090805",
    "paystackCode": "",
    "switchCode": "090805",
    "centiivCode": "090805",
    "aliases": [
      "wallet mfb"
    ]
  },
  {
    "name": "Waya Microfinance Bank",
    "cbnCode": "090950",
    "paystackCode": "51355",
    "switchCode": "090950",
    "centiivCode": "090950",
    "aliases": [
      "waya microfinance bank"
    ]
  },
  {
    "name": "WAYA MICROFINANCE BANK LTD",
    "cbnCode": "090590",
    "paystackCode": "",
    "switchCode": "090590",
    "centiivCode": "090590",
    "aliases": [
      "waya microfinance bank ltd",
      "waya mfb"
    ]
  },
  {
    "name": "WE MFB",
    "cbnCode": "090989",
    "paystackCode": "",
    "switchCode": "090989",
    "centiivCode": "090989",
    "aliases": [
      "we mfb"
    ]
  },
  {
    "name": "Wema Bank",
    "cbnCode": "000017",
    "paystackCode": "035",
    "switchCode": "000017",
    "centiivCode": "000017",
    "aliases": [
      "wema",
      "wema bank",
      "alat",
      "alat by wema"
    ]
  },
  {
    "name": "WESLEY MFB",
    "cbnCode": "090699",
    "paystackCode": "",
    "switchCode": "090699",
    "centiivCode": "090699",
    "aliases": [
      "wesley mfb"
    ]
  },
  {
    "name": "WESTON-CHARIS MFB",
    "cbnCode": "090741",
    "paystackCode": "51386",
    "switchCode": "090741",
    "centiivCode": "090741",
    "aliases": [
      "weston-charis mfb",
      "weston charis mfb"
    ]
  },
  {
    "name": "WETLAND MICROFINANCE BANK",
    "cbnCode": "090120",
    "paystackCode": "",
    "switchCode": "090120",
    "centiivCode": "090120",
    "aliases": [
      "wetland microfinance bank"
    ]
  },
  {
    "name": "Whitecrust Finance",
    "cbnCode": "050035",
    "paystackCode": "",
    "switchCode": "050035",
    "centiivCode": "050035",
    "aliases": [
      "whitecrust finance"
    ]
  },
  {
    "name": "WINVIEW BANK",
    "cbnCode": "090419",
    "paystackCode": "",
    "switchCode": "090419",
    "centiivCode": "090419",
    "aliases": [
      "winview bank"
    ]
  },
  {
    "name": "WRA MICROFINANCE BANK",
    "cbnCode": "090631",
    "paystackCode": "",
    "switchCode": "090631",
    "centiivCode": "090631",
    "aliases": [
      "wra microfinance bank",
      "wra mfb"
    ]
  },
  {
    "name": "WUDIL MFB",
    "cbnCode": "090253",
    "paystackCode": "",
    "switchCode": "090253",
    "centiivCode": "090253",
    "aliases": [
      "wudil mfb"
    ]
  },
  {
    "name": "Xpress MTS",
    "cbnCode": "100041",
    "paystackCode": "",
    "switchCode": "100041",
    "centiivCode": "100041",
    "aliases": [
      "xpress mts"
    ]
  },
  {
    "name": "XPRESS PAYMENTS",
    "cbnCode": "090201",
    "paystackCode": "",
    "switchCode": "090201",
    "centiivCode": "090201",
    "aliases": [
      "xpress payments"
    ]
  },
  {
    "name": "XPRESS WALLET",
    "cbnCode": "100040",
    "paystackCode": "100040",
    "switchCode": "100040",
    "centiivCode": "100040",
    "aliases": [
      "xpress wallet",
      "xpresswallet"
    ]
  },
  {
    "name": "XSLNCE MICROFINANCE BANK",
    "cbnCode": "090124",
    "paystackCode": "",
    "switchCode": "090124",
    "centiivCode": "090124",
    "aliases": [
      "xslnce microfinance bank"
    ]
  },
  {
    "name": "YCT MICROFINANCE BANK",
    "cbnCode": "090466",
    "paystackCode": "",
    "switchCode": "090466",
    "centiivCode": "090466",
    "aliases": [
      "yct microfinance bank"
    ]
  },
  {
    "name": "YES MICROFINANCE BANK",
    "cbnCode": "090142",
    "paystackCode": "",
    "switchCode": "090142",
    "centiivCode": "090142",
    "aliases": [
      "yes microfinance bank"
    ]
  },
  {
    "name": "YOBE MICROFINANCE BANK",
    "cbnCode": "090252",
    "paystackCode": "",
    "switchCode": "090252",
    "centiivCode": "090252",
    "aliases": [
      "yobe microfinance bank"
    ]
  },
  {
    "name": "Zap",
    "cbnCode": "00zap",
    "paystackCode": "00zap",
    "switchCode": "00zap",
    "centiivCode": "00zap",
    "aliases": [
      "zap"
    ]
  },
  {
    "name": "ZEDVANCE FINANCE LIMITED",
    "cbnCode": "050019",
    "paystackCode": "",
    "switchCode": "050019",
    "centiivCode": "050019",
    "aliases": [
      "zedvance finance limited"
    ]
  },
  {
    "name": "ZEFA MFB",
    "cbnCode": "090747",
    "paystackCode": "",
    "switchCode": "090747",
    "centiivCode": "090747",
    "aliases": [
      "zefa mfb",
      "bosak mfb"
    ]
  },
  {
    "name": "Zenith Bank",
    "cbnCode": "000015",
    "paystackCode": "057",
    "switchCode": "000015",
    "centiivCode": "000015",
    "aliases": [
      "zenith",
      "zenith bank",
      "zenith bank plc"
    ]
  },
  {
    "name": "ZENITH EASY WALLET",
    "cbnCode": "100034",
    "paystackCode": "",
    "switchCode": "100034",
    "centiivCode": "100034",
    "aliases": [
      "zenith easy wallet",
      "zenith eazy wallet"
    ]
  },
  {
    "name": "ZENITH MOBILE",
    "cbnCode": "100018",
    "paystackCode": "",
    "switchCode": "100018",
    "centiivCode": "100018",
    "aliases": [
      "zenith mobile",
      "zenithmobile"
    ]
  },
  {
    "name": "ZIKORA MICROFINANCE BANK",
    "cbnCode": "090504",
    "paystackCode": "",
    "switchCode": "090504",
    "centiivCode": "090504",
    "aliases": [
      "zikora microfinance bank"
    ]
  },
  {
    "name": "ZITRA MFB",
    "cbnCode": "090718",
    "paystackCode": "51373",
    "switchCode": "090718",
    "centiivCode": "090718",
    "aliases": [
      "zitra mfb"
    ]
  }
];

// O(1) Pre-Indexed Lookup Hash Maps (Bootstrapped at module evaluation)
const byCbnCode = new Map<string, NigerianBank>();
const byPaystackCode = new Map<string, NigerianBank>();
const byAlias = new Map<string, NigerianBank>();

/**
 * Strips noise words from bank strings (e.g. "Microfinance", "Bank", "Plc", "Limited", "Nigeria")
 * allowing deterministic core brand matching.
 */
export function normalizeBankToken(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\b(microfinance|micro\s*finance|bank|mfb|plc|limited|ltd|of\s*nigeria|nigeria|services|payment)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

for (const bank of NIGERIAN_BANKS) {
  if (bank.cbnCode) {
    byCbnCode.set(bank.cbnCode, bank);
  }

  if (bank.paystackCode) {
    byPaystackCode.set(bank.paystackCode, bank);
  }

  function registerAlias(key: string, candidate: NigerianBank) {
    if (!key) return;
    const existing = byAlias.get(key);
    if (!existing) {
      byAlias.set(key, candidate);
      return;
    }
    // Prefer entry with populated paystackCode if existing has none
    if (!existing.paystackCode && candidate.paystackCode) {
      byAlias.set(key, candidate);
    }
  }

  const canonicalLower = bank.name.toLowerCase().trim();
  registerAlias(canonicalLower, bank);

  const canonicalClean = canonicalLower.replace(/[^a-z0-9]/g, "");
  registerAlias(canonicalClean, bank);

  const canonicalToken = normalizeBankToken(bank.name);
  if (canonicalToken) {
    registerAlias(canonicalToken, bank);
  }

  for (const alias of bank.aliases) {
    const aLower = alias.toLowerCase().trim();
    registerAlias(aLower, bank);

    const aClean = aLower.replace(/[^a-z0-9]/g, "");
    registerAlias(aClean, bank);

    const aToken = normalizeBankToken(alias);
    if (aToken) {
      registerAlias(aToken, bank);
    }
  }
}

/**
 * Resolves ANY user input (bank name, alias, acronym, CBN code, or Paystack code)
 * into a verified `NigerianBank` with all provider routing codes.
 */
export function resolveNigerianBank(input: string): NigerianBank | null {
  if (!input || typeof input !== "string") return null;
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, "");

  // 1. Direct code lookup (CBN code or Paystack code)
  if (byCbnCode.has(raw)) return byCbnCode.get(raw)!;
  if (byPaystackCode.has(raw)) return byPaystackCode.get(raw)!;

  // 2. Direct exact alias match (O(1))
  if (byAlias.has(lower)) return byAlias.get(lower)!;
  if (byAlias.has(clean)) return byAlias.get(clean)!;

  // 3. Normalized stem/brand token match (e.g. "First Bank Plc" -> "first")
  const token = normalizeBankToken(raw);
  if (token && byAlias.has(token)) {
    return byAlias.get(token)!;
  }

  // 4. Substring fallback containment across canonical names
  for (const bank of NIGERIAN_BANKS) {
    const bankClean = bank.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (bankClean === clean || bankClean.includes(clean) || (clean.length >= 4 && clean.includes(bankClean))) {
      return bank;
    }
  }

  return null;
}

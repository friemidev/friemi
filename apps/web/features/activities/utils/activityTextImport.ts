import type {
  ActivityCategory,
  ActivityType,
  PriceType,
  VisibilityType,
} from "@chill-club/shared";

export type ActivityTextImportDraft = {
  address?: string;
  capacity?: string;
  capacityLimitEnabled?: boolean;
  category?: ActivityCategory;
  city?: string;
  description?: string;
  destination?: string;
  endAt?: string;
  minParticipants?: string;
  priceText?: string;
  priceType?: PriceType;
  requiresApproval?: boolean;
  startAt?: string;
  ticketLabel?: "RESERVE_SPOT" | "VIEW_DETAILS";
  ticketUrl?: string;
  title?: string;
  type?: ActivityType;
  visibility?: VisibilityType;
};

export type ActivityTextImportFieldKey = keyof ActivityTextImportDraft;

export type ActivityTextImportParsedField = {
  key: ActivityTextImportFieldKey;
  value: string | boolean;
};

export type ActivityTextImportResult = {
  draft: ActivityTextImportDraft;
  fields: ActivityTextImportParsedField[];
};

type DateParts = {
  day: number;
  month: number;
  year: number;
};

type TimeParts = {
  hour: number;
  index: number;
  minute: number;
};

const maxTitleLength = 80;
const maxDescriptionLength = 3000;
const maxPriceTextLength = 120;
const maxAddressLength = 160;

const fieldOrder: ActivityTextImportFieldKey[] = [
  "title",
  "category",
  "type",
  "city",
  "destination",
  "address",
  "startAt",
  "endAt",
  "capacity",
  "minParticipants",
  "priceType",
  "priceText",
  "ticketUrl",
  "visibility",
  "requiresApproval",
  "description",
];

const titleLabels =
  /^(?:标题|题目|主题|名称|活动标题|活动名称|组局标题|组局名称|title|name|event\s*name|sortie|titre|nom)$/i;
const destinationLabels = /(?:目的地|终点|destination|arrivee|arrivée)/i;
const addressLabels =
  /(?:地点|地址|集合地点|集合地址|见面地点|location|venue|lieu|adresse|rdv|rendez[-\s]?vous)/i;
const priceLabels = /(?:费用|价格|预算|门票|price|fee|budget|tarif|prix)/i;
const capacityLabels =
  /(?:人数|名额|上限|限|招募|招|capacity|spots?|places?|participants?)/i;

const addressLabelExclusions =
  /(?:时间|日期|人数|名额|费用|价格|预算|链接|报名|time|date|spots?|places?|capacity|price|fee|budget|link|registration|inscription)/i;
const ignoredTitleLabels =
  /^(?:时间|日期|地点|地址|集合|城市|人数|名额|费用|价格|预算|报名|链接|备注|说明|要求|date|time|location|venue|city|price|fee|budget|spots?|capacity|register|registration|link|lieu|adresse|ville|prix|tarif)\s*[：:]/i;
const titleSignalPattern =
  /(?:局|组局|搭子|同行|一起|约|看展|桌游|电影|羽毛球|咖啡|brunch|city\s*walk|citywalk|meetup|sortie|soirée|soiree|night|session|club|workshop)/i;
const titleNoisePrefixPattern =
  /^(?:大家好|嗨|哈喽|hello|hi|bonjour|salut|有没有人|有人想|想问下|请问|欢迎|报名|备注|说明|ps\b|p\.s\.)/i;

const cityAliases: Array<[string, RegExp]> = [
  ["Paris", /(?:巴黎|\bparis\b)/i],
  ["Lyon", /(?:里昂|\blyon\b)/i],
  ["Marseille", /(?:马赛|\bmarseille\b)/i],
  ["Nice", /(?:尼斯|\bnice\b)/i],
  ["Toulouse", /(?:图卢兹|\btoulouse\b)/i],
  ["Bordeaux", /(?:波尔多|\bbordeaux\b)/i],
  ["Lille", /(?:里尔|\blille\b)/i],
  ["Nantes", /(?:南特|\bnantes\b)/i],
  ["Strasbourg", /(?:斯特拉斯堡|\bstrasbourg\b)/i],
  ["Rennes", /(?:雷恩|\brennes\b)/i],
  ["Montpellier", /(?:蒙彼利埃|\bmontpellier\b)/i],
  ["Grenoble", /(?:格勒诺布尔|\bgrenoble\b)/i],
  ["Dijon", /(?:第戎|\bdijon\b)/i],
  ["Rouen", /(?:鲁昂|\brouen\b)/i],
  ["Reims", /(?:兰斯|\breims\b)/i],
  ["Tours", /(?:图尔|\btours\b)/i],
  ["Annecy", /(?:安纳西|\bannecy\b)/i],
  ["Cannes", /(?:戛纳|\bcannes\b)/i],
];

const categoryRules: Array<[ActivityCategory, RegExp]> = [
  [
    "BOARD_GAME",
    /(?:桌游|狼人杀|剧本杀|麻将|棋牌|board\s*game|avalon|catan|poker|loup[-\s]?garou)/i,
  ],
  [
    "AUDIO_VISUAL",
    /(?:电影|影院|放映|观影|cinema|cinéma|screening|film|movie)/i,
  ],
  [
    "SPORTS",
    /(?:运动|跑步|羽毛球|网球|足球|篮球|瑜伽|攀岩|骑行|健身|滑雪|sport|running|run|yoga|climbing|cycling|football|tennis|badminton|basketball|ski)/i,
  ],
  [
    "MUSIC",
    /(?:音乐|演唱会|音乐会|音乐节|爵士|ktv|karaoke|concert|jazz|live\s*music|festival)/i,
  ],
  [
    "FOOD",
    /(?:饭|餐|咖啡|甜品|火锅|烧烤|brunch|dinner|lunch|cafe|café|coffee|restaurant|déjeuner|diner|dîner|bbq|barbecue)/i,
  ],
  [
    "ART",
    /(?:看展|展览|美术馆|博物馆|画廊|艺术|museum|gallery|expo|exposition|art)/i,
  ],
  [
    "GROWTH",
    /(?:读书|学习|语言|讲座|工作坊|workshop|atelier|language|study|lecture|course|coding|book\s*club)/i,
  ],
  [
    "TRAVEL",
    /(?:旅行|旅游|周边游|出游|徒步|露营|road\s*trip|weekend\s*trip|voyage|randonnée|hiking|camping)/i,
  ],
  [
    "WANDER",
    /(?:city\s*walk|citywalk|散步|闲逛|逛街|漫步|balade|promenade|walk)/i,
  ],
];

const frenchMonthNames: Record<string, number> = {
  aout: 8,
  avril: 4,
  decembre: 12,
  décembre: 12,
  fevrier: 2,
  février: 2,
  janvier: 1,
  juillet: 7,
  juin: 6,
  mai: 5,
  mars: 3,
  novembre: 11,
  octobre: 10,
  septembre: 9,
};

export function parseActivityTextImport(
  sourceText: string,
  options: { now?: Date } = {},
): ActivityTextImportResult {
  const text = normalizeText(sourceText);
  const lines = getLines(text);
  const now = options.now ?? new Date();
  const draft: ActivityTextImportDraft = {};

  const title = extractTitle(lines);
  if (title) {
    draft.title = title;
  }

  if (text) {
    draft.description = truncateText(text, maxDescriptionLength);
  }

  const category = detectCategory(text);
  if (category) {
    draft.category = category;
  }

  const destination = extractLabeledValue(lines, destinationLabels);
  const type = detectType(text, destination);
  if (type) {
    draft.type = type;
  }
  if (destination) {
    draft.destination = truncateText(destination, 80);
  }

  const city = detectCity(text);
  if (city) {
    draft.city = city;
  }

  const address = extractAddress(lines);
  if (address) {
    draft.address = address;
  }

  const dateTimes = extractDateTimes(lines, text, now);
  if (dateTimes.startAt) {
    draft.startAt = dateTimes.startAt;
  }
  if (dateTimes.endAt) {
    draft.endAt = dateTimes.endAt;
  }

  const minParticipants = extractMinParticipants(text);
  if (minParticipants) {
    draft.minParticipants = minParticipants;
  }

  const capacity = extractCapacity(lines, text);
  if (capacity) {
    draft.capacity = capacity;
    draft.capacityLimitEnabled = true;
  }

  const price = extractPrice(lines, text);
  if (price) {
    draft.priceType = price.priceType;
    draft.priceText = price.priceText;
  }

  const ticketUrl = extractTicketUrl(text);
  if (ticketUrl) {
    draft.ticketUrl = ticketUrl;
    draft.ticketLabel = getTicketLabel(text, ticketUrl);
  }

  const visibility = detectVisibility(text);
  if (visibility) {
    draft.visibility = visibility;
  }

  const requiresApproval = detectApprovalRequirement(text);
  if (requiresApproval !== undefined) {
    draft.requiresApproval = requiresApproval;
  }

  return {
    draft,
    fields: buildParsedFields(draft),
  };
}

function normalizeText(value: string) {
  return normalizeDigits(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[：]/g, ":")
    .replace(/[，]/g, ",")
    .replace(/[。]/g, ".")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeDigits(value: string) {
  return value.replace(/[０-９]/g, (char) =>
    String(char.charCodeAt(0) - 0xff10),
  );
}

function getLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s#>*\-•·]+/, "").trim())
    .filter(Boolean);
}

function extractTitle(lines: string[]) {
  const labeledTitle = extractLabeledTitle(lines);

  if (labeledTitle) {
    return truncateText(labeledTitle, maxTitleLength);
  }

  const bracketTitle = extractBracketTitle(lines);
  if (bracketTitle) {
    return bracketTitle;
  }

  const [bestCandidate] = lines
    .map((line, index) => scoreTitleCandidate(line, index))
    .filter((candidate) => candidate !== null)
    .sort((left, right) => right.score - left.score);

  return bestCandidate && bestCandidate.score >= 45
    ? truncateText(bestCandidate.title, maxTitleLength)
    : undefined;
}

function extractLabeledTitle(lines: string[]) {
  for (const line of lines) {
    const parsedLine = parseLabeledLine(line);

    if (!parsedLine) {
      continue;
    }

    if (titleLabels.test(normalizeLabel(parsedLine.label))) {
      const title = cleanTitle(parsedLine.value);

      if (isUsableTitle(title, line)) {
        return title;
      }
    }
  }

  return undefined;
}

function extractBracketTitle(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/^[【\[]\s*(.{3,80}?)\s*[】\]]/);
    const title = match ? cleanTitle(match[1]) : "";

    if (title && isUsableTitle(title, line)) {
      return truncateText(title, maxTitleLength);
    }
  }

  return undefined;
}

function scoreTitleCandidate(line: string, index: number) {
  const title = cleanTitle(line);

  if (!isUsableTitle(title, line)) {
    return null;
  }

  let score = 80 - index * 6;

  if (titleSignalPattern.test(title)) {
    score += 30;
  }

  if (detectCategory(title)) {
    score += 25;
  }

  if (line.startsWith("【") || line.startsWith("[")) {
    score += 20;
  }

  if (title.length >= 4 && title.length <= 32) {
    score += 20;
  } else if (title.length <= 52) {
    score += 8;
  } else {
    score -= 28;
  }

  if (titleNoisePrefixPattern.test(line)) {
    score -= 20;
  }

  if (extractDateParts(title, new Date("2026-01-01T00:00:00"))) {
    score -= 8;
  }

  return { score, title };
}

function isUsableTitle(title: string, originalLine: string) {
  if (title.length < 3 || title.length > 100) {
    return false;
  }

  if (/^https?:\/\//i.test(title) || /^https?:\/\//i.test(originalLine)) {
    return false;
  }

  if (ignoredTitleLabels.test(originalLine)) {
    return false;
  }

  const parsedLine = parseLabeledLine(originalLine);
  if (
    parsedLine &&
    !titleLabels.test(normalizeLabel(parsedLine.label)) &&
    /(?:时间|日期|地点|地址|城市|人数|名额|费用|价格|预算|报名|链接|备注|说明|要求|time|date|location|venue|city|price|fee|budget|spots?|capacity|link|lieu|adresse|ville|prix|tarif)/i.test(
      parsedLine.label,
    )
  ) {
    return false;
  }

  if (isMostlyDateOrTime(title)) {
    return false;
  }

  if (!/[A-Za-z\u4e00-\u9fff]/.test(title)) {
    return false;
  }

  return true;
}

function cleanTitle(value: string) {
  const embeddedTitle = extractEmbeddedTitle(value);
  const source = embeddedTitle ?? value;

  return source
    .replace(/^[^\p{L}\p{N}【\[]+/u, "")
    .replace(/^[【\[]\s*(.+?)\s*[】\]].*$/, "$1")
    .replace(/\s*[|｜]\s*(?:巴黎|Paris|Lyon|里昂|Marseille|马赛).*$/i, "")
    .replace(
      /\s*(?:时间|日期|地点|地址|人数|费用|报名|链接|date|time|location|price|fee|link)\s*:.*$/i,
      "",
    )
    .replace(/[。.!！?？；;]+$/, "")
    .trim();
}

function extractEmbeddedTitle(value: string) {
  const match = value.match(
    /(?:约|组织|发起|开|搞|安排|准备|计划|想约|organize|organise|planning)\s*(?:一个|一场|一局|一次|个|场|局|次)?\s*([^，,。.!！?？；;\n]{3,56}(?:局|组局|搭子|同行|活动|看展|桌游|电影|羽毛球|咖啡|brunch|city\s*walk|citywalk|meetup|sortie|soirée|soiree|night|session|club|workshop))/i,
  );

  return match?.[1]?.trim();
}

function isMostlyDateOrTime(value: string) {
  return /^(?:时间|日期|date|time)?\s*[:：]?\s*(?:\d{1,4}[年\/.-])?\d{1,2}[月\/.-]\d{1,2}/i.test(
    value,
  );
}

function extractLabeledValue(
  lines: string[],
  labels: RegExp,
  options: { excludeLabel?: RegExp } = {},
) {
  for (const line of lines) {
    const parsedLine = parseLabeledLine(line);
    if (!parsedLine) {
      continue;
    }

    const label = normalizeLabel(parsedLine.label);
    if (labels.test(label) && !options.excludeLabel?.test(label)) {
      return stripTrailingSentencePunctuation(parsedLine.value.trim());
    }
  }

  return undefined;
}

function parseLabeledLine(line: string) {
  const match = line.match(/^([^:]{1,28}):\s*(.+)$/);

  if (!match) {
    return null;
  }

  return {
    label: match[1].trim(),
    value: match[2].trim(),
  };
}

function normalizeLabel(label: string) {
  return label.replace(/\s+/g, " ").trim().toLowerCase();
}

function stripTrailingSentencePunctuation(value: string) {
  return value.replace(/[.。；;]+$/, "").trim();
}

function detectCategory(text: string) {
  return categoryRules.find(([, pattern]) => pattern.test(text))?.[0];
}

function detectType(text: string, destination?: string) {
  if (
    destination ||
    /(?:旅行|旅游|周边游|出游|目的地|road\s*trip|weekend\s*trip|voyage|travel\s*buddy)/i.test(
      text,
    )
  ) {
    return "TRIP" satisfies ActivityType;
  }

  return "LOCAL" satisfies ActivityType;
}

function detectCity(text: string) {
  const labeledCity = extractLabeledValue(
    getLines(text),
    /(?:城市|city|ville)/i,
  );
  if (labeledCity) {
    return truncateText(labeledCity, 60);
  }

  return cityAliases.find(([, pattern]) => pattern.test(text))?.[0];
}

function extractAddress(lines: string[]) {
  const labeledAddress = extractLabeledValue(lines, addressLabels, {
    excludeLabel: addressLabelExclusions,
  });

  if (labeledAddress) {
    return truncateText(cleanAddress(labeledAddress), maxAddressLength);
  }

  const pinnedLine = lines.find((line) => /^📍/.test(line));
  if (pinnedLine) {
    return truncateText(
      cleanAddress(pinnedLine.replace(/^📍\s*/, "")),
      maxAddressLength,
    );
  }

  const atLine = lines.find(
    (line) =>
      /(?:^|\s)@/.test(line) &&
      !/^https?:\/\//i.test(line) &&
      !line.includes("@gmail") &&
      !line.includes("@hotmail"),
  );

  if (!atLine) {
    return undefined;
  }

  return truncateText(
    cleanAddress(atLine.replace(/^.*?@\s*/, "")),
    maxAddressLength,
  );
}

function cleanAddress(value: string) {
  return value
    .replace(/\s*(?:时间|日期|date|time)\s*:.*$/i, "")
    .replace(
      /\s*(?:费用|价格|预算|门票|price|fee|budget|tarif|prix)\s*:.*$/i,
      "",
    )
    .replace(/\s*(?:人数|名额|上限|capacity|spots?|places?)\s*:.*$/i, "")
    .replace(/\s+报名.*$/i, "")
    .trim();
}

function extractDateTimes(
  lines: string[],
  text: string,
  now: Date,
): { endAt?: string; startAt?: string } {
  const contexts = [
    ...lines.map((line, index) =>
      [line, lines[index + 1]].filter(Boolean).join(" "),
    ),
    text,
  ];

  for (const context of contexts) {
    const date = extractDateParts(context, now);
    const times = extractTimes(context);

    if (!date || times.length === 0) {
      continue;
    }

    const [startTime, endTime] = times;
    return buildDateTimeRange(date, startTime, endTime);
  }

  return {};
}

function extractDateParts(value: string, now: Date): DateParts | null {
  const isoMatch = value.match(
    /\b(20\d{2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})\b/,
  );
  if (isoMatch) {
    const dateParts = buildDateParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
      now,
    );
    if (dateParts) {
      return dateParts;
    }
  }

  const chineseDateMatch = value.match(
    /(?:(20\d{2})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)?/,
  );
  if (chineseDateMatch) {
    const dateParts = buildDateParts(
      chineseDateMatch[1] ? Number(chineseDateMatch[1]) : undefined,
      Number(chineseDateMatch[2]),
      Number(chineseDateMatch[3]),
      now,
    );
    if (dateParts) {
      return dateParts;
    }
  }

  const numericDateMatch = value.match(/\b(\d{1,2})\s*[\/.-]\s*(\d{1,2})\b/);
  if (numericDateMatch) {
    const dateParts = buildDateParts(
      undefined,
      Number(numericDateMatch[1]),
      Number(numericDateMatch[2]),
      now,
    );
    if (dateParts) {
      return dateParts;
    }
  }

  const frenchDateMatch = value.match(
    /\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(20\d{2}))?\b/i,
  );
  if (frenchDateMatch) {
    const month = frenchMonthNames[frenchDateMatch[2].toLowerCase()];
    if (month) {
      const dateParts = buildDateParts(
        frenchDateMatch[3] ? Number(frenchDateMatch[3]) : undefined,
        month,
        Number(frenchDateMatch[1]),
        now,
      );
      if (dateParts) {
        return dateParts;
      }
    }
  }

  const relativeDate = extractRelativeDate(value, now);
  if (relativeDate) {
    return relativeDate;
  }

  return null;
}

function extractRelativeDate(value: string, now: Date): DateParts | null {
  const lowered = value.toLowerCase();

  if (/(?:今天|今日|\btoday\b|ce soir)/i.test(value)) {
    return dateToParts(now);
  }

  if (/(?:明天|\btomorrow\b|demain)/i.test(value)) {
    return dateToParts(addDays(now, 1));
  }

  if (/(?:后天)/.test(value)) {
    return dateToParts(addDays(now, 2));
  }

  const chineseWeekdayMatch = value.match(
    /(?:(下|下个|next)\s*)?(?:本|这|this\s*)?(?:周|星期|礼拜)([一二三四五六日天1-7])/i,
  );
  if (chineseWeekdayMatch) {
    const targetDay = parseWeekday(chineseWeekdayMatch[2]);
    if (targetDay !== null) {
      return dateToParts(
        addDays(
          now,
          getWeekdayDelta(now, targetDay, Boolean(chineseWeekdayMatch[1])),
        ),
      );
    }
  }

  const englishWeekdayMatch = lowered.match(
    /\b(next\s+)?(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i,
  );
  if (englishWeekdayMatch) {
    const targetDay = parseWeekday(englishWeekdayMatch[2]);
    if (targetDay !== null) {
      return dateToParts(
        addDays(
          now,
          getWeekdayDelta(now, targetDay, Boolean(englishWeekdayMatch[1])),
        ),
      );
    }
  }

  return null;
}

function buildDateParts(
  explicitYear: number | undefined,
  month: number,
  day: number,
  now: Date,
): DateParts | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  let year = explicitYear ?? now.getFullYear();
  const candidate = new Date(year, month - 1, day);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  if (!explicitYear) {
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
    );
    if (candidate < yesterday) {
      year += 1;
    }
  }

  return { day, month, year };
}

function extractTimes(value: string) {
  const times: TimeParts[] = [];
  const colonTimePattern = /\b(\d{1,2})\s*[:：]\s*(\d{2})\s*(am|pm)?\b/gi;
  const wordTimePattern =
    /(?:(上午|早上|中午|下午|晚上|晚|morning|afternoon|evening|soir|matin)\s*)?(\d{1,2})\s*(?:点|時|时|h)\s*(半|\d{1,2})?\s*(am|pm)?/gi;
  const amPmTimePattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi;

  for (const match of value.matchAll(colonTimePattern)) {
    const time = normalizeHour(Number(match[1]), Number(match[2]), match[3]);
    if (time) {
      times.push({ ...time, index: match.index ?? 0 });
    }
  }

  let previousWordTimeEndIndex = 0;
  let previousWordTimeMarker = "";

  for (const match of value.matchAll(wordTimePattern)) {
    const rawMinute = match[3];
    const minute = rawMinute === "半" ? 30 : Number(rawMinute ?? 0);
    const marker = match[1] ?? match[4] ?? "";
    const rangeSeparator = value.slice(
      previousWordTimeEndIndex,
      match.index ?? 0,
    );
    const inheritedMarker =
      marker ||
      (/^\s*(?:[-~—–至到])\s*$/.test(rangeSeparator)
        ? previousWordTimeMarker
        : "");
    const time = normalizeHour(Number(match[2]), minute, inheritedMarker);
    if (time) {
      times.push({ ...time, index: match.index ?? 0 });
    }

    previousWordTimeMarker = marker || inheritedMarker;
    previousWordTimeEndIndex = (match.index ?? 0) + match[0].length;
  }

  for (const match of value.matchAll(amPmTimePattern)) {
    const time = normalizeHour(
      Number(match[1]),
      Number(match[2] ?? 0),
      match[3],
    );
    if (time) {
      times.push({ ...time, index: match.index ?? 0 });
    }
  }

  return dedupeTimes(times).sort((left, right) => left.index - right.index);
}

function normalizeHour(hour: number, minute: number, meridiem?: string | null) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const marker = meridiem?.toLowerCase() ?? "";
  let normalizedHour = hour;

  if (/(?:pm|下午|晚上|晚|evening|soir)/i.test(marker) && normalizedHour < 12) {
    normalizedHour += 12;
  } else if (/(?:中午)/.test(marker) && normalizedHour < 11) {
    normalizedHour += 12;
  } else if (
    /(?:am|上午|早上|morning|matin)/i.test(marker) &&
    normalizedHour === 12
  ) {
    normalizedHour = 0;
  } else if (!marker && normalizedHour >= 1 && normalizedHour <= 7) {
    normalizedHour += 12;
  }

  return {
    hour: normalizedHour,
    minute,
  };
}

function dedupeTimes(times: TimeParts[]) {
  const seen = new Set<string>();

  return times.filter((time) => {
    const key = `${time.index}:${time.hour}:${time.minute}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildDateTimeRange(
  date: DateParts,
  startTime: TimeParts,
  endTime?: TimeParts,
) {
  const startAt = formatDateTime(date, startTime);

  if (!endTime) {
    return { startAt };
  }

  const startMinutes = startTime.hour * 60 + startTime.minute;
  const endMinutes = endTime.hour * 60 + endTime.minute;
  const endDate =
    endMinutes <= startMinutes
      ? dateToParts(new Date(date.year, date.month - 1, date.day + 1))
      : date;

  return {
    endAt: formatDateTime(endDate, endTime),
    startAt,
  };
}

function formatDateTime(
  date: DateParts,
  time: Pick<TimeParts, "hour" | "minute">,
) {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}T${pad2(
    time.hour,
  )}:${pad2(time.minute)}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dateToParts(date: Date): DateParts {
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function getWeekdayDelta(now: Date, targetDay: number, forceNextWeek: boolean) {
  const currentDay = now.getDay();
  const delta = (targetDay - currentDay + 7) % 7;

  return forceNextWeek ? delta + 7 : delta;
}

function parseWeekday(value: string) {
  const key = value.toLowerCase();
  const weekdayMap: Record<string, number> = {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 0,
    fri: 5,
    friday: 5,
    mon: 1,
    monday: 1,
    sat: 6,
    saturday: 6,
    sun: 0,
    sunday: 0,
    thu: 4,
    thursday: 4,
    tue: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    天: 0,
    日: 0,
  };

  return weekdayMap[key] ?? null;
}

function extractMinParticipants(text: string) {
  const match = text.match(
    /(?:至少|最少|minimum|min|au moins)\D{0,12}(\d{1,3})\s*(?:人|位|名|people|persons?|participants?)?|(\d{1,3})\s*(?:人|位|名)?\s*(?:起|成行)/i,
  );
  const rawValue = match?.[1] ?? match?.[2];
  const value = rawValue ? Number(rawValue) : 0;

  return value > 0 && value <= 100 ? String(value) : undefined;
}

function extractCapacity(lines: string[], text: string) {
  const labeledCapacity = lines
    .filter(
      (line) =>
        capacityLabels.test(line) &&
        !/(?:成行|起|min|minimum|至少|最少)/i.test(line),
    )
    .map(extractCapacityNumberFromLine)
    .find(Boolean);

  const genericCapacity =
    labeledCapacity ?? extractCapacityNumberFromLine(text);

  const value = genericCapacity ? Number(genericCapacity) : 0;

  return value >= 2 && value <= 100 ? String(value) : undefined;
}

function extractCapacityNumberFromLine(line: string) {
  const limitMatch =
    line.match(
      /(?:限|最多|上限|名额|招募|招|capacity|max(?:imum)?|spots?|places?)\D{0,10}(\d{1,3})/i,
    ) ??
    line.match(
      /(\d{1,3})\s*(?:人|位|名|spots?|places?|participants?)\s*(?:以内|上限|封顶|max(?:imum)?)/i,
    );

  if (limitMatch?.[1]) {
    return limitMatch[1];
  }

  if (/(?:成行|起|min|minimum|至少|最少|au moins)/i.test(line)) {
    return undefined;
  }

  return line.match(
    /(\d{1,3})\s*(?:人|位|名|spots?|places?|participants?)/i,
  )?.[1];
}

function extractPrice(
  lines: string[],
  text: string,
): { priceText: string; priceType: PriceType } | undefined {
  const priceLine = lines.find((line) => priceLabels.test(line));
  const priceSource = priceLine ?? text;

  if (/(?:免费|free|gratuit|0\s*(?:€|eur|欧|元|rmb|¥)\b)/i.test(priceSource)) {
    return {
      priceText: "",
      priceType: "FREE" satisfies PriceType,
    };
  }

  const amountMatch = priceSource.match(
    /(?:AA|A\.A\.|自费|平摊|门票自理|€\s?\d+(?:[.,]\d+)?|¥\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:€|eur|欧|元|rmb|¥))/i,
  );

  if (!amountMatch) {
    return undefined;
  }

  const inlinePriceText = priceLine
    ?.match(
      /(?:费用|价格|预算|门票|price|fee|budget|tarif|prix)\s*:\s*([^，,；;\n]+)/i,
    )?.[1]
    ?.trim();
  const priceText = inlinePriceText
    ? inlinePriceText
    : priceLine
      ? priceLine.replace(/^([^:]{1,28}):\s*/, "").trim()
      : amountMatch[0];

  return {
    priceText: truncateText(priceText, maxPriceTextLength),
    priceType: "FIXED" satisfies PriceType,
  };
}

function extractTicketUrl(text: string) {
  const url = text.match(/https?:\/\/[^\s<>()]+/i)?.[0];

  return url?.replace(/[),.;。]+$/, "");
}

function getTicketLabel(text: string, ticketUrl: string) {
  const index = text.indexOf(ticketUrl);
  const surroundingText =
    index >= 0
      ? text.slice(Math.max(0, index - 24), index + ticketUrl.length + 24)
      : text;

  return /(?:报名|预约|订票|购票|抢票|register|reserve|booking|ticket|billet|inscription)/i.test(
    surroundingText,
  )
    ? "RESERVE_SPOT"
    : "VIEW_DETAILS";
}

function detectVisibility(text: string) {
  if (/(?:私密|私人|仅好友|熟人局|private|invite\s*only)/i.test(text)) {
    return "PRIVATE" satisfies VisibilityType;
  }

  if (/(?:公开|开放|public|open\s*to\s*all)/i.test(text)) {
    return "PUBLIC" satisfies VisibilityType;
  }

  return undefined;
}

function detectApprovalRequirement(text: string) {
  if (
    /(?:无需审核|不用审核|自动通过|no\s*approval|sans\s*validation)/i.test(text)
  ) {
    return false;
  }

  if (
    /(?:审核|确认后|需通过|approval|required|validation|confirmation)/i.test(
      text,
    )
  ) {
    return true;
  }

  return undefined;
}

function buildParsedFields(draft: ActivityTextImportDraft) {
  return fieldOrder
    .filter((key) => draft[key] !== undefined && draft[key] !== "")
    .map((key) => ({
      key,
      value: draft[key] as string | boolean,
    }));
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim();

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Shared helpers: avatar URL and canned bot replies.
 */

import { SCORE_BOOSTS } from "./score-boosts.js";

var CS = SCORE_BOOSTS.calculateScore;

export const BOT_AVATAR_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaeP8hl62mjiOpCPEhzyPWAeGkP4JeYxyiSQ&s";

const BOT_RESPONSES = [
  "I'm here to help. How can I assist you today?",
  "Happy to help! What can I do for you?",
  "Let me know how I can assist you.",
  "How can I help you today?",
];

/**
 * @returns {string}
 */
export function getRandomBotResponse() {
  return BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
}

/**
 * Normalize user text for matching:
 * - lowercase
 * - trim
 * - remove simple punctuation
 * - collapse remaining punctuation to spaces
 * @param {string} input
 * @returns {string}
 */
export function normalizeForMatching(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize normalized input into words.
 * @param {string} input
 * @returns {string[]}
 */
export function tokenizeForMatching(input) {
  var normalized = normalizeForMatching(input);
  if (!normalized) return [];
  var raw = normalized.split(" ").filter(Boolean);
  var expanded = [];

  // Lightweight slang expansion for conversational shorthand.
  for (var i = 0; i < raw.length; i++) {
    var token = raw[i].replace(/(.)\1{2,}/g, "$1");
    if (token === "hru") {
      expanded.push("how", "r", "u");
      continue;
    }
    if (token === "wru") {
      expanded.push("what", "r", "u");
      continue;
    }
    if (token === "wyd") {
      expanded.push("what", "u", "doing");
      continue;
    }
    expanded.push(token);
  }

  // Repetition normalization: keep first occurrence only.
  var seen = {};
  var deduped = [];
  for (var d = 0; d < expanded.length; d++) {
    var tk = expanded[d];
    if (!seen[tk]) {
      seen[tk] = true;
      deduped.push(tk);
    }
  }

  return deduped;
}

/**
 * Partial match helper for light typo handling.
 * Keeps false positives down by:
 * - ignoring tiny tokens
 * - requiring similar lengths
 * @param {string} token
 * @param {string} keyword
 * @returns {boolean}
 */
export function isPartialMatch(token, keyword) {
  if (!token || !keyword) return false;
  if (token.length < 3) return false;

  // Avoid false positives from very short keywords (e.g. "ty" matching "tym").
  if (keyword.length < 3) return false;

  if (Math.abs(token.length - keyword.length) > 3) return false;
  if (token === keyword) return true;

  // Require meaningful similarity: first 2 chars OR last 2 chars match.
  var tokenFirst2 = token.slice(0, 2);
  var keywordFirst2 = keyword.slice(0, 2);
  var tokenLast2 = token.slice(-2);
  var keywordLast2 = keyword.slice(-2);
  var meaningful =
    tokenFirst2 === keywordFirst2 ||
    (tokenLast2 === keywordLast2 && token[0] === keyword[0]);
  if (!meaningful) return false;

  // If similarity is meaningful (and lengths are close), treat it as a typo match.
  return true;
}

function isEditDistanceAtMostOne(a, b) {
  if (a === b) return true;
  var la = a.length;
  var lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  var i = 0;
  var j = 0;
  var edits = 0;

  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (la > lb) i += 1;
    else if (lb > la) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }

  if (i < la || j < lb) edits += 1;
  return edits <= 1;
}

export function isTypoMatch(token, keyword) {
  if (!token || !keyword) return false;
  if (token.length < 4 || keyword.length < 4) return false;
  if (token.length <= 3 || keyword.length <= 3) return false;

  // Tight typo gate: first 2 OR last 2 chars must match.
  var first2Match = token.slice(0, 2) === keyword.slice(0, 2);
  var last2Match = token.slice(-2) === keyword.slice(-2);
  if (!first2Match && !last2Match) return false;

  return isEditDistanceAtMostOne(token, keyword);
}

export function isPrefixTypoMatch(token, keyword) {
  if (!token || !keyword) return false;
  if (keyword.length - token.length !== 1) return false;
  if (token.length < 3 || keyword.length < 4) return false;
  if (keyword.indexOf(token) !== 0) return false;
  return token.slice(0, 3) === keyword.slice(0, 3);
}

function removeVowels(str) {
  return String(str || "").replace(/[aeiou]/g, "");
}

export function isVowelDropMatch(token, keyword) {
  if (!token || !keyword) return false;
  if (token.length < 2 || token.length > 4) return false;
  if (keyword.length < 3) return false;
  return removeVowels(keyword) === token;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExactPhrase(normalizedText, normalizedKeyword) {
  var re = new RegExp(
    "(^|\\s)" + escapeRegex(normalizedKeyword) + "($|\\s)"
  );
  return re.test(normalizedText);
}

function hasExactToken(inputTokens, keywordToken) {
  return anyTokenMatches(inputTokens, function (token) {
    return token === keywordToken;
  });
}

function hasPartSimilarity(inputTokens, keywordPart) {
  var partLen = keywordPart.length;
  return anyTokenMatches(inputTokens, function (token) {
    if (!token) return false;
    if (token === keywordPart) return true;

    // For short parts, keep strict behavior: exact only.
    if (
      partLen <= CS.HAS_PART_SIMILARITY_STRICT_PART_LEN ||
      token.length <= CS.HAS_PART_SIMILARITY_STRICT_TOKEN_LEN
    )
      return false;

    if (
      isPartialMatch(token, keywordPart) ||
      isTypoMatch(token, keywordPart) ||
      isPrefixTypoMatch(token, keywordPart) ||
      isVowelDropMatch(token, keywordPart)
    ) {
      return true;
    }
    return false;
  });
}

function hasOneCharToken(inputTokens) {
  return anyTokenMatches(inputTokens, function (token) {
    return !!token && token.length === 1;
  });
}

function anyTokenMatches(inputTokens, predicate) {
  for (var i = 0; i < inputTokens.length; i++) {
    if (predicate(inputTokens[i], i)) return true;
  }
  return false;
}

/**
 * calculateScore(inputTokens, keyword)
 *
 * Improvised logic:
 * - Signal-to-Noise Ratio: Score is penalized for long "noisy" sentences.
 * - Dynamic Typo Gate: Forgiving on long words, strict on short words.
 *
 * @param {string[]} inputTokens tokens from tokenizeForMatching()
 * @param {string} keyword
 * @returns {number}
 */
export function calculateScore(inputTokens, keyword) {
  if (!inputTokens || !inputTokens.length) return 0;
  if (!keyword) return 0;

  var normalizedKeyword = normalizeForMatching(keyword);
  if (!normalizedKeyword) return 0;

  var normalizedText = inputTokens.join(" ");
  var kwLen = normalizedKeyword.length;
  
  var density = 1 / Math.max(1, inputTokens.length / 2);
  var baseMultiplier = density;

  // 1) Very Short Words (<= 3 chars) -> EXACT ONLY
  if (kwLen > 0 && kwLen <= 3 && normalizedKeyword.indexOf(" ") === -1) {
    for (var s = 0; s < inputTokens.length; s++) {
      if (inputTokens[s] === normalizedKeyword) {
        return (CS.EXACT_OR_PHRASE_BASE) * baseMultiplier;
      }
    }
    return 0;
  }

  var bonus = kwLen / CS.LENGTH_WEIGHT_DIVISOR;

  // 2) Exact phrase match
  if (hasExactPhrase(normalizedText, normalizedKeyword)) {
    return (CS.EXACT_OR_PHRASE_BASE + bonus) * baseMultiplier;
  }

  // 3) Partial phrase matches
  if (normalizedKeyword.indexOf(" ") !== -1) {
    var parts = normalizedKeyword.split(" ").filter(Boolean);
    var matchedParts = 0;
    for (var p = 0; p < parts.length; p++) {
      if (hasExactToken(inputTokens, parts[p])) matchedParts += 1;
      else if (parts[p].length >= 5 && hasPartSimilarity(inputTokens, parts[p])) {
        // Small credit for typo in a long phrase word
        matchedParts += 0.7;
      }
    }
    
    if (matchedParts / parts.length >= 0.6) {
      return (CS.PARTIAL_BASE + (matchedParts / parts.length)) * baseMultiplier;
    }
    return 0;
  }

  // 4) Single word matches
  for (var i = 0; i < inputTokens.length; i++) {
    var token = inputTokens[i];
    
    // Exact Word Match
    if (token === normalizedKeyword) return (CS.FULL_MATCH_BASE + bonus) * baseMultiplier;
    
    // Typo Guard:
    // - 4 chars: exact first/last letter + edit distance 1
    // - 5+ chars: standard typo rule
    if (kwLen === 4 && token.length >= 3 && token.length <= 5) {
       if (token[0] === normalizedKeyword[0] && isEditDistanceAtMostOne(token, normalizedKeyword)) {
         return (CS.PARTIAL_BASE) * baseMultiplier * 0.5; // High Confidence Tax
       }
    } else if (kwLen >= 5 && token.length >= 4) {
      if (isTypoMatch(token, normalizedKeyword) || isVowelDropMatch(token, normalizedKeyword)) {
        return (CS.PARTIAL_BASE) * baseMultiplier * 0.8; // Standard Confidence Tax
      }
    }
  }

  return 0;
}

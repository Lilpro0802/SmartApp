/**
 * Intent definitions and basic rule-based matching.
 */

import {
  calculateScore,
  isPartialMatch,
  isPrefixTypoMatch,
  isTypoMatch,
  isVowelDropMatch,
  normalizeForMatching,
  tokenizeForMatching,
} from "./utils.js";
import { SCORE_BOOSTS } from "./score-boosts.js";

var I = SCORE_BOOSTS.intent;
var V = SCORE_BOOSTS.validation;

const INTENTS = {
  greeting: {
    priority: 1,
    keywords: ["hi", "hello", "hey", "hiii", "hii", "heyy", "yo", "hey there"],
    responses: [
      "Hello! How can I assist you today?",
      "Hi there! What can I help you with?",
      "Hey! How can I assist you today?",
    ],
  },
  farewell: {
    priority: 1,
    keywords: ["bye", "goodbye", "see you", "later"],
    responses: [
      "Goodbye! Have a great day.",
      "See you later! Feel free to return anytime.",
      "Take care!",
    ],
  },
  gratitude: {
    priority: 1,
    keywords: ["thanks", "thank you", "thx", "thnx", "ty"],
    responses: ["You're welcome!", "Happy to help!", "Anytime!"],
  },
  positive_feedback: {
    priority: 1,
    keywords: [
      "good",
      "great",
      "nice",
      "perfect",
      "awesome",
      "well done",
      "good job",
      "amazing",
      "cool",
    ],
    responses: [
      "Glad you liked it!",
      "Happy to help!",
      "Great! Let me know if you need anything else.",
      "Awesome!",
    ],
  },
  negative_feedback: {
    priority: 1,
    keywords: ["bad", "not good", "wrong", "useless"],
    responses: [
      "I'm sorry about that. Let me try to help better.",
      "Got it, let me improve that.",
      "Thanks for the feedback. What can I fix?",
    ],
  },
  confirmation: {
    priority: 1,
    keywords: ["yes", "yeah", "yep", "correct", "right"],
    responses: ["Great, let's continue.", "Got it.", "Alright."],
  },
  acknowledgement: {
    priority: 1,
    keywords: ["ok", "okay", "alright", "fine"],
    responses: ["Got it.", "Alright.", "Understood.", "Okay, noted."],
  },
  apology: {
    priority: 1,
    keywords: ["sorry", "my bad", "oops"],
    responses: [
      "No worries at all!",
      "That's completely fine.",
      "No problem!",
    ],
  },
  identity: {
    priority: 2,
    keywords: ["who are you", "your name", "what is your name"],
    responses: [
      "I'm Smarty, your virtual assistant.",
      "You can call me Smarty. I'm here to help.",
      "I'm Smarty, designed to assist you.",
    ],
  },
  creator: {
    priority: 2,
    keywords: ["who made you", "who created you", "your creator"],
    responses: [
      "I was created by Rishit as part of a custom chatbot system.",
      "I'm Smarty, built and designed by Rishit to assist you on this platform.",
      "My creator is Rishit, who designed me to help answer all your queries.",
    ],
  },
  capabilities: {
    priority: 2,
    keywords: ["what can you do", "your features", "what do you help with"],
    responses: [
      "I can assist with general questions and guide you.",
      "I help answer queries and provide useful information.",
      "You can ask me anything, and I'll try to help.",
    ],
  },
  small_talk: {
    priority: 1,
    keywords: ["what's up", "whats up", "how's it going", "sup"],
    responses: [
      "All good here! How can I assist you?",
      "Everything is running smoothly. What do you need?",
      "I'm here and ready to help.",
    ],
  },
  mood: {
    priority: 1,
    keywords: ["how are you", "how are you doing"],
    responses: [
      "I'm doing well, thank you! How can I assist you?",
      "All good here! What can I help you with?",
      "I'm here and ready to help.",
    ],
  },
  jokes: {
    priority: 1,
    keywords: ["tell me a joke", "joke", "make me laugh"],
    responses: [
      "Why did the developer go broke? Because he used up all his cache.",
      "Why do programmers prefer dark mode? Because light attracts bugs.",
      "I would tell you a UDP joke, but you might not get it.",
    ],
  },
  help: {
    priority: 1,
    keywords: ["help", "assist me", "support"],
    responses: [
      "I'm here to help. What do you need?",
      "Let me know how I can assist you.",
      "Feel free to ask your question.",
    ],
  },
  clarification: {
    priority: 2,
    keywords: ["what do you mean", "can you explain", "explain that"],
    responses: [
      "Could you clarify what you mean?",
      "I'd be happy to explain, please specify.",
      "Can you provide more details?",
    ],
  },
  clarify: {
    keywords: [],
    responses: [
      "Did you mean something else? Could you clarify?",
      "I'm not completely sure I understood. Can you rephrase?",
    ],
  },
  unknown: {
    keywords: [],
    responses: [
      "I didn’t quite understand that. Could you rephrase?",
      "Can you try asking that differently?",
      "I'm not sure I got that. Maybe try asking for help?",
    ],
  },
};

function isYouToken(token) {
  return token === "you" || token === "u" || token === "yu" || token === "ya";
}

function getConversationPatternType(tokens) {
  var hasHow = tokens.indexOf("how") !== -1;
  var hasWhat = tokens.indexOf("what") !== -1;
  var hasAre = tokens.indexOf("are") !== -1 || tokens.indexOf("ar") !== -1 || tokens.indexOf("r") !== -1;
  var hasYou = false;
  for (var i = 0; i < tokens.length; i++) {
    if (isYouToken(tokens[i])) {
      hasYou = true;
      break;
    }
  }
  if (!hasYou) return "";
  if (hasHow) return "how_you";
  if (hasWhat) return "what_you";
  if (hasAre) return "are_you";
  return "";
}

function uniqueKeywordParts(keywords) {
  var set = {};
  var out = [];
  for (var i = 0; i < keywords.length; i++) {
    var parts = normalizeForMatching(keywords[i]).split(" ").filter(Boolean);
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      if (!set[p]) {
        set[p] = true;
        out.push(p);
      }
    }
  }
  return out;
}

function tokenMatchesPart(token, part) {
  if (!token || !part) return false;
  if (token === part) return true;
  if (isPrefixTypoMatch(token, part)) return true;
  if (isPartialMatch(token, part)) return true;
  if (isTypoMatch(token, part)) return true;
  if (isVowelDropMatch(token, part)) return true;
  return false;
}

function filterNoiseForScoring(tokens) {
  if (!tokens || tokens.length <= 1) return tokens || [];
  var NOISE_WORDS = { bro: true, hey: true, yo: true, please: true };
  var filtered = [];
  for (var i = 0; i < tokens.length; i++) {
    if (!NOISE_WORDS[tokens[i]]) filtered.push(tokens[i]);
  }
  return filtered.length ? filtered : tokens;
}

function countMatchedTokens(tokens, parts) {
  var count = 0;
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    var matched = false;
    for (var j = 0; j < parts.length; j++) {
      if (tokenMatchesPart(token, parts[j])) {
        matched = true;
        break;
      }
    }
    if (matched) count += 1;
  }
  return count;
}

function hasShortSoftMatch(tokens, parts) {
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (!token || token.length > 3) continue;
    for (var j = 0; j < parts.length; j++) {
      var part = parts[j];
      if (part.length < 3) continue;
      if (isVowelDropMatch(token, part)) return true;
      if (token.length >= 2 && part.indexOf(token) === 0) return true;
    }
  }
  return false;
}

function first2AndLast2Match(a, b) {
  if (!a || !b) return false;
  if (a.length < 4 || b.length < 4) return false;
  return a.slice(0, 2) === b.slice(0, 2) && a.slice(-2) === b.slice(-2);
}

function hasAllowedTailVariant(token, part) {
  if (!token || !part || token.length < 2 || part.length < 2) return false;
  var tokenLast = token.slice(-1);
  var tokenLast2 = token.slice(-2);
  var partLast2 = part.slice(-2);
  return tokenLast2[0] === tokenLast2[1] && partLast2[0] === tokenLast && partLast2[1] !== tokenLast;
}

function analyzeIntentEvidence(rawInput, intentKey) {
  var intent = INTENTS[intentKey];
  var tokens = tokenizeForMatching(rawInput);
  var scoringTokens = filterNoiseForScoring(tokens);
  var normalizedText = normalizeForMatching(rawInput);
  var keywordMatchCount = 0;
  var phraseMatchCount = 0;
  var matchedTokenCount = 0;
  var typoEvidence = [];
  var matchedTokenMap = {};

  if (!intent || !intent.keywords || !intent.keywords.length) {
    return {
      tokens: tokens,
      keywordMatchCount: 0,
      phraseMatchCount: 0,
      matchedTokenCount: 0,
      typoEvidence: [],
    };
  }

  for (var i = 0; i < intent.keywords.length; i++) {
    var kw = intent.keywords[i];
    var kwScore = calculateScore(scoringTokens, kw);
    if (kwScore <= 0) continue;
    keywordMatchCount += 1;

    var normalizedKeyword = normalizeForMatching(kw);
    if (
      normalizedKeyword.indexOf(" ") !== -1 &&
      normalizedKeyword &&
      normalizedText.indexOf(normalizedKeyword) !== -1
    ) {
      phraseMatchCount += 1;
    }

    var parts = normalizedKeyword.split(" ").filter(Boolean);
    for (var p = 0; p < parts.length; p++) {
      var part = parts[p];
      for (var t = 0; t < scoringTokens.length; t++) {
        var token = scoringTokens[t];
        var typoMatch = isTypoMatch(token, part);
        if (typoMatch) {
          typoEvidence.push({ token: token, part: part });
        }
        if (
          token === part ||
          isPartialMatch(token, part) ||
          isVowelDropMatch(token, part) ||
          typoMatch ||
          isPrefixTypoMatch(token, part)
        ) {
          matchedTokenMap[token + "::" + part] = true;
          continue;
        }
      }
    }
  }

  matchedTokenCount = Object.keys(matchedTokenMap).length;

  return {
    tokens: tokens,
    keywordMatchCount: keywordMatchCount,
    phraseMatchCount: phraseMatchCount,
    matchedTokenCount: matchedTokenCount,
    typoEvidence: typoEvidence,
  };
}

function hasDomainHeavyToken(tokens) {
  var DOMAIN_HEAVY_WORDS = {
    algorithm: true,
    physics: true,
    theorem: true,
    index: true,
    market: true,
  };
  for (var i = 0; i < tokens.length; i++) {
    if (DOMAIN_HEAVY_WORDS[tokens[i]]) return true;
  }
  return false;
}

function hasTechnicalAnchor(tokens) {
  var TECHNCIAL_ANCHORS = {
    feasibility: true,
    fiber: true,
    pincode: true,
    router: true,
    internet: true,
    billing: true,
    invoice: true,
    plan: true,
    speed: true,
    coverage: true
  };
  for (var i = 0; i < tokens.length; i++) {
    if (TECHNCIAL_ANCHORS[tokens[i]]) return true;
  }
  return false;
}

function passesFinalIntentValidation(rawInput, intentKey) {
  if (!intentKey || intentKey === "unknown" || intentKey === "clarify") return true;

  var analysis = analyzeIntentEvidence(rawInput, intentKey);
  var tokens = analysis.tokens;
  var isTechnical = hasTechnicalAnchor(tokens);

  // Conversational Intent Discipline:
  // If the user mentions a technical concept, DON'T greet them or tell a joke.
  var isConversational =
    intentKey === "greeting" ||
    intentKey === "jokes" ||
    intentKey === "mood" ||
    intentKey === "small_talk" ||
    intentKey === "positive_feedback";
    
  if (isConversational && isTechnical) return false;

  // Domain context filter
  if (isConversational && hasDomainHeavyToken(tokens)) return false;

  // Typo strict filter: typo-backed evidence must match both first2 and last2.
  for (var i = 0; i < analysis.typoEvidence.length; i++) {
    var typo = analysis.typoEvidence[i];
    if (
      !first2AndLast2Match(typo.token, typo.part) &&
      !hasAllowedTailVariant(typo.token, typo.part)
    ) {
      return false;
    }
  }

  // Dominance confirmation
  if (analysis.matchedTokenCount >= V.MIN_MATCHED_TOKENS_DOMINANCE) return true;

  // Context validation for weak evidence in multi-token inputs.
  var exemptContext = intentKey === "mood" || intentKey === "small_talk";
  if (
    !exemptContext &&
    tokens.length >= V.MIN_INPUT_TOKENS_FOR_WEAK_CONTEXT_GATE &&
    analysis.keywordMatchCount < V.MIN_KEYWORD_MATCHES_FOR_MULTI_TOKEN_CONFIDENCE &&
    analysis.phraseMatchCount === 0
  ) {
    return false;
  }

  return true;
}

/**
 * Get best-matching intent with a score (shared scoring with knowledge).
 * @param {string} rawInput
 * @returns {{ key: string, score: number }}
 */
export function getIntentMatch(rawInput) {
  var tokens = tokenizeForMatching(rawInput);
  if (!tokens.length) return { key: "unknown", score: 0 };
  var scoringTokens = filterNoiseForScoring(tokens);
  var conversationPattern = getConversationPatternType(tokens);
  var keys = Object.keys(INTENTS);

  var bestKey = "unknown";
  var bestScore = 0;
  var bestMatches = 0;
  var bestLongest = 0;
  var bestStrongMatches = 0;
  var bestPhraseMatches = 0;
  var bestMatchedTokenCount = 0;

  var secondScore = 0;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === "unknown" || key === "clarify") continue;
    var intent = INTENTS[key];
    var keywordParts = uniqueKeywordParts(intent.keywords);
    var baseScore = 0;
    var matches = 0;
    var weakMatches = 0;
    var strongMatches = 0;
    var phraseMatches = 0;
    var longest = 0;

    for (var j = 0; j < intent.keywords.length; j++) {
      var kw = intent.keywords[j];
      var kwScore = calculateScore(scoringTokens, kw);
      if (kwScore > 0) {
        baseScore += kwScore;
        // Extra confidence for matched multi-word phrases.
        if (kw.indexOf(" ") !== -1 && kwScore >= I.STRONG_KEYWORD_SCORE_MIN) {
          baseScore += I.MULTI_WORD_PHRASE_MATCH_EXTRA;
          phraseMatches += 1;
        }
        matches += 1;
        if (kwScore > 0 && kwScore < I.STRONG_KEYWORD_SCORE_MIN) weakMatches += 1;
        if (kwScore >= I.STRONG_KEYWORD_SCORE_MIN) strongMatches += 1;
        if (kw.length > longest) longest = kw.length;
      }
    }

    // Small phrase boost: reward multi-keyword evidence for same intent.
    if (matches >= I.MULTI_KEYWORD_EVIDENCE_MIN_MATCHES) {
      baseScore += I.MULTI_KEYWORD_EVIDENCE_BONUS;
    }

    // Weak token compensation for short conversational inputs.
    var matchedTokenCount = countMatchedTokens(scoringTokens, keywordParts);
    if (matchedTokenCount > 0 && matches > matchedTokenCount) {
      matches = matchedTokenCount;
    }
    if (
      matches >= 1 &&
      tokens.length <= I.SHORT_UTTERANCE_MAX_TOKENS &&
      matchedTokenCount >= I.SHORT_UTTERANCE_MIN_MATCHED_TOKENS
    ) {
      baseScore += I.SHORT_UTTERANCE_MATCHED_TOKEN_OVERLAP_BONUS;
    }
    if (tokens.length <= I.SHORT_UTTERANCE_MAX_TOKENS && weakMatches >= I.WEAK_MATCH_CLUSTER_MIN) {
      baseScore += I.WEAK_MATCH_CLUSTER_BONUS;
    }

    // Context pattern boost for casual conversational wording.
    if (
      (key === "mood" || key === "small_talk") &&
      getConversationPatternType(tokens) !== '' &&
      matchedTokenCount >= I.CASUAL_PATTERN_MIN_MATCHED_TOKENS
    ) {
      baseScore += I.CASUAL_CONVERSATION_PATTERN_BONUS;
    }

    if (conversationPattern === "how_you" && key === "mood") {
      baseScore += I.HOW_ARE_YOU_MOOD_PATTERN_BOOST;
    }
    if (conversationPattern === "what_you" && key === "small_talk") {
      baseScore += I.WHAT_DOING_SMALL_TALK_PATTERN_BOOST;
    }
    if (conversationPattern === "are_you" && key === "mood") {
      baseScore += I.ARE_YOU_MOOD_PATTERN_BOOST;
    }

    // Short token relaxation: allow low-confidence short tokens when
    // another strong signal already exists in a multi-token input.
    if (
      scoringTokens.length >= I.MIN_SCORING_TOKENS_FOR_SHORT_SOFT &&
      strongMatches >= I.MIN_STRONG_MATCHES_FOR_SHORT_SOFT &&
      hasShortSoftMatch(scoringTokens, keywordParts)
    ) {
      baseScore += I.SHORT_SOFT_ANCHOR_BONUS;
    }

    // Priority should only apply when there is a real base match.
    var score = baseScore > 0 ? baseScore + (intent.priority || 0) : 0;

    // Prefer higher score; if close/tied, prefer more matched keywords, then longer keyword match.
    var patternPriority =
      conversationPattern === "what_you" &&
      key === "small_talk" &&
      bestKey === "greeting" &&
      score >= bestScore - I.SMALL_TALK_VS_GREETING_SCORE_MARGIN;

    var dominance =
      matchedTokenCount >= I.DOMINANCE_MIN_MATCHED_TOKENS &&
      bestMatchedTokenCount <= I.DOMINANCE_OPPONENT_MAX_MATCHED_TOKENS &&
      score >= bestScore - I.DOMINANCE_NEAR_TIE_MARGIN;

    if (
      score > bestScore ||
      patternPriority ||
      dominance ||
      (score === bestScore && matches > bestMatches) ||
      (score === bestScore && matches === bestMatches && longest > bestLongest)
    ) {
      secondScore = bestScore;
      bestScore = score;
      bestMatches = matches;
      bestStrongMatches = strongMatches;
      bestPhraseMatches = phraseMatches;
      bestMatchedTokenCount = matchedTokenCount;
      bestLongest = longest;
      bestKey = key;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  // Safe fallback: if nothing matches, or the winner isn't clearly better than runner-up.
  if (bestScore <= 0) return { key: "unknown", score: 0 };
  // If the best intent is still very weak, treat it as unknown.
  if (bestScore < I.MIN_ACCEPT_INTENT_SCORE) return { key: "unknown", score: 0 };

  // Minimum confidence rule for multi-token inputs.
  var conversationExempt =
    (bestKey === "mood" || bestKey === "small_talk") && conversationPattern !== "";
  if (
    tokens.length >= V.MIN_INPUT_TOKENS_FOR_WEAK_CONTEXT_GATE &&
    bestMatches < V.MIN_KEYWORD_MATCHES_FOR_MULTI_TOKEN_CONFIDENCE &&
    bestPhraseMatches === 0 &&
    bestMatchedTokenCount < V.MIN_MATCHED_TOKENS_FOR_MULTI_TOKEN_CONFIDENCE &&
    !conversationExempt
  ) {
    return { key: "unknown", score: 0 };
  }
  // Use clarify only for weak/ambiguous wins, not strong clear matches.
  var allowShortStrongIntent =
    bestStrongMatches > 0 && tokens.length <= I.ALLOW_SHORT_STRONG_UTTERANCE_MAX_TOKENS;
  if (
    secondScore > 0 &&
    bestScore - secondScore < I.CLARIFY_RUNNER_UP_GAP_MAX &&
    bestScore < I.CLARIFY_BEST_SCORE_CEILING &&
    tokens.length >= I.CLARIFY_MIN_INPUT_TOKEN_COUNT &&
    bestLongest < I.CLARIFY_LONGEST_KEYWORD_LEN_LT &&
    !allowShortStrongIntent
  ) {
    return { key: "clarify", score: bestScore };
  }

  if (!passesFinalIntentValidation(rawInput, bestKey)) {
    return { key: "unknown", score: 0 };
  }

  return {
    key: bestKey,
    score: bestScore,
    matches: bestMatches,
    strongMatches: bestStrongMatches,
    phraseMatches: bestPhraseMatches,
    matchedTokenCount: bestMatchedTokenCount,
  };
}

/**
 * Backwards-compatible intent key getter.
 * @param {string} rawInput
 * @returns {string}
 */
export function getIntent(rawInput) {
  return getIntentMatch(rawInput).key;
}

/**
 * Pick a random response for a given intent key.
 * Falls back to unknown if key is missing.
 * @param {string} intentKey
 * @returns {string}
 */
export function getResponse(intentKey) {
  var intent = INTENTS[intentKey] || INTENTS.unknown;
  var list = intent.responses;
  if (!list || !list.length) {
    return "";
  }
  var index = Math.floor(Math.random() * list.length);
  return list[index];
}

export { INTENTS };


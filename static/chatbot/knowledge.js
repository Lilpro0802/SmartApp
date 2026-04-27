/**
 * Knowledge layer — broadband-specific FAQ answers.
 * Returns an answer string or null if no match.
 */

import { calculateScore, tokenizeForMatching } from "./utils.js";
import { SCORE_BOOSTS } from "./score-boosts.js";

var K = SCORE_BOOSTS.knowledge;

/**
 * Broadband-relevant FAQ entries.
 * Each item: { keywords: string[], answer: string | () => string }
 */
export const KNOWLEDGE_BASE = [
  // ─── BILLING & PAYMENTS ───
  {
    keywords: ["pay", "payment", "how to pay", "pay bill", "bill payment", "pay online"],
    answer:
      "You can pay your bill through the Dashboard → Billing section. We accept UPI, net banking, credit/debit cards, and auto-pay via your bank.",
  },
  {
    keywords: ["invoice", "download invoice", "receipt", "bill download"],
    answer:
      "Your invoices are available in Dashboard → Billing. Click 'Download Receipt' next to any invoice to save a PDF copy.",
  },
  {
    keywords: ["due date", "billing date", "when is bill", "payment due"],
    answer:
      "Your bill is generated on the 1st of each month and is due within 7 days. You can check exact dates in your Dashboard.",
  },
  {
    keywords: ["refund", "money back", "cancel refund"],
    answer:
      "Refunds for prepaid plans are processed within 7-10 business days. Contact our support team with your registered email for assistance.",
  },

  // ─── PLANS & UPGRADES ───
  {
    keywords: ["plan", "plans", "broadband plan", "which plan", "best plan", "plan details"],
    answer:
      "We offer 3 plans: Basic (50 Mbps, ₹499/mo), Standard (100 Mbps, ₹799/mo), and Premium (200 Mbps, ₹999/mo). Check the Plans section on our homepage for full details.",
  },
  {
    keywords: ["upgrade", "upgrade plan", "change plan", "switch plan"],
    answer:
      "You can upgrade your plan from Dashboard → My Plan → Upgrade. The new plan activates instantly, and you'll only pay the prorated difference.",
  },
  {
    keywords: ["cancel", "cancel plan", "cancel subscription", "deactivate", "stop service"],
    answer:
      "To cancel, go to Dashboard → My Plan → Cancel. Note: there's a 30-day notice period. Any remaining balance will be refunded.",
  },
  {
    keywords: ["speed", "mbps", "how fast", "internet speed", "bandwidth"],
    answer:
      "Our speeds range from 50 Mbps (Basic) to 200 Mbps (Premium). All plans offer symmetric upload/download speeds with no throttling.",
  },
  {
    keywords: ["data limit", "fup", "fair usage", "unlimited", "data cap"],
    answer:
      "All plans include a generous FUP (Fair Usage Policy). Basic: 500 GB, Standard: 1 TB, Premium: 1.5 TB. After FUP, speed reduces to 2 Mbps.",
  },

  // ─── TECHNICAL SUPPORT ───
  {
    keywords: ["internet down", "no internet", "connection down", "not working", "offline", "outage"],
    answer:
      "If your internet is down: 1) Check if the router power light is on. 2) Restart your router (unplug for 30 seconds). 3) Check for area outages in Dashboard → Network Status. If it persists, raise a ticket from your Dashboard.",
  },
  {
    keywords: ["slow internet", "slow speed", "buffering", "lag", "latency", "slow connection"],
    answer:
      "For slow speeds: 1) Run a speed test at speedtest.net. 2) Try connecting via ethernet cable instead of WiFi. 3) Restart your router. 4) Check if you've crossed your FUP limit in Dashboard. If speeds are still low, raise a support ticket.",
  },
  {
    keywords: ["router", "restart router", "reset router", "router issue", "router not working", "wifi router"],
    answer:
      "To restart your router: Unplug the power cable, wait 30 seconds, then plug it back in. Wait 2-3 minutes for it to fully boot. If the issue persists, try a factory reset using the small button on the back.",
  },
  {
    keywords: ["wifi", "wifi not working", "wifi problem", "wifi weak", "no wifi", "wifi signal"],
    answer:
      "For WiFi issues: 1) Move closer to the router. 2) Ensure no thick walls are blocking signal. 3) Change the WiFi channel in router settings (192.168.1.1). 4) Consider requesting a mesh extender for larger homes.",
  },
  {
    keywords: ["password", "wifi password", "change password", "router password", "default password"],
    answer:
      "Your default WiFi password is on the sticker under your router. To change it: Go to 192.168.1.1 in your browser → Wireless Settings → Security → Change Password.",
  },

  // ─── ACCOUNT & SETUP ───
  {
    keywords: ["new connection", "setup", "installation", "install", "get connection", "activate"],
    answer:
      "New connections are set up within 3-5 business days after you pick a plan. Our technician will visit to install the fiber line and router. No installation charges on annual plans!",
  },
  {
    keywords: ["otp", "otp not received", "otp issue", "verification code", "otp problem"],
    answer:
      "If your OTP isn't arriving: 1) Check if your phone number is correct. 2) Wait 60 seconds and click 'Resend OTP'. 3) Check your SMS spam folder. 4) If it still fails, try the email verification option.",
  },
  {
    keywords: ["login", "login problem", "cant login", "login issue", "forgot password", "reset password"],
    answer:
      "If you can't log in: 1) Double-check your email/phone. 2) Use 'Forgot Password' to reset. 3) Clear your browser cache. 4) If using Google login, make sure you're using the same Google account you registered with.",
  },
  {
    keywords: ["contact", "support", "customer care", "call", "phone number", "email support", "help desk"],
    answer:
      "You can reach us at:\n\n• Email: cc@telesmart.in\n• Phone: 8886957957\n\nFor the fastest response, log in and raise a ticket from Support Tickets in the dashboard.",
  },

  // ─── GENERAL ───
  {
    keywords: ["coverage", "available", "my area", "serviceable", "pincode", "location", "feasibility", "check availability"],
    answer:
      "You can check if SmartApp is available in your area by clicking 'Check Availability' in this chat, or visit the Coverage Check page from your Dashboard.",
  },
  {
    keywords: ["time", "current time"],
    answer: function () {
      return "The current time is " + new Date().toLocaleTimeString() + ".";
    },
  },
  {
    keywords: ["today's date", "date today", "date", "today", "current date"],
    answer: function () {
      return "Today's date is " + new Date().toDateString() + ".";
    },
  },
];

/**
 * @param {string} userInput
 * @returns {{ answer: string, score: number } | null}
 */
export function getKnowledgeMatch(userInput) {
  var tokens = tokenizeForMatching(userInput);
  if (!tokens.length) return null;

  var priorityWords = ["what", "explain", "define", "tell", "about", "how", "why", "help"];
  var hasPriority =
    tokens.some(function (t) {
      return priorityWords.indexOf(t) !== -1;
    }) || false;

  var joinedTokens = tokens.join(" ");

  var bestItem = null;
  var bestScore = 0;

  for (var i = 0; i < KNOWLEDGE_BASE.length; i++) {
    var item = KNOWLEDGE_BASE[i];
    var score = 0;

    for (var k = 0; k < item.keywords.length; k++) {
      var kw = item.keywords[k];
      var kwScore = 0;

      kwScore = calculateScore(tokens, kw);

      if (kwScore <= 0 && kw.indexOf(" ") !== -1) {
        var parts = kw.split(/\s+/).filter(Boolean);
        var partsScore = 0;
        for (var p = 0; p < parts.length; p++) {
          partsScore += calculateScore(tokens, parts[p]);
        }

        var kwNoSpace = kw.replace(/\s+/g, "");
        var textNoSpace = joinedTokens.replace(/\s+/g, "");
        var head = kwNoSpace.slice(0, K.PHRASE_HEAD_TAIL_SLICE_LEN);
        var tail = kwNoSpace.slice(-K.PHRASE_HEAD_TAIL_SLICE_LEN);
        var phraseIncludes = head && tail ? (textNoSpace.includes(head) || textNoSpace.includes(tail)) : false;

        kwScore =
          Math.max(partsScore, kwScore) +
          (phraseIncludes ? K.PHRASE_SUBSTRING_SIGNAL_BONUS : 0);
      }

      score += kwScore;
    }

    if (hasPriority && score > 0) {
      score += K.QUESTION_WORD_PRIORITY_BONUS;
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  if (!bestItem || bestScore < K.MIN_RETURN_SCORE) return null;

  var answer =
    typeof bestItem.answer === "function" ? bestItem.answer() : bestItem.answer;

  return { answer: answer, score: bestScore };
}

/**
 * Backwards-compatible helper for message flow.
 * @param {string} userInput
 * @returns {string|null}
 */
export function getKnowledgeResponse(userInput) {
  var match = getKnowledgeMatch(userInput);
  return match ? match.answer : null;
}

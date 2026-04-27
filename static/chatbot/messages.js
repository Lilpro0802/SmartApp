/**
 * Chatbot logic — state machine, message history, and UI updates.
 * Structured branching: top-level buttons → sub-buttons → answers.
 */

import { getIntent, getResponse } from "./intents.js";
import { getKnowledgeResponse as getFaqAnswer } from "./knowledge.js";

var SS_MSG_KEY = "rishit-chatbot-messages-v1";
var SS_NAV_KEY = "rishit-chatbot-nav-v1";

/* ─── SERVED CITIES (feasibility check) ───────────────────────────── */
var FEASIBILITY_CITIES = [
  "pune", "mumbai", "navi mumbai", "thane", "nagpur",
  "aurangabad", "sangli", "satara", "indore", "bhopal",
  "raipur", "patna", "srinagar"
];

/* ═══════════════════════════════════════════════════════════════════
   BUTTON DEFINITIONS — organised by page context
   ═══════════════════════════════════════════════════════════════════ */

// ─── LANDING PAGE ────────────────────────────────────────────────
var BTN_LANDING = [
  { text: "Explore Plans",      action: "SELECT_ROLE" },
  { text: "Check Availability", action: "FEASIBILITY_START" },
  { text: "Support FAQ",        action: "FAQ_LANDING" },
  { text: "Login / Sign In",    action: "GO_TO_LOGIN" },
];

// ─── AUTH PAGES ──────────────────────────────────────────────────
var BTN_AUTH = [
  { text: "Can't log in",       action: "FAQ_LOGIN_HELP" },
  { text: "Forgot Password",    action: "GO_FORGOT_PASS" },
  { text: "OTP not received",   action: "FAQ_OTP" },
  { text: "Contact Support",    action: "FAQ_CONTACT" },
];

// ─── INDIVIDUAL DASHBOARD ────────────────────────────────────────
var BTN_DASHBOARD = [
  { text: "Browse Plans",       action: "GO_BROWSE_PLANS" },
  { text: "Check Availability", action: "FEASIBILITY_START" },
  { text: "Internet Problems",  action: "DASH_INTERNET" },
  { text: "Account & Billing",  action: "DASH_BILLING" },
  { text: "Contact Support",    action: "FAQ_CONTACT" },
];

// ─── BUSINESS DASHBOARD ─────────────────────────────────────────
var BTN_BUSINESS_DASH = [
  { text: "Browse Plans",       action: "GO_BROWSE_PLANS" },
  { text: "Check Availability", action: "FEASIBILITY_START" },
  { text: "Connection Issues",  action: "DASH_INTERNET" },
  { text: "Billing & Account",  action: "BIZ_BILLING" },
  { text: "Contact Support",    action: "BIZ_CONTACT" },
];

/* ─── SUB-BUTTONS ─────────────────────────────────────────────────── */

// Internet problems (both dashboards)
var BTN_INTERNET_SUB = [
  { text: "Slow Internet",      action: "FAQ_SLOW" },
  { text: "Internet is Down",   action: "FAQ_DOWN" },
  { text: "WiFi Problems",      action: "FAQ_WIFI" },
  { text: "Router Issues",      action: "FAQ_ROUTER" },
];

// Individual: Account & Billing
var BTN_BILLING_SUB = [
  { text: "View Invoices",      action: "FAQ_BILLING_DASH" },
  { text: "Upgrade Plan",       action: "GO_BROWSE_PLANS" },
  { text: "Change Password",    action: "GO_ACCOUNT_SETTINGS" },
  { text: "Check Coverage",     action: "FEASIBILITY_START" },
];

// Business: Billing & Account
var BTN_BIZ_BILLING_SUB = [
  { text: "View Invoices",      action: "FAQ_BILLING_DASH" },
  { text: "Upgrade Plan",       action: "GO_BROWSE_PLANS" },
  { text: "Change Password",    action: "GO_ACCOUNT_SETTINGS" },
];

// Business: Contact sub-menu
var BTN_BIZ_CONTACT_SUB = [
  { text: "Raise Support Ticket", action: "GO_TICKETS" },
  { text: "Custom Plan Request",  action: "FAQ_CUSTOM_REQUEST" },
  { text: "Call / Email Us",      action: "FAQ_CONTACT" },
];

// Role selection
var BTN_ROLE = [
  { text: "Individual Plans",   action: "EXPLORE_INDIVIDUAL" },
  { text: "Business Plans",     action: "EXPLORE_BUSINESS" },
];

// After plans
var BTN_AFTER_PLANS = [
  { text: "Check Availability", action: "FEASIBILITY_START" },
  { text: "Compare Plans",      action: "FAQ_COMPARE" },
];

// Landing FAQ
var BTN_FAQ_LANDING = [
  { text: "What plans do you offer?",    action: "FAQ_COMPARE" },
  { text: "Is my area covered?",         action: "FEASIBILITY_START" },
  { text: "How does installation work?", action: "FAQ_SETUP" },
  { text: "What is FUP / data limit?",   action: "FAQ_FUP" },
  { text: "Contact Support",             action: "FAQ_CONTACT" },
];

/* ═══════════════════════════════════════════════════════════════════
   FAQ ANSWERS — properly formatted with line breaks
   ═══════════════════════════════════════════════════════════════════ */

var FAQ = {
  FAQ_SLOW:
    "For slow speeds, try these steps:\n\n" +
    "1. Run a speed test at speedtest.net\n" +
    "2. Connect via ethernet cable instead of WiFi\n" +
    "3. Restart your router — unplug for 30 seconds\n" +
    "4. Check your FUP usage in the Dashboard\n\n" +
    "Still slow? Raise a ticket from Support Tickets in the sidebar.",

  FAQ_DOWN:
    "If your internet is down:\n\n" +
    "1. Check if the router power light is on\n" +
    "2. Restart the router — unplug for 30 seconds\n" +
    "3. Check for area outages in Dashboard → Network Status\n" +
    "4. If it persists, raise a ticket from the sidebar\n\n" +
    "Need immediate help? Call 8886957957.",

  FAQ_WIFI:
    "For WiFi issues:\n\n" +
    "1. Move closer to the router\n" +
    "2. Avoid thick walls between you and the router\n" +
    "3. Change WiFi channel via router settings (192.168.1.1)\n" +
    "4. For larger spaces, consider a mesh extender\n\n" +
    "Contact us at 8886957957 if the issue continues.",

  FAQ_ROUTER:
    "To restart your router:\n\n" +
    "1. Unplug the power cable\n" +
    "2. Wait 30 seconds\n" +
    "3. Plug it back in\n" +
    "4. Wait 2–3 minutes for it to fully boot\n\n" +
    "Your default WiFi password is on the sticker under the router. " +
    "To change it, go to 192.168.1.1 → Wireless Settings → Security.",

  FAQ_BILLING_DASH:
    "Billing & Invoices:\n\n" +
    "• View and download invoices from Browse Plans in the sidebar\n" +
    "• We accept UPI, net banking, credit/debit cards, and auto-pay\n" +
    "• Bills generate on the 1st of each month, due within 7 days\n\n" +
    "For billing queries, email cc@telesmart.in.",

  FAQ_COMPARE:
    "Plan Comparison:\n\n" +
    "• Basic — 50 Mbps, 500 GB FUP — ₹499/mo\n" +
    "• Standard — 100 Mbps, 1 TB FUP — ₹799/mo\n" +
    "• Premium — 200 Mbps, 1.5 TB FUP — ₹999/mo\n\n" +
    "All plans include symmetric speeds and a free router.",

  FAQ_SETUP:
    "Installation Process:\n\n" +
    "1. Pick a plan from our website\n" +
    "2. Our team will contact you within 24 hours\n" +
    "3. A technician visits within 3–5 business days\n" +
    "4. Fiber line + router installed and tested on-site\n\n" +
    "No installation charges on annual plans!",

  FAQ_FUP:
    "Fair Usage Policy (FUP):\n\n" +
    "• Basic — 500 GB per month\n" +
    "• Standard — 1 TB per month\n" +
    "• Premium — 1.5 TB per month\n\n" +
    "After FUP, speed reduces to 2 Mbps until the next billing cycle.",

  FAQ_CONTACT:
    "Contact Us:\n\n" +
    "• Email: cc@telesmart.in\n" +
    "• Phone: 8886957957\n\n" +
    "For the fastest response, log in and raise a ticket from Support Tickets in the dashboard sidebar.",

  FAQ_LOGIN_HELP:
    "If you can't log in:\n\n" +
    "1. Double-check your email or phone number\n" +
    "2. Click 'Forgot Password?' on this page to reset it\n" +
    "3. Clear your browser cache and try again\n" +
    "4. If you used Google login, ensure you're using the same Google account\n\n" +
    "Still stuck? Email cc@telesmart.in or call 8886957957.",

  FAQ_OTP:
    "If the OTP isn't arriving:\n\n" +
    "1. Verify your phone number is correct\n" +
    "2. Wait 60 seconds, then click 'Resend OTP'\n" +
    "3. Check your SMS spam or blocked messages folder\n" +
    "4. Try the email verification option if available\n\n" +
    "Need help? Call 8886957957.",

  FAQ_CUSTOM_REQUEST:
    "For custom enterprise plans:\n\n" +
    "• Email: cc@telesmart.in\n" +
    "• Phone: 8886957957\n\n" +
    "Our business team will respond within 24 hours with a tailored solution.",

  FAQ_CANCEL:
    "To cancel your plan:\n\n" +
    "1. Go to Browse Plans from the sidebar\n" +
    "2. Select your active plan and click 'Cancel'\n" +
    "3. A 30-day notice period applies\n\n" +
    "Any remaining prepaid balance will be refunded within 7–10 business days.",
};

/* ═══════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════ */

function saveToSession(key, val) {
  try { window.sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

function loadFromSession(key) {
  try {
    var raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function getPageContext() {
  var path = window.location.pathname;
  if (path.indexOf("/login") !== -1 || path.indexOf("/forgot_password") !== -1 || path.indexOf("/set_password") !== -1 || path.indexOf("/verify") !== -1) return "auth";
  if (path.indexOf("/business_dashboard") !== -1 || path.indexOf("/business_location") !== -1 || path.indexOf("/business_") !== -1) return "business_dash";
  if (path === "/dashboard" || path === "/location" || path === "/plans" || path === "/tickets" || path === "/tips" || path === "/profile" || path === "/kyc") return "dashboard";
  return "landing";
}

function getContextButtons() {
  switch (getPageContext()) {
    case "auth":          return BTN_AUTH;
    case "dashboard":     return BTN_DASHBOARD;
    case "business_dash": return BTN_BUSINESS_DASH;
    default:              return BTN_LANDING;
  }
}

function clearChatSession() {
  var keys = [SS_MSG_KEY, SS_NAV_KEY, "rishit-chatbot-panel-open", "rishit-chatbot-panel-expanded"];
  for (var i = 0; i < keys.length; i++) {
    try { window.sessionStorage.removeItem(keys[i]); } catch (e) {}
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN SETUP
   ═══════════════════════════════════════════════════════════════════ */

export function setupMessaging(refs) {
  var messages = loadFromSession(SS_MSG_KEY) || [];
  var navStack = loadFromSession(SS_NAV_KEY) || ["MAIN_MENU"];
  var isBusy = false;
  var currentTask = null;

  /* ── rendering ── */

  function scrollToBottom() {
    window.requestAnimationFrame(function () {
      refs.messagesEl.scrollTop = refs.messagesEl.scrollHeight;
    });
  }

  function addMessage(sender, text, actions) {
    var msg = { sender: sender, text: text, actions: actions || [] };
    messages.push(msg);
    saveToSession(SS_MSG_KEY, messages);

    // Remove all previous button groups so only the latest set is visible
    if (msg.actions && msg.actions.length > 0) {
      var oldGroups = refs.messagesEl.querySelectorAll(".rishit-chatbot-action-group");
      for (var i = 0; i < oldGroups.length; i++) oldGroups[i].remove();
    }

    renderMessage(msg);
    scrollToBottom();
  }

  function renderMessage(msg) {
    var wrapper = document.createElement("div");
    wrapper.className = "rishit-chatbot-message rishit-chatbot-message--" + msg.sender;

    var block = document.createElement("div");
    block.className = "rishit-chatbot-bot-block";

    var bubble = document.createElement("div");
    bubble.className = "rishit-chatbot-bubble";
    bubble.style.whiteSpace = "pre-line";
    bubble.textContent = msg.text;
    block.appendChild(bubble);

    if (msg.actions && msg.actions.length > 0) {
      var actionGroup = document.createElement("div");
      actionGroup.className = "rishit-chatbot-action-group";

      var btnList = document.createElement("div");
      btnList.className = "rishit-chatbot-actions";

      msg.actions.forEach(function (btn) {
        var b = document.createElement("button");
        b.className = "rishit-chatbot-action-btn";
        b.textContent = btn.text;
        b.onclick = function () {
          if (isBusy) return;
          handleAction(btn.action, btn.text);
        };
        btnList.appendChild(b);
      });

      actionGroup.appendChild(btnList);
      block.appendChild(actionGroup);
    }

    wrapper.appendChild(block);
    refs.messagesEl.appendChild(wrapper);
  }

  /* ── busy / typing ── */

  function setBusy(busy) {
    isBusy = busy;
    var allBtns = refs.messagesEl.querySelectorAll(".rishit-chatbot-action-btn");
    for (var i = 0; i < allBtns.length; i++) allBtns[i].disabled = busy;
  }

  function showTyping() {
    var indicator = document.createElement("div");
    indicator.className = "rishit-chatbot-typing-indicator";
    for (var i = 0; i < 3; i++) indicator.appendChild(document.createElement("span"));
    refs.messagesEl.appendChild(indicator);
    scrollToBottom();
    return indicator;
  }

  /* ── action dispatch ── */

  function handleAction(action, textForUser) {
    if (textForUser) addMessage("user", textForUser);
    setBusy(true);
    var typing = showTyping();
    setTimeout(function () {
      typing.remove();
      setBusy(false);
      executeAction(action);
    }, 600);
  }

  /* ── feasibility ── */

  async function checkFeasibility(pincode) {
    if (!pincode || pincode.length !== 6 || isNaN(pincode)) {
      return { ok: false, msg: "Please enter a valid 6-digit Indian Pincode." };
    }
    try {
      var res = await fetch("https://api.postalpincode.in/pincode/" + pincode);
      var data = await res.json();
      if (data[0].Status === "Success") {
        var dist = (data[0].PostOffice[0].District || "").toLowerCase();
        var available = FEASIBILITY_CITIES.some(function (c) { return dist.includes(c); });
        
        // Small delay to simulate "check" work
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (available) {
          return { ok: true, msg: "🎉 Great news! SmartApp Fiber is available in " + data[0].PostOffice[0].District + ".\n\nYou can pick a plan and get started right away! ✅" };
        } else {
          return { ok: false, msg: "📍 We haven't reached " + data[0].PostOffice[0].District + " yet, but we're expanding fast.\n\nContact us at cc@telesmart.in or 8886957957 to express interest. 🚀" };
        }
      } else {
        return { ok: false, msg: "❌ That pincode wasn't found. Could you double-check it?" };
      }
    } catch (err) {
      return { ok: false, msg: "Connection issue while checking. Please try again." };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     CORE ACTION ROUTER
     ═══════════════════════════════════════════════════════════════ */

  function executeAction(action) {
    var homeButtons = getContextButtons();

    switch (action) {

      /* ─── Role selection ─── */
      case "SELECT_ROLE":
        addMessage("bot", "Are you looking for Home or Business broadband?", BTN_ROLE);
        return;

      case "EXPLORE_INDIVIDUAL":
        if (typeof window.selectRole === "function") window.selectRole("home");
        window.location.hash = "plans";
        addMessage("bot", "I've switched to Individual plans on the page.\nScroll down to see pricing!", BTN_AFTER_PLANS);
        return;

      case "EXPLORE_BUSINESS":
        if (typeof window.selectRole === "function") window.selectRole("business");
        window.location.hash = "plans";
        addMessage("bot", "I've switched to Business plans on the page.\nScroll down to compare options.", BTN_AFTER_PLANS);
        return;

      /* ─── Feasibility ─── */
      case "FEASIBILITY_START":
        currentTask = "FEASIBILITY";
        addMessage("bot", "Sure, let me check that.\nEnter your 6-digit Pincode:");
        return;

      /* ─── Navigation redirects ─── */
      case "GO_TO_LOGIN":
        clearChatSession();
        window.location.href = "/login";
        return;

      case "GO_FORGOT_PASS":
        addMessage("bot", "To reset your password:\n\n1. Click 'Forgot Password?' on the login page\n2. Enter your registered email address\n3. Check your inbox for the reset link\n4. Set a new password\n\nTaking you there now...");
        setTimeout(function () {
          clearChatSession();
          window.location.href = "/forgot_password";
        }, 3000);
        return;

      case "GO_BROWSE_PLANS":
        window.location.href = "/plans";
        return;

      case "GO_ACCOUNT_SETTINGS":
        addMessage("bot", "To change your password:\n\n1. Go to Account Settings\n2. Click 'Change Password'\n3. Enter your current and new password\n4. Click Save\n\nRedirecting to Account Settings...");
        setTimeout(function () {
          window.location.href = "/profile";
        }, 3000);
        return;

      case "GO_TICKETS":
        window.location.href = "/tickets";
        return;

      /* ─── Dashboard: Internet Problems ─── */
      case "DASH_INTERNET":
        navStack.push("DASH_INTERNET");
        saveToSession(SS_NAV_KEY, navStack);
        addMessage("bot", "What kind of issue are you facing?", BTN_INTERNET_SUB);
        return;

      /* ─── Dashboard: Account & Billing ─── */
      case "DASH_BILLING":
        navStack.push("DASH_BILLING");
        saveToSession(SS_NAV_KEY, navStack);
        addMessage("bot", "What do you need help with?", BTN_BILLING_SUB);
        return;

      /* ─── Business: Billing & Account ─── */
      case "BIZ_BILLING":
        navStack.push("BIZ_BILLING");
        saveToSession(SS_NAV_KEY, navStack);
        addMessage("bot", "What would you like to do?", BTN_BIZ_BILLING_SUB);
        return;

      /* ─── Business: Contact ─── */
      case "BIZ_CONTACT":
        navStack.push("BIZ_CONTACT");
        saveToSession(SS_NAV_KEY, navStack);
        addMessage("bot", "How would you like to reach us?", BTN_BIZ_CONTACT_SUB);
        return;

      /* ─── Landing FAQ ─── */
      case "FAQ_LANDING":
        navStack.push("FAQ_LANDING");
        saveToSession(SS_NAV_KEY, navStack);
        addMessage("bot", "Here are some common questions:", BTN_FAQ_LANDING);
        return;

      /* ─── FAQ leaf answers ─── */
      case "FAQ_SLOW":
      case "FAQ_DOWN":
      case "FAQ_WIFI":
      case "FAQ_ROUTER":
      case "FAQ_BILLING_DASH":
      case "FAQ_COMPARE":
      case "FAQ_SETUP":
      case "FAQ_FUP":
      case "FAQ_CONTACT":
      case "FAQ_LOGIN_HELP":
      case "FAQ_OTP":
      case "FAQ_CUSTOM_REQUEST":
      case "FAQ_CANCEL":
        if (FAQ[action]) addMessage("bot", FAQ[action], homeButtons);
        return;

      /* ─── Main menu / Home ─── */
      case "MAIN_MENU":
        // Don't re-trigger if already at root
        if (navStack.length <= 1 && currentTask === null) return;
        navStack = ["MAIN_MENU"];
        saveToSession(SS_NAV_KEY, navStack);
        currentTask = null;
        var ctx = getPageContext();
        var greetings = {
          landing:       "How can I help you?",
          auth:          "Need help with your account?",
          dashboard:     "What can I help you with?",
          business_dash: "How can I assist your business?",
        };
        addMessage("bot", greetings[ctx] || "How can I help you?", homeButtons);
        return;

      /* ─── Back ─── */
      case "BACK":
        // Don't go back if already at root
        if (navStack.length <= 1) return;
        navStack.pop();
        saveToSession(SS_NAV_KEY, navStack);
        executeAction(navStack[navStack.length - 1]);
        return;
    }
  }

  /* ── free-text input ── */

  async function handleUserInput(input) {
    if (isBusy || !input.trim()) return;

    var text = input.trim();
    addMessage("user", text);
    refs.inputEl.value = "";

    setBusy(true);
    var typing = showTyping();

    if (currentTask === "FEASIBILITY") {
      var result = await checkFeasibility(text);
      typing.remove();
      setBusy(false);
      addMessage("bot", result.msg, getContextButtons());
      currentTask = null;
      return;
    }

    setTimeout(function () {
      typing.remove();
      setBusy(false);

      // Check intents first (greetings, small talk)
      var intent = getIntent(text);
      if (intent && intent !== "unknown") {
        addMessage("bot", getResponse(intent), getContextButtons());
        return;
      }

      // Then check knowledge base (broadband FAQ)
      var faq = getFaqAnswer(text);
      if (faq) {
        addMessage("bot", faq, getContextButtons());
        return;
      }

      addMessage("bot",
        "I'm not sure about that.\nTry asking about plans, billing, or speed issues — or tap a button for quick help.",
        getContextButtons()
      );
    }, 800);
  }

  /* ── bind inputs ── */

  refs.sendBtn.onclick = function () { handleUserInput(refs.inputEl.value); };
  refs.inputEl.onkeydown = function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserInput(refs.inputEl.value);
    }
  };

  /* ── bind nav bar (Back / Home) ── */

  if (refs.navBarEl) {
    refs.navBarEl.addEventListener("click", function (e) {
      if (isBusy) return;
      var btn = e.target.closest("[data-chatbot-action]");
      if (!btn) return;
      var act = btn.getAttribute("data-chatbot-action");
      if (act) {
        e.preventDefault();
        e.stopPropagation();
        handleAction(act, null);
      }
    });
  }

  /* ── first interaction ── */

  function showFirstInteraction() {
    var ctx = getPageContext();
    var name = window.USER_NAME ? " " + window.USER_NAME : "";
    var greetings = {
      landing:       "Hi! I'm Smarty.\nHow can I help you find the best broadband today?",
      auth:          "Need any help logging in or with your account?",
      dashboard:     "Welcome back" + name + "!\nNeed help with your connection, billing, or account?",
      business_dash: "Welcome back" + name + "!\nHow can I support your business connectivity?",
    };
    addMessage("bot", greetings[ctx] || greetings.landing, getContextButtons());
  }

  /* ── restore session ── */
  if (messages.length > 0) {
    messages.forEach(renderMessage);
  }

  return {
    isEmpty: function () { return messages.length === 0; },
    showFirstInteraction: showFirstInteraction,
    scrollToBottom: scrollToBottom,
  };
}

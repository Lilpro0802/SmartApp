/**
 * Chatbot entry — loads UI + messaging. Use as ES module:
 * <script type="module" src="/chatbot/chatbot.js"></script>
 */

import { setupChatbotUI, ROOT_ID } from "./ui.js";
import { setupMessaging } from "./messages.js";
import { setupSpaNavigation } from "./spa-nav.js";

var VERSION = "2.0.0";

var AUTO_OPEN_DELAY_MS = 2000;
var SS_PANEL_OPEN = "rishit-chatbot-panel-open";
var SS_KEYS_CLEAR_ON_RELOAD = [
  "rishit-chatbot-messages-v1",
  "rishit-chatbot-nav-v1",
  "rishit-chatbot-panel-expanded",
];

function clearChatSessionIfReload() {
  try {
    var nav = performance.getEntriesByType("navigation")[0];
    var isReload =
      nav && nav.type === "reload"
        ? true
        : typeof performance.navigation !== "undefined" &&
          performance.navigation.type === 1;
    if (isReload) {
      for (var i = 0; i < SS_KEYS_CLEAR_ON_RELOAD.length; i++) {
        window.sessionStorage.removeItem(SS_KEYS_CLEAR_ON_RELOAD[i]);
      }
      return;
    }

    // Also clear when the page context changes (e.g. landing → dashboard after login)
    var SS_CONTEXT_KEY = "rishit-chatbot-page-context";
    var path = window.location.pathname;
    
    var currentContext = "landing";
    if (path.indexOf("/login") !== -1 || path.indexOf("/forgot_password") !== -1 || path.indexOf("/set_password") !== -1 || path.indexOf("/verify") !== -1) {
      currentContext = "auth";
    } else if (path.indexOf("/business_") !== -1) {
      currentContext = "business_dash";
    } else if (path === "/dashboard" || path === "/location" || path === "/plans" || path === "/tickets" || path === "/tips" || path === "/profile" || path === "/kyc") {
      currentContext = "dashboard";
    }

    var lastContext = window.sessionStorage.getItem(SS_CONTEXT_KEY);
    if (lastContext && lastContext !== currentContext) {
      // Context changed — clear old conversation so fresh greeting appears
      for (var j = 0; j < SS_KEYS_CLEAR_ON_RELOAD.length; j++) {
        window.sessionStorage.removeItem(SS_KEYS_CLEAR_ON_RELOAD[j]);
      }
    }
    window.sessionStorage.setItem(SS_CONTEXT_KEY, currentContext);
  } catch (err) {}
}

function init() {
  if (document.getElementById(ROOT_ID)) {
    if (
      typeof window !== "undefined" &&
      window.RishitChatbot &&
      typeof window.RishitChatbot.scrollToBottom === "function"
    ) {
      window.RishitChatbot.scrollToBottom();
    }
    return { ok: false, reason: "already-initialized" };
  }

  clearChatSessionIfReload();

  var savedOpen = null;
  try {
    savedOpen = window.sessionStorage.getItem(SS_PANEL_OPEN);
  } catch (err) {}

  var hasPanelPreference = savedOpen === "true" || savedOpen === "false";
  var refs = setupChatbotUI({
    initialPanelOpen: hasPanelPreference && savedOpen === "true",
  });
  var messaging = setupMessaging(refs);

  var startedEmpty = messaging.isEmpty();
  if (startedEmpty) {
    messaging.showFirstInteraction();
  }

  if (typeof messaging.scrollToBottom === "function") {
    messaging.scrollToBottom();
  }

  if (typeof refs.setOpen === "function" && startedEmpty && !hasPanelPreference) {
    window.setTimeout(function () {
      // Re-verify after delay that no interaction happened
      var currentPref = null;
      try { currentPref = window.sessionStorage.getItem(SS_PANEL_OPEN); } catch(e){}
      if (currentPref === null) {
        refs.setOpen(true);
      }
    }, AUTO_OPEN_DELAY_MS);
  }

  return { ok: true, messaging: messaging };
}

function boot() {
  // setupSpaNavigation(); // Disabled to prevent hijacking of main site navigation
  init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

if (typeof window !== "undefined") {
  window.RishitChatbot = {
    init: init,
    scrollToBottom: function () {
      var root = document.getElementById(ROOT_ID);
      if (!root) return;
      var messagesEl = root.querySelector(".rishit-chatbot-messages");
      if (!messagesEl) return;
      requestAnimationFrame(function () {
        messagesEl.scrollTop = messagesEl.scrollHeight;
        requestAnimationFrame(function () {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });
      });
    },
    version: VERSION,
  };
}

export { init, VERSION };

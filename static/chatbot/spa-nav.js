/**
 * Lightweight internal navigation to reduce full reloads.
 * Keeps chatbot root mounted and falls back to normal navigation on errors.
 */

var CHATBOT_ROOT_ID = "rishit-chatbot-root";
var SPA_ENABLED_FLAG = "__rishitSpaLiteEnabled";
var navInFlight = false;

function normalizeUrl(url) {
  try {
    return new URL(url, window.location.href);
  } catch (e) {
    return null;
  }
}

function isInternalNavigableLink(anchor) {
  if (!anchor) return false;
  var href = anchor.getAttribute("href");
  if (!href) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.getAttribute("target") && anchor.getAttribute("target") !== "_self") {
    return false;
  }
  if (href.indexOf("#") === 0) return false;
  if (
    href.indexOf("mailto:") === 0 ||
    href.indexOf("tel:") === 0 ||
    href.indexOf("javascript:") === 0
  ) {
    return false;
  }

  var url = normalizeUrl(href);
  if (!url) return false;
  if (url.origin !== window.location.origin) return false;

  var path = url.pathname || "/";
  return path === "/" || path === "/Index.html" || path.indexOf("/Pages/") === 0;
}

function hasLoadedScriptSrc(src) {
  if (!src) return false;
  var full = normalizeUrl(src);
  if (!full) return false;
  return !!document.querySelector('script[src="' + full.href + '"]');
}

function loadScriptNode(scriptNode) {
  return new Promise(function (resolve, reject) {
    var src = scriptNode.getAttribute("src");
    var next = document.createElement("script");
    var type = scriptNode.getAttribute("type");
    if (type) next.type = type;

    if (src) {
      var abs = normalizeUrl(src);
      if (!abs) return resolve();
      if (abs.pathname.indexOf("/chatbot/chatbot.js") !== -1) return resolve();
      if (hasLoadedScriptSrc(abs.href)) return resolve();

      next.src = abs.href;
      next.async = false;
      next.onload = function () {
        resolve();
      };
      next.onerror = function () {
        reject(new Error("script-load-failed"));
      };
      document.body.appendChild(next);
      return;
    }

    next.textContent = scriptNode.textContent || "";
    document.body.appendChild(next);
    resolve();
  });
}

function replaceBodyContentKeepChatbot(nextDoc) {
  var body = document.body;
  var chatbotRoot = document.getElementById(CHATBOT_ROOT_ID);
  if (chatbotRoot && chatbotRoot.parentNode === body) {
    body.removeChild(chatbotRoot);
  }

  while (body.firstChild) {
    body.removeChild(body.firstChild);
  }

  var nextChildren = nextDoc.body ? nextDoc.body.children : [];
  for (var i = 0; i < nextChildren.length; i++) {
    var node = nextChildren[i];
    if (!node || node.tagName === "SCRIPT") continue;
    if (node.id === CHATBOT_ROOT_ID) continue;
    body.appendChild(node.cloneNode(true));
  }

  if (chatbotRoot) {
    body.appendChild(chatbotRoot);
  }
}

async function executePageScripts(nextDoc) {
  var headScripts = nextDoc.head
    ? nextDoc.head.querySelectorAll("script[src]")
    : [];
  for (var i = 0; i < headScripts.length; i++) {
    await loadScriptNode(headScripts[i]);
  }

  var bodyScripts = nextDoc.body
    ? nextDoc.body.querySelectorAll("script")
    : [];
  for (var j = 0; j < bodyScripts.length; j++) {
    await loadScriptNode(bodyScripts[j]);
  }
}

async function navigateSpa(url, pushState) {
  if (navInFlight) return;
  navInFlight = true;

  try {
    var response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      window.location.assign(url);
      return;
    }

    var html = await response.text();
    var parser = new DOMParser();
    var nextDoc = parser.parseFromString(html, "text/html");
    if (!nextDoc || !nextDoc.body) {
      window.location.assign(url);
      return;
    }

    replaceBodyContentKeepChatbot(nextDoc);
    document.title = nextDoc.title || document.title;

    if (pushState) {
      window.history.pushState({ spa: true }, "", url);
    }

    await executePageScripts(nextDoc);
    if (
      typeof window !== "undefined" &&
      window.RishitChatbot &&
      typeof window.RishitChatbot.scrollToBottom === "function"
    ) {
      window.RishitChatbot.scrollToBottom();
    }
    window.scrollTo(0, 0);
  } catch (err) {
    window.location.assign(url);
  } finally {
    navInFlight = false;
  }
}

function onDocumentClick(e) {
  if (e.defaultPrevented) return;
  if (e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  var target = e.target;
  if (!(target instanceof HTMLElement)) return;
  var anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (!isInternalNavigableLink(anchor)) return;

  var url = normalizeUrl(anchor.href);
  if (!url) return;
  if (url.href === window.location.href) return;

  e.preventDefault();
  navigateSpa(url.href, true);
}

function onPopState() {
  navigateSpa(window.location.href, false);
}

export function setupSpaNavigation() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[SPA_ENABLED_FLAG]) return;
  window[SPA_ENABLED_FLAG] = true;

  document.addEventListener("click", onDocumentClick);
  window.addEventListener("popstate", onPopState);
}


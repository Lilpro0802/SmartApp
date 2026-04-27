/**
 * Injects styles/fonts and builds the chatbot DOM.
 */

import { BOT_AVATAR_URL } from "./utils.js";

var NS = "rishit-chatbot";
export var ROOT_ID = NS + "-root";

function injectFont() {
  var href =
    "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap";
  if (document.querySelector('link[href="' + href + '"]')) return;
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function injectStyles(onReady) {
  if (document.getElementById(NS + "-stylesheet")) {
    if (onReady) onReady();
    return;
  }
  injectFont();
  var link = document.createElement("link");
  link.id = NS + "-stylesheet";
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  if (onReady) {
    link.onload = onReady;
    // Fallback: reveal after 2s even if onload doesn't fire
    setTimeout(onReady, 2000);
  }
  document.head.appendChild(link);
}

function el(tag, className, attrs) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) {
    Object.keys(attrs).forEach(function (key) {
      if (key === "textContent") node.textContent = attrs[key];
      else node.setAttribute(key, String(attrs[key]));
    });
  }
  return node;
}

function svgIconSend() {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M22 2L11 13");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M22 2L15 22L11 13L2 9L22 2Z");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
}

function svgIconClose() {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M18 6L6 18M6 6L18 18");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "2");
  p.setAttribute("stroke-linecap", "round");
  svg.appendChild(p);
  return svg;
}

function svgIconExpandOut() {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-chatbot-expand-icon", "out");
  var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "2");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.appendChild(p);
  return svg;
}

function svgIconExpandIn() {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-chatbot-expand-icon", "in");
  var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M4 14v6h6M20 10V4h-6M14 10l6 6M4 4l6 6");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "2");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.appendChild(p);
  return svg;
}

function svgIconNavBack() {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("class", NS + "-nav-icon");
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M19 12H5M5 12L12 19M5 12L12 5");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
}

function svgIconNavHome() {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("class", NS + "-nav-icon");
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  var poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", "9 22 9 12 15 12 15 22");
  poly.setAttribute("stroke", "currentColor");
  poly.setAttribute("stroke-width", "2");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  svg.appendChild(poly);
  return svg;
}

var LS_PANEL_EXPANDED = "rishit-chatbot-panel-expanded";

function applyPanelOpenVisual(refs, open) {
  var openClass = NS + "-open";
  refs.panel.classList.toggle(openClass, open);
  refs.panel.setAttribute("aria-hidden", open ? "false" : "true");
  refs.launcher.setAttribute("aria-expanded", open ? "true" : "false");
}

function bindExpandToggle(refs) {
  var panel = refs.panel;
  var expandBtn = refs.expandBtn;
  var expandedClass = NS + "-expanded";
  var svgOut = expandBtn.querySelector("[data-chatbot-expand-icon='out']");
  var svgIn = expandBtn.querySelector("[data-chatbot-expand-icon='in']");

  function syncExpandUi() {
    var exp = panel.classList.contains(expandedClass);
    if (svgOut) svgOut.style.display = exp ? "none" : "block";
    if (svgIn) svgIn.style.display = exp ? "block" : "none";
    expandBtn.setAttribute("aria-pressed", exp ? "true" : "false");
    expandBtn.setAttribute(
      "aria-label",
      exp ? "Shrink chat panel" : "Expand chat panel"
    );
  }

  expandBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    panel.classList.toggle(expandedClass);
    try {
      window.sessionStorage.setItem(
        LS_PANEL_EXPANDED,
        panel.classList.contains(expandedClass) ? "true" : "false"
      );
    } catch (err) { }
    syncExpandUi();
  });

  syncExpandUi();
}

function bindPanel(refs) {
  var panel = refs.panel;
  var launcher = refs.launcher;
  var closeBtn = refs.closeBtn;
  var openClass = NS + "-open";

  function scrollMessagesToBottom() {
    if (!refs.messagesEl) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        refs.messagesEl.scrollTop = refs.messagesEl.scrollHeight;
      });
    });
  }

  function setOpen(open) {
    panel.classList.toggle(openClass, open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    try {
      window.sessionStorage.setItem(
        "rishit-chatbot-panel-open",
        open ? "true" : "false"
      );
    } catch (err) { }
    if (open) {
      window.setTimeout(function () {
        refs.inputEl.focus();
      }, 0);
      scrollMessagesToBottom();
    }
  }

  launcher.addEventListener("click", function () {
    setOpen(!panel.classList.contains(openClass));
  });

  closeBtn.addEventListener("click", function () {
    setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains(openClass)) {
      setOpen(false);
    }
  });

  return setOpen;
}

function enhanceFaqUi(refs) {
  if (!refs || !refs.messagesEl) return;

  function applyFaqLabels() {
    var blocks = refs.messagesEl.querySelectorAll(".rishit-chatbot-bot-block");
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var bubble = block.querySelector(".rishit-chatbot-bubble");
      var actions = block.querySelector(".rishit-chatbot-actions");
      if (!bubble || !actions) continue;

      var bubbleText = (bubble.textContent || "").replace(/\s+/g, " ").trim();
      var isFaqIntro =
        (bubbleText.indexOf("What would you like help with?") === 0 &&
          bubbleText.indexOf("FAQ Categories") >= 0) ||
        bubble.classList.contains(NS + "-bubble--faq-intro");

      if (isFaqIntro) {
        bubble.textContent = "What would you like help with?";
        bubble.classList.add(NS + "-bubble--faq-intro");
        if (!block.querySelector(".rishit-chatbot-section-label")) {
          var label = el("div", NS + "-section-label", {
            textContent: "FAQ Categories",
          });
          var actionGroup =
            block.querySelector("." + NS + "-action-group") ||
            el("div", NS + "-action-group");
          if (!actionGroup.parentNode) {
            block.insertBefore(actionGroup, actions);
            actionGroup.appendChild(actions);
          }
          actionGroup.insertBefore(label, actionGroup.firstChild);
        } else if (!actions.parentNode.classList.contains(NS + "-action-group")) {
          var existingGroup =
            block.querySelector("." + NS + "-action-group") ||
            el("div", NS + "-action-group");
          if (!existingGroup.parentNode) {
            block.insertBefore(existingGroup, actions);
          }
          existingGroup.appendChild(actions);
        }
      }
    }
  }

  var observer = new MutationObserver(function () {
    observer.disconnect();
    applyFaqLabels();
    observer.observe(refs.messagesEl, {
      childList: true,
      subtree: true,
    });
  });

  observer.disconnect();
  applyFaqLabels();
  observer.observe(refs.messagesEl, {
    childList: true,
    subtree: true,
  });
}

function buildDOM() {
  var root = el("div", "theme-premium", { id: ROOT_ID });
  root.style.opacity = "0";
  root.style.transition = "opacity 0.8s ease";
  // Force fixed positioning immediately to prevent layout shifts
  root.style.position = "fixed";
  root.style.bottom = "24px";
  root.style.right = "24px";
  root.style.zIndex = "999999";
  root.style.display = "block";
  
  var wrap = el("div", NS + "-wrap");

  var panel = el("div", NS + "-panel", {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": NS + "-dialog-title",
    "aria-hidden": "true",
  });
  panel.id = NS + "-panel";

  var header = el("div", NS + "-header");
  var headerTop = el("div", NS + "-header-top");
  var headerMain = el("div", NS + "-header-main");

  var avatarHeader = el("img", NS + "-avatar " + NS + "-avatar--header", {
    src: BOT_AVATAR_URL,
    alt: "",
    width: "40",
    height: "40",
    decoding: "async",
  });

  var titleBlock = el("div", NS + "-titles");
  var hTitle = el("h2", NS + "-headline", {
    id: NS + "-dialog-title",
    textContent: "Smarty",
  });
  var status = el("p", NS + "-status", { textContent: "Online" });

  titleBlock.appendChild(hTitle);
  titleBlock.appendChild(status);

  headerMain.appendChild(avatarHeader);
  headerMain.appendChild(titleBlock);

  var headerActions = el("div", NS + "-header-actions");

  var expandBtn = el("button", NS + "-expand", {
    type: "button",
    "aria-label": "Expand chat panel",
    "aria-pressed": "false",
  });
  expandBtn.appendChild(svgIconExpandOut());
  expandBtn.appendChild(svgIconExpandIn());

  var closeBtn = el("button", NS + "-close", {
    type: "button",
    "aria-label": "Close chat",
  });
  closeBtn.appendChild(svgIconClose());

  headerActions.appendChild(expandBtn);
  headerActions.appendChild(closeBtn);

  headerTop.appendChild(headerMain);
  headerTop.appendChild(headerActions);
  header.appendChild(headerTop);

  var messages = el("div", NS + "-messages");
  messages.setAttribute("role", "log");
  messages.setAttribute("aria-live", "polite");

  var composer = el("div", NS + "-composer");
  var input = el("textarea", NS + "-input", {
    rows: "1",
    placeholder: "Type your message...",
    "aria-label": "Message",
  });
  var sendBtn = el("button", NS + "-send", {
    type: "button",
    "aria-label": "Send message",
  });
  sendBtn.appendChild(svgIconSend());

  composer.appendChild(input);
  composer.appendChild(sendBtn);

  var navBar = el("div", NS + "-nav-bar", {
    role: "navigation",
    "aria-label": "Chat navigation",
  });
  var navBack = el("button", NS + "-nav-btn", {
    type: "button",
    "data-chatbot-action": "BACK",
    "aria-label": "Go back",
  });
  navBack.appendChild(svgIconNavBack());
  navBack.appendChild(el("span", null, { textContent: "Back" }));

  var navHome = el("button", NS + "-nav-btn", {
    type: "button",
    "data-chatbot-action": "MAIN_MENU",
    "aria-label": "Go to home",
  });
  navHome.appendChild(svgIconNavHome());
  navHome.appendChild(el("span", null, { textContent: "Home" }));

  navBar.appendChild(navBack);
  navBar.appendChild(navHome);

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(navBar);
  panel.appendChild(composer);

  var launcher = el("button", NS + "-launcher", {
    type: "button",
    "aria-label": "Chat with Smarty — Online",
    "aria-expanded": "false",
    "aria-controls": NS + "-panel",
  });
  launcher.id = NS + "-launcher";

  var avatarLaunch = el("img", NS + "-avatar " + NS + "-avatar--launcher", {
    src: BOT_AVATAR_URL,
    alt: "",
    width: "38",
    height: "38",
    decoding: "async",
  });

  var textWrap = el("div", NS + "-launcher-text");
  textWrap.appendChild(
    el("span", NS + "-launcher-title", { textContent: "Chat with Smarty" })
  );
  textWrap.appendChild(
    el("span", NS + "-launcher-sub", { textContent: "Online" })
  );

  launcher.appendChild(avatarLaunch);
  launcher.appendChild(textWrap);

  wrap.appendChild(panel);
  wrap.appendChild(launcher);
  root.appendChild(wrap);

  return {
    root: root,
    panel: panel,
    launcher: launcher,
    expandBtn: expandBtn,
    closeBtn: closeBtn,
    messagesEl: messages,
    inputEl: input,
    sendBtn: sendBtn,
    navBackEl: navBack,
    navHomeEl: navHome,
    navBarEl: navBar,
  };
}

/**
 * @param {{ initialPanelOpen?: boolean }} [options]
 * @returns {object} refs for messaging + panel controls
 */
export function setupChatbotUI(options) {
  options = options || {};
  var revealed = false;
  function revealRoot() {
    if (revealed) return;
    revealed = true;
    if (refs && refs.root) refs.root.style.opacity = "1";
  }
  injectStyles(revealRoot);
  var refs = buildDOM();
  document.body.appendChild(refs.root);

  try {
    if (window.sessionStorage.getItem(LS_PANEL_EXPANDED) === "true") {
      refs.panel.classList.add(NS + "-expanded");
    }
  } catch (err) { }

  refs.panel.classList.add(NS + "-suppress-transition");
  applyPanelOpenVisual(refs, !!options.initialPanelOpen);
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      refs.panel.classList.remove(NS + "-suppress-transition");
    });
  });

  bindExpandToggle(refs);
  refs.setOpen = bindPanel(refs);
  enhanceFaqUi(refs);
  return refs;
}

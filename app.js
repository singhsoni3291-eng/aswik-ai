
"use strict";

/*
=========================================================
 ASWIK AI — BRAIN INTERFACE 5.3
 Developer: Aswik Singh

 INTERFACE:
 - Cinematic multilingual startup
 - Floating holographic glass chat bubbles
 - User messages on RIGHT
 - ASWIK AI messages on LEFT
 - Cyan and deep navy reactor theme
 - Thinking animation
 - Source links

 BRAIN:
 - Cloudflare Workers AI
 - English, Hindi and Hinglish support
 - Conversation history
 - Developer knowledge profile

 SYSTEM:
 - Live Indian Standard Time clock
 - About Developer profile
=========================================================
*/

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",
  version: "5.3",
  endpoint: "https://ancient-pond-adc4.singhsoni3291.workers.dev",
  maxHistory: 20,
  timeout: 35000,

  // OFFICIAL DEVELOPER KNOWLEDGE
  developerProfile: {
    name: "Aswik Singh",
    role: "Student, Technology Enthusiast and Creator of ASWIK AI",

    introduction:
      "Aswik Singh is a student with a strong passion for technology, artificial intelligence, software development and innovation.",

    interests: [
      "Artificial Intelligence",
      "Coding",
      "Rocket Science"
    ],

    favouriteSubjects: [
      "Mathematics",
      "Physics",
      "English"
    ],

    programmingLanguages: [
      "Java"
    ],

    languages: [
      "English",
      "Hindi"
    ],

    ambitions:
      "Aswik aspires to become one of the world's wealthiest entrepreneurs. He draws inspiration from innovators such as Elon Musk and wants to build impactful technologies and businesses of his own.",

    creationStory:
      "Aswik created ASWIK AI because he wanted to build a personal artificial intelligence assistant that he could truly call his own, inspired by J.A.R.V.I.S. from the Iron Man universe.",

    motto: "Veni, vidi, vici.",
    mottoTranslation: "I came, I saw, I conquered.",
    mottoAttribution: "Julius Caesar"
  }
};

const $ = selector => document.querySelector(selector);

const chat = $("#chat");
const input = $("#messageInput");
const sendBtn = $("#sendBtn");

let history = [];
let busy = false;


/* =====================================================
   1. INJECT INTERFACE STYLES
===================================================== */

function installASWIKStyles() {
  if ($("#aswik-v52-styles")) return;

  const style = document.createElement("style");
  style.id = "aswik-v52-styles";

  style.textContent = `

    /* ==============================================
       FLOATING HOLOGRAPHIC CHAT INTERFACE
    ============================================== */

    #chat {
      display: flex !important;
      flex-direction: column !important;
      gap: 17px !important;
      overflow-y: auto !important;
      scroll-behavior: smooth;
    }

    #chat .message {
      display: flex !important;
      align-items: flex-end !important;
      width: 100% !important;
      max-width: 100% !important;
      gap: 9px !important;
      box-sizing: border-box !important;
      animation: aswikBubbleIn .38s ease both;
    }

    @keyframes aswikBubbleIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* USER — RIGHT SIDE / CYAN GLASS */

    #chat .message.user {
      flex-direction: row-reverse !important;
      justify-content: flex-start !important;
      margin-left: auto !important;
    }

    #chat .message.user .bubble {
      margin-left: auto !important;
      margin-right: 0 !important;

      background:
        linear-gradient(
          135deg,
          rgba(0, 91, 119, .88),
          rgba(4, 39, 61, .94)
        ) !important;

      color: #f1fcff !important;

      border: 1px solid rgba(0, 224, 255, .48) !important;

      border-radius: 20px 20px 5px 20px !important;

      box-shadow:
        0 8px 25px rgba(0, 200, 255, .13),
        0 0 18px rgba(0, 200, 255, .08),
        inset 0 1px 0 rgba(255,255,255,.12) !important;
    }

    #chat .message.user .avatar {
      display: none !important;
    }

    /* ASWIK — LEFT SIDE / DARK HOLOGRAPHIC GLASS */

    #chat .message.assistant {
      flex-direction: row !important;
      justify-content: flex-start !important;
    }

    #chat .message.assistant .bubble {
      margin-right: auto !important;
      margin-left: 0 !important;

      background:
        linear-gradient(
          145deg,
          rgba(24, 42, 60, .96),
          rgba(8, 23, 38, .96)
        ) !important;

      color: #effaff !important;

      border: 1px solid rgba(100, 190, 255, .25) !important;

      border-radius: 20px 20px 20px 5px !important;

      box-shadow:
        0 8px 28px rgba(0, 0, 0, .30),
        0 0 17px rgba(0, 190, 255, .07),
        inset 0 1px 0 rgba(255,255,255,.08) !important;
    }

    /* COMMON FLOATING GLASS BUBBLE */

    #chat .message .bubble {
      width: fit-content !important;
      max-width: min(78%, 620px) !important;

      padding: 13px 16px !important;

      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;

      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);

      transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease !important;
    }

    #chat .message .bubble:hover {
      transform: translateY(-3px);

      box-shadow:
        0 13px 32px rgba(0, 190, 255, .15),
        0 0 20px rgba(0, 190, 255, .10) !important;
    }

    #chat .message .bubble strong {
      display: block;
      font-size: 11px;
      margin-bottom: 6px;
      opacity: .9;
      letter-spacing: 1px;
      color: #79eaff;
    }

    #chat .message .bubble p {
      margin: 0;
      font-size: 14px;
      line-height: 1.65;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    #chat .message .avatar {
      flex: 0 0 30px;
      width: 30px;
      height: 30px;
      border-radius: 50%;

      display: flex;
      justify-content: center;
      align-items: center;

      background:
        radial-gradient(circle, #16465a, #071923);

      border: 1px solid rgba(0, 220, 255, .45);

      color: #7cecff;
      font-weight: bold;
      font-size: 13px;

      box-shadow: 0 0 12px rgba(0, 210, 255, .15);
    }

    /* SOURCE LINKS */

    #chat .source-heading {
      margin-top: 12px;
      color: #7cecff;
    }

    #chat .source-link {
      display: block;
      color: #83eaff;
      font-size: 12px;
      margin-top: 6px;
      text-decoration: underline;
      overflow-wrap: anywhere;
    }

    /* THINKING ANIMATION */

    #chat .typing-message .bubble p {
      color: #7cecff;
      animation: aswikPulse 1.2s infinite;
    }

    @keyframes aswikPulse {
      0%, 100% { opacity: .45; }
      50% { opacity: 1; }
    }

    /* STARTUP SCREEN */

    #aswikIntro {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: #000;
      color: white;

      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      overflow: hidden;
      font-family: Arial, sans-serif;

      opacity: 1;
      transition: opacity 1s ease, visibility 1s ease;
    }

    #aswikIntro.aswik-exit {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    #aswikIntro .intro-brand {
      position: absolute;
      top: 35px;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 5px;
      color: #65eaff;
      opacity: .9;
    }

    #aswikIntro .intro-greetings {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
    }

    #aswikIntro .intro-greeting {
      font-size: clamp(24px, 7vw, 42px);
      font-weight: 400;
      opacity: 0;
      transform: translateY(15px);

      animation: aswikGreeting 5s ease forwards;

      text-shadow: 0 0 18px rgba(0, 220, 255, .22);
    }

    #aswikIntro .intro-greeting:nth-child(1) { animation-delay: .3s; }
    #aswikIntro .intro-greeting:nth-child(2) { animation-delay: .7s; }
    #aswikIntro .intro-greeting:nth-child(3) { animation-delay: 1.1s; }
    #aswikIntro .intro-greeting:nth-child(4) { animation-delay: 1.5s; }
    #aswikIntro .intro-greeting:nth-child(5) { animation-delay: 1.9s; }
    #aswikIntro .intro-greeting:nth-child(6) { animation-delay: 2.3s; }
    #aswikIntro .intro-greeting:nth-child(7) { animation-delay: 2.7s; }

    @keyframes aswikGreeting {
      0% { opacity: 0; transform: translateY(15px); }
      15%, 65% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-12px); }
    }

    #aswikIntro .intro-awakening {
      position: absolute;
      bottom: 100px;
      color: #73eaff;
      font-size: 12px;
      letter-spacing: 3px;
      opacity: 0;
      animation: aswikAwaken 2s 3.3s forwards;
      text-align: center;
    }

    #aswikIntro .intro-credit {
      position: absolute;
      bottom: 35px;
      color: #6c8b94;
      font-size: 10px;
      letter-spacing: 2px;
    }

    @keyframes aswikAwaken {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ABOUT DEVELOPER PROFILE */

    #aboutDialog .developer-profile-details {
      margin-top: 18px;
      padding: 15px;

      background: rgba(0, 190, 255, .045);
      border: 1px solid rgba(0, 220, 255, .20);
      border-radius: 15px;

      color: #e8faff;
      line-height: 1.65;
    }

    #aboutDialog .developer-profile-details h3 {
      color: #70eaff;
      font-size: 14px;
      letter-spacing: 1px;
      margin: 12px 0 5px;
    }

    #aboutDialog .developer-profile-details p {
      font-size: 13px;
      margin: 5px 0;
    }

    #aboutDialog .developer-profile-details .developer-motto {
      text-align: center;
      color: #70eaff;
      font-size: 19px;
      font-weight: bold;
      letter-spacing: 1px;
      margin: 15px 0 5px;
    }

    @media (prefers-reduced-motion: reduce) {
      #aswikIntro *,
      #chat * {
        animation-duration: .01ms !important;
        transition-duration: .01ms !important;
      }
    }
  `;

  document.head.appendChild(style);
}

installASWIKStyles();


/* =====================================================
   2. CINEMATIC STARTUP
===================================================== */

function startASWIKIntro() {
  if ($("#aswikIntro")) return;

  const intro = document.createElement("div");
  intro.id = "aswikIntro";

  const greetings = [
    "Hello.",
    "नमस्ते।",
    "Hola.",
    "Bonjour.",
    "こんにちは。",
    "مرحبا。",
    "ਸਤ ਸ੍ਰੀ ਅਕਾਲ।"
  ];

  intro.innerHTML = `
    <div class="intro-brand">ASWIK AI</div>

    <div class="intro-greetings">
      ${greetings.map(text =>
        `<div class="intro-greeting">${text}</div>`
      ).join("")}
    </div>

    <div class="intro-awakening">
      A NEW INTELLIGENCE AWAKENS
    </div>

    <div class="intro-credit">
      CREATED BY ASWIK SINGH
    </div>
  `;

  document.body.appendChild(intro);

  setTimeout(() => {
    intro.classList.add("aswik-exit");

    setTimeout(() => intro.remove(), 1100);
  }, 6500);
}

startASWIKIntro();


/* =====================================================
   3. LANGUAGE DETECTION
===================================================== */

function detectLanguage(text) {
  const q = String(text || "").toLowerCase();

  if (/[\u0900-\u097F]/.test(q)) {
    return "Hindi";
  }

  const hindiWords = [
    "kya", "kaise", "kyun", "kyu", "hai", "hain",
    "ho", "tha", "thi", "mera", "meri", "mere",
    "aap", "tum", "mujhe", "batao", "samjhao",
    "samjha", "karna", "karo", "kaun", "kab",
    "kahan", "nahi", "nahin", "haan", "achha",
    "accha", "kitna", "kitne", "kitni", "iska",
    "uska", "kyunki", "matlab", "mein", "aur",
    "lekin", "bhai", "yaar"
  ];

  const words = q.match(/[a-z]+/g) || [];

  const matches = words.filter(word =>
    hindiWords.includes(word)
  ).length;

  if (matches >= 2 || (matches >= 1 && words.length <= 5)) {
    return "Hinglish";
  }

  return "English";
}


/* =====================================================
   4. MESSAGE BUBBLES
===================================================== */

function addMessage(text, who = "assistant", sources = []) {
  if (!chat) {
    console.error("ASWIK: #chat element not found.");
    return;
  }

  const row = document.createElement("div");
  row.className = `message ${who}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = who === "user" ? "Y" : "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const heading = document.createElement("strong");
  heading.textContent = who === "user" ? "YOU" : "ASWIK AI";

  const paragraph = document.createElement("p");
  paragraph.textContent = String(text);

  bubble.append(heading, paragraph);

  if (who === "assistant" && Array.isArray(sources) && sources.length) {
    const sourceHeading = document.createElement("strong");
    sourceHeading.className = "source-heading";
    sourceHeading.textContent = "SOURCES";
    bubble.appendChild(sourceHeading);

    sources.forEach(source => {
      try {
        const url = new URL(source.url);

        if (!["http:", "https:"].includes(url.protocol)) return;

        const link = document.createElement("a");
        link.className = "source-link";
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = source.title || url.hostname;

        bubble.appendChild(link);
      } catch {
        // Invalid URLs are ignored.
      }
    });
  }

  row.append(avatar, bubble);
  chat.appendChild(row);

  chat.scrollTop = chat.scrollHeight;
}


/* =====================================================
   5. THINKING INDICATOR
===================================================== */

function showThinking() {
  removeThinking();

  const row = document.createElement("div");
  row.id = "aswikThinking";
  row.className = "message assistant typing-message";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const heading = document.createElement("strong");
  heading.textContent = "ASWIK AI";

  const paragraph = document.createElement("p");
  paragraph.textContent = "⚡ ASWIK is thinking...";

  bubble.append(heading, paragraph);
  row.append(avatar, bubble);

  chat?.appendChild(row);

  if (chat) chat.scrollTop = chat.scrollHeight;
}

function removeThinking() {
  $("#aswikThinking")?.remove();
}


/* =====================================================
   6. DEVELOPER PROFILE ANSWERS
===================================================== */

function developerProfileAnswer(question) {
  const q = question.toLowerCase().trim();
  const profile = ASWIK.developerProfile;

  const asksAboutCreator =
    /who is aswik|tell me about aswik|about aswik|about the developer|describe the developer|describe aswik/.test(q);

  const asksAboutInterests =
    /interest|hobbies|passionate about|likes|enjoys/.test(q);

  const asksAboutSubjects =
    /favourite subjects|favorite subjects|school subjects|which subjects/.test(q);

  const asksAboutProgramming =
    /programming language|coding language|which language.*know|what language.*know|programming skills/.test(q);

  const asksAboutAmbitions =
    /ambition|dream|future goal|goal.*aswik|what does.*want to become|wants to become/.test(q);

  const asksAboutLanguages =
    /which languages.*speak|languages can.*speak|speak.*language/.test(q);

  const asksWhyCreated =
    /why.*create|why.*created|reason.*create|story behind|why did.*build|why.*build you/.test(q);

  const asksAboutMotto =
    /veni|vidi|vici|motto|came.*saw.*conquered/.test(q);

  const asksAboutThoughts =
    /thoughts about.*developer|opinion about.*developer|think about.*developer|like.*developer|feel about.*developer/.test(q);

  if (asksAboutMotto) {
    return `${profile.name}'s personal motto is "${profile.motto}" — "${profile.mottoTranslation}" It is famously attributed to ${profile.mottoAttribution}.`;
  }

  if (asksAboutThoughts) {
    return `I don't have personal feelings, but I can tell you about my creator. ${profile.name} is a student passionate about artificial intelligence, coding and rocket science. He is the person who started building me with the dream of creating his own J.A.R.V.I.S.-inspired assistant. His ambition is to become a successful entrepreneur and build impactful technology.`;
  }

  if (asksWhyCreated) {
    return profile.creationStory;
  }

  if (asksAboutInterests) {
    return `${profile.name}'s main interests are ${profile.interests.join(", ")}.`;
  }

  if (asksAboutSubjects) {
    return `${profile.name}'s favourite subjects are ${profile.favouriteSubjects.join(", ")}.`;
  }

  if (asksAboutProgramming) {
    return `According to his developer profile, ${profile.name} knows ${profile.programmingLanguages.join(", ")} and is interested in software development.`;
  }

  if (asksAboutAmbitions) {
    return profile.ambitions;
  }

  if (asksAboutLanguages) {
    return `${profile.name} speaks ${profile.languages.join(" and ")}.`;
  }

  if (asksAboutCreator) {
    return `${profile.introduction} He is the creator of ASWIK AI. His interests include ${profile.interests.join(", ")}. His favourite subjects are ${profile.favouriteSubjects.join(", ")}. He knows ${profile.programmingLanguages.join(", ")}.`;
  }

  return null;
}


/* =====================================================
   7. INSTANT ANSWERS
===================================================== */

function instantAnswer(question) {
  const q = question.trim().toLowerCase();

  const identityQuestions = [
    "who made you",
    "who created you",
    "who is your developer",
    "who developed you"
  ];

  if (identityQuestions.some(item => q.includes(item))) {
    return "I am ASWIK AI, a personal AI assistant created by Aswik Singh.";
  }

  const profileAnswer = developerProfileAnswer(question);

  if (profileAnswer) {
    return profileAnswer;
  }

  if (
    q === "what time is it" ||
    q === "current time" ||
    q === "today's date" ||
    q === "what is today's date"
  ) {
    return "Current date and time: " +
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata"
      }) + " (IST).";
  }

  return null;
}


/* =====================================================
   8. CLOUD AI CONNECTION
===================================================== */

async function askBrain(question) {
  const language = detectLanguage(question);

  const previousHistory = history
    .slice(0, -1)
    .slice(-ASWIK.maxHistory)
    .map(item => ({
      role: item.role,
      content: item.content
    }));

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    ASWIK.timeout
  );

  try {
    const response = await fetch(ASWIK.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        language,
        history: previousHistory,

        // Additional creator context for Workers
        developerProfile: ASWIK.developerProfile
      }),
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (!data.answer) {
      throw new Error("The AI returned an empty answer.");
    }

    return {
      answer: data.answer,
      sources: Array.isArray(data.sources) ? data.sources : [],
      searchError: data.searchError || null
    };

  } finally {
    clearTimeout(timer);
  }
}


/* =====================================================
   9. SEND MESSAGE
===================================================== */

async function sendMessage(text = null) {
  if (busy) return;

  const question = String(text ?? input?.value ?? "").trim();

  if (!question) return;

  if (input) input.value = "";

  busy = true;

  addMessage(question, "user");

  history.push({
    role: "user",
    content: question
  });

  const instant = instantAnswer(question);

  if (instant) {
    addMessage(instant, "assistant");

    history.push({
      role: "assistant",
      content: instant
    });

    history = history.slice(-ASWIK.maxHistory);
    busy = false;
    return;
  }

  showThinking();

  try {
    const result = await askBrain(question);

    removeThinking();

    addMessage(
      result.answer,
      "assistant",
      result.sources
    );

    let savedAnswer = result.answer;

    if (result.sources.length) {
      savedAnswer += "\nSources: " +
        result.sources.map(s => s.title).join("; ");
    }

    history.push({
      role: "assistant",
      content: savedAnswer
    });

    history = history.slice(-ASWIK.maxHistory);

    if (result.searchError) {
      console.warn("ASWIK search issue:", result.searchError);
    }

  } catch (error) {
    removeThinking();

    let message =
      "I couldn't connect to my AI brain. Please try again.";

    if (error.name === "AbortError") {
      message = "The request timed out. Please try again.";
    } else if (error.message) {
      message += "\n" + error.message;
    }

    addMessage(message, "assistant");

    history.push({
      role: "assistant",
      content: message
    });

    history = history.slice(-ASWIK.maxHistory);

    console.error("ASWIK error:", error);

  } finally {
    removeThinking();
    busy = false;
    input?.focus();
  }
}


/* =====================================================
   10. EVENT LISTENERS
===================================================== */

sendBtn?.addEventListener("click", () => {
  sendMessage();
});

input?.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

$("#searchForm")?.addEventListener("submit", event => {
  event.preventDefault();

  const searchInput = $("#searchInput");
  const query = searchInput?.value.trim();

  if (!query) return;

  window.open(
    "https://www.google.com/search?q=" + encodeURIComponent(query),
    "_blank",
    "noopener,noreferrer"
  );

  searchInput.value = "";
});

document.querySelectorAll("[data-query]").forEach(button => {
  button.addEventListener("click", () => {
    const question = button.getAttribute("data-query");
    if (question) sendMessage(question);
  });
});


/* =====================================================
   11. ABOUT DEVELOPER — EXPANDED PROFILE
===================================================== */

function installDeveloperAboutProfile() {
  const dialog = $("#aboutDialog");

  if (!dialog || $("#developerProfileDetails")) return;

  const profile = ASWIK.developerProfile;

  const section = document.createElement("section");
  section.id = "developerProfileDetails";
  section.className = "developer-profile-details";

  function addHeading(text) {
    const heading = document.createElement("h3");
    heading.textContent = text;
    section.appendChild(heading);
  }

  function addParagraph(text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    section.appendChild(paragraph);
  }

  addHeading("INTRODUCTION");
  addParagraph(profile.introduction);

  addHeading("INTERESTS");
  addParagraph(profile.interests.join(" • "));

  addHeading("FAVOURITE SUBJECTS");
  addParagraph(profile.favouriteSubjects.join(" • "));

  addHeading("PROGRAMMING KNOWLEDGE");
  addParagraph(profile.programmingLanguages.join(", "));

  addHeading("LANGUAGES");
  addParagraph(profile.languages.join(" • "));

  addHeading("AMBITION");
  addParagraph(profile.ambitions);

  addHeading("WHY ASWIK AI?");
  addParagraph(profile.creationStory);

  addHeading("PERSONAL MOTTO");

  const motto = document.createElement("p");
  motto.className = "developer-motto";
  motto.textContent = profile.motto.toUpperCase();
  section.appendChild(motto);

  addParagraph(profile.mottoTranslation);
  addParagraph("— " + profile.mottoAttribution);

  dialog.appendChild(section);
}

installDeveloperAboutProfile();


$("#aboutBtn")?.addEventListener("click", () => {
  const dialog = $("#aboutDialog");

  if (dialog?.showModal) {
    dialog.showModal();
  } else if (dialog) {
    dialog.setAttribute("open", "");
  }
});

$("#closeAbout")?.addEventListener("click", () => {
  const dialog = $("#aboutDialog");

  if (dialog?.close) {
    dialog.close();
  } else {
    dialog?.removeAttribute("open");
  }
});


/* =====================================================
   12. LIVE INDIA SYSTEM CLOCK
===================================================== */

(function () {
  const clock = document.getElementById("clock");

  if (!clock) return;

  function updateClock() {
    clock.textContent = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(new Date());
  }

  updateClock();
  setInterval(updateClock, 1000);
})();


/* =====================================================
   13. STARTUP COMPLETE
===================================================== */

console.log(
  `${ASWIK.name} ${ASWIK.version} initialized. Developer: ${ASWIK.developer}`
);

console.log(
  "ASWIK developer knowledge profile loaded."
);

const START_NG = "https://start.ng";

const HAIR = ["short", "afro", "braids", "bun", "ponytail", "dreads", "bald"];
const HATS = ["none", "cap", "beanie", "tophat", "crown"];
const GEAR = ["none", "glasses", "earrings", "beard", "scarf", "backpack"];

let framePromise = null;

export function onStartNg() {
  const host = location.hostname;
  return host === "start.ng" || host.endsWith(".start.ng");
}

function connectFrame() {
  framePromise ??= new Promise((resolve, reject) => {
    const el = document.createElement("iframe");
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("connect"));
    document.body.append(el);
  });
  return framePromise;
}

export async function askStartNg(message, replyType, timeoutMs = 5000) {
  if (!onStartNg()) return null;
  let el;
  try {
    el = await connectFrame();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => {
      clearTimeout(timer);
      removeEventListener("message", onMessage);
      resolve(reply);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(event) {
      if (event.origin !== START_NG || event.source !== el.contentWindow) return;
      if (event.data?.type === replyType && event.data.requestId === requestId) done(event.data);
    }
    addEventListener("message", onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

export function signInUrl() {
  return `https://start.ng/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

export const FALLBACK_STYLE = {
  body: "female",
  primaryColor: "#008751",
  secondaryColor: "#f4f1e8",
  skinColor: "#8d5524",
  hairColor: "#17120f",
  hair: "braids",
  hat: "cap",
  accessory: "earrings",
};

function hex(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

export function normalizeStyle(style) {
  const incoming = style && typeof style === "object" ? style : {};
  return {
    body: incoming.body === "male" ? "male" : "female",
    primaryColor: hex(incoming.primaryColor, FALLBACK_STYLE.primaryColor),
    secondaryColor: hex(incoming.secondaryColor, FALLBACK_STYLE.secondaryColor),
    skinColor: hex(incoming.skinColor, FALLBACK_STYLE.skinColor),
    hairColor: hex(incoming.hairColor, FALLBACK_STYLE.hairColor),
    hair: HAIR.includes(incoming.hair) ? incoming.hair : "short",
    hat: HATS.includes(incoming.hat) ? incoming.hat : "none",
    accessory: GEAR.includes(incoming.accessory) ? incoming.accessory : "none",
  };
}

const fetch = require("node-fetch"); // ← 用 require 而不是 import

async function translate(text, targetLang = "ZH") {
  const res = await fetch("http://localhost:19950/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
  const data = await res.json();
  return data.data;
}

module.exports = { translate };

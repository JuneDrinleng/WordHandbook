/*
 * 依赖: npm i node-fetch tough-cookie fetch-cookie cheerio iconv-lite
 * CommonJS
 */
const fetchMod = require("node-fetch");
const fetchOrig = fetchMod.default || fetchMod;
const { CookieJar } = require("tough-cookie");
const fc = require("fetch-cookie");
const fetchCookie = fc.default ?? fc;
const fetch = fetchCookie(fetchOrig, new CookieJar());

const cheerio = require("cheerio");
const iconv = require("iconv-lite");

function gbkFormEncode(obj) {
  /* ——按 requests 的逻辑，每个键和值各自 GBK→字节→直接拼接—— */
  return Buffer.concat(
    Object.entries(obj).map(([k, v], i) => {
      if (v == null) v = "";
      const sep = i === 0 ? "" : "&";
      return Buffer.concat([
        Buffer.from(sep, "ascii"),
        iconv.encode(k, "gbk"),
        Buffer.from("=", "ascii"),
        iconv.encode(v, "gbk"),
      ]);
    })
  );
}

async function getElectricity({ elecUser, elecPass, apiBase, apiToken } = {}) {
  if (!elecUser || !elecPass) throw new Error("缺少学号或密码");
  if (!apiBase || !apiToken) throw new Error("缺少 apiBase 或 apiToken");

  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123";

  /* 0 预热取 SessionId */
  await fetch("https://m.myhome.tsinghua.edu.cn/weixin/index.aspx", {
    headers: { "User-Agent": UA },
  });

  /* 1 GET 登录页 */
  const loginBuf = await fetch(
    "https://m.myhome.tsinghua.edu.cn/weixin/weixin_user_authenticate.aspx",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.arrayBuffer());
  const $ = cheerio.load(iconv.decode(Buffer.from(loginBuf), "gbk"));

  const payload = {
    __VIEWSTATE: $("input[name='__VIEWSTATE']").val() ?? "",
    __VIEWSTATEGENERATOR: $("input[name='__VIEWSTATEGENERATOR']").val() ?? "",
    __EVENTVALIDATION: $("input[name='__EVENTVALIDATION']").val() ?? "",
    weixin_user_authenticateCtrl1$txtUserName: elecUser,
    weixin_user_authenticateCtrl1$txtPassword: elecPass,
    weixin_user_authenticateCtrl1$btnLogin: "%B5%C7%C2%BC", // 已是 GBK
  };

  /* 2 POST 登录——关键：键值分别 GBK，裸发送 */
  const bodyGbk = gbkFormEncode(payload);

  await fetch(
    "https://m.myhome.tsinghua.edu.cn/weixin/weixin_user_authenticate.aspx",
    {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer:
          "https://m.myhome.tsinghua.edu.cn/weixin/weixin_user_authenticate.aspx",
        "Content-Length": bodyGbk.length.toString(),
      },
      body: bodyGbk, // ← 原始 GBK 字节
    }
  );

  /* 3 GET 电费页（HTTP）*/
  const eleBuf = await fetch(
    "http://m.myhome.tsinghua.edu.cn/weixin/weixin_student_electricity_search.aspx",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.arrayBuffer());

  const $$ = cheerio.load(iconv.decode(Buffer.from(eleBuf), "gbk"));
  const reading = $$("#weixin_student_electricity_searchCtrl1_lblele").text();

  if (!reading) throw new Error("未抓到电费读数，可能登录失败");
  const fee_amount = parseFloat(reading);
  if (isNaN(fee_amount)) throw new Error("读数解析失败：" + reading);

  const record_time = new Date().toISOString();
  console.log(`电量读取成功：${record_time}，${fee_amount} 度`); // 调试用

  return { record_time, fee_amount };
}

module.exports = { getElectricity };

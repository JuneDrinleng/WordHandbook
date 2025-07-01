import time
import random
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# —— 原函数稍作整理 -------------------------------------------------
def deepl_translator(sentence, target_lang="ZH"):
    """
    调用 https://www2.deepl.com/jsonrpc 翻译
    :param sentence: 待翻译文本
    :param target_lang: 目标语言，如 "EN" / "ZH"
    :return: 翻译后的字符串
    """
    # 1 构造 RPC 请求体
    payload = {
        "jsonrpc": "2.0",
        "method": "LMT_handle_jobs",
        "params": {
            "jobs": [{
                "kind": "default",
                "raw_en_sentence": sentence,
                "raw_en_context_before": [],
                "raw_en_context_after": [],
                "preferred_num_beams": 4,
                "quality": "fast"
            }],
            "lang": {
                "user_preferred_langs": ["EN", "ZH"],
                "source_lang_user_selected": "auto",
                "target_lang": target_lang
            },
            "priority": -1,
            "commonJobParams": {},
            "timestamp": int(time.time() * 10000)
        },
        "id": random.randint(1, 100_000_000)
    }

    # 2 发送请求（官方接口需 auth_key；此处仍用非官方 jsonrpc）
    res = requests.post(
        "https://www2.deepl.com/jsonrpc",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=10
    )
    res.raise_for_status()

    # 3 解析最优翻译结果
    beams = res.json()["result"]["translations"][0]["beams"]
    return beams[0]["postprocessed_sentence"]   # 取第一条 beam

# —— Flask 路由 ----------------------------------------------------
@app.route("/translate", methods=["POST"])
def translate_api():
    """
    请求体 JSON:
    {
      "text": "摸鱼就开心",
      "target_lang": "EN"   // 可选，默认 EN
    }
    """
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    target = data.get("target_lang", "ZH").upper()

    if not text:
        return jsonify({"code": 400, "message": "text required"}), 400

    try:
        result = deepl_translator(text, target)
        return jsonify({"code": 200, "data": result})
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500


if __name__ == "__main__":
    # 线上建议 debug=False，生产环境使用 gunicorn / waitress 等部署
    app.run(host="0.0.0.0", port=19950, debug=True)

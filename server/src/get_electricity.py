#!/usr/bin/env python3
# coding: utf-8
"""
get_electricity.py
爬取电费并写入 PostgreSQL 数据库。
"""
import os
import sys
import requests
from bs4 import BeautifulSoup
import urllib3
import pickle
from datetime import datetime
import psycopg2
import psycopg2.errors
from dotenv import load_dotenv
import time

# 加载 .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

# 环境变量
DATABASE_URL = os.getenv('DATABASE_URL')
ELEC_USER = os.getenv('ELEC_USER')
ELEC_PASS = os.getenv('ELEC_PASS')

if not all([DATABASE_URL, ELEC_USER, ELEC_PASS]):
    print("ERROR: 请在 .env 中配置 DATABASE_URL, ELEC_USER, ELEC_PASS")
    sys.exit(1)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    ),
    "Referer": "https://m.myhome.tsinghua.edu.cn/weixin/index.aspx"
}
def write_to_db(record_time: str, fee_amount: float):
    """写入电费记录；若无权限创建表，忽略创建步骤"""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # 尝试创建表，如果权限不足则忽略
            try:
                cur.execute(
                    '''
                    CREATE TABLE IF NOT EXISTS electricity_bill (
                      id SERIAL PRIMARY KEY,
                      record_time TIMESTAMPTZ NOT NULL,
                      fee_amount NUMERIC(10,2) NOT NULL,
                      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    '''
                )
            except psycopg2.errors.InsufficientPrivilege:
                # 用户无创建表权限，跳过
                conn.rollback()
            # 插入记录
            cur.execute(
                'INSERT INTO electricity_bill (record_time, fee_amount) VALUES (%s, %s)',
                (record_time, fee_amount)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"写入数据库失败: {e}")
        raise
    finally:
        conn.close()


def get_electricty(name, password):
    cookie_file = '.thb_cookie'
    login_url = 'https://m.myhome.tsinghua.edu.cn/weixin/weixin_user_authenticate.aspx'
    session = requests.Session()
    session.verify = False
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    # 加载 cookie
    try:
        with open(cookie_file, 'rb') as f:
            session.cookies.update(pickle.load(f))
    except Exception:
        pass

    # 建立会话
    session.headers.update(HEADERS)
    session.get('https://m.myhome.tsinghua.edu.cn/weixin/index.aspx')
    res = session.get(login_url)
    res.encoding = 'gbk'
    soup = BeautifulSoup(res.text, 'html.parser')

    # 构造表单
    keys = ['__VIEWSTATE','__VIEWSTATEGENERATOR','__EVENTVALIDATION',
            'weixin_user_authenticateCtrl1$txtUserName',
            'weixin_user_authenticateCtrl1$txtPassword',
            'weixin_user_authenticateCtrl1$btnLogin']
    data = {k: '' for k in keys}
    for tag in soup.find_all('input'):
        if tag.get('name') in data:
            data[tag['name']] = tag.get('value', '')
    data['weixin_user_authenticateCtrl1$txtUserName'] = name
    data['weixin_user_authenticateCtrl1$txtPassword'] = password
    data['weixin_user_authenticateCtrl1$btnLogin'] = '%B5%C7%C2%BC'
    session.post(login_url, data=data,headers=HEADERS)

    # 保存 cookie
    try:
        with open(cookie_file, 'wb') as f:
            pickle.dump(session.cookies, f)
    except Exception:
        pass
    time.sleep(5)  # 等待1秒，确保会话稳定
    # 获取电费
    bill_url = 'https://m.myhome.tsinghua.edu.cn/weixin/weixin_student_electricity_search.aspx'
    res = session.get(bill_url, headers=HEADERS)
    res.encoding = 'gbk'
    soup = BeautifulSoup(res.text, 'html.parser')
    elem = soup.find('span', id='weixin_student_electricity_searchCtrl1_lblele')
    if not elem or not elem.text.strip():
        snippet = soup.prettify()[:500]
        raise RuntimeError(f"未找到电费节点，HTML: {snippet}")
    reading = elem.text.strip()

    record_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    fee_amount = float(reading)

    write_to_db(record_time, fee_amount)
    print(f"[{record_time}] 写入电费: {fee_amount}")
    return {'time': record_time, 'power': fee_amount}


if __name__ == '__main__':
    while True:
        time_now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        try:
            get_electricty(ELEC_USER, ELEC_PASS)
            print(f"{time_now}[info]: 电费获取成功")
        except Exception as e:
            print(f"{time_now}[error]: {e}")
            sys.exit(1)
        time.sleep(60 * 60)  # 每小时执行一次

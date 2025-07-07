~~~
sudo -u postgres psql
\c PhdAssistant
\dt

~~~

建表后切换权限给worduser用户：
~~~
CREATE TABLE focus_session (
  id         SERIAL PRIMARY KEY,
  start_time TIMESTAMP NOT NULL,
  end_time   TIMESTAMP NOT NULL,
  task       TEXT      NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 再把所有权改给 worduser
ALTER TABLE focus_session OWNER TO worduser;
~~~

测试专注模式后端：

~~~
curl -X POST http://localhost:3000/focus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mysupersecrettoken" \
  -d '{
        "start_time": "2025-07-07 09:00:00",
        "end_time":   "2025-07-07 11:00:00",
        "task":       "写论文"
      }' -i

~~~


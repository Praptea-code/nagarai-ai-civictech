cd ~/nagarAI/nagarai-ai-civictech/nagar-ai/backend
python3 -m uvicorn app.main:app --port 8123 > /tmp/nagar_admin_test.log 2>&1 &
SERVER_PID=$!
sleep 10
echo "server pid: $SERVER_PID"
ps -p $SERVER_PID > /dev/null && echo "RUNNING" || echo "DIED"
echo "--- log ---"
cat /tmp/nagar_admin_test.log | tail -20
curl -sS http://127.0.0.1:8123/health || echo "CURL_FAILED exit=$?"
kill $SERVER_PID 2>/dev/null

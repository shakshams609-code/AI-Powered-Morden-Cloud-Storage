const axios = require('axios');

async function run() {
  const apiBase = process.env.API_BASE || 'http://localhost:4000/api';
  try {
    console.log('Registering test user...');
    const reg = await axios.post(`${apiBase}/auth/register`, {
      name: 'smoke-test',
      email: `smoke+${Date.now()}@example.com`,
      password: 'password'
    });

    const token = reg.data.token;
    console.log('Registered. Token length:', token.length);

    console.log('Sending chat message...');
    const chat = await axios.post(
      `${apiBase}/chat/message`,
      { message: 'Hello from smoke test', conversationId: null },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('AI response:', chat.data.assistantMessage);

    console.log('Fetching conversations...');
    const conv = await axios.get(`${apiBase}/chat/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Conversations count:', conv.data.length || conv.data.value?.length || 0);
    console.log('Smoke test completed successfully.');
  } catch (err) {
    console.error('Smoke test failed:', err.response?.data || err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) run();

module.exports = { run };

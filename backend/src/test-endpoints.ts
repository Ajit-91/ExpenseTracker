import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING INTEGRATION TESTS ===');
  
  // Test email details
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'password123';
  let token = '';

  // 1. Test registration
  try {
    console.log('\n1. Testing User Registration...');
    const regRes = await axios.post(`${BACKEND_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
    });
    console.log('✓ Registration Successful:', regRes.data.email);
    token = regRes.data.token;
  } catch (error: any) {
    console.error('✗ Registration Failed:', error.response?.data || error.message);
    console.log('Note: Ensure your MongoDB instance is running and MONGO_URI is correctly configured in backend/.env');
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Test login
  try {
    console.log('\n2. Testing User Login...');
    const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    console.log('✓ Login Successful. Token received.');
  } catch (error: any) {
    console.error('✗ Login Failed:', error.response?.data || error.message);
    return;
  }

  // 3. Test Create Expense
  let expenseId = '';
  try {
    console.log('\n3. Testing Expense Creation...');
    const expRes = await axios.post(
      `${BACKEND_URL}/expenses`,
      {
        amount: 450,
        category: 'Food',
        description: 'Team Dinner',
        date: '2026-07-04',
      },
      { headers }
    );
    console.log('✓ Expense Created:', expRes.data.expense);
    expenseId = expRes.data.expenseId;
  } catch (error: any) {
    console.error('✗ Expense Creation Failed:', error.response?.data || error.message);
    return;
  }

  // 4. Test List Expenses
  try {
    console.log('\n4. Testing List Expenses...');
    const listRes = await axios.get(`${BACKEND_URL}/expenses?month=2026-07`, { headers });
    console.log('✓ Expense List Retrieved. Count:', listRes.data.expenses.length);
  } catch (error: any) {
    console.error('✗ List Expenses Failed:', error.response?.data || error.message);
    return;
  }

  // 5. Test Analytics Summary
  try {
    console.log('\n5. Testing Analytics Summary...');
    const sumRes = await axios.get(`${BACKEND_URL}/analytics/summary?month=2026-07`, { headers });
    console.log('✓ Summary Retrieved:', sumRes.data);
  } catch (error: any) {
    console.error('✗ Analytics Summary Failed:', error.response?.data || error.message);
    return;
  }

  // 6. Test Analytics Breakdown
  try {
    console.log('\n6. Testing Analytics Breakdown...');
    const breakRes = await axios.get(`${BACKEND_URL}/analytics/breakdown?month=2026-07`, { headers });
    console.log('✓ Breakdown Retrieved:', breakRes.data);
  } catch (error: any) {
    console.error('✗ Analytics Breakdown Failed:', error.response?.data || error.message);
    return;
  }

  // 7. Test Chatbot Endpoint (forces fallback mock or gemini tool-calling)
  try {
    console.log('\n7. Testing AI Chat (Fallback/Gemini)...');
    const chatRes = await axios.post(
      `${BACKEND_URL}/chat`,
      {
        message: 'Add Rs 300 for Starbucks coffee under Food',
      },
      { headers }
    );
    console.log('✓ AI Chat Reply:', chatRes.data.message);
  } catch (error: any) {
    console.error('✗ AI Chat Failed:', error.response?.data || error.message);
    return;
  }

  // 8. Test Delete Expense
  try {
    console.log('\n8. Testing Delete Expense...');
    const delRes = await axios.delete(`${BACKEND_URL}/expenses/${expenseId}`, { headers });
    console.log('✓ Expense Deleted Successfully:', delRes.data);
  } catch (error: any) {
    console.error('✗ Delete Expense Failed:', error.response?.data || error.message);
    return;
  }

  console.log('\n=== ALL ENDPOINTS VERIFIED SUCCESSFULLY ===');
}

runTests();

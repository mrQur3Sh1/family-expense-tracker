import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // Fix: Use NETLIFY_DATABASE_URL instead of DATABASE_URL
    const sql = neon(Netlify.env.get('NETLIFY_DATABASE_URL'));

    if (req.method === 'GET') {
      const [budget] = await sql`
        SELECT * FROM budgets 
        WHERE user_id = 'default_user' 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      return new Response(JSON.stringify(budget || null), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { amount, startDate, endDate, days } = body;
      
      const [budget] = await sql`
        INSERT INTO budgets (amount, start_date, end_date, days, user_id)
        VALUES (${amount}, ${startDate}, ${endDate}, ${days}, 'default_user')
        RETURNING *
      `;
      
      return new Response(JSON.stringify(budget), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers
    });
  }
};
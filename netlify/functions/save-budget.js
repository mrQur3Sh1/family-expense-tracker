import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers }
    );
  }

  try {
    const sql = neon(Netlify.env.get('NETLIFY_DATABASE_URL'));
    const body = await req.json();
    const { amount, startDate, endDate, days } = body;
    
    // First, get or create the user
    const userId = 'default_user';
    
    const [budget] = await sql`
      INSERT INTO budgets (amount, start_date, end_date, days, user_id)
      VALUES (${amount}, ${startDate}, ${endDate}, ${days}, ${userId})
      RETURNING *
    `;
    
    return new Response(JSON.stringify(budget), { status: 200, headers });
  } catch (error) {
    console.error('Error saving budget:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }), 
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/budget"
};
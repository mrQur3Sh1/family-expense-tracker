import { neon } from '@neondatabase/serverless';

export default async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const body = await req.json();
    const { amount, startDate, endDate, days } = body;
    
    const [budget] = await sql`
      INSERT INTO budgets (amount, start_date, end_date, days, user_id)
      VALUES (${amount}, ${startDate}, ${endDate}, ${days}, 'default_user')
      RETURNING *
    `;
    
    return new Response(JSON.stringify(budget), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error saving budget:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const config = {
  path: "/api/budget"
};
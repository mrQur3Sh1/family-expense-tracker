import { neon } from '@neondatabase/serverless';

export default async (req) => {
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    const expenses = await sql`
      SELECT * FROM expenses 
      WHERE user_id = 'default_user' 
      ORDER BY date DESC, created_at DESC
    `;
    
    return new Response(JSON.stringify(expenses || []), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error getting expenses:', error);
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
  path: "/api/expenses"
};
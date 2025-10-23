import { neon } from '@neondatabase/serverless';

export default async (req) => {
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    const [budget] = await sql`
      SELECT * FROM budgets 
      WHERE user_id = 'default_user' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    return new Response(JSON.stringify(budget || null), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error getting budget:', error);
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
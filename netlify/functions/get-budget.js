import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  try {
    const [budget] = await sql`
      SELECT * FROM budgets 
      WHERE user_id = 'default_user' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    return new Response(JSON.stringify(budget || null), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/api/budget"
};
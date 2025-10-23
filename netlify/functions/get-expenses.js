import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  try {
    const expenses = await sql`
      SELECT * FROM expenses 
      WHERE user_id = 'default_user' 
      ORDER BY date DESC, created_at DESC
    `;
    
    return new Response(JSON.stringify(expenses), {
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
  path: "/api/expenses"
};
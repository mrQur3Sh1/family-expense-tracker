import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  try {
    const body = await req.json();
    const { name, amount, category, date } = body;
    
    const [expense] = await sql`
      INSERT INTO expenses (name, amount, category, date, user_id)
      VALUES (${name}, ${amount}, ${category}, ${date}, 'default_user')
      RETURNING *
    `;
    
    return new Response(JSON.stringify(expense), {
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
  path: "/api/expenses",
  method: "POST"
};
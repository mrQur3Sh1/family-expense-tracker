import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  try {
    const body = await req.json();
    const { amount, startDate, endDate, days } = body;
    
    const [budget] = await sql`
      INSERT INTO budgets (amount, start_date, end_date, days, user_id)
      VALUES (${amount}, ${startDate}, ${endDate}, ${days}, 'default_user')
      RETURNING *
    `;
    
    return new Response(JSON.stringify(budget), {
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
  path: "/api/budget",
  method: "POST"
};
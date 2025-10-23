import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const conn = Netlify.env.get('NETLIFY_DATABASE_URL') || Netlify.env.get('DATABASE_URL');
    if (!conn) {
      return new Response(JSON.stringify({ error: 'No database connection string configured' }), { status: 500, headers });
    }

    const sql = neon(conn);

    if (req.method === 'GET') {
      const [budget] = await sql`
        SELECT * FROM budgets
        WHERE user_id = 'default_user'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      // return budget or null (frontend treats null as cleared)
      return new Response(JSON.stringify(budget || null), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { amount, startDate, endDate, days } = body;

      const [inserted] = await sql`
        INSERT INTO budgets (amount, start_date, end_date, days, user_id)
        VALUES (${amount}, ${startDate}, ${endDate}, ${days}, 'default_user')
        RETURNING *
      `;
      return new Response(JSON.stringify(inserted), { status: 200, headers });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (id) {
        await sql`
          DELETE FROM budgets
          WHERE id = ${id} AND user_id = 'default_user'
        `;
      } else {
        // delete all budgets for user (or change to only delete latest)
        await sql`
          DELETE FROM budgets
          WHERE user_id = 'default_user'
        `;
      }

      return new Response(JSON.stringify({ deleted: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    console.error('budget function error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500, headers });
  }
};
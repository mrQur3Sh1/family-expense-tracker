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
      const rows = await sql`
        SELECT id, name, amount, category, date
        FROM expenses
        WHERE user_id = 'default_user'
        ORDER BY date DESC, created_at DESC
      `;
      return new Response(JSON.stringify(rows || []), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, amount, category, date } = body;

      const [inserted] = await sql`
        INSERT INTO expenses (name, amount, category, date, user_id)
        VALUES (${name}, ${amount}, ${category}, ${date}, 'default_user')
        RETURNING id, name, amount, category, date
      `;
      return new Response(JSON.stringify(inserted), { status: 200, headers });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400, headers });
      }

      await sql`
        DELETE FROM expenses
        WHERE id = ${id} AND user_id = 'default_user'
      `;
      return new Response(JSON.stringify({ deleted: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    console.error('expenses function error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500, headers });
  }
};
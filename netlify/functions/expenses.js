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
    // Fix: Use NETLIFY_DATABASE_URL instead of DATABASE_URL
    const sql = neon(Netlify.env.get('NETLIFY_DATABASE_URL'));

    if (req.method === 'GET') {
      const expenses = await sql`
        SELECT * FROM expenses 
        WHERE user_id = 'default_user' 
        ORDER BY date DESC, created_at DESC
      `;
      return new Response(JSON.stringify(expenses || []), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, amount, category, date } = body;
      
      const [expense] = await sql`
        INSERT INTO expenses (name, amount, category, date, user_id)
        VALUES (${name}, ${amount}, ${category}, ${date}, 'default_user')
        RETURNING *
      `;
      
      return new Response(JSON.stringify(expense), { status: 200, headers });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID is required' }), {
          status: 400, headers
        });
      }
      
      await sql`
        DELETE FROM expenses 
        WHERE id = ${id} AND user_id = 'default_user'
      `;
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers
    });
  }
};
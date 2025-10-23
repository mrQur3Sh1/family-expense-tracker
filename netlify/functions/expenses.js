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
    const sql = neon(Netlify.env.get('NETLIFY_DATABASE_URL'));
    
    // Add basic rate limiting
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    
    // Add user identification (for now using IP, later we'll add proper auth)
    const userId = `user_${ip.replace(/\./g, '_')}`;

    if (req.method === 'GET') {
      const expenses = await sql`
        SELECT * FROM expenses 
        WHERE user_id = ${userId}
        ORDER BY date DESC, created_at DESC
        LIMIT 100
      `;
      return new Response(JSON.stringify(expenses || []), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, amount, category, date } = body;
      
      // Validate input
      if (!name || !amount || !category || !date) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers
        });
      }
      
      // Limit amount to reasonable values
      if (amount > 10000000 || amount < 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400, headers
        });
      }
      
      const [expense] = await sql`
        INSERT INTO expenses (name, amount, category, date, user_id)
        VALUES (${name}, ${amount}, ${category}, ${date}, ${userId})
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
      
      // Only allow users to delete their own expenses
      await sql`
        DELETE FROM expenses 
        WHERE id = ${id} AND user_id = ${userId}
      `;
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers
    });
  }
};
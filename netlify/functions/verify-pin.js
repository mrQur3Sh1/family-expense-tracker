export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers }
    );
  }

  try {
    const body = await req.json();
    const { pin } = body;

    // Get PIN from environment variable
    const correctPin = Netlify.env.get('APP_PIN');

    if (!correctPin) {
      return new Response(
        JSON.stringify({ error: 'PIN not configured' }), 
        { status: 500, headers }
      );
    }

    // Verify PIN
    const isValid = pin === correctPin;

    return new Response(
      JSON.stringify({ valid: isValid }), 
      { status: 200, headers }
    );

  } catch (error) {
    console.error('PIN verification error:', error);
    return new Response(
      JSON.stringify({ error: 'Verification failed' }), 
      { status: 500, headers }
    );
  }
};
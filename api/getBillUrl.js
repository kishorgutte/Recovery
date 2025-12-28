
export default async function handler(request, response) {
  // 1. Enable CORS
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Handle Preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const query = request.query || {};
  let { consumerno, billMonth } = query;

  if (!consumerno || !billMonth) {
    return response.status(400).json({ error: 'Consumer number and Bill Month are required' });
  }

  consumerno = consumerno.trim();
  billMonth = billMonth.trim();

  try {
    const targetUrl = `https://mobileapp.mahadiscom.in/empapp/GetBillHistory/WebUrl?consumerno=${consumerno}&billMonth=${encodeURIComponent(billMonth)}`;
    
    // 3. Timeout
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request Timeout')), 10000)
    );

    const fetchPromise = fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    const apiResponse = await Promise.race([fetchPromise, timeoutPromise]);

    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({ error: 'Failed to fetch URL from provider' });
    }

    const data = await apiResponse.json();
    return response.status(200).json(data);

  } catch (error) {
    console.error("API Proxy Error:", error);
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

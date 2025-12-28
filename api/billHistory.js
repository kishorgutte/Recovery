
export default async function handler(request, response) {
  let { consumerno } = request.query;

  if (!consumerno) {
    return response.status(400).json({ error: 'Consumer number is required' });
  }

  // Sanitize input
  consumerno = consumerno.trim();

  try {
    const targetUrl = `https://mobileapp.mahadiscom.in/empapp/GetBillHistory?consumerno=${consumerno}`;
    
    // Set a timeout to prevent long hangs (10 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const apiResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        // Use a standard browser User-Agent to avoid getting blocked by strict WAFs
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeout);

    // Handle 404 from upstream (Consumer ID not found in their DB) gracefully
    // Instead of throwing an error, we return an empty history list
    if (apiResponse.status === 404) {
      response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      return response.status(200).json([]);
    }

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({ error: 'Failed to fetch data from provider' });
    }

    const data = await apiResponse.json();

    // Cache Control: Cache the result on Vercel's Edge Network for 1 hour (3600 seconds)
    // stale-while-revalidate allows serving old data while fetching new data in the background
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return response.status(200).json(data);
  } catch (error) {
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

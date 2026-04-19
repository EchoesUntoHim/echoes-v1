export async function onRequest(context: any) {
  const { request } = context;

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const url = new URL(request.url);
    const targetUrl = new URL('https://studio-api.suno.ai' + url.search);
    
    // Extract query parameter meant to be the path (e.g. ?path=/api/feed/)
    const pathParam = url.searchParams.get('path');
    if (pathParam) {
       targetUrl.pathname = pathParam;
       targetUrl.searchParams.delete('path');
    } else {
       targetUrl.pathname = '/api/feed/';
    }

    // Clone the request headers
    const headers = new Headers(request.headers);
    // Remove the origin/referer so Suno doesn't block it based on them
    headers.set("Origin", "https://suno.com");
    headers.set("Referer", "https://suno.com/");
    // Cloudflare adds some headers, let's clean them to avoid issues
    headers.delete("CF-Connecting-IP");
    
    const sunoCookie = headers.get("x-suno-cookie");
    if (sunoCookie) {
      headers.set("Cookie", `__client_udev=${sunoCookie}; __session=${sunoCookie}`);
      headers.set("Authorization", `Bearer ${sunoCookie}`);
      headers.delete("x-suno-cookie");
    }

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
    });

    const responseHeaders = new Headers(response.headers);
    // Add CORS headers to the response
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function isolateExternalServices(page) {
  await page.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin === 'http://127.0.0.1:4173') return route.continue();
    if (request.resourceType() === 'image') {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="32"/>' });
    }
    if (request.resourceType() === 'stylesheet') return route.fulfill({ contentType: 'text/css', body: '' });
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"simulated offline service"}' });
  });
}

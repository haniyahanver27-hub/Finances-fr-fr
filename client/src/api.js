const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' && data?.error
      ? data.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
};

export const apiJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  return parseResponse(response);
};

export const apiAudio = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await parseResponse(response);
    throw new Error(data?.error || 'Audio request failed');
  }
  return response.blob();
};

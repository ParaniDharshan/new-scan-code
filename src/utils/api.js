export async function apiRequest(path, options) {
  let response
  try {
    response = await fetch(path, options)
  } catch {
    throw new Error(
      'Could not connect to the backend. Run the full app with npm run dev, or start the production server with npm start.',
    )
  }

  const body = await response.text()
  let result
  try {
    result = body ? JSON.parse(body) : null
  } catch {
    result = null
  }

  if (!response.ok) {
    if (response.status === 405) {
      throw new Error(
        'The saved-pattern API is not available at this address (HTTP 405). Run npm run dev, or use npm start for production; Vite preview alone does not run the backend.',
      )
    }
    throw new Error(
      result?.error || `The backend returned HTTP ${response.status} without a usable API response.`,
    )
  }

  if (result === null) {
    throw new Error('The backend returned an invalid response. Check that the API server is running.')
  }

  return result
}

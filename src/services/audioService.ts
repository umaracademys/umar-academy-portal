// Audio upload service for mistake recordings
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Upload audio recording for a mistake
 * @param audioBlob The audio blob to upload
 * @param mistakeId Optional mistake ID if updating existing mistake
 * @returns URL to the uploaded audio file
 */
export async function uploadMistakeAudio(
  audioBlob: Blob,
  mistakeId?: string
): Promise<string> {
  try {
    // Convert blob to array buffer for upload
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    const response = await fetch(`${API_BASE}/api/mistakes/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload audio: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    // Return full URL if relative path
    let audioUrl = data.audioUrl;
    if (!audioUrl.startsWith('http')) {
      // Remove /api from base URL if present (uploads are served from root, not /api)
      let baseUrl = API_BASE;
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.replace('/api', '');
      }
      // Ensure base URL doesn't end with / and audioUrl starts with /
      baseUrl = baseUrl.replace(/\/$/, '');
      audioUrl = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
      audioUrl = `${baseUrl}${audioUrl}`;
    }
    return audioUrl;
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
}


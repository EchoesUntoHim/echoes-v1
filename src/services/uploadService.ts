/**
 * YouTube Data API v3 Video Upload
 */
export const uploadToYouTube = async (
  videoFile: Blob,
  metadata: { title: string; description: string; tags: string[]; status: string },
  accessToken: string,
  onProgress?: (progress: number) => void
) => {
  const metadataBlob = new Blob([JSON.stringify({
    snippet: {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      categoryId: '10' // Music
    },
    status: {
      privacyStatus: metadata.status.toLowerCase(), // public, private, unlisted
      selfDeclaredMadeForKids: false
    }
  })], { type: 'application/json' });

  const formData = new FormData();
  formData.append('metadata', metadataBlob);
  formData.append('video', videoFile);

  const url = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';

  // multipart upload with Progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.response));
      } else {
        reject(new Error(`YouTube Upload Failed: ${xhr.statusText} (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during YouTube upload'));
    xhr.send(formData);
  });
};

/**
 * TikTok Content Posting API (v2)
 * 1. Initialize Upload
 * 2. Upload Video
 */
export const uploadToTikTok = async (
  videoFile: Blob,
  metadata: { title: string },
  accessToken: string,
  onProgress?: (progress: number) => void
) => {
  try {
    // 1. Initialize (영상의 크기를 먼저 알리고 업로드 URL을 받아옵니다)
    const initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
    const initResponse = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoFile.size,
          chunk_size: videoFile.size, // 단일 청크 업로드 (대용량의 경우 분할 필요)
          total_chunk_count: 1
        }
      })
    });

    const initData = await initResponse.json();
    if (initData.error) throw new Error(`TikTok Init Error: ${initData.error.message}`);

    const uploadUrl = initData.data.upload_url;
    
    // 2. Upload (실제 영상 데이터 전송)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Range', `bytes 0-${videoFile.size - 1}/${videoFile.size}`);
      xhr.setRequestHeader('Content-Type', videoFile.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, message: "TikTok Upload Success" });
        } else {
          reject(new Error(`TikTok Upload Failed: ${xhr.statusText} (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during TikTok upload'));
      xhr.send(videoFile);
    });

  } catch (error: any) {
    console.error("TikTok Upload Exception:", error);
    throw error;
  }
};
/**
 * Google Blogger API v3 Posting
 */
export const uploadToBlogger = async (
  blogId: string,
  metadata: { title: string; content: string },
  accessToken: string
) => {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kind: 'blogger#post',
      blog: { id: blogId },
      title: metadata.title,
      content: metadata.content
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Blogger Posting Failed: ${data.error.message}`);
  }
  return data;
};

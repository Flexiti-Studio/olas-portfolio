// Utility to parse YouTube/Vimeo URLs into standard embeddable player URLs
export function getEmbedVideoUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // YouTube standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const youtubeWatchRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = trimmed.match(youtubeWatchRegex);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
  const youtubeShortsRegex = /youtube\.com\/shorts\/([^"&?\/\s]{11})/i;
  const shortsMatch = trimmed.match(youtubeShortsRegex);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }

  // Vimeo: https://vimeo.com/VIDEO_ID
  const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }

  return trimmed;
}

export function isEmbeddableVideoUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com")
  );
}


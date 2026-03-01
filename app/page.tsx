"use client";

import { useState } from "react";

interface VideoFormat {
  itag: number;
  quality: string;
  qualityLabel: string;
  mimeType: string;
  hasVideo: boolean;
  hasAudio: boolean;
  contentLength?: string;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  formats: VideoFormat[];
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [selectedItag, setSelectedItag] = useState<number | null>(null);

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError("YouTube URL을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setVideoInfo(null);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "영상 정보를 가져오는데 실패했습니다.");
        return;
      }

      setVideoInfo(data);
      const defaultFormat = data.formats.find(
        (f: VideoFormat) => f.hasVideo && f.hasAudio
      );
      if (defaultFormat) setSelectedItag(defaultFormat.itag);
    } catch {
      setError("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedItag || !videoInfo) return;

    setDownloading(true);
    try {
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&itag=${selectedItag}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${videoInfo.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return "알 수 없음";
    const mb = parseInt(bytes) / (1024 * 1024);
    return mb < 1024
      ? `${mb.toFixed(1)} MB`
      : `${(mb / 1024).toFixed(1)} GB`;
  };

  const videoFormats = videoInfo?.formats.filter(
    (f) => f.hasVideo && f.hasAudio
  );
  const audioFormats = videoInfo?.formats.filter(
    (f) => !f.hasVideo && f.hasAudio
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-6 pt-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <h1 className="text-4xl font-bold text-white">YouTube 다운로더</h1>
        </div>
        <p className="text-gray-400">유튜브 영상을 무료로 다운로드하세요</p>
      </div>

      {/* URL Input */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchVideoInfo()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 transition-colors placeholder-gray-500"
          />
          <button
            onClick={fetchVideoInfo}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                분석 중
              </span>
            ) : "분석"}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* Video Info */}
      {videoInfo && (
        <div className="w-full max-w-2xl bg-gray-800 rounded-xl p-6 border border-gray-700">
          {/* Thumbnail + Info */}
          <div className="flex gap-4 mb-6">
            <img
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-lg leading-tight mb-1 line-clamp-2">
                {videoInfo.title}
              </h2>
              <p className="text-gray-400 text-sm">{videoInfo.author}</p>
              <p className="text-gray-400 text-sm">길이: {videoInfo.duration}</p>
            </div>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3">화질 선택</h3>

            {videoFormats && videoFormats.length > 0 && (
              <div className="mb-3">
                <p className="text-gray-400 text-xs mb-2 uppercase tracking-wide">동영상 + 오디오</p>
                <div className="grid grid-cols-2 gap-2">
                  {videoFormats.map((fmt) => (
                    <button
                      key={fmt.itag}
                      onClick={() => setSelectedItag(fmt.itag)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedItag === fmt.itag
                          ? "border-red-500 bg-red-500/10 text-white"
                          : "border-gray-600 text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <span className="font-medium">{fmt.qualityLabel || fmt.quality}</span>
                      <span className="text-xs text-gray-400">{formatSize(fmt.contentLength)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {audioFormats && audioFormats.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2 uppercase tracking-wide">오디오만</p>
                <div className="grid grid-cols-2 gap-2">
                  {audioFormats.slice(0, 4).map((fmt) => (
                    <button
                      key={fmt.itag}
                      onClick={() => setSelectedItag(fmt.itag)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedItag === fmt.itag
                          ? "border-red-500 bg-red-500/10 text-white"
                          : "border-gray-600 text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <span className="font-medium">MP3 ({fmt.quality})</span>
                      <span className="text-xs text-gray-400">{formatSize(fmt.contentLength)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!selectedItag || downloading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-900 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                다운로드 시작 중...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                다운로드
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer */}
      <p className="mt-10 text-gray-600 text-xs text-center">
        개인 이용 목적에 한해 사용하세요. 저작권법을 준수하세요.
      </p>
    </main>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { Innertube } from "youtubei.js";

export const runtime = "nodejs";
export const maxDuration = 30;

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      { error: "올바른 YouTube URL이 아닙니다." },
      { status: 400 }
    );
  }

  try {
    const yt = await Innertube.create({ retrieve_player: false });
    const info = await yt.getBasicInfo(videoId, "WEB");

    const streamingData = info.streaming_data;
    if (!streamingData) {
      return NextResponse.json(
        { error: "스트리밍 데이터를 가져올 수 없습니다." },
        { status: 500 }
      );
    }

    // combined (video+audio) formats
    const combinedFormats = (streamingData.formats || []).map((f) => ({
      itag: f.itag,
      quality: f.quality ?? "",
      qualityLabel: (f as any).quality_label ?? "",
      mimeType: f.mime_type ?? "",
      hasVideo: true,
      hasAudio: true,
      contentLength: (f as any).content_length?.toString(),
    }));

    // adaptive formats (video-only or audio-only)
    const adaptiveFormats = (streamingData.adaptive_formats || []).map((f) => {
      const mime = f.mime_type ?? "";
      const hasVideo = mime.startsWith("video");
      return {
        itag: f.itag,
        quality: f.quality ?? "",
        qualityLabel: (f as any).quality_label ?? "",
        mimeType: mime,
        hasVideo,
        hasAudio: !hasVideo,
        contentLength: (f as any).content_length?.toString(),
      };
    });

    // deduplicate by qualityLabel + hasVideo + hasAudio
    const seen = new Set<string>();
    const formats = [...combinedFormats, ...adaptiveFormats].filter((f) => {
      const key = `${f.qualityLabel}|${f.hasVideo}|${f.hasAudio}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const basic = info.basic_info;
    const thumbnail =
      (basic.thumbnail as any[])
        ?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? "";

    return NextResponse.json({
      title: basic.title ?? "Unknown",
      thumbnail,
      duration: formatDuration(basic.duration ?? 0),
      author: basic.author ?? "",
      formats,
    });
  } catch (err) {
    console.error("info error:", err);
    return NextResponse.json(
      { error: "영상 정보를 가져오는데 실패했습니다. URL을 확인해주세요." },
      { status: 500 }
    );
  }
}

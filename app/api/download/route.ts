import { NextRequest, NextResponse } from "next/server";
import { Innertube } from "youtubei.js";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const itag = searchParams.get("itag");

  if (!url || !itag) {
    return NextResponse.json(
      { error: "URL과 화질 정보가 필요합니다." },
      { status: 400 }
    );
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      { error: "올바른 YouTube URL이 아닙니다." },
      { status: 400 }
    );
  }

  try {
    const yt = await Innertube.create({ retrieve_player: true });
    const info = await yt.getBasicInfo(videoId, "WEB");

    const streamingData = info.streaming_data;
    if (!streamingData) throw new Error("No streaming data");

    const allFormats = [
      ...(streamingData.formats ?? []),
      ...(streamingData.adaptive_formats ?? []),
    ];

    const selectedFormat = allFormats.find((f) => f.itag === parseInt(itag));
    if (!selectedFormat) {
      return NextResponse.json(
        { error: "선택한 화질을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Get the download URL (decipher if needed)
    const downloadUrl: string =
      selectedFormat.url ??
      (selectedFormat as any).decipher(yt.session.player);

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "다운로드 URL을 생성할 수 없습니다." },
        { status: 500 }
      );
    }

    const title = (info.basic_info.title ?? "video")
      .replace(/[<>:"/\\|?*]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const mime = selectedFormat.mime_type ?? "";
    const hasVideo = mime.startsWith("video");
    const ext = hasVideo ? "mp4" : "webm";
    const filename = encodeURIComponent(`${title}.${ext}`);

    // Proxy stream from YouTube → client
    const ytRes = await fetch(downloadUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
      },
    });

    if (!ytRes.ok || !ytRes.body) {
      throw new Error(`YouTube fetch failed: ${ytRes.status}`);
    }

    const headers: Record<string, string> = {
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Content-Type": mime.split(";")[0] || "video/mp4",
    };

    const contentLength =
      ytRes.headers.get("content-length") ??
      (selectedFormat as any).content_length?.toString();
    if (contentLength) headers["Content-Length"] = contentLength;

    return new NextResponse(ytRes.body, { headers });
  } catch (err) {
    console.error("download error:", err);
    return NextResponse.json(
      { error: "다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export const runtime = "nodejs";
export const maxDuration = 30;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
  }

  if (!ytdl.validateURL(url)) {
    return NextResponse.json(
      { error: "올바른 YouTube URL이 아닙니다." },
      { status: 400 }
    );
  }

  try {
    const info = await ytdl.getInfo(url);
    const details = info.videoDetails;

    const formats = info.formats
      .filter((f) => f.url)
      .map((f) => ({
        itag: f.itag,
        quality: f.quality,
        qualityLabel: f.qualityLabel || "",
        mimeType: f.mimeType || "",
        hasVideo: f.hasVideo,
        hasAudio: f.hasAudio,
        contentLength: f.contentLength,
      }))
      .filter(
        (f, idx, arr) =>
          arr.findIndex(
            (x) =>
              x.qualityLabel === f.qualityLabel &&
              x.hasVideo === f.hasVideo &&
              x.hasAudio === f.hasAudio
          ) === idx
      );

    const thumbnail =
      details.thumbnails?.sort((a, b) => b.width - a.width)[0]?.url || "";

    return NextResponse.json({
      title: details.title,
      thumbnail,
      duration: formatDuration(parseInt(details.lengthSeconds)),
      author: details.author?.name || "",
      formats,
    });
  } catch (err) {
    console.error("ytdl error:", err);
    return NextResponse.json(
      { error: "영상 정보를 가져오는데 실패했습니다. URL을 확인해주세요." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const itag = searchParams.get("itag");

  if (!url || !itag) {
    return NextResponse.json({ error: "URL과 화질 정보가 필요합니다." }, { status: 400 });
  }

  if (!ytdl.validateURL(url)) {
    return NextResponse.json({ error: "올바른 YouTube URL이 아닙니다." }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = info.formats.find((f) => f.itag === parseInt(itag));

    if (!format) {
      return NextResponse.json({ error: "선택한 화질을 찾을 수 없습니다." }, { status: 404 });
    }

    const title = info.videoDetails.title
      .replace(/[^\w\s가-힣]/gi, "")
      .trim()
      .replace(/\s+/g, "_");

    const ext = format.hasVideo ? "mp4" : "mp3";
    const filename = encodeURIComponent(`${title}.${ext}`);

    const stream = ytdl.downloadFromInfo(info, { format });

    const readable = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err: Error) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    const headers: Record<string, string> = {
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Content-Type": format.mimeType?.split(";")[0] || "video/mp4",
      "Transfer-Encoding": "chunked",
    };

    if (format.contentLength) {
      headers["Content-Length"] = format.contentLength;
    }

    return new NextResponse(readable, { headers });
  } catch (err) {
    console.error("download error:", err);
    return NextResponse.json(
      { error: "다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

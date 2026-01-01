import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getDriveFileId } from "@/lib/drive";
import { getDriveFileInfo } from "@/lib/drive";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Получаем access token из JWT токена
    const token = await getToken({ req: request });
    const accessToken = token?.accessToken as string | undefined;
    
    if (!accessToken) {
      return NextResponse.json({
        status: "idle",
        lastSyncTime: null,
        error: null,
        fileId: null,
      });
    }

    const email = session.user.email;
    const fileId = await getDriveFileId(email);

    if (!fileId) {
      return NextResponse.json({
        status: "idle",
        lastSyncTime: null,
        error: null,
        fileId: null,
      });
    }

    // Получаем информацию о файле
    const fileInfo = await getDriveFileInfo(accessToken, fileId);

    return NextResponse.json({
      status: fileInfo ? "success" : "idle",
      lastSyncTime: fileInfo?.modifiedTime || null,
      error: null,
      fileId: fileId,
      webViewLink: fileInfo?.webViewLink || null,
    });
  } catch (error) {
    console.error("Error getting drive status:", error);
    return NextResponse.json({
      status: "error",
      lastSyncTime: null,
      error: error instanceof Error ? error.message : "Unknown error",
      fileId: null,
    });
  }
}


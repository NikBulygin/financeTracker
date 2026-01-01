import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { downloadFromDrive } from "@/lib/drive";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: "No access token. Please re-authenticate." },
        { status: 401 }
      );
    }

    // Получаем fileId из тела запроса (передается с клиента)
    const body = await request.json();
    const fileId = body.fileId;

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required. Please save file to Drive first." },
        { status: 400 }
      );
    }

    // Скачиваем файл из Google Drive
    const csvContent = await downloadFromDrive(accessToken, fileId);

    return NextResponse.json({
      success: true,
      csvContent,
    });
  } catch (error) {
    console.error("Error downloading from Google Drive:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to download from Google Drive",
      },
      { status: 500 }
    );
  }
}


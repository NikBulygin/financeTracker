import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCSV, stringifyCSV } from "@/lib/csv";
import { uploadToDrive, findDriveFile, saveDriveFileId, getDriveFileId } from "@/lib/drive";
import { getToken } from "next-auth/jwt";

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

    const email = session.user.email;
    const fileName = `finance_data_${email.replace("@", "_")}.csv`;

    // Получаем CSV данные
    const csvData = await getCSV(email);
    const csvContent = stringifyCSV(csvData);

    // Проверяем, есть ли уже файл в Drive
    let existingFileId = await getDriveFileId(email);
    
    if (!existingFileId) {
      // Ищем файл по имени
      const existingFile = await findDriveFile(accessToken, fileName);
      if (existingFile) {
        existingFileId = existingFile.fileId;
        await saveDriveFileId(email, existingFileId);
      }
    }

    // Загружаем или обновляем файл
    const fileInfo = await uploadToDrive(
      accessToken,
      fileName,
      csvContent,
      "text/csv",
      existingFileId || undefined
    );

    // Сохраняем fileId
    if (!existingFileId) {
      await saveDriveFileId(email, fileInfo.fileId);
    }

    return NextResponse.json({
      success: true,
      fileId: fileInfo.fileId,
      fileName: fileInfo.name,
      modifiedTime: fileInfo.modifiedTime,
      webViewLink: fileInfo.webViewLink,
    });
  } catch (error) {
    console.error("Error saving to Google Drive:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save to Google Drive",
      },
      { status: 500 }
    );
  }
}


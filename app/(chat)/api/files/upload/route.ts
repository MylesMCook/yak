import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\]/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 200) || "file"
  );
}

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? "garage";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicUrl ?? endpoint.replace(/\/$/, ""),
  };
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getS3Config();
  if (!config) {
    return NextResponse.json(
      { error: "File uploads are not supported in this deployment" },
      { status: 501 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing or invalid file" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 413 }
    );
  }

  const key = `uploads/${session.user.id}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const contentType = file.type || "application/octet-stream";

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  try {
    const body = new Uint8Array(await file.arrayBuffer());
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  } catch (err) {
    console.error("S3 upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });
  }

  const url = `${config.publicBaseUrl}/${config.bucket}/${key}`;

  return NextResponse.json({
    url,
    pathname: key,
    contentType,
  });
}

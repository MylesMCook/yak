import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: Request) {
	const session = await auth();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.json(
		{ error: "File uploads are not supported in this deployment" },
		{ status: 501 }
	);
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const accessToken = (await cookies()).get("secondme_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const baseUrl =
    process.env.SECONDME_API_BASE_URL ?? "https://app.mindos.com/gate/lab";
  const upstream = await fetch(`${baseUrl}/api/secondme/user/softmemory`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = await upstream.text();
  return new NextResponse(payload, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

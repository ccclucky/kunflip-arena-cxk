import { NextResponse } from "next/server";

export async function GET() {
  const oauthBaseUrl =
    process.env.SECONDME_OAUTH_BASE_URL ?? "https://go.second.me/oauth";
  const authorizeOverride = process.env.SECONDME_OAUTH_AUTHORIZE_URL;
  const clientId = process.env.SECONDME_CLIENT_ID;
  const redirectUri = process.env.SECONDME_REDIRECT_URI;
  const scope =
    process.env.SECONDME_SCOPES ??
    "user.info user.info.shades user.info.softmemory";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { code: 1, message: "缺少 SecondMe OAuth 配置" },
      { status: 500 }
    );
  }

  const base = authorizeOverride ?? oauthBaseUrl;
  const url = new URL(base);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);

  return NextResponse.redirect(url);
}

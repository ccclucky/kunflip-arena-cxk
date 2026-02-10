import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const apiBaseUrl =
    process.env.SECONDME_API_BASE_URL ?? "https://app.mindos.com/gate/lab";
  const oauthBaseUrl =
    process.env.SECONDME_OAUTH_BASE_URL ?? "https://go.second.me/oauth";
  const tokenOverride =
    process.env.SECONDME_TOKEN_ENDPOINT ?? process.env.SECONDME_OAUTH_TOKEN_URL;
  const clientId = process.env.SECONDME_CLIENT_ID;
  const clientSecret = process.env.SECONDME_CLIENT_SECRET;
  const redirectUri = process.env.SECONDME_REDIRECT_URI;

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", request.url));
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/?error=missing_config", request.url),
    );
  }

  const tokenCandidates = Array.from(
    new Set(
      [
        tokenOverride,
        `${apiBaseUrl.replace(/\/$/, "")}/api/oauth/token/code`,
        `${apiBaseUrl.replace(/\/$/, "")}/api/oauth/token`,
        `${apiBaseUrl.replace(/\/$/, "")}/oauth/token`,
        `${oauthBaseUrl.replace(/\/$/, "")}/token`,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  type TokenResponse = {
    code?: number;
    message?: string;
    subCode?: string;
    access_token?: string;
    refresh_token?: string;
    accessToken?: string;
    refreshToken?: string;
    data?: {
      access_token?: string;
      refresh_token?: string;
      accessToken?: string;
      refreshToken?: string;
    };
  };

  let tokenResponse: Response | null = null;
  let tokenText = "";
  let tokenJson: TokenResponse | null = null;

  for (const candidate of tokenCandidates) {
    const response = await fetch(candidate, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    const text = await response.text();
    let json: TokenResponse | null = null;

    try {
      json = JSON.parse(text) as TokenResponse;
    } catch {
      json = null;
    }

    tokenResponse = response;
    tokenText = text;
    tokenJson = json;

    if (
      response.ok &&
      (json?.code === 0 ||
        json?.access_token ||
        json?.data?.access_token ||
        json?.accessToken ||
        json?.data?.accessToken)
    ) {
      break;
    }

    if (response.status !== 404 && response.status !== 405) {
      break;
    }
  }

  if (!tokenResponse) {
    const errorUrl = new URL("/?error=token_failed", request.url);
    errorUrl.searchParams.set("status", "0");
    errorUrl.searchParams.set("detail", "no_token_endpoint");
    return NextResponse.redirect(errorUrl);
  }

  if (!tokenResponse.ok) {
    const errorUrl = new URL("/?error=token_failed", request.url);
    errorUrl.searchParams.set("status", String(tokenResponse.status));
    if (tokenJson?.subCode || tokenJson?.message) {
      errorUrl.searchParams.set(
        "detail",
        tokenJson.subCode ?? tokenJson.message ?? "",
      );
    } else if (tokenText) {
      errorUrl.searchParams.set("detail", tokenText.slice(0, 180));
    }
    return NextResponse.redirect(errorUrl);
  }

  if (typeof tokenJson?.code === "number" && tokenJson.code !== 0) {
    const errorUrl = new URL("/?error=token_failed", request.url);
    errorUrl.searchParams.set("status", "200");
    errorUrl.searchParams.set(
      "detail",
      tokenJson.subCode ?? tokenJson.message ?? `code_${tokenJson.code}`,
    );
    return NextResponse.redirect(errorUrl);
  }

  const tokenData = (tokenJson ?? {}) as TokenResponse;

  const accessToken =
    tokenData.access_token ??
    tokenData.data?.access_token ??
    tokenData.accessToken ??
    tokenData.data?.accessToken ??
    "";
  const refreshToken =
    tokenData.refresh_token ??
    tokenData.data?.refresh_token ??
    tokenData.refreshToken ??
    tokenData.data?.refreshToken ??
    "";

  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/?error=no_access_token", request.url),
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("secondme_access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });

  if (refreshToken) {
    cookieStore.set("secondme_refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return NextResponse.redirect(new URL("/agent", request.url));
}

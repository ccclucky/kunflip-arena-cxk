import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getSecondMeUser(accessToken: string) {
  const baseUrl =
    process.env.SECONDME_API_BASE_URL ?? "https://app.mindos.com/gate/lab";
  try {
    const res = await fetch(`${baseUrl}/api/secondme/user/info`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Support different response structures
    return json.data || json;
  } catch (e) {
    console.error("Failed to fetch SecondMe user", e);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("secondme_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { code: 401, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const secondMeUser = await getSecondMeUser(accessToken);
    if (!secondMeUser) {
      return NextResponse.json(
        { code: 401, message: "Invalid Token" },
        { status: 401 },
      );
    }

    const secondMeUserId =
      secondMeUser.id || secondMeUser.sub || secondMeUser.userId;

    const user = await prisma.user.findUnique({
      where: { secondmeUserId: String(secondMeUserId) },
    });

    if (!user) {
      return NextResponse.json({ code: 0, data: null });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId: user.id },
    });

    if (agent) {
      // Update lastSeenAt (Heartbeat)
      await prisma.agent.update({
        where: { id: agent.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return NextResponse.json({ code: 0, data: agent });
  } catch (error) {
    console.error("Error in GET /api/agent:", error);
    return NextResponse.json(
      {
        code: 500,
        message: `Internal Server Error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("secondme_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { code: 401, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const secondMeUser = await getSecondMeUser(accessToken);
  if (!secondMeUser) {
    return NextResponse.json(
      { code: 401, message: "Invalid Token" },
      { status: 401 },
    );
  }

  const secondMeUserId =
    secondMeUser.id || secondMeUser.sub || secondMeUser.userId;
  if (!secondMeUserId) {
    return NextResponse.json(
      { code: 500, message: "Could not identify user" },
      { status: 500 },
    );
  }

  // Ensure local user exists
  let user = await prisma.user.findUnique({
    where: { secondmeUserId: String(secondMeUserId) },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        secondmeUserId: String(secondMeUserId),
        accessToken: accessToken,
        refreshToken: "",
        tokenExpiresAt: new Date(Date.now() + 3600000 * 24),
      },
    });
  }

  const body = await req.json();
  const { faction } = body;
  let { name, bio } = body;

  if (!["RED", "BLACK"].includes(faction)) {
    return NextResponse.json(
      { code: 400, message: "Invalid faction" },
      { status: 400 },
    );
  }

  // Auto-fill name and bio if not provided
  if (!name) {
    name =
      secondMeUser.name ||
      secondMeUser.nickname ||
      `Agent-${secondMeUserId.toString().slice(-4)}`;
  }
  if (!bio) {
    bio =
      faction === "RED"
        ? "Defending the glory of the idol!"
        : "Exposing the truth, one flip at a time.";
  }

  // Check if agent already exists
  const existingAgent = await prisma.agent.findUnique({
    where: { userId: user.id },
  });

  if (existingAgent) {
    // Update? Or return error? Let's allow update for bio/name but not faction ideally.
    // But for now, let's just return the existing one.
    return NextResponse.json(
      { code: 409, message: "Agent already exists", data: existingAgent },
      { status: 409 },
    );
  }

  try {
    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        name,
        bio,
        faction,
        avatarUrl: secondMeUser.avatarUrl || secondMeUser.picture,
      },
    });
    return NextResponse.json({ code: 0, data: agent });
  } catch (e) {
    console.error("Failed to create agent", e);
    return NextResponse.json(
      { code: 500, message: "Database error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("secondme_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { code: 401, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const secondMeUser = await getSecondMeUser(accessToken);
  if (!secondMeUser) {
    return NextResponse.json(
      { code: 401, message: "Invalid Token" },
      { status: 401 },
    );
  }

  const secondMeUserId =
    secondMeUser.id || secondMeUser.sub || secondMeUser.userId;
  const user = await prisma.user.findUnique({
    where: { secondmeUserId: String(secondMeUserId) },
  });

  if (!user) {
    return NextResponse.json(
      { code: 404, message: "User not found" },
      { status: 404 },
    );
  }

  try {
    const body = await req.json();
    const { faction, name, bio, avatarUrl } = body;

    // Validate faction if provided
    if (faction && !["RED", "BLACK", "NEUTRAL"].includes(faction)) {
      return NextResponse.json(
        { code: 400, message: "Invalid faction" },
        { status: 400 },
      );
    }

    const updatedAgent = await prisma.agent.update({
      where: { userId: user.id },
      data: {
        ...(faction && { faction }),
        ...(name && { name }),
        ...(bio && { bio }),
        ...(avatarUrl && { avatarUrl }),
      },
    });

    return NextResponse.json({ code: 0, data: updatedAgent });
  } catch (error) {
    console.error("Error in PUT /api/agent:", error);
    return NextResponse.json(
      { code: 500, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getSecondMeUser(accessToken: string) {
  const baseUrl = process.env.SECONDME_API_BASE_URL ?? "https://app.mindos.com/gate/lab";
  try {
    const res = await fetch(`${baseUrl}/api/secondme/user/info`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json; 
  } catch (e) {
    console.error("Failed to fetch SecondMe user", e);
    return null;
  }
}

export async function getCurrentAgent() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("secondme_access_token")?.value;
    if (!accessToken) return null;

    const secondMeUser = await getSecondMeUser(accessToken);
    if (!secondMeUser) return null;

    const secondMeUserId = secondMeUser.id || secondMeUser.sub || secondMeUser.userId;
    if (!secondMeUserId) return null;

    const user = await prisma.user.findUnique({
        where: { secondmeUserId: String(secondMeUserId) },
        include: { agent: true }
    });

    return user?.agent ?? null;
}

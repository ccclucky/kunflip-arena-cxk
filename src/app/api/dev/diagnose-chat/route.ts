import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callChat } from "@/lib/secondme-client";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("secondme_access_token")?.value;

    if (!token) {
        return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    try {
        console.log("Diagnosing Chat API with token:", token.substring(0, 10) + "...");
        const messages = [{ role: "user", content: "Hello, this is a test." }];
        
        // We need to capture the error from callChat if it fails.
        // But callChat currently swallows errors and returns null.
        // We might need to modify callChat temporarily or copy its logic here to debug.
        
        // Let's copy logic to debug
        const BASE_URL = process.env.SECONDME_API_BASE_URL ?? "https://app.mindos.com/gate/lab";
        const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages,
                stream: true
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json({ 
                status: "API_ERROR", 
                statusCode: res.status, 
                errorText: text 
            });
        }

        // If OK, try to read stream
        // For diagnosis, just return success status
        return NextResponse.json({ status: "SUCCESS", message: "Stream connection established" });

    } catch (e: any) {
        return NextResponse.json({ status: "EXCEPTION", error: e.message, stack: e.stack });
    }
}

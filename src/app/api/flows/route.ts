import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";
const PHONE_NUMBER_ID = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

export async function GET(req: NextRequest) {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
        return NextResponse.json({ error: "Missing API credentials" }, { status: 500 });
    }

    try {
        const response = await fetch(
            `${WHATSAPP_API_URL}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/flows?fields=id,name,status,categories,validation_errors,preview.invalidate(false)`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch flows" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, categories, flow_json, publish } = await req.json();

        const response = await fetch(
            `${WHATSAPP_API_URL}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/flows`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    categories,
                    flow_json,
                    publish
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create a flow" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        console.log(`trying to delete ${id}`)

        const response = await fetch(
            `${WHATSAPP_API_URL}/${id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        return NextResponse.json({ message: "Flow deleted" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete a flow" }, { status: 500 });
    }
}

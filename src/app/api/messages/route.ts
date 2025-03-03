import { NextResponse } from "next/server";
import amqp from "amqplib";

const QUEUE_NAME = "whatsapp_incoming_queue";

export async function GET() {
    try {
        const connection = await amqp.connect(`${process.env.RABBITMQ_URL}`);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        let messages: any[] = [];

        await new Promise<void>((resolve) => {
            channel.consume(
                QUEUE_NAME,
                (msg) => {
                    if (msg) {
                        messages.push(JSON.parse(msg.content.toString()));
                    }
                },
                { noAck: false }
            );
            setTimeout(resolve, 500);
        });

        await channel.close();
        await connection.close();

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}
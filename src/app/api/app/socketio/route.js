import { NextResponse } from "next/server";

export async function GET() {

    if (global.io) {
        global.io.emit("action", { message: "Action done!" });
        return NextResponse.json({
            status: "Socket.IO initialized",
            port: httpServer.address().port
        });
    } else {
        return NextResponse.json({
            status: "Socket.IO not initialized",
            port: httpServer.address().port
        });
    }


}
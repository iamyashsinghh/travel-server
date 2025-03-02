import { Server } from "socket.io";

export default function handler(req, res) {
    if (!res.socket.server.io) {
        console.log("🔌 Setting up Socket.io server...");
        
        const io = new Server(res.socket.server, {
            path: "/api/socketio",
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        res.socket.server.io = io;

        io.on("connection", (socket) => {
            console.log(`🚗 Driver Connected: ${socket.id}`);

            socket.on("disconnect", () => {
                console.log(`❌ Driver Disconnected: ${socket.id}`);
            });
        });
    }

    res.end();
}

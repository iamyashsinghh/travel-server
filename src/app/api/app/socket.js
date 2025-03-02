import { Server } from "socket.io";

export default function handler(req, res) {
    if (!res.socket.server.io) {
        console.log("Starting Socket.IO server...");
        const io = new Server(res.socket.server, {
            cors: {
                origin: "*",
            },
        });

        let onlineDrivers = {};

        io.on("connection", (socket) => {
            console.log("A user connected:", socket.id);

            socket.on("driverOnline", (driverId) => {
                onlineDrivers[driverId] = socket.id;
                console.log(`Driver ${driverId} is online`);
            });

            socket.on("bookRide", (rideData) => {
                console.log("New ride request:", rideData);

                for (let driverId in onlineDrivers) {
                    io.to(onlineDrivers[driverId]).emit("newRideRequest", rideData);
                }
            });

            socket.on("disconnect", () => {
                console.log("User disconnected:", socket.id);
                for (let driverId in onlineDrivers) {
                    if (onlineDrivers[driverId] === socket.id) {
                        delete onlineDrivers[driverId];
                        break;
                    }
                }
            });
        });

        res.socket.server.io = io;
    }

    res.end();
}

import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { Server } from "socket.io";
import { initSocket } from "./socket.js";
import { connectDb } from "./config/configDb.js";
import { routerApi } from "./routes/index.routes.js";
import { createInitialPetitions, createInitialPeriod, createInitialUsers } from "./config/initDb.js";
import { createServer } from "http";
import { EMAIL_USER, EMAIL_PASS } from "./config/configEnv.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: true,
        credentials: true,
    },
});

initSocket(io);

app.use(express.json());
app.use(morgan("dev"));

app.use(
    cors({
        credentials: true,
        origin: true,
    })
);

app.get("/", (req, res) => {
    res.send("Bienvenido al sistema de inscripcion de electivo.");
});

console.log("[Startup] EMAIL_USER:", EMAIL_USER ? "configurado" : "no configurado");
console.log("[Startup] EMAIL_PASS:", EMAIL_PASS ? "configurado" : "no configurado");

connectDb()
    .then(() => {
        routerApi(app);

        createInitialUsers();
        createInitialPeriod();
        createInitialPetitions();

        const PORT = process.env.PORT || 3000;
        httpServer.listen(PORT, () => {
            console.log(`Servidor iniciado en http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.log("Error al conectar con la base de datos: ", error);
        process.exit(1);
    })
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";

import { connectDb } from "./config/configDb.js";
import { routerApi } from "./routes/index.routes.js";
import { createInitialPetitions, createInitialPeriod, createInitialUsers } from "./config/initDb.js";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

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
        console.log("Error l conectar con la base de datos: ", error);
        process.exit(1);
    })
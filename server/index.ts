import express, { Router, Request, Response } from "express";
import cors from "cors";
import { sequelize } from "./models";
import { streamRouter } from "./apis/streams";
import { StreamWs } from "./libs/streamws";

const app: express.Application = express();
const port: string = process.env.PORT || "8080";

app.use(express.json());

sequelize
  .sync()
  .then(() => {
    console.log("Database synced");
    app.use(cors());
    app.use("/api/streams", streamRouter);

    // Start the server
    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

    const streamWebSocket = new StreamWs(server);
  })
  .catch((err: any) => {
    console.error("Error syncing database:", err);
  });

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

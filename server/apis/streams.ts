import { Router, Request, Response } from "express";
import { Stream } from "../models/streams";

export const streamRouter: Router = Router();

// Get all streams
streamRouter.get("/", async (req: Request, res: Response) => {
  try {
    const streams = await Stream.findAll({ include: ["joiners"] });
    res.json(streams);
  } catch (error) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get a stream by id
streamRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (stream) {
      res.json(stream);
    } else {
      res.status(404).json({ error: "Stream not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update the status of a stream
streamRouter.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (typeof status === "undefined") {
      return res.status(400).json({ error: "Missing status in request body" });
    }
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }
    stream.status = status;
    await stream.save();
    res.json(stream);
  } catch (error) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Create a new stream
streamRouter.post("/", async (req: Request, res: Response) => {
  try {
    const newStream = await Stream.create(req.body);
    res.status(201).json(newStream);
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

streamRouter.patch("/:id/joiners", async (req: Request, res: Response) => {
  try {
    const { joinerType, userEmail } = req.body;
    if (!joinerType || !userEmail) {
      return res.status(400).json({ error: "Missing joinerType or userEmail" });
    }

    const stream = await Stream.findByPk(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }

    const newJoiner = await stream.createJoiner({
      joinerType,
      userEmail,
    });

    res.status(201).json(newJoiner);
  } catch (error) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
});

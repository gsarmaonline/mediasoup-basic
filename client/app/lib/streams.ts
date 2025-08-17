import { BACKEND_URL } from "./api";

export enum StreamStatus {
  Pending = "pending",
  Started = "started",
  Terminated = "terminated",
}

export enum StreamJoinerType {
  Viewer = "viewer",
  Streamer = "streamer",
}

export interface Stream {
  id?: number;
  title: string;
  path: string;
  createdAt?: string;
  updatedAt?: string;
  status: StreamStatus;
}

export interface StreamJoiner {
  joinerType: StreamJoinerType;
  streamId: number;
  userEmail: string;
}

export const getStreams = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/streams`);
    if (!response.ok) {
      throw new Error("Failed to fetch streams");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching streams:", error);
    throw error;
  }
};

export const createStream = async (stream: Stream) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/streams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stream),
    });
    if (!response.ok) {
      throw new Error("Failed to create stream");
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating stream:", error);
    throw error;
  }
};

export const updateStream = async (stream: Stream, status: StreamStatus) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/streams/${stream.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to update stream");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating stream:", error);
    throw error;
  }
};

export const joinStream = async (
  stream: Stream,
  joinerType: StreamJoinerType,
  userEmail: string
) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/streams/${stream.id}/joiners`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ joinerType, userEmail }),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to join stream");
    }
    return await response.json();
  } catch (error) {
    console.error("Error joining stream:", error);
    throw error;
  }
};

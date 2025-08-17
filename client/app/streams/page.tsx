"use client";
import { getStreams, updateStream, joinStream } from "@/app/lib/streams";
import { StreamStatus, Stream, StreamJoinerType } from "@/app/lib/streams";
import React from "react";
import { useRouter } from "next/navigation";

function StreamActions({
  stream,
  router,
  handleUpdate,
  handleJoinStream,
}: {
  stream: Stream;
  router: ReturnType<typeof useRouter>;
  handleUpdate: (stream: Stream, status: StreamStatus) => void;
  handleJoinStream: (stream: Stream, joinAs: StreamJoinerType) => void;
}) {
  return (
    <React.Fragment>
      {stream.status === StreamStatus.Started ? (
        <React.Fragment>
          <button
            onClick={() => handleUpdate(stream, StreamStatus.Terminated)}
            className="ml-2 mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
          >
            Stop
          </button>
          <button
            onClick={() => handleJoinStream(stream, StreamJoinerType.Streamer)}
            className="ml-2 mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
          >
            Streamer
          </button>
          <button
            onClick={() => handleJoinStream(stream, StreamJoinerType.Viewer)}
            className="ml-2 mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
          >
            Viewer
          </button>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <button
            onClick={() => handleUpdate(stream, StreamStatus.Started)}
            className="ml-2 mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none"
          >
            Start
          </button>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

export default function Streams() {
  const [streams, setStreams] = React.useState<Stream[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      const data = await getStreams();
      setStreams(data);
    })();
  }, []);

  const goToCreateForm = () => {
    router.push("/streams/form");
  };

  const handleUpdate = (stream: Stream, status: StreamStatus) => {
    updateStream(stream, status)
      .then(() => {
        // Optionally, refresh the streams list after updating
        getStreams().then(setStreams);
      })
      .catch((error) => {
        console.error("Error updating stream:", error);
      });
  };

  const handleJoinStream = (stream: Stream, joinAs: StreamJoinerType) => {
    // Logic to join the stream as a viewer or streamer
    const userEmail = localStorage.getItem("email");
    if (!userEmail) {
      console.error("User email not found");
      return;
    }

    joinStream(stream, joinAs, userEmail)
      .then(() => {
        // Optionally, refresh the streams list after joining
        getStreams().then(setStreams);
      })
      .catch((error) => {
        console.error("Error joining stream:", error);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem("email");
    window.location.reload();
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 24,
      }}
    >
      <button
        onClick={handleLogout}
        className="absolute top-4 left-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
      >
        Logout
      </button>
      <button
        onClick={goToCreateForm}
        style={{
          marginBottom: 16,
          padding: "8px 16px",
          backgroundColor: "#22c55e",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        Create Stream
      </button>
      {streams.length === 0 ? (
        <p>No streams available</p>
      ) : (
        <div className="overflow-x-auto flex justify-center">
          <table className="w-full max-w-7xl border-collapse mt-8">
            <thead>
              <tr>
                <th className="border border-gray-300 px-20 py-6">Title</th>
                <th className="border border-gray-300 px-20 py-6">Path</th>
                <th className="border border-gray-300 px-20 py-6">Status</th>
                <th className="border border-gray-300 px-20 py-6">
                  Created At
                </th>
                <th className="border border-gray-300 px-20 py-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((stream: Stream) => (
                <tr key={stream.id}>
                  <td className="border border-gray-300 px-20 py-6 font-medium">
                    {stream.title}
                  </td>
                  <td className="border border-gray-300 px-20 py-6">
                    {stream.path || ""}
                  </td>
                  <td className="border border-gray-300 px-20 py-6">
                    {stream.status || ""}
                  </td>
                  <td className="border border-gray-300 px-20 py-6">
                    {stream.createdAt || ""}
                  </td>
                  <td className="border border-gray-300 px-20 py-6">
                    <StreamActions
                      stream={stream}
                      router={router}
                      handleUpdate={handleUpdate}
                      handleJoinStream={handleJoinStream}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { Device } from "mediasoup-client"; //
import { types as mediasoupTypes } from "mediasoup-client";

import { DefaultEventsMap } from "@socket.io/component-emitter";
import {
  Producer,
  Consumer,
  AppData,
  RtpCapabilities,
} from "mediasoup-client/types";
import { get } from "http";

type RemoteParticipant = {
  id: string;
  stream: MediaStream | null; // Null initially or if stream is not yet available
};

const Room = () => {
  let socket: Socket;

  let device: Device;
  let routerRtpCapabilities: RtpCapabilities;

  let sendTransport: mediasoupTypes.Transport;
  let recvTransports: Map<string, mediasoupTypes.Transport> = new Map();

  let localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);

  const [isProducer, setIsProducer] = useState(false);

  let producer: Producer<AppData>;

  let params: {} = {
    encodings: [
      {
        rid: "r0",
        maxBitrate: 100000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r1",
        maxBitrate: 300000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r2",
        maxBitrate: 900000,
        scalabilityMode: "S1T3",
      },
    ],
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
    codecOptions: {
      videoGoogleStartBitrate: 1000,
    },
  };

  // Function to simulate adding a new participant with a stream
  const addRemoteVideoParticipant = (newParticipant: RemoteParticipant) => {
    setParticipants((prevParticipants) => {
      // Avoid adding duplicates
      if (!prevParticipants.some((p) => p.id === newParticipant.id)) {
        return [...prevParticipants, newParticipant];
      }
      return prevParticipants;
    });
  };

  const streamSuccess = async (stream: MediaStream) => {
    if (!localVideoRef.current) {
      console.error("Local video element is not available");
      return;
    }
    localVideoRef.current.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    params = {
      track,
      ...params,
    };
  };

  const getMedia = async () => {
    try {
      console.log(
        "device.rtpCapabilities.codecs",
        device.rtpCapabilities.codecs
      );
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      streamSuccess(localStream);
      console.log("Got MediaStream:", localStream);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  };

  const initConnectionWithServer = async (socket: Socket) => {
    routerRtpCapabilities = await socket.emitWithAck(
      "getRouterRtpCapabilities"
    );
    device = new Device();
    await device.load({ routerRtpCapabilities });
  };

  const getAvailableProducers = async (socket: Socket) => {
    type ProducerInfo = { id: string; kind: string };
    socket.emit("getAvailableProducers", (producers: ProducerInfo[]) => {
      console.log("Available producers:", producers);
      producers.forEach((producer) => {
        createClientReceiver(socket, producer.id);
      });
    });
  };

  const createSendTransport = (socket: Socket) => {
    socket.emit(
      "createWebRtcTransport",
      { sender: true },
      ({ params }: { params: any }) => {
        if (params.error) {
          console.log(params.error);
          return;
        }
        sendTransport = device.createSendTransport(params);

        sendTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              await socket.emit("transport-connect", {
                dtlsParameters,
                transportId: sendTransport.id,
              });

              // Tell the transport that parameters were transmitted.
              callback();
            } catch (error: any) {
              errback(error);
            }
          }
        );

        sendTransport.on("produce", async (parameters, callback, errback) => {
          try {
            await socket.emit(
              "transport-produce",
              {
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
                transportId: sendTransport.id,
              },
              ({ id }: { id: any }) => {
                callback({ id });
                // Uncomment if you want to create a client receiver
                //createClientReceiver(socket, id);
              }
            );
          } catch (error: any) {
            errback(error);
          }
        });
        connectSendTransport();
      }
    );
  };
  const connectSendTransport = async () => {
    producer = await sendTransport.produce(params);
    console.log("Producer created:", producer.id, producer.kind);

    producer.on("trackended", () => {
      console.log("track ended");
    });

    producer.on("transportclose", () => {
      console.log("transport ended");
    });
  };

  const createClientReceiver = async (socket: Socket, producerId: string) => {
    await socket.emit(
      "createWebRtcTransport",
      { producing: false, producerId },
      ({ params }: { params: any }) => {
        const recvTransport = device.createRecvTransport(params);
        recvTransports.set(producerId, recvTransport);

        recvTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              await socket.emit("transport-recv-connect", {
                dtlsParameters,
                producerId: producerId,
              });
              callback();
            } catch (error: any) {
              errback(error);
            }
          }
        );
        connectRecvTransport(socket, recvTransport, producerId);
        return;
      }
    );
  };

  const connectRecvTransport = async (
    socket: Socket,
    transport: mediasoupTypes.Transport,
    producerId: string
  ) => {
    await socket.emit(
      "consume",
      {
        rtpCapabilities: device.rtpCapabilities,
        producerId: producerId,
        transportId: transport.id,
      },
      async ({ params }: { params: any }) => {
        if (params.error) {
          console.log("Cannot Consume", params.error);
        }

        const consumer: Consumer = await transport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });

        const { track } = consumer;

        socket.emitWithAck("consumer-resume", { consumerId: consumer.id });

        const remoteStream: MediaStream = new MediaStream([track]);
        addRemoteVideoParticipant({ id: producerId, stream: remoteStream });
      }
    );
  };

  const startStreaming = async () => {
    if (socket == null) {
      console.log("Socket is not initialized yet");
      return;
    }

    setIsProducer(true);

    await getMedia();
    await createSendTransport(socket);
  };

  useEffect(() => {
    socket = io("http://127.0.0.1:8080");

    socket.on("connect", async () => {
      console.log("Connected to signaling server");
      await initConnectionWithServer(socket);
      await getAvailableProducers(socket);
    });

    socket.on("new-producer", async ({ producerId }) => {
      console.log("New producer:", producerId);
      setTimeout(() => {
        console.log("New producer:", producerId, producer);
        // If the producerId is different from the current producer, create a client receiver
        if (producerId != producer.id) {
          createClientReceiver(socket, producerId);
        }
      }, 2000);

      socket.on("node-removed", ({ socketMap }) => {
        console.log("Node removed:", socketMap);
        // Remove the participant from the state
        setParticipants((prevParticipants) =>
          prevParticipants.filter(
            (participant) => participant.id !== socketMap.producerId
          )
        );
      });
    });
  }, []);

  return (
    <div>
      <button
        type="button"
        className="mx-5 px-5 py-2.5 bg-gray-300 text-gray-800 rounded text-base hover:bg-gray-400 focus:outline-none"
        onClick={() => startStreaming()}
      >
        Start Streaming
      </button>
      <button
        type="button"
        className="mx-5 px-5 py-2.5 bg-gray-300 text-gray-800 rounded text-base hover:bg-gray-400 focus:outline-none"
        onClick={() => createClientReceiver(socket as Socket, "")}
      >
        Start watching
      </button>
      {isProducer && (
        <video
          className="mx-5"
          width="40%"
          ref={localVideoRef}
          autoPlay
          muted
        />
      )}
      {participants.map((participant) => (
        <div
          key={participant.id}
          style={{ border: "1px solid gray", padding: "10px" }}
        >
          <h3>Remote streamer{participant.id}</h3>
          <video
            ref={(node) => {
              if (node) {
                remoteVideoRefs.current.set(participant.id, node);
                // Only assign srcObject if the stream is available and different
                if (
                  participant.stream &&
                  node.srcObject !== participant.stream
                ) {
                  node.srcObject = participant.stream;
                  node.play().catch((error) => {
                    console.error(
                      `Error playing video for ${participant.id}:`,
                      error
                    );
                  });
                }
              } else {
                // Clean up ref when component unmounts or stream is removed
                remoteVideoRefs.current.delete(participant.id);
              }
            }}
            autoPlay
            playsInline
            muted
            width="40%"
          />
        </div>
      ))}
    </div>
  );
};

export default Room;

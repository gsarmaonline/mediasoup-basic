import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { StreamRtc } from "./streamrtc";
import { types as mediasoupTypes } from "mediasoup";

let io: Server;

type SocketMap = {
  producers: { [id: string]: mediasoupTypes.Producer };
  consumers: { [id: string]: mediasoupTypes.Consumer };
  sendTransports: { [id: string]: mediasoupTypes.WebRtcTransport };
  recvTransports: { [id: string]: mediasoupTypes.WebRtcTransport };
};

type SocketStore = {
  sockets: { [id: string]: SocketMap };
};

export class StreamWs {
  constructor(appServer: HttpServer) {
    io = new Server(appServer, {
      cors: {
        origin: "http://localhost:3000", // Replace with your Next.js client's origin
        methods: ["GET", "POST"], // Allow necessary HTTP methods
        credentials: true, // Allow sending cookies, if needed
      },
    });
    const rtc = new StreamRtc();

    let sendTransports: { [id: string]: mediasoupTypes.WebRtcTransport } = {};
    let recvTransports: { [id: string]: mediasoupTypes.WebRtcTransport } = {};
    let producers: { [id: string]: mediasoupTypes.Producer } = {};
    let consumers: { [id: string]: mediasoupTypes.Consumer } = {};

    let socketStore: SocketStore = {
      sockets: {},
    };

    console.log("WebSocket server initialized");

    const registerNewProducer = (producer: mediasoupTypes.Producer) => {
      console.log("New producer registered", producer.id);
      // Notify all clients about the new producer
      io.emit("new-producer", {
        producerId: producer.id,
        kind: producer.kind,
      });
    };

    const removeNode = (socketId: string) => {
      console.log("All objects removed for socket", socketId);
      // Notify all clients about the removed producer
      const socketMap: SocketMap = socketStore.sockets[socketId];
      io.emit("node-removed", {
        socketMap: socketMap,
      });
      for (const producerId in socketMap.producers) {
        delete producers[producerId];
      }
      for (const consumerId in socketMap.consumers) {
        delete consumers[consumerId];
      }
      // Delete the socket entry from the hash
      delete socketStore.sockets[socketId];
    };

    io.on("connection", (socket: Socket) => {
      console.log("New client connected", socket.id);
      socketStore.sockets[socket.id] = {
        producers: {},
        consumers: {},
        sendTransports: {},
        recvTransports: {},
      };

      socket.on("disconnect", () => {
        console.log("Client disconnected", socket.id);
        removeNode(socket.id);
      });

      socket.on("getRouterRtpCapabilities", (callback) => {
        const capabilities = rtc.router.rtpCapabilities;
        console.log("Sending getRouterRtpCapabilities");
        callback(capabilities);
      });

      socket.on("getAvailableProducers", async (callback) => {
        const availableProducers = Object.keys(producers).map((id) => ({
          id: producers[id].id,
          kind: producers[id].kind,
        }));
        console.log("Available producers:", availableProducers);
        callback(availableProducers);
      });

      socket.on("createWebRtcTransport", async (data, callback) => {
        console.log("Received createWebRtcTransport", data, callback);
        const transport: mediasoupTypes.WebRtcTransport =
          await rtc.createWebRtcTransport();

        if (data.sender == true) {
          console.log("Creating send transport");
          sendTransports[transport.id] = transport;
          socketStore.sockets[socket.id].sendTransports[transport.id] =
            transport;
        } else {
          console.log("Creating recv transport");
          recvTransports[data.producerId] = transport;
          socketStore.sockets[socket.id].recvTransports[transport.id] =
            transport;
        }
        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });
      });

      socket.on(
        "transport-connect",
        async ({ dtlsParameters, transportId }) => {
          console.log("Received transport-connect");
          await sendTransports[transportId].connect({ dtlsParameters });
        }
      );

      socket.on(
        "transport-produce",
        async ({ kind, rtpParameters, appData, transportId }, callback) => {
          console.log("Received transport-produce");
          const producer: mediasoupTypes.Producer = await sendTransports[
            transportId
          ].produce({
            kind,
            rtpParameters,
          });

          producers[producer.id] = producer;
          socketStore.sockets[socket.id].producers[producer.id] = producer;

          console.log("Producer ID: ", producer.id, producer.kind);

          producer.on("transportclose", () => {
            console.log("transport for this producer closed ");
            producer.close();
          });

          // Send back to the client the Producer's id
          callback({
            id: producer.id,
          });
          registerNewProducer(producer);
        }
      );

      socket.on(
        "transport-recv-connect",
        async ({ dtlsParameters, producerId }) => {
          console.log(`transport-recv-connect DTLS PARAMS: ${dtlsParameters}`);
          if (recvTransports[producerId] !== undefined) {
            console.log(
              "dtls",
              recvTransports[producerId].dtlsState,
              producers[producerId]
            );
          }
          await recvTransports[producerId].connect({ dtlsParameters });
        }
      );

      socket.on(
        "consume",
        async ({ rtpCapabilities, producerId, transportId }, callback) => {
          try {
            console.log("Received consume request", producerId);

            // check if the router can consume the specified producer
            if (
              rtc.router.canConsume({
                producerId: producerId,
                rtpCapabilities,
              })
            ) {
              // transport can now consume and return a consumer
              const consumer: mediasoupTypes.Consumer = await recvTransports[
                producerId
              ].consume({
                producerId: producerId,
                rtpCapabilities,
                paused: true,
              });
              consumers[consumer.id] = consumer;
              socketStore.sockets[socket.id].consumers[consumer.id] = consumer;

              consumer.on("transportclose", () => {
                console.log("transport close from consumer");
              });

              consumer.on("producerclose", () => {
                console.log("producer of consumer closed");
              });

              // from the consumer extract the following params
              // to send back to the Client
              const params = {
                id: consumer.id,
                producerId: producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
              };
              console.log("Consumer params:", params);

              // send the parameters to the client
              callback({ params });
            }
          } catch (error: any) {
            console.log(error);
            callback({
              params: {
                error: error,
              },
            });
          }
        }
      );

      socket.on(
        "consumer-resume",
        async ({ consumerId }: { consumerId: string }) => {
          console.log("consumer-resume");
          await consumers[consumerId].resume();
        }
      );

      // Additional event handlers can be added here
    });
  }

  getSocketIO() {
    return io;
  }
}

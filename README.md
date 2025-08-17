# Mediasoup as a SFU

Supports multiple producers and consumers

## Installation

Running the server

```bash
cd server
export DEBUG="mediasoup:*" # to enable debug mode
npm start
```

Running the client

```bash
cd client
npm run dev
```

## Flow

```bash

// Initialisation
client -> connect websocket -> server
client -> getRtpCapabilities -> server
client -> createDevice
client -> initiate mediastream and reference the stream in the video tag

// Sending data from client to server
client -> createWebRtcTransport -> server
server -> createSendTransport
client -> createSendTransport
client -> sendTransport.produce
client -> transport-connect -> server
client -> transport-produce -> server
server -> sendTransport.connect
server -> sendTransport.produce

// Receiving data from server to client
client -> createWebRtcTransport -> server
server -> createRecvTransport
client -> createRecvTransport
client -> consume -> server
server -> recvTransport.consume
client -> recvTransport.consume
client -> transport-recv-connect -> server
server -> recvTransport.connect
client -> consumer-resume -> server
server -> consumer.resume

```

### Supporting Multiple producers

To support multiple producers, each client should be able to support multiple remote streams to receive data.
Each client keeps a list of `recvTransport`s and `consumers` hashed by the producer ID locally.
This list is updated based on the intimation by the server.
The server sends `new-producer` with the producer's ID to the client when a new producer joins the room.
The server sends `delete-producer` with the producer's ID to the client when the producer leaves the room.

The server keeps a list of `sendTransport`, `recvTransport`, `producer`s and `consumer`s.
When a new producer joins the room, the server has to add the new producer to the list.

## References

- [Understand high level overview of mediasoup comms](https://www.youtube.com/watch?v=_z1cjyAxcnc&t=115s)
- [Basic code of loopback](https://www.youtube.com/watch?v=DOe7GkQgwPo)
- https://mediasoup.org/documentation/v3/communication-between-client-and-server/

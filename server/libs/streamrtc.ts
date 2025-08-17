import type { types } from "mediasoup";
const mediasoup = require("mediasoup"); //

let worker: types.Worker;
let rtpParameters: types.RtpParameters;

const mediaCodecs: types.RouterOptions["mediaCodecs"] = [
  {
    kind: "video",
    mimeType: "video/vp8",
    preferredPayloadType: 100, // Example payload type
    clockRate: 90000,
    parameters: {},
    rtcpFeedback: [
      { type: "nack" },
      { type: "nack", parameter: "pli" },
      { type: "ccm", parameter: "fir" },
      { type: "goog-remb" },
    ],
  },
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];

export class StreamRtc {
  public worker!: types.Worker;
  public router!: types.Router;
  public server!: types.WebRtcServer;

  constructor() {
    // Async initialization must be done outside the constructor
    this.init();
    this.setupEventListeners();
  }

  private async init() {
    this.worker = await this.createWorker();
    this.router = await this.createRouter();
  }

  setupEventListeners = () => {
    mediasoup.setLogEventListeners({
      ondebug: undefined,
      onwarn: (namespace: string, log: string) => {
        console.log(`${namespace} ${log}`);
      },
      onerror: (namespace: string, log: string, error: Error | undefined) => {
        if (error) {
          console.error(`${namespace} ${log}: ${error}`);
        } else {
          console.error(`${namespace} ${log}`);
        }
      },
    });
  };

  createWorker = async () => {
    mediasoup.observer.on("newworker", (worker: types.Worker) => {
      console.log("new worker created [pid:%d]", worker.pid, worker.appData);
    });
    const worker = await mediasoup.createWorker({
      logLevel: "debug", // Set the general log level to debug
      //logTags: ["ice", "dtls"],
      appData: { foo: 123 },
      //dtlsCertificateFile: "./keys/cert.pem",
      //dtlsPrivateKeyFile: "./keys/key.pem",
    });
    return worker;
  };

  createRouter = async () => {
    this.worker.observer.on("newrouter", (router) => {
      console.log("new router created [id:%s]", router.id);
    });
    const router = await this.worker.createRouter({ mediaCodecs });
    return router;
  };

  createWebRtcTransport = async () => {
    const transport_options: types.WebRtcTransportOptions = {
      listenIps: [
        {
          ip: "127.0.0.1", // replace with relevant IP address
          //announcedIp: "127.0.0.1",
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    };
    const transport = await this.router.createWebRtcTransport(
      transport_options
    );
    transport.on("dtlsstatechange", (dtlsState) => {
      console.log(`DTLS state changed: ${dtlsState}`);
    });
    return transport;
  };
}

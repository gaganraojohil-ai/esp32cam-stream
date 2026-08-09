const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let camera = null;
const viewers = new Set();


// =====================================================
// CCTV WEBPAGE
// =====================================================

app.get("/", (req, res) => {

    res.send(`
<!DOCTYPE html>
<html>

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1">

    <title>Gagan❤️(nivyy) CCTV</title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #000;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        }

        h1 {
            margin: 18px 0;
            font-size: 25px;
        }

        #camera {
            width: 100%;
            max-width: 640px;
            height: auto;
            display: block;
            margin: auto;
        }

        .controls {
            margin-top: 20px;
        }

        button {
            font-size: 17px;
            padding: 12px 22px;
            margin: 6px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
        }

        #status {
            margin-top: 10px;
            color: #aaa;
            font-size: 14px;
        }

    </style>

</head>


<body>

    <h1>Gagan❤️(nivyy) CCTV</h1>

    <img id="camera">

    <div class="controls">

        <button onclick="ledOn()">
            🔆 LED ON
        </button>

        <button onclick="ledOff()">
            💡 LED OFF
        </button>

    </div>

    <div id="status">
        Connecting...
    </div>


<script>

const img = document.getElementById("camera");
const status = document.getElementById("status");

let ws;


// =====================================================
// CONNECT
// =====================================================

function connect() {

    ws = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://")
        + location.host
        + "/viewer"
    );

    ws.binaryType = "blob";


    ws.onopen = function() {

        status.innerText = "🟢 LIVE";

    };


    ws.onmessage = function(event) {

        if (typeof event.data === "string") {
            return;
        }

        const url = URL.createObjectURL(event.data);

        const old = img.src;

        img.src = url;

        if (old.startsWith("blob:")) {
            URL.revokeObjectURL(old);
        }

    };


    ws.onclose = function() {

        status.innerText =
            "🔴 Disconnected - reconnecting...";

        setTimeout(connect, 2000);

    };


    ws.onerror = function() {

        status.innerText =
            "⚠️ Connection error";

    };

}


connect();


// =====================================================
// LED
// =====================================================

function ledOn() {

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {

        ws.send("LED_ON");

    }

}


function ledOff() {

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {

        ws.send("LED_OFF");

    }

}

</script>

</body>
</html>
    `);

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/healthz", (req, res) => {

    res.status(200).send("OK");

});


// =====================================================
// WEBSOCKET
// =====================================================

wss.on("connection", (ws, req) => {


    // =================================================
    // ESP32-CAM
    // =================================================

    if (req.url === "/camera") {

        camera = ws;

        console.log("📷 ESP32-CAM connected");


        ws.on("message", (data, isBinary) => {

            // Camera frame
            if (isBinary) {

                for (const viewer of viewers) {

                    if (
                        viewer.readyState === WebSocket.OPEN
                    ) {

                        viewer.send(data);

                    }

                }

            }

        });


        ws.on("close", () => {

            if (camera === ws) {

                camera = null;

                console.log(
                    "📷 ESP32-CAM disconnected"
                );

            }

        });

    }


    // =================================================
    // PHONE VIEWER
    // =================================================

    else if (req.url === "/viewer") {

        viewers.add(ws);

        console.log(
            "📱 Viewer connected"
        );

        console.log(
            "Number of viewers:",
            viewers.size
        );


        // First viewer starts camera
        if (
            viewers.size === 1 &&
            camera &&
            camera.readyState === WebSocket.OPEN
        ) {

            camera.send("START_STREAM");

            console.log(
                "🎥 START_STREAM sent"
            );

        }


        // -------------------------------------------------
        // PHONE COMMANDS
        // -------------------------------------------------

        ws.on("message", (message) => {

            const command =
                message.toString();


            if (
                camera &&
                camera.readyState === WebSocket.OPEN
            ) {

                if (
                    command === "LED_ON" ||
                    command === "LED_OFF"
                ) {

                    camera.send(command);

                    console.log(
                        "Command sent:",
                        command
                    );

                }

            }

        });


        // -------------------------------------------------
        // VIEWER CLOSED
        // -------------------------------------------------

        ws.on("close", () => {

            viewers.delete(ws);

            console.log(
                "📱 Viewer disconnected"
            );

            console.log(
                "Number of viewers:",
                viewers.size
            );


            // No viewers = stop camera
            if (
                viewers.size === 0 &&
                camera &&
                camera.readyState === WebSocket.OPEN
            ) {

                camera.send("STOP_STREAM");

                console.log(
                    "🛑 STOP_STREAM sent"
                );

            }

        });

    }

});


// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        "Gagan❤️(nivyy) CCTV server running on port "
        + PORT
    );

});

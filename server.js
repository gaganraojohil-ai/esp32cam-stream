const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let camera = null;
let viewer = null;

// Phone viewing page
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ESP32-CAM Live</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
        body {
            margin: 0;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        img {
            width: 100%;
            max-width: 640px;
            height: auto;
        }
    </style>
</head>

<body>

<img id="camera">

<script>

const img = document.getElementById("camera");

const ws = new WebSocket(
    (location.protocol === "https:" ? "wss://" : "ws://")
    + location.host
    + "/viewer"
);

ws.binaryType = "blob";

ws.onmessage = function(event) {

    const url = URL.createObjectURL(event.data);

    const old = img.src;

    img.src = url;

    if (old.startsWith("blob:")) {
        URL.revokeObjectURL(old);
    }
};

</script>

</body>
</html>
    `);
});


// WebSocket connections
wss.on("connection", (ws, req) => {

    // ESP32-CAM connection
    if (req.url === "/camera") {

        camera = ws;

        console.log("ESP32-CAM connected");

        ws.on("message", (data) => {

            if (viewer && viewer.readyState === WebSocket.OPEN) {
                viewer.send(data);
            }

        });

        ws.on("close", () => {

            if (camera === ws) {
                camera = null;
                console.log("ESP32-CAM disconnected");
            }

        });

    }


    // Phone connection
    else if (req.url === "/viewer") {

        viewer = ws;

        console.log("Viewer connected");

        ws.on("close", () => {

            if (viewer === ws) {
                viewer = null;
                console.log("Viewer disconnected");
            }

        });

    }

});


const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

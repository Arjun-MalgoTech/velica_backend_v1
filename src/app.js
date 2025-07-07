import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import connectDB from "./db/connect.js";
import routes from "./routes/index.js";
import fileUpload from "express-fileupload";
import { socketListen } from "./config/socket.js"; 
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);


socketListen(server);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
// app.use(fileUpload());
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}));
app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.send("Welcome to the Velica API server!");
});

const PORT = process.env.BACKEND_PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

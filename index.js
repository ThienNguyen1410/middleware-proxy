import express from "express";
import fs from "fs";
import axios from "axios";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

// Create Express Server
const app = express();

// Configuration
const PORT = 3000;
const HOST = "192.168.2.115";
const API_SERVICE_URL = "https://apicdn.vimai.io";

function writeToken(jsonData) {
  fs.writeFile("token.json", JSON.stringify(jsonData), function (err) {
    if (err) {
      console.log(err);
    }
  });
}

function writeProfile(jsonData) {
  fs.writeFile("profile.json", JSON.stringify(jsonData), function (err) {
    if (err) {
      console.log(err);
    }
  });
}

function readProfile() {
  const rawData = fs.readFileSync("profile.json");
  const profile = JSON.parse(rawData);
  return profile;
}

function readToken() {
  const rawData = fs.readFileSync("token.json");
  const token = JSON.parse(rawData);
  return token;
}

function getToken() {
  return axios
    .post(HOST, {
      username: "0359512974",
      password: "12345678",
    })
    .then((res) => {
      var token = {
        access_token: res.data.access_token,
        expiry: res.data.expiry,
        refresh_token: res.data.refresh_token,
      };
      writeToken(token);
    })
    .catch((err) => console.log(err));
}

function isTokenValid(expiry) {
  const now = Date.now() / 1000;
  return expiry > Math.floor(now);
}

// Logging
app.use(morgan("dev"));

// Proxy endpoints
app.use("/tenants/sctv/accounts/profile", (req, res, next) => {
  const profile = readProfile();
  if (profile != null) {
    res.body = JSON.stringify(profile);
  } else {
    writeProfile(JSON.stringify(res.body));
  }
  res.end();
});

app.use(
  "",
  createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: function (path, req) {
      let accessToken = "";
      const token = readToken();
      if (isTokenValid(token.expiry)) {
        accessToken = token.access_token;
        console.log("Token still valid");
      } else {
        console.log("Token expired, gen new token ");
        getToken();
      }
      req.headers["authorization"] = accessToken;
      req.headers["host"] = "apicdn.vimai.io";
      req.headers["x-trace-account-id"] =
        "369efaf7-e914-4c92-b210-6b25487055d1";
    },
  })
);

// Start Proxy
app.listen(PORT, HOST, () => {
  console.log(`Starting Proxy at http://${HOST}:${PORT}`);
});

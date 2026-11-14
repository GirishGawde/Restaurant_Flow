/**
 * src/main.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Vite entry point mounting the root React application into index.html.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

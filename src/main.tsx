import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import TrashMap from "./TrashMap";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrashMap />
  </React.StrictMode>
);
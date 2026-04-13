import React from "react";
import ReactDOM from "react-dom/client";
import TrashMap from "./TrashMap";
import "leaflet/dist/leaflet.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrashMap />
  </React.StrictMode>
);
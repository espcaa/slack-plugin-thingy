import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";

function mount() {
  if (document.getElementById("slackmod-react-root")) return;

  const div = document.createElement("div");
  div.id = "slackmod-react-root";

  document.body.appendChild(div);

  const root = ReactDOM.createRoot(div);
  root.render(<App />);
}

mount();

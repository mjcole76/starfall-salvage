import "./style.css";
import { Game } from "./game/Game";

const root = document.getElementById("app");
if (!root) throw new Error("#app missing");

const game = new Game(root);
game.start();

// Dismiss loading screen
const loadingScreen = document.getElementById("loading-screen");
if (loadingScreen) {
  loadingScreen.style.opacity = "0";
  setTimeout(() => loadingScreen.remove(), 500);
}

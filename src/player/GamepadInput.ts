/**
 * GamepadInput — reads from the Gamepad API and injects synthetic key states
 * into the existing keyboard-driven PlayerController.
 *
 * Left stick = movement (WASD), A button = jump (Space), B = dash (Q),
 * X = scanner (E), Y = decoy (F), RB = boost (Shift).
 *
 * Also provides a virtual joystick overlay for mobile touch devices.
 */

export class GamepadInput {
  private keys = new Set<string>();
  private prevButtons = new Map<number, boolean>();

  // Virtual joystick state (touch)
  private touchActive = false;
  private touchId: number | null = null;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchDx = 0;
  private touchDy = 0;
  private joystickEl: HTMLDivElement | null = null;
  private knobEl: HTMLDivElement | null = null;
  private jumpBtnEl: HTMLButtonElement | null = null;

  constructor(container: HTMLElement) {
    // Set up touch controls if on a touch device
    if ("ontouchstart" in window) {
      this.setupTouchControls(container);
    }
  }

  /** Call every frame. Returns synthetic key set to merge with keyboard keys. */
  poll(): Set<string> {
    this.keys.clear();

    // --- Gamepad API ---
    const gamepads = navigator.getGamepads?.() ?? [];
    for (const gp of gamepads) {
      if (!gp) continue;
      this.readGamepad(gp);
      break; // use first connected gamepad
    }

    // --- Touch joystick ---
    if (this.touchActive) {
      const deadzone = 15;
      if (this.touchDy < -deadzone) this.keys.add("KeyW");
      if (this.touchDy > deadzone) this.keys.add("KeyS");
      if (this.touchDx < -deadzone) this.keys.add("KeyA");
      if (this.touchDx > deadzone) this.keys.add("KeyD");
    }

    return this.keys;
  }

  private readGamepad(gp: Gamepad): void {
    const deadzone = 0.25;

    // Left stick
    const lx = gp.axes[0] ?? 0;
    const ly = gp.axes[1] ?? 0;
    if (ly < -deadzone) this.keys.add("KeyW");
    if (ly > deadzone) this.keys.add("KeyS");
    if (lx < -deadzone) this.keys.add("KeyA");
    if (lx > deadzone) this.keys.add("KeyD");

    // A button (0) = Space (jump/jet)
    if (gp.buttons[0]?.pressed) this.keys.add("Space");
    // B button (1) = Q (dash)
    if (gp.buttons[1]?.pressed) this.keys.add("KeyQ");
    // X button (2) = E (scanner)
    if (gp.buttons[2]?.pressed) this.keys.add("KeyE");
    // Y button (3) = F (decoy)
    if (gp.buttons[3]?.pressed) this.keys.add("KeyF");
    // RB (5) = Shift (boost)
    if (gp.buttons[5]?.pressed) {
      this.keys.add("ShiftLeft");
    }
    // Start (9) = Escape
    if (gp.buttons[9]?.pressed) this.keys.add("Escape");
  }

  private setupTouchControls(container: HTMLElement): void {
    // Virtual joystick
    this.joystickEl = document.createElement("div");
    Object.assign(this.joystickEl.style, {
      position: "fixed",
      left: "30px",
      bottom: "30px",
      width: "120px",
      height: "120px",
      borderRadius: "50%",
      border: "2px solid rgba(74,216,160,0.3)",
      background: "rgba(8,6,5,0.4)",
      zIndex: "200",
      touchAction: "none",
    });

    this.knobEl = document.createElement("div");
    Object.assign(this.knobEl.style, {
      position: "absolute",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: "rgba(74,216,160,0.5)",
      top: "40px",
      left: "40px",
      transition: "none",
    });
    this.joystickEl.appendChild(this.knobEl);
    container.appendChild(this.joystickEl);

    // Jump button
    this.jumpBtnEl = document.createElement("button");
    this.jumpBtnEl.textContent = "JET";
    Object.assign(this.jumpBtnEl.style, {
      position: "fixed",
      right: "30px",
      bottom: "50px",
      width: "70px",
      height: "70px",
      borderRadius: "50%",
      border: "2px solid rgba(74,216,160,0.4)",
      background: "rgba(8,6,5,0.5)",
      color: "#4ad8a0",
      fontSize: "12px",
      fontWeight: "700",
      zIndex: "200",
      touchAction: "none",
    });
    container.appendChild(this.jumpBtnEl);

    // Touch events for joystick
    this.joystickEl.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.touchActive = true;
      this.touchId = touch.identifier;
      const rect = this.joystickEl!.getBoundingClientRect();
      this.touchStartX = rect.left + rect.width / 2;
      this.touchStartY = rect.top + rect.height / 2;
      this.touchDx = 0;
      this.touchDy = 0;
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (!this.touchActive) return;
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === this.touchId) {
          this.touchDx = touch.clientX - this.touchStartX;
          this.touchDy = touch.clientY - this.touchStartY;
          // Clamp
          const max = 50;
          const dist = Math.hypot(this.touchDx, this.touchDy);
          if (dist > max) {
            this.touchDx = (this.touchDx / dist) * max;
            this.touchDy = (this.touchDy / dist) * max;
          }
          // Move knob visual
          if (this.knobEl) {
            this.knobEl.style.left = `${40 + this.touchDx}px`;
            this.knobEl.style.top = `${40 + this.touchDy}px`;
          }
        }
      }
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === this.touchId) {
          this.touchActive = false;
          this.touchId = null;
          this.touchDx = 0;
          this.touchDy = 0;
          if (this.knobEl) {
            this.knobEl.style.left = "40px";
            this.knobEl.style.top = "40px";
          }
        }
      }
    }, { passive: true });

    // Jump button touch
    this.jumpBtnEl.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.keys.add("Space");
    }, { passive: false });
    this.jumpBtnEl.addEventListener("touchend", () => {
      this.keys.delete("Space");
    }, { passive: true });
  }

  dispose(): void {
    this.joystickEl?.remove();
    this.jumpBtnEl?.remove();
  }
}

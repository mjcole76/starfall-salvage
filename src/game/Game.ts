import * as THREE from "three";
import { AngledTopDownCamera } from "../camera/AngledTopDownCamera";
import { GameSfx } from "../audio/GameSfx";
import { MissionAmbience } from "../audio/MissionAmbience";
import { VoiceBarks } from "../audio/VoiceBarks";
import {
  collectedCoreCount,
  createEnergyCores,
  tickEnergyCoreIdle,
  totalCoreCount,
  tryCollectEnergyCores,
  type EnergyCorePickup,
} from "../mission/energyCores";
import { ExtractionZone } from "../mission/extractionZone";
import {
  createStormWallVisual,
  safeZoneRadius,
  stormEdgeVisibilityStress,
  stormWallDamagePerSec,
  type StormWallVisual,
} from "../mission/expandingStorm";
import {
  createFuelPickups,
  tickFuelIdle,
  tryCollectFuel,
  type FuelCanPickup,
} from "../mission/fuelPickups";
import {
  mergeHazardTuning,
  type HazardTuning,
} from "../mission/hazardConfig";
import {
  createHazardZones,
  disposeHazardZones,
  driftHazardZones,
  sampleHazardEffects,
  type HazardZone,
} from "../mission/hazardZones";
import {
  getMissionConfig,
  MISSION_CONFIGS,
  type MissionConfig,
} from "../mission/missionVariants";
import type { MissionOutcome } from "../mission/missionTypes";
import { PatrolDroneSystem } from "../mission/patrolDrones";
import {
  createRepairPickups,
  tickRepairIdle,
  tryCollectRepair,
  type RepairKitPickup,
} from "../mission/repairPickups";
import {
  createSalvagePickups,
  salvageCollectedCount,
  salvageTotalCount,
  tickSalvageIdle,
  tryCollectSalvage,
  type SalvagePickup,
} from "../mission/salvagePickups";
import { sampleTerrainY } from "../mission/terrainSample";
import { generateProceduralMission } from "../mission/proceduralMission";
import { capsuleHalfHeight, PlayerController } from "../player/PlayerController";
import { DashAbility } from "../player/DashAbility";
import { MissionHud } from "../ui/MissionHud";
import { TitleScreen } from "../ui/TitleScreen";
import { TutorialOverlay } from "../ui/TutorialOverlay";
import { StatsScreen, type MissionStats, type DeathCause } from "../ui/StatsScreen";
import { ScreenTransition } from "../ui/ScreenTransition";
import { Minimap, type MinimapMarker } from "../ui/Minimap";
import { Leaderboard } from "../ui/Leaderboard";
import { UpgradeShop } from "../ui/UpgradeShop";
import { PostFX } from "../postprocessing/PostFX";
import { ParticleManager } from "../particles/ParticleManager";
import { ProceduralMusic } from "../audio/ProceduralMusic";
import { ComboSystem } from "../game/ComboSystem";
import { SettingsMenu, type GameSettings } from "../ui/SettingsMenu";
import { KeyboardHelp } from "../ui/KeyboardHelp";
import { SpeedRunTimer } from "../ui/SpeedRunTimer";
import { FpsCounter } from "../ui/FpsCounter";
import { SandstormOverlay } from "../effects/SandstormOverlay";
import { DashAfterimage } from "../effects/DashAfterimage";
import { DamageVignette } from "../effects/DamageVignette";
import { createDesertEnvironment } from "../world/desertEnvironment";
import { createTerrain } from "../world/Terrain";
import {
  createDustStormState,
  tickDustStorm,
  getDustStormLine,
  DustStormVisual,
  type DustStormState,
} from "../mission/dustStorm";
import {
  createShelters,
  disposeShelters,
  isInShelter,
  type Shelter,
} from "../mission/shelters";
import {
  createShieldPickups,
  tickShieldIdle,
  tryCollectShield,
  disposeShieldPickups,
  type ShieldPickupItem,
} from "../player/ShieldPickup";
import { ScannerPulse } from "../player/ScannerPulse";
import { DecoyBeacon } from "../player/DecoyBeacon";
import { ShelterIndicator } from "../ui/ShelterIndicator";
import { DataLogs } from "../ui/DataLogs";
import { LightningFlash, HeatShimmer, TumbleweedSystem } from "../effects/WeatherEffects";
import { DeathReplay } from "../effects/DeathReplay";
import { MutatorPanel } from "../ui/MutatorPanel";
import {
  loadMutators,
  getMutatorScoreMultiplier,
  isMutatorActive,
  type ActiveMutators,
} from "../mission/mutators";
import { getDailySeed, getDailyLabel } from "../mission/dailyChallenge";
import { GamepadInput } from "../player/GamepadInput";
import { ObjectiveGuide } from "../ui/ObjectiveGuide";
import { FloatingText } from "../ui/FloatingText";
import { OnlineLeaderboard } from "../ui/OnlineLeaderboard";
import { NamePrompt } from "../ui/NamePrompt";

const ENDGAME_MUSIC_LAST_SEC = 30;
const STORM_WARN_REMAINING_SEC = 60;

const ATMOSPHERE_COLOR = 0x4a4a5c;
const FOG_NEAR = 38;
const FOG_FAR = 172;
const FOG_MIN_SPAN = 55;
const USE_DISTANCE_FOG = false;
const BASE_MAX_INTEGRITY = 100;

export class Game {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private player!: PlayerController;
  private dash!: DashAbility;
  private cameraRig!: AngledTopDownCamera;
  private terrain!: THREE.Mesh;
  private clock = new THREE.Clock();
  private hud!: MissionHud;
  private cores: EnergyCorePickup[] = [];
  private salvage: SalvagePickup[] = [];
  private fuelCans: FuelCanPickup[] = [];
  private repairKits: RepairKitPickup[] = [];
  private extraction!: ExtractionZone;
  private hazards: HazardZone[] = [];
  private drones!: PatrolDroneSystem;
  private stormWall!: StormWallVisual;
  private variant!: MissionConfig;
  private variantIndex = 0;
  private stormTimeLimit = 240;
  private outcome: MissionOutcome = "playing";
  private missionElapsed = 0;
  private ambience = new MissionAmbience();
  private sfx!: GameSfx;
  private barks!: VoiceBarks;
  private integrity = BASE_MAX_INTEGRITY;
  private maxIntegrity = BASE_MAX_INTEGRITY;
  private extractionHold = 0;
  private extractionArmProgress = 0;
  private extractionPulseAcc = 0;
  private prevStormLeft = 240;
  private prevCoreCount = 0;
  private jetJamUntilElapsed = 0;
  private salvageScore = 0;
  private objectiveScore = 0;
  private hazardTuning!: HazardTuning;
  private baseFogNear = FOG_NEAR;
  private baseFogFar = FOG_FAR;
  private baseBgColor = new THREE.Color(ATMOSPHERE_COLOR);
  private stressColor = new THREE.Color(0x353045);

  // New systems
  private postfx!: PostFX;
  private particles!: ParticleManager;
  private minimap!: Minimap;
  private titleScreen!: TitleScreen;
  private tutorial!: TutorialOverlay;
  private statsScreen!: StatsScreen;
  private transition!: ScreenTransition;
  private leaderboard!: Leaderboard;
  private upgradeShop!: UpgradeShop;
  private gameStarted = false;
  private useProceduralMissions = false;
  private totalCurrency = 0;
  private integrityLowBarkFired = false;
  private fuelLowBarkFired = false;
  private music!: ProceduralMusic;
  private combo!: ComboSystem;
  private settingsMenu!: SettingsMenu;
  private keyboardHelp!: KeyboardHelp;
  private speedRunTimer!: SpeedRunTimer;
  private fpsCounter!: FpsCounter;
  private sandstorm!: SandstormOverlay;
  private dashAfterimage!: DashAfterimage;
  private damageVignette!: DamageVignette;
  private wasDashing = false;
  private dustStormState!: DustStormState;
  private dustStormVisual!: DustStormVisual;
  private shelters: Shelter[] = [];
  private shieldPickups: ShieldPickupItem[] = [];
  private hasShield = false;
  private scannerPulse!: ScannerPulse;
  private decoyBeacon!: DecoyBeacon;
  private shelterIndicator!: ShelterIndicator;
  private dataLogs!: DataLogs;
  private lightning!: LightningFlash;
  private heatShimmer!: HeatShimmer;
  private tumbleweeds!: TumbleweedSystem;
  private deathReplay!: DeathReplay;
  private mutatorPanel!: MutatorPanel;
  private activeMutators: ActiveMutators = new Set();
  private gamepadInput!: GamepadInput;
  private wasGrounded = true;
  private prevMoving = false;
  private objectiveGuide!: ObjectiveGuide;
  private floatingText!: FloatingText;
  private lastDeathCause: DeathCause = "unknown";
  private onlineLeaderboard!: OnlineLeaderboard;
  private namePrompt!: NamePrompt;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  start(): void {
    const w = Math.max(1, this.container.clientWidth || window.innerWidth || 640);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight || 480);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.85;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const sky = new THREE.Color(ATMOSPHERE_COLOR);
    this.scene.background = sky;
    this.renderer.setClearColor(sky, 1);
    this.scene.fog = USE_DISTANCE_FOG
      ? new THREE.Fog(ATMOSPHERE_COLOR, FOG_NEAR, FOG_FAR)
      : null;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.58));
    const hemi = new THREE.HemisphereLight(0xc8d4e0, 0x5c4034, 0.92);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe8c8, 2.15);
    sun.position.set(-42, 90, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 188;
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.00022;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);

    this.terrain = createTerrain();
    this.scene.add(this.terrain);
    createDesertEnvironment(this.scene, this.terrain);
    this.stormWall = createStormWallVisual(this.scene);

    this.player = new PlayerController();
    this.dash = new DashAbility();
    this.scene.add(this.player.root);

    this.hud = new MissionHud(this.container);
    this.spawnVariant(this.variantIndex);
    this.applyPlayerFromVariant();

    this.cameraRig = new AngledTopDownCamera(w, this.player.root);

    // Post-processing
    this.postfx = new PostFX(this.renderer, this.scene, this.cameraRig.camera);

    // Particles
    this.particles = new ParticleManager(this.scene);

    // Audio
    this.sfx = new GameSfx(() => this.ambience.getAudioContext());
    this.barks = new VoiceBarks(this.container, () => this.ambience.getAudioContext());

    // UI overlays
    this.titleScreen = new TitleScreen(this.container, () => this.onTitleDismiss());
    this.tutorial = new TutorialOverlay(this.container);
    this.statsScreen = new StatsScreen(this.container);
    this.transition = new ScreenTransition(this.container);
    this.minimap = new Minimap(this.container);
    this.leaderboard = new Leaderboard(this.container);
    this.upgradeShop = new UpgradeShop(this.container, () => this.onShopClose());

    // New systems
    this.music = new ProceduralMusic();
    this.combo = new ComboSystem(this.container);
    this.settingsMenu = new SettingsMenu(this.container, (s) => this.applySettings(s));
    this.keyboardHelp = new KeyboardHelp(this.container);
    this.speedRunTimer = new SpeedRunTimer(this.container);
    this.speedRunTimer.setVariant(`${this.variant.id} · ${this.variant.title}`);
    this.fpsCounter = new FpsCounter(this.container);
    this.sandstorm = new SandstormOverlay(this.container);
    this.dashAfterimage = new DashAfterimage(this.scene);
    this.damageVignette = new DamageVignette(this.container);
    this.dustStormState = createDustStormState();
    this.dustStormVisual = new DustStormVisual(this.scene);
    this.scannerPulse = new ScannerPulse(this.scene);
    this.decoyBeacon = new DecoyBeacon(this.scene);
    this.shelterIndicator = new ShelterIndicator(this.container);
    this.dataLogs = new DataLogs(this.container);
    this.lightning = new LightningFlash(this.container);
    this.heatShimmer = new HeatShimmer(this.container);
    this.tumbleweeds = new TumbleweedSystem(this.scene, this.terrain);
    this.deathReplay = new DeathReplay();
    this.mutatorPanel = new MutatorPanel(this.container, () => {
      this.activeMutators = this.mutatorPanel.getActive();
    });
    this.activeMutators = loadMutators();
    this.gamepadInput = new GamepadInput(this.container);
    this.objectiveGuide = new ObjectiveGuide(this.container);
    this.floatingText = new FloatingText(this.container);
    this.onlineLeaderboard = new OnlineLeaderboard(this.container);
    this.namePrompt = new NamePrompt(this.container);

    // Load saved currency
    const saved = UpgradeShop.loadState();
    this.totalCurrency = saved.currency;

    // Apply scanner upgrade to minimap
    const scannerMult = UpgradeShop.getMultiplier("scanner", saved.upgrades.scanner);
    this.minimap.setScale(120 * scannerMult);

    // Apply saved settings
    const settings = SettingsMenu.loadSettings();
    this.applySettings(settings);

    // Show title screen
    this.titleScreen.show();

    this.bindRestart();
    window.addEventListener("resize", () => this.onResize());
    this.onResize();
    requestAnimationFrame(() => this.onResize());

    const unlockAudio = () => {
      this.ambience.resume();
      this.sfx.startWindBed();
    };
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    this.container.addEventListener("pointerdown", unlockAudio, { passive: true });

    const tick = () => {
      requestAnimationFrame(tick);
      let dt = Math.min(this.clock.getDelta(), 0.05);

      // Death replay time scaling
      dt = this.deathReplay.update(dt);

      // Update voice barks text animation always
      this.barks.update(dt);

      // Poll gamepad / touch input
      const gpKeys = this.gamepadInput.poll();

      if (!this.gameStarted) {
        // Still render scene behind title screen
        this.cameraRig.update(dt);
        this.postfx.update(dt);
        this.postfx.render();
        return;
      }

      const locked = this.outcome !== "playing";
      const jetJammed = this.missionElapsed < this.jetJamUntilElapsed;

      // Merge gamepad keys into player keys
      const playerKeys = this.player.getKeys();
      for (const k of gpKeys) playerKeys.add(k);

      // Dash integration
      const dashVel = this.dash.update(
        dt,
        this.player.getWishDir(),
        this.player.getFacing(),
        playerKeys
      );

      const sig = this.player.update(dt, this.terrain, locked, jetJammed, dashVel);
      this.sfx.jetThrust(sig.jetThrusting, dt);
      if (sig.lowFuelWarn) this.sfx.lowFuelWarning();

      // Footstep and landing sounds
      const isGrounded = this.player.isGrounded();
      const vel = this.player.getVelocity();
      const hSpeed = Math.hypot(vel.x, vel.z);
      const isMoving = hSpeed > 1.5 && isGrounded;
      if (isGrounded && !this.wasGrounded) this.sfx.landingImpact();
      if (isMoving) this.sfx.footstep(dt, true);
      this.wasGrounded = isGrounded;

      // Fuel low bark
      if (this.player.getFuelRatio() <= 0.22 && !this.fuelLowBarkFired) {
        this.barks.play("fuelLow");
        this.fuelLowBarkFired = true;
      }
      if (this.player.getFuelRatio() > 0.32) this.fuelLowBarkFired = false;

      if (!locked) {
        this.missionElapsed += dt;

        const corePick = tryCollectEnergyCores(this.cores, this.player.root.position);
        if (corePick.picked > 0) {
          const mult = this.combo.pickup();
          const pts = corePick.scoreGain * mult;
          this.objectiveScore += pts;
          this.sfx.corePickup();
          this.particles.burstCore(this.player.root.position);
          this.postfx.shake(0.12, 0.2);
          this.barks.play("coreSecured");
          this.floatingText.spawnCenter(`CORE +${Math.round(pts)}`, "#00f0ff");
        }

        const salvageGain = tryCollectSalvage(this.salvage, this.player.root.position);
        if (salvageGain > 0) {
          const mult = this.combo.pickup();
          const pts = salvageGain * mult;
          this.salvageScore += pts;
          this.sfx.salvagePickup();
          this.particles.burstSalvage(this.player.root.position);
          this.postfx.shake(0.06, 0.12);
          this.floatingText.spawnCenter(`+${Math.round(pts)}`, "#e8b828");
        }

        const fuelAdd = tryCollectFuel(this.fuelCans, this.player.root.position);
        if (fuelAdd > 0) {
          this.combo.pickup();
          this.player.addFuel(fuelAdd);
          this.sfx.fuelCanPickup();
          this.particles.burstFuel(this.player.root.position);
          this.floatingText.spawnCenter(`+FUEL`, "#3c8cff");
        }

        const repairAdd = tryCollectRepair(this.repairKits, this.player.root.position);
        if (repairAdd > 0) {
          this.combo.pickup();
          this.integrity = Math.min(this.maxIntegrity, this.integrity + repairAdd);
          this.sfx.repairKitPickup();
          this.particles.burstRepair(this.player.root.position);
          this.floatingText.spawnCenter(`+REPAIR`, "#32dc58");
        }

        // Shield pickup
        if (tryCollectShield(this.shieldPickups, this.player.root.position)) {
          this.hasShield = true;
          this.sfx.shieldPickup();
          this.particles.burstCore(this.player.root.position);
          this.floatingText.spawnCenter("+SHIELD", "#4488ff");
        }

        // Scanner pulse (E key)
        if (playerKeys.has("KeyE")) {
          if (this.scannerPulse.activate(this.player.root.position)) {
            this.sfx.scannerPulse();
          }
        }
        this.scannerPulse.update(dt);

        // Decoy beacon (F key)
        if (playerKeys.has("KeyF")) {
          if (this.decoyBeacon.deploy(this.player.root.position, this.terrain)) {
            this.sfx.decoyDeploy();
          }
        }
        this.decoyBeacon.update(dt, this.missionElapsed);

        tickEnergyCoreIdle(this.cores, this.missionElapsed);
        tickSalvageIdle(this.salvage, this.missionElapsed);
        tickFuelIdle(this.fuelCans, this.missionElapsed);
        tickRepairIdle(this.repairKits, this.missionElapsed);
        tickShieldIdle(this.shieldPickups, this.missionElapsed);

        const n = collectedCoreCount(this.cores);
        const req = this.variant.requiredCoreCount;
        const extractionOn = n >= req;
        this.extraction.setActive(extractionOn);

        if (extractionOn && this.prevCoreCount < req) {
          this.sfx.extractionActivated();
          this.barks.play("allCoresCollected");
        }
        this.prevCoreCount = n;

        if (extractionOn) {
          this.extractionArmProgress = Math.min(
            1,
            this.extractionArmProgress + dt / Math.max(0.001, this.variant.extractionArmSec)
          );
        } else {
          this.extractionArmProgress = 0;
        }
        const extractionArmed = this.extractionArmProgress >= 1;

        if (extractionArmed && this.extractionArmProgress >= 1 && this.prevCoreCount >= req) {
          // Only bark once when armed
        }

        const droneTick = this.drones.update(
          this.terrain,
          this.missionElapsed,
          this.player.root.position,
          extractionOn ? this.variant.dronePathsAlert : this.variant.dronePathsPatrol,
          this.jetJamUntilElapsed,
          dt
        );
        this.jetJamUntilElapsed = droneTick.jetJamUntilElapsed;
        if (droneTick.jamStarted) {
          this.sfx.droneJam();
          this.barks.play("droneScan");
        }
        if (droneTick.inDroneScan) this.sfx.droneScanPing(dt);

        driftHazardZones(this.hazards, this.missionElapsed);
        const hz = sampleHazardEffects(
          this.player.root.position,
          this.hazards,
          this.missionElapsed,
          dt,
          this.hazardTuning
        );

        const [scx, scz] = this.variant.stormCenter;
        const safeR = safeZoneRadius(this.variant, this.missionElapsed);
        const cy = sampleTerrainY(this.terrain, scx, scz);
        this.stormWall.update(safeR, scx, scz, cy);

        const pressureMult =
          1 +
          (extractionOn ? 0.52 + this.variant.stormPressureExtra : 0) +
          (extractionArmed ? 0.18 : 0);
        const wallDps = stormWallDamagePerSec(
          this.player.root.position,
          scx, scz, safeR, pressureMult, this.hazardTuning
        );
        const edgeVis = stormEdgeVisibilityStress(
          this.player.root.position, scx, scz, safeR
        );
        const outsideWall =
          Math.hypot(
            this.player.root.position.x - scx,
            this.player.root.position.z - scz
          ) > safeR;
        this.hud.setOutsideStormWall(outsideWall);

        // Dust storm
        const playerSheltered = isInShelter(this.player.root.position, this.shelters);
        const dustTick = tickDustStorm(
          this.dustStormState,
          this.player.root.position,
          dt,
          this.dash.isInvulnerable,
          playerSheltered
        );
        if (dustTick.warnTriggered) {
          this.sfx.dustStormWarning();
          this.barks.play("dustStormWarning");
          this.postfx.shake(0.1, 0.3);
        }
        if (dustTick.playerInStorm) {
          if (this.hasShield && dustTick.integrityLoss > 0) {
            this.hasShield = false;
            dustTick.integrityLoss = 0;
            this.sfx.shieldAbsorb();
            this.postfx.shake(0.2, 0.3);
          } else {
            this.sfx.dustStormHit();
            this.postfx.shake(0.35, 0.2);
          }
        }
        this.dustStormVisual.update(this.dustStormState, dt, this.missionElapsed);

        // Apply damage (respect dash invulnerability)
        const totalLoss = this.dash.isInvulnerable
          ? 0
          : hz.integrityLoss + wallDps * dt + droneTick.integrityLoss + dustTick.integrityLoss;
        this.integrity = Math.max(0, this.integrity - totalLoss);

        // Track highest damage source for death cause
        if (totalLoss > 0) {
          const sources: [number, DeathCause][] = [
            [dustTick.integrityLoss, "dust_storm"],
            [wallDps * dt, "storm_wall"],
            [hz.heatPulse ? hz.integrityLoss : 0, "thermal_vent"],
            [hz.inRadiation ? hz.integrityLoss : 0, "radiation"],
            [droneTick.integrityLoss, "patrol_drone"],
          ];
          sources.sort((a, b) => b[0] - a[0]);
          if (sources[0][0] > 0) this.lastDeathCause = sources[0][1];
        }

        // Damage screen effects
        if (totalLoss > 0.5) {
          this.postfx.shake(Math.min(0.15, totalLoss * 0.02), 0.15);
        }

        if (hz.inRadiation) this.sfx.hazardRadiationTick(dt);
        if (hz.thermalVentWarning) this.sfx.thermalVentWarn(dt);
        if (hz.heatPulse) {
          this.sfx.heatPulse();
          this.postfx.shake(0.18, 0.25);
        }

        // Integrity low bark
        if (this.integrity <= 30 && !this.integrityLowBarkFired) {
          this.barks.play("integrityLow");
          this.integrityLowBarkFired = true;
        }

        const stormLeft = this.stormTimeLimit - this.missionElapsed;
        if (stormLeft <= STORM_WARN_REMAINING_SEC && this.prevStormLeft > STORM_WARN_REMAINING_SEC) {
          this.sfx.stormWarning();
          this.barks.play("stormClosing");
        }
        this.prevStormLeft = stormLeft;

        this.applyStormVisuals(stormLeft, edgeVis);
        this.hud.setStormRemaining(stormLeft);
        this.ambience.setEndgameUrgent(stormLeft <= ENDGAME_MUSIC_LAST_SEC);
        this.pulseThermalAndRadiationVisuals(hz.thermalVentWarning);

        const inExtract = extractionOn && this.extraction.containsPlayer(this.player.root.position);

        if (inExtract && extractionArmed) {
          this.extractionHold += dt;
          this.extractionPulseAcc += dt;
          if (this.extractionPulseAcc >= 0.85) {
            this.extractionPulseAcc = 0;
            this.sfx.extractionProgressPulse();
          }
        } else {
          this.extractionHold = 0;
          this.extractionPulseAcc = 0;
        }

        this.hud.setIntegrity(this.integrity);
        this.hud.setExtractionHold(
          this.extractionHold,
          this.variant.extractionHoldSec,
          extractionOn,
          extractionOn && !extractionArmed,
          this.extractionArmProgress
        );

        this.hud.setSalvage(
          salvageCollectedCount(this.salvage),
          salvageTotalCount(this.salvage),
          this.salvageScore
        );

        this.updateMissionOutcome(n, extractionArmed);
      } else {
        this.ambience.setEndgameUrgent(false);
        this.hud.setExtractionHold(0, this.variant.extractionHoldSec, false, false, 0);
      }

      // Post-processing damage intensity
      this.postfx.setDamageIntensity(1 - this.integrity / this.maxIntegrity);
      this.postfx.update(dt);

      // Apply screen shake to camera
      const so = this.postfx.shakeOffset;
      if (so.x !== 0 || so.y !== 0) {
        this.cameraRig.camera.position.x += so.x;
        this.cameraRig.camera.position.y += so.y;
      }

      this.cameraRig.update(dt);

      // Particles
      const [scx2, scz2] = this.variant.stormCenter;
      const safeR2 = safeZoneRadius(this.variant, this.missionElapsed);
      this.particles.update(
        dt,
        this.player.root.position,
        this.player.getVelocity(),
        this.player.isGrounded(),
        sig.jetThrusting,
        safeR2, scx2, scz2
      );

      this.hud.setFuel(this.player.getFuelRatio() * 100);
      this.hud.setCores(
        collectedCoreCount(this.cores),
        this.variant.requiredCoreCount,
        totalCoreCount(this.cores),
        this.objectiveScore
      );
      this.hud.setMissionElapsed(this.missionElapsed);

      // Minimap
      this.updateMinimap(dt);

      // Combo HUD update
      this.combo.update(dt);

      // Floating text
      this.floatingText.update(dt);

      // Music tension
      const stormT = 1 - THREE.MathUtils.clamp(
        (this.stormTimeLimit - this.missionElapsed) / this.stormTimeLimit, 0, 1
      );
      this.music.setTension(stormT);
      this.music.setUrgent(
        (this.stormTimeLimit - this.missionElapsed) <= ENDGAME_MUSIC_LAST_SEC
      );
      this.music.update(dt);

      // Sandstorm intensity based on storm edge proximity
      const [sscx, sscz] = this.variant.stormCenter;
      const ssR = safeZoneRadius(this.variant, this.missionElapsed);
      const pDist = Math.hypot(
        this.player.root.position.x - sscx,
        this.player.root.position.z - sscz
      );
      const stormProximity = THREE.MathUtils.clamp((pDist / Math.max(1, ssR)) - 0.5, 0, 1);
      const dustBoost = this.dustStormState.phase === "active" ? 0.5 : this.dustStormState.phase === "warning" ? 0.25 : 0;
      this.sandstorm.setIntensity(stormProximity * 0.6 + stormT * 0.4 + dustBoost);
      this.sandstorm.update(dt);

      // Damage vignette
      this.damageVignette.setIntegrity(this.integrity);
      this.damageVignette.update(dt);

      // Weather effects
      const isEndgameUrgent = (this.stormTimeLimit - this.missionElapsed) <= ENDGAME_MUSIC_LAST_SEC;
      this.lightning.update(dt, isEndgameUrgent);

      // Heat shimmer near thermal vents
      let nearHeat = 0;
      for (const hz of this.hazards) {
        if (hz.kind !== "heat") continue;
        const dx = this.player.root.position.x - hz.center.x;
        const dz = this.player.root.position.z - hz.center.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < hz.radius * 2) {
          nearHeat = Math.max(nearHeat, 1 - dist / (hz.radius * 2));
        }
      }
      this.heatShimmer.setIntensity(nearHeat);
      this.heatShimmer.update(dt, this.missionElapsed);

      // Tumbleweeds
      this.tumbleweeds.update(dt);

      // Shelter indicator
      this.shelterIndicator.update(
        this.player.root.position.x,
        this.player.root.position.z,
        this.player.getFacing(),
        this.shelters,
        this.dustStormState.phase
      );

      // Data logs
      this.dataLogs.update(dt, this.player.root.position.x, this.player.root.position.z);

      // Objective guide
      {
        const cc = collectedCoreCount(this.cores);
        const req = this.variant.requiredCoreCount;
        const exOn = cc >= req;
        const exArmed = this.extractionArmProgress >= 1;
        const inEx = exOn && this.extraction.containsPlayer(this.player.root.position);
        // Find nearest uncollected core as target, or extraction
        let tx = this.extraction.center.x;
        let tz = this.extraction.center.z;
        if (!exOn) {
          let bestDist = Infinity;
          for (const c of this.cores) {
            if (c.collected) continue;
            const dx = this.player.root.position.x - c.center.x;
            const dz = this.player.root.position.z - c.center.z;
            const d = dx * dx + dz * dz;
            if (d < bestDist) {
              bestDist = d;
              tx = c.center.x;
              tz = c.center.z;
            }
          }
        }
        this.objectiveGuide.update(
          this.player.root.position.x,
          this.player.root.position.z,
          this.player.getFacing(),
          cc, req, exOn, exArmed, inEx, tx, tz
        );
      }

      // Minimap visibility (no_minimap mutator)
      if (isMutatorActive(this.activeMutators, "no_minimap")) {
        // Minimap hidden unless scanner pulse is revealing
        // (handled via CSS — we just skip the update to save perf)
      }

      // Death replay zoom
      if (this.deathReplay.active) {
        this.cameraRig.setZoomFactor(this.deathReplay.zoomFactor);
      } else {
        this.cameraRig.setZoomFactor(1);
      }

      // Dash afterimage
      if (this.dash.isDashing) {
        if (!this.wasDashing) {
          this.dashAfterimage.onDashStart(this.player.root.position, this.player.getFacing());
        }
        this.dashAfterimage.onDashFrame(this.player.root.position, this.player.getFacing(), dt);
      }
      this.wasDashing = this.dash.isDashing;
      this.dashAfterimage.update(dt);

      // Speed run timer
      this.speedRunTimer.setCurrentTime(this.missionElapsed);

      // FPS counter
      this.fpsCounter.update(dt);

      // Render through post-processing pipeline
      this.postfx.render();
    };
    requestAnimationFrame(tick);
  }

  private async onTitleDismiss(): Promise<void> {
    // Start music on user gesture (before any async waits)
    const ctx = this.ambience.getAudioContext();
    if (ctx) this.music.start(ctx);

    // Ask for pilot name if not set yet
    if (!NamePrompt.hasName()) {
      await this.namePrompt.prompt();
    }

    this.gameStarted = true;
    this.transition.fadeIn(0.6);
    this.tutorial.show();
    this.barks.play("missionStart");
    this.speedRunTimer.show();
  }

  private applySettings(s: GameSettings): void {
    this.music.setVolume(s.musicVolume);
    this.music.setMuted(s.musicMuted);
    if (s.musicPreset && s.musicPreset !== this.music.getPresetId()) {
      this.music.setPreset(s.musicPreset);
    }
    if (s.showFps) this.fpsCounter.show();
    else this.fpsCounter.hide();
    // Graphics quality: adjust bloom and shadows
    if (s.graphicsQuality === "low") {
      this.renderer.shadowMap.enabled = false;
      this.postfx.setSize(
        Math.max(1, Math.floor((this.container.clientWidth || 640) * 0.75)),
        Math.max(1, Math.floor((this.container.clientHeight || 480) * 0.75))
      );
    } else {
      this.renderer.shadowMap.enabled = true;
      this.onResize();
    }
  }

  private onShopClose(): void {
    // Save currency and re-apply upgrades
    const ups = this.upgradeShop.getUpgrades();
    this.totalCurrency = this.upgradeShop.getCurrency();
    UpgradeShop.saveState(this.totalCurrency, ups);

    // Apply scanner upgrade
    const scannerMult = UpgradeShop.getMultiplier("scanner", ups.scanner);
    this.minimap.setScale(120 * scannerMult);
  }

  private getUpgradeMultipliers() {
    const saved = UpgradeShop.loadState();
    return {
      fuelCap: UpgradeShop.getMultiplier("fuel_cap", saved.upgrades.fuel_cap),
      jetEff: UpgradeShop.getMultiplier("jet_eff", saved.upgrades.jet_eff),
      armor: saved.upgrades.armor * 20, // +20 per tier
      speed: UpgradeShop.getMultiplier("speed", saved.upgrades.speed),
    };
  }

  private updateMinimap(dt: number): void {
    const markers: MinimapMarker[] = [];

    // Cores
    for (const c of this.cores) {
      markers.push({
        x: c.center.x,
        z: c.center.z,
        type: c.collected ? "core_collected" : "core",
      });
    }

    // Salvage
    for (const s of this.salvage) {
      markers.push({
        x: s.center.x,
        z: s.center.z,
        type: s.collected ? "salvage_collected" : "salvage",
      });
    }

    // Fuel
    for (const f of this.fuelCans) {
      if (!f.collected) {
        markers.push({ x: f.center.x, z: f.center.z, type: "fuel" });
      }
    }

    // Repair
    for (const r of this.repairKits) {
      if (!r.collected) {
        markers.push({ x: r.center.x, z: r.center.z, type: "repair" });
      }
    }

    // Extraction
    const n = collectedCoreCount(this.cores);
    const extractionOn = n >= this.variant.requiredCoreCount;
    markers.push({
      x: this.extraction.center.x,
      z: this.extraction.center.z,
      type: extractionOn ? "extraction_active" : "extraction",
      radius: 6,
    });

    // Hazard zones
    for (const hz of this.hazards) {
      markers.push({
        x: hz.center.x,
        z: hz.center.z,
        type: hz.kind === "heat" ? "heat" : "radiation",
        radius: hz.radius,
      });
    }

    // Shield pickups
    for (const sp of this.shieldPickups) {
      if (!sp.collected) {
        markers.push({ x: sp.center.x, z: sp.center.z, type: "shield" });
      }
    }

    // Shelters
    for (const s of this.shelters) {
      markers.push({
        x: s.center.x,
        z: s.center.z,
        type: "shelter",
        radius: s.radius,
      });
    }

    const [scx, scz] = this.variant.stormCenter;
    const safeR = safeZoneRadius(this.variant, this.missionElapsed);

    this.minimap.update(
      this.player.root.position.x,
      this.player.root.position.z,
      this.player.getFacing(),
      markers,
      safeR, scx, scz,
      dt,
      getDustStormLine(this.dustStormState)
    );
  }

  private spawnVariant(index: number): void {
    this.teardownPickups();

    if (this.useProceduralMissions) {
      this.variant = generateProceduralMission(
        Math.min(6, Math.max(1, index + 1)),
        Date.now()
      );
    } else {
      this.variant = getMissionConfig(index);
    }

    this.hazardTuning = mergeHazardTuning(this.variant.hazardTuning);
    this.stormTimeLimit = this.variant.stormTimeLimitSec;
    this.prevStormLeft = this.stormTimeLimit;
    this.hazards = createHazardZones(this.terrain, this.scene, this.variant.hazardLayout);
    this.shelters = createShelters(this.terrain, this.scene);
    this.shieldPickups = createShieldPickups(this.terrain, this.scene);
    this.cores = createEnergyCores(this.terrain, this.scene, this.variant.cores);
    this.salvage = createSalvagePickups(this.terrain, this.scene, this.variant.salvage);
    this.fuelCans = createFuelPickups(this.terrain, this.scene, this.variant.fuelPickups);
    this.repairKits = createRepairPickups(this.terrain, this.scene, this.variant.repairPickups);
    this.extraction = new ExtractionZone(
      this.terrain,
      this.variant.extraction[0],
      this.variant.extraction[1],
      6,
      this.scene
    );
    this.extraction.setActive(false);
    this.drones = new PatrolDroneSystem(this.terrain, this.scene);
    this.drones.setParams(
      this.variant.droneCount,
      this.variant.droneSpeed,
      this.hazardTuning
    );
    this.hud?.setVariantTitle(`${this.variant.id} · ${this.variant.title}`);
  }

  private applyPlayerFromVariant(): void {
    const ups = this.getUpgradeMultipliers();
    this.maxIntegrity = BASE_MAX_INTEGRITY + ups.armor;

    this.player.resetMission(this.variant.playerStart, 0, {
      fuelPercent: this.variant.startingFuelPercent,
      jetFuelDrainMult: this.variant.jetFuelDrainMult * ups.jetEff,
      fuelCapMult: ups.fuelCap,
      speedMult: ups.speed,
    });
    this.dash.reset();
    this.snapPlayerToTerrain();
  }

  private snapPlayerToTerrain(): void {
    const p = this.player.root.position;
    const ty = sampleTerrainY(this.terrain, p.x, p.z);
    p.y = ty + capsuleHalfHeight() + 0.06;
  }

  private teardownPickups(): void {
    disposeHazardZones(this.hazards);
    this.hazards = [];
    disposeShelters(this.shelters);
    this.shelters = [];
    disposeShieldPickups(this.shieldPickups);
    this.shieldPickups = [];
    for (const c of this.cores) c.group.removeFromParent();
    this.cores = [];
    for (const s of this.salvage) s.group.removeFromParent();
    this.salvage = [];
    for (const f of this.fuelCans) f.group.removeFromParent();
    this.fuelCans = [];
    for (const r of this.repairKits) r.group.removeFromParent();
    this.repairKits = [];
    this.extraction?.dispose();
    this.drones?.dispose();
  }

  private applyStormVisuals(stormLeft: number, edgeStress: number): void {
    const fog = this.scene.fog as THREE.Fog | null;
    if (!fog) return;
    const u = 1 - THREE.MathUtils.clamp(stormLeft / 90, 0, 1);
    const e = THREE.MathUtils.clamp(edgeStress, 0, 1);
    const near = this.baseFogNear + u * 14 + e * 26;
    let far = this.baseFogFar - u * 42 - e * 55;
    if (far < near + FOG_MIN_SPAN) far = near + FOG_MIN_SPAN;
    fog.near = near;
    fog.far = far;
    const c = this.baseBgColor.clone().lerp(this.stressColor, u * 0.35 + e * 0.28);
    this.scene.background = c;
    this.renderer.setClearColor(c, 1);
    fog.color.copy(c);
  }

  private pulseThermalAndRadiationVisuals(thermalWarning: boolean): void {
    const t = this.missionElapsed;
    for (const z of this.hazards) {
      if (z.kind === "heat") {
        const ring = z.group.children[0] as THREE.Mesh | undefined;
        const mat = ring?.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          const base = 0.42 + 0.28 * Math.sin(t * 4.1);
          mat.emissiveIntensity = base + (thermalWarning ? 0.55 : 0);
        }
        const fissure = z.group.children[2] as THREE.Mesh | undefined;
        const fm = fissure?.material;
        if (fm instanceof THREE.MeshStandardMaterial) {
          fm.emissiveIntensity = 0.45 + (thermalWarning ? 0.85 : 0.2) * Math.sin(t * 8.2);
        }
      } else {
        const mainRing = z.group.children[1] as THREE.Mesh | undefined;
        const mat = mainRing?.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissiveIntensity = 0.58 + 0.2 * Math.sin(t * 2.8);
        }
        const outer = z.group.children[0] as THREE.Mesh | undefined;
        const om = outer?.material;
        if (om instanceof THREE.MeshStandardMaterial) {
          om.emissiveIntensity = 0.32 + 0.12 * Math.sin(t * 2.2);
        }
      }
    }
  }

  private updateMissionOutcome(collected: number, extractionArmed: boolean): void {
    if (this.outcome !== "playing") return;

    if (this.integrity <= 0) {
      this.failMission(this.lastDeathCause);
      return;
    }

    if (
      collected >= this.variant.requiredCoreCount &&
      extractionArmed &&
      this.extractionHold >= this.variant.extractionHoldSec
    ) {
      this.outcome = "success";
      this.barks.play("missionSuccess");
      this.objectiveGuide.markComplete();
      this.ambience.duckMusic(0.25, 0.6);
      this.sfx.successSting();
      this.postfx.shake(0.2, 0.4);

      // Calculate scores and show stats
      const timeBonus = Math.max(0, Math.floor((this.stormTimeLimit - this.missionElapsed) * 15));
      const stats: MissionStats = {
        outcome: "success",
        timeSec: this.missionElapsed,
        coresCollected: collected,
        coresRequired: this.variant.requiredCoreCount,
        salvageCollected: salvageCollectedCount(this.salvage),
        salvageTotal: salvageTotalCount(this.salvage),
        integrityRemaining: Math.round(this.integrity),
        objectiveScore: this.objectiveScore,
        salvageScore: this.salvageScore,
        bonusTimeScore: timeBonus,
      };

      // Add salvage to currency (with mutator multiplier)
      const mutMult = getMutatorScoreMultiplier(this.activeMutators);
      const totalScore = Math.round((stats.objectiveScore + stats.salvageScore + stats.bonusTimeScore) * mutMult);
      this.totalCurrency += totalScore;
      UpgradeShop.saveState(this.totalCurrency, UpgradeShop.loadState().upgrades);

      // Record to leaderboard
      const grade = this.computeGrade(totalScore);
      this.leaderboard.addScore({
        score: totalScore,
        grade,
        timeSec: this.missionElapsed,
        variant: `${this.variant.id} · ${this.variant.title}`,
        date: new Date().toISOString().slice(0, 10),
      });

      // Submit to online leaderboard
      const variantStr = `${this.variant.id} · ${this.variant.title}`;
      const isDaily = variantStr.startsWith("Daily");
      OnlineLeaderboard.submitScore(totalScore, grade, this.missionElapsed, variantStr, isDaily);

      // Record speed run
      const isNewPb = this.speedRunTimer.recordCompletion(this.missionElapsed);

      // Show stats screen after short delay
      setTimeout(() => {
        this.statsScreen.show(stats);
        this.hud.setOutcome("playing"); // hide old overlay
      }, 600);
      return;
    }

    if (this.missionElapsed >= this.stormTimeLimit) {
      this.failMission("time_expired");
    }
  }

  private computeGrade(score: number): string {
    if (score >= 9000) return "S";
    if (score >= 7500) return "A";
    if (score >= 5500) return "B";
    if (score >= 3500) return "C";
    if (score >= 1500) return "D";
    return "F";
  }

  private failMission(cause: DeathCause = "unknown"): void {
    if (this.outcome !== "playing") return;
    this.outcome = "failed";
    this.barks.play("missionFailed");
    this.ambience.duckMusic(0.22, 0.55);
    this.sfx.failureBuzzer();
    this.postfx.shake(0.25, 0.5);

    const stats: MissionStats = {
      outcome: "failed",
      timeSec: this.missionElapsed,
      coresCollected: collectedCoreCount(this.cores),
      coresRequired: this.variant.requiredCoreCount,
      salvageCollected: salvageCollectedCount(this.salvage),
      salvageTotal: salvageTotalCount(this.salvage),
      integrityRemaining: Math.round(this.integrity),
      objectiveScore: this.objectiveScore,
      salvageScore: this.salvageScore,
      bonusTimeScore: 0,
      deathCause: cause,
    };

    // Trigger death replay slow-mo, then show stats
    this.deathReplay.trigger(() => {
      this.statsScreen.show(stats);
      this.hud.setOutcome("playing");
    });
  }

  private bindRestart(): void {
    window.addEventListener("keydown", (e) => {
      // Global toggles (work anytime)
      if (e.code === "KeyM") {
        const muted = !this.music.isMuted();
        this.music.setMuted(muted);
        const s = SettingsMenu.loadSettings();
        s.musicMuted = muted;
        SettingsMenu.saveSettings(s);
        return;
      }
      if (e.code === "KeyH" && !this.settingsMenu.isVisible()) {
        this.keyboardHelp.toggle();
        return;
      }
      if (e.code === "Escape" && !this.keyboardHelp.isVisible()) {
        if (this.settingsMenu.isVisible()) {
          this.settingsMenu.hide();
        } else if (!this.upgradeShop.isVisible() && !this.leaderboard.isVisible()) {
          this.settingsMenu.show();
        }
        return;
      }

      // Handle shop/leaderboard/mutator closures
      if (this.upgradeShop.isVisible() || this.leaderboard.isVisible() || this.mutatorPanel.isVisible() || this.onlineLeaderboard.isVisible()) return;
      if (this.settingsMenu.isVisible() || this.keyboardHelp.isVisible()) return;

      if (this.outcome === "playing") return;

      if (e.code === "KeyR") {
        this.beginFreshMission(false, false);
        return;
      }
      if (e.code === "KeyN") {
        this.beginFreshMission(true, false);
        return;
      }
      if (e.code === "KeyP") {
        this.beginFreshMission(false, true);
        return;
      }
      if (e.code === "KeyU") {
        this.statsScreen.hide();
        this.upgradeShop.show(this.totalCurrency);
        return;
      }
      if (e.code === "KeyL") {
        this.statsScreen.hide();
        this.onlineLeaderboard.show();
        return;
      }
      if (e.code === "KeyX") {
        this.statsScreen.hide();
        this.mutatorPanel.show();
        return;
      }
      if (e.code === "KeyD") {
        // Daily challenge
        this.beginDailyChallenge();
        return;
      }
    });
  }

  private async beginFreshMission(advanceVariant: boolean, procedural: boolean): Promise<void> {
    this.statsScreen.hide();

    await this.transition.fadeOut(0.3);

    this.useProceduralMissions = procedural;

    if (advanceVariant) {
      this.variantIndex = (this.variantIndex + 1) % MISSION_CONFIGS.length;
    }

    this.outcome = "playing";
    this.missionElapsed = 0;
    this.extractionHold = 0;
    this.extractionArmProgress = 0;
    this.extractionPulseAcc = 0;
    this.jetJamUntilElapsed = 0;
    this.salvageScore = 0;
    this.objectiveScore = 0;
    this.prevCoreCount = 0;
    this.integrityLowBarkFired = false;
    this.fuelLowBarkFired = false;

    this.spawnVariant(this.variantIndex);

    const ups = this.getUpgradeMultipliers();
    this.maxIntegrity = BASE_MAX_INTEGRITY + ups.armor;
    this.integrity = this.maxIntegrity;

    this.hud.setOutcome("playing");
    this.applyPlayerFromVariant();
    this.extraction.setActive(false);
    this.ambience.resetLayers();

    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = this.baseFogNear;
      fog.far = this.baseFogFar;
      fog.color.setHex(ATMOSPHERE_COLOR);
    }
    (this.scene.background as THREE.Color).setHex(ATMOSPHERE_COLOR);
    this.renderer.setClearColor(this.scene.background as THREE.Color, 1);

    this.prevStormLeft = this.stormTimeLimit;
    this.hud.setStormRemaining(this.stormTimeLimit);
    this.hud.setIntegrity(this.maxIntegrity);
    this.hud.setExtractionHold(0, this.variant.extractionHoldSec, false, false, 0);
    this.hud.setSalvage(0, salvageTotalCount(this.salvage), 0);
    this.hud.setOutsideStormWall(false);

    // Reset new systems
    this.postfx.setDamageIntensity(0);
    this.combo.reset();
    this.speedRunTimer.setVariant(`${this.variant.id} · ${this.variant.title}`);
    this.speedRunTimer.show();
    this.damageVignette.setIntegrity(this.maxIntegrity);
    this.sandstorm.setIntensity(0);
    this.wasDashing = false;
    this.dustStormState = createDustStormState();
    this.hasShield = false;
    this.scannerPulse.reset();
    this.decoyBeacon.reset();
    this.deathReplay.reset();
    this.dataLogs.reset();
    this.wasGrounded = true;
    this.objectiveGuide.reset();
    this.lastDeathCause = "unknown";

    await this.transition.fadeIn(0.4);
    this.barks.play("missionStart");
  }

  private async beginDailyChallenge(): Promise<void> {
    this.statsScreen.hide();
    await this.transition.fadeOut(0.3);
    this.useProceduralMissions = true;
    this.outcome = "playing";
    this.missionElapsed = 0;
    this.extractionHold = 0;
    this.extractionArmProgress = 0;
    this.extractionPulseAcc = 0;
    this.jetJamUntilElapsed = 0;
    this.salvageScore = 0;
    this.objectiveScore = 0;
    this.prevCoreCount = 0;
    this.integrityLowBarkFired = false;
    this.fuelLowBarkFired = false;
    this.teardownPickups();

    // Generate with daily seed
    const seed = getDailySeed();
    this.variant = generateProceduralMission(3, seed);

    this.hazardTuning = mergeHazardTuning(this.variant.hazardTuning);
    this.stormTimeLimit = this.variant.stormTimeLimitSec;
    this.prevStormLeft = this.stormTimeLimit;
    this.hazards = createHazardZones(this.terrain, this.scene, this.variant.hazardLayout);
    this.shelters = createShelters(this.terrain, this.scene);
    this.shieldPickups = createShieldPickups(this.terrain, this.scene);
    this.cores = createEnergyCores(this.terrain, this.scene, this.variant.cores);
    this.salvage = createSalvagePickups(this.terrain, this.scene, this.variant.salvage);
    this.fuelCans = createFuelPickups(this.terrain, this.scene, this.variant.fuelPickups);
    this.repairKits = createRepairPickups(this.terrain, this.scene, this.variant.repairPickups);
    this.extraction = new ExtractionZone(
      this.terrain, this.variant.extraction[0], this.variant.extraction[1], 6, this.scene
    );
    this.extraction.setActive(false);
    this.drones = new PatrolDroneSystem(this.terrain, this.scene);
    this.drones.setParams(this.variant.droneCount, this.variant.droneSpeed, this.hazardTuning);

    const label = getDailyLabel();
    this.hud?.setVariantTitle(`Daily · ${label}`);

    const ups = this.getUpgradeMultipliers();
    this.maxIntegrity = BASE_MAX_INTEGRITY + ups.armor;
    this.integrity = this.maxIntegrity;
    this.hud.setOutcome("playing");
    this.applyPlayerFromVariant();
    this.extraction.setActive(false);
    this.ambience.resetLayers();

    this.postfx.setDamageIntensity(0);
    this.combo.reset();
    this.speedRunTimer.setVariant(`Daily · ${label}`);
    this.speedRunTimer.show();
    this.damageVignette.setIntegrity(this.maxIntegrity);
    this.sandstorm.setIntensity(0);
    this.wasDashing = false;
    this.dustStormState = createDustStormState();
    this.hasShield = false;
    this.scannerPulse.reset();
    this.decoyBeacon.reset();
    this.deathReplay.reset();
    this.dataLogs.reset();
    this.wasGrounded = true;
    this.objectiveGuide.reset();
    this.lastDeathCause = "unknown";

    await this.transition.fadeIn(0.4);
    this.barks.play("missionStart");
  }

  private onResize(): void {
    const w = Math.max(1, this.container.clientWidth || window.innerWidth || 640);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight || 480);
    this.renderer.setSize(w, h);
    this.cameraRig.setAspect(w / h);
    this.postfx.setSize(w, h);
    this.sandstorm?.resize(w, h);
  }
}

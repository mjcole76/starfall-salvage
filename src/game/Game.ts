import * as THREE from "three";
import { AngledTopDownCamera } from "../camera/AngledTopDownCamera";
import { GameSfx } from "../audio/GameSfx";
import { MissionAmbience } from "../audio/MissionAmbience";
import { VoiceBarks } from "../audio/VoiceBarks";
import {
  collectedCoreCount,
  createEnergyCores,
  tickEnergyCoreIdle,
  tickUnstableCores,
  tickMagneticCores,
  getUnstableWarning,
  totalCoreCount,
  tryCollectEnergyCores,
  UNSTABLE_BLAST_DAMAGE,
  UNSTABLE_BLAST_RADIUS,
  MAGNETIC_PULL_RADIUS,
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
import { getBiomeTheme, type BiomeTheme } from "../world/biomeThemes";
import {
  createLightningSystem,
  tickLightning,
  createQuicksandPits,
  applyQuicksand,
  createGravityWells,
  tickGravityWells,
  applyGravityWells,
  createIceSlipZones,
  isOnIce,
  createWindSystem,
  tickWind,
  applyWind,
  createMirageCores,
  tickMirage,
  type LightningSystem,
  type QuicksandPit,
  type GravityWell,
  type IceSlipZone,
  type WindSystem,
  type MirageCore,
} from "../mission/levelHazards";
import {
  createPowerupPickups,
  tickPowerupIdle,
  tryCollectPowerups,
  tickActivePowerups,
  createActivePowerups,
  powerupLabel,
  powerupColor,
  TIME_DILATION_FACTOR,
  type PowerupPickup,
  type ActivePowerups,
  type PowerupKind,
} from "../mission/powerupPickups";
import {
  createSentryTurrets,
  tickSentryTurrets,
  createBurrowers,
  tickBurrowers,
  type SentryTurret,
  type Burrower,
} from "../mission/levelEnemies";
import { getPilotClass, loadPilotClass } from "./pilotClass";
import { PilotClassPanel } from "../ui/PilotClassPanel";
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
  private useProceduralMissions = true;
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
  private currentBiome!: BiomeTheme;
  private desertEnvGroup: THREE.Group | null = null;
  private magnetPullActive = false;
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  // Level hazards (T7+)
  private lightningStrikes: LightningSystem | null = null;
  private quicksand: QuicksandPit[] = [];
  private gravityWells: GravityWell[] = [];
  private iceZones: IceSlipZone[] = [];
  private windSystem: WindSystem | null = null;
  private mirages: MirageCore[] = [];
  // Powerups
  private powerups: PowerupPickup[] = [];
  private activePowerups: ActivePowerups = createActivePowerups();
  // Enemies
  private sentryTurrets: SentryTurret[] = [];
  private burrowers: Burrower[] = [];
  // Player slip momentum (ice)
  private slipVel = new THREE.Vector3();
  // Pilot class
  private pilotClassPanel!: PilotClassPanel;

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
    this.currentBiome = getBiomeTheme(this.variantIndex);
    const sky = new THREE.Color(this.currentBiome.skyColor);
    this.scene.background = sky;
    this.renderer.setClearColor(sky, 1);
    this.scene.fog = USE_DISTANCE_FOG
      ? new THREE.Fog(this.currentBiome.fogColor, FOG_NEAR, FOG_FAR)
      : null;

    this.ambientLight = new THREE.AmbientLight(
      this.currentBiome.ambientColor,
      this.currentBiome.ambientIntensity
    );
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(
      this.currentBiome.hemiSkyColor,
      this.currentBiome.hemiGroundColor,
      this.currentBiome.hemiIntensity
    );
    this.scene.add(this.hemiLight);
    this.sunLight = new THREE.DirectionalLight(
      this.currentBiome.sunColor,
      this.currentBiome.sunIntensity
    );
    this.sunLight.position.set(-42, 90, 26);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 188;
    this.sunLight.shadow.camera.left = -70;
    this.sunLight.shadow.camera.right = 70;
    this.sunLight.shadow.camera.top = 70;
    this.sunLight.shadow.camera.bottom = -70;
    this.sunLight.shadow.bias = -0.00022;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);

    this.terrain = createTerrain(this.currentBiome);
    this.scene.add(this.terrain);
    this.desertEnvGroup = createDesertEnvironment(this.scene, this.terrain, this.currentBiome);
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
      // Return to stats screen if game is over
      if (this.outcome !== "playing") {
        // Stats screen will re-show on next key press (R/N/P/etc)
      }
    });
    this.activeMutators = loadMutators();

    this.pilotClassPanel = new PilotClassPanel(this.container);
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

      // Time dilation powerup — slow everything (including hazards) but not the player
      if (this.activePowerups.timeDilationLeft > 0) {
        dt *= TIME_DILATION_FACTOR;
      }

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
        if (corePick.magnetActivated) {
          this.magnetPullActive = true;
          this.floatingText.spawnCenter("MAGNET ACTIVE", "#ddddff");
        }

        // Unstable core fuse ticks
        const detonations = tickUnstableCores(this.cores, dt);
        for (const pos of detonations) {
          this.particles.burstCore(pos);
          this.postfx.shake(0.35, 0.4);
          this.sfx.heatPulse();
          this.floatingText.spawnCenter("CORE DETONATED!", "#ff2222");
          // Damage player based on distance
          const dist = this.player.root.position.distanceTo(pos);
          if (dist < UNSTABLE_BLAST_RADIUS) {
            const falloff = 1 - dist / UNSTABLE_BLAST_RADIUS;
            const dmg = UNSTABLE_BLAST_DAMAGE * falloff;
            this.integrity = Math.max(0, this.integrity - dmg);
            if (dmg > 5) this.lastDeathCause = "unstable_core" as DeathCause;
          }
        }

        // Magnetic pull effect — drag nearby salvage toward player
        if (this.magnetPullActive) {
          this.magnetPullActive = tickMagneticCores(this.cores, dt);
          if (this.magnetPullActive) {
            const pp = this.player.root.position;
            for (const s of this.salvage) {
              if (s.collected) continue;
              const d = s.group.position.distanceTo(pp);
              if (d < MAGNETIC_PULL_RADIUS && d > 0.5) {
                const dir = pp.clone().sub(s.group.position).normalize();
                const pull = (1 - d / MAGNETIC_PULL_RADIUS) * 12 * dt;
                s.group.position.add(dir.multiplyScalar(pull));
                s.center.copy(s.group.position);
              }
            }
          }
        }

        // Unstable core warning HUD
        const unstableLeft = getUnstableWarning(this.cores);
        if (unstableLeft > 0 && unstableLeft < 6) {
          this.floatingText.spawnCenter(
            `UNSTABLE: ${Math.ceil(unstableLeft)}s`,
            unstableLeft < 3 ? "#ff0000" : "#ff8800"
          );
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
        tickPowerupIdle(this.powerups, this.missionElapsed);
        tickActivePowerups(this.activePowerups, dt);

        // --- New level hazards ---
        const playerPos = this.player.root.position;
        const cloaked = this.activePowerups.phantomCloakLeft > 0;
        let hazardDamage = 0;
        let hazardJamJet = false;

        // Lightning
        if (this.lightningStrikes) {
          const lt = tickLightning(this.lightningStrikes, this.terrain, playerPos, dt);
          hazardDamage += lt.damage;
          if (lt.struckNearPlayer) {
            this.postfx.shake(0.4, 0.3);
            this.sfx.heatPulse();
            if (lt.damage > 5) this.lastDeathCause = "lightning" as DeathCause;
          }
        }

        // Quicksand
        let speedMultExt = 1;
        const qs = applyQuicksand(this.quicksand, playerPos);
        if (qs.trapped) speedMultExt *= qs.speedMult;

        // Gravity wells
        tickGravityWells(this.gravityWells, this.missionElapsed);
        const gw = applyGravityWells(this.gravityWells, playerPos);
        if (gw.pushVec.lengthSq() > 0) {
          playerPos.x += gw.pushVec.x * dt;
          playerPos.z += gw.pushVec.z * dt;
        }

        // Ice slip — accumulate momentum
        const onIce = isOnIce(this.iceZones, playerPos);
        if (onIce) {
          // Gather player movement intent
          const mv = this.player.lastMoveDir;
          if (mv && mv.lengthSq() > 0) {
            this.slipVel.x = THREE.MathUtils.lerp(this.slipVel.x, mv.x * 6, dt * 1.5);
            this.slipVel.z = THREE.MathUtils.lerp(this.slipVel.z, mv.z * 6, dt * 1.5);
          }
          playerPos.x += this.slipVel.x * dt;
          playerPos.z += this.slipVel.z * dt;
        } else {
          this.slipVel.multiplyScalar(Math.max(0, 1 - dt * 4));
        }

        // Wind
        if (this.windSystem) {
          const wTick = tickWind(this.windSystem, dt);
          if (wTick.warn) this.sfx.dustStormWarning();
          const push = applyWind(this.windSystem);
          if (push.lengthSq() > 0) {
            playerPos.x += push.x * dt;
            playerPos.z += push.z * dt;
          }
        }

        // Mirage
        tickMirage(this.mirages, playerPos, this.missionElapsed);

        // Sentry turrets
        if (this.sentryTurrets.length > 0) {
          const tt = tickSentryTurrets(this.sentryTurrets, playerPos, dt, cloaked);
          hazardDamage += tt.damage;
          if (tt.firedNearPlayer) {
            this.postfx.shake(0.18, 0.2);
            if (tt.damage > 5) this.lastDeathCause = "sentry_turret" as DeathCause;
          }
        }

        // Burrowers
        if (this.burrowers.length > 0) {
          const br = tickBurrowers(this.burrowers, playerPos, dt, cloaked);
          hazardDamage += br.damage;
          if (br.popOut) this.postfx.shake(0.22, 0.2);
          if (br.damage > 5) this.lastDeathCause = "burrower" as DeathCause;
        }

        // Apply hazard damage (respect dash invulnerability + cloak)
        if (hazardDamage > 0 && !this.dash.isInvulnerable && !cloaked) {
          this.integrity = Math.max(0, this.integrity - hazardDamage);
        }
        // Save speed mult for player update (downstream code reads from variable)
        const externalSpeedMult = speedMultExt
          * (this.activePowerups.speedBootsLeft > 0 ? 1.5 : 1);

        // Mega-magnet — pull every salvage and core on map toward player
        if (this.activePowerups.megaMagnetLeft > 0) {
          const pp = playerPos;
          const pull = 18 * dt;
          for (const s of this.salvage) {
            if (s.collected) continue;
            const d = s.group.position.distanceTo(pp);
            if (d > 0.5) {
              const dir = pp.clone().sub(s.group.position).normalize();
              s.group.position.add(dir.multiplyScalar(pull));
              s.center.copy(s.group.position);
            }
          }
          for (const c of this.cores) {
            if (c.collected) continue;
            const d = c.group.position.distanceTo(pp);
            if (d > 0.5 && d < 50) {
              const dir = pp.clone().sub(c.group.position).normalize();
              c.group.position.add(dir.multiplyScalar(pull * 0.6));
              c.center.copy(c.group.position);
            }
          }
        }

        // Powerup pickup
        const pickedKind = tryCollectPowerups(this.powerups, playerPos, this.activePowerups);
        if (pickedKind) {
          this.combo.pickup();
          this.sfx.shieldPickup();
          this.particles.burstCore(playerPos);
          this.floatingText.spawnCenter(`+${powerupLabel(pickedKind)}`, powerupColor(pickedKind));
        }

        // Apply external speed effects to player controller (additive)
        if (this.player.setExternalSpeedMult) {
          this.player.setExternalSpeedMult(externalSpeedMult);
        }
        // Suppress unused-var lints
        void hazardJamJet;

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
    const pilot = getPilotClass(loadPilotClass());
    return {
      fuelCap: UpgradeShop.getMultiplier("fuel_cap", saved.upgrades.fuel_cap) * pilot.startingFuelMult,
      jetEff: UpgradeShop.getMultiplier("jet_eff", saved.upgrades.jet_eff) * pilot.jetEffMult,
      armor: saved.upgrades.armor * 20 + pilot.armorBonus,
      speed: UpgradeShop.getMultiplier("speed", saved.upgrades.speed) * pilot.speedMult,
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
        Math.min(12, Math.max(1, index + 1)),
        Date.now()
      );
    } else {
      this.variant = getMissionConfig(index);
    }

    // --- Biome swap: rebuild terrain + environment when tier changes ---
    const newBiome = getBiomeTheme(index);
    if (newBiome !== this.currentBiome) {
      this.currentBiome = newBiome;
      this.applyBiomeTheme(newBiome);
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
    this.magnetPullActive = false;

    // --- Tier-gated extras: hazards, powerups, enemies ---
    const tier = ((index % 12) + 12) % 12 + 1;
    this.spawnTierExtras(tier);

    this.hud?.setVariantTitle(`${this.variant.id} · ${this.variant.title} · ${this.currentBiome.name}`);
  }

  /**
   * Spawn extra hazards / powerups / enemies based on tier.
   * Higher tiers stack more punishment AND more powerups for balance.
   */
  private spawnTierExtras(tier: number): void {
    // --- Hazards ---
    if (tier >= 9) {
      // Magnetic Storm tier — lightning strikes
      this.lightningStrikes = createLightningSystem(this.scene);
    }
    if (tier >= 7) {
      // Glass Sea — quicksand pits start showing
      this.quicksand = createQuicksandPits(this.terrain, this.scene, Math.min(4, Math.floor(tier / 3)));
    }
    if (tier >= 12) {
      // Singularity — gravity wells
      this.gravityWells = createGravityWells(this.terrain, this.scene, 3);
    } else if (tier >= 8) {
      this.gravityWells = createGravityWells(this.terrain, this.scene, 1);
    }
    if (tier >= 11) {
      // Frozen Hellscape / cold biomes
      this.iceZones = createIceSlipZones(this.terrain, this.scene, 4);
    } else if (tier === 2 || tier === 11) {
      this.iceZones = createIceSlipZones(this.terrain, this.scene, 2);
    }
    if (tier >= 8) {
      this.windSystem = createWindSystem();
    }
    if (tier >= 7) {
      this.mirages = createMirageCores(this.terrain, this.scene, Math.min(3, Math.floor((tier - 6) / 2) + 1));
    }

    // --- Powerups (more at higher tiers to balance hazards) ---
    const powerCount = Math.min(5, Math.floor(tier / 2));
    if (powerCount > 0) {
      const kinds: PowerupKind[] = [
        "time_dilation", "overcharge", "phantom_cloak", "speed_boots", "mega_magnet",
      ];
      const spawns: { x: number; z: number; kind: PowerupKind }[] = [];
      for (let i = 0; i < powerCount; i++) {
        spawns.push({
          x: Math.round((Math.random() - 0.5) * 100),
          z: Math.round((Math.random() - 0.5) * 100),
          kind: kinds[i % kinds.length]!,
        });
      }
      this.powerups = createPowerupPickups(this.terrain, this.scene, spawns);
    }

    // --- Enemies ---
    if (tier >= 8) {
      this.sentryTurrets = createSentryTurrets(this.terrain, this.scene, Math.min(3, tier - 7));
    }
    if (tier >= 10) {
      this.burrowers = createBurrowers(this.terrain, this.scene, Math.min(4, tier - 9));
    }

    // Reset active powerup state for new mission
    this.activePowerups = createActivePowerups();
    this.slipVel.set(0, 0, 0);
    this.player?.setExternalSpeedMult?.(1);
  }

  private teardownTierExtras(): void {
    const disposeGroup = (g: THREE.Group | null | undefined) => {
      if (!g) return;
      this.scene.remove(g);
      g.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
    };

    if (this.lightningStrikes) {
      disposeGroup(this.lightningStrikes.group);
      this.lightningStrikes = null;
    }
    for (const p of this.quicksand) disposeGroup(p.group);
    this.quicksand = [];
    for (const w of this.gravityWells) disposeGroup(w.group);
    this.gravityWells = [];
    for (const z of this.iceZones) disposeGroup(z.group);
    this.iceZones = [];
    this.windSystem = null;
    for (const m of this.mirages) disposeGroup(m.group);
    this.mirages = [];
    for (const p of this.powerups) p.group.removeFromParent();
    this.powerups = [];
    for (const t of this.sentryTurrets) disposeGroup(t.group);
    this.sentryTurrets = [];
    for (const b of this.burrowers) disposeGroup(b.group);
    this.burrowers = [];
  }

  /**
   * Apply a biome theme: rebuild terrain + environment meshes, update lighting,
   * sky, fog, and bloom settings.
   */
  private applyBiomeTheme(biome: BiomeTheme): void {
    // Rebuild terrain
    this.scene.remove(this.terrain);
    this.terrain.geometry.dispose();
    (this.terrain.material as THREE.Material).dispose();
    this.terrain = createTerrain(biome);
    this.scene.add(this.terrain);

    // Rebuild environment props
    if (this.desertEnvGroup) {
      this.scene.remove(this.desertEnvGroup);
      this.desertEnvGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
    }
    this.desertEnvGroup = createDesertEnvironment(this.scene, this.terrain, biome);

    // Update lighting
    this.ambientLight.color.setHex(biome.ambientColor);
    this.ambientLight.intensity = biome.ambientIntensity;
    this.hemiLight.color.setHex(biome.hemiSkyColor);
    this.hemiLight.groundColor.setHex(biome.hemiGroundColor);
    this.hemiLight.intensity = biome.hemiIntensity;
    this.sunLight.color.setHex(biome.sunColor);
    this.sunLight.intensity = biome.sunIntensity;

    // Update sky / fog
    const sky = new THREE.Color(biome.skyColor);
    this.scene.background = sky;
    this.renderer.setClearColor(sky, 1);
    this.baseBgColor.setHex(biome.skyColor);
    this.stressColor.setHex(biome.stressColor);

    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.setHex(biome.fogColor);
    }

    // Update bloom
    if (this.postfx) {
      (this.postfx as any).bloomPass.strength = biome.bloomStrength;
      (this.postfx as any).bloomPass.radius = biome.bloomRadius;
      (this.postfx as any).bloomPass.threshold = biome.bloomThreshold;
    }
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
    this.teardownTierExtras();
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
        // Close any open overlay first, in priority order
        if (this.pilotClassPanel?.isVisible()) {
          this.pilotClassPanel.hide();
          return;
        }
        if (this.mutatorPanel.isVisible()) {
          this.mutatorPanel.hide();
          return;
        }
        if (this.onlineLeaderboard.isVisible()) {
          this.onlineLeaderboard.hide();
          return;
        }
        if (this.upgradeShop.isVisible()) {
          // UpgradeShop handles its own close
          return;
        }
        if (this.leaderboard.isVisible()) {
          return;
        }
        if (this.settingsMenu.isVisible()) {
          this.settingsMenu.hide();
        } else if (this.outcome === "playing") {
          this.settingsMenu.show();
        }
        return;
      }

      // Handle shop/leaderboard/mutator closures
      if (this.upgradeShop.isVisible() || this.leaderboard.isVisible() || this.mutatorPanel.isVisible() || this.onlineLeaderboard.isVisible() || this.pilotClassPanel?.isVisible()) return;
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
        if (this.mutatorPanel.isVisible()) {
          this.mutatorPanel.hide();
        } else {
          this.statsScreen.hide();
          this.mutatorPanel.show();
        }
        return;
      }
      if (e.code === "KeyD") {
        // Daily challenge
        this.beginDailyChallenge();
        return;
      }
      if (e.code === "KeyP") {
        this.pilotClassPanel.toggle();
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

    const biome = getBiomeTheme(this.variantIndex);
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = this.baseFogNear;
      fog.far = this.baseFogFar;
      fog.color.setHex(biome.fogColor);
    }
    (this.scene.background as THREE.Color).setHex(biome.skyColor);
    this.renderer.setClearColor(this.scene.background as THREE.Color, 1);
    this.baseBgColor.setHex(biome.skyColor);
    this.stressColor.setHex(biome.stressColor);

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

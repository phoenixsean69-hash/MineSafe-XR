# MineSafe XR

**MineSafe XR** is a desktop-first prototype for mine safety training, emergency drills and incident reconstruction.

This repository currently contains a focused demonstration build for the MineTech Innovation Challenge 2026. The prototype intentionally uses **simulated training data** and does not represent a live mine safety system.

## Demo flow

The first scenario demonstrates an underground fire drill:

1. Normal operations in a simple 3D mine environment.
2. A simulated fire is triggered near a loader bay.
3. The primary escape route becomes compromised.
4. The trainee is redirected toward an alternate refuge route.
5. Decisions and response events are captured for debriefing.

This illustrates MineSafe XR's proposed **incident-to-training loop**: mine incidents, near-misses and operational conditions can be turned into interactive safety scenarios, then replayed for learning and preparedness.

## Run in VS Code

```bash
git clone https://github.com/phoenixsean69-hash/MineSafe-XR.git
cd MineSafe-XR
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Tech stack

- React + TypeScript
- Vite
- Three.js via React Three Fiber
- Drei helpers
- Lucide icons

## Prototype scope

The current version is a desktop application prototype. Planned future work includes mine-specific scene import, richer hazard simulation, drill authoring, incident replay, sensor integration and an augmented-reality extension for spatial hazard visualisation in real mine environments.

## Safety note

MineSafe XR is currently a research and training prototype. It must not be treated as a certified safety, evacuation, gas-monitoring or emergency-response system.

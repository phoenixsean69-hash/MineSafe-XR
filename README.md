# MineSafe XR

MineSafe XR is a local, instructor-led mine emergency training application. It connects incident records, scenario authoring, trainee registration, a controlled 3D drill, debriefing and reports. The interface follows the graphite workspace theme: raised primary actions, neutral secondary actions and flat, centred utility controls.

## Start the supplied build on Windows

The update includes a built application. Node.js 20 or newer is required; npm downloads are not needed to run the supplied build.

Open PowerShell in the project folder:

```powershell
npm start
```

Or double-click `Start-MineSafe.cmd`. Open **http://localhost:5173** if the browser does not open automatically. Keep the terminal window open; press Ctrl+C to stop the server. If port 5173 is occupied, stop the earlier Vite or MineSafe server first.

Use the same browser, profile and address each time. Browser storage belongs to the address: `localhost:5173` and `127.0.0.1:5173` have separate workspaces. Export a backup from the old address and import it at the new address when moving between them.

## Working screens

| Screen | What it does |
| --- | --- |
| Drill | Assign participants, run or pause a drill, enter trainee decisions, move through connected waypoints, introduce route changes and mark independent instructor observations. |
| Scenario Setup | Author and validate a draft, configure hazards, timing, starting point, route withdrawal, required actions and scoring; preview it and save a ready version. |
| Debrief | Replay the saved event timeline, inspect movement and decisions, save notes, export a session and create a follow-up draft from saved learning points. |
| Scenario Library | Search ready, draft or archived scenarios; customise built-ins, edit, duplicate, archive, import/export a scenario and reopen saved drill history. |
| Incidents | Record an incident or near miss, its source and lessons; review, edit, archive and turn it into a linked training draft. |
| Trainees | Register people with employee numbers and departments, edit or deactivate records and inspect their drill history. |
| Reports | Filter recorded drills by participant, scenario, status or date; inspect outcomes, export CSV and print a report. |
| Settings | Set instructor and display defaults, export the workspace, validate and merge backups and request persistent browser storage. |

The File, Edit, Scenario, View, Playback and Help menus provide shortcuts to these same operations.

## Run the complete training workflow

1. Add real participants in **Trainees**. Employee numbers must be unique when supplied.
2. Record an incident in **Incidents**, then choose **Create drill**. Its description, reference and learning points are copied into a new draft. Alternatively customise a built-in scenario in **Scenario Library**.
3. In **Scenario Setup**, write the brief and learning objectives. Configure the event times, time limit, starting point, withdrawn primary sections, movement speed and assessment actions. Save as ready. The editor rejects a starting point disconnected from the refuge after the closure.
4. Open **Assign & run**, enter the instructor, select the participants and choose manual or timed scenario events. Prepare or start the drill. Previewing a scenario never records drill activity.
5. On **Drill**, use the trainee action controls to identify the hazard, raise the alarm and reject a withdrawn route. The instructor records the trainee's input through these controls.
6. Choose a connected waypoint in the right panel or in the 3D view. Keys **1–4** select the corresponding destination while the drill is running and focus is outside a form field. Movement takes time. A withdrawn-route attempt is stopped, logged and penalised.
7. In manual mode, **Next event** withdraws Route A and then introduces the alternate-route cue. Timed mode uses the scenario's configured active-time schedule. The alternate physical path remains available in the layout; the cue is an instructor presentation event, not an automatic completion command.
8. Mark **Observations** only for behaviour the instructor observes. These checkboxes do not award points. Pause/resume freezes both the active clock and movement. Leaving the Drill page pauses a running drill.
9. Completion requires actual refuge arrival and all configured trainee actions. Ending early or reaching the time limit retains incomplete objectives. **Debrief** opens when the drill ends.
10. Inspect the replay, save learning notes, export the record and create a follow-up draft when needed. Use **Reports** for the saved results.

A drill can include several participants, but it has one shared trainee marker and one shared action record. For individual assessment, run one session per trainee.

## Assessment and records

- A session snapshots the scenario version, participants and instructor at preparation. Later edits do not rewrite its history.
- The drill score is the percentage of configured required actions completed, minus the configured penalty for each withdrawn-route attempt, clamped to 0–100. It is an exercise score based on entered actions, not an independent measurement of competence.
- Refuge arrival is recorded by movement through the layout. Advancing the scenario or marking an observation cannot fabricate it.
- Session events retain their active-time timestamps. Paused time is excluded. Timed events are processed in order even when a browser tab delays the timer.
- Replay is read-only; its cursor, speed and camera do not alter the saved session. Debrief notes are the editable part of the review.
- Saved sessions have no artificial 12-record cap. Retention is limited by browser storage capacity.
- Data is stored in IndexedDB on this computer. Running sessions are checkpointed every second and reopen paused at the latest saved checkpoint. Wait for **Saved on this device** before closing after an edit.
- Concurrent browser windows cannot silently overwrite each other's saves. A conflicting window displays a save error and offers backup/reload actions. Use one editing window.
- Earlier `minesafe.workspace.v1` data is carried forward on first use of the new database at the same address. Original records are retained inside the converted records and the original local-storage entry is not deleted. Earlier instructor-only records have no calculated trainee score.

## Back up or transfer records

In **Settings**, choose **Download workspace backup**. On another computer or browser, start the app and choose **Import workspace backup**. The preview shows the number of records that can be added. Existing IDs and employee numbers are preserved; import adds new records without replacing existing ones. Imported active drills open paused.

Scenario JSON and individual session JSON are useful for sharing a scenario or reviewing a record. Use a **workspace backup** to transfer the full history. CSV exports quote text and neutralise spreadsheet formula prefixes.

Clearing site data or using a temporary/private browser profile can remove local records. Keep exported backups of records you need to retain. A visible save failure means the current changes are not safely persisted; export a backup before closing that window.

## View controls and assets

Orbit, Pan and Zoom select the left-drag camera action. Right-drag pans; the mouse wheel zooms. **Frame scene** resets the camera; **Follow trainee** tracks the marker. Object-tree selections retarget the scene. Route guidance, labels, warning banner, viewport grid and display mode are configurable.

Icons, fonts and lighting are bundled. The app makes no external asset requests during normal operation. The DejaVu Sans font license is included in `public/FONT_LICENSE.txt` and the built application.

## Development

```powershell
npm ci
npm run dev
```

After changing source files, create the next production build:

```powershell
npm test
npm run build
npm start
```

Stop the development server before using `npm start`; both use port 5173. The code uses React, TypeScript, Vite, Three.js, React Three Fiber, Drei and Lucide. The local launcher uses Node's built-in HTTP server and binds to the loopback interface.

Tests cover timing, connected movement, blocked routes, real completion, independent observations, replay immutability, scenario snapshots, migration, backup validation/merging, CSV handling and the local server's file boundary. Browser workflow checks were also run for incident-to-drill authoring, assignment, evacuation, debrief, reports, export/import and reload persistence.

## Current scope

This is a single-workstation training system with local records. Fire, fall-of-ground and ventilation scenarios share a predefined training layout. Area names are record labels; they do not load a mine's geometry. Route withdrawal and trainee movement follow that layout's graph. Simulated airflow and visibility are scenario values.

VR/AR headset support, first-person navigation, imported mine geometry, live sensors, networked multi-user sessions and organisational sign-in are not included. MineSafe XR does not supply live mine monitoring or emergency directions.

import {
  Shield, ShieldCheck, TriangleAlert, Flame, Mountain, Wind, ChevronDown, ChevronRight,
  FolderOpen, UserRound, Factory, Route, House, Search, EllipsisVertical, Ellipsis,
  Layers, Grid2X2, Circle, Box, Mouse, Hand, ZoomIn, Move, RotateCw, Scan,
  Play, Pause, RotateCcw, ChevronsLeft, ChevronsRight, SkipBack, SkipForward,
  Info, X, SlidersHorizontal, MapPin, Users, ClipboardCheck, Package, GitBranch,
  Download, CircleCheck, CircleHelp,
  Save, Plus, Pencil, Archive, Upload, FileText, BarChart3, Settings, Trash2, ArrowRight, Footprints, Flag, Check, Clock, Printer, Copy, ArrowLeft, Bell,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  shield: Shield, verified_user: ShieldCheck, health_and_safety: ShieldCheck, warning: TriangleAlert,
  local_fire_department: Flame, landslide: Mountain, air: Wind, expand_more: ChevronDown,
  chevron_right: ChevronRight, folder_open: FolderOpen, person: UserRound, precision_manufacturing: Factory,
  route: Route, timeline: Route, block: X, meeting_room: House, search: Search, more_vert: EllipsisVertical, more_horiz: Ellipsis,
  layers: Layers, grid_4x4: Grid2X2, grid_on: Grid2X2, circle: Circle, view_in_ar: Box,
  deployed_code: Box, mouse: Mouse, pan_tool: Hand, zoom_in: ZoomIn, near_me: Move,
  open_with: Move, rotate_right: RotateCw, filter_center_focus: Scan, play_arrow: Play, pause: Pause,
  restart_alt: RotateCcw, replay: RotateCcw, first_page: ChevronsLeft, last_page: ChevronsRight,
  skip_previous: SkipBack, skip_next: SkipForward, info: Info, close: X, tune: SlidersHorizontal,
  location_on: MapPin, group: Users, fact_check: ClipboardCheck, inventory_2: Package,
  account_tree: GitBranch, download: Download, check_circle: CircleCheck, radio_button_unchecked: Circle,
  add_alert: TriangleAlert, orbit: RotateCw,
  save: Save, add: Plus, edit: Pencil, archive: Archive, upload: Upload, file: FileText,
  bar_chart: BarChart3, settings: Settings, trash: Trash2, arrow: ArrowRight, walk: Footprints,
  flag: Flag, check: Check, clock: Clock, print: Printer, copy: Copy, back: ArrowLeft, bell: Bell,
}
export default function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  const Symbol = icons[name] ?? CircleHelp
  return <Symbol className="app-icon" aria-hidden="true" size="1em" strokeWidth={filled ? 2.2 : 1.8} />
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
  Trash2,
  Pencil,
  CalendarDays,
  GripVertical,
  TrendingUp,
  Target,
  CheckCircle2,
  Zap,
  Users,
  BarChart3,
  UserPlus,
  Wallet,
  AlertTriangle,
  ShieldAlert,
  LifeBuoy,
  Sparkles,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  currentWeekId,
  formatDKK,
  nextWeek,
  prevWeek,
  weekRangeLabel,
  type WeekId,
} from "@/lib/week";
import { getSalesColor, initials, SALES_COLORS } from "@/lib/sales-colors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Weekly Sales Forecast" },
      { name: "description", content: "Shared weekly MRR forecast tracker per salesperson." },
    ],
  }),
  component: ForecastPage,
});

type Salesperson = { id: string; name: string; sort_order: number; color_index: number };
type ForecastRow = { id: string; name: string; sort_order: number };
type ForecastField = {
  id: string;
  label: string;
  field_type: "number" | "text";
  sort_order: number;
  row_id: string | null;
};
type ForecastEntry = {
  id: string;
  salesperson_id: string;
  field_id: string;
  year: number;
  week: number;
  value_number: number | null;
  value_text: string | null;
};

function iconForField(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (l.includes("commit")) return Target;
  if (l.includes("best")) return TrendingUp;
  if (l.includes("closed")) return CheckCircle2;
  if (l.includes("expected") && l.includes("close")) return Zap;
  if (l.includes("current onlines")) return Users;
  if (l.includes("new onlines")) return UserPlus;
  if (l.includes("expected")) return BarChart3;
  if (l.includes("pipeline gap")) return AlertTriangle;
  if (l.includes("pipeline")) return Wallet;
  if (l.includes("risk")) return ShieldAlert;
  if (l.includes("help")) return LifeBuoy;
  return Sparkles;
}

function ForecastPage() {
  const [week, setWeek] = useState<WeekId>(() => currentWeekId());
  const [activeSalesperson, setActiveSalesperson] = useState<string | null>(null);

  const qc = useQueryClient();

  const salespeopleQ = useQuery({
    queryKey: ["salespeople"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salespeople")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as Salesperson[];
    },
  });

  const rowsQ = useQuery({
    queryKey: ["forecast_rows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_rows")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as ForecastRow[];
    },
  });

  const fieldsQ = useQuery({
    queryKey: ["fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_fields")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as ForecastField[];
    },
  });

  const entriesQ = useQuery({
    queryKey: ["entries", week.year, week.week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_entries")
        .select("*")
        .eq("year", week.year)
        .eq("week", week.week);
      if (error) throw error;
      return data as ForecastEntry[];
    },
  });

  useEffect(() => {
    if (!activeSalesperson && salespeopleQ.data?.length) {
      setActiveSalesperson(salespeopleQ.data[0].id);
    }
    if (
      activeSalesperson &&
      salespeopleQ.data &&
      !salespeopleQ.data.find((s) => s.id === activeSalesperson)
    ) {
      setActiveSalesperson(salespeopleQ.data[0]?.id ?? null);
    }
  }, [salespeopleQ.data, activeSalesperson]);

  const entryMap = useMemo(() => {
    const m = new Map<string, ForecastEntry>();
    entriesQ.data?.forEach((e) => m.set(`${e.salesperson_id}:${e.field_id}`, e));
    return m;
  }, [entriesQ.data]);

  const saveEntry = useMutation({
    mutationFn: async (args: {
      salespersonId: string;
      field: ForecastField;
      value: string;
    }) => {
      const { salespersonId, field, value } = args;
      const row = {
        salesperson_id: salespersonId,
        field_id: field.id,
        year: week.year,
        week: week.week,
        value_number: field.field_type === "number" ? (value === "" ? null : Number(value)) : null,
        value_text: field.field_type === "text" ? (value === "" ? null : value) : null,
      };
      const { error } = await supabase
        .from("forecast_entries")
        .upsert(row, { onConflict: "salesperson_id,field_id,year,week" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", week.year, week.week] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const activePerson = salespeopleQ.data?.find((s) => s.id === activeSalesperson) ?? null;
  const activeColor = activePerson ? getSalesColor(activePerson.color_index) : null;

  return (
    <div className="min-h-screen bg-background">
      <HeroHeader
        week={week}
        onPrev={() => setWeek(prevWeek(week))}
        onNext={() => setWeek(nextWeek(week))}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="relative z-10 mt-6 rounded-2xl border bg-card p-4 shadow-[var(--shadow-elegant)] sm:p-5">
          <SalespeopleTabs
            people={salespeopleQ.data ?? []}
            active={activeSalesperson}
            onSelect={setActiveSalesperson}
          />
        </section>

        {activePerson && activeColor && (
          <section
            className="mt-6 flex flex-col gap-4 rounded-2xl border p-5 shadow-[var(--shadow-elegant)] sm:flex-row sm:items-center sm:justify-between"
            style={{
              backgroundColor: activeColor.soft,
              borderColor: `${activeColor.solid}33`,
            }}
          >
            <div className="flex items-center gap-4">
              <Avatar person={activePerson} size={56} ring />
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: activeColor.solid }}
                >
                  Forecasting for
                </p>
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {activePerson.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  Week {week.week} · {weekRangeLabel(week)}
                </p>
              </div>
            </div>
            <ManageFieldsDialog fields={fieldsQ.data ?? []} rows={rowsQ.data ?? []} />
          </section>
        )}

        {activePerson && activeColor && (
          <RowsBoard
            rows={rowsQ.data ?? []}
            fields={fieldsQ.data ?? []}
            activePerson={activePerson}
            accent={activeColor.solid}
            entryMap={entryMap}
            onSaveEntry={(field, value) =>
              saveEntry.mutate({ salespersonId: activePerson.id, field, value })
            }
          />
        )}

        {!activePerson && (
          <section className="mt-6">
            <EmptyState
              title="No salespeople yet"
              body='Use "+ Add salesperson" above to create the first one. Each person gets their own color.'
            />
          </section>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Industrial vacation weeks 29, 30 and 31 are skipped automatically.
        </footer>
      </main>
    </div>
  );
}

function HeroHeader({
  week,
  onPrev,
  onNext,
}: {
  week: WeekId;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <header
      className="relative overflow-hidden text-[color:var(--cream)]"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-gold)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-10 pb-12 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pt-14 sm:pb-14">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">
            <span className="inline-block h-px w-6 bg-[color:var(--gold)]" />
            Weekly Sales Forecast
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-[color:var(--cream)] sm:text-5xl">
            Pipeline & MRR <span className="italic text-[color:var(--gold)]">Tracker</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-[color:var(--cream)]/70">
            One shared place for the team's weekly commit, best-case, and pipeline gap.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            aria-label="Previous week"
            className="text-[color:var(--cream)] hover:bg-white/10 hover:text-[color:var(--cream)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-[210px] flex-col items-center px-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <CalendarDays className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              <span>
                Week <span className="text-[color:var(--gold)]">{week.week}</span> · {week.year}
              </span>
            </div>
            <div className="text-xs tabular-nums text-[color:var(--cream)]/70">
              {weekRangeLabel(week)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            aria-label="Next week"
            className="text-[color:var(--cream)] hover:bg-white/10 hover:text-[color:var(--cream)]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Avatar({
  person,
  size = 28,
  ring = false,
}: {
  person: Salesperson;
  size?: number;
  ring?: boolean;
}) {
  const c = getSalesColor(person.color_index);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold leading-none"
      style={{
        width: size,
        height: size,
        backgroundColor: c.solid,
        color: c.fg,
        fontSize: Math.round(size * 0.4),
        boxShadow: ring ? `0 0 0 3px ${c.soft}, 0 4px 12px -4px ${c.solid}66` : undefined,
      }}
    >
      {initials(person.name) || "?"}
    </span>
  );
}

function SalespeopleTabs({
  people,
  active,
  onSelect,
}: {
  people: Salesperson[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Salesperson | null>(null);
  const [editName, setEditName] = useState("");

  const nextColorIndex = useMemo(() => {
    const max = people.reduce((m, p) => Math.max(m, p.color_index), -1);
    return (max + 1) % SALES_COLORS.length;
  }, [people]);

  const addM = useMutation({
    mutationFn: async (name: string) => {
      const sort_order = (people.at(-1)?.sort_order ?? 0) + 10;
      const { data, error } = await supabase
        .from("salespeople")
        .insert({ name, sort_order, color_index: nextColorIndex })
        .select()
        .single();
      if (error) throw error;
      return data as Salesperson;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["salespeople"] });
      onSelect(row.id);
      setAddOpen(false);
      setName("");
      toast.success("Salesperson added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameM = useMutation({
    mutationFn: async (args: { id: string; name: string }) => {
      const { error } = await supabase
        .from("salespeople")
        .update({ name: args.name })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salespeople"] });
      setEditing(null);
      toast.success("Renamed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salespeople").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salespeople"] });
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {people.map((p) => {
        const isActive = p.id === active;
        const c = getSalesColor(p.color_index);
        return (
          <div
            key={p.id}
            className="group flex items-center gap-1 rounded-full border p-1 pl-1.5 transition-all"
            style={{
              backgroundColor: isActive ? c.solid : c.soft,
              borderColor: isActive ? c.solid : `${c.solid}40`,
              color: isActive ? c.fg : "var(--foreground)",
              boxShadow: isActive ? `0 6px 18px -8px ${c.solid}80` : undefined,
            }}
          >
            <button
              onClick={() => onSelect(p.id)}
              className="flex items-center gap-2 rounded-full pr-2 text-sm font-semibold"
            >
              <Avatar person={p} size={26} />
              <span>{p.name}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full p-1 opacity-70 transition hover:opacity-100"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  }}
                  aria-label="Salesperson options"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(p);
                    setEditName(p.name);
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete ${p.name}? All their forecast data will be removed.`)) {
                      delM.mutate(p.id);
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-dashed border-2 bg-transparent"
          >
            <Plus className="mr-1 h-4 w-4" /> Add salesperson
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add salesperson</DialogTitle>
            <DialogDescription>
              They'll get a unique color and appear as a tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="sp-name">Name</Label>
            <Input
              id="sp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anna Larsen"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) addM.mutate(name.trim());
              }}
            />
            <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <span>Color:</span>
              <span
                className="inline-block h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: SALES_COLORS[nextColorIndex].solid }}
              />
              <span className="font-medium text-foreground">
                {SALES_COLORS[nextColorIndex].name}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => name.trim() && addM.mutate(name.trim())} disabled={!name.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename salesperson</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && editName.trim() && editing) {
                renameM.mutate({ id: editing.id, name: editName.trim() });
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editing &&
                editName.trim() &&
                renameM.mutate({ id: editing.id, name: editName.trim() })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldCard({
  field,
  entry,
  accent,
  onSave,
}: {
  field: ForecastField;
  entry: ForecastEntry | undefined;
  accent: string;
  onSave: (value: string) => void;
}) {
  const initial =
    field.field_type === "number"
      ? entry?.value_number != null
        ? String(entry.value_number)
        : ""
      : entry?.value_text ?? "";

  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, field.id]);

  const dirty = value !== initial;
  const Icon = iconForField(field.label);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1f`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <Label className="mt-1.5 flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {field.label}
        </Label>
      </div>

      <div className="mt-3">
        {field.field_type === "number" ? (
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => dirty && onSave(value)}
            placeholder="0"
            className="h-11 border-transparent bg-muted/50 text-xl font-bold tabular-nums focus-visible:border-[color:var(--gold)] focus-visible:bg-background"
          />
        ) : (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => dirty && onSave(value)}
            placeholder="Add notes…"
            rows={3}
            className="resize-none border-transparent bg-muted/50 focus-visible:border-[color:var(--gold)] focus-visible:bg-background"
          />
        )}
      </div>
      {field.field_type === "number" && value !== "" && !Number.isNaN(Number(value)) && (
        <div className="mt-2 text-xs font-semibold tabular-nums text-[color:var(--gold)]">
          {formatDKK(Number(value))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed bg-card/40 p-10 text-center">
      <div
        className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
      >
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ManageFieldsDialog({
  fields,
  rows,
}: {
  fields: ForecastField[];
  rows: ForecastRow[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"number" | "text">("number");
  const [newRowId, setNewRowId] = useState<string>("");

  useEffect(() => {
    if (!newRowId && rows[0]) setNewRowId(rows[0].id);
  }, [rows, newRowId]);

  const addM = useMutation({
    mutationFn: async (args: {
      label: string;
      field_type: "number" | "text";
      row_id: string | null;
    }) => {
      const sort_order = (fields.at(-1)?.sort_order ?? 0) + 10;
      const { error } = await supabase
        .from("forecast_fields")
        .insert({
          label: args.label,
          field_type: args.field_type,
          sort_order,
          row_id: args.row_id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields"] });
      setNewLabel("");
      toast.success("Field added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: async (args: { id: string; patch: Partial<ForecastField> }) => {
      const { error } = await supabase
        .from("forecast_fields")
        .update(args.patch)
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fields"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forecast_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Field removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const a = fields[idx];
    const b = fields[idx + dir];
    if (!a || !b) return;
    updateM.mutate({ id: a.id, patch: { sort_order: b.sort_order } });
    updateM.mutate({ id: b.id, patch: { sort_order: a.sort_order } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 bg-card/60 backdrop-blur">
          <Settings2 className="mr-1.5 h-4 w-4" /> Manage fields
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Manage forecast fields</DialogTitle>
          <DialogDescription>
            Add, rename, reorder, or remove the blocks shown on every week.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {fields.map((f, i) => (
            <FieldRow
              key={f.id}
              field={f}
              isFirst={i === 0}
              isLast={i === fields.length - 1}
              onRename={(label) => updateM.mutate({ id: f.id, patch: { label } })}
              onChangeType={(field_type) => updateM.mutate({ id: f.id, patch: { field_type } })}
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
              onDelete={() => delM.mutate(f.id)}
            />
          ))}
        </div>

        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <Label className="text-xs">Add new field</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Field label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as "number" | "text")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                newLabel.trim() && addM.mutate({ label: newLabel.trim(), field_type: newType })
              }
              disabled={!newLabel.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  field,
  isFirst,
  isLast,
  onRename,
  onChangeType,
  onUp,
  onDown,
  onDelete,
}: {
  field: ForecastField;
  isFirst: boolean;
  isLast: boolean;
  onRename: (label: string) => void;
  onChangeType: (t: "number" | "text") => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(field.label);
  useEffect(() => setLabel(field.label), [field.label]);

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
      <div className="flex flex-col">
        <button
          onClick={onUp}
          disabled={isFirst}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move up"
        >
          <ChevronLeft className="h-3 w-3 rotate-90" />
        </button>
        <button
          onClick={onDown}
          disabled={isLast}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move down"
        >
          <ChevronLeft className="h-3 w-3 -rotate-90" />
        </button>
      </div>
      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => label.trim() && label !== field.label && onRename(label.trim())}
        className="h-8 flex-1"
      />
      <Select value={field.field_type} onValueChange={(v) => onChangeType(v as "number" | "text")}>
        <SelectTrigger className="h-8 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="text">Text</SelectItem>
        </SelectContent>
      </Select>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{field.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              All values stored under this field — for every salesperson and every week — will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

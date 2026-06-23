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
} from "lucide-react";
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
  weekKey,
  weekRangeLabel,
  type WeekId,
} from "@/lib/week";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Weekly Sales Forecast" },
      { name: "description", content: "Shared weekly MRR forecast tracker per salesperson." },
    ],
  }),
  component: ForecastPage,
});

type Salesperson = { id: string; name: string; sort_order: number };
type ForecastField = {
  id: string;
  label: string;
  field_type: "number" | "text";
  sort_order: number;
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

  // Auto-select first salesperson
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Header
          week={week}
          onPrev={() => setWeek(prevWeek(week))}
          onNext={() => setWeek(nextWeek(week))}
          onToday={() => setWeek(currentWeekId())}
        />

        <div className="mt-8">
          <SalespeopleTabs
            people={salespeopleQ.data ?? []}
            active={activeSalesperson}
            onSelect={setActiveSalesperson}
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {activeSalesperson
              ? "Weekly forecast inputs"
              : "Add a salesperson to start forecasting"}
          </h2>
          <ManageFieldsDialog fields={fieldsQ.data ?? []} />
        </div>

        {activeSalesperson && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(fieldsQ.data ?? []).map((field) => {
              const entry = entryMap.get(`${activeSalesperson}:${field.id}`);
              return (
                <FieldCard
                  key={field.id}
                  field={field}
                  entry={entry}
                  onSave={(value) =>
                    saveEntry.mutate({ salespersonId: activeSalesperson, field, value })
                  }
                />
              );
            })}
            {fieldsQ.data && fieldsQ.data.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No forecast fields yet. Click <span className="font-medium">Manage fields</span> to
                add some.
              </div>
            )}
          </div>
        )}

        {!activeSalesperson && (
          <div className="mt-4 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No salespeople yet. Use the <span className="font-medium">+ Add salesperson</span>{" "}
            button above.
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Industrial vacation weeks 29, 30, 31 are skipped automatically.
        </footer>
      </div>
    </div>
  );
}

function Header({
  week,
  onPrev,
  onNext,
  onToday,
}: {
  week: WeekId;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Weekly Sales Forecast
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Pipeline & MRR Tracker
        </h1>
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-card p-1.5 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex min-w-[220px] flex-col items-center px-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            Week {week.week} · {week.year}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">{weekRangeLabel(week)}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday} className="ml-1">
          Today
        </Button>
      </div>
    </header>
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

  const addM = useMutation({
    mutationFn: async (name: string) => {
      const sort_order = (people.at(-1)?.sort_order ?? 0) + 10;
      const { data, error } = await supabase
        .from("salespeople")
        .insert({ name, sort_order })
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
        return (
          <div
            key={p.id}
            className={`group flex items-center gap-1 rounded-full border px-1 py-1 text-sm transition-colors ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            <button
              onClick={() => onSelect(p.id)}
              className="px-3 py-0.5 font-medium tabular-nums"
            >
              {p.name}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`rounded-full p-1 opacity-60 transition hover:opacity-100 ${
                    isActive ? "hover:bg-background/20" : "hover:bg-muted"
                  }`}
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
          <Button variant="outline" size="sm" className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Add salesperson
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add salesperson</DialogTitle>
            <DialogDescription>
              They'll appear as a tab. You can rename or remove them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
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
                editing && editName.trim() && renameM.mutate({ id: editing.id, name: editName.trim() })
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
  onSave,
}: {
  field: ForecastField;
  entry: ForecastEntry | undefined;
  onSave: (value: string) => void;
}) {
  const initial =
    field.field_type === "number"
      ? entry?.value_number != null
        ? String(entry.value_number)
        : ""
      : entry?.value_text ?? "";

  const [value, setValue] = useState(initial);

  // Reset when week/salesperson changes
  useEffect(() => {
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, field.id]);

  const dirty = value !== initial;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <Label className="text-xs font-medium text-muted-foreground">{field.label}</Label>
      <div className="mt-2">
        {field.field_type === "number" ? (
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => dirty && onSave(value)}
            placeholder="0"
            className="text-lg font-semibold tabular-nums"
          />
        ) : (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => dirty && onSave(value)}
            placeholder="Add notes…"
            rows={3}
          />
        )}
      </div>
      {field.field_type === "number" && value !== "" && !Number.isNaN(Number(value)) && (
        <div className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {formatDKK(Number(value))}
        </div>
      )}
    </div>
  );
}

function ManageFieldsDialog({ fields }: { fields: ForecastField[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"number" | "text">("number");

  const addM = useMutation({
    mutationFn: async (args: { label: string; field_type: "number" | "text" }) => {
      const sort_order = (fields.at(-1)?.sort_order ?? 0) + 10;
      const { error } = await supabase
        .from("forecast_fields")
        .insert({ label: args.label, field_type: args.field_type, sort_order });
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
        <Button variant="outline" size="sm">
          <Settings2 className="mr-1.5 h-4 w-4" /> Manage fields
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage forecast fields</DialogTitle>
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

        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
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
    <div className="flex items-center gap-2 rounded-md border bg-card p-2">
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
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

// Suppress unused-import warning for weekKey (kept for potential future use)
void weekKey;

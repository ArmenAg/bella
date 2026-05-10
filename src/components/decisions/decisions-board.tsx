import { strings, format as formatString } from "@/lib/strings";
import type { Decision } from "@/server/contracts";
import { DecisionCard } from "./decision-card";

const ACTIVE: Decision["status"][] = ["open"];
const WAITING: Decision["status"][] = [
  "waiting_on_test",
  "waiting_on_clinician",
  "revisiting",
];
const RESOLVED: Decision["status"][] = ["decided", "rejected"];

interface ColumnProps {
  title: string;
  decisions: Decision[];
}

function Column({ title, decisions }: ColumnProps) {
  const countTemplate =
    decisions.length === 1
      ? strings.decisions.list.groupCount
      : strings.decisions.list.groupCountPlural;
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded-md border border-border bg-card/30 p-3"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {formatString(countTemplate, { count: decisions.length })}
        </span>
      </header>
      {decisions.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border bg-background/40 px-2.5 py-2 text-xs text-muted-foreground">
          {strings.decisions.list.emptyGroup}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {decisions.map((decision) => (
            <li key={decision.id}>
              <DecisionCard
                decision={decision}
                href={`/decisions/${decision.id}/edit`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface DecisionsBoardProps {
  decisions: Decision[];
}

export function DecisionsBoard({ decisions }: DecisionsBoardProps) {
  const active = decisions.filter((d) => ACTIVE.includes(d.status));
  const waiting = decisions.filter((d) => WAITING.includes(d.status));
  const resolved = decisions.filter((d) => RESOLVED.includes(d.status));

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Column title={strings.decisions.groups.active} decisions={active} />
      <Column title={strings.decisions.groups.waiting} decisions={waiting} />
      <Column title={strings.decisions.groups.resolved} decisions={resolved} />
    </div>
  );
}

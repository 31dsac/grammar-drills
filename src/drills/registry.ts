import { ARTICLE_TYPES, ARTICLE_TYPE_NAMES, CASES, CASE_NAMES } from '../grammar/types';
import { CLASS_INFO, CONNECTOR_CLASSES } from '../grammar/connectors';
import * as adj from './adjective-endings/logic';
import { view as adjView } from './adjective-endings/view';
import * as conn from './connector-position/logic';
import { view as connView } from './connector-position/view';
import type { Drill } from './drill';

export const adjectiveEndings: Drill<adj.AdjItem> = {
  id: adj.DRILL_ID,
  title: 'Adjective endings',
  description: 'Fill in the ending from case, gender and article type.',
  stageNames: ['choose', 'type'],
  filters: [
    { key: 'case', label: 'Case', options: CASES.map((c) => ({ value: c, label: CASE_NAMES[c] })) },
    { key: 'type', label: 'Article', options: ARTICLE_TYPES.map((t) => ({ value: t, label: ARTICLE_TYPE_NAMES[t] })) },
  ],
  cells: adj.allCells,
  cellLabel: adj.cellLabel,
  generate: adj.generate,
  view: adjView,
};

export const connectorPosition: Drill<conn.ConnItem> = {
  id: conn.DRILL_ID,
  title: 'Connector position',
  description: 'Position 0, position 1, verb to the end, or after the verb?',
  stageNames: conn.STAGE_NAMES,
  filters: [
    {
      key: 'cls',
      label: 'Class',
      options: CONNECTOR_CLASSES.map((c) => ({ value: c, label: CLASS_INFO[c].name })),
    },
  ],
  cells: conn.allCells,
  cellLabel: conn.cellLabel,
  generate: conn.generate,
  view: connView,
};

export const DRILLS: readonly Drill<unknown>[] = [adjectiveEndings, connectorPosition];

export function findDrill(id: string): Drill<unknown> | undefined {
  return DRILLS.find((d) => d.id === id);
}

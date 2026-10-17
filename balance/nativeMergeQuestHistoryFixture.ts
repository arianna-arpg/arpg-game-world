/** The two W12 methods deliberately changed behavior. Only the historical read-tape course
 * receives their complete pinned 059a bodies; live owners and new W12 courses use the current exports. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {beforeNativeMergeSource} from './nativeMergeSourceFixture';
type Core=typeof import('../src/engine/nativeSceneQuestInteraction');
const sourceFile="src/engine/nativeSceneQuestInteraction.ts",predecessorHash="c911353d1bf949f6367d98cf12724c2d466fd7d7e95c669b0ca362ed9d3a120e";
const bodies=["function sceneQuestGiverStep(host:NativeSceneQuestInteractionHost,seat: Seat,dt: number):void {\n    host.withQuestHand(seat, () => {\n      if (!host.seatIdle(seat) || !host.nearAnyQuestGiver()) { host.questGiverDwells.delete(seat); return; }\n      const turnIns = host.pendingTurnIns();\n      const next = turnIns.length ? null : host.nextAcceptableQuest();\n      const leads = host.graphWorkAvailable() && host.odyssey.hasLocalLeads() && host.nearQuestGiver();\n      if (!turnIns.length && !next && !leads) { host.questGiverDwells.delete(seat); return; }\n      const t = (host.questGiverDwells.get(seat) ?? 0) + dt;\n      if (t < QUESTGIVER_DWELL) { host.questGiverDwells.set(seat, t); return; }\n      host.questGiverDwells.delete(seat);\n      const was = host.actingSeat;\n      host.actingSeat = seat; // THE ACTING SEAT: the linger is this seat's act (its party hears the news)\n      try {\n        if (leads) host.odyssey.localLeads();\n        if (turnIns.length) host.onQuestZoneCleared(turnIns[0]);\n        else if (next) host.acceptQuest(next);\n      } finally { host.actingSeat = was; }\n      host.journalDirty.add(seat.id); // THE JOURNAL ROW: the act re-ships at once\n    });\n  }","function sceneVocationMenuOffers(host:NativeSceneQuestInteractionHost):{\n    questId: string; vocationId: string; name: string; blurb: string; color: string;\n    className: string; ownClass: boolean; steps: number; offerLabel: string;\n    secret: boolean; flavor?: string;\n  }[] {\n    return host.vocationChoiceOffers().map(q => {\n      const v = VOCATIONS[q.vocation!];\n      return {\n        questId: q.id, vocationId: v.id, name: v.name, blurb: v.blurb, color: v.color,\n        className: CLASSES.find(c => c.id === v.classId)?.name ?? v.classId,\n        ownClass: v.classId === host.meta.classDef.id,\n        steps: v.quest.steps.length, offerLabel: q.offerLabel,\n        secret: v.secret !== undefined, flavor: v.secret?.offerFlavor,\n      };\n    });\n  }"];
export function nativeMergeQuestHistory(current:Core,bindings:Record<string,unknown>):Core {
 const source=fs.readFileSync(new URL('../'+sourceFile,import.meta.url),'utf8');
 const prior=beforeNativeMergeSource(sourceFile,source);
 assert.equal(createHash('sha256').update(prior).digest('hex'),predecessorHash,'whole exact 059a quest owner');
 const ast=ts.createSourceFile(sourceFile,prior,ts.ScriptTarget.Latest,true);
 const selected=ast.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&!!n.name&&["sceneQuestGiverStep","sceneVocationMenuOffers"].includes(n.name.text)).map(n=>n.getText(ast).replace(/^export /,''));
 assert.deepEqual(selected,bodies,'only two complete historical W12 bodies');
 const js=ts.transpileModule(bodies.join('\n')+'\nreturn {sceneQuestGiverStep,sceneVocationMenuOffers};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const historical=new Function(...Object.keys(bindings),js)(...Object.values(bindings));
 return {...current,...historical};
}

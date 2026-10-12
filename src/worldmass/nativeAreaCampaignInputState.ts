/** Native input ledgers follow their real campaign writer across area travel. */
import {isNativeWorld,type World} from '../engine/world';
const states=new WeakMap<World,NativeAreaCampaignInputState>();
export class NativeAreaCampaignInputState {
 readonly #writer:World;
 private constructor(writer:World){this.#writer=writer;}
 static forWriter(writer:World):NativeAreaCampaignInputState {if(!isNativeWorld(writer))throw Error('Native input requires its actual campaign writer');let state=states.get(writer);if(!state){state=new NativeAreaCampaignInputState(writer);states.set(writer,state);}return state;}
 get inputClock():World['inputClock']{return Reflect.get(this.#writer,'inputClock') as World['inputClock'];}
 set inputClock(value:World['inputClock']){if(!Reflect.set(this.#writer,'inputClock',value))throw new TypeError('Native input field is not writable: inputClock');}
 get lastInputSeq():World['lastInputSeq']{return Reflect.get(this.#writer,'lastInputSeq') as World['lastInputSeq'];}
 set lastInputSeq(value:World['lastInputSeq']){if(!Reflect.set(this.#writer,'lastInputSeq',value))throw new TypeError('Native input field is not writable: lastInputSeq');}
 get moveBudget():World['moveBudget']{return Reflect.get(this.#writer,'moveBudget') as World['moveBudget'];}
 set moveBudget(value:World['moveBudget']){if(!Reflect.set(this.#writer,'moveBudget',value))throw new TypeError('Native input field is not writable: moveBudget');}
 get spentPresses():World['spentPresses']{return Reflect.get(this.#writer,'spentPresses') as World['spentPresses'];}
 set spentPresses(value:World['spentPresses']){if(!Reflect.set(this.#writer,'spentPresses',value))throw new TypeError('Native input field is not writable: spentPresses');}
 get skillInputOrder():World['skillInputOrder']{return Reflect.get(this.#writer,'skillInputOrder') as World['skillInputOrder'];}
 set skillInputOrder(value:World['skillInputOrder']){if(!Reflect.set(this.#writer,'skillInputOrder',value))throw new TypeError('Native input field is not writable: skillInputOrder');}
 get noHeld():World['noHeld']{return Reflect.get(this.#writer,'noHeld') as World['noHeld'];}
 set noHeld(value:World['noHeld']){if(!Reflect.set(this.#writer,'noHeld',value))throw new TypeError('Native input field is not writable: noHeld');}
 get improvisedInst():World['improvisedInst']{return Reflect.get(this.#writer,'improvisedInst') as World['improvisedInst'];}
 set improvisedInst(value:World['improvisedInst']){if(!Reflect.set(this.#writer,'improvisedInst',value))throw new TypeError('Native input field is not writable: improvisedInst');}
 get improvisedHinted():World['improvisedHinted']{return Reflect.get(this.#writer,'improvisedHinted') as World['improvisedHinted'];}
 set improvisedHinted(value:World['improvisedHinted']){if(!Reflect.set(this.#writer,'improvisedHinted',value))throw new TypeError('Native input field is not writable: improvisedHinted');}
}

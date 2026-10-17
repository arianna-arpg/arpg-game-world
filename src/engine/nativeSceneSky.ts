/** Original native sky fold, shared by World and complete local area owners. */
import type {World} from './world';
import type {Vec2} from '../core/math';
import {skyOf} from '../data/zones';
import {radianceOf,radianceCondHeld,type RadianceCond} from '../world/radiance';
import type {WeatherFront} from '../world/weather';
import {eventFrontFor,type EventWeatherHost} from './eventWeather';
export interface NativeSceneSkyHost extends EventWeatherHost {
 readonly player:World['player']; readonly zone:World['zone'];
 readonly massRuntime:World['massRuntime']; readonly localZoneAt:World['localZoneAt'];
 readonly skyFront:World['skyFront'];
}

export function nativeSkyFront(host:NativeSceneSkyHost,pos: Vec2 = host.player.pos): WeatherFront | null {
    const mass = host.massRuntime;
    if (mass?.weather) return mass.weather.sample(mass.walk.at(pos.x,pos.y), host.localZoneAt(pos), pos);
    if (skyOf(host.zone) === 'sheltered') return null;
    // EVENT-PINNED WEATHER (engine/eventWeather.ts): a world event holding this
    // ground may pin its own front — a Demon Invasion's storm, an Incursion's
    // pall — folded here so EVERY consumer of the sky (wash, particles, veil,
    // radiance, wind, strikes, dress) reads one truth. Strongest wins: one sky
    // at a time reads clean, and a raging blizzard can still drown a young
    // storm's first minutes.
    const pinned = eventFrontFor(host, host.zone);
    const sky = host.sim.weather.sample(host.zone);
    return pinned && pinned.intensity >= (sky?.intensity ?? 0) ? pinned : sky;
  }

export function nativeRadiance(host:NativeSceneSkyHost): number {
    return radianceOf(host.time, host.skyFront()?.kind ?? null, skyOf(host.zone) === 'sheltered');
  }

export function nativeRadianceCondHeld(host:NativeSceneSkyHost,cond: RadianceCond | undefined): boolean {
    return radianceCondHeld(cond, host.time, host.skyFront()?.kind ?? null, skyOf(host.zone) === 'sheltered');
  }

/* Category paintings and small material emblems; individual skill art is reviewed separately. */
(function(){
  var scenes={
    skills:{title:'A spark becomes a weapon.',copy:'Find the power that makes you want to build another life.',src:'assets/art/collection/skills.webp',alt:'An elemental caster shapes fire, frost and lightning in a ruined courtyard'},
    supports:{title:'Change its nature.',copy:'Link an idea to another. Discover what your favorite skill can become.',src:'assets/art/collection/supports.webp',alt:'Three luminous crystals exchange threads of power above an ancient bronze socket'},
    uniques:{title:'Some treasures change everything.',copy:'A rare find. An unexpected property. A reason to take a different path.',src:'assets/art/collection/uniques.webp',alt:'A storied sword, ring and pendant rest in a candlelit cathedral reliquary'}
  };
  var paths={
    fire:'M24 5C29 16 40 19 36 32C32 43 13 44 10 31C7 21 18 17 16 10C23 15 24 21 21 26C28 23 29 16 24 5Z',
    cold:'M24 5V43M8 14L40 34M8 34L40 14M18 9L24 15L30 9M18 39L24 33L30 39M9 22L16 20L15 13M33 35L32 28L39 26M9 26L16 28L15 35M33 13L32 20L39 22',
    lightning:'M28 4L10 27H22L19 44L39 19H26Z',
    chaos:'M24 5C41 13 40 35 24 43C8 35 7 13 24 5ZM12 23C23 11 35 20 29 30C24 38 16 26 24 23',
    physical:'M30 6L40 16L18 35L10 38L13 30ZM10 26L23 39M9 39L5 43',
    support:'M24 4L41 15V33L24 44L7 33V15ZM24 4V21M7 15L24 25L41 15M24 25V44M7 33L24 21L41 33',
    unique:'M10 16L17 8H31L38 16L24 39ZM10 16H38M17 8L19 16L24 39L29 16L31 8'
  };
  function emblem(entry,type){
    var key=type==='skill'?(entry.damageTypes||[]).find(function(t){return Object.hasOwn(paths,t);}):type;
    key=Object.hasOwn(paths,key)?key:'physical';
    return '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="'+paths[key]+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  window.HWCollectionArt={scenes:scenes,emblem:emblem};
})();

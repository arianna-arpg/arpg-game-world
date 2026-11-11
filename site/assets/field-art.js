/* Atmospheric illustrations, not literal maps or gameplay screenshots. */
(function(){
  var root='assets/art/field-guide/';
  var tags={woods:['forest','grove','gloamwood','jungle','garden','farmland','field'],frost:['taiga','tundra'],ruins:['ruin','grave','ossuary','durance','manor','metropolis','courtland','downs'],sands:['desert','sepulcher','butteland'],marsh:['marsh','mycelia'],warband:['warfront'],highland:['highland','steppes','karst'],coast:['littoral','beach','isle'],cavern:['cavern','crystal'],volcanic:['volcanic','flame','rift','scald'],aether:['aether','aether_drift','aether_sanctum','aether_spires','aether_bastion','aether_civitas','aether_stream','aether_vesper','eldritch','soulway'],flesh:['flesh','caul']};
  var places={snowcrown:'frost',rime_gallery:'frost',frostmaw_hollow:'frost',mangrove_tangle:'marsh',fungal_hollow:'marsh',mire:'marsh',lone_crypt:'ruins',kings_barrow:'ruins',wyrm_barrow:'volcanic',rootways:'woods',spinney_hollow:'woods',hag_hollow:'marsh',arena_boss_kiln:'volcanic',arena_boss_ossuary:'ruins',arena_boss_sump:'marsh',leyline_nexus:'aether',drake_roost:'highland',formicary:'cavern',gleamhollow:'cavern',kilnhoard:'volcanic',bull_maze:'ruins',ordnance_yard:'warband',riddle_vault:'sands',sleepless_watch:'highland',steam_galleries:'cavern'};
  function resolve(kind,entry){
    var name='journal';
    if(kind==='biomes'){
      name=(Object.hasOwn(places,entry.id)?places[entry.id]:null)||Object.keys(tags).find(function(key){return tags[key].includes(entry.biomeTag);})||name;
    }else if(kind==='events'&&window.HWEventArt)return window.HWEventArt.resolve(entry.id)||root+'journal.webp';
    return root+name+'.webp';
  }
  window.HWFieldArt={resolve:resolve,fallback:root+'journal.webp'};
})();

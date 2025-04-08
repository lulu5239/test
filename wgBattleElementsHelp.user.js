// ==UserScript==
// @name         Waifugame battle elements help
// @namespace    http://tampermonkey.net/
// @version      2025-04-08
// @description  Instead of remembering all of the elemental advantages, this little script will display them where it's the most useful.
// @author       Lulu5239
// @match        https://waifugame.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waifugame.com
// @downloadURL  https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgBattleElementsHelp.user.js
// @updateURL    https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgBattleElementsHelp.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(async ()=>{
  //'use strict';

  let path = document.location.pathname
  if(path.startsWith("/index.php/")){
    path = path.slice(10)
  }

  // Wait for scripts to exist
  let ok; let p = new Promise(f=>{ok=f})
  let observer = new MutationObserver((mutations, obs) => {
    if (typeof(startCountdown)!=="undefined") {
      obs.disconnect();
      ok()
    }else if(path==="/battle"){ // Edit class before scripts runs
      for(let card of document.querySelectorAll(".showCardInfo")){
        card.classList.remove("showCardInfo")
        card.addEventListener("click", ()=>{
          let hp = card.parentElement.querySelector("center").innerText.split("\n")[1].slice(0,-4)
          showWaifuMenu({
            name:card.parentElement.dataset["tippy-content"],
            id:card.parentElement.dataset.anniemay,
            cardID:card.dataset.cardid,
            xpText:card.parentElement.querySelector("span").innerText,
            relXP:0,
            hpText:hp+"%",
            relHP:hp,
          }, true)
        })
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });
  await p
  
  let party = localStorage["y_WG-party"] && JSON.parse(localStorage["y_WG-party"])
  if(!party){
    party = localStorage["y_WG-party"] = {}
  }
  if(path==="/home"){
    let nowHere = []
    for(let card of document.querySelectorAll(".card[data-amid]")){
      nowHere.push(card.dataset["amid"])
      let c = party[card.dataset["amid"]]
      if(!c){
        c = party[card.dataset["amid"]] = {
          cardid:card.dataset["cardid"],
          element:null,
          name:card.dataset["nameonly"],
        }
      }
      delete c.lastSeen
      let level = +card.querySelector(".levelBadge").innerText.slice(3)
      if(c.level!==level){
        c.level = level
        delete c.stats
      }
    }
    for(let k in party){
      if(!nowHere.includes(k)){
        if(!party[k].lastSeen){
          party[k].lastSeen = +new Date()
        continue}
        if(+new Date()-party[k].lastSeen>24*3600000){ // 24 hours
          delete party[k]
        }
      }
    }
    localStorage["y_WG-party"] = JSON.stringify(party)
  }
  window.battleHelpVars = {party}
  if(!path.startsWith("/battle")){return}
  
  var advantages = `normal >< normal;fight > normal;light < normal;wind >> fight;bug <> fight;tech > fight;dark < fight;light < fight;fight << wind;earth <> wind;bug << wind;grass << wind;electric >> wind;ice > wind;fight < poison;poison <> poison;earth >> poison;bug < poison;blood < poison;psychic > poison;dark > poison;light >< poison;normal < earth;wind <> earth;poison <<< earth;metal >< earth;grass >> earth;fire <<< earth;water > earth;electric <<< earth;ice > earth;music < earth;normal > bug;fight <> bug;wind >>> bug;earth < bug;tech << bug;grass << bug;fire >>> bug;ice > bug;normal < metal;fight > metal;wind < metal;poison < metal;earth >< metal;bug < metal;metal <> metal;grass <<< metal;fire >> metal;water > metal;electric >> metal;psychic < metal;ice <<< metal;music > metal;tech > blood;grass > blood;fire > blood;water << blood;normal > tech;wind < tech;bug >>> tech;tech >< tech;fire < tech;water >>> tech;electric > tech;psychic > tech;ice < tech;music << tech;wind >> grass;poison > grass;earth << grass;bug >> grass;metal >> grass;tech < grass;grass <> grass;fire >> grass;electric < grass;ice > grass;earth >> fire;bug << fire;metal << fire;grass << fire;fire <> fire;water >> fire;ice << fire;blood >> water;tech << water;grass > water;water <> water;fire << water;electric > water;ice <> water;wind << electric;earth >> electric;metal << electric;electric <> electric;fight < psychic;bug > psychic;blood > psychic;psychic <> psychic;dark >> psychic;light > psychic;fight > ice;metal >> ice;fire >> ice;water <> ice;ice <> ice;music < ice;tech >> music;electric < music;normal < dark;psychic <<< dark;music > dark;dark <> dark;light >< dark;poison >< light;blood < light;dark >< light;light <> light`.split(";").map(e=>e.split(" "))
  var advantagesSymbols = {
    ">":{text:"More damage", good:1},
    ">>":{text:"Good", good:2},
    ">>>":{text:"Perfect", good:3},
    "!>":{text:"Less defense", good:-0.9},
    "<":{text:"Less damage", good:-1},
    "<<":{text:"Bad", good:-2},
    "<<<":{text:"Very bad", good:-3},
    "!<":{text:"More defense", good:0.9},
    "><":{text:"Both damages more", good:0},
    "<>":{text:"Both damages less", good:0},
  }
  var magicElements = ["grass","fire","water","electric","psychic","ice","music","dark","light"]
   
  if(path==="/battle"){
    let list = []
    for(let card of document.querySelectorAll("img.battle-card")){
      let element = card.parentElement.querySelector("p").innerText.split(", ").slice(-1)[0].toLowerCase()
      card.parentElement.querySelector("p").style.marginBottom="0px"
      let text = document.createElement("p")
      card.parentElement.appendChild(text)
      let max = -9
      for(let id in party){
        if(!party[id].element || party[id].lastSeen){continue}
        party[id].effect = advantagesSymbols[advantages.find(e=>e[0]===party[id].element && e[2]===element)?.[1] || "!"+advantages.find(e=>e[2]===party[id].element && e[0]===element)?.[1]]
        if(party[id].effect?.good>max){
          max = party[id].effect.good
        }
      }
      if(max>0){
        let best = Object.values(party).filter(c=>c.effect?.good===max)
        text.innerHTML = (best.length===1 ? `<span>${best[0].name}</span> is` : best.slice(0,-1).map(c=>`<span>${c.name}</span>`).join(", ")+` and <span>${best.slice(-1)[0].name}</span> are`)+" good"
      }else if(max===0){
        text.innerText = "You don't have any good animu against that opponent."
      }else if(max>-9){
        text.innerText = "All of your animus are bad against that opponent!"
      }else{
        text.style.display = "none"
      }
      let button = card.parentElement.parentElement.querySelector("a.btn")
      let battleID = button.href.split("/").slice(-1)[0]
      list.push({
        id:battleID,
        element,
        level:+card.parentElement.querySelector("span.bg-highlight").innerText.slice(3)
      })
      if(localStorage["y_WG-autoBattle"]){ // Experimental, enable if you want
        text.innerHTML += ` <button class="btn autoBattleButton">Auto</button>`
        text.querySelector(".autoBattleButton").addEventListener("click",()=>{
          if(localStorage["y_WG-autoBattle"]!=="all"){
            localStorage["y_WG-autoBattle"] = battleID
          }
          button.click()
        })
      }
    }
    localStorage["y_WG-battles"] = JSON.stringify(list)
    document.querySelector("#partyView").querySelector("p.font-italic").innerText = "You can heal your Animus from this page."
  return}
  
  let previousParty = party
  party = window.battleHelpVars.party = {}
  for(let card of initialSwapData){
    let c = previousParty[card.id]
    if(!c){
      c = previousParty[card.id] = {
        name:card.name,
        level:card.lvl,
      }
    }
    c.element = card.element?.toLowerCase()
    if(card.lvl!==c.level){
      c.level = card.lvl
      delete c.stats
    }
    party[card.id] = c
  }
  localStorage["y_WG-party"] = JSON.stringify(previousParty)
  window.battleHelpVars.auto = localStorage["y_WG-autoBattle"]===battleID || localStorage["y_WG-autoBattle"]==="all"
  
  let handleSwapParty = (cards=[])=>{
    for(let card of cards){
      party[card.id].hp = card.currentHP
      party[card.id].level = card.lvl
      party[card.id].id = card.id
    }
    document.querySelector("#swapForXPoption").dataset.card = Object.values(party).find(c=>c.level<120 && !c.receivingXP && c.hp>0 && (!c.stats || c.stats.SPD>fullStats.p2?.stats.SPD || c.level>fullStats.p2?.level))?.id || ""
    document.querySelector("#swapForXPoption").style.display = document.querySelector("#swapForXPoption").dataset.card ? "block" : "none"
  }
  let currentCard = party[initialSwapData.find(c=>document.querySelector("#player_name").innerText.startsWith(c.name))?.id]
  battleHelpVars.getCurrentCard = ()=>currentCard

  let fullStats = window.battleHelpVars.fullStats = {}
  let winText
  let lastSequenceData = {}
  let originalPlaySequence = playSequence
  playSequence = (...args)=>{
    for(let e of args[0]){
      if(e.a==="playerwin" && e.t==="player1"){
        let battles = localStorage["y_WG-battles"] && JSON.parse(localStorage["y_WG-battles"])
        if(!battles){continue}
        let i = battles.findIndex(b=>b.id===battleID)
        if(i>=0){
          battles.splice(i,1)
          localStorage["y_WG-battles"] = JSON.stringify(battles)
        }
        let lowest = Object.values(party).reduce((p,c)=>(c.level<p ? c.level : p),999)
        let battle = battles.filter(b=>b.level<lowest).slice(-1)[0] || battles.slice(-1)[0]
        if(!battle){continue}
        document.querySelector("#winner_block").insertAdjacentHTML("beforeend", `<button class="btn btn-secondary btn-block" id="btn_nextBattle"><i class="fas fa-sword"></i> Next ${window.battleHelpVars.auto ? "auto " : ""}battle<p style="margin-bottom:0px; color:#ccc; font-size:80%">${battle.element.slice(0,1).toUpperCase()+battle.element.slice(1)}, lv. ${battle.level}</p></button>`)
        document.querySelector("#btn_nextBattle").addEventListener("click", ()=>{
          if(window.battleHelpVars.auto){
            localStorage["y_WG-autoBattle"] = battle.id
          }
          document.location.href = "/battle/"+battle.id
        })
        if(localStorage["y_WG-autoBattle"]==="all" && winText?.includes("<br")){
          setTimeout(()=>{
            document.location.href = "/battle/"+battle.id
          }, 3000)
        }
      continue}
      if(e.a==="newhp" && e.t==="player1" && currentCard){
        currentCard.hp = e.p.abs
      continue}
      if(e.a==="faint"){
        window.battleHelpVars.usingBest = false
      continue}
      if(e.a==="narate" && winText===true){
        winText = e.p.text
      continue}
      if(e.a!=="debug"){continue}
      if(e.p.text.startsWith("DEBUG XP GAIN:")){
        for(let c of e.p.text.slice(e.p.text.indexOf("[")+1, e.p.text.indexOf("]")).split(";")){
          if(!party[c]){continue}
          party[c].receivingXP = true
        }
      }
      if(e.p.text==="Found next opponent: null"){
        winText = true
      }
      if(e.p.text.startsWith("p1{") || e.p.text.startsWith("p2 {") || e.p.text.startsWith("Found next opponent: {")){
        let stats = fullStats[e.p.text.startsWith("p1") ? "p1" : "p2"] = JSON.parse(e.p.text.startsWith("p1") ? e.p.text.slice(2) : e.p.text.startsWith("p2") ? e.p.text.slice(3).split("}").slice(0,-1).join("}")+"}" : e.p.text.slice(e.p.text.indexOf("{")))
        for(let p of ["moves", "special", "stats"]){
          stats[p] = JSON.parse(stats[p])
        }
        if(party[stats.id]){
          currentCard = party[stats.id]
          currentCard.receivingXP = true
          currentCard.stats = stats.stats
          handleSwapParty()
          // Store stats in party
          let previous = JSON.parse(localStorage["y_WG-party"])
          previous[stats.id].stats = stats.stats
          previous[stats.id].level = stats.level
          localStorage["y_WG-party"] = JSON.stringify(previous)
        }
        if(Object.keys(fullStats).length===2){
          showInventory({
            ...lastSequenceData,
            faked:true,
          })
        }
      }
    }
    setTimeout(()=>{
      if(busy){return}
      window.scrollTo(0, 185)
      if(!battleHelpVars.auto || document.querySelector("#action_block").style.display==="none"){return}
      if(document.querySelector("#swapForXPoption").dataset.card){
        document.querySelector("#btn_swapForXP").click()
      }else if(!window.battleHelpVars.usingBest || currentCard.hp<50 && currentCard.level<120){
        document.querySelector("#btn_swapToBest").click()
      }else{
        document.querySelector("#btn_bestMove").click()
      }
    },1000)
    return originalPlaySequence(...args)
  }
  let opponentElement = document.querySelector("#battle_view_opponent").style.backgroundImage.split("/").slice(-1)[0].split(".")[0]
  originalShowInventory = showInventory
  showInventory = (...args)=>{ // handleBattleAjax was a constant
    if(!args[0].faked){lastSequenceData = window.battleHelpVars.lastSequenceData = args[0]}
    if(fullStats.p1?.stats && fullStats.p1.level===currentCard.level){
      if(args[0].output){fullStats.p1.moves = currentCard.moves = args[0].output.move_data}
      if(!fullStats.p1.element && fullStats.p1.card?.element){fullStats.p1.element=fullStats.p1.card.element.toLowerCase()}
      let noPP = true
      for(let m in fullStats.p1.moves){
        let move = fullStats.p1.moves[m] = {...fullStats.p1.moves[m], ...args[0].output.moves_metadata[fullStats.p1.moves[m].m]}
        if(move.pp>0){noPP=false}
        let effect = advantages.find(a=>a[0]===move.elemental_type && a[2]===opponentElement)?.[1]
        move.estimatedDamage = move.power * fullStats.p1.stats[magicElements.includes(move.elemental_type) ? "SpATT" : "ATT"] / fullStats.p2.stats[magicElements.includes(move.elemental_type) ? "SpDEF" : "DEF"] * (move.elemental_type===fullStats.p1.element || move.elemental_type==="normal" ? 1.2 : 1) * (!effect ? 1 : effect.startsWith(">") ? 2 : 0.5) *0.52
      }
      if(noPP){currentCard.noPP = true}
    }
    if(args[0].faked){return}
    return originalShowInventory(...args)
  }
  
  let originalHandleSwapPlayer2 = handleSwapPlayer2
  handleSwapPlayer2 = (...args)=>{
    opponentElement = args[0].element?.toLowerCase()
    updateGoodness()
    return originalHandleSwapPlayer2(...args)
  }
  let originalHandleSwap = handleSwap
  handleSwap = (...args)=>{
    currentCard = Object.values(party).find(c=>c.name===args[0].name) // No better way...
    currentCard.receivingXP = true
    fullStats.p1 = {
      ...currentCard,
      moves:args[0].attacks,
    }
    currentCard.moves = args[0].attacks
    handleSwapParty(args[0].swap_party)
    showInventory({output:lastSequenceData.output, faked:true})
    let r = originalHandleSwap(...args)
    setTimeout(()=>{
      updateGoodness()
    },1000)
    return r
  }
  let actionSwapList = document.querySelector("#action_swap")
  //document.querySelector("#btn_swap").addEventListener("click", ()=>{
  var updateGoodness = window.battleHelpVars.updateGoodness = ()=>{
    for(let card of actionSwapList.children){
      let button = card.querySelector("button")
      let data = party[button.dataset.swapto]
      if(!data){continue}
      let text = button.querySelector(".elementInfo")
      if(!text){
        text = document.createElement("a")
        text.style = "display:block; corner-radius:2px"
        text.className = "elementInfo"
        button.appendChild(text)
      }
      let effect = advantagesSymbols[advantages.find(e=>e[0]===data.element && e[2]===opponentElement)?.[1] || "!"+advantages.find(e=>e[2]===data.element && e[0]===opponentElement)?.[1]]
      text.innerText = !effect ? "No advantage" : effect.text
      text.style.backgroundColor = !effect?.good ? "#0000" : effect.good>0 ? `#0${(5+Math.ceil(effect.good)*3).toString(16)}0${(5+Math.ceil(effect.good)*3).toString(16)}` : `#${(5+Math.floor(effect.good)*-3).toString(16)}00${(5+Math.floor(effect.good)*-3).toString(16)}`
      data.good = effect?.good || 0
    }
  }
  updateGoodness()
  let actionMenu = document.querySelector("#action_menu")
  actionMenu.insertAdjacentHTML("beforeend", `<div class="col-12 col-md-6 mb-2" id="swapForXPoption"><button id="btn_swapForXP" class="btn btn-block btn-secondary btn-sm"><i class="fas fa-exchange-alt"></i> Level up cards</button><div>`)
  party[initialSwapData[0].id].receivingXP = true
  actionMenu.querySelector("#btn_swapForXP").addEventListener("click", ()=>{
    let card = document.querySelector("#swapForXPoption").dataset.card
    if(!card){return}
    window.battleHelpVars.usingBest = false
    actionSwapList.querySelector(`button[data-swapto="${card}"]`).click()
  })
  actionMenu.insertAdjacentHTML("beforeend", `<div class="col-12 col-md-6 mb-2"><button id="btn_swapToBest" class="btn btn-block btn-secondary btn-sm"><i class="fas fa-exchange-alt"></i> Swap to best</button><div>`)
  actionMenu.querySelector("#btn_swapToBest").addEventListener("click", ()=>{
    let max
    for(let card of Object.values(party)){
      if(!card.hp || card.noPP){continue}
      card.goodATT = (card.good>0 ? card.good : 1/Math.abs(card.good-2)) * (card.stats?.[magicElements.includes(card.elemental) ? "SpATT" : "ATT"] || card.level*3 || 1)
      if(max===undefined || card.goodATT>max){max=card.goodATT}
    }
    let card = Object.values(party).filter(card=>card.goodATT===max && !card.noPP).sort((c1,c2)=>c2.hp-c1.hp)[0]
    if(card===currentCard){ // Couldn't find better way to identify the current card
      if(window.battleHelpVars.auto){
        return document.querySelector("#btn_bestMove").click()
      }
      return showErrorToast("Already using best card!")
    }
    window.battleHelpVars.usingBest = true
    actionSwapList.querySelector(`button[data-swapto="${card.id}"]`).click()
  })

  actionMenu.insertAdjacentHTML("beforeend", `<div class="col-12 col-md-6 mb-2"><button id="btn_bestMove" class="btn btn-block btn-secondary btn-sm"><i class="fas fa-sword"></i> Use best attack</button><div>`)
  actionMenu.querySelector("#btn_bestMove").addEventListener("click", ()=>{
    if(!currentCard.stats){document.location.reload()}
    let best; let canEnd
    for(let move of currentCard.moves){
      if(!move.pp){continue}
      if(!best){best=move; continue}
      if(move.estimatedDamage*0.95>fullStats.p2.hp){ // Try to end battle with a single move (doesn't cost PP)
        if(move.accuracy>=best.accuracy){
          best = move
        }
        canEnd = true
        continue
      }
      if(canEnd){continue}
      if(move.estimatedDamage > best.estimatedDamage){
        best = move
      }
    }
    if(!best){
      currentCard.noPP = true
      return actionMenu.querySelector("#btn_swapToBest").click() // Out of PP: use other card
    }
    document.querySelector(`button[data-attack="${best.m}"]`).click()
  })
  
  handleSwapParty(initialSwapData)
})();

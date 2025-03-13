// ==UserScript==
// @name         Waifugame battle elements help
// @namespace    http://tampermonkey.net/
// @version      2025-03-13
// @description  Instead of remembering all of the elemental advantages, this little script will display them where it's the most useful.
// @author       Lulu5239
// @match        https://waifugame.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waifugame.com
// @downloadURL  https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgBattleElementsHelp.user.js
// @updateURL    https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgBattleElementsHelp.user.js
// @grant        none
// ==/UserScript==

(function() {
  //'use strict';
  
  let party = localStorage["y_WG-party"] && JSON.parse(localStorage["y_WG-party"])
  if(!party){
    party = localStorage["y_WG-party"] = {}
  }
  if(document.location.pathname==="/home"){
    let nowHere = []
    for(let card of document.querySelectorAll(".card[data-amid]")){
      nowHere.push(card.dataset["amid"])
      if(!party[card.dataset["amid"]]){
        party[card.dataset["amid"]] = {
          cardid:card.dataset["cardid"],
          element:null,
          name:card.dataset["nameonly"],
        }
      }
    }
    for(let k in party){
      if(!nowHere.includes(k)){
        delete party[k]
      }
    }
    localStorage["y_WG-party"] = JSON.stringify(party)
  }
  if(!document.location.pathname?.startsWith("/battle")){return}
  
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
   
  if(document.location.pathname==="/battle"){
    for(let card of document.querySelectorAll(".battle-card")){
      let element = card.parentElement.querySelector("p").innerText.split(", ").slice(-1)[0].toLowerCase()
      card.parentElement.querySelector("p").style.marginBottom="0px"
      let text = document.createElement("p")
      card.parentElement.appendChild(text)
      let max = -9
      for(let id in party){
        if(!party[id].element){continue}
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
      }
    }
  return}
  
  let previousParty = party
  party = {}
  for(let card of initialSwapData){
    party[card.id] = {
      cardid:previousParty[card.id]?.cardid,
      element:card.element?.toLowerCase(),
      name:card.name,
    }
  }
  localStorage["y_WG-party"] = JSON.stringify(party)

  let handleSwapParty = cards=>{
    for(let card of cards){
      party[card.id].HP = card.currentHP
      party[card.id].level = card.lvl
      party[card.id].id = card.id
    }
    document.querySelector("#swapForXPoption").style.display = Object.values(party).find(c=>c.level<120 && !c.receivingXP) ? "block" : "none"
  }
  let currentCard = party[initialSwapData.find(c=>document.querySelector("#player_name").innerText.startsWith(c.name))?.id]
  
  let opponentElement = document.querySelector("#battle_view_opponent").style.backgroundImage.split("/").slice(-1)[0].split(".")[0]
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
    handleSwapParty(args[0].swap_party)
    let r = originalHandleSwap(...args)
    updateGoodness()
    return r
  }
  let actionSwapList = document.querySelector("#action_swap")
  //document.querySelector("#btn_swap").addEventListener("click", ()=>{
  var updateGoodness = ()=>{
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
    let card = Object.values(party).find(card=>card.level<120 && !card.receivingXP && card.hp>0)
    if(!card){return}
    actionSwapList.querySelector(`button[data-swapto="${card.id}"]`).click()
  })
  actionMenu.insertAdjacentHTML("beforeend", `<div class="col-12 col-md-6 mb-2"><button id="btn_swapToBest" class="btn btn-block btn-secondary btn-sm"><i class="fas fa-exchange-alt"></i> Swap to best</button><div>`)
  actionMenu.querySelector("#btn_swapToBest").addEventListener("click", ()=>{
    let max = -9
    for(let id in party){
      if(!party[id].hp){continue}
      if(party[id].good>max){max=party[id].good}
    }
    let card = Object.values(party).filter(card=>card.good===max).sort((c1,c2)=>c2.hp-c1.hp)[0]
    if(card===currentCard){return} // Couldn't find better way to identify the current card
    actionSwapList.querySelector(`button[data-swapto="${card.id}"]`).click()
  })
  handleSwapParty(initialSwapData)
})();

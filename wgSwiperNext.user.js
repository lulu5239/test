// ==UserScript==
// @name         Waifugame swiper next
// @namespace    http://tampermonkey.net/
// @version      2025-03-28
// @description  Move your cards to boxes from the swiper page.
// @author       Lulu5239
// @match        https://waifugame.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waifugame.com
// @downloadURL  https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgSwiperNext.user.js
// @updateURL    https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgSwiperNext.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

(async ()=>{
  //'use strict';

  let path = document.location.pathname
  if(path.startsWith("/index.php/")){
    path = path.slice(10)
  }

  if(path==="/swiper"){
    document.querySelector(".tinder--buttons").insertAdjacentHTML("beforeend",
      `<br><style>.swiperNextButton {
        display:inline-block;
        color:#fff;
        background-color:#111;
        padding:5px;
      }</style>` + [0,1,2,3,4].map(i=>
        `<div data-nextaction="${i}" class="swiperNextButton">${i===0 ? "Disenchant" : i===1 ? "Portfolio" : "Box "+(i-1)}</div>`
      ).join(" ")
    )
    
    let selected = 1
    let selectedOnce = null
    let getSelected = ()=>(selectedOnce===null ? selected : selectedOnce)
    let updateFlirtButton = ()=>{
      document.querySelector("#love .fa").className = "fa fa-"+(getSelected()===0 && document.querySelector(`.swiperNextButton[data-nextaction="0"]`).dataset.battlemode ? "swords" : "heart")
    }
    var colors = {
      selected:"7fa",
      selectedNotNow:"69b",
      selectedOnce:"c42",
    }
    for(let button of document.querySelectorAll(".swiperNextButton")){
      let i = +button.dataset.nextaction
      button.addEventListener("click", ()=>{
        if(selected===i){
          if(selectedOnce!==null){
            document.querySelector(`.swiperNextButton[data-nextaction="${selectedOnce}"]`).style.border = null
            selectedOnce = null
            button.style.border = "solid 3px #"+colors.selected
            updateFlirtButton()
          }
        return}
        if(selectedOnce===i){
          document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = null
          selected = i
          selectedOnce = null
          button.style.border = "solid 2px #"+colors.selected
        return}
        if(selectedOnce!==null){
          document.querySelector(`.swiperNextButton[data-nextaction="${selectedOnce}"]`).style.border = null
        }
        selectedOnce = i
        button.style.border = "solid 2px #"+colors.selectedOnce
        document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = "solid 2px #"+colors.selectedNotNow
        updateFlirtButton()
      })
      if(i===1){
        button.style.border = "solid 2px #"+colors.selected
      }
    }
    
    let cardActions = localStorage["y_WG-cardActions"] ? JSON.parse(localStorage["y_WG-cardActions"]) : {}
    let formations = localStorage["y_WG-formations"] ? JSON.parse(localStorage["y_WG-formations"]) : {}
    let formation = Object.values(formations).find(team=>team.selected)
    let charisma = formation?.charisma
    
    let originalPostServer = postServer
    postServer = (...args)=>{
      let card = $($('.tinder--card[data-encounterid=' + args[0] + ']')).data("data")
      let action = getSelected()
      if(selectedOnce!==null){
        document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = "solid 3px #"+colors.selected
        document.querySelector(`.swiperNextButton[data-nextaction="${selectedOnce}"]`).style.border = null
        selectedOnce = null
      }
      if(action===0 && args[1]==="😘" && charisma-7>card.card.rarity){
        args[1] = "👊"
      }
      let originalSuccessFn = args[2]
      return originalPostServer(...args.slice(0,2), data=>{
        if(data.result.includes(" Card (\u2116 ") && action!==1){
          cardActions[data.result.split(" Card (\u2116 ")[1].split(")")[0]] = action
          localStorage["y_WG-cardActions"] = JSON.stringify(cardActions)
          let words = data.result.split(" ")
          let xp = +words.slice(-3)[0]
          charisma = xp /(card.card.rarity+1) /30 /(words[1]==="Essence" ? 2 : 1)
          if(charisma!==formation.charisma){
            formation.charisma = charisma
            localStorage["y_WG-formations"] = JSON.stringify(formations)
          }
        }
        if(originalSuccessFn){return originalSuccessFn(data)}
      })
    }

    let originalApplyEncounterStyle = applyEncounterStyle
    applyEncounterStyle = (...args)=>{
      let data = $('.tinder--card:not(.removed)').first()?.data("data")
      if(data && charisma){
        let button = document.querySelector(`.swiperNextButton[data-nextaction="0"]`)
        button.dataset.battlemode = charisma-7>data.card.rarity ? true : ""
        button.innerText = button.dataset.battlemode ? document.querySelector(".btnBattle").innerText.slice(1) : "Disenchant"
        updateFlirtButton()
      }
      return originalApplyEncounterStyle(...args)
    }
  return}

  if(path==="/cards"){
    let actions = {}
    let cards = JSON.parse(localStorage["y_WG-cardActions"])
    for(let card of document.querySelectorAll("a.selectCard")){
      let id = JSON.parse(card.dataset.card).id
      if(cards[id]===undefined){continue}
      let action = cards[id]
      if(!actions[action]){actions[action]=[card.dataset.pivotselect]}
      else{actions[action].push(card.dataset.pivotselect)}
      card.querySelector(".fa-angle-right").insertAdjacentHTML("beforebegin",
        `<strong class="nextAction" style="margin-top:30px">${action==0 ? "To disenchant" : "To move to box "+(action-1)} <div class="cancelNext" style="display:inline; color:#fff; background-color:#333; padding:5px; z-index:50">Cancel</div></strong>`
      )
      card.querySelector(".cancelNext").addEventListener("click", event=>{
        delete cards[id]
        localStorage["y_WG-cardActions"] = JSON.stringify(cards)
        actions[action].splice(actions[action].findIndex(c=>c===id),1)
        card.querySelector(".nextAction").remove()
        event.preventDefault()
      })
    }
    
    var processCardActions = async ()=>{
      for(let action in actions){
        fetch('https://waifugame.com/json/multi_'+(action==0 ? "disenchant" : "move"), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
          },
          body: JSON.stringify({
            '_token': token,
            'pivots': actions[action],
            destination:action==0 ? undefined : "box"+(action-1)
          })
        });
      }
      localStorage["y_WG-cardActions"] = "{}"
    }
    window.processCardActions = processCardActions

    document.querySelector(".card-style.ml-0.mr-0").insertAdjacentHTML("beforebegin",
      `<button id="doCardActions" class="btn btn-block" style="width:auto; background-color:#333; display:inline-block">Do card actions</button>
      <button id="resetCardActions" class="btn btn-block" style="width:auto; background-color:#411; display:inline-block">Reset card actions</button>`
    )
    document.querySelector("#doCardActions").addEventListener("click", async ()=>{
      for(let button of document.querySelectorAll(".cancelNext")){
        button.remove()
      }
      let button = document.querySelector("#doCardActions")
      button.disabled = true
      await processCardActions()
      button.innerText = "Done."
    })
    document.querySelector("#resetCardActions").addEventListener("click", ()=>{
      areYouSure("If you want to cancel just some actions, use the Cancel button in the cards list. This is only useful to remove actions that might still be stored for cards you don't have anymore.", ()=>{
        for(let button of document.querySelectorAll(".cancelNext")){
          button.remove()
        }
        let button = document.querySelector("#resetCardActions")
        button.disabled = true
        cards = {}
        localStorage["y_WG-cardActions"] = "{}"
        button.innerText = "Done."
        document.querySelector("a.close-menu").click()
      })
    })
  return}

  if(path==="/home"){
    let formations = localStorage["y_WG-formations"] ? JSON.parse(localStorage["y_WG-formations"]) : {}
    for(let formation of document.querySelector("#party").querySelector("optgroup").children){
      if(formation.value==="default"){continue}
      let data = formations[formation.value.slice(2)]
      if(!data){
        data = formations[formation.value.slice(2)] = {}
      }
      data.selected = formation.selected ? true : undefined
      if(data.selected){
        for(let i of [2,3,4]){
          data[["perception", "charisma", "luck"][i-2]] = +document.querySelector(`a#im${i} .icon`).innerText
        }
      }
    }
    localStorage["y_WG-formations"] = JSON.stringify(formations)
  }
})();

// ==UserScript==
// @name         Waifugame swiper next
// @namespace    http://tampermonkey.net/
// @version      2025-04-16
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

  var colors = {
    selected:"7fa",
    selectedNotNow:"69b",
    selectedOnce:"c42",
    selectedCharisma:"4e4",
  }

  if(path==="/swiper"){
    document.querySelector(".tinder--buttons").insertAdjacentHTML("beforeend",
      `<br><style>.swiperNextButton {
        display:inline-flex;
        color:#fff;
        background-color:#111a;
        padding-left:5px;
        padding-right:5px;
        height:100%;
        align-items:center;
        min-width:30px;
        user-select:none;
      }</style><div id="swiperNextButtons" style="height:30px; overflow-y:hidden">` + [0,1,2,3,4,"swap"].map(i=>
        `<div data-nextaction="${i}" class="swiperNextButton">${i===0 ? "Disenchant" : i===1 ? "Portfolio" : i==="swap" ? '<i class="fa fa-exchange-alt" style="font-size:12px"></i>' : "Box "+(i-1)}</div>`
      ).join(" ")+`<br><div data-nextaction="swap" class="swiperNextButton"><i class="fa fa-exchange-alt" style="font-size:12px"></i></div> <span>Charisma:</span></div>`
    )
    let swiperNextButtons = document.querySelector("#swiperNextButtons")
    
    let selected = 1
    let selectedOnce = null
    let getSelected = ()=>(selectedOnce===null ? selected : selectedOnce)
    let updateFlirtButton = ()=>{
      document.querySelector("#love .fa").className = "fa fa-"+(getSelected()===0 && document.querySelector(`.swiperNextButton[data-nextaction="0"]`).dataset.battlemode ? "swords" : "heart")
    }
    for(let button of document.querySelectorAll(".swiperNextButton")){
      if(button.dataset.nextaction==="swap"){
        button.addEventListener("click", ()=>{
          swiperNextButtons.scrollTo(0,swiperNextButtons.scrollTop<15 ? 30 : 0)
        })
      continue}
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
    let switchingFormation = false
    for(let id in formations){
      let button = document.createElement("div")
      button.className = "swiperNextButton"
      button.style.marginLeft = "2px"
      button.dataset.formation = id
      let thisFormation = formations[id]
      if(thisFormation.selected){
        button.style.border = "solid 2px #4e4"
      }
      button.addEventListener("click", async ()=>{
        if(switchingFormation || thisFormation===formation){return}
        switchingFormation = true
        button.style.border = "solid 2px #ee4"
        let r = await fetch("/formation/change",{
          method:"POST",
          headers:{"content-type":"application/x-www-form-urlencoded"},
          body:"_token="+token+"&selected_formation=f-"+id
        }).catch(e=>{
          showErrorToast("Couldn't switch party.")
          switchingFormation = false
          button.style.border = null
          throw e
        })
        switchingFormation = false
        let current = Object.keys(formations).find(id=>formations[id].selected)
        if(current){
          swiperNextButtons.querySelector(`div[data-formation="${current}"]`).style.border = null
          delete formations[current].selected
        }
        button.style.border = "solid 2px #"+colors.selectedCharisma
        formation = thisFormation
        formation.selected = true
        charisma = formation.charisma
        localStorage["y_WG-formations"] = JSON.stringify(formations)
        applyEncounterStyle({each:()=>{}})
      })
      button.innerText = thisFormation.charisma==="undefined" ? "?" : thisFormation.charisma
      swiperNextButtons.appendChild(button)
    }
    
    let originalPostServer = postServer
    postServer = (...args)=>{
      let card = $('.tinder--card[data-encounterid=' + args[0] + ']').data("data")
      let action = getSelected()
      if(selectedOnce!==null){
        document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = "solid 3px #"+colors.selected
        document.querySelector(`.swiperNextButton[data-nextaction="${selectedOnce}"]`).style.border = null
      }
      let nextCard = document.querySelector(".tinder--cards :nth-child(1 of div.tinder--card:not(.removed))")
      let nextCardData = nextCard && $(nextCard).data("data")
      if(nextCardData && +cardActions[""+nextCardData.card_id] && +cardActions[""+nextCardData.card_id]!==selected){
        selectedOnce = +cardActions[""+nextCardData.card_id]
        document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = "solid 3px #"+colors.selectedNotNow
        document.querySelector(`.swiperNextButton[data-nextaction="${selectedOnce}"]`).style.border = "solid 3px #"+colors.selectedOnce
      }else{
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
        }
        if(!data.result.endsWith("...") && (data.result.includes(" + ") || data.result.includes(" and "))){
          let words = data.result.split(" ")
          let xp = +words[words.findIndex(c=>c==="+" || c==="and")+1]
          charisma = xp /(card.card.rarity+1) /30 /(words[1]==="Essence" ? 2 : 1) /(data.result.endsWith(" (300% BOOST)") ? 3 : data.result.endsWith(" (200% BOOST)") ? 2 : 1)
          if(formation && charisma!==formation?.charisma){
            formation.charisma = charisma
            localStorage["y_WG-formations"] = JSON.stringify(formations)
            swiperNextButtons.querySelector(`div[data-formation="${Object.keys(formations).find(k=>(formations[k]===formation))}"]`).innerText = charisma
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
        button.innerText = button.dataset.battlemode ? (data.card.element==="???" ? "Auto-battle" : "Battle") : "Disenchant"
        updateFlirtButton()
      }
      return originalApplyEncounterStyle(...args)
    }
  return}

  if(path==="/cards"){
    let cards = JSON.parse(localStorage["y_WG-cardActions"])
    let showTopSimps = !!localStorage["y_WG-showTopSimps"]

    let selectedCard
    let createNextAction = card=>{
      if(card.querySelector(".nextAction")){card.querySelector(".nextAction").remove()}
      let id = card.dataset.cardid
      if(!id){id = card.dataset.cardid = JSON.parse(card.dataset.card).id}
      if(cards[id]===undefined){return}
      let action = cards[id]
      card.querySelector(".fa-angle-right").insertAdjacentHTML("beforebegin",
        `<strong class="nextAction" style="margin-top:30px" data-action="${action}">${action==0 ? "To disenchant" : action==1 ? "To move to portfolio" : "To move to box "+(action-1)} <div class="cancelNext" style="display:inline; color:#fff; background-color:#333; padding:5px; z-index:50">Cancel</div></strong>`
      )
      card.querySelector(".cancelNext").addEventListener("click", event=>{
        event.preventDefault()
        if(card===selectedCard){
          return document.querySelector(`#swiperNextButtons div[data-nextaction="nothing"]`).click()
        }
        delete cards[id]
        localStorage["y_WG-cardActions"] = JSON.stringify(cards)
        card.querySelector(".nextAction").remove()
      })
    }
    for(let card of document.querySelectorAll("a.selectCard")){
      createNextAction(card)
    }

    document.querySelector("#cardActionBlock").children[1].insertAdjacentHTML("afterbegin",
      `<style>.swiperNextButton {
        display:inline-flex;
        color:#fff;
        background-color:#111;
        padding-left:5px;
        padding-right:5px;
        height:100%;
        align-items:center;
        text-align:center;
        min-width:30px;
        user-select:none;
      }
      table.smallerTable th, table.smallerTable td {
        padding: 5px;
      }
      </style><div id="swiperNextButtons" style="height:40px; width:100%; margin-left:10px; margin-bottom:10px">` + ["nothing",0,1,2,3,4,"next"].map(i=>
        `<div data-nextaction="${i}" class="swiperNextButton">${i===0 ? "Disenchant" : i===1 ? "Portfolio" : i==="nothing" ? "Nothing" : i==="next" ? '<i class="fa fa-angle-right"></i>' : "Box "+(i-1)}</div>`
      ).join(" ")
    )
    let selected
    for(let button of document.querySelectorAll(".swiperNextButton")){
      if(button.dataset.nextaction==="next"){
        button.addEventListener("click", ()=>{
          nextCard($nextCard)
        })
      continue}
      let i = button.dataset.nextaction
      button.addEventListener("click", ()=>{
        if(selected===i || !selectedCard){return}
        if(selected!==undefined){
          document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = null
        }
        selected = i
        button.style.border = "solid 2px #"+colors.selected
        if(i==="nothing"){
          delete cards[selectedCard.dataset.cardid]
        }else{
          cards[selectedCard.dataset.cardid] = i
        }
        localStorage["y_WG-cardActions"] = JSON.stringify(cards)
        for(let card of document.querySelectorAll(`a.selectCard[data-cardid="${selectedCard.dataset.cardid}"]`)){
          createNextAction(card)
        }
      })
    }
    let table = document.querySelector("#cardName").parentElement.querySelector("table")
    if(showTopSimps){
      table.classList.add("smallerTable")
      table.querySelector("tbody").insertAdjacentHTML("beforeend",
        `<tr class="bg-dark-light"><th>Top simps</th><td id="topSimps"><button class="btn">Load...</button><div></div></td></tr>`
      )
      document.querySelector("#topSimps button").addEventListener("click", async ()=>{
        document.querySelector("#topSimps button").style.display = "none"
        let req1 = await fetch('https://waifugame.com/json/card/'+selectedCard.dataset.cardid, {
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
          }
        }).catch(e=>{
          showErrorToast("Couldn't fetch card data.")
          throw e
        });
        let fullCard = await req1.json()
        let req2 = await fetch("https://waifugame.com/search?q=ch:"+fullCard.characterId).catch(e=>{
          showErrorToast("Couldn't fetch card search.")
          throw e
        })
        let fullPage = await req2.text()
        let leaderboards = fullPage.split(`<th>Rank</th>`)
          .slice(1).map(l=>l.slice(l.indexOf("<tbody>")+6, l.indexOf("</tbody>")))
        document.querySelector("#topSimps div").innerHTML = leaderboards
          .map((l,i)=>{
            let top = l.indexOf(`href='/profile/`)
            if(top===-1){return null}
            top = l.slice(top+15)
            top = top.slice(0, top.indexOf("'"))
            return `<a href="/profile/${top}" target="_blank">${i===0 ? "Monthly" : "All-time"}</a>`
          }).filter(l=>l).join("; ") || "None!"
      })
    }

    let originalNextCard = nextCard
    nextCard = (...args)=>{
      selectedCard = args[0][0]
      let action = cards[args[0].data("card").id]
      document.querySelector(`#swiperNextButtons div[data-nextaction="${action!==undefined ? ""+action : "nothing"}"]`).click()
      if(showTopSimps){
        document.querySelector("#topSimps button").style.display = null
        document.querySelector("#topSimps div").innerHTML = ""
      }
      return originalNextCard(...args)
    }
    if(!$nextCard){
      nextCard($("a.selectCard").first())
    }
    
    var processCardActions = async ()=>{
      let actions = {}
      let ids = []
      for(let action of document.querySelectorAll("a.selectCard .nextAction")){
        if(!actions[action.dataset.action]){actions[action.dataset.action]=[]}
        actions[action.dataset.action].push(action.parentElement.dataset.pivotselect)
        ids.push(action.parentElement.dataset.cardid)
      }
      let promises = []
      for(let action in actions){
        promises.push(fetch('https://waifugame.com/json/multi_'+(action==0 ? "disenchant" : "move"), {
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
        }))
      }
      for(let id of ids){delete cards[id]}
      localStorage["y_WG-cardActions"] = JSON.stringify(cards)
      if(Promise.all){await Promise.all(promises)}
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

    let originalWaifuJoinsContent = document.querySelector("#waifuJoinsContent")
    originalWaifuJoinsContent.id = "originalWaifuJoinsContent"
    originalWaifuJoinsContent.insertAdjacentHTML("beforeend", `<div id="waifuJoinsContent"></div><button id="viewAnimuButton" class="btn btn-block">View Animu</button>`)
    document.querySelector("#viewAnimuButton").addEventListener("click", ()=>{
      showWaifuMenu({
        id:document.querySelector("#waifuJoinsContent a").href.split("=").slice(-1)[0],
        name:"", hpText:"", relHP:"0", xpText:"", relXP:"0", cardID:""
      }, true)
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

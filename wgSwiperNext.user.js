// ==UserScript==
// @name         Waifugame swiper next
// @namespace    http://tampermonkey.net/
// @version      2025-08-07
// @description  Move your cards to boxes from the swiper page.
// @author       Lulu5239
// @match        https://waifugame.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waifugame.com
// @downloadURL  https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgSwiperNext.user.js
// @updateURL    https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgSwiperNext.user.js
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
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
  var settings = GM_getValue("settings") || {}

  if(settings.manualRerollOnly && typeof(ReRollGifts)!=="undefined"){
    let originalReroll = ReRollGifts
    ReRollGifts = (...args)=>{
      if(!args[0] && document.querySelector(".giftableItem")){return}
      return originalReroll(...args)
    }
    let originalGive = giveItemHandler
    giveItemHandler = (...args)=>{
      let p = document.querySelector("#waifuFeed")
      p.id = "originalWaifuFeed"
      let thing = document.querySelector(".text-justify.opacity-30.px-4.font-9.mt-4") || document.querySelector(".replaceGroupName")
      thing.id = "waifuFeed"
      let r = originalGive(...args)
      thing.removeAttribute("id")
      p.id = "waifuFeed"
      return r
    }
  }

  let setFormation = async (id, formations=GM_getValue("formations")||{})=>{
    let r = await fetch("/formation/change",{
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:"_token="+token+"&selected_formation="+id
    })
    let formation = formations[id.slice(2)]
    if(settings.levelUpSlots && formation?.levelUpSlots?.length){
      let levelingUp = GM_getValue("levelingUp") || []
      for(let i in levelingUp){
        await fetch('https://waifugame.com/am/'+levelingUp[i], {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            '_token': token,
            'action': 'swap',
            'slot': formation.levelUpSlots[i]
          })
        });
      }
    }
  }

  let unwishlistCard = async (id, wl=GM_getValue("wishedCards") || [])=>{
    await fetch('https://waifugame.com/profile/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      },
      body: JSON.stringify({
        '_token': token,
        'action': 'remove',
        'tag': 'id:'+id,
      })
    });
    let i = wl?.findIndex(c=>c===""+id)
    if(i>=0){
      wl.splice(i, 1)
      GM_setValue("wishedCards", wl)
    }
  }
  let unwishlistManyCards = async (ids, editStatus, wl)=>{
    for(let i in ids){
      let tnow = +new Date()
      await unwishlistCard(ids[i], wl)
      if(editStatus){editStatus((+i+1)+"/"+ids.length)}
      let t = +new Date() - tnow
      if(t < 0.7){ // The rate-limits are 90 requests per minute
        await new Promise(ok=>setTimeout(ok, 0.7 - t))
      }
    }
  }

  navigator.serviceWorker.originalRegister = navigator.serviceWorker.register
  if(settings.fixServiceWorker){
    navigator.serviceWorker.register = url=>{}
  }

  if(true){ // Fixes bugs
    areYouSure = (text, continueFunction, cancelFunction)=>{
      $('#areYouSureTrigger').click();
      $('#areYouSure .areYouSureText').html(text);
      $('#areYouSure .continueText i.fa-spin').remove();

      function cleanupHandlers() {
        $("#areYouSure .continueText").unbind('click');
        $("#areYouSure .cancelText").unbind('click');
      }
      cleanupHandlers()

      if (continueFunction) {
        $('#areYouSure .continueText').on('click', (...a)=>{
          cleanupHandlers()
          if(!$("#areYouSure.menu-active").length){return}
          continueFunction(...a)
          // Disable buttons to prevent double-clicking
          $('#areYouSure .continueText')
            .prepend("<i class='fa fa-spinner fa-spin'></i> ")
            .attr('disabled', 'disabled')
        });
      }

      if (cancelFunction) {
        $('#areYouSure .cancelText').on('click', (...a)=>{
          cleanupHandlers()
          if(!$("#areYouSure.menu-active").length){return}
          cancelFunction(...a)
        });
      } else {
        $('#areYouSure .cancelText').on('click', function() {
          $('a.close-menu').first().click();
          cleanupHandlers()
        });
      }
    }
  }

  if(path==="/swiper"){
    document.body.insertAdjacentHTML("beforeend", `<style>.swiperNextButton {
        display:inline-flex;
        color:#fff;
        background-color:#111a;
        padding-left:5px;
        padding-right:5px;
        height:100%;
        align-items:center;
        min-width:30px;
        user-select:none;
      }
      ${settings.transparentSwiperButtons ? ".tinder--buttons button {background-color: #0008}" : ""}
    </style>`)
    document.querySelector(".tinder--buttons").insertAdjacentHTML("beforeend",
      `<br><div id="swiperNextButtons" style="height:${settings.biggerButtons ? "50" : "30"}px; overflow-y:hidden; margin-top: 5px;">` + [0,1,2,3,4,"swap"].map(i=>
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
          let size = button.parentElement.style.height.slice(0, -2)
          swiperNextButtons.scrollTo(0,swiperNextButtons.scrollTop<size/2 ? size : 0)
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
    
    let cardActions = GM_getValue("cardActions") ? GM_getValue("cardActions") : localStorage["y_WG-cardActions"] ? JSON.parse(localStorage["y_WG-cardActions"]) : {}
    let formations = GM_getValue("formations") ? GM_getValue("formations") : localStorage["y_WG-formations"] ? JSON.parse(localStorage["y_WG-formations"]) : {}
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
        let r = await setFormation("f-"+id, formations).catch(e=>{
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
        GM_setValue("formations", formations)
        applyEncounterStyle({each:()=>{}})
      })
      button.innerText = thisFormation.charisma==="undefined" ? "?" : thisFormation.charisma
      swiperNextButtons.appendChild(button)
    }

    let wishedCards = GM_getValue("wishedCards") || []

    let flirtAnyways
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
      let nextAction = nextCardData && (settings.wishedCardDestination && wishedCards.includes(""+nextCardData.card_id) ? settings.wishedCardDestination : +cardActions[""+nextCardData.card_id]!==selected && +cardActions[""+nextCardData.card_id])
      if(nextAction){
        selectedOnce = nextAction
        document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = "solid 3px #"+colors.selectedNotNow
        document.querySelector(`.swiperNextButton[data-nextaction="${selectedOnce}"]`).style.border = "solid 3px #"+colors.selectedOnce
      }else{
        selectedOnce = null
      }
      if(action===0 && args[1]==="😘" && (+settings.replaceFlirtWithBattle||charisma-7)>card.card.rarity && !flirtAnyways){
        args[1] = settings.crushManualBattles && card.card.element!=="???" ? "🗑️" : "👊"
      }
      flirtAnyways = null
      let originalSuccessFn = args[2]
      return originalPostServer(...args.slice(0,2), data=>{
        let gotCard = data.result.includes(" Card (\u2116 ")
        if(gotCard && action!==1 || settings.keepActions){
          cardActions[card.card_id] = action
          GM_setValue("cardActions", cardActions)
        }
        if(gotCard && settings.unwishlistObtainedCards && wishedCards.includes(""+card.card_id)){
          if(settings.unwishlistObtainedCards==="confirm" && !confirm(`Do you want to remove ${card.card.name} from your wishlist?`)){return}
          unwishlistCard(card.card_id, wishedCards)
        }
        if(!data.result.endsWith("...") && (data.result.includes(" + ") || data.result.includes(" and "))){
          let words = data.result.split(" ")
          let xp = +words[words.findIndex(c=>c==="+" || c==="and")+1]
          charisma = xp /(card.card.rarity+1) /30 /(words[1]==="Essence" ? 2 : 1) /(data.result.endsWith(" (300% BOOST)") ? 3 : data.result.endsWith(" (200% BOOST)") ? 2 : 1)
          if(formation && charisma!==formation?.charisma){
            formation.charisma = charisma
            GM_setValue("formations", formations)
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
        button.dataset.battlemode = (+settings.replaceFlirtWithBattle||charisma-7)>data.card.rarity ? true : ""
        button.innerText = button.dataset.battlemode ? (data.card.element==="???" ? "Auto-battle" : settings.crushManualBattles ? "Crush" : "Battle") : "Disenchant"
        updateFlirtButton()
      }
      return originalApplyEncounterStyle(...args)
    }

    document.addEventListener("keydown", ev=>{
      let action = Object.keys(settings).find(k=>k.startsWith("keybind.") && settings[k]===ev.key)
      if(!action){return}
      action = action.slice(8)
      let i = ["disenchant", "portfolio", "box1", "box2", "box3"].findIndex(e=>e===action)
      if(i>=0){
        document.querySelector(`#swiperNextButtons [data-nextaction="${action==="nothing" ? "nothing" : i}"]`).click()
      return}
      if(action==="main"){
        document.querySelector("#love").click()
      }else if(action==="crush"){
        document.querySelector("#nope").click()
      }else if(action==="flirt"){
        flirtAnyways = true
        document.querySelector("#love").click()
      }else if(action==="charm"){
        document.querySelector(".btnCharm").click()
      }else if(action==="deb"){
        document.querySelector(settings.confirmKeybindCharm ? "#deb" : ".btnDeb").click()
      }else if(action==="battle"){
        document.querySelector(".btnBattle").click()
      }else if(action==="unwishlist"){
        unwishlistCard($('.tinder--card:not(.removed)').first()?.data("data").card_id, wishedCards)
        showSuccessToast("Unwishlisting card.")
      }else if(action==="cardInfos"){
        document.querySelector("#options").click()
        document.querySelector(".btnDetails").click()
      }else if(action==="openMenu"){
        document.querySelector("#options").click()
      }
    })
  return}

  if(path==="/cards"){
    let cards = GM_getValue("cardActions") || JSON.parse(localStorage["y_WG-cardActions"] || "{}")
    
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
        GM_setValue("cardActions", cards)
        card.querySelector(".nextAction").remove()
      })
    }
    for(let card of document.querySelectorAll("a.selectCard")){
      createNextAction(card)
    }
    let originalUpdateDisenchantCount = updateDisenchantCount
    updateDisenchantCount = (...args)=>{
      originalUpdateDisenchantCount(...args)
      for(let card of document.querySelectorAll("a.selectCard")){
        if(card.querySelector(".nextAction")){continue}
        createNextAction(card)
      }
    }

    document.querySelector("#cardActionBlock, #noCardLeft").children[1].insertAdjacentHTML("afterbegin",
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
          nextCard($nextCard[0])
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
        GM_setValue("cardActions", cards)
        for(let card of document.querySelectorAll(`a.selectCard[data-cardid="${selectedCard.dataset.cardid}"]`)){
          createNextAction(card)
        }
      })
    }
    let table = document.querySelector("#cardName")?.parentElement.querySelector("table")
    if(settings.showTopSimps && table){
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
      selectedCard = args[0]
      if(selectedCard.length){
        selectedCard = selectedCard[0]
      }
      let action = cards[$(selectedCard).data("card").id]
      document.querySelector(`#swiperNextButtons div[data-nextaction="${action!==undefined ? ""+action : "nothing"}"]`).click()
      if(settings.showTopSimps){
        document.querySelector("#topSimps button").style.display = null
        document.querySelector("#topSimps div").innerHTML = ""
      }
      return originalNextCard(...args)
    }
    if(!$nextCard){
      let card = $("a.selectCard").first()
      if(card?.length){nextCard(card[0])}
    }
    
    var processCardActions = async ()=>{
      let actions = {}
      let ids = []
      for(let action of document.querySelectorAll("a.selectCard .nextAction")){
        if(!actions[action.dataset.action]){actions[action.dataset.action]=[]}
        actions[action.dataset.action].push(action.parentElement.dataset.pivotselect)
        if(!settings.keepActions){ids.push(action.parentElement.dataset.cardid)}
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
      GM_setValue("cardActions", cards)
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
      areYouSure(`If you want to cancel just some actions, use the Cancel button in the cards list. This is only useful to remove the ${Object.keys(cards).length} actions still stored for cards you might not have anymore.`, ()=>{
        for(let button of document.querySelectorAll(".cancelNext")){
          button.remove()
        }
        let button = document.querySelector("#resetCardActions")
        button.disabled = true
        cards = {}
        GM_setValue("cardActions", {})
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

    let settingCheckbox = (key, name, checked)=>(`<label><input type="checkbox" ${checked || checked===undefined && settings[key] ? "checked" : ""} data-key="${key}"> ${name}</label>`)
    let settingKeybind = (key, name)=>(`<div style="inline-block" data-key="${"keybind."+key}"><button class="btn"></button> <button class="btn"><i class="fa fa-times"></i></button> ${name}</div>`)
    let settingSelect = (key, list)=>(`<select style="display:inline-block" class="btn" data-key="${key}">`+list.map(o=>`<option value="${o.value}"${settings[key]==o.value ? " selected" : ""}>${o.name}</option>`)+`</select>`)
    document.querySelector("#noCardLeft").insertAdjacentHTML("afterend",
      `<div id="swiperNextSettings" class="card card-style" style="padding:3px">
        <div>
          <button data-page="visibility" class="btn btn-block">Visibility</button>
          <button data-page="keybinds" class="btn btn-block">Keybinds</button>
          <button data-page="recommendations" class="btn btn-block">Recommendations</button>
        </div>
        <div data-page="visibility">
          For the destination buttons:<br>
          ${settingCheckbox("disableOnSwiperPage", "Remove from swiper page")}<br>
          ${settingCheckbox("biggerButtons", "Make buttons bigger")}<br>
          ${settingCheckbox("transparentSwiperButtons", "Transparent background for action buttons")}<br>
          On the cards page:<br>
          ${settingCheckbox("disableOnCardsPage", "Remove from cards page")}<br>
          ${settingCheckbox("showTopSimps", "Add button to load top simps")}<br>
          <br>
          When feeding an Animu:<br>
          ${settingCheckbox("manualRerollOnly", "Only manually reroll buttons")}<br>
          <br>
          Off-topic, but you currently have <a id="swcount"></a> registered service workers and they might lag your browser.<br>
          <button id="unregistersw">Unregister bad service workers</button><button id="registersw">Register a service worker</button> <button id="unregisterallsw">Unregister all service workers</button><br>
          ${settingCheckbox("fixServiceWorker", "Stop creating service workers")}
        </div>
        <div data-page="keybinds">
          Pressing keys on your keyboard would select the associated action:<br>
          ${settingKeybind("disenchant", "Disenchant/battle")}<br>
          ${settingKeybind("portfolio", "Portfolio")}<br>
          ${settingKeybind("box1", "Box 1")}<br>
          ${settingKeybind("box2", "Box 2")}<br>
          ${settingKeybind("box3", "Box 3")}<br>
          The following keybinds actually does things:<br>
          ${settingKeybind("main", "Disenchant/battle (depends of the icon on the big button)")}<br>
          ${settingKeybind("crush", "Crush")}<br>
          ${settingKeybind("flirt", "Flirt")}<br>
          ${settingKeybind("charm", "Charm")}<br>
          ${settingKeybind("deb", "Debonaire charm")}<br>
          ${settingCheckbox("confirmKeybindDeb", "Show confirmation menu when Deb charming using keybind")}<br>
          ${settingKeybind("battle", "Battle")}<br>
          ${settingKeybind("cardInfos", "Open card details")}<br>
          ${settingKeybind("openMenu", "Open actions menu")}<br>
          ${settingKeybind("nothing", "Nothing (on cards page)")}<br>
          ${settingKeybind("next", "Next card (on cards page)")}<br>
          ${settingKeybind("unwishlist", "Remove card from wishlist (on swiper page)")}<br>
          <br>
          ${settingCheckbox("keybindAutoNext", "Automatically display next card after selecting destination using keybind, from the cards page")}
        </div>
        <div data-page="recommendations">
          After executing the card actions, the script usually deletes the actions from its storage but you can disable that here.<br>
          On the swiper page, the saved card action will become automatically selected.<br>
          ${settingCheckbox("keepActions", "Keep card actions")}<br>
          When selecting disenchant, replace flirt button with battle button if:<br>
          ${settingSelect("replaceFlirtWithBattle", [
            {value:0, name:"Enough charisma for guaranteed flirt success"},
            {value:-1, name:"Never"},
            {value:1, name:"Common rarity"},
            {value:2, name:"Uncommon rarity or lower"},
            {value:3, name:"Rare rarity or lower"},
            {value:4, name:"Epic rarity or lower"},
            {value:5, name:"Legendary rarity or lower"},
            {value:6, name:"Always"},
          ])}<br>
          ${settingCheckbox("crushManualBattles", "Crush instead of manually battling")}<br>
          The following features related to your wishlist works on cards (not tags) seen on your wishlist page. After enabling these options, you should go on the wishlist page.<br>
          Unwishlist obtained cards ${settingSelect("unwishlistObtainedCards", [
            {value:"", name:"never"},
            {value:"confirm", name:"after confirmation"},
            {value:"auto", name:"automatically"},
          ])}<br>
          Automatically pre-select ${settingSelect("wishedCardDestination", [
            {value:"", name:"nowhere specific"},
            {value:1, name:"Portfolio"},
            {value:2, name:"Box 1"},
            {value:3, name:"Box 2"},
            {value:4, name:"Box 3"},
          ])} as destination for wishlisted cards.<br>
          ${settingCheckbox("levelUpSlots", "When switching party, keep the Animus that didn't reach level 120")}
        </div>
      </div>
      <style>
        #swiperNextSettings div[data-page] {
          display:none;
          color:#eee;
        }
        #swiperNextSettings div[data-page][data-visible] {
          display:block;
        }
        #swiperNextSettings div[data-page="keybinds"] div button {
          border: solid 2px #fffa;
        }
        #swiperNextSettings div[data-page="keybinds"] div {
          font-size:20px;
        }
      </style>`
    )
    let settingsDiv = document.querySelector("div#swiperNextSettings")
    for(let button of settingsDiv.children[0].children){
      button.addEventListener("click", ()=>{
        let previous = settingsDiv.querySelectorAll("[data-visible]")[0]
        if(previous){previous.removeAttribute("data-visible")}
        settingsDiv.querySelector(`div[data-page="${button.dataset.page}"]`).dataset.visible = true
      })
    }
    let recording
    for(let option of settingsDiv.querySelectorAll("[data-page] [data-key]")){
      let key = option.dataset.key
      if(key.startsWith("keybind.")){
        option.children[0].innerText = settings[key] || ""
        option.children[0].addEventListener("click", ()=>{
          if(recording){
            let option = settingsDiv.querySelector(`[data-page] [data-key="${recording}"]`)
            option.children[0].innerText = settings[recording] || ""
            option.children[0].style.backgroundColor = null
            recording = null
          return}
          option.children[0].innerText = "Recording..."
          option.children[0].style.backgroundColor = "#555a"
          recording = key
        })
        option.children[1].style.display = settings[key] ? null : "none"
        option.children[1].addEventListener("click", ()=>{
          delete settings[key]
          GM_setValue("settings", settings)
          option.children[0].innerText = ""
          option.children[1].style.display = "none"
        })
      }
      option.addEventListener("change", ()=>{
        if(option.tagName.toLowerCase()==="input" && option.type==="checkbox"){
          settings[key] = !!option.checked
        }else{
          settings[key] = option.value
        }
        GM_setValue("settings", settings)
        if(["showTopSimps"].includes(key)){
          showSuccessToast("Refresh the page to see the changes.")
        }
      })
    }
    let updateSWcount = ()=>{
      navigator.serviceWorker?.getRegistrations().then(l=>document.querySelector("#swcount").innerText = ""+l.length)
    }
    updateSWcount()
    let unregisterSW = async all=>{
      let registrations = await navigator.serviceWorker.getRegistrations()
      let n = 0
      for(let registration of registrations){
        if(all || registration.scope.length > document.location.origin.length + 1){
          registration.unregister()
          n++
        }
      }
      updateSWcount()
      showSuccessToast(`Removed ${n} service workers`)
    }
    document.querySelector("#unregistersw").addEventListener("click", ()=>unregisterSW())
    document.querySelector("#unregisterallsw").addEventListener("click", ()=>unregisterSW(true))
    document.querySelector("#registersw").addEventListener("click", ()=>{
      navigator.serviceWorker.originalRegister("/_service-worker.js")
      updateSWcount()
      showSuccessToast("Created a service worker for the entire website")
    })

    document.addEventListener("keydown", ev=>{
      if(!recording){
        let action = Object.keys(settings).find(k=>k.startsWith("keybind.") && settings[k]===ev.key)
        if(!action){return}
        action = action.slice(8)
        let i = ["disenchant", "portfolio", "box1", "box2", "box3"].findIndex(e=>e===action)
        if(i>=0 || action==="nothing" || action==="next"){
          document.querySelector(`#swiperNextButtons [data-nextaction="${action==="nothing" ? "nothing" : i}"]`).click()
          if(settings.keybindAutoNext && action!=="next"){document.querySelector(`#swiperNextButtons [data-nextaction="next"]`).click()}
        return}
      return}
      settings[recording] = ev.key
      GM_setValue("settings", settings)
      let option = settingsDiv.querySelector(`[data-page] [data-key="${recording}"]`)
      option.children[0].innerText = ev.key
      option.children[1].style.display = "block"
      recording = null
    })

    let bulkSelect = document.querySelector("#bulk_action")
    bulkSelect.querySelector(`[value="unprotect"]`).insertAdjacentHTML("afterend", `<option value="unwishlist">Remove from wishlist</option>`)
    bulkSelect.parentElement.addEventListener("change", ev=>{
      if(ev.target!==bulkSelect){return}
      if(bulkSelect.value==="unwishlist"){
        let wishedCards = GM_getValue("wishedCards") || []
        let ids = Object.keys(multiSelection).map(id=>document.querySelector(`[data-pivotselect="${id}"]`).dataset.cardid).filter(id=>wishedCards.includes(id))
        ids = ids.filter((id,i)=>!ids.slice(0, i).includes(id))
        if(!ids.length){return showErrorToast("None of the cards you selected are in your wishlist!")}
        areYouSure(`Do you want to remove ${ids.length} cards from your wishlist?`, async ()=>{
          let menu = document.querySelector("#areYouSure")
          await unwishlistManyCards(ids, txt=>{
            menu.querySelector(".areYouSureText").innerHTML = `Removing cards from wishlist (${txt})... <i>Close this page if you want to cancel.</i>`
          }, wishedCards)
          menu.querySelector(".close-menu").click()
        })
      }else{
        return
      }
      ev.preventDefault()
    }, {capture: true})
  return}

  if(path==="/home"){
    let formations = GM_getValue("formations") ? GM_getValue("formations") : localStorage["y_WG-formations"] ? JSON.parse(localStorage["y_WG-formations"]) : {}
    let select = document.querySelector("#formationform #party")
    let levelingUp = []
    for(let formation of select.querySelector("optgroup").children){
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
        if(settings.levelUpSlots){
          let l = Array.from(document.querySelectorAll(".page-content div.card[data-nameonly]"))
          let newLevelUpSlots = []
          for(let i in l){
            let card = l[i]
            let level = +card.querySelector(".levelBadge.badge").innerText.slice(3)
            if(level < 120){
              newLevelUpSlots.push(i)
              levelingUp.push(card.dataset.amid)
            }
          }
          for(let i of (data.levelUpSlots||[])){
            if(!newLevelUpSlots.includes(i)){
              newLevelUpSlots.push(i)
            }
          }
          data.levelUpSlots = newLevelUpSlots
          GM_setValue("levelingUp", levelingUp)
        }else{delete data.levelUpSlots}
      }
    }
    GM_setValue("formations", formations)

    if(settings.levelUpSlots && levelingUp.length){
      switchFormation = async ()=>{
        select.disabled = true
        select.insertAdjacentHTML("afterend", `<span style="display: block" id="switchingWaitText">Switching party...</span>`)
        await setFormation(select.value, formations).catch(e=>{
          select.parentElement.remove(document.querySelector("#switchingWaitText"))
          select.disabled = false
          showErrorToast("Error when switching party.")
          throw e
        })
        document.location.reload()
      }
      select.setAttribute("onchange", "switchFormation()")
    }
  }

  if(path==="/profile/wishlist"){
    if(!settings.unwishlistObtainedCards && !settings.wishedCardDestination){return}
    let wishlist = Array.from(document.querySelectorAll("#wishedCards [data-cardid]")).map(e=>e.dataset.cardid)
    GM_setValue("wishedCards", wishlist)
  }

  if(path==="/hotel"){
    let bye = document.querySelector("#multiGoodbye")
    bye.insertAdjacentHTML("beforebegin", `<button id="multiUnwishlist" class="btn font-14 btn-block rounded-s text-center mb-2">Unwishlist</button>`)
    bye.parentElement.parentElement.parentElement.style.marginBottom = "100px"
    document.querySelector("#multiUnwishlist").addEventListener("click", ()=>{
      let wishedCards = GM_getValue("wishedCards") || []
      let ids = Array.from(document.querySelectorAll(".hotelListing.animu-selected a")).map(e=>e.dataset.cardid).filter(id=>wishedCards.includes(id))
      ids = ids.filter((id,i)=>!ids.slice(0, i).includes(id))
      if(!ids.length){return showErrorToast("None of the cards you selected are in your wishlist!")}
      areYouSure(`Do you want to remove ${ids.length} cards from your wishlist?`, async ()=>{
        let menu = document.querySelector("#areYouSure")
        await unwishlistManyCards(ids, txt=>{
          menu.querySelector(".areYouSureText").innerHTML = `Removing cards from wishlist (${txt})... <i>Close this page if you want to cancel.</i>`
        }, wishedCards)
        menu.querySelector(".close-menu").click()
      })
    })
  }
})();

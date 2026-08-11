// ==UserScript==
// @name         Waifugame checklist
// @namespace    http://tampermonkey.net/
// @version      2026-08-11
// @description  The user-script about navigation.
// @author       Lulu5239
// @match        https://waifugame.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waifugame.com
// @downloadURL  https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgChecklist.user.js
// @updateURL    https://raw.githubusercontent.com/lulu5239/test/refs/heads/master/wgChecklist.user.js
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
  if(path.endsWith("/")){
    path = path.slice(0, -1)
  }

  let isOldStyle = typeof(startCountdown)==="undefined" && document.querySelector("#sidebar.sidebar-offcanvas")

  var addCooldown = e=>{
    let cooldowns = GM_getValue("cooldowns", [])
    let index = cooldowns.findIndex(d=>d.type===e.type)
    if(index===-1){cooldowns.push(e)}else{cooldowns[index] = e}
    GM_setValue("cooldowns", cooldowns)

    let LubloxKey = GM_getValue("LubloxKey")
    if(LubloxKey){
      fetch("https://lublox.xyz/wg/cooldown/api", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: LubloxKey,
        },
        body: JSON.stringify(e),
      }).catch(e=>showErrorToast(e.body))
    }
  }

  let daily = GM_getValue("daily", {})
  let subscription = GM_getValue("subscription", {current: 0})
  
  let tnow = +new Date()
  let day = tnow >= (daily.nextDay||0) ? null : daily.day
  if(!day){
    day = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/New_York",
    }).format(tnow).split(", ")
    day[0] = day[0].split("/"); day[1] = day[1].split(":")
    let nextDay = ((+day[1][0]+18) %24)*3600000 + +day[1][1]*60000 + +day[1][2]*1000 + tnow%1000
    nextDay = tnow + (24*3600000-nextDay)
    day = +day[0][0] + +day[0][1]*50 + +day[0][2]*400 + (+day[1][0] >= 6 ? 1 : 0)
    if((daily.day||0) < day){
      GM_setValue("daily", daily = { day, nextDay })
    }
  }
  let group6h = tnow >= (daily.group6h?.next||0) ? null : daily.group6h
  if(!group6h){
    let n = Math.floor((tnow - (daily.nextDay - 24*3600000))/(6*3600000))
    group6h = daily.group6h = { n, next: daily.nextDay - (3-n)*6*3600000 }
  }

  // Bookmarks in side bar
  if(true){
    document.querySelector(isOldStyle ? "#sidebar" : "#menu-main").insertAdjacentHTML("beforeend",
      `<h6 class="menu-divider mt-4"${isOldStyle ? ' style="padding-left: 5px; color: #fff; font-weight: 700;"' : ''}>Bookmarks</h6>
      <div class="list-group list-custom-small list-menu nav-link nav-item" id="bookmarks-list">
        <a href="javascript: void 0" class="nav-link">
          <i class="fa fa-bookmark color-white menu-icon" style="background: linear-gradient(20deg, #333, #777)"></i>
          <span class="menu-title">Bookmark</span>
          <i class="fa fa-angle-right"${isOldStyle ? ' style="float: right;"' : ''}></i>
        </a>
      </div>`
    )
    let list = document.querySelector("#bookmarks-list")
    let bookmarks = GM_getValue("bookmarks", [])
    let buttonNew = list.children[0]
    let buttonModel = buttonNew.cloneNode(true)
    for(let bookmark of bookmarks){
      let e = buttonModel.cloneNode(true)
      e.children[1].innerText = bookmark.name
      e.href = bookmark.url
      list.append(e)
    }
    list.append(buttonNew)
    buttonNew.children[2].remove()
    let isBookmarked; let here = path + document.location.search
    let updateButtonNew = ()=>{
      isBookmarked = bookmarks.find(b=>b.url === here)
      buttonNew.children[1].innerText = isBookmarked ? "Remove bookmark" : "Bookmark"
      buttonNew.children[0].style.background = isBookmarked ? "linear-gradient(20deg, #a22, #937)" : "linear-gradient(20deg, #2a2, #397)"
    }
    updateButtonNew()
    buttonNew.addEventListener("click", ev=>{
      if(isBookmarked){
        let e = list.querySelector(`[href="${here}"]`)
        if(e){e.remove()}
        let index = bookmarks.findIndex(b=>b.url === here)
        if(index >= 0){bookmarks.splice(index, 1)}
      }else{
        let name = prompt("Bookmark name:")
        if(!name){return}
        bookmarks.push({
          name, url: here,
        })
        let e = buttonModel.cloneNode(true)
        e.children[1].innerText = name
        e.href = here
        list.append(e)
        list.append(buttonNew)
      }
      GM_setValue("bookmarks", bookmarks)
      updateButtonNew()
    })
  }

  if(isOldStyle){
    document.querySelector("a.navbar-brand.brand-logo-mini").addEventListener("click", ev=>{
      ev.preventDefault()
      let nav = document.querySelector("#sidebar")
      nav.classList[nav.classList.contains("active") ? "remove" : "add"]("active")
    })
  }

  if(path==="/home"){
    let checklistSettings = GM_getValue("checklistSettings", {})
    
    let card = document.querySelector(`a[href="/questline/limited"]`).closest(".card")
    card.classList.add("checklist-card")
    card.children[0].dataset.page = "quests"
    card.insertAdjacentHTML("afterbegin", `
    <div class="tabs-small shadow-xl flex-tabs" data-tab-items="2">
      <a href="javascript:void 0" data-page="quests">Limited quests</a>
      <a href="javascript:void 0" data-page="checklist">Checklist</a>
      <a href="javascript:void 0" data-page="settings" style="display: none">Settings</a>
    </div>
    <style>
      .checklist-card div[data-page], .checklist-card div[data-page="settings"] div[data-settings] {
        display: none;
        color: #eee;
      }
      .checklist-card div[data-page][data-visible], .checklist-card div[data-page="settings"] div[data-settings] [data-visible] {
        display: block;
      }
      .flex-tabs {
        display: flex;
      }
      .flex-tabs a {
        flex-grow: 1;
        color: #fff;
        font-weight: 600;
        text-align: center;
        font-size: 110%;
      }
      #checklist {
        font-size: 120%;
      }
      #checklist [data-model="row"] {
        padding: 5px;
        display: flex;
        gap: 5px;
      }
      #checklist > [data-model="row"] > span {
        flex-grow: 1;
      }
      #checklist [data-thing="right-side"] {
        text-align: right;
      }
      #checklist [data-model="timer"] {
        min-width: 50px;
        margin-left: 5px;
      }
      #checklist > [data-done="true"] {
        opacity: 0.8;
      }
      #checklist > [data-done="false"] .colorful-background {
        background-color: #a33;
      }
      #checklist > [data-done="true"] .colorful-background {
        background-color: #444;
      }
      .bg-red-darker {
        background-color: #901010;
      }
      [data-model="settingsButton"] {
        text-align: center;
      }
      [data-model="settingsButton"] a {
        padding: 5px;
      }
    </style>
    <div data-page="checklist">
      <div data-model="row">
        <span><a></a></span>
        <div data-thing="right-side">
          <a class="badge colorful-background" data-model="progress"></a>
          <a class="badge colorful-background" data-model="timer" data-countdownprecision="2"></a>
          <i class="fa fa-check" data-model="checkmark"></i>
        </div>
      </div>
      <div data-model="settingsButton"><a href="javascript:void 0">Settings</a></div>
    </div>
    <div data-page="settings">
      <select class="form-control form-control-lg">
        <option value="all" selected>General settings</option>
        <option value="Waifuville">Waifuville</option>
        <option value="gyms">Gyms</option>
        <option value="cards">Card creation</option>
      </select>
      <div data-settings="all">
        Checklist position: in limited quests card <i>(currently not editable)</i>
        <br>Lublox key thing : <input data-setting="LubloxKey" /> <a href="https://lublox.xyz/web#wg/cooldowns" target="_blank">(learn more)</a>
      </div>
      <div data-settings="Waifuville">
        Consider <input type="number" min="0" max="4" data-setting="WaifuvilleMissionsGoal" value="4" /> enough missions
      </div>
      <div data-settings="gyms">
        Consider done after farming gyms <input type="number" min="0" max="90" data-setting="gymsGoal" value="90" /> times or after finishing to farm the gyms <i>future select</i>
      </div>
      <div data-settings="cards">
        Default tag(s) to search when clicking the link: <input data-setting="cardsDefaultTags" />
      </div>
    </div>`)
    for(let button of card.children[0].children){
      button.addEventListener("click", ()=>{
        let previous = card.querySelector("[data-visible]")
        if(previous){
          previous.removeAttribute("data-visible")
          card.children[0].querySelector(`[data-page=${previous.dataset.page}]`).classList.remove("bg-red-darker")
        }
        card.querySelector(`div[data-page="${button.dataset.page}"]`).dataset.visible = true
        card.children[0].querySelector(`[data-page="${button.dataset.page}"]`).classList.add("bg-red-darker")

        if(button.dataset.page==="checklist" && !daily.seenChecklist){
          daily.seenChecklist = true
          GM_setValue("daily", daily)
        }
      })
    }
    card.children[0].children[daily.seenChecklist ? 1 : 0].click()

    let checklist = card.querySelector(`div[data-page="checklist"]`)
    let models = {}
    for(let e of card.querySelectorAll("[data-model]")){
      models[e.dataset.model] = e
      e.remove()
    }

    let cooldowns = GM_getValue("cooldowns", [])
    let actions = []
    if(true){
      actions.push({
        name: "Visit trader",
        done: !!daily.visitedTrader,
        url: "/trader",
      })
    }
    if(true){
      let n = +document.querySelector(`#menu-main a[href="https://waifugame.com/swiper"] span.badge`)?.innerText || 0
      if(!(n >= group6h.lowestEncountersCount)){
        group6h.lowestEncountersCount = n
      }
      actions.push({
        name: "Swipe",
        progress: Math.min(group6h.lowestEncountersCount, [75, 100, 125, 150][subscription.current || 0]),
        done: group6h.lowestEncountersCount < 10,
        timers: [{
          t: group6h.next,
          name: "Next Just4U encounters",
        }],
        url: "/swiper",
      })
    }
    if(true){
      let n = document.querySelector(`#menu-main a[href="https://waifugame.com/battle"] span.badge`)?.innerText
      if(n){
        actions.push({
          name: "Battle",
          progress: +n,
          done: false,
          url: "/battle",
        })
      }
    }
    if(cooldowns.find(e=>e.type.startsWith("mission."))){
      let l = cooldowns.filter(e=>e.type.startsWith("mission.") && e.t>tnow)
      actions.push({
        name: l.length ? "Waifuville missions" : "Start Waifuville mission",
        timers: l.map(e=>({ t: e.t, name: e.MyfuName })),
        done: l.length >= (checklistSettings.WaifuvilleMissionsGoal ?? 4),
        url: "/ville",
      })
    }
    if(true){
      let n = !daily.gyms ? 0 : Object.values(daily.gyms).reduce((p, n)=>p+n, 0)
      actions.push({
        name: "Farm gyms",
        progress: n,
        maxProgress: 90,
        url: "/battle",
        done: n >= (checklistSettings.gymsGoal ?? 90),
      })
    }
    if(subscription.current > 0){
      let max = [0, 1, 5, 10][subscription.current]
      actions.push({
        name: "Create cards",
        progress: daily.createdCards || 0,
        maxProgress: max,
        done: daily.createdCards>=max,
        url: "/cards/new",
      })
    }

    actions = actions.sort((a1, a2)=>+a1.done - +a2.done)
    let hasTimers
    for(let i in actions){
      let action = actions[i]
      let row = models.row.cloneNode(true)
      row.children[0].children[0].innerText = action.name
      if(action.progress >= 0){
        let progress = models.progress.cloneNode(true)
        progress.innerText = action.progress + (action.maxProgress ? "/"+action.maxProgress : "")
        row.children[1].append(progress)
      }
      if(action.timers?.length){
        for(let t of action.timers){
          let e = models.timer.cloneNode(true)
          e.dataset.countdown = Math.floor(t.t/1000)+""
          if(t.name){e.setAttribute("data-tippy-content", t.name)}
          row.children[1].append(e)
        }
        hasTimers = true
      }
      row.dataset.done = (!!action.done)+""
      if(action.url){row.children[0].children[0].href = action.url}
      if(action.done && row.children[1].children.length===0){
        let e = models.checkmark.cloneNode(true)
        row.children[1].append(e)
      }
      checklist.append(row)
    }
    if(hasTimers){
      $countdowns = $("[data-countdown]")
      startCountdown()
      tippy("[data-tippy-content]")
    }
    GM_setValue("daily", daily)
    
    checklist.append(models.settingsButton)
    models.settingsButton.addEventListener("click", ev=>{
      card.querySelector(`[data-page="settings"]`).click()
    })
    let settingsPage = card.querySelector(`div[data-page="settings"]`)
    settingsPage.addEventListener("change", ev=>{
      if(ev.target.parentElement === settingsPage){
        let previous = settingsPage.querySelector(`[data-visible]`)
        if(previous){
          previous.removeAttribute("data-visible")
        }
        settingsPage.querySelector(`div[data-settings="${ev.target.value}"]`).dataset.visible = true
      return}

      if(!ev.target.dataset.setting){return}

      if(ev.target.dataset.setting === "LubloxKey"){
        // Check maybe
        GM_setValue("LubloxKey", ev.target.value)
      return}

      if(ev.target.tagName==="select" && ev.target.max > 1){
        checklistSettings[ev.target.dataset.setting] = [...ev.target.options].filter(o=>o.selected).map(o=>o.value)
      }else{
        checklistSettings[ev.target.dataset.setting] = ev.target.value
      }
      GM_setValue("checklistSettings", checklistSettings)
    })

    for(let e of settingsPage.querySelectorAll("[data-setting]")){
      if(e.dataset.setting === "LubloxKey"){
        e.value = GM_getValue("LubloxKey", "")
      continue}
      let value = checklistSettings[e.dataset.setting]
      if(!value){continue}
      if(e.target.tagName==="select" && e.target.max > 1 && value instanceof Array){
        for(let option of value){
          let o = e.target.options.find(o=>o.value === option)
          if(o){o.selected = true}
        }
      }else{
        e.value = value
      }
    }
  }

  if(path.startsWith("/ville/")){
    let trying = null

    let originalBuildMap = buildMap
    buildMap = (...args)=>{
      if(trying){
        addCooldown(trying)
      trying = null}
      return originalBuildMap(...args)
    }

    let startFormHandler = ()=>{
      let startForm = document.querySelector("#startMission")
      let Myfus = [...startForm.querySelectorAll(".myfu-item.active")]
      let CR = +startForm.querySelector("#myfuMissionChallengeRating").value
      trying = {
        type: "mission."+Myfus[0].dataset.id,
        MyfuName: Myfus[0].querySelector("h5").innerText,
        t: +new Date() + Math.max(CR - Myfus.reduce((p, m)=>p+m.dataset.sp, 0), CR*0.2)*1000,
      }
    }

    let originalDeployMenu = deployMenu
    let loadingBuilding = false
    deployMenu = (...args)=>{
      if(args[0]==="BuildingMenu"){loadingBuilding = true}
      return originalDeployMenu(...args)
    }

    let originalDynamicInit = dynamicInit
    dynamicInit = (...args)=>{
      if(loadingBuilding){
        document.querySelector("#startMission")?.addEventListener("submit", startFormHandler)
      }
      return originalDynamicInit(...args)
    }
  }

  if(path.startsWith("/quests/")){
    let form = document.querySelector(".content form")
    if(form?.action?.endsWith("/battle")){ // Gyms
      form.addEventListener("submit", ()=>{
        let gym = +path.split("/")[2]
        GM_setValue("tryingGym", gym)
      })
    }
  }
  if(path.startsWith("/battle/")){
    let gym = GM_getValue("tryingGym")
    if(!gym){return}
    let originalShowInventory = showInventory
    showInventory = (...args)=>{
      if(args[0].output.foes.total >= 6){
        if(!daily.gyms){daily.gyms = {}}
        daily.gyms[gym] = (daily.gyms[gym]||0) +1
        GM_setValue("daily", daily)
        GM_setValue("tryingGym", null)
      }
      showInventory = originalShowInventory
      return originalShowInventory(...args)
    }
  }
  if(path==="/battle"){
    for(let button of document.querySelector(".page-content .content .text-center.mb-3").querySelectorAll(".col-6.col-md-4 a")){
      let gym = +button.href.slice(-2)
      button.childNodes[2].data = ` Gym ${gym-66} (${daily.gyms?.[gym] || 0}/10)`
    }
  }

  if(path==="/profile"){
    // GM_setValue("subscription", subscription)
  }
  if(path==="/cards/new"){
    let finished = document.querySelector(".alert.alert-danger.mx-3:has([data-countdown])")
    let e = document.querySelector(".page-content center span")
    daily.createdCards = finished ? +finished.innerText.match(/\((.*?)\)/g)[0].slice(1, -1) : e ? +e.innerText : 0
    GM_setValue("daily", daily)
    if(finished){return}

    e = +document.querySelector(".page-content center span:nth-child(2)")?.innerText || 0
    subscription.current = [0, 1, 5, 10].findIndex(n=>n===e)
    GM_setValue("subscription", subscription)
  }

  if(path==="/trader"){
    if(!daily.visitedTrader){
      daily.visitedTrader = true
      GM_setValue("daily", daily)
    }
  }
})()

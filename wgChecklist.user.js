// ==UserScript==
// @name         Waifugame checklist
// @namespace    http://tampermonkey.net/
// @version      2026-08-09
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

  if(typeof(startCountdown)==="undefined"){return} // Requires normal pages

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
      GM_setValue("daily", daily = {day, nextDay})
    }
  }

  // Bookmarks in side bar
  document.querySelector("#menu-main").insertAdjacentHTML("beforeend",
    `<h6 class="menu-divider mt-4">Bookmarks</h6>
    <div class="list-group list-custom-small list-menu" id="bookmarks-list">
      <a href="javascript: void 0">
        <i class="fa fa-bookmark color-white" style="background: linear-gradient(20deg, #2a2, #397)"></i>
        <span>Bookmark</span>
      </a>
    </div>`
  )
  let bookmarks = document.querySelector("#bookmarks-list")

  if(path==="/home"){
    let card = document.querySelector(`a[href="/questline/limited"]`).closest(".card")
    card.classList.add("checklist-card")
    card.children[0].dataset.page = "quests"
    card.insertAdjacentHTML("afterbegin", `
    <div class="tabs-small shadow-xl flex-tabs" data-tab-items="2">
      <a href="javascript:void 0" data-page="quests">Limited quests</a>
      <a href="javascript:void 0" data-page="checklist">Checklist</a>
    </div>
    <style>
      .checklist-card div[data-page] {
        display: none;
        color: #eee;
      }
      .checklist-card div[data-page][data-visible] {
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
        min-width: 30px;
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
    </style>
    <div data-page="checklist" id="checklist">
      <div data-model="row">
        <span><a></a></span>
        <div data-thing="right-side">
          <a class="badge colorful-background" data-model="progress"></a>
          <a class="badge colorful-background" data-model="timer"></a>
        </div>
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

    let checklist = card.querySelector("#checklist")
    let models = {}
    for(let e of checklist.querySelectorAll("[data-model]")){
      models[e.dataset.model] = e
      e.remove()
    }

    let cooldowns = GM_getValue("cooldowns", [])
    let actions = []
    // Swipe through Just4U encounters
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
        done: l.length > 0,
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
        done: n >= 1,
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
      if(action.url){row.children[0].children[0].href = action.url} // Probably won't work
      checklist.append(row)
    }
    if(hasTimers){
      $countdowns = $("[data-countdown]")
      startCountdown()
      tippy("[data-tippy-content]")
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
    let e = document.querySelector(".page-content center span")
    daily.createdCards = e ? +e.innerText : 0
    GM_setValue("daily", daily)

    e = +document.querySelector(".page-content center span:nth-child(2)")?.innerText || 0
    subscription.current = [0, 1, 5, 10].findIndex(n=>n===e)
    GM_setValue("subscription", subscription)
  }
})()

// ==UserScript==
// @name         Waifugame checklist
// @namespace    http://tampermonkey.net/
// @version      2026-08-07
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
      }).catch(e=>showErrroToast(e.body))
    }
  }

  let day; let daily
  if(!day){
    day = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/New_York",
    }).format(new Date()).split(", ")
    day[0] = day[0].split("/")
    day = +day[0][0] + +day[0][1]*50 + +day[0][2]*400 + (+day[1].split(":")[0] >= 6 ? 1 : 0)
    daily = GM_getValue("daily", {})
    if(daily.day < day){
      GM_setValue("daily", daily = {day})
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
        if(!daily.gyms){daily.gyms = {}}
        let gym = path.split("/")[2]
        daily.gyms[gym] = (daily.gyms[gym]||0) +1
        GM_setValue("daily", daily)
      })
    }
  }
})()

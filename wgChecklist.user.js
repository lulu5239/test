// ==UserScript==
// @name         Waifugame checklist
// @namespace    http://tampermonkey.net/
// @version      2026-08-06
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
    cooldowns.push(e)
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

  // Bookmarks in side bar

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
        MyfuName: Myfus.querySelector("h5").innerText,
        t: +new Date() + Math.max(CR - Myfus.reduce((p, m)=>p+m.dataset.sp, 0), CR*0.2),
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
})()

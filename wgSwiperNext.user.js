// ==UserScript==
// @name         Waifugame swiper next
// @namespace    http://tampermonkey.net/
// @version      2025-03-27
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
      })
      if(i===1){
        button.style.border = "solid 2px #"+colors.selected
      }
    }
    
    let cardActions = localStorage["y_WG-cardActions"] ? JSON.parse(localStorage["y_WG-cardActions"]) : {}
    let originalPostServer = postServer
    postServer = (...args)=>{
      let card = $($('.tinder--card[data-encounterid=' + args[0] + ']')).data("data")
      let action = selectedOnce!==null ? selectedOnce : selected
      if(action!==1){
        cardActions[card.card_id] = action
        localStorage["y_WG-cardActions"] = JSON.stringify(cardActions)
      }
      if(selectedOnce!==null){
        document.querySelector(`.swiperNextButton[data-nextaction="${selected}"]`).style.border = "solid 3px #"+colors.selected
        document.querySelector(`.swiperNextButton[data-nextaction="${selectedOnce}"]`).style.border = null
        selectedOnce = null
      }
      return originalPostServer(...args)
    }
  }
})();

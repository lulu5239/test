// ==UserScript==
// @name         Battle macros
// @version      0.1
// @description  Use skills in a specific order by pressing less buttons.
// @author       Lalabels
// @match        *://game.granbluefantasy.jp/*
// @match        *://gbf.game.mbga.jp/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

var click = e=>e.dispatchEvent(new Event("tap",{bubbles:true, cancelable:true}))

var onPage = async ()=>{
  if(!document.location.hash?.startsWith("#battle")){return}
  
}

window.addEventListener("hashchange", onPage)
onPage()

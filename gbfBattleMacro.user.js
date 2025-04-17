// ==UserScript==
// @name         Battle macros
// @version      2025-04-17
// @description  Use skills in a specific order by pressing less buttons.
// @author       Lulu5239
// @updateURL    https://github.com/lulu5239/test/raw/refs/heads/master/gbfBattleMacro.user.js
// @downloadURL  https://github.com/lulu5239/test/raw/refs/heads/master/gbfBattleMacro.user.js
// @match        *://game.granbluefantasy.jp/*
// @match        *://gbf.game.mbga.jp/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

var click = e=>e.dispatchEvent(new Event("tap",{bubbles:true, cancelable:true}))

var onPage = async ()=>{
  if(!document.location.hash?.startsWith("#battle") && !document.location.hash?.startsWith("#raid")){return}
  document.querySelector(".ctn-raid").style.paddingBottom = null
  let macros = GM_getValue("macros") || []
  document.querySelector(".contents").insertAdjacentHTML("beforeend",
    `<div id="macros-list">${macros.map(macro=>(
      `<div class="listed-macro" data-id="${macro.id}">${macro.name}</div>`
    ))}<div class="listed-macro" data-id="new">New...</div></div>
    <style>
      .listed-macro {
        display:block;
        width:100%;
        padding:5px;
        background:#222;
        color:#fff;
        margin-bottom:2px;
      }
    </style>`
  )
}

window.addEventListener("hashchange", onPage)
onPage()

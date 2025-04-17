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
var recordFunction
document.addEventListener("click", ev=>{
  if(recordFunction){recordFunction(ev.target)}
})

var onPage = async ()=>{
  if(document.querySelectorAll("#macros-list").length || !document.location.hash?.startsWith("#battle") && !document.location.hash?.startsWith("#raid")){return}
  while(!document.querySelectorAll("#tpl-prt-total-damage").length){await new Promise(ok=>setTimeout(ok,100))}
  document.querySelector(".cnt-raid").style.paddingBottom = "0px"
  let macros = GM_getValue("macros") || []
  document.querySelector(".contents").insertAdjacentHTML("beforeend",
    `<div id="macros-list"><div class="listed-macro" data-id="new">New...</div></div>
    <div id="macro-recording" style="display:none"><div class="listed-macro" data-id="stop">Stop recording</div></div>
    <style>
      .listed-macro {
        display:block;
        width:calc(100% - 10px);
        padding:5px;
        background:#222;
        color:#fff;
        margin-bottom:2px;
      }
    </style>`
  )
  let list = document.querySelector("#macros-list")
  let observer = new MutationObserver(onPage)
  observer.observe(list.parentElement, {
    childList:true,
  })
  let recording = document.querySelector("#macro-recording")

  let playMacro = async macro=>{
    for(let action of macro.actions){
      if(action.type==="skill"){
        let button = document.querySelectorAll(`div[ability-id="${action.ability}"]`)[0]
        if(button){
          if(document.querySelector(`.prt-command-chara[pos="${+button.getAttribute("character-num")+1}"]`).style.display==="none"){
            click(document.querySelector(`.btn-command-back`))
            await new Promise(ok=>setTimeout(ok,100))
            click(document.querySelector(`.btn-command-character[pos="${+button.getAttribute("character-num")}"]`))
          }
          click(button)
        }
      }
    }
  }

  let createListedMacro = i=>{
    let macro = macros[i]
    list.querySelector(`.listed-macro[data-id="new"]`).insertAdjacentHTML("beforebegin", `<div class="listed-macro" data-id="${macro.id}"><button>⚙️</button> ${macro.name}</div>`)
    let line = list.querySelector(`.listed-macro[data-id="${macro.id}"]`)
    line.addEventListener("click", async ()=>{
      line.style.backgroundColor = "#922"
      await playMacro(macro)
      line.style.backgroundColor = null
    })
    line.querySelector(`button`).addEventListener("click", ()=>{
      // Macro settings
    })
  }
  for(let i in macros){
    createListedMacro(i)
  }

  list.querySelector(`.listed-macro[data-id="new"]`).addEventListener("click", ()=>{
    list.style.display = "none"
    recording.style.display = null
    recordFunction = original=>{
      let usefulParent = original
      while(usefulParent && !usefulParent.classList.contains("lis-ability")){
        usefulParent = usefulParent.parentElement
      }
      if(!usefulParent){return}
      usefulParent = usefulParent.querySelector("[ability-id]")
      recording.insertAdjacentHTML("beforeend", `<div class="listed-macro" data-type="skill" data-ability="${usefulParent.getAttribute("ability-id")}">${usefulParent.getAttribute("ability-name")}</div>`)
    }
  })
  recording.querySelector(`.listed-macro[data-id="stop"]`).addEventListener("click", ()=>{
    let name = prompt("Macro name?")
    if(!name){return}
    let macro = {
      name,
      actions:[],
    }
    for(let action of recording.querySelectorAll(".listed-macro[data-ability]")){
      macro.actions.push({
        type:action.dataset.type,
        ability:action.dataset.ability,
        name:action.innerText,
      })
    }
    macros.push(macro)
    createListedMacro(macros.length-1)
    list.style.display = null
    recording.style.display = "none"
    GM_setValue("macros", macros)
  })
}

window.addEventListener("hashchange", onPage)
onPage()

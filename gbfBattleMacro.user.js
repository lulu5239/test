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
var recordFunction; let recordable

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

  let characterByImage = url=>url.split("/").slice(-1)[0].split("_")[0]
  let playMacro = async macro=>{
    let wait = ()=>new Promise(ok=>setTimeout(ok,macro.speed==="slow" ? 2000 : 500))
    for(let action of macro.actions){
      if(action.type==="skill"){
        let button = document.querySelectorAll(`div[ability-id="${action.ability}"]`)[0]
        if(button){
          if(document.querySelector(`.prt-command-chara[pos="${+button.getAttribute("ability-character-num")+1}"]`).style.display!=="block"){
            click(document.querySelector(`.btn-command-back`))
            await wait()
            click(document.querySelector(`.btn-command-character[pos="${+button.getAttribute("ability-character-num")}"]`))
            await wait()
          }
          click(button)
          if(action.character){
            await wait()
            let character
            for(let c of document.querySelectorAll(`.pop-select-member .prt-character .btn-command-character img`)){
              if(characterByImage(c.src)===action.character){
                character = c
              }
            }
            if(character){
              click(character)
              await wait()
            }
          }
          if(macro.speed==="slow"){await wait()}
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

  let skillByImage = url=>document.querySelector(`.prt-ability-list img[src="${url}"]`).parentElement
  if(!recordable){
    $(document.body).on("tap", ev=>{
      if(recordFunction){recordFunction(ev.target)}
    })
    recordable = true
  }
  list.querySelector(`.listed-macro[data-id="new"]`).addEventListener("click", ()=>{
    list.style.display = "none"
    recording.style.display = null
    recordFunction = original=>{
      let usefulParent = original
      let character
      while(usefulParent && !usefulParent.classList.contains("lis-ability") && !usefulParent.classList.contains("prt-popup-body")){
        if(usefulParent.classList.contains("btn-command-character")){character = usefulParent}
        usefulParent = usefulParent.parentElement
      }
      if(!usefulParent){return}
      let extra = {type:"skill"}
      if(usefulParent.parentElement.classList.contains("pop-usual") && character){
        extra.character = characterByImage(character.querySelector("img.img-chara-command").src)
        usefulParent = skillByImage(usefulParent.querySelector("img.img-ability-icon").src)
      }else{
        usefulParent = usefulParent.querySelector("[ability-id]")
      }
      recording.insertAdjacentHTML("beforeend", `<div class="listed-macro" data-ability="${usefulParent.getAttribute("ability-id")}" ${Object.keys(extra).map(k=>`data-${k}="${extra[k]}"`).join(" ")}>${usefulParent.getAttribute("ability-name")}</div>`)
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
        character:action.dataset.character || undefined,
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

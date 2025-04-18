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
    <div id="macro-settings" style="display:none">
      <div class="listed-macro" style="background-color:#111">Back</div>
      <div class="listed-macro"></div>
      <div class="listed-macro">Rename</div>
      <div class="listed-macro"></div>
      <div class="listed-macro"></div>
      <div class="listed-macro">Move...</div>
      <div class="listed-macro" style="background-color:#411">Delete</div>
    </div>
    <style>
      .listed-macro {
        display:block;
        width:calc(100% - 10px);
        padding:5px;
        background-color:#222;
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
  let settings = document.querySelector("#macro-settings")
  
  let characterByImage = url=>url.split("/").slice(-1)[0].split("_")[0]
  let playMacro = async macro=>{
    let wait = time=>new Promise(ok=>setTimeout(ok,time ? time : macro.speed==="slow" ? 2000 : 500))
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
          await wait(200)
        }
      }
    }
  }

  let createListedMacro = i=>{
    let macro = macros[i]
    list.querySelector(`.listed-macro[data-id="new"]`).insertAdjacentHTML("beforebegin", `<div class="listed-macro" data-id="${i}"><button>⚙️</button> ${macro.name}</div>`)
    let line = list.querySelector(`.listed-macro[data-id="${i}"]`)
    line.addEventListener("click", async ()=>{
      line.style.backgroundColor = "#922"
      await playMacro(macro)
      line.style.backgroundColor = null
    })
    line.querySelector(`button`).addEventListener("click", ()=>{
      list.style.display = "none"
      settings.style.display = null
      settings.dataset.macro = ""+i
      settings.children[1].innerText = macro.name
      settings.children[3].innerText = macro.parties.includes && macro.parties.includes(partyHash) ? "Don't show for this party" : "Show for this party"
      settings.children[3].style.display = !macro.parties ? "none" : null
      settings.children[4].style.innerText = !macro.parties ? "Don't always show" : "Always show"
    })
  }
  for(let i in macros){
    if(macros[i].parties && !macros[i].parties.includes(partyHash)){continue}
    createListedMacro(i)
  }

  let partyHash
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
      parties:[partyHash],
    }
    for(let action of recording.querySelectorAll(".listed-macro[data-ability]")){
      macro.actions.push({
        type:action.dataset.type,
        ability:action.dataset.ability,
        name:action.innerText,
        character:action.dataset.character || undefined,
      })
      action.remove()
    }
    macros.push(macro)
    createListedMacro(macros.length-1)
    list.style.display = null
    recording.style.display = "none"
    GM_setValue("macros", macros)
  })

  settings.children[0].addEventListener("click", ()=>{
    settings.style.display = "none"
    list.style.display = null
  })
  settings.children[2].addEventListener("click", ()=>{
    let name = prompt("New macro name")
    if(!name){return}
    macros[+settings.dataset.macro].name = name
    settings.children[1].innerText = name
    list.querySelector(`[data-id="${+settings.dataset.macro}"]`).innerText = name
  })
  settings.children[3].addEventListener("click", ()=>{
    let macro = macros[+settings.dataset.macro]
    let i = macro.parties.findIndex(p=>p===partyHash)
    if(i===-1){
      macro.parties.push(partyHash)
    }else{
      macro.parties.splice(i,1)
    }
    settings.children[3].innerText = i===-1 ? "Don't show for this party" : "Show for this party"
  })
  settings.children[4].addEventListener("click", ()=>{
    let macro = macros[+settings.dataset.macro]
    if(macro.parties){
      delete macro.parties
    }else{
      macro.parties = [partyHash]
    }
    settings.children[3].innerText = "Don't show for this party"
    settings.children[3].style.display = !macro.parties ? "none" : null
    settings.children[4].style.innerText = !macro.parties ? "Don't always show" : "Always show"
  })
  settings.children[6].addEventListener("click", ()=>{
    if(!confirm("Delete the macro?")){return}
    let i = +settings.dataset.macro
    list.querySelector(`[data-id="${i}"]`).remove()
    macros.splice(+settings.dataset.macro, 1)
    for(let e of list.querySelectorAll("[data-id]")){
      if(e.dataset.id>i){
        e.dataset.id = +e.dataset.id -1
      }
    }
    settings.style.display = "none"
    list.style.display = null
  })
}

window.addEventListener("hashchange", onPage)
onPage()

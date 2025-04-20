// ==UserScript==
// @name         Battle macros
// @version      2025-04-20
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
let cancel = 0

var onPage = async ()=>{
  if(document.querySelectorAll("#macros-list").length || !document.location.hash?.startsWith("#battle") && !document.location.hash?.startsWith("#raid")){return}
  while(typeof(stage)=="undefined" || !stage?.pJsnData || !document.querySelectorAll("#tpl-prt-total-damage").length){await new Promise(ok=>setTimeout(ok,100))}
  
  document.querySelector(".cnt-raid").style.paddingBottom = "0px"
  document.querySelector(".prt-raid-log").style.pointerEvents = "none"
  cancel++
  
  let macros = GM_getValue("macros") || []
  document.querySelector(".contents").insertAdjacentHTML("beforeend",
    `<div id="macros-list"><div class="listed-macro" data-id="new">New...</div><div class="listed-macro" data-id="showAll">Show all</div><div class="listed-macro" data-id="cancel" style="display:none">Stop playing</div></div>
    <div id="macro-recording" style="display:none"><div class="listed-macro" data-id="stop"><button>End recording</button> <button>Cancel</button> <button>Add macro</button></div></div>
    <div id="macro-settings" style="display:none">
      <div class="listed-macro" style="background-color:#111">Back</div>
      <div class="listed-macro" style="text-align:center"></div>
      <div class="listed-macro">Rename</div>
      <div class="listed-macro"></div>
      <div class="listed-macro"></div>
      <div class="listed-macro">Move...</div>
      <div class="listed-macro">Speed: <select><option value="slow">Slow</option><<option value="normal">Normal</option></select></div>
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
      .listed-macro[data-playing="now"] {
        background-color:#922;
      }
      .listed-macro[data-playing="soon"] {
        background-color:#742;
      }
      .listed-macro[data-playing="original"] {
        background-color:#472;
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
  let partyHash = [stage.pJsnData.player.param.map(e=>e.pid).join(","), stage.pJsnData.summon.map(s=>s.id).join(",")].join(";")
  
  let characterByImage = url=>url.split("/").slice(-1)[0].split("_")[0]
  let playMacro = async id=>{
    let macro = macros[id]
    let line = list.querySelector(`[data-id="${id}"]`)
    line.dataset.playing = "now"
    list.querySelector(`.listed-macro[data-id="cancel"]`).style.display = null
    let actions = [...macro.actions]
    let next = {}
    let check; check = (n,rec)=>{
      if(rec && !next[n]){
        list.querySelector(`[data-id="${n}"]`).dataset.playing = "soon"
        next[n] = 1
      }else{next[n]++}
      if(rec>10){return}
      for(let action of macros[n].actions){
        if(action.type!=="macro"){continue}
        check(action.macro, rec+1)
      }
    }
    next[id] = 1
    check(id,0)
    let playing = [id]
    let wait = time=>new Promise(ok=>setTimeout(ok,time ? time : macro.speed==="slow" ? 2000 : 500))
    let myCancel = cancel
    while(actions.length){
      if(cancel>myCancel){break}
      let action = actions.splice(0,1)[0]
      if(action.type==="macro"){
        if(!macros[action.macro]){continue}
        next[action.macro]--
        list.querySelector(`[data-id="${playing.slice(-1)[0]}"]`).dataset.playing = playing.slice(-1)[0]===id ? "original" : "soon"
        list.querySelector(`[data-id="${action.macro}"]`).dataset.playing = "now"
        playing.push(action.macro)
        actions.splice(0, 0, ...macros[action.macro].actions, {type:"leaveMacro"})
      continue}
      if(action.type==="leaveMacro"){
        let last = playing.splice(-1, 1)[0]
        if(next[last]>0){
          list.querySelector(`[data-id="${last}"]`).dataset.playing = "soon"
        }else{
          list.querySelector(`[data-id="${last}"]`).removeAttribute("data-playing")
        }
        list.querySelector(`[data-id="${playing.slice(-1)[0]}"]`).dataset.playing = "now"
      continue}
      
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
      }else if(action.type==="attack"){
        let button = document.querySelectorAll(`.btn-attack-start.display-on`)[0]
        if(button){
          click(button)
          await new Promise((ok,err)=>{
            let observer = new MutationObserver(()=>{
              if(cancel>myCancel || button.classList.contains("display-on")){ok()}
            })
            observer.observe(button, {
              attributes:true,
            })
          })
        }
      }else if(action.type==="summon"){
        let button = document.querySelectorAll(".btn-command-summon.summon-on")[0]
        if(!button){continue}
        click(button)
        await wait()
        button = document.querySelectorAll(`.btn-summon-available.on[summon-id="${action.summon}"]`)[0]
        if(!button){continue}
        click(button)
        await wait(200)
        click(document.querySelector(".btn-summon-use"))
        await wait()
      }
    }
    list.querySelector(`[data-id="${id}"]`).removeAttribute("data-playing")
    for(let i in next){
      list.querySelector(`[data-id="${i}"]`).removeAttribute("data-playing")
    }
    if(!list.querySelectorAll("[data-playing]").length){
      list.querySelector(`.listed-macro[data-id="cancel"]`).style.backgroundColor = null
      list.querySelector(`.listed-macro[data-id="cancel"]`).style.display = "none"
    }
  }

  let moveMode; let showAll
  let createListedMacro = i=>{
    let macro = macros[i]
    list.querySelector(`.listed-macro[data-id="new"]`).insertAdjacentHTML("beforebegin", `<div class="listed-macro" data-id="${i}"><button style="padding:0px; font-size:8px; width:25px; display:inline-block">⚙️</button> <a>${macro.name}</a></div>`)
    let line = list.querySelector(`.listed-macro[data-id="${i}"]`)
    line.addEventListener("click", async ()=>{
      if(line.dataset.playing){return}
      if(moveMode!==undefined){return moveMode(line)}
      await playMacro(line.dataset.id)
    })
    line.querySelector(`button`).addEventListener("click", ev=>{
      if(moveMode!==undefined){return}
      ev.stopPropagation()
      list.style.display = "none"
      settings.style.display = null
      settings.dataset.macro = line.dataset.id
      settings.children[1].innerText = macro.name
      settings.children[3].innerText = macro.parties?.includes(partyHash) ? "Don't show for this party" : "Show for this party"
      settings.children[3].style.display = !macro.parties ? "none" : null
      settings.children[4].innerText = !macro.parties ? "Don't always show" : "Always show"
      settings.children[6].querySelector("select").value = macro.speed || "normal"
      window.scrollTo(0, window.innerHeight)
    })
  }
  let listMacros = ()=>{
    for(let i in macros){
      if(!showAll && macros[i].parties && !macros[i].parties.includes(partyHash)){continue}
      createListedMacro(i)
    }
  }
  listMacros()
  
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
      while(usefulParent && !["lis-ability","prt-popup-body","btn-attack-start","btn-summon-use"].find(c=>usefulParent.classList.contains(c))){
        if(usefulParent.classList.contains("btn-command-character")){character = usefulParent}
        usefulParent = usefulParent.parentElement
      }
      if(!usefulParent){return}
      let extra = {}
      let text
      if(usefulParent.classList.contains("btn-attack-start")){
        extra.type = "attack"
        text = "Attack"
      }else if(usefulParent.classList.contains("btn-summon-use")){
        extra.type = "summon"
        extra.summon = usefulParent.getAttribute("summon-id")
        text = usefulParent.getAttribute("summon-skill-name")
      }else{
        extra.type = "skill"
        if(usefulParent.parentElement.classList.contains("pop-usual") && character){
          extra.character = characterByImage(character.querySelector("img.img-chara-command").src)
          usefulParent = skillByImage(usefulParent.querySelector("img.img-ability-icon").src)
        }else{
          usefulParent = usefulParent.querySelector("[ability-id]")
        }
        extra.ability = usefulParent.getAttribute("ability-id")
        text = usefulParent.getAttribute("ability-name")
      }
      recording.insertAdjacentHTML("beforeend", `<div class="listed-macro" style="background-color:#${extra.type==="skill" ? "141" : extra.type==="attack" ? "411" : extra.type==="summon" ? "441" : "0000"}" ${Object.keys(extra).map(k=>`data-${k}="${extra[k]}"`).join(" ")}>${text}</div>`)
    }
  })
  list.querySelector(`.listed-macro[data-id="showAll"]`).addEventListener("click", ()=>{
    showAll = true
    list.querySelector(`.listed-macro[data-id="showAll"]`).style.display = "none"
    for(let e of list.querySelectorAll(`.listed-macro[data-id]`)){
      if(+e.dataset.id>=0){e.remove()}
    }
    listMacros()
  })
  list.querySelector(`.listed-macro[data-id="cancel"]`).addEventListener("click", ()=>{
    cancel++
    list.querySelector(`.listed-macro[data-id="cancel"]`).style.backgroundColor = "#422"
  })
  recording.querySelector(`.listed-macro[data-id="stop"]`).children[0].addEventListener("click", ()=>{
    let name = prompt("Macro name?")
    if(!name){return}
    let macro = {
      name,
      actions:[],
      parties:[partyHash],
    }
    for(let action of recording.querySelectorAll(".listed-macro[data-type]")){
      action.remove()
      if(action.dataset.type==="macro" && action.dataset.macro===undefined){continue}
      macro.actions.push({
        name:action.innerText,
        ...action.dataset,
      })
    }
    macros.push(macro)
    createListedMacro(macros.length-1)
    list.style.display = null
    recording.style.display = "none"
    GM_setValue("macros", macros)
  })
  recording.querySelector(`.listed-macro[data-id="stop"]`).children[1].addEventListener("click", ()=>{
    for(let action of recording.querySelectorAll(".listed-macro[data-type]")){
      action.remove()
    }
    list.style.display = null
    recording.style.display = "none"
  })
  recording.querySelector(`.listed-macro[data-id="stop"]`).children[2].addEventListener("click", ()=>{
    recording.insertAdjacentHTML("beforeend", `<div class="listed-macro" style="background-color:#437" data-type="macro"><select class="new-select-thing">${macros.map((m,i)=>`<option value="${i}">${m.name}</option>`)}</select></div>`)
    let select = recording.querySelector(".new-select-thing")
    select.className = null
    select.addEventListener("change", ()=>{
      select.parentElement.dataset.macro = select.value
      select.parentElement.innerText = macros[+select.value].name
    })
  })

  settings.children[0].addEventListener("click", ()=>{
    settings.style.display = "none"
    list.style.display = null
  GM_setValue("macros", macros)})
  settings.children[2].addEventListener("click", ()=>{
    let name = prompt("New macro name")
    if(!name){return}
    macros[+settings.dataset.macro].name = name
    settings.children[1].innerText = name
    list.querySelector(`[data-id="${+settings.dataset.macro}"] a`).innerText = name
  GM_setValue("macros", macros)})
  settings.children[3].addEventListener("click", ()=>{
    let macro = macros[+settings.dataset.macro]
    let i = macro.parties.findIndex(p=>p===partyHash)
    if(i===-1){
      macro.parties.push(partyHash)
    }else{
      macro.parties.splice(i,1)
    }
    settings.children[3].innerText = i===-1 ? "Don't show for this party" : "Show for this party"
  GM_setValue("macros", macros)})
  settings.children[4].addEventListener("click", ()=>{
    let macro = macros[+settings.dataset.macro]
    if(macro.parties){
      delete macro.parties
    }else{
      macro.parties = [partyHash]
    }
    settings.children[3].innerText = "Don't show for this party"
    settings.children[3].style.display = !macro.parties ? "none" : null
    settings.children[4].innerText = !macro.parties ? "Don't always show" : "Always show"
  GM_setValue("macros", macros)})
  settings.children[5].addEventListener("click", ()=>{
    list.insertAdjacentHTML("afterbegin", `<div class="listed-macro" data-id="moveAfter">Move macro after...</div>`)
    let line = list.querySelector(`.listed-macro[data-id="moveAfter"]`)
    moveMode = element=>{
      let before = +settings.dataset.macro; let after = +element.dataset.id
      for(let m of macros){
        for(let a of m.actions){
          if(a.type!=="macro"){continue}
          if(a.macro===before){
            a.macro = after
          }else if(a.macro<before && a.macro>=after){
            a.macro++
          }else if(a.macro>before && a.macro<=after){
            a.macro--
          }
        }
      }
      let macro = macros[before]
      macros[before] = null
      macros.splice(+element.dataset.id>=0 ? after +1 : 0, 0, macro)
      macros.splice(macros.findIndex(m=>!m), 1)
      for(let e of list.querySelectorAll(`.listed-macro[data-id]`)){
        if(+e.dataset.id>=0){e.remove()}
      }
      listMacros()
      moveMode = undefined
      settings.style.display = null
      list.style.display = "none"
      list.querySelector(`.listed-macro[data-id="moveAfter"]`).remove()
      if(!showAll){
        list.querySelector(`.listed-macro[data-id="showAll"]`).style.display = null
      }
    GM_setValue("macros", macros)}
    list.querySelector(`.listed-macro[data-id="showAll"]`).style.display = "none"
    line.addEventListener("click", ()=>{
      moveMode(line)
    })
    settings.style.display = "none"
    list.style.display = null
  })
  settings.children[6].querySelector("select").addEventListener("change", ()=>{
    macros[+settings.dataset.macro].speed = settings.children[6].querySelector("select").value
  GM_setValue("macros", macros)})
  settings.children[7].addEventListener("click", ()=>{
    if(!confirm("Delete the macro?")){return}
    let i = +settings.dataset.macro
    list.querySelector(`[data-id="${i}"]`).remove()
    macros.splice(+settings.dataset.macro, 1)
    for(let e of list.querySelectorAll("[data-id]")){
      if(e.dataset.id>i){
        e.dataset.id = +e.dataset.id -1
      }
    }
    for(let m of macros){
      for(let a of m.actions){
        if(a.type==="macro" && a.macro>i){a.macro--}
      }
    }
    settings.style.display = "none"
    list.style.display = null
  GM_setValue("macros", macros)})
}

window.addEventListener("hashchange", onPage)
onPage()

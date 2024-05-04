// This is used in a message interaction command of the bot Grand robot.
      if(interaction.targetMessage.author.id==="1223012641543426088" && !interaction.targetMessage.interaction){
        let desc = interaction.targetMessage.embeds[0]?.description
        if(desc?.startsWith("The first person to **type** the following text will be awarded!\n")){
          let txt = desc.split("`")[1]
          .split("").map(co=>{let c=co.charCodeAt(0); return c===1088 ? "p" : c===1077 ? "e" : c===1089 ? "c" : c===1072 ? "a" : c===1110 ? "i" : c===1086 ? "o" : c===1093 ? "x" : c===1091 ? "y" : c>255 ? "-" : co}).join("")
          return interaction.reply({content:txt,embeds:[{description:txt}]})
        }else if(desc?.startsWith("First to answer the trivia question correctly gets a prize! (type answer into this chat)")){
          let txt = desc.split("\n\n")[1]
          let r = txt==="Question: Who is the oldest moderator?" ? "leg"
            : txt==="Question: Who's the richest person to ever be staff here?" ? "doxxie"
            : txt==="Question: What channel gets purged occasionally when too many messages are in it?" ? "gen"
            : txt==="Question: What is No Text To Speech's favorite color?" ? "blue"
            : txt==="Question: What is Lavernie's favorite color?" ? "purple"
            : txt==="Question: Where does NTTS gets most of his idea from?" ? "suggestions"
            : txt==="Question: Who's been banned at least 3 or 4 times and is somehow still here?" ? "potato"
            : txt==="Question: Who sends the \"daily dori dori\" in tweeter everday?" ? "kay"
            : txt==="Question: What bot runs the leveling of the server?" ? "AmariBot"
            : txt==="Question: What role is for members who have helped with a video?" ? "contributor"
            : txt==="Question: What member is #7 on the leaderboard?" ? "fishy"
            : txt==="Question: What staff member changes their profile almost every day?" ? "maya"
            : txt==="Question: What is the fake ban punishment command?" ? "bam"
            : txt==="Question: What month did Tomie go missing?" ? "january"
            : txt==="Question: Which level do you have the permission to embed links in general?" ? "25"
            : txt==="Question: Who pinged everyone resulting in a server wide shutdown" ? "geb"
            : txt==="Question: What now banned member got staff furry rp deleted?" ? "joleg"
            : txt==="Question: What staff member speedran Co-Owner?" ? "lav"
            : txt==="Question: What bot has quarantined all the admins and owners at least once?" ? "wick"
            : txt==="Question: What moderator has an ant colony in her room?" ? "cheese"
            : txt==="Question: How old is NTTS?" ? "27"
            : txt==="Question: What was the custom bot the server used to use for moderation" ? "Saulgoodman"
            : txt==="Question: What role will you receive if you send the wrong number in the counting channel?" ? "moron that can't count"
            : txt==="Question: What color role is for staff only?" ? "asphalt" // "uwu girlepop"
            : txt==="Question: Name one event lead!" ? "jenku"
            : txt==="Question: What bot is mainly used for moderation?" ? "Sapphire"
            : txt==="Question: What bot runs the automated reactions?" ? "yag"
            : txt==="Question: Name one event lead" ? "jenku"
            : txt==="Question: What admin does Lavernie have a love-hate relationship with?" ? "alex"
            : txt==="Question: Who created this bot?" ? "eric"
            : txt==="Question: What is the name of the bot that runs the slowmode?" ? "slumber"
            : txt==="Question: What's the support channel for ntts's server" ? "support"
            : "Unknown question..."
          return interaction.reply({content:r,embeds:r ? [{description:r}] : []})
        }else if(desc?.startsWith("First person to unscramble the following word gets a prize!\n\n")){
          let txt = desc.split("`")[1]
          let possibles = ["daycare","notexttospeech","tickets","militarylotus","falconator","techtalk","skullboard","tarab1te","fae","leguchi","wobin","support","memes","akjr","lavernie","slumber","asphalt","wesley","trusted","sapphire","fishy","blank","ccet","bek","jasper","moderator","tazhys","cheese","marie","amari","jenku","modmail","tweeter","eric","dyno","top10","maya","alex","sandpaper","austin","sem","tomie","media","blacklist","yagpdb","contributor","youtube","subscribers","tacoshack","ductho","water."]
          let bon = possibles.find(p=>{if(p.length !== txt.length){return false};
            let reste = txt.split("")
            for(let l of p.split("")){
              let i = reste.findIndex(l2=>l2===l)
              if(i===-1){return false}
              reste.splice(i,1)
            }
            return true
          })
          return interaction.reply({ephemeral:true,content:bon || "Unknown response..."})
        }
        // For the flags: use Fergun ( https://discord.com/oauth2/authorize?client_id=680507783359365121 ) > Reverse image search
        // For the typing: use Fergun > OCR, or Nekotina ( https://discord.com/oauth2/authorize?client_id=429457053791158281 ) > Read from image
        return interaction.reply({ephemeral:true,content:"Mini-game not supported."})
      }
// Egg 1: 656767
// Egg 2: tookyalongenough
// Egg 3: cat
// Egg 4 (maybe): GOTTERDAMGERUNG

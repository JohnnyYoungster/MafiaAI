import { Client, GatewayIntentBits, ButtonBuilder, ActionRowBuilder, ButtonStyle,EmbedBuilder, User } from 'discord.js';
import dotenv from 'dotenv';
import { extractPersonality, NPCPrompt,getPrompt, basicPrompt } from './ai.js';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import 'colors';
import { createSetting, GAME_MASTER_NIGHT_DOCTOR_COMMAND, GAME_MASTER_VOTING_COMMAND,GAME_MASTER_NIGHT_MAFIA_COMMAND, GAME_MASTER_NIGHT_DETECTIVE_COMMAND, votingResult, nightResult } from './settingPrompt.js';
import { start } from 'repl';


dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageTyping,
    ],
    
});

const discordBotToken = process.env.BotToken;

// 플레이어와 해당 텍스트 리스트를 설정
// const votePaper = bots.map(bots =>({
//     name :bots.name,
//     votes : 0
// })
// );


let interval;
let isRunning = false; // 반복 작업 여부 추적
let isVoiceAllowed = false;
let dayTime = 1;
let isUserTyping = false;
let conversationCount = 0;
let typingTimeout;  // 타이핑 타임아웃을 위한 변수
let channel_info;
let DoctorIndex=-1;
let DetectiveIndex=-1;
let UserKill;
let UserDetect;
let UserHeal;
let wait = true;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 랜덤한 플레이어와 텍스트를 채팅에 보내는 함수
const voteMafia = async (channel, personIndex, saveIndex) => {

    const electedPerson = botsWithPlayer[personIndex];
    const message = `${electedPerson.name} was executed, and he/she was a ${electedPerson.role}`;
    
    // const message = `${electedPerson.name} was executed.`;
    
    // TTS로 말하게 하기
    await channel.send({ content: message, tts: isVoiceAllowed });
    //players.splice(personIndex, 1); // 선택된 플레이어 제거
    
    dayTime =dayTime +1;
    //startRandomMessages();
    botsWithPlayer[personIndex].alive = false;
    if (personIndex < 7)
      bots[personIndex].alive = false;
    conversation += votingResult(botsWithPlayer[personIndex].name,botsWithPlayer[personIndex].role);
    // botsWithPlayer[DoctorIndex].known_players.push(botsWithPlayer[personIndex]);
    console.log("vote finished!");
    votePaper = resetVotes(votePaper);
    MafiaKillDuringNight();
};

const voteMafiaBasic = (personindex) =>
    {
      votePaper[personindex].votes +=1;

   } 
const voteMafiaBot = async (bot, personindex,channel) =>
    {
      let response = await bot.vote(conversation);
      let obj = toJSON(response.content);
      personindex = botsWithPlayer.findIndex(bot => bot.name === obj.player_to_eliminate);

      while (personindex < 0){
        response = await bot.vote(conversation);
        obj = toJSON(response.content);
        console.log(response.content)
        personindex = botsWithPlayer.findIndex(bot => bot.name.replace(/\s+/g, '').toLowerCase() === obj.player_to_eliminate.replace(/\s+/g, '').toLowerCase());
      }

      console.log(response.content);
      console.log(personindex);
      voteMafiaBasic(personindex);
      await channel.send(`\`\`\`diff\n- ${bot.name} vote for ${botsWithPlayer[personindex].name}\`\`\``);
      await channel.send(`${obj.reason}`);
   }
const voteMafiaHuman = async(personindex,channel) =>
    {
        voteMafiaBasic(personindex);
        const electedPersonName = votePaper.reduce((prev,cur) =>{
         return cur.votes>prev.votes ?cur :prev;
        }).name;
        //const electedPeronIndex = players.findIndex(player => player.name === electedPeronName);
        const electedPersonIndex = botsWithPlayer.findIndex(bot => bot.name === electedPersonName);
        voteMafia(channel,electedPersonIndex);
}




const webHookUrls =
[
 process.env.player1_WebHook_url,
process.env.player2_WebHook_url,
process.env.player3_WebHook_url,
process.env.player4_WebHook_url,
process.env.player5_WebHook_url,
process.env.player6_WebHook_url,
process.env.player7_WebHook_url,
];

const webHookLis =[];
// 랜덤 메시지 전송 함수

const sendRandomMessage = async (channel) => {
    // if(isUserTyping) return;
    //const randomPlayer = players[Math.floor(Math.random() * players.length)];
    //const randomText = randomPlayer.texts[Math.floor(Math.random() * randomPlayer.texts.length)];
    const botList=await botSpeak();
    const botText ={ content:botList[0]
    };
    const botPlayer = botList[1];
    let botWebHookUrl=''
   webHookLis.forEach(element =>{
        if(element[0]=== botPlayer.name ) botWebHookUrl = element[1];
    });
    try {
        const result = await axios.post(botWebHookUrl, {
            content: botText.content,
            username: botPlayer.name
        },{
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Message sent successfully:', result.data);
    }
    catch (error) {
        console.error('Error sending message:', error);
    }


    // TTS로 말하게 하기
    // await randomPlayer.webhook.send({
    //     content: randomText,
    //     tts: isVoiceAllowed,
    // });
    // await channel.send({
    //     content: botText,
    //     tts: isVoiceAllowed,
    // });
};


// 반복 작업을 시작하는 함수
const startRandomMessages = async (channel) => {
    if (isRunning) return; // 이미 실행 중이면 다시 시작하지 않음
    isRunning = true;
    interval = setInterval(async () => {
        await sendRandomMessage(channel);
    }, 5000); // 5초 간격
};

// 반복 작업을 멈추는 함수
const stopRandomMessages = () => {
    if (interval) {
        clearInterval(interval);
        isRunning = false;
    }
};

// 봇이 준비되었을 때 실행되는 코드
client.once('ready', async () => {
    console.log('Bot is online!');
});

let userName = "";

// 버튼을 포함한 메시지 전송
client.on('messageCreate', async (message) => {
    if (message.content === '!start'){

        const dayEmbed = new EmbedBuilder()
            .setColor(0x0099ff) // 임베드 색상 설정
            .setTitle(`Hi, ${message.author.username}`)
            .setDescription(`You can set your name for game with '!name **nickname**'. Else, your default nickname will be selected. You can start game with **!play**.`)  // 닉네임 설정
            .setTimestamp(); 

            await message.channel.send({
                embeds: [dayEmbed],  // 임베드 메시지
            });
        userName = message.author.username;
    }
    else if (message.content.startsWith('!name ')){
      const newName = message.content.slice(6).trim();
      if (newName){
        const nameEmbed = new EmbedBuilder()
        .setColor(0x0099ff) // 임베드 색상 설정
        .setTitle(`Hi, ${newName}`)
        .setDescription(`You can reset your name with '!name **nickname**'. You can start game with this name using **!play**.`)  // 닉네임 설정
        .setTimestamp(); 
        userName = newName;
        await message.channel.send({
            embeds: [nameEmbed],  // 임베드 메시지
        });
      }
    }
    else if (message.content === '!play') {
      
      channel_info = message.channel;
      botsWithPlayer.push(new Player(7, userName, PlayerRole, 'User', 100));
      botsWithPlayer[7].user = true;
      votePaper.push({
        name : userName,
        votes : 0
      });
      console.log(votePaper);
      console.log(botsWithPlayer);

        const startButton = new ButtonBuilder()
            .setCustomId('start')
            .setLabel('Okay.')
            .setStyle(ButtonStyle.Success);
            const dayEmbed = new EmbedBuilder()
            .setColor(0x0099ff) // 임베드 색상 설정
            .setTitle(`Day${dayTime}`)
            .setDescription(`The game has started. You can say after typing **!say**. Now is Day ${dayTime}. Your role is ${PlayerRole}!` )  // Day 1 설명 추가
            .setTimestamp(); 

        // const stopButton = new ButtonBuilder()
        //     .setCustomId('stop')
        //     .setLabel('Stop Bot')
        //     .setStyle(ButtonStyle.Danger);
        // const voiceAllowButton = new ButtonBuilder().setCustomId('voice').setLabel('voice Bot').setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(startButton/*, stopButton,voiceAllowButton*/);

            await message.channel.send({
                embeds: [dayEmbed],  // 임베드 메시지
                components: [row],   // 버튼
            });
        if (PlayerRole === MafiaRole.MAFIA) {
            const mafiaPlayers = botsWithPlayer
                .filter(player => player.role === MafiaRole.MAFIA && player.alive && player.name !== userName)
                .map(player => player.name); // MAFIA 역할의 플레이어 이름 목록
        
            const mafiaEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle(`You are MAFIA`)
                .setDescription(
                    mafiaPlayers.length > 0
                        ? `Your fellow Mafia members are: ${mafiaPlayers.join(', ')}`
                        : `You are the only Mafia member remaining.`
                )
                .setTimestamp();
        
            await message.channel.send({
                embeds: [mafiaEmbed], // Mafia 멤버 리스트를 담은 임베드 메시지
            });
        }
    }

    if (message.content === "!control" ) {
        const voteButton = new ButtonBuilder()
            .setCustomId('vote')
            .setLabel('Vote for Mafia')
            .setStyle(ButtonStyle.Primary);
            const startButton = new ButtonBuilder()
            .setCustomId('start')
            .setLabel('Start Bot')
            .setStyle(ButtonStyle.Success);

        const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('Stop Bot')
            .setStyle(ButtonStyle.Danger);
        const dayEmbed = new EmbedBuilder()
            .setColor(0x0099ff) // 임베드 색상 설정
            .setTitle(`Day${dayTime}`)
            .setDescription(`Now is Day ${dayTime}` )  // Day 1 설명 추가
            .setTimestamp(); 

            
        const voiceAllowButton = new ButtonBuilder().setCustomId('voice').setLabel('voice Bot').setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(voteButton,startButton,stopButton,voiceAllowButton);
        
        await message.channel.send({
            content: 'Click to vote for the Mafia:',
            embeds:[dayEmbed],
            components: [row],
        });
        
    }
    // else if (isUserTyping )
    // {
    //     isUserTyping = false;
    //     await startRandomMessages(message.channel);
    // }
});

// 사용자가 타이핑을 시작할 때 타이핑 상태를 true로 설정
// client.on('typingStart', (channel, user) => {
//   console.log(`Player is typing...`);
//   isUserTyping = true;  // 사용자가 타이핑 중임을 나타냄

//   // 기존 타이머가 있으면 지우기 (사용자가 계속 타이핑할 경우 타이머 초기화)
//   if (typingTimeout) clearTimeout(typingTimeout);

//   typingTimeout = setTimeout(() => {
//     if (isUserTyping) {  // 여전히 타이핑 중이 아니면 대화 재개
//       isUserTyping = false;
//       console.log("No typing detected for 5 seconds");
//       randomStart(conversationCount);  // 5초 후에 대화 재개
//     }
//   }, 5000);  // 5초 후에 대화 재개
// });

// 사용자가 메시지를 입력할 때 실행 (messageCreate 이벤트)
client.on('messageCreate', async (message) => {
  // 봇의 메시지가 아니라면
  if (!message.author.bot) {
    if (message.content === ('!say')) {
      console.log(`User issued !say command, pausing conversation...`);
      isUserTyping = true;  // 대화를 중단
    }
    else if (message.content === ('!resume')) {
      console.log(`User issued !resume command, restarting conversation...`);
      isUserTyping = false;  // 대화를 중단
      //randomStart(conversationCount);  // 5초 후에 대화 재개
    }
    else if (isUserTyping){
      console.log(`${userName}: ${message.content}`);

      // 사용자의 메시지를 대화에 추가
      conversation += `${userName}: ${message.content}\n`;
  
      isUserTyping = false;  // 타이핑 상태 해제
  
      // 타이핑이 끝난 후 5초 후에 대화를 재개하기 위한 타이머 설정
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        //console.log("No typing detected for 5 seconds, resuming conversation...");
        //randomStart(conversationCount);  // 5초 후에 대화 재개
      }, 5000);  // 5초 후에 대화 재개
    }
  }
});

// 버튼 클릭 시 실행되는 코드
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start') {
        if (isRunning) {
            await interaction.reply('The bot is already running!');
        } else {
          isRunning = true;
            await interaction.reply('Start!');
            conversationCount = 0;
            await randomStart(conversationCount);
            //await startRandomMessages(interaction.channel);
        }
    } else if (interaction.customId === 'continue') {
        if (isRunning) {
            await interaction.reply('The bot is already running!');
        } else {
          isRunning = true;
            await interaction.deferUpdate();
            conversationCount = 0;
            await randomStart(conversationCount);
            //await startRandomMessages(interaction.channel);
        }
      } else if (interaction.customId === 'ghostmode') {
        if (isRunning) {
            await interaction.reply('The bot is already running!');
        } else {
            await interaction.reply("Let's see if they're good at it");
            endState = false;
            ghostMode = true;
            if (deadScene == 0){
              MafiaKillDuringNight();
            }
            else if (deadScene == 1){
              NotifyNextDay(7);
              console.log("resume context!");
            }
            //conversationCount = 0;
            //await randomStart(conversationCount);
            //await startRandomMessages(interaction.channel);
        }
      } else if (interaction.customId === 'endmode') {
        if (isRunning) {
            await interaction.reply('The bot is already running!');
        } else {
            await interaction.reply('Game End.');
            endState = true;
            //await randomStart(conversationCount);
            //await startRandomMessages(interaction.channel);
        }
    } else if (interaction.customId === 'stop') {
        if (!isRunning) {
            await interaction.reply('The bot is not running!');
        } else {
            stopRandomMessages();
            await interaction.reply('Bot has been stopped.');
        }
    } else if (interaction.customId === 'vote') {
        const voteButtons = players.map((player, index) => 
            new ButtonBuilder()
                .setCustomId(`vote_${index}`) // 각 플레이어에 대한 고유한 ID 설정
                .setLabel(player.name)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(voteButtons); // 버튼들을 하나의 행으로 그룹화

        // await voteMafiaBot(players[0],0,interaction.channel);
        // await voteMafiaBot(players[1],0,interaction.channel);
        // await voteMafiaBot(players[2],0,interaction.channel);
        
        for (let i = 0; i < players.length; i++) {
            await voteMafiaBot(players[i], 0, interaction.channel); // 모든 플레이어가 자동으로 투표하도록 변경
        }

        await interaction.reply({
            content: 'Choose a player to vote for:',
            components: [row],
            ephemeral: true, // 이 옵션을 통해 특정 사용자에게만 보이는 메시지로 설정할 수 있습니다
        });
    } else if (interaction.customId.startsWith('vote_')) {
        stopRandomMessages();
        isRunning = false;
        const personIndex = parseInt(interaction.customId.split('_')[1]); // 인덱스 추출
        await voteMafiaHuman( personIndex,interaction.channel); // 투표 함수 호출
        await interaction.reply(`You voted for ${bots[personIndex].name}!`); // 응답 메시지
    } else if (interaction.customId.startsWith('kill_')) {
        stopRandomMessages();
        isRunning = false;
        const personIndex = parseInt(interaction.customId.split('_')[1]);
        UserKill = personIndex;
        console.log(personIndex)
        await interaction.reply(`You chose ${bots[personIndex].name} to kill!`);
        wait = false;
    } else if (interaction.customId.startsWith('detect_')) {
        stopRandomMessages();
        isRunning = false;
        const personIndex = parseInt(interaction.customId.split('_')[1]);
        UserDetect = personIndex;
        console.log(personIndex)
        await interaction.reply(`You chose ${bots[personIndex].name} to detect! The role of ${bots[personIndex].name} is ${bots[personIndex].role}`);
        wait = false;
    } else if (interaction.customId.startsWith('heal_')) {
        stopRandomMessages();
        isRunning = false;
        const personIndex = parseInt(interaction.customId.split('_')[1]);
        UserHeal = personIndex;
        console.log(personIndex)
        await interaction.reply(`You chose ${bots[personIndex].name} to heal!`);
        wait = false;
    }
    else if (interaction.customId.startsWith('voice'))
        {
            isVoiceAllowed = !isVoiceAllowed;
        }
});

client.login(discordBotToken);

const MafiaRole = {
    MAFIA: 'Mafia',
    DOCTOR: 'Doctor',
    DETECTIVE: 'Detective',
    VILLAGER: 'Villager'
};

const role_motivations = {
    [MafiaRole.MAFIA]: 'Seeks to control the town from the shadows, operating with cunning and secrecy. Their goal is to eliminate non-Mafia players while protecting their own. They must act covertly, executing their plans under the cover of night and misleading others during the day to conceal their true identity.',
    [MafiaRole.DOCTOR]: 'Dedicated to saving lives, the Doctor works to protect those in danger from Mafia attacks. Their main goal is to identify and eliminate the Mafia threat, using their night actions to safeguard potential targets. All non-Mafia players are allies in the quest for peace.',
    //[MafiaRole.DOCTOR]: 'The doctor performs autopsy to deduce whether the person executed the day before was a Mafia. Their main goal is to identify and eliminate the Mafia threat. All non-Mafia players are allies in the quest for peace.',
    [MafiaRole.DETECTIVE]: 'With a keen eye for deceit, the Detective investigates players to uncover their true alignments. Their mission is to use this knowledge to guide the town in rooting out the Mafia menace, employing their night actions to gather crucial intelligence.',
    [MafiaRole.VILLAGER]: 'As a regular townsperson, the Villager lacks special actions but plays a critical role in discussions and votes to eliminate the Mafia threat. Vigilance and collaboration with fellow non-Mafia players are their main weapons in the quest for safety and order.'
};

class Player {
    constructor(idx, name, role, personality, confidence) {
        this.idx = idx;
        this.name = name;
        this.role = role;
        this.alive = true;
        this.personality = personality;
        this.confidence = confidence;
        this.user = false;
        this.known_players = [];
    }

    speak(conversation) {
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality);
        const prompt = NPCPrompt(setting);
        let additionalDialogue="";
        if(this.role==MafiaRole.DETECTIVE){
            additionalDialogue=`\nGame Master: As a detective, you should probably reveal your role on the second day or the third day (or as soon as you know who the mafia is). You should also immediately share the roles you have identified with the others. 
            If you have already revealed your role and stated the roles you've figured out, you don't have to do it again. In this case, just participate in the discussion.`
        }
        else if(this.role==MafiaRole.Mafia){
            additionalDialogue="\nGame Master: As a Mafia, if the real doctor or detective comes out with their role, you must either say that you are the actual doctor or detective instead, or say they're lying."
        }
        return prompt(conversation+additionalDialogue);
    }

    vote(conversation){
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality
        , this.getKnownRoles(), this.getDeadPlayers() ); 
        const prompt = NPCPrompt(setting, {
            response_format: {type:'json_object',}
        });
        return prompt(conversation+"\n"+GAME_MASTER_VOTING_COMMAND);
    }

    kill(conversation){
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality
        , this.getKnownRoles(), this.getDeadPlayers()); 
        const prompt = NPCPrompt(setting, {
            response_format: {type:'json_object',}
        });
        return prompt(conversation+"\n"+GAME_MASTER_NIGHT_MAFIA_COMMAND);
    }

    detect(conversation){
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality
        , this.getKnownRoles(), this.getDeadPlayers()); 
        const prompt = NPCPrompt(setting);
        return prompt(conversation+"\n"+GAME_MASTER_NIGHT_DETECTIVE_COMMAND);
    }

    save(conversation){
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality
        , this.getKnownRoles(), this.getDeadPlayers()); 
        const prompt = NPCPrompt(setting);
        return prompt(conversation+"\n"+GAME_MASTER_NIGHT_DOCTOR_COMMAND);
    }

    getAllyRoles() {
        return this.role === MafiaRole.MAFIA ? [MafiaRole.MAFIA] : [MafiaRole.DOCTOR, MafiaRole.DETECTIVE, MafiaRole.VILLAGER];
    }

    getEnemyRoles() {
        return this.role === MafiaRole.MAFIA ? [MafiaRole.DOCTOR, MafiaRole.DETECTIVE, MafiaRole.VILLAGER] : [MafiaRole.MAFIA];
    }

    getKnownAllies() {
        const mafiaPlayers = botsWithPlayer.filter(player => player.role === MafiaRole.MAFIA && player.name !== this.name && player.alive==true)
                                     .map(player => player.name);
        return this.role === MafiaRole.MAFIA ? "You have no known allies" : mafiaPlayers.join(', ');
    }

    getOtherPlayers() {
        const otherPlayers = botsWithPlayer.filter(player => player.name !== this.name && player.alive==true)
                                     .map(player => player.name);
        return otherPlayers.join(', ');
    }

    getKnownRoles(){
        const accumulatedString = this.known_players
            .map(player => `${player.name} is a ${player.role}.`)
            .join(' ');
        return accumulatedString;
    }

    getDeadPlayers(){
        const deadPlayers=botsWithPlayer.filter(player=>player.alive==false);
        if(deadPlayers==null) return '';
        const accumulatedString = deadPlayers
            .map(player => `${player.name} was a ${player.role}.`)
            .join(' ');
        return accumulatedString;
    }

}

function assignRoles(arr) {
    const numToSelect = Math.floor(arr.length / 4)+2;
    const indexes = Array.from(Array(arr.length).keys());
    for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes.slice(0, numToSelect);
}

let characters = [];
let botsWithPlayer = [];
let bots = [];
let votePaper = [];
let PlayerRole=MafiaRole.VILLAGER;
fs.readFile('Characters.txt', 'utf8', async (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    characters = data.split('\n');
    const MafiaNum=Math.floor((characters.length+1) / 4);
    const roles=assignRoles(characters.concat(["Player"]));
    const mafiaRoleIndexes = roles.slice(0,MafiaNum);
    DetectiveIndex=roles[MafiaNum];
    DoctorIndex=roles[MafiaNum+1];
    if(mafiaRoleIndexes.includes(7)) PlayerRole=MafiaRole.MAFIA;
    if(DetectiveIndex==7) PlayerRole=MafiaRole.DETECTIVE;
    if(DoctorIndex==7) PlayerRole=MafiaRole.DOCTOR;
    // Create players and await the extraction of personalities
    let idx = 0;
    for (const [index, line] of characters.entries()) {
        const data = line.trim().split(';');
        let confidence = 0;

        // Wait for personality extraction
        confidence = await extractPersonality(data[1]).then(res => parseInt(res.content, 10)).catch(console.error);

        let role = MafiaRole.VILLAGER;
        if (mafiaRoleIndexes.includes(index)) role = MafiaRole.MAFIA;
        else if (DetectiveIndex==index) role = MafiaRole.DETECTIVE;
        else if (DoctorIndex==index) role = MafiaRole.DOCTOR;
        bots.push(new Player(idx, data[0], role, data[1], confidence));
        botsWithPlayer.push(new Player(idx, data[0], role, data[1], confidence));
        idx += 1;
    }
    
    votePaper = bots.map(bot =>({
      name : bot.name,
      votes : 0
    }));
    
    console.log(votePaper);
    
    
    for(let i =0;  i<bots.length; i ++  )
        {
            webHookLis.push([bots[i].name,webHookUrls[i]]);

        }
    //console.log(webHookLis);
    //randomStart();
});


let conversation="Game Master: The day starts and the town is notified from the government that there is a Mafia about to murder all of them. Day 1 discussion ensues. \n";
let lastChosenPlayerName="";

async function changeWebHookName(webhookUrl,newName){
        await axios.patch(webhookUrl,{
            name:newName
        }) ;
        console.log(`WebHook name   --> ${newName}`);

}
function choosePlayer(bots, lastChosenPlayerName) {
  // Calculate the total confidence
  const filteredPlayers= bots.filter(player=> player.name!=lastChosenPlayerName && player.alive);
  const totalConfidence = filteredPlayers.reduce((total, player) => total + player.confidence, 0);

  // Generate a random number between 0 and totalConfidence
  const randomValue = Math.random() * totalConfidence;

  let cumulativeConfidence = 0;

  // Select the player based on confidence
  for (const player of filteredPlayers) {
      cumulativeConfidence += player.confidence;
      if (randomValue < cumulativeConfidence) {
          return player; // Return the chosen player
      }
  }
}

// async function start() {
//     for (const player of bots) {
//         const response = await player.speak(conversation);
//         // console.log(player.name);
//         console.log(player.name.red);
//         console.log(response.content);
//         conversation+=player.name+": "+response.content;
//     }
// }

const maxConvCountPerDay=10;

async function randomStart(message) {
  while(conversationCount < maxConvCountPerDay && isRunning){

    if(isUserTyping){
      console.log("User is typing...");
      await new Promise(resolve => setTimeout(resolve, 1000));  // 1초 대기 후 다시 확인
      continue;  // 다음 반복으로 넘어가서 다시 isUserTyping 상태 확인
    }

    const player = choosePlayer(bots,lastChosenPlayerName);
    lastChosenPlayerName=player.name;
    const response = await player.speak(conversation);
    // console.log(player.name);
    console.log(player.name);
    //console.log(response.content);
    conversation+=player.name+": "+response.content;
    
    let botWebHookUrl=''
    webHookLis.forEach(element =>{
        if(element[0]=== player.name ) botWebHookUrl = element[1];
    });
    try {
        const result = await axios.post(botWebHookUrl, {
            content: response.content,
            username: player.name
        },{
            headers: {
                'Content-Type': 'application/json'
            }
        });
        //console.log('Message sent successfully:', result.data);
    }
    catch (error) {
        console.error('Error sending message:', error);
    }
    conversationCount ++;
    //await new Promise(resolve => setTimeout(resolve, 2000));
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (conversationCount >= maxConvCountPerDay) {
    // MafiaBot이 메시지를 보냄
    console.log("vote start");
    await channel_info.send({
      content: "Now It's time to vote. Choose a Mafia!",
      ephemeral: true,
    });
    isRunning = false;

    let aliveBots = bots.filter(bot => bot.alive);
    // 이후에 투표 로직으로 넘어감
    
    const voteButtons = aliveBots.map((player, index) => 
      new ButtonBuilder()
          .setCustomId(`vote_${player.idx}`) // 각 플레이어에 대한 고유한 ID 설정
          .setLabel(player.name)
          .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(voteButtons.slice(0,voteButtons.length/2)); // 버튼들을 하나의 행으로 그룹화
    const row_2 = new ActionRowBuilder().addComponents(voteButtons.slice(voteButtons.length/2,voteButtons.length)); // 버튼들을 하나의 행으로 그룹화 
    // await voteMafiaBot(players[0],0,interaction.channel);
    // await voteMafiaBot(players[1],0,interaction.channel);
    // await voteMafiaBot(players[2],0,interaction.channel);

    for (let i = 0; i < aliveBots.length; i++) {
        await voteMafiaBot(aliveBots[i], 0, channel_info); // 모든 '살아있는' 플레이어가 자동으로 투표하도록 변경
    }

    await channel_info.send({
        content: 'Choose a player to vote for:',
        components: [row, row_2],
        ephemeral: true, // 이 옵션을 통해 특정 사용자에게만 보이는 메시지로 설정할 수 있습니다
    });
  // for (let player of bots) {
  //   const response = await player.vote(conversation);
  //   // console.log(player.name);
  //   console.log(response);
  // }
  }
}

let endState = false;
let ghostMode = false;
let deadScene = -1;
async function CheckEndState(scene){ // scene = 0 : voting, scene = 1 : mafia
  let mafiaBots = botsWithPlayer.filter(bot => bot.alive && bot.role === MafiaRole.MAFIA);
  let aliveBots = botsWithPlayer.filter(bot => bot.alive);
  deadScene = scene;

  if (mafiaBots.length == 0){
    VillagerWin();
    endState = true;
  }
  if ((mafiaBots.length  >= aliveBots.length * 0.5) || (aliveBots.length == 1 && mafiaBots.length == 1)){
    MafiaWin();
    endState = true;
  }

  if (!endState && botsWithPlayer[7].alive == false && !ghostMode){
    PlayerDead(scene);
    endState = true;
  }
  //endState = false;
}

async function PlayerDead(scene){
  let deathMessage = "";
  if (scene == 0){
    deathMessage = "You were killed because of the villagers."
  } else{
    deathMessage = "You were killed because of the evil Mafia."
  }
  const contButton = new ButtonBuilder()
  .setCustomId('ghostmode')
  .setLabel('Spectating them.')
  .setStyle(ButtonStyle.Success);

  const endButton = new ButtonBuilder()
  .setCustomId('endmode')
  .setLabel('End game.')
  .setStyle(ButtonStyle.Success);

  const dayEmbed = new EmbedBuilder()
    .setColor(0xff0000) // 임베드 색상 설정
    .setTitle(`**You were executed!**`)
    .setDescription(deathMessage)  // 설명 추가
    .setTimestamp(); 

  const row = new ActionRowBuilder().addComponents(contButton, endButton);

  await channel_info.send({
    embeds: [dayEmbed],
    components: [row],
  });  
}

async function VillagerWin(){
  const dayEmbed = new EmbedBuilder()
    .setColor(0x0099ff) // 임베드 색상 설정
    .setTitle(`**Villager Win**`)
    .setDescription(`All the mafia were killed, and the remaining villagers regained their peace.` )  // 설명 추가
    .setTimestamp(); 

  await channel_info.send({
    embeds: [dayEmbed],
  });
}

async function MafiaWin(){
  const dayEmbed = new EmbedBuilder()
    .setColor(0xff0000) // 임베드 색상 설정
    .setTitle(`**Mafia Win**`)
    .setDescription(`The mafia killed all the villagers and completed their mission.` )  // 설명 추가
    .setTimestamp(); 

  await channel_info.send({
    embeds: [dayEmbed],
  });
}

async function MafiaKillDuringNight(){
  CheckEndState(0);
  console.log("Mafia try to find someone to kill...!");
  if(endState){
    console.log("But already mafia won!");
  }
  else{
    console.log("They selected someone to kill...");
    let aliveBots = botsWithPlayer.filter(bot => bot.alive);
    let mafiaBots = botsWithPlayer.filter(bot => bot.alive && bot.role === MafiaRole.MAFIA);

    // 플레이어가 마피아일 경우 직접 선택하도록 처리
    const playerMafia = mafiaBots.find(bot => bot.user);
    if (playerMafia) {
        // 플레이어에게 선택을 요청하는 메시지 전송
        const targets = aliveBots.filter(bot => bot.alive && bot.role !== MafiaRole.MAFIA) // 본인은 제외

        const targetbuttons = targets.map((player, index) =>
            new ButtonBuilder()
                .setCustomId(`kill_${player.idx}`) // 각 플레이어에 대한 고유한 ID 설정
                .setLabel(player.name)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(targetbuttons.slice(0,targetbuttons.length/2)); // 버튼들을 하나의 행으로 그룹화
        const row_2 = new ActionRowBuilder().addComponents(targetbuttons.slice(targetbuttons.length/2,targetbuttons.length)); // 버튼들을 하나의 행으로 그룹화 
        
        await channel_info.send({
            content: 'Choose a player to kill',
            components: [row, row_2],
            ephemeral: true,
        });
        wait = true;
        while(wait){await sleep(500);}
        let killIndex = UserKill;
        votePaper[killIndex].votes += 1;
    } else {
        // 봇 마피아는 자동으로 대상 선택
        for (let i = 0; i < mafiaBots.length; i++) {
            const response = await mafiaBots[i].kill(conversation);
            console.log(response.content);
            let obj = toJSON(response.content);
            let killIndex = botsWithPlayer.findIndex(bot => bot.name === obj.player_to_kill);

            // 대상이 없거나 이미 죽은 경우 반복하여 선택
            while (killIndex < 0 || !botsWithPlayer[killIndex].alive) {
                const response = await mafiaBots[i].kill(conversation);
                console.log(response.content);
                obj = toJSON(response.content);
                killIndex = botsWithPlayer.findIndex(bot => bot.name.replace(/\s+/g, '').toLowerCase() === obj.player_to_kill.replace(/\s+/g, '').toLowerCase());
            }

            votePaper[killIndex].votes += 1;
        }
    }
    // console.log("DEtective"+DetectiveIndex);
    let detectiveBots = botsWithPlayer.filter(bot => bot.alive && bot.role === MafiaRole.DETECTIVE);

    // 플레이어가 마피아일 경우 직접 선택하도록 처리
    const playerDetective = detectiveBots.find(bot => bot.user);
    if (playerDetective) {
        // 플레이어가 탐정일 경우에만 조사할 대상 버튼을 제공
        // 플레이어에게 선택을 요청하는 메시지 전송
        const targets = aliveBots.filter(bot => bot.alive) // 본인은 제외

        const targetbuttons = targets.map((player, index) =>
            new ButtonBuilder()
                .setCustomId(`detect_${player.idx}`) // 각 플레이어에 대한 고유한 ID 설정
                .setLabel(player.name)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(targetbuttons.slice(0,targetbuttons.length/2)); // 버튼들을 하나의 행으로 그룹화
        const row_2 = new ActionRowBuilder().addComponents(targetbuttons.slice(targetbuttons.length/2,targetbuttons.length)); // 버튼들을 하나의 행으로 그룹화 
        
        await channel_info.send({
            content: 'Choose a player to detect',
            components: [row, row_2],
            ephemeral: true,
        });
        wait = true;
        while(wait){await sleep(500);}
    } else if(DetectiveIndex<bots.length) {
        const detectiveResponse = await bots[DetectiveIndex].detect(conversation);
        const deducedIndex = botsWithPlayer.findIndex(bot => bot.name.replace(/\s+/g, '').toLowerCase() ===detectiveResponse.content.replace(/\s+/g, '').toLowerCase());
        bots[DetectiveIndex].known_players.push(botsWithPlayer[deducedIndex]);
        // console.log("detected: "+detectiveResponse);
        // console.log("current list: "+bots[DetectiveIndex].known_players);
    }
    let saveIndex=-1;

    // console.log("Doctor"+DoctorIndex);

    let doctorBots = botsWithPlayer.filter(bot => bot.alive && bot.role === MafiaRole.DOCTOR);

    // 플레이어가 마피아일 경우 직접 선택하도록 처리
    const playerDoctor = doctorBots.find(bot => bot.user);
    if (playerDoctor) {
        // 플레이어가 의사일 경우에만 치료할 대상 버튼을 제공
        // 플레이어에게 선택을 요청하는 메시지 전송
        const targets = aliveBots.filter(bot => bot.alive) // 본인은 제외

        const targetbuttons = targets.map((player, index) =>
            new ButtonBuilder()
                .setCustomId(`heal_${player.idx}`) // 각 플레이어에 대한 고유한 ID 설정
                .setLabel(player.name)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(targetbuttons.slice(0,targetbuttons.length/2)); // 버튼들을 하나의 행으로 그룹화
        const row_2 = new ActionRowBuilder().addComponents(targetbuttons.slice(targetbuttons.length/2,targetbuttons.length)); // 버튼들을 하나의 행으로 그룹화 
        
        await channel_info.send({
            content: 'Choose a player to heal',
            components: [row, row_2],
            ephemeral: true,
        });
        wait = true;
        while(wait){await sleep(500);}
        saveIndex = UserHeal;
    } else if(DoctorIndex<bots.length) {
        const doctorResponse = await bots[DoctorIndex].save(conversation);
        if(bots[DoctorIndex].alive) saveIndex = botsWithPlayer.findIndex(bot => bot.name.replace(/\s+/g, '').toLowerCase() ===doctorResponse.content.replace(/\s+/g, '').toLowerCase());
        // console.log("save: "+doctorResponse);
    }
    
    const killededPersonName = votePaper.reduce((prev,cur) =>{
      return cur.votes>prev.votes ?cur :prev;
     }).name;
    console.log( `to be killed: ${killededPersonName}`);
    const killedPersonIndex = botsWithPlayer.findIndex(bot => bot.name === killededPersonName);
    const killedPerson = botsWithPlayer[killedPersonIndex];
    // const message = `${electedPerson.name} was executed, and he/she was a ${electedPerson.role}`;
    if(saveIndex!=killedPersonIndex){
        if(killedPersonIndex < 7){
        bots[killedPersonIndex].alive = false;
        }
        killedPerson.alive = false;
        votePaper = resetVotes(votePaper);
        return NotifyNextDay(killedPersonIndex);
    }
    else{
        votePaper = resetVotes(votePaper);
        return NotifyNextDay(-1);
    }

  }
}

async function NotifyNextDay(victimIdx){
  CheckEndState(1);
  if(endState){
    console.log("Mafia win!");
    return;
  }
  else{
    if(victimIdx!=-1){
        console.log("Night Passed!");
        const startButton = new ButtonBuilder()
        .setCustomId('continue')
        .setLabel('I got it.')
        .setStyle(ButtonStyle.Success);
        const dayEmbed = new EmbedBuilder()
        .setColor(0x0099ff) // 임베드 색상 설정
        .setTitle(`Day${dayTime}`)
        .setDescription(`The night has passed. **${botsWithPlayer[victimIdx].name}**, who was a **${botsWithPlayer[victimIdx].role}**, was murdered during the night. The Mafia still exists. Discuss who the Mafia is.` )  // Day 1 설명 추가
        .setTimestamp(); 

        const row = new ActionRowBuilder().addComponents(startButton);
        await channel_info.send({
        embeds: [dayEmbed],
        components: [row],
        });
        conversation += nightResult(botsWithPlayer[victimIdx].name);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    else{
        console.log("Night Passed!");
        const startButton = new ButtonBuilder()
        .setCustomId('continue')
        .setLabel('I got it.')
        .setStyle(ButtonStyle.Success);
        const dayEmbed = new EmbedBuilder()
        .setColor(0x0099ff) // 임베드 색상 설정
        .setTitle(`Day${dayTime}`)
        .setDescription(`The night has passed. Nobody was killed as the doctor protected the victim from the Mafia. The Mafia still exists. Discuss who the Mafia is.` )  // Day 1 설명 추가
        .setTimestamp(); 

        const row = new ActionRowBuilder().addComponents(startButton);
        await channel_info.send({
        embeds: [dayEmbed],
        components: [row],
        });
        conversation += nightResult(null);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

}


async function botSpeak(){
    const player=choosePlayer(bots,lastChosenPlayerName);
    lastChosenPlayerName=player.name;
    const response = await player.speak(conversation);
    // console.log(player.name);
    console.log(player.name.red);
    //console.log(response.content);
    conversation+=player.name+": "+response.content;
    return [response.content,player];
}

function playerSpeak(username, content){
  conversation+= username+": "+content;
}


function toJSON(content) {
    return JSON.parse(content);
}

function resetVotes(votePaper) {
  return votePaper.map(player => ({
    ...player, // 기존 player 객체를 복사
    votes: 0  // votes 값을 0으로 초기화
  }));
}
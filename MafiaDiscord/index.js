import { Client, GatewayIntentBits, ButtonBuilder, ActionRowBuilder, ButtonStyle,EmbedBuilder, User } from 'discord.js';
import dotenv from 'dotenv';
import { extractPersonality, NPCPrompt,getPrompt, basicPrompt } from './ai.js';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import 'colors';
import { createSetting } from './settingPrompt.js';


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
const players = [
    { name: 'DomeLover', texts: ['Do you know Dome?', 'I Like Dome the most', 'Lets eat domme together!'], role: 'Mafia' },
    { name: 'Nubjook', texts: ['I hate assignments!', 'I want vacation?', 'Dobby is free now'], role: 'Civil' },
    { name: 'Hos Fan', texts: ['Heroes of the storm is goat', 'Siuuuuu!!!!', 'Hos > lol '], role: 'Civil' },
];
const votePaper = players.map(players =>({
    name :players.name,
    votes : 0
})
);


let interval;
let isRunning = false; // 반복 작업 여부 추적
let isVoiceAllowed = false;
let dayTime = 1;
let isUserTyping = false;


// 랜덤한 플레이어와 텍스트를 채팅에 보내는 함수
const voteMafia = async (channel, personIndex) => {

    const electedPerson = players[personIndex];
    const message = `${electedPerson.name} is selected, The people's role is ${electedPerson.role}`;
    
    
    // TTS로 말하게 하기
    await channel.send({ content: message, tts: isVoiceAllowed });
    players.splice(personIndex, 1); // 선택된 플레이어 제거
    dayTime =dayTime +1;
    startRandomMessages();

    
};
const voteMafiaBasic = (personindex) =>
    {
      votePaper[personindex].votes +=1;

   } 
const voteMafiaBot = async (player,personindex,channel) =>
    {
        voteMafiaBasic(personindex);
        await channel.send(`${player.name} vote for ${players[personindex].name}`);
   }
const voteMafiaHuman = async(personindex,channel) =>
    {
        voteMafiaBasic(personindex);
        const electedPeronName = votePaper.reduce((prev,cur) =>{
         return cur.votes>prev.votes ?cur :prev;
        }).name;
        const electedPeronIndex = players.findIndex(player => player.name === electedPeronName);
        voteMafia(channel,electedPeronIndex);
        
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

// 버튼을 포함한 메시지 전송
client.on('messageCreate', async (message) => {
    if (message.content === '!start') {
        const startButton = new ButtonBuilder()
            .setCustomId('start')
            .setLabel('Start Bot')
            .setStyle(ButtonStyle.Success);
            const dayEmbed = new EmbedBuilder()
            .setColor(0x0099ff) // 임베드 색상 설정
            .setTitle(`Day${dayTime}`)
            .setDescription(`The game has started. Now is Day ${dayTime}` )  // Day 1 설명 추가
            .setTimestamp(); 

        const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('Stop Bot')
            .setStyle(ButtonStyle.Danger);
        const voiceAllowButton = new ButtonBuilder().setCustomId('voice').setLabel('voice Bot').setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(startButton, stopButton,voiceAllowButton);

            await message.channel.send({
                embeds: [dayEmbed],  // 임베드 메시지
                components: [row],   // 버튼
            });
          
     
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

// client.on('typingStart',async(typing)=>{
//     if(!isRunning && isUserTyping) return;
//     const user = typing.user; // typing 객체에서 user 가져오기
//     isUserTyping = true;
//     stopRandomMessages();
//     console.log("Stop others")
//     // typing.channel.send({content : 
//     //     `${user.username} is typing , mute other players`})
// });

// 버튼 클릭 시 실행되는 코드
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start') {
        if (isRunning) {
            await interaction.reply('The bot is already running!');
        } else {
            await interaction.reply('Bot is now running!');
            await startRandomMessages(interaction.channel);
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
        await voteMafiaBot(players[0],0,interaction.channel);
        await voteMafiaBot(players[1],0,interaction.channel);
        await voteMafiaBot(players[2],0,interaction.channel);
        
        await interaction.reply({
            content: 'Choose a player to vote for:',
            components: [row],
            ephemeral: true, // 이 옵션을 통해 특정 사용자에게만 보이는 메시지로 설정할 수 있습니다
        });
    } else if (interaction.customId.startsWith('vote_') && isRunning) {
        stopRandomMessages();
        isRunning = false;
        const personIndex = parseInt(interaction.customId.split('_')[1]); // 인덱스 추출
        await voteMafiaHuman( personIndex,interaction.channel); // 투표 함수 호출
        await interaction.reply(`You voted for ${personIndex}!`); // 응답 메시지
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
    [MafiaRole.DETECTIVE]: 'With a keen eye for deceit, the Detective investigates players to uncover their true alignments. Their mission is to use this knowledge to guide the town in rooting out the Mafia menace, employing their night actions to gather crucial intelligence.',
    [MafiaRole.VILLAGER]: 'As a regular townsperson, the Villager lacks special actions but plays a critical role in discussions and votes to eliminate the Mafia threat. Vigilance and collaboration with fellow non-Mafia players are their main weapons in the quest for safety and order.'
};

class Player {
    constructor(name, role, personality, confidence) {
        this.name = name;
        this.role = role;
        this.alive = true;
        this.personality = personality;
        this.confidence = confidence;
    }

    speak(conversation) {
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality);
        const prompt = NPCPrompt(setting);
        return prompt(conversation);
    }

    getAllyRoles() {
        return this.role === MafiaRole.MAFIA ? [MafiaRole.MAFIA] : [MafiaRole.DOCTOR, MafiaRole.DETECTIVE, MafiaRole.VILLAGER];
    }

    getEnemyRoles() {
        return this.role === MafiaRole.MAFIA ? [MafiaRole.DOCTOR, MafiaRole.DETECTIVE, MafiaRole.VILLAGER] : [MafiaRole.MAFIA];
    }

    getKnownAllies() {
        const mafiaPlayers = players.filter(player => player.role === MafiaRole.MAFIA && player.name !== this.name && player.alive==true)
                                     .map(player => player.name);
        return this.role === MafiaRole.MAFIA ? "You have no known allies" : mafiaPlayers.join(', ');
    }

    getOtherPlayers() {
        const otherPlayers = players.filter(player => player.name !== this.name && player.alive==true)
                                     .map(player => player.name);
        return otherPlayers.join(', ');
    }
}

function assignRoles(arr) {
    const numToSelect = Math.floor(arr.length / 4);
    const indexes = Array.from(Array(arr.length).keys());
    for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes.slice(0, numToSelect);
}

let characters = "";
let bots = [];
fs.readFile('Characters.txt', 'utf8', async (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    characters = data.split('\n');
    const mafiaRoleIndexes = assignRoles(characters);

    // Create players and await the extraction of personalities
    for (const [index, line] of characters.entries()) {
        const data = line.trim().split(';');
        let confidence = 0;

        // Wait for personality extraction
        confidence = await extractPersonality(data[1]).then(res => parseInt(res.content, 10)).catch(console.error);

        let role = MafiaRole.VILLAGER;
        if (mafiaRoleIndexes.includes(index)) role = MafiaRole.MAFIA;
        bots.push(new Player(data[0], role, data[1], confidence));
    }
    for(let i =0;  i<bots.length; i ++  )
        {
            webHookLis.push([bots[i].name,webHookUrls[i]]);

        }

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
  const filteredPlayers= bots.filter(player=> player.name!=lastChosenPlayerName);
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


async function start() {
    for (const player of bots) {
        const response = await player.speak(conversation);
        // console.log(player.name);
        console.log(player.name.red);
        console.log(response.content);
        conversation+=player.name+": "+response.content;
    }
}

async function randomStart() {
  while(true){
    const player=choosePlayer(bots,lastChosenPlayerName);
    lastChosenPlayerName=player.name;
    const response = await player.speak(conversation);
    // console.log(player.name);
    console.log(player.name.red);
    console.log(response.content);
    conversation+=player.name+": "+response.content;
  }
}

async function botSpeak(){
    const player=choosePlayer(bots,lastChosenPlayerName);
    lastChosenPlayerName=player.name;
    const response = await player.speak(conversation);
    // console.log(player.name);
    console.log(player.name.red);
    console.log(response.content);
    conversation+=player.name+": "+response.content;
    return [response.content,player];
}

function playerSpeak(username, content){
  conversation+= username+": "+content;
}


